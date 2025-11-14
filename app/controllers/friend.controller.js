const friendService = require("../services/friend.service");

exports.sendRequest = (req,res ) => {
    const userId = req.userId;
    findUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    friendService.sendRequest(req, res, userId, findUsername);
};

exports.acceptRequest = (req, res) => {
    const userId = req.userId;
    const otherUserId = req.body?.otherUserId;
    friendService.acceptRequest(req, res, userId, otherUserId);
};

exports.rejectRequest = (req, res) => {
    const userId = req.userId;
    const otherUserId = req.body?.otherUserId;
    friendService.rejectRequest(req, res, userId, otherUserId);
};

exports.removeRequest = (req, res) => {
    const userId = req.userId;
    const otherUserId = req.body?.otherUserId;
    friendService.removeRequest(req, res, userId, otherUserId);
};

exports.blockUser = (req, res) => {
    const userId = req.userId;
    const otherUserId = req.body?.otherUserId;
    friendService.blockUser(req, res, userId, otherUserId);
};

exports.unblockUser = (req, res) => {
  const userId      = Number(req.userId);
  const otherUserId = Number(req.body?.otherUserId);
  return friendService.unblockUser(req, res, userId, otherUserId);
};

exports.myFriends = (req, res) => {
    const userId = req.userId;
    friendService.myFriend(req, res, userId);
};
exports.myFriendPending = (req, res) => {
    const userId = req.userId;
    friendService.myFriendPending(req, res, userId);
};

exports.myFriendBlocked = (req, res) => {
    const userId = req.userId;
    friendService.myFriendBlocked(req, res, userId);
};