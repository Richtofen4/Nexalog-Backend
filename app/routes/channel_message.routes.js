const controller = require("../controllers/channel_message.controller");
const { authJwt } = require("../services");

module.exports = function (app) {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.post("/api/channel-message/send", [authJwt.verifyToken], controller.sendMessage);
  app.post("/api/channel-message/recent", [authJwt.verifyToken], controller.getRecent);
  app.put("/api/channel-message/edit", [authJwt.verifyToken], controller.editMessage);
  app.delete("/api/channel-message/delete", [authJwt.verifyToken], controller.deleteMessage);
};
