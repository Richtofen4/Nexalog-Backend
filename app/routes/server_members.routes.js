const controller = require("../controllers/server_members.controller");
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

    app.get("/api/server/myServers", [authJwt.verifyToken], controller.myServers);
    app.post("/api/server/joinServer", [authJwt.verifyToken], controller.joinServer);
    app.delete("/api/server/leave",[authJwt.verifyToken, ensureMemberOrOwner],controller.leaveServer);
    app.post("/api/server/kick",[authJwt.verifyToken, ensureMemberOrOwner],controller.kickMember);
    app.post("/api/server/list",[authJwt.verifyToken, ensureMemberOrOwner],controller.listMembers);

};