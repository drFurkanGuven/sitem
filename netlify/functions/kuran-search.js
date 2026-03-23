const { prisma } = require('./utils/db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const q = (event.queryStringParameters?.q || '').trim();
  const limit = Math.min(
    Math.max(parseInt(event.queryStringParameters?.limit) || 20, 1),
    50
  );
  const offset = Math.max(
    parseInt(event.queryStringParameters?.offset) || 0,
    0
  );
  const surah = parseInt(event.queryStringParameters?.surah) || null;
  const strict = event.queryStringParameters?.strict === '1';

  if (!q && !surah) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Arama sorgusu (q) veya sure numarası (surah) gereklidir.',
      }),
    };
  }

  try {
    if (strict && q) {
      return await handleStrictSearch(q, limit, offset, surah);
    }

    let where = {};

    if (surah) {
      where.surahNo = surah;
      if (q) {
        where.OR = buildSearchConditions(q);
      }
    } else if (q.length < 2) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({
          error: 'Arama sorgusu en az 2 karakter olmalıdır.',
        }),
      };
    } else {
      where.OR = buildSearchConditions(q);
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
      body: JSON.stringify({ results, total, query: q, limit, offset }),
    };
  } catch (err) {
    console.error('kuran-search error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Sunucu hatası oluştu.' }),
    };
  }
};

/**
 * Strict (whole-word) search using PostgreSQL regex word boundaries.
 * \m = word start, \M = word end in PostgreSQL regex.
 */
async function handleStrictSearch(q, limit, offset, surah) {
  if (q.length < 2) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Arama sorgusu en az 2 karakter olmalıdır.',
      }),
    };
  }

  const isArabic = /[\u0600-\u06FF]/.test(q);
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordPattern = `\\m${escapedQ}\\M`;

  let surahCondition = '';
  const params = [wordPattern];
  let paramIndex = 2;

  if (surah) {
    surahCondition = `AND surah_no = $${paramIndex}`;
    params.push(surah);
    paramIndex++;
  }

  let searchCondition;
  if (isArabic) {
    searchCondition = `(turkish_meal ~* $1 OR surah_name_tr ~* $1 OR transliteration ~* $1 OR arabic_text ~ $1)`;
  } else {
    searchCondition = `(turkish_meal ~* $1 OR surah_name_tr ~* $1 OR transliteration ~* $1)`;
  }

  const countQuery = `SELECT COUNT(*) as total FROM quran_verses WHERE ${searchCondition} ${surahCondition}`;
  const dataQuery = `SELECT * FROM quran_verses WHERE ${searchCondition} ${surahCondition} ORDER BY surah_no ASC, ayah_no ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  params.push(limit, offset);

  const [countResult, results] = await Promise.all([
    prisma.$queryRawUnsafe(countQuery, ...params.slice(0, paramIndex - 1)),
    prisma.$queryRawUnsafe(dataQuery, ...params),
  ]);

  const total = Number(countResult[0]?.total || 0);

  const mappedResults = results.map((r) => ({
    id: r.id,
    surahNo: r.surah_no,
    ayahNo: r.ayah_no,
    arabicText: r.arabic_text,
    turkishMeal: r.turkish_meal,
    surahNameAr: r.surah_name_ar,
    surahNameTr: r.surah_name_tr,
    transliteration: r.transliteration,
  }));

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      results: mappedResults,
      total,
      query: q,
      limit,
      offset,
      strict: true,
    }),
  };
}

/**
 * Build multi-layer search conditions (wide/default mode).
 */
function buildSearchConditions(q) {
  const isArabic = /[\u0600-\u06FF]/.test(q);

  const conditions = [
    { turkishMeal: { contains: q, mode: 'insensitive' } },
    { surahNameTr: { contains: q, mode: 'insensitive' } },
  ];

  if (isArabic) {
    conditions.push({ arabicText: { contains: q } });
  }

  conditions.push({
    transliteration: { contains: q, mode: 'insensitive' },
  });

  return conditions;
}
