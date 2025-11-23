const db = require("../models");
const User = db.User;
const PrivateConversation = db.PrivateConversation;
const Channel = db.Channel;
const Server_member = db.Server_member;
const Notification = db.Notification;
const { Op } = db.Sequelize;

function log(...args) {
  console.log("[NOTIF]", ...args);
}

exports.createForChannelMessage = async (message) => {
  try {
    log("createForChannelMessage start, msg id =", message.ID_Channel_message);

    const channelId = message.ID_Channel;
    const senderId  = message.ID_USER;

    // kanał + serwer
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      log("channel not found for ID_Channel =", channelId);
      return;
    }
    log("channel:", { ID_Channel: channel.ID_Channel, ID_Server: channel.ID_Server });

    // członkowie serwera
    const members = await Server_member.findAll({
      where: { ID_Server: channel.ID_Server }
    });
    log("server members:", members.map(m => ({ ID_Server: m.ID_Server, ID_USER: m.ID_USER })));

    // nadawca
    const sender = await User.findByPk(senderId);
    log("sender:", { ID_USER: senderId, username: sender?.username });

    const rows = members
      .filter(m => m.ID_USER !== senderId)
      .map(m => ({
        ID_USER: m.ID_USER,
        type: "SERVER_MESSAGE",
        serverId: channel.ID_Server,
        channelId,
        title: `Nowa wiadomość na #${channel.name}`,
        body: `${sender?.username || "Ktoś"}: ${String(message.content || "").slice(0, 80)}`,
        isRead: false,
      }));

    log("rows to insert:", rows);

    if (!rows.length) {
      log("no target users for notification (prob. jedyny user na serwerze)");
      return;
    }

    await Notification.bulkCreate(rows);
    log("notifications inserted =", rows.length);
  } catch (e) {
    console.error("[NOTIF] createForChannelMessage error:", e);
  }
};

exports.createForPrivateMessage = async (message) => {
  const convId   = message.ID_Conversation;
  const senderId = message.ID_USER ?? message.ID_Sender;

  if (!convId || !senderId) {
    return;
  }

  const conv = await PrivateConversation.findByPk(convId);
  if (!conv) return;

  const sender = await User.findByPk(senderId);

  const targetIds = [conv.ID_USER1, conv.ID_USER2].filter(id => id !== senderId);

  const rows = targetIds.map(uid => ({
    ID_USER: uid,
    type: "PRIVATE_MESSAGE",
    conversationId: convId,
    title: `Nowa wiadomość od ${sender?.username || "użytkownika"}`,
    body: message.content.slice(0, 80),
    isRead: false,
  }));

  if (!rows.length) return;

  await Notification.bulkCreate(rows);
};

exports.getCounter = async (req, res, userId) => {
  try {
    const count = await Notification.count({
      where: { ID_USER: userId, isRead: false }
    });
    return res.status(200).send({ count });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.list = async (req, res, userId) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const rows = await Notification.findAll({
      where: { ID_USER: userId },
      order: [["createdAt", "DESC"]],
      limit,
    });

    return res.status(200).send({ notifications: rows });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.markReadAll = async (req, res, userId) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { ID_USER: userId, isRead: false } }
    );
    return res.status(200).send({ message: "OK" });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.cleanupOldNotifications = async () => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const deleted = await Notification.destroy({
      where: {
        createdAt: { [Op.lt]: cutoff },
      },
    });

    if (deleted > 0) {
      console.log(`[notifications] Usunięto ${deleted} powiadomień starszych niż 48h.`);
    }
  } catch (e) {
    console.error("[notifications] Błąd podczas czyszczenia:", e.message);
  }
};