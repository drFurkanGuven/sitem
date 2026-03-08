const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const QURAN_API = 'https://api.quran.com/api/v4';
const FALLBACK_API = 'https://api.alquran.cloud/v1/ayah';

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

  const surah = parseInt(event.queryStringParameters?.surah);
  const ayah = parseInt(event.queryStringParameters?.ayah);

  if (!surah || !ayah) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'surah and ayah parameters required' }),
    };
  }

  try {
    const verseKey = `${surah}:${ayah}`;
    const words = await fetchBilingualWords(verseKey);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ words, verseKey }),
    };
  } catch (err) {
    console.error('kuran-wbw error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Kelime verisi yüklenemedi.' }),
    };
  }
};

async function fetchBilingualWords(verseKey) {
  const url = (lang) =>
    `${QURAN_API}/verses/by_key/${verseKey}?words=true&word_translation_language=${lang}&word_fields=text_uthmani`;

  try {
    const [trRes, enRes] = await Promise.all([
      fetch(url('tr'), { headers: { 'User-Agent': 'KuranAnaliz/1.0' } }),
      fetch(url('en'), { headers: { 'User-Agent': 'KuranAnaliz/1.0' } }),
    ]);

    if (!trRes.ok || !enRes.ok) {
      throw new Error(`Quran.com API returned ${trRes.status}/${enRes.status}`);
    }

    const [trData, enData] = await Promise.all([trRes.json(), enRes.json()]);

    const trWords = trData.verse?.words || [];
    const enWords = enData.verse?.words || [];

    // Build English map by position for reliable matching
    const enMap = {};
    enWords.forEach((w) => {
      enMap[w.position] = w;
    });

    return trWords
      .filter((w) => w.char_type_name === 'word')
      .map((w) => ({
        arabic: w.text_uthmani || w.text,
        turkish_meaning: w.translation?.text || '',
        english_meaning: enMap[w.position]?.translation?.text || '',
        transliteration: w.transliteration?.text || '',
      }));
  } catch (primaryErr) {
    console.warn('Quran.com API failed, trying fallback:', primaryErr.message);
    return await fetchFallbackWords(verseKey);
  }
}

async function fetchFallbackWords(verseKey) {
  const res = await fetch(`${FALLBACK_API}/${verseKey}/quran-wordbyword`);
  if (!res.ok) throw new Error(`Fallback API failed: ${res.status}`);

  const data = await res.json();
  if (data.code !== 200 || !data.data?.text) {
    throw new Error('Invalid fallback API response');
  }

  const words = data.data.text.split('$').filter(Boolean);
  return words
    .map((w) => {
      const parts = w.split('|');
      const arabic = (parts[0] || '').trim();
      const meaning = (parts[1] || '').trim();
      if (!arabic) return null;
      return {
        arabic,
        turkish_meaning: '',
        english_meaning: meaning,
        transliteration: '',
      };
    })
    .filter(Boolean);
}
