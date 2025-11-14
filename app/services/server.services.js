const db = require("../models");
const config = require("../config/auth.config");
const User = db.User;
const Server = db.Server;
const Server_member = db.Server_member;
const Channel = db.Channel;

const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('../config/cloudinary.config');
const { Namespace } = require("socket.io");

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvxwyz0123456789';
const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dcqhaa1ez/image/upload/v1716977307/default.png'

function generateCode (len = 10) {
    //Generowanie kodu
    const bytes = crypto.randomBytes(len * 2);
    let code = '';
    for (let i=0; i<bytes.length && code.length < len; i++) {
        const idx = bytes[i] % ALPHABET.length;
        code += ALPHABET[idx];
    }
    //Pewność, że jest 10 znaków
    if (code.length !== len) {
        return generateCode(len);
    }
    return code;
}

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

exports.createServer = async (req, res, userId) => {
    
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
    }).single('icon');

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

            const nameServer = (req.body?.name ?? '').toString().trim();

            if(!nameServer) {
                return res.status(400).send({ message: "Nazwa serwera jest wymagana"});
            }

            if (nameServer.length > 255) {
                return res.status(400).send({ message: "Nazwa serwera jest zbyt długa (max 255 znaków)"});
            }

            //Zmiana awatara
            let iconUrl = null;
            if (req.file && req.file.buffer) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'image', folder: 'server-icons', overwrite: true},
                        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
                    );
                    stream.end(req.file.buffer);
                });
            
                if (!result || !result.secure_url) {
                    return res.status(400).send({ message: 'Nie udało się zapisać pliku w Cloudinary'});
                }
                iconUrl = result.secure_url;
            }
            //Tworzenie kodu

            let code = null;
            for (let attempt = 1; attempt <= 10; attempt++) {
                const candidate = generateCode(10);
                const exists = await Server.findOne({ 
                    where: { code: candidate },
                    attributes: ['ID_Server'],
                });
                if (!exists) {
                    code = candidate;
                    break;
                }
            }
            if (!code) {
                return res.status(500).send({ message: 'Nie udało sie wygenerować unikalnego kodu'});
            }
            //Tworzenie serwera
            const server = await Server.create ({
                name: nameServer,
                ID_USER: userId,
                icon_url: iconUrl,
                code: code,
            });

            await Server_member.create ({
                ID_Server: server.ID_Server,
                ID_USER: userId,
            });

            return res.status(201).send({ message: 'Serwer został stworzony',
                server: {
                    ID_Server: server.ID_Server,
                    name: server.name,
                    ID_USER: userId,
                    icon_url: server.icon_url,
                    code: server.code,
                    createdAt: server.createdAt,
                },
            });
        } catch (error) {
        return res.status(500).send({ message: error.message });
        }
    });
};

exports.updateServer = async (req, res, userId) => {
    
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
    }).single('icon');

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

            //Który serwer
            const serverId = Number(req.body.serverId);
            if (!serverId || Number.isNaN(serverId)) {
                return res.status(400).send({ message: 'Brak lub nieprawidłowe ID serwera'});
            }

            //Instancja serwera
            const server = await Server.findByPk(serverId);
            if (!server) return res.status(404).send({ message: 'Nie znaleziono serwera'});

            //Uprawnienia
            if (server.ID_USER !== userId) {
                return res.status(403).send({ message: 'Brak uprawnień do edycji tego serwera'});
            }

            //Aktualizacja
            const nameServer = (req.body?.name ?? '').toString().trim();
            const patch = {};

            if(!nameServer) {
                return res.status(400).send({ message: "Nazwa serwera jest wymagana"});
            }

            if (nameServer.length > 255) {
                return res.status(400).send({ message: "Nazwa serwera jest zbyt długa (max 255 znaków)"});
            }
            patch.name = nameServer;

            //Zmiana awatara
            let newIconUrl = null;
            if (req.file && req.file.buffer) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'image', folder: 'server-icons', overwrite: true},
                        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
                    );
                    stream.end(req.file.buffer);
                });
            
                if (!result || !result.secure_url) {
                    return res.status(400).send({ message: 'Nie udało się zapisać pliku w Cloudinary'});
                }
                newIconUrl = result.secure_url;
                patch.icon_url = newIconUrl;
            }

            if (newIconUrl && server.icon_url && server.icon_url !== DEFAULT_AVATAR_URL) {
                const oldId = publicIdFromUrl(server.icon_url);
                if (oldId) {
                    try { await cloudinary.uploader.destroy(oldId, {invalidate: true}); }
                    catch (_) {}
                }
            }

            await server.update(patch);

            return res.status(200).send({ message: 'Serwer zaktualizowany',
                server: {
                    ID_Server: server.ID_Server,
                    name: server.name,
                    icon_url: server.icon_url,
                    ID_USER: server.ID_USER,
                },
            });
        } catch (error) {
        return res.status(500).send({ message: error.message });
        }
    });
};

