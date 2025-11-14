const prChatServices = require("../services/private_chat.services");

exports.getOrCreateByUser = (req, res) => {
  const userId = req.userId;
  const otherRaw = req.params.otherUserId;
  const otherUserId = parseInt(otherRaw, 10);

  if (isNaN(otherUserId)) {
    return res.status(400).send({ message: "Nieprawidłowe ID użytkownika." });
  }
  if (otherUserId === userId) {
    return res.status(400).send({ message: "Nie możesz rozmawiać sam ze sobą." });
  }

  return prChatServices.getOrCreateByUser({ req, res, userId, otherUserId });
};

exports.getRecentMessages = (req, res) => {
    const userId = req.userId;
    const { conversationId } = req.params;

    const limRaw = parseInt(req.query.limit ?? "30", 10);
    const limit = Math.max(1, Math.min(100, isNaN(limRaw) ? 30 : limRaw));

    const beforeRaw = req.query.beforeId;
    const beforeId = beforeRaw !== undefined ? parseInt(beforeRaw, 10) : null;
    if (beforeRaw !== undefined && isNaN(beforeId)) {
        return res.status(400).send({ message: "Parametr nie jest liczbą stałą"});
    }

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId)) {
        return res.status(400).send({ message: "Nieprawidłowe ID konwersacji." }); // >>>
    }

    return prChatServices.getRecentMessages({ req, res, userId, conversationId: convId, limit, beforeId});
};

exports.sendMessage = (req, res) => {
    const userId = req.userId;
    const { conversationId } = req.params;
    const content = (req.body?.content ?? "").toString().trim();

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId)) {
        return res.status(400).send({ message: "Nieprawidłowe ID konwersacji"});
    }

    return prChatServices.sendMessage({ req, res, userId, conversationId: convId, content});
};

exports.editMessage = (req, res) => {
    const userId = req.userId;
    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);
    const content = (req.body?.content ?? "").toString().trim();

    return prChatServices.editMessage({ req, res, userId, conversationId, messageId, content});
};

exports.deleteMessage = (req, res) => {
    const userId = req.userId;
    const conversationId = Number(req.params.conversationId);
    const messageId = Number(req.params.messageId);

    return prChatServices.deleteMessage({ req, res, userId, conversationId, messageId});
};