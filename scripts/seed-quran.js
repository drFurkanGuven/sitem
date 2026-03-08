const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL && process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
}

const prisma = new PrismaClient();

async function seedQuranVerses() {
  const count = await prisma.quranVerse.count();
  if (count > 0) {
    console.log(`[seed-quran] Already seeded (${count} verses). Skipping initial seed.`);
  } else {
    console.log('[seed-quran] Fetching Quran data from CDN...');
    const [trRes, translitRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_tr.json'),
      fetch('https://api.alquran.cloud/v1/quran/en.transliteration'),
    ]);

    if (!trRes.ok) throw new Error(`CDN fetch failed: ${trRes.status}`);
    const surahs = await trRes.json();

    // Build transliteration lookup
    const translitMap = {};
    if (translitRes.ok) {
      const translitData = await translitRes.json();
      if (translitData.code === 200 && translitData.data?.surahs) {
        for (const s of translitData.data.surahs) {
          for (const a of s.ayahs) {
            translitMap[s.number + ':' + a.numberInSurah] = a.text;
          }
        }
      }
    }

    console.log(`[seed-quran] Processing ${surahs.length} surahs...`);
    let totalVerses = 0;

    for (const surah of surahs) {
      const data = surah.verses.map((v) => ({
        surahNo: surah.id,
        ayahNo: v.id,
        arabicText: v.text,
        turkishMeal: v.translation,
        surahNameAr: surah.name,
        surahNameTr: surah.transliteration,
        transliteration: translitMap[surah.id + ':' + v.id] || null,
      }));

      await prisma.quranVerse.createMany({ data, skipDuplicates: true });
      totalVerses += data.length;

      if (surah.id % 20 === 0) {
        console.log(
          `[seed-quran]   Surah ${surah.id}/${surahs.length} done (${totalVerses} verses total)`
        );
      }
    }

    console.log(`[seed-quran] Complete: ${totalVerses} verses imported.`);
  }

  // Populate transliteration for existing verses that are missing it
  await updateTransliteration();
}

async function updateTransliteration() {
  const missing = await prisma.quranVerse.count({
    where: { transliteration: null },
  });

  if (missing === 0) {
    console.log('[seed-quran] Transliteration data already populated. Skipping.');
    return;
  }

  console.log(`[seed-quran] ${missing} verses missing transliteration. Fetching...`);

  const res = await fetch('https://api.alquran.cloud/v1/quran/en.transliteration');
  if (!res.ok) {
    console.error('[seed-quran] Transliteration API failed:', res.status);
    return;
  }

  const data = await res.json();
  if (data.code !== 200 || !data.data?.surahs) {
    console.error('[seed-quran] Invalid transliteration API response');
    return;
  }

  let updated = 0;
  const BATCH_SIZE = 100;
  let batch = [];

  for (const surah of data.data.surahs) {
    for (const ayah of surah.ayahs) {
      batch.push(
        prisma.quranVerse.updateMany({
          where: {
            surahNo: surah.number,
            ayahNo: ayah.numberInSurah,
            transliteration: null,
          },
          data: { transliteration: ayah.text },
        })
      );

      if (batch.length >= BATCH_SIZE) {
        await prisma.$transaction(batch);
        updated += batch.length;
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await prisma.$transaction(batch);
    updated += batch.length;
  }

  console.log(`[seed-quran] Updated ${updated} verses with transliteration.`);
}

seedQuranVerses()
  .catch((err) => {
    console.error('[seed-quran] Error:', err.message);
  })
  .finally(() => {
    prisma.$disconnect();
  });
