const userServices = require("../services/user.services");
const db = require("../models");
const User = db.User;

exports.postProfile = (req, res) => {
  const userId = req.userId;
  const newUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const newAbout = typeof req.body?.about === 'string' ? req.body.about.trim() : '';
  userServices.updateProfile(req, res, userId, newUsername, newAbout);
};

exports.changePassword = (req, res) => {
  const userId = req.userId;
  const oldPassword = typeof req.body?.oldPassword === 'string' ? req.body.oldPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
  userServices.changePassword(req, res, userId, oldPassword, newPassword, confirmPassword);
};

exports.banUser = (req, res) => {
  const userId = req.userId;
  const otherUserId = req.body?.otherUserId;
  userServices.banUser(req, res, userId, otherUserId);
};

exports.unbanUser = (req, res) => {
  const userId = req.userId;
  const otherUserId = req.body?.otherUserId;
  userServices.unbanUser(req, res, userId, otherUserId);
};

exports.getAllUser = (req, res) => {
  const userId = req.userId;
  userServices.getAllUser(req, res, userId);
};

exports.getBanUser = (req, res) => {
  const userId = req.userId;
  userServices.getBanUser(req, res, userId);
};

exports.getUnbanUser = (req, res) => {
  const userId = req.userId;
  userServices.getUnbanUser(req, res, userId);
};

exports.me = async (req, res) => {
  try {
    const id = Number(req.userId ?? req.user?.ID_USER);
    if (!Number.isFinite(id)) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findByPk(id, {
      attributes: ["ID_USER", "username", "avatar", "email", "createdAt"],
    });
    if (!user) return res.status(404).json({ message: "Użytkownik nie istnieje" });

    return res.json({ ID_USER: user.ID_USER, user });
  } catch (e) {
    console.error("GET /api/user/me error:", e);
    return res.status(500).json({ message: e.message });
  }
};