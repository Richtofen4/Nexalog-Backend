const db = require("../models");
const Server = db.Server;
const Channel = db.Channel;
const Channel_message = db.Channel_message;
const Server_member = db.Server_member;

function _toId(x) { const n = Number(x); return Number.isInteger(n) && n > 0 ? n : null; }

exports.createChannel = async (req, res, userId, serverId, name) => {
  const sId = _toId(serverId);
  if (!sId) return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).send({ message: "Nieprawidłowa nazwa kanału." });
  }

  const server = await Server.findByPk(sId, { attributes: ["ID_Server","ID_USER","name"] });
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });

  if (server.ID_USER !== userId) {
    return res.status(403).send({ message: "Brak uprawnień do tworzenia kanałów." });
  }

  const existing = await Channel.findOne({ where: { ID_Server: sId, name: name.trim() }, attributes: ["ID_Channel"] });
  if (existing) {
    return res.status(409).send({ message: "Kanał o takiej nazwie już istnieje na tym serwerze." });
  }

  const channel = await Channel.create({
    ID_Server: sId,
    name: name.trim(),
    type: "text"
  });

  return res.status(201).send({
    message: "Kanał został utworzony.",
    channel: {
      ID_Channel: channel.ID_Channel,
      ID_Server: channel.ID_Server,
      name: channel.name,
      type: channel.type
    }
  });
};

exports.renameChannel = async (req, res, userId, serverId, channelId, name) => {
  const sId = _toId(serverId);
  const cId = _toId(channelId);
  if (!sId) return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  if (!cId) return res.status(400).send({ message: "Nieprawidłowy identyfikator kanału." });
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).send({ message: "Nieprawidłowa nazwa kanału." });
  }

  const server = await Server.findByPk(sId, { attributes: ["ID_Server","ID_USER"] });
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });
  if (server.ID_USER !== userId) {
    return res.status(403).send({ message: "Brak uprawnień do modyfikacji kanału." });
  }

  const channel = await Channel.findOne({ where: { ID_Channel: cId, ID_Server: sId } });
  if (!channel) return res.status(404).send({ message: "Kanał nie istnieje na tym serwerze." });

  const nameExists = await Channel.findOne({
    where: { ID_Server: sId, name: name.trim() },
    attributes: ["ID_Channel"]
  });
  if (nameExists && nameExists.ID_Channel !== cId) {
    return res.status(409).send({ message: "Kanał o takiej nazwie już istnieje na tym serwerze." });
  }

  channel.name = name.trim();
  await channel.save();

  return res.status(200).send({
    message: "Nazwa kanału została zaktualizowana.",
    channel: {
      ID_Channel: channel.ID_Channel,
      ID_Server: channel.ID_Server,
      name: channel.name,
      type: channel.type
    }
  });
};

exports.deleteChannel = async (req, res, userId, serverId, channelId) => {
  const sId = _toId(serverId);
  const cId = _toId(channelId);
  if (!sId) return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  if (!cId) return res.status(400).send({ message: "Nieprawidłowy identyfikator kanału." });

  const server = await Server.findByPk(sId, { attributes: ["ID_Server","ID_USER"] });
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });
  if (server.ID_USER !== userId) {
    return res.status(403).send({ message: "Brak uprawnień do usunięcia kanału." });
  }

  const channel = await Channel.findOne({ where: { ID_Channel: cId, ID_Server: sId } });
  if (!channel) return res.status(404).send({ message: "Kanał nie istnieje na tym serwerze." });

  if (Channel_message?.destroy) {
    await Channel_message.destroy({ where: { ID_Channel: cId } });
  }

  await channel.destroy();

  return res.status(200).send({ message: "Kanał został usunięty." });
};

exports.listChannels = async (req, res, userId, serverId) => {
  const sId = _toId(serverId);
  if (!sId) return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });

  const server = await Server.findByPk(sId, { attributes: ["ID_Server", "ID_USER", "name"] });
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });

  if (server.ID_USER !== userId) {
    const membership = await Server_member.findOne({
      where: { ID_Server: sId, ID_USER: userId },
      attributes: ["ID_Server", "ID_USER"]
    });
    if (!membership) {
      return res.status(403).send({ message: "Brak uprawnień do podglądu kanałów." });
    }
  }

  const channels = await Channel.findAll({
    where: { ID_Server: sId },
    attributes: ["ID_Channel", "ID_Server", "name", "type"],
    order: [["ID_Channel", "ASC"]]
  });

  return res.status(200).send({
    message: "Pobrano listę kanałów.",
    server: { ID_Server: server.ID_Server, name: server.name },
    channels: channels.map(c => ({
      ID_Channel: c.ID_Channel,
      ID_Server: c.ID_Server,
      name: c.name,
      type: c.type
    }))
  });
};