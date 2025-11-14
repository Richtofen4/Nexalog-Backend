const controller = require("../controllers/server.controller");
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

    app.post("/api/server/createServer", [authJwt.verifyToken], controller.createServer);
    app.put("/api/server/updateServer", [authJwt.verifyToken], controller.updateServer);
    app.delete("/api/server/deleteServer",[authJwt.verifyToken],controller.deleteServer);
    app.post("/api/server/code",[authJwt.verifyToken, ensureMemberOrOwner],controller.getInviteCode);
    app.put("/api/server/regenerate-code",[authJwt.verifyToken, ensureMemberOrOwner],controller.regenerateInviteCode);

};