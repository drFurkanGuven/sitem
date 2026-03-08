const bcrypt = require("bcryptjs");
const { prisma } = require("./utils/db");
const { createToken, respond } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, {});
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  try {
    const { name, email, password } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return respond(400, { error: "Ad, e-posta ve şifre gereklidir." });
    }

    if (password.length < 6) {
      return respond(400, { error: "Şifre en az 6 karakter olmalıdır." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return respond(409, { error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const token = createToken(user);

    return respond(201, {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    return respond(500, { error: "Sunucu hatası." });
  }
};
