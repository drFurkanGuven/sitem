const { prisma } = require("./utils/db");
const { getUserFromHeaders, respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  if (event.httpMethod !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  const decoded = getUserFromHeaders(event.headers);
  if (!decoded) {
    return respond(401, { error: "Yetkilendirme gerekli." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return respond(404, { error: "Kullanıcı bulunamadı." });
    }

    return respond(200, { user });
  } catch (err) {
    console.error("Auth me error:", err);
    return respond(500, { error: "Sunucu hatası." });
  }
};
