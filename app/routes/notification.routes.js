const controller = require("../controllers/notification.controller");
const { authJwt } = require("../services");

module.exports = function (app) {
  app.use(function(req, res, next) {
            res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Authorization, Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/notifications/counter", [authJwt.verifyToken], controller.getCounter);
    app.get("/api/notifications",         [authJwt.verifyToken], controller.list);
    app.post("/api/notifications/read-all",[authJwt.verifyToken], controller.markReadAll);
    
};