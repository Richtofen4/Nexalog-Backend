const serverServices = require("../services/server_members.services")

exports.myServers = (req, res) => {
    const userId = req.userId;
    serverServices.myServers(req, res, userId);
};

exports.joinServer = (req, res) => {
    const userId = req.userId;
    serverServices.joinServer(req, res, userId);
};

exports.leaveServer = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  serverServices.leaveServer(req, res, userId, serverId);
};

exports.kickMember = (req, res) => {
  const ownerId = req.userId;
  const { serverId, targetUserId, userId } = req.body || {};
  const tId = targetUserId ?? userId;

  serverServices.kickMember(req, res, ownerId, serverId, tId);
};

exports.listMembers = (req, res) => {
  const userId = req.userId;
  const serverId = req.body?.serverId;
  serverServices.listMembers(req, res, userId, serverId);
};