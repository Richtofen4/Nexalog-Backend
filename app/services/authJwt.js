const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(403).json({ message: "Zaloguj się" });
    }

    const secret = (config && (config.key?.secret || config.secret)) || null;
    if (!secret) {
      console.error("JWT: brak sekretu w config/auth.config.js (secret lub key.secret).");
      return res.status(500).json({ message: "Błąd konfiguracji JWT na serwerze." });
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Niepoprawny token" });

      const id =
        Number(decoded?.ID_USER ?? decoded?.id ?? decoded?.userId);
      if (!Number.isFinite(id)) {
        return res.status(403).json({ message: "Nie znaleziono ID_USER w tokenie" });
      }

      req.userId = id;
      req.token = token;
      next();
    });
  } catch (e) {
    console.error("verifyToken error:", e);
    return res.status(500).json({ message: "Błąd weryfikacji tokenu" });
  }
}

module.exports = { verifyToken };

