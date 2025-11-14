const controller = require("../controllers/channel.controller");
const { authJwt } = require("../services");
const ensureMemberOrOwner = require("../config/mensureMemberorOwner.config");

module.exports = function (app) {
  app.use(function(req, res, next) {
            res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

  app.post("/api/channel/create",[authJwt.verifyToken],controller.createChannel);
  app.put("/api/channel/change",[authJwt.verifyToken],controller.renameChannel);
  app.delete("/api/channel/delete",[authJwt.verifyToken],controller.deleteChannel);
  app.post("/api/channel/list",[authJwt.verifyToken, ensureMemberOrOwner],controller.listChannels);
};
