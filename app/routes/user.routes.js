const controller = require("../controllers/user.controller");
const { authJwt } = require("../services");

module.exports = function (app) {
  app.use(function(req, res, next) {
            res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

  app.post("/api/user/profile", [authJwt.verifyToken], controller.postProfile);
  app.put("/api/user/password", [authJwt.verifyToken], controller.changePassword);
  app.get("/api/user/getAllUser", [authJwt.verifyToken], controller.getAllUser);
  app.get("/api/user/getBanUser", [authJwt.verifyToken], controller.getBanUser);
  app.get("/api/user/getUnbanUser", [authJwt.verifyToken], controller.getUnbanUser);
  app.post("/api/user/unbanUser", [authJwt.verifyToken], controller.unbanUser);
  app.post("/api/user/banUser", [authJwt.verifyToken], controller.banUser);

  app.get("/api/user/me", [authJwt.verifyToken], controller.me);
};