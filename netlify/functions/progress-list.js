const { prisma } = require("./utils/db");
const { respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  if (event.httpMethod !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  const eventId = event.queryStringParameters && event.queryStringParameters.eventId;
  if (!eventId) {
    return respond(400, { error: "Etkinlik ID gerekli." });
  }

  try {
    const progressList = await prisma.readingProgress.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true } },
        event: { select: { id: true, bookName: true, totalPages: true } },
      },
      orderBy: { currentPage: "desc" },
    });

    return respond(200, { progress: progressList });
  } catch (err) {
    console.error("Progress list error:", err);
    return respond(500, { error: "Sunucu hatası." });
  }
};
