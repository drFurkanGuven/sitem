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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turkish stop words to exclude from correlation analysis
const TR_STOP_WORDS = new Set([
  've', 'bir', 'bu', 'da', 'de', 'o', 'ki', 'ne', 'için', 'ile',
  'her', 'ya', 'onu', 'biz', 'siz', 'ben', 'sen', 'onlar', 'olan',
  'var', 'yok', 'daha', 'çok', 'en', 'ise', 'olarak', 'gibi',
  'sonra', 'önce', 'kadar', 'üzere', 'şey', 'mi', 'mu', 'mı', 'mü',
  'ancak', 'ama', 'fakat', 'hem', 'veya', 'ya', 'diye', 'üzerinde',
  'onu', 'ona', 'onun', 'bunu', 'buna', 'bunun', 'şu', 'onu',
  'onları', 'onlara', 'onların', 'bizim', 'sizin', 'benim', 'senin',
  'ey', 'artık', 'hiç', 'hep', 'pek', 'bile', 'dir', 'dır',
  'oldu', 'olan', 'olup', 'etmek', 'olan', 'olur', 'olmuş',
  'diğer', 'başka', 'aynı', 'böyle', 'şöyle', 'öyle', 'nasıl',
  'neden', 'niçin', 'nerede', 'nereye', 'kim', 'kimi', 'hangi',
]);

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
  const exact = event.queryStringParameters?.exact === 'true';
  const correlation = event.queryStringParameters?.correlation === 'true';

  if (!q || q.length < 2) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Arama sorgusu en az 2 karakter olmalıdır.' }),
    };
  }

  try {
    if (correlation) {
      return await handleCorrelation(q, mode);
    }
    if (mode === 'root') {
      return await handleRootSearch(q, limit, offset, statsOnly);
    }
    return await handleTextSearch(q, limit, offset, statsOnly, exact);
  } catch (err) {
    console.error('kuran-enhanced-search error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Sunucu hatası oluştu.' }),
    };
  }
};

