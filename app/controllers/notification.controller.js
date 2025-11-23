const notificationService = require("../services/notification.service");

exports.getCounter = (req, res) => {
  const userId = req.userId;
  notificationService.getCounter(req, res, userId);
};

exports.list = (req, res) => {
  const userId = req.userId;
  notificationService.list(req, res, userId);
};

exports.markReadAll = (req, res) => {
  const userId = req.userId;
  notificationService.markReadAll(req, res, userId);
};