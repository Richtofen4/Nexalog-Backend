const jwt = require("jsonwebtoken");
const userservices = require("../services/user.services");

exports.signup = (req, res) => {
    userservices.register(req, res, jwt);
};

exports.signin = (req, res) => {
    userservices.logIn(req, res, jwt);
};

exports.verifyUser = (req, res, next) => {
    userservices.veryfication(req, res, next);
};

exports.verifyReset = (req, res, next) => {
    userservices.veryficationReset(req, res, next, jwt);
};

exports.reset = (req, res) => {
    userservices.reseting(req, res, jwt);
};