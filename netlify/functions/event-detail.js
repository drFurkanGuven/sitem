const { prisma } = require("./utils/db");
const { respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  if (event.httpMethod !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return respond(400, { error: "Etkinlik ID gerekli." });
  }

  try {
    const bookEvent = await prisma.bookEvent.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        progress: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { currentPage: "desc" },
        },
      },
    });

    if (!bookEvent) {
      return respond(404, { error: "Etkinlik bulunamadı." });
    }

    return respond(200, { event: bookEvent });
  } catch (err) {
    console.error("Event detail error:", err);
    return respond(500, { error: "Sunucu hatası." });
  }
};
