const serverServices = require("../services/server.services")

exports.createServer = (req,res) => {
    const userId = req.userId;

    serverServices.createServer(req, res, userId);
};

exports.updateServer = (req,res) => {
    const userId = req.userId;

    serverServices.updateServer(req, res, userId);
};

exports.deleteServer = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  serverServices.deleteServer(req, res, userId, serverId);
};

exports.getInviteCode = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  serverServices.getInviteCode(req, res, userId, serverId);
};

exports.regenerateInviteCode = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  serverServices.regenerateInviteCode(req, res, userId, serverId);
};