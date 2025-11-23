const db = require("../models");
const config = require("../config/auth.config");
const User = db.User;

const nodemailer = require("../config/nodemailer.config");
const bcrypt = require("bcryptjs");

const { Op } = require('sequelize');
const multer = require('multer');
const cloudinary = require('../config/cloudinary.config');

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dcqhaa1ez/image/upload/v1716977307/default.png'

//Funkcja paginacji
const getPagination = (page, size) => {
    const limit = size ? +size : 10;
    const offset = page ? page * limit : 0;
    return { limit, offset};
};

//Przygotowanie liczb
function normalizePageSize(rawPage, rawSize) {
    const page = Math.max(0, Number.isFinite(+rawPage) ? +rawPage : 0);
    const size = Math.max(0, Number.isFinite(+rawSize) ? +rawSize : 0);
    return { page, size };
}

exports.register = async (req, res, jwt) => {
    try  {
        const checkEmail = await User.findOne({
            where: {
                email: req.body.email
            }
        });


        if(checkEmail){
            return res.status(400).send({ message: "Ten email jest zajęty"});
        }

        const checkUsername = await User.findOne({
            where: {
                username: req.body.username
            }
        });

        if (checkUsername) {
            return res.status(400).send({ message: "Ten nick jest zajęty"});
        }
        const token = jwt.sign({ email: req.body.email}, config.key.secret);

        const user = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 8),
            confirmationCode: token,
            avatar: "https://res.cloudinary.com/dcqhaa1ez/image/upload/v1716977307/default.png",
        });

        nodemailer.sendConfirmationEmail(
            user.username,
            user.email,
            user.confirmationCode
        );
        res.status(201).send({ message: "Udana rejestracja"});
    } catch(err) {
        res.status(500).send({ message: err.message});
    }
};

exports.logIn = async (req, res, jwt) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        });

        if (!user) {
            return res.status(400).send({ message: "Nie znaleziono użytkownika"});
        }

        const passwordValid = bcrypt.compareSync(
            req.body.password,
            user.password
        );

        if (!passwordValid) {
            return res.status(401).send({
                accessToken: null,
                message: "Niepoprawne hasło"
            });
        }
        
        if (user.status === "Created" || user.status === "Pending") {
            return res.status(401).send({ message: "Zweryfikuj swój email"});
        }

        const token = jwt.sign({ ID_USER: user.ID_USER}, config.key.secret, {
            algorithm: "HS256",
            expiresIn: 7200
        });

        const adminToken = jwt.sign({ ADMIN: user.isAdmin }, config.key.admin, {
            expiresIn: 7200,
        });

        user.confirmationCode = token;
        await user.save();

        const response = {
            username: user.username,
            token: token
        };

        if (user.isAdmin) {
            response.admin = adminToken;
        }

        res.send(response);
    } catch (err) {
        res.status(500).send({ message: err.message});
    }
};

