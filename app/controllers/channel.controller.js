const channelService = require("../services/channel.service");

exports.createChannel = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  const name = req.body?.name;
  channelService.createChannel(req, res, userId, serverId, name);
};

exports.renameChannel = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  const channelId = req.body?.channelId;
  const name = req.body?.name;
  channelService.renameChannel(req, res, userId, serverId, channelId, name);
};

exports.deleteChannel = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  const channelId = req.body?.channelId;
  channelService.deleteChannel(req, res, userId, serverId, channelId);
};

exports.listChannels = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  channelService.listChannels(req, res, userId, serverId);
};