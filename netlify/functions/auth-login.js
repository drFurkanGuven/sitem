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
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return respond(400, { error: "E-posta ve şifre gereklidir." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return respond(401, { error: "Geçersiz e-posta veya şifre." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return respond(401, { error: "Geçersiz e-posta veya şifre." });
    }

    const token = createToken(user);

    return respond(200, {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return respond(500, { error: "Sunucu hatası." });
  }
};