exports.veryfication = async (req, res, next) => {
    try {
        const user = await User.findOne({
            where: {
                confirmationCode: req.params.confirmationCode,
            }
        });

        if (!user) {
            return res.status(404).send({ message: "Nie znaleziono uzytkownika"});
        }

        user.status = "Active";
        await user.save();
        res.status(200).send({ message: "Użytkownik został zweryfikowany" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.veryficationReset = async (req, res, next) => {
    try {
        const user = await User.findOne({
            where: {
                confirmationCode:req.params.confirmationCode,
            }
        });

        if (!user) {
            return res.status(404).send({ message: "Nie znalezniono uzytkownika"});
        }

        user.status = "Active";
        await user.save();
        next();
    } catch (err) {
        res.status(500).send({ message: err.message});
    }
};

exports.reseting = async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        });

        if (!user) {
            return res.status(400).send({ message: "Nie znaleziono uzytkownika"});
        }

        user.status = "Pending";
        await user.save();

        nodemailer.sendResetEmail(
            user.email,
            user.confirmationCode
        );

        user.password = bcrypt.hashSync(req.body.password, 8);
        await user.save();

        res.send({ message: "Link zostal wyslany: sprawdz swoja poczte"});
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

//Funkcja pomocnicza
function publicIdFromUrl(url) {
    try {
        const { pathname } = new URL(url);
        const parts = pathname.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx === -1) return null;
        let rest = parts.slice(uploadIdx + 1).join('/');
        rest = rest.replace(/^v\d+\//, '');
        rest = rest.replace(/\.[a-zA-Z0-9]+$/, '');
        return rest;
    } catch {
        return null;
    }
};

exports.updateProfile = (req, res, userId, newUsername = '', newAbout = '') => {
    //Multer
    const upload = multer ({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['image/jpeg', 'image/jpg','image/png','image/webp'];
            if (!file) return cb(null, true);
            if (allowed.includes(file.mimetype)) cb(null, true);
            else cb(new Error('Nieprawidłowy typ pliku')); 
        },
    }).single('avatar');

    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send({ message: 'Plik jest za duży (max 5MB).'});
            }
            return res.status(400).send({ message: err.message });
        }

        try {
            //Użytkownik
            const user = await User.findByPk(userId);
            if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

            let changed = false;
            const updates = {};

            //Zmiana nicku
            const rawUsername = 
                (typeof newUsername === 'string' ? newUsername.trim() : '') ||
                (typeof req.body?.username === 'string' ? req.body.username.trim() : '');

            if (rawUsername && rawUsername !== user.username) {
                if (!/^[a-zA-Z0-9_]{3,24}$/.test(rawUsername)) {
                    return res.status(400).send({
                        message: 'Nick musi mieć 3-24 znaki (litery, cyfry, _).',
                    });
                }
                const exists = await User.findOne ({
                    where: {username: rawUsername, ID_USER: {[Op.ne]: user.ID_USER}},
                });
                if (exists) return res.status(400).send({ message: 'Ten nick jest zajęty'});

                user.username = rawUsername;
                changed = true;
            }
            //Zmiana about
            const gotBodyAbout = typeof req.body?.about === 'string';
            const rawAbout = (typeof newAbout === 'string')
                ? newAbout
                : (gotBodyAbout ? req.body.about : null);

            if (rawAbout !== null) {
                const about = rawAbout.trim();
                if (about.length > 300) {
                    return res.status(400).send({ message: 'Opis może mieć maksymalnie 300 znaków'});
                }

                if (about !== (user.about || '')) {
                    user.about = about;
                    updates.about = about;
                    changed = true;
                }
            }

            //Zmiana awatara
            if (req.file && req.file.buffer) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'image', folder: 'avatars', overwrite: true},
                        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
                    );
                    stream.end(req.file.buffer);
                });

                if (!result || !result.secure_url) {
                    return res.status(400).send({ message: 'Nie udało się zapisać pliku w Cloudinary'});
                }

                //Usuwanie poprzedniego awatara
                if (user.avatar && user.avatar !== DEFAULT_AVATAR_URL) {
                    const oldPublicId = user.avatarPublicId || publicIdFromUrl(user.avatar);
                    if (oldPublicId) {
                        try { await cloudinary.uploader.destroy(oldPublicId, { invalidate: true}); }
                        catch (_) {}
                    }
                }

                user.avatar = result.secure_url;
                if ('avatarPublicId' in user) user.avatarPublicId = result.public_id;
                changed = true;
            }

            //Przypadek-nic do zmiany
            if (!changed) {
                return res.status(400).send({ message: 'Brak zmian do zapisu '});
            }

            await user.update ({username: user.username, avatar: user.avatar });

            return res.status(200).send({
                message: 'Profil zaktualizowany.',
                username: user.username,
                avatar: user.avatar,
            });
        } catch (error) {
            return res.status(500).send({ message: error.message });
        }
    });
};

exports.changePassword = async (req, res, userId, oldPassword, newPassword, confirmPassword ) => {
    try {
        //Walidacje wejścia
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).send ({ message: "Podaj stare i nowe hasło oraz potwierdzenie."});
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).send({ message: "Nowe hasło i potwierdzenie się nie zgadzają."});
        }
        if (newPassword === oldPassword) {
            return res.status(400).send({ message: "Nowe hasło nie może być takie samo jak poprzednie"});
        }

        //Reguły hasła
        const pwLen = newPassword.length >= 8;
        const pwUpper = /[A-Z]/.test(newPassword);
        const pwLower = /[a-z]/.test(newPassword);
        const pwDigit = /\d/.test(newPassword);
        if(!(pwLen && pwUpper && pwLower && pwDigit)) {
            return res.status(400).send({ message: "Hasło musi mieć min. 8 znaków oraz zawierać przynajmniej 1 dużą i małą literę i 1 cyfrę.",
            });
        }
        //Użytkownik
        const user = await User.findByPk(userId);
            if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        //Weryfikacja starego hasła
        const ok = bcrypt.compareSync(oldPassword, user.password);
        if (!ok) return res.status(400).send({ message: "Stare hasło jest niepoprawne."});

        //Zapis nowego
        user.password = bcrypt.hashSync(newPassword, 8);
        await user.save();

        return res.status(200).send({ message: "Hasło zostało zmienione."});
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

