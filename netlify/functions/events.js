const { prisma } = require("./utils/db");
const { getUserFromHeaders, respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  // GET: List all events
  if (event.httpMethod === "GET") {
    try {
      const events = await prisma.bookEvent.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { id: true, name: true } },
          progress: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });

      return respond(200, { events });
    } catch (err) {
      console.error("Events list error:", err);
      return respond(500, { error: "Sunucu hatası." });
    }
  }

  // POST: Create new event
  if (event.httpMethod === "POST") {
    const decoded = getUserFromHeaders(event.headers);
    if (!decoded) {
      return respond(401, { error: "Yetkilendirme gerekli." });
    }

    try {
      const { bookName, totalPages, selectedVerse, selectedHadith, duration, location } =
        JSON.parse(event.body);

      if (!bookName || !totalPages) {
        return respond(400, { error: "Kitap adı ve toplam sayfa sayısı gereklidir." });
      }

      const bookEvent = await prisma.bookEvent.create({
        data: {
          bookName,
          totalPages: parseInt(totalPages, 10),
          selectedVerse: selectedVerse || null,
          selectedHadith: selectedHadith || null,
          duration: duration || null,
          location: location || null,
          createdBy: decoded.id,
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
      });

      return respond(201, { event: bookEvent });
    } catch (err) {
      console.error("Event create error:", err);
      return respond(500, { error: "Sunucu hatası." });
    }
  }

  return respond(405, { error: "Method not allowed" });
};
