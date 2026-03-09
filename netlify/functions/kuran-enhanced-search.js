const { prisma } = require('./utils/db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Arabic tashkeel/diacritics characters to strip
const TASHKEEL_REGEX_JS = /[\u064B-\u0652\u0670\u06E1\u06E2\u06E5\u06E6\u06ED]/g;

// PostgreSQL regex pattern class for tashkeel characters
const PG_TASHKEEL_CLASS = '[\u064B-\u0652\u0670\u06E1\u06E2\u06E5\u06E6\u06ED]';

function stripTashkeel(text) {
  if (!text) return '';
  return text.replace(TASHKEEL_REGEX_JS, '');
}

function normalizeArabic(text) {
  if (!text) return '';
  let normalized = stripTashkeel(text);
  // Normalize alef variants
  normalized = normalized.replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627');
  // Normalize ta marbuta to ha
  normalized = normalized.replace(/\u0629/g, '\u0647');
  // Normalize alef maqsura to ya
  normalized = normalized.replace(/\u0649/g, '\u064A');
  return normalized;
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Build the SQL normalization expression (strips tashkeel + normalizes alef/ta marbuta)
// This function returns SQL that normalizes arabic_text column
function sqlNormalize(col) {
  // 1. Strip tashkeel using regexp_replace
  // 2. Normalize alef variants (أ إ آ ٱ → ا)
  // 3. Normalize ta marbuta (ة → ه)
  // 4. Normalize alef maqsura (ى → ي)
  return `replace(replace(replace(replace(replace(
    regexp_replace(${col}, '${PG_TASHKEEL_CLASS}', '', 'g'),
    '\u0623', '\u0627'), '\u0625', '\u0627'), '\u0622', '\u0627'), '\u0629', '\u0647'), '\u0649', '\u064A')`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const q = (event.queryStringParameters?.q || '').trim();
  const mode = event.queryStringParameters?.mode || 'text'; // text | root
  const limit = Math.min(Math.max(parseInt(event.queryStringParameters?.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(event.queryStringParameters?.offset) || 0, 0);
  const statsOnly = event.queryStringParameters?.stats === 'true';

  if (!q || q.length < 2) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Arama sorgusu en az 2 karakter olmalıdır.' }),
    };
  }

  try {
    if (mode === 'root') {
      return await handleRootSearch(q, limit, offset, statsOnly);
    }
    return await handleTextSearch(q, limit, offset, statsOnly);
  } catch (err) {
    console.error('kuran-enhanced-search error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Sunucu hatası oluştu.' }),
    };
  }
};

