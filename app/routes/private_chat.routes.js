const controller = require("../controllers/private_chat.controller");
const { authJwt } = require("../services");

module.exports = function (app) {
  app.use(function(req, res, next) {
            res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Authorization, Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/chat/conversations/:conversationId/messages", [authJwt.verifyToken], controller.getRecentMessages);
    app.post("/api/chat/conversations/:conversationId/messages", [authJwt.verifyToken], controller.sendMessage);
    app.put("/api/chat/conversations/:conversationId/messages/:messageId", [authJwt.verifyToken], controller.editMessage);
    app.delete("/api/chat/conversations/:conversationId/messages/:messageId", [authJwt.verifyToken], controller.deleteMessage);

    app.get(
    "/api/chat/conversations/by-user/:otherUserId",
    [authJwt.verifyToken],
    controller.getOrCreateByUser
  );

  app.get("/api/user/me", [authJwt.verifyToken], async (req, res) => {
    try {
      const User = db.User || db.Users || db.users;
      const user = await User.findByPk(req.userId, {
        attributes: ["ID_USER", "username", "avatar"],
      });
      if (!user) return res.status(404).send({ message: "User not found" });
      return res.status(200).send({ user });
    } catch (e) {
      return res.status(500).send({ message: e.message });
    }
  });

};