const svc = require("../services/channel_message.service");

exports.sendMessage = (req, res) => {
  const userId   = req.userId;
  const channelId= req.body?.channelId;
  const content  = req.body?.content;
  svc.sendMessage(req, res, userId, channelId, content);
};

exports.getRecent = (req, res) => {
  const userId    = req.userId;
  const channelId = req.body?.channelId;
  const limit     = req.body?.limit;
  const beforeId  = req.body?.beforeId;
  svc.getRecent(req, res, userId, channelId, limit, beforeId);
};

exports.editMessage = (req, res) => {
  const userId   = req.userId;
  const messageId= req.body?.messageId;
  const content  = req.body?.content;
  svc.editMessage(req, res, userId, messageId, content);
};

exports.deleteMessage = (req, res) => {
  const userId   = req.userId;
  const messageId= req.body?.messageId;
  svc.deleteMessage(req, res, userId, messageId);
};
