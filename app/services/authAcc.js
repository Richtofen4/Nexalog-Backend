const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.User;

verifyAdmin = (req, res, next)=> {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    console.log(token);
    if (!token) {
        return res.status(403).send({
            message: "Zaloguj sie"
        });
    }
    jwt.verify(token, config.key.admin, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Nie masz dostępu'});
        }
        req.user = decoded;
        next();
    });
};

verifyBan = (req, res, next) => {
    User.findOne({
        where:{
            email: req.body.email
        }
    }).then(user => {
        if(!user) {
            return res.status(404).send({ message: "Nie znaleziono użytkownika"});
        }
        if(user.isBanned === true){
            return res.status(404).send({ message: "Jesteś zbanowany"});
        }
        if(user.isBanned === false){
            next();
        } 
    }).catch(err => {
        res.status(500).send({ message: err.message});
    });
};

const authAcc = {
    verifyAdmin: verifyAdmin,
    verifyBan: verifyBan,
};

module.exports = authAcc;