async function handleTextSearch(q, limit, offset, statsOnly, exact) {
  const arabic = isArabic(q);

  if (arabic) {
    // Arabic text search with diacritics stripping
    const normalizedQuery = normalizeArabic(q);
    const normExpr = sqlNormalize('arabic_text');

    // Build the WHERE clause based on exact mode
    let whereClause;
    let queryParam;
    if (exact) {
      // Exact word match: use word boundary regex (space or start/end of string)
      queryParam = '(^|\\s)' + escapeRegex(normalizedQuery) + '($|\\s)';
      whereClause = `${normExpr} ~ $1`;
    } else {
      whereClause = `${normExpr} LIKE '%' || $1 || '%'`;
      queryParam = normalizedQuery;
    }

    // Count total matching verses
    const countQuery = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM quran_verses WHERE ${whereClause}`,
      queryParam
    );

    const total = Number(countQuery[0]?.total || 0);

    if (statsOnly) {
      const surahStats = await prisma.$queryRawUnsafe(
        `SELECT surah_no as "surahNo", surah_name_tr as "surahNameTr", surah_name_ar as "surahNameAr",
                COUNT(*) as count
         FROM quran_verses
         WHERE ${whereClause}
         GROUP BY surah_no, surah_name_tr, surah_name_ar
         ORDER BY count DESC`,
        queryParam
      );

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          total,
          surahStats: surahStats.map(s => ({ ...s, count: Number(s.count) })),
          query: q,
          mode: 'text',
          exact: !!exact,
        }),
      };
    }

    const results = await prisma.$queryRawUnsafe(
      `SELECT id, surah_no as "surahNo", ayah_no as "ayahNo", arabic_text as "arabicText",
              turkish_meal as "turkishMeal", surah_name_ar as "surahNameAr",
              surah_name_tr as "surahNameTr", transliteration
       FROM quran_verses
       WHERE ${whereClause}
       ORDER BY surah_no, ayah_no
       LIMIT $2 OFFSET $3`,
      queryParam, limit, offset
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ results, total, query: q, mode: 'text', exact: !!exact, limit, offset }),
    };
  }

  // Non-Arabic search: search Turkish meal and transliteration only (NOT surah name)
  let where;
  if (exact) {
    // For exact match in non-Arabic, use regex word boundary via raw query
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = '(^|[\\s,;:.!?])' + escapedQ + '($|[\\s,;:.!?])';

    const countQuery = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM quran_verses
       WHERE turkish_meal ~* $1 OR transliteration ~* $1`,
      pattern
    );
    const total = Number(countQuery[0]?.total || 0);

    if (statsOnly) {
      const surahStats = await prisma.$queryRawUnsafe(
        `SELECT surah_no as "surahNo", surah_name_tr as "surahNameTr", surah_name_ar as "surahNameAr",
                COUNT(*) as count
         FROM quran_verses
         WHERE turkish_meal ~* $1 OR transliteration ~* $1
         GROUP BY surah_no, surah_name_tr, surah_name_ar
         ORDER BY count DESC`,
        pattern
      );
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ total, surahStats: surahStats.map(s => ({ ...s, count: Number(s.count) })), query: q, mode: 'text', exact: true }),
      };
    }

    const results = await prisma.$queryRawUnsafe(
      `SELECT id, surah_no as "surahNo", ayah_no as "ayahNo", arabic_text as "arabicText",
              turkish_meal as "turkishMeal", surah_name_ar as "surahNameAr",
              surah_name_tr as "surahNameTr", transliteration
       FROM quran_verses
       WHERE turkish_meal ~* $1 OR transliteration ~* $1
       ORDER BY surah_no, ayah_no
       LIMIT $2 OFFSET $3`,
      pattern, limit, offset
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ results, total, query: q, mode: 'text', exact: true, limit, offset }),
    };
  }

  // Normal (non-exact) non-Arabic search - no surahNameTr to prevent matching surah titles
  where = {
    OR: [
      { turkishMeal: { contains: q, mode: 'insensitive' } },
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
      body: JSON.stringify({ total: allResults.length, surahStats, query: q, mode: 'text', exact: false }),
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
    body: JSON.stringify({ results, total, query: q, mode: 'text', exact: false, limit, offset }),
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
  // Each root letter can be separated by at most 2 non-space characters
  // This prevents matching words where root letters are too far apart
  // (e.g., عليم matches ع-ل-م but عليهم does NOT because ل and م are 2+ chars apart)
  const rootLetters = [...cleanRoot];
  const pattern = rootLetters.map(function(letter, i) {
    if (i === 0) return escapeRegex(letter);
    return '[^\\s]{0,2}' + escapeRegex(letter);
  }).join('');
  // Full pattern: matches a word containing the root letters in sequence with limited gaps
  const fullPattern = '(^|[\\s])[^\\s]{0,3}' + pattern + '[^\\s]{0,3}($|[\\s])';

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

async function handleCorrelation(q, mode) {
  const arabic = isArabic(q);
  let matchingVerses;

  if (mode === 'root') {
    const cleanRoot = normalizeArabic(q.replace(/[-\s\u200C\u200D]/g, ''));
    const rootLetters = [...cleanRoot];
    const pattern = rootLetters.map(function(letter, i) {
      if (i === 0) return escapeRegex(letter);
      return '[^\\s]{0,2}' + escapeRegex(letter);
    }).join('');
    const fullPattern = '(^|[\\s])[^\\s]{0,3}' + pattern + '[^\\s]{0,3}($|[\\s])';
    const normExpr = sqlNormalize('arabic_text');

    matchingVerses = await prisma.$queryRawUnsafe(
      `SELECT turkish_meal as "turkishMeal"
       FROM quran_verses
       WHERE ${normExpr} ~ $1
       LIMIT 500`,
      fullPattern
    );
  } else if (arabic) {
    const normalizedQuery = normalizeArabic(q);
    const normExpr = sqlNormalize('arabic_text');

    matchingVerses = await prisma.$queryRawUnsafe(
      `SELECT turkish_meal as "turkishMeal"
       FROM quran_verses
       WHERE ${normExpr} LIKE '%' || $1 || '%'
       LIMIT 500`,
      normalizedQuery
    );
  } else {
    matchingVerses = await prisma.quranVerse.findMany({
      where: {
        OR: [
          { turkishMeal: { contains: q, mode: 'insensitive' } },
          { transliteration: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { turkishMeal: true },
      take: 500,
    });
  }

  // Count word frequencies across all matching verses (using Turkish meal text)
  const wordFreq = {};
  const queryLower = q.toLowerCase();

  for (const verse of matchingVerses) {
    const meal = verse.turkishMeal || '';
    // Split into words, clean punctuation
    const words = meal
      .toLowerCase()
      .replace(/[.,;:!?"'()\[\]{}\/\\-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    // Count unique words per verse (not total occurrences)
    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      if (TR_STOP_WORDS.has(word)) continue;
      if (word === queryLower) continue;
      if (word.length < 3) continue;
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Sort by frequency and take top 30
  const correlations = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({
      word,
      count,
      percentage: matchingVerses.length > 0
        ? Math.round((count / matchingVerses.length) * 100)
        : 0,
    }));

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      correlations,
      totalVerses: matchingVerses.length,
      query: q,
      mode,
    }),
  };
}
