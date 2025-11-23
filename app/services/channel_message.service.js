const db = require("../models");
const { Op } = db.Sequelize;
const Server = db.Server;
const Server_member = db.Server_member;
const Channel = db.Channel;
const Channel_message = db.Channel_message;
const User = db.User;
const notificationService = require("./notification.service");

const toId = v => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

async function ensureChannelMembership(channelId, userId) {
  const channel = await Channel.findByPk(channelId, {
    attributes: ["ID_Channel", "ID_Server", "name"],
  });
  if (!channel) return { error: { code: 404, message: "Kanał nie istnieje." } };

  const server = await Server.findByPk(channel.ID_Server, {
    attributes: ["ID_Server", "ID_USER", "name"],
  });
  if (!server) return { error: { code: 404, message: "Serwer nie istnieje." } };

  if (server.ID_USER !== userId) {
    const membership = await Server_member.findOne({
      where: { ID_Server: server.ID_Server, ID_USER: userId },
      attributes: ["ID_Server", "ID_USER"],
    });
    if (!membership) {
      return { error: { code: 403, message: "Brak uprawnień do tego kanału." } };
    }
  }

  return { channel, server };
}

exports.sendMessage = async (req, res, userId, channelId, content, name = null) => {
  try {
    const cId = toId(channelId);
    if (!cId) {
      return res.status(400).send({ message: "Nieprawidłowy identyfikator kanału." });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).send({ message: "Treść wiadomości jest wymagana." });
    }

    const { error } = await ensureChannelMembership(cId, userId);
    if (error) return res.status(error.code).send({ message: error.message });

    const msg = await Channel_message.create({
      ID_Channel: cId,
      ID_USER:    userId,
      content:    content.trim(),
      name,
    });

    const io = req.app?.locals?.io || req.app.get?.("io");
    if (io) {
      const u = await User.findByPk(userId, {
        attributes: ["ID_USER", "username", "avatar"],
      });

      const payload = {
        ID_Channel_message: msg.ID_Channel_message,
        ID_Channel:         msg.ID_Channel,
        content:            msg.content,
        createdAt:          msg.createdAt,
        user: {
          ID_USER:   u?.ID_USER ?? userId,
          username:  u?.username ?? "unknown",
          avatar:    u?.avatar ?? "",
        },
      };

      io.to(`chan:${msg.ID_Channel}`).emit("channel-message:new", payload);
    }

    notificationService
      .createForChannelMessage(msg)
      .catch((err) => console.error("Notification error:", err));

    return res.status(201).send({
      message: "Wiadomość wysłana.",
      data: {
        ID_Channel_message: msg.ID_Channel_message,
        ID_Channel:         msg.ID_Channel,
        ID_USER:            userId,
        content:            msg.content,
        createdAt:          msg.createdAt,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: e.message });
  }
};

exports.getRecent = async (req, res, userId, channelId, limit, beforeId) => {
  try {
    const cId = toId(channelId);
    if (!cId) return res.status(400).send({ message: "Nieprawidłowy identyfikator kanału." });

    const { error } = await ensureChannelMembership(cId, userId);
    if (error) return res.status(error.code).send({ message: error.message });

    const lim = Math.max(1, Math.min(100, Number(limit) || 30));
    const where = {
      ID_Channel: cId,
      ...(toId(beforeId) ? { ID_Channel_message: { [Op.lt]: toId(beforeId) } } : {}),
    };

    const rows = await Channel_message.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["ID_USER", "username", "avatar"], required: true },
      ],
      order: [["ID_Channel_message", "DESC"]],
      limit: lim,
    });

    const messages = rows.map(r => ({
      ID_Channel_message: r.ID_Channel_message,
      ID_Channel: r.ID_Channel,
      createdAt: r.createdAt,
      content: r.content,
      user: {
        ID_USER: r.user.ID_USER,
        username: r.user.username,
        avatar: r.user.avatar,
      }
    }));

    return res.status(200).send({ message: "OK", messages });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.editMessage = async (req, res, userId, messageId, content) => {
  try {
    const mId = toId(messageId);
    if (!mId) return res.status(400).send({ message: "Nieprawidłowe ID wiadomości." });
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).send({ message: "Treść wiadomości jest wymagana." });
    }

    const msg = await Channel_message.findByPk(mId, {
      include: [{ model: Channel, as: "channel", attributes: ["ID_Channel", "ID_Server"] }]
    });
    if (!msg) return res.status(404).send({ message: "Wiadomość nie istnieje." });
    if (msg.ID_USER !== userId) return res.status(403).send({ message: "Nie możesz edytować tej wiadomości." });

    const { error } = await ensureChannelMembership(msg.ID_Channel, userId);
    if (error) return res.status(error.code).send({ message: error.message });

    msg.content = content.trim();
    await msg.save();

    return res.status(200).send({ message: "Wiadomość zaktualizowana." });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.deleteMessage = async (req, res, userId, messageId) => {
  try {
    const mId = toId(messageId);
    if (!mId) return res.status(400).send({ message: "Nieprawidłowe ID wiadomości." });

    const msg = await Channel_message.findByPk(mId, {
      include: [{ model: Channel, as: "channel", attributes: ["ID_Channel", "ID_Server"] }]
    });
    if (!msg) return res.status(404).send({ message: "Wiadomość nie istnieje." });

    const server = await Server.findByPk(msg.channel.ID_Server, { attributes: ["ID_Server", "ID_USER"] });
    const isOwner = server && server.ID_USER === userId;

    if (!(isOwner || msg.ID_USER === userId)) {
      return res.status(403).send({ message: "Brak uprawnień do usunięcia." });
    }
   await msg.destroy();

    return res.status(200).send({ message: "Wiadomość usunięta." });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};
