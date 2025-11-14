const db = require("../models");
const User = db.User;

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
        const UserEmail = await User.findOne({
            where: {
                email: req.body.email
            }
        });

        if (UserEmail) {
            return res.status(400).send({
                message: "Email jest juz zajęty"
            });
        }

        const Username = await User.findOne({
            where: {
                username: req.body.username
            }
            
        });

        if (Username) {
            return res.status(400).send({
                message: "Username jest juz zajęty"
            });
        }

        next();
    }   catch (error) {
        res.status(500).send({
            message: "Błąd podczas sprawdzania duplikatow Email lub Username",
            error: error.message
        });
    }
};

const verifySignUp = {
    checkDuplicateUsernameOrEmail
};

module.exports = verifySignUp;