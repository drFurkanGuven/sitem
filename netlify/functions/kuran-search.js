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
 * Build multi-layer search conditions.
 * Searches across: turkishMeal, arabicText, transliteration, surahNameTr
 */
function buildSearchConditions(q) {
  const isArabic = /[\u0600-\u06FF]/.test(q);

  const conditions = [
    { turkishMeal: { contains: q, mode: 'insensitive' } },
    { surahNameTr: { contains: q, mode: 'insensitive' } },
  ];

  if (isArabic) {
    // Arabic script: also search in Arabic text
    conditions.push({ arabicText: { contains: q } });
  }

  // Always search transliteration (Latin-script verse transliteration)
  conditions.push({
    transliteration: { contains: q, mode: 'insensitive' },
  });

  return conditions;
}