async function handleTextSearch(q, limit, offset, statsOnly) {
  const arabic = isArabic(q);

  if (arabic) {
    // Arabic text search with diacritics stripping
    const normalizedQuery = normalizeArabic(q);
    const normExpr = sqlNormalize('arabic_text');

    // Count total matching verses
    const countQuery = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM quran_verses
       WHERE ${normExpr} LIKE '%' || $1 || '%'`,
      normalizedQuery
    );

    const total = Number(countQuery[0]?.total || 0);

    if (statsOnly) {
      const surahStats = await prisma.$queryRawUnsafe(
        `SELECT surah_no as "surahNo", surah_name_tr as "surahNameTr", surah_name_ar as "surahNameAr",
                COUNT(*) as count
         FROM quran_verses
         WHERE ${normExpr} LIKE '%' || $1 || '%'
         GROUP BY surah_no, surah_name_tr, surah_name_ar
         ORDER BY count DESC`,
        normalizedQuery
      );

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          total,
          surahStats: surahStats.map(s => ({ ...s, count: Number(s.count) })),
          query: q,
          mode: 'text',
        }),
      };
    }

    const results = await prisma.$queryRawUnsafe(
      `SELECT id, surah_no as "surahNo", ayah_no as "ayahNo", arabic_text as "arabicText",
              turkish_meal as "turkishMeal", surah_name_ar as "surahNameAr",
              surah_name_tr as "surahNameTr", transliteration
       FROM quran_verses
       WHERE ${normExpr} LIKE '%' || $1 || '%'
       ORDER BY surah_no, ayah_no
       LIMIT $2 OFFSET $3`,
      normalizedQuery, limit, offset
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ results, total, query: q, mode: 'text', limit, offset }),
    };
  }

  // Non-Arabic search: search Turkish meal, transliteration, surah name
  const where = {
    OR: [
      { turkishMeal: { contains: q, mode: 'insensitive' } },
      { surahNameTr: { contains: q, mode: 'insensitive' } },
      { transliteration: { contains: q, mode: 'insensitive' } },
    ],
  };

  if (statsOnly) {
    const allResults = await prisma.quranVerse.findMany({
      where,
      select: { surahNo: true, surahNameTr: true, surahNameAr: true },
    });

    const surahMap = {};
    for (const r of allResults) {
      if (!surahMap[r.surahNo]) {
        surahMap[r.surahNo] = { surahNo: r.surahNo, surahNameTr: r.surahNameTr, surahNameAr: r.surahNameAr, count: 0 };
      }
      surahMap[r.surahNo].count++;
    }

    const surahStats = Object.values(surahMap).sort((a, b) => b.count - a.count);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ total: allResults.length, surahStats, query: q, mode: 'text' }),
    };
  }

  const [results, total] = await Promise.all([
    prisma.quranVerse.findMany({
      where,
      orderBy: [{ surahNo: 'asc' }, { ayahNo: 'asc' }],
      take: limit,
      skip: offset,
    }),
    prisma.quranVerse.count({ where }),
  ]);

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ results, total, query: q, mode: 'text', limit, offset }),
  };
}

async function handleRootSearch(rootQuery, limit, offset, statsOnly) {
  // Clean the root: remove dashes, spaces, diacritics
  const cleanRoot = normalizeArabic(rootQuery.replace(/[-\s\u200C\u200D]/g, ''));

  if (cleanRoot.length < 2 || cleanRoot.length > 5) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Kök 2-5 harf arasında olmalıdır.' }),
    };
  }

  // Build regex pattern for root search
  // For root ر-ح-م, we search for words containing these consonants in order
  const rootLetters = [...cleanRoot];
  // Each root letter followed by optional non-space characters
  const pattern = rootLetters.join('[^\\s]*');
  // Full pattern: matches a word containing the root letters in sequence
  const fullPattern = '(^|[\\s])[^\\s]*' + pattern + '[^\\s]*';

  const normExpr = sqlNormalize('arabic_text');

  // Count total matching verses
  const countQuery = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total FROM quran_verses WHERE ${normExpr} ~ $1`,
    fullPattern
  );

  const total = Number(countQuery[0]?.total || 0);

  if (statsOnly) {
    const surahStats = await prisma.$queryRawUnsafe(
      `SELECT surah_no as "surahNo", surah_name_tr as "surahNameTr", surah_name_ar as "surahNameAr",
              COUNT(*) as count
       FROM quran_verses
       WHERE ${normExpr} ~ $1
       GROUP BY surah_no, surah_name_tr, surah_name_ar
       ORDER BY count DESC`,
      fullPattern
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        total,
        surahStats: surahStats.map(s => ({ ...s, count: Number(s.count) })),
        query: rootQuery,
        rootLetters: rootLetters.join('-'),
        mode: 'root',
      }),
    };
  }

  const results = await prisma.$queryRawUnsafe(
    `SELECT id, surah_no as "surahNo", ayah_no as "ayahNo", arabic_text as "arabicText",
            turkish_meal as "turkishMeal", surah_name_ar as "surahNameAr",
            surah_name_tr as "surahNameTr", transliteration
     FROM quran_verses
     WHERE ${normExpr} ~ $1
     ORDER BY surah_no, ayah_no
     LIMIT $2 OFFSET $3`,
    fullPattern, limit, offset
  );

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      results,
      total,
      query: rootQuery,
      rootLetters: rootLetters.join('-'),
      mode: 'root',
      limit,
      offset,
    }),
  };
}
