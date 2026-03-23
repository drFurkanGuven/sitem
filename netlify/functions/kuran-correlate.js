const { prisma } = require('./utils/db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Turkish stop words to exclude from correlation analysis
const STOP_WORDS = new Set([
  'bir', 'bu', 'da', 'de', 've', 'ile', 'için', 'o', 'ki', 'ne',
  'var', 'ben', 'sen', 'biz', 'siz', 'onu', 'ona', 'ise', 'gibi',
  'daha', 'en', 'hem', 'ya', 'mi', 'mu', 'mı', 'mü', 'dir', 'dır',
  'dür', 'dur', 'olan', 'olarak', 'her', 'sonra', 'kadar', 'bile',
  'den', 'dan', 'ten', 'tan', 'nin', 'nın', 'nün', 'nun', 'ın', 'in',
  'ün', 'un', 'la', 'le', 'yi', 'yı', 'yu', 'yü', 'ye', 'ya',
  'şey', 'diğer', 'bunu', 'şu', 'böyle', 'öyle', 'çok', 'az',
  'ama', 'fakat', 'ancak', 'ise', 'eğer', 'çünkü', 'yani',
  'değil', 'hiç', 'hep', 'artık', 'sadece', 'yalnız', 'yine',
  'zaten', 'belki', 'nasıl', 'neden', 'nere', 'kim', 'kendi',
  'aynı', 'başka', 'halde', 'üzere', 'dolayı', 'rağmen',
  'onları', 'onlar', 'bunlar', 'şunlar', 'buna', 'şuna',
  'onun', 'bunun', 'şunun', 'beni', 'seni', 'bize', 'size',
  'eder', 'olur', 'olan', 'etti', 'etmiş', 'olmuş', 'oldu',
  'olan', 'olup', 'edip', 'iken', 'olduğu', 'ettiği',
  'the', 'and', 'of', 'to', 'in', 'is', 'it', 'that', 'for', 'on',
]);

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
  const strict = event.queryStringParameters?.strict === '1';
  const topN = Math.min(
    Math.max(parseInt(event.queryStringParameters?.top) || 15, 5),
    30
  );

  if (!q || q.length < 2) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Arama sorgusu (q) en az 2 karakter olmalıdır.',
      }),
    };
  }

  try {
    let verses;

    if (strict) {
      const isArabic = /[\u0600-\u06FF]/.test(q);
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordPattern = `\\m${escapedQ}\\M`;

      let searchCondition;
      if (isArabic) {
        searchCondition = `(turkish_meal ~* $1 OR surah_name_tr ~* $1 OR transliteration ~* $1 OR arabic_text ~ $1)`;
      } else {
        searchCondition = `(turkish_meal ~* $1 OR surah_name_tr ~* $1 OR transliteration ~* $1)`;
      }

      verses = await prisma.$queryRawUnsafe(
        `SELECT turkish_meal FROM quran_verses WHERE ${searchCondition} LIMIT 500`,
        wordPattern
      );
      verses = verses.map((v) => ({ turkishMeal: v.turkish_meal }));
    } else {
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

      verses = await prisma.quranVerse.findMany({
        where: { OR: conditions },
        select: { turkishMeal: true },
        take: 500,
      });
    }

    if (verses.length === 0) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ correlations: [], totalVerses: 0, query: q }),
      };
    }

    // Tokenize and count word frequencies
    const wordCounts = {};
    const queryLower = q.toLowerCase().replace(/[^\w\sğüşıöçâîûêĞÜŞİÖÇ]/g, '');

    for (const verse of verses) {
      const text = verse.turkishMeal || '';
      const words = text
        .toLowerCase()
        .replace(/[^\w\sğüşıöçâîûêĞÜŞİÖÇ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);

      // Use a set to count each word once per verse (co-occurrence)
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        if (STOP_WORDS.has(word)) continue;
        if (word === queryLower) continue;
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    // Sort by frequency and take top N
    const sorted = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    const totalVerses = verses.length;
    const correlations = sorted.map(([word, count]) => ({
      word,
      count,
      percentage: Math.round((count / totalVerses) * 100),
    }));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ correlations, totalVerses, query: q }),
    };
  } catch (err) {
    console.error('kuran-correlate error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Korelasyon hesaplanırken hata oluştu.' }),
    };
  }
};
