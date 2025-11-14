const db = require("../models");
const Server = db.Server;
const Server_member = db.Server_member;

module.exports = async function ensureMemberOrOwner(req, res, next) {
  const userId = req.userId;
  const serverId = Number(req.body?.serverId ?? req.params?.serverId);

  if (!Number.isInteger(serverId) || serverId <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  }

  const server = await Server.findByPk(serverId, { attributes: ["ID_Server","ID_USER","name"] });
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });

  if (server.ID_USER !== userId) {
    const member = await Server_member.findOne({ where: { ID_Server: serverId, ID_USER: userId } });
    if (!member) return res.status(403).send({ message: "Brak uprawnień (nie jesteś członkiem)." });
  }

  req.server = server;
  next();
};