exports.deleteServer = async (req, res, userId, serverId) => {
  const id = Number(serverId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
    }

  const t = await db.sequelize.transaction();
  try {
    const server = await Server.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!server) {
      await t.rollback();
      return res.status(404).send({ message: "Serwer nie istnieje." });
    }

    if (server.ID_USER !== userId) {
      await t.rollback();
      return res.status(403).send({ message: "Brak uprawnień do usunięcia tego serwera." });
    }

    // Usuń kanały
    if (Channel?.destroy) {
      await Channel.destroy({ where: { ID_Server: id }, transaction: t });
    }

    // Usuń członków
    await Server_member.destroy({ where: { ID_Server: id }, transaction: t });

    const iconPublicId = server.icon_public_id || null;
    if (iconPublicId) {
      try { await cloudinary.uploader.destroy(iconPublicId); } catch (e) {}
    }

    // Usuń serwer
    await server.destroy({ transaction: t });

    await t.commit();
    return res.status(200).send({ message: "Serwer został usunięty." });
  } catch (err) {
    await t.rollback();
    return res.status(500).send({ message: err.message || "Nie udało się usunąć serwera." });
  }
};

function _fallbackGenerateCode(length = 10) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
const gen = (typeof generateCode === "function") ? generateCode : _fallbackGenerateCode;

exports.getInviteCode = async (req, res, userId, serverId) => {
  const id = Number(serverId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  }

  const server = await Server.findByPk(id, { attributes: ["ID_Server", "ID_USER", "code", "name"] });
  if (!server) {
    return res.status(404).send({ message: "Serwer nie istnieje." });
  }

  if (server.ID_USER !== userId) {
    return res.status(403).send({ message: "Brak uprawnień do wyświetlenia kodu." });
  }

  return res.status(200).send({
    message: "Kod dołączenia pobrany.",
    server: { ID_Server: server.ID_Server, name: server.name, code: server.code }
  });
};

exports.regenerateInviteCode = async (req, res, userId, serverId) => {
  const id = Number(serverId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  }

  const server = await Server.findByPk(id);
  if (!server) {
    return res.status(404).send({ message: "Serwer nie istnieje." });
  }

  if (server.ID_USER !== userId) {
    return res.status(403).send({ message: "Brak uprawnień do zmiany kodu." });
  }

  let code = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    const candidate = gen(10);
    const exists = await Server.findOne({
      where: { code: candidate },
      attributes: ["ID_Server"]
    });
    if (!exists) { code = candidate; break; }
  }

  if (!code) {
    return res.status(500).send({ message: "Nie udało się wygenerować unikalnego kodu." });
  }

  server.code = code;
  await server.save();

  return res.status(200).send({
    message: "Kod dołączenia został zaktualizowany.",
    server: { ID_Server: server.ID_Server, name: server.name, code: server.code }
  });
};