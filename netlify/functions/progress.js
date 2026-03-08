const { prisma } = require("./utils/db");
const { getUserFromHeaders, respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  // POST: Update or create reading progress
  if (event.httpMethod === "POST") {
    const decoded = getUserFromHeaders(event.headers);
    if (!decoded) {
      return respond(401, { error: "Yetkilendirme gerekli." });
    }

    try {
      const { eventId, currentPage, notes } = JSON.parse(event.body);

      if (!eventId || currentPage === undefined) {
        return respond(400, { error: "Etkinlik ID ve sayfa numarası gereklidir." });
      }

      const bookEvent = await prisma.bookEvent.findUnique({ where: { id: eventId } });
      if (!bookEvent) {
        return respond(404, { error: "Etkinlik bulunamadı." });
      }

      if (parseInt(currentPage, 10) > bookEvent.totalPages) {
        return respond(400, { error: "Sayfa numarası toplam sayfa sayısını aşamaz." });
      }

      const progress = await prisma.readingProgress.upsert({
        where: {
          userId_eventId: { userId: decoded.id, eventId },
        },
        update: {
          currentPage: parseInt(currentPage, 10),
          notes: notes !== undefined ? notes : undefined,
        },
        create: {
          userId: decoded.id,
          eventId,
          currentPage: parseInt(currentPage, 10),
          notes: notes || null,
        },
        include: {
          user: { select: { id: true, name: true } },
          event: { select: { id: true, bookName: true, totalPages: true } },
        },
      });

      return respond(200, { progress });
    } catch (err) {
      console.error("Progress update error:", err);
      return respond(500, { error: "Sunucu hatası." });
    }
  }

  return respond(405, { error: "Method not allowed" });
};
