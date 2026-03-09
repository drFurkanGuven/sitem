/**
 * Sened-Visualizer: Isnad API
 * Gelecekte Neon DB'den ravi verisi çekmek için hazırlanmış endpoint.
 * Şimdilik statik JSON verisi döndürür.
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const id = event.queryStringParameters?.id;

  // Statik veri (ileride DB sorgusuna dönüştürülecek)
  const catalog = {
    niyyet:      { id: 'niyyet',      title: 'Ameller Niyetlere Göredir',        raviCount: 17, tarikCount: 5 },
    din_nasihat: { id: 'din_nasihat', title: 'Din Nasihattir',                   raviCount: 13, tarikCount: 4 },
    helal_haram: { id: 'helal_haram', title: 'Helal Bellidir, Haram Bellidir',   raviCount: 11, tarikCount: 3 },
  };

  if (!id) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ hadithCount: Object.keys(catalog).length, hadiths: Object.values(catalog) }),
    };
  }

  if (!catalog[id]) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Isnad verisi bulunamadı', id }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(catalog[id]),
  };
};