exports.banUser = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        //Zabezpieczenie
        if(userId === otherUserId) {
                return res.status(400).send({ message: "Nie możesz zbanować samego siebie "});
        }

        const findUser = await User.findByPk(otherUserId);
        if (!findUser) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        if (findUser.isBanned) return res.status(400).send({ message: 'Użytkownik jest już zbanowany'});

        findUser.isBanned = true;
        await findUser.save();

        return res.status(200).send({ message: "Użytkownik został zbanowany"});
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.unbanUser = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        const findUser = await User.findByPk(otherUserId);
        if (!findUser) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        if (!findUser.isBanned) return res.status(400).send({ message: 'Użytkownik nie jest zbanowany'});

        findUser.isBanned = false;
        await findUser.save();

        return res.status(200).send({ message: "Użytkownik został odbanowany"});
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.getAllUser = async (req, res, userId) => {
    try {
    const { page, size } = normalizePageSize(req.query.page, req.query.size ?? req.query.limit);
        const { limit, offset } = getPagination(page, size);

        const result = await User.findAndCountAll({
            attributes: ["ID_USER", "username", "email", "isBanned", "createdAt"],
            offset,
            limit,
            distinct: true,
            subQuery: false,
            order: [["createdAt", "DESC"]],
        });

        const totalItems = result.count;
        const users = result.rows;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

        const isRange = totalPages === 0 ? page === 0 : page >= 0 && page < totalPages;
        if(!isRange) {
            return res.status(404).send({
                message: "strona poza zakresem",
                totalItems,
                totalPages,
                requstedPage: page,
            });
        }

        return res.status(200).send({
            totalItems,
            users,
            totalPages,
            currentPage: page,
            pageSize: limit,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message});
    }
};

exports.getBanUser = async (req, res, userId) => {
    try {
        const { page, size } = normalizePageSize(req.query.page, req.query.size ?? req.query.limit);
        const { limit, offset } = getPagination(page, size);

        const result = await User.findAndCountAll({
            where: { isBanned: true },
            attributes: ["ID_USER", "username", "email", "isBanned", "createdAt"],
            offset,
            limit,
            distinct: true,
            subQuery: false,
            order: [["createdAt", "DESC"]],
        });

        const totalItems = result.count;
        const users = result.rows;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

        const isRange = totalPages === 0 ? page === 0 : page >= 0 && page < totalPages;
        if(!isRange) {
            return res.status(404).send({
                message: "strona poza zakresem",
                totalItems,
                totalPages,
                requstedPage: page,
            });
        }

        return res.status(200).send({
            totalItems,
            users,
            totalPages,
            currentPage: page,
            pageSize: limit,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message});
    }
};

exports.getUnbanUser = async (req, res, userId) => {
    try {
        const { page, size } = normalizePageSize(req.query.page, req.query.size ?? req.query.limit);
        const { limit, offset } = getPagination(page, size);

        const result = await User.findAndCountAll({
            where: { isBanned: false },
            attributes: ["ID_USER", "username", "email", "isBanned", "createdAt"],
            offset,
            limit,
            distinct: true,
            subQuery: false,
            order: [["createdAt", "DESC"]],
        });

        const totalItems = result.count;
        const users = result.rows;
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

        const isRange = totalPages === 0 ? page === 0 : page >= 0 && page < totalPages;
        if(!isRange) {
            return res.status(404).send({
                message: "strona poza zakresem",
                totalItems,
                totalPages,
                requstedPage: page,
            });
        }

        return res.status(200).send({
            totalItems,
            users,
            totalPages,
            currentPage: page,
            pageSize: limit,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message});
    }
};