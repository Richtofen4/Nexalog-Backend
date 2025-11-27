const controller = require("../controllers/friend.controller");
const { authJwt } = require("../services");

module.exports = function (app) {
    app.use(function(req, res, next) {
            res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/friends/sendRequest", [authJwt.verifyToken], controller.sendRequest);
    app.post("/api/friends/acceptRequest", [authJwt.verifyToken], controller.acceptRequest);
    app.delete("/api/friends/rejectRequest", [authJwt.verifyToken], controller.rejectRequest);
    app.delete("/api/friends/removeRequest", [authJwt.verifyToken], controller.removeRequest);
    app.put("/api/friends/blockUser", [authJwt.verifyToken], controller.blockUser);
    app.put ("/api/friends/unblockUser", [authJwt.verifyToken], controller.unblockUser);
    app.put("/api/friends/blockUser", [authJwt.verifyToken], controller.blockUser);
    app.get("/api/friends/myFriends", [authJwt.verifyToken], controller.myFriends);
    app.get("/api/friends/myFriendPending", [authJwt.verifyToken], controller.myFriendPending);
    app.get("/api/friends/myFriendBlocked", [authJwt.verifyToken], controller.myFriendBlocked);
};
