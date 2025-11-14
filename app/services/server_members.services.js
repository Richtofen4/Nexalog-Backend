const db = require("../models");
const Server = db.Server;
const Server_member = db.Server_member;
const User = db.User; 

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

exports.myServers = async (req, res, userId) => {
    try {
        const { page, size } = normalizePageSize(req.query.page, req.query.size ?? req.query.limit);
        const { limit, offset } = getPagination(page, size);

        const memberships = await Server_member.findAndCountAll({
            where: { ID_USER: userId},
            include: [
                {
                    model: Server,
                    as: "server",
                    attributes: [
                        "ID_Server",
                        "name",
                        "icon_url",
                        "code",
                        "ID_USER",
                        "createdAt",
                    ],
                    required: true,
                },
            ],
            offset,
            limit,
            distinct: true,
            subQuery: false,
            order: [[{ model: Server, as: "server"}, "createdAt", "DESC"]],
        });

        const totalItems = memberships.count;
        const servers = memberships.rows.map((m) => m.server).filter(Boolean);
        const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

        const inRange = totalPages === 0 ? page === 0 : page >= 0 && page < totalPages;
        if (!inRange) {
            return res.status(404).send ({
                message: "Strona poza zakresem",
                totalItems,
                totalPages,
                requstedPage: page,
            });
        }

        return res.status(200).send({
            totalItems,
            servers,
            totalPages,
            currentPage: page,
            pageSize: limit,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.joinServer = async (req, res, userId) => {
    try {
        const user = await User.findByPk(userId);
            if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        const code = (req.body?.code ?? "").trim();
        if (!code) {
            return res.status(400).send({ message: "Kod jest wymagany"});
        }

        const server = await Server.findOne({
            where: { code },
            attributes: ["ID_Server", "ID_USER", "name", "icon_url", "code"],
        });

        if (!server) {
            return res.status(404).send({ message: "Nieprawidłowy kod"});
        }

        if (server.ID_USER === userId) {
            return res.status(200).send({
                message: "Jesteś właścicielem tego serwera",
                server: {
                    ID_Server: server.ID_Server,
                },
            });
        }

        const exists = await Server_member.findOne({
            where: {ID_Server: server.ID_Server, ID_USER: userId},
        });

        if (exists) {
            return res.status(200).send({
                message:  "Jesteś już członkiem tego serwera",
                server: {
                    ID_Server: server.ID_Server,
                },
            });
        }

        await Server_member.create({
            ID_Server: server.ID_Server,
            ID_USER: userId,
        });

        return res.status(201).send({
            message: "Dołączono do serwera",
            server: {
                ID_Server: server.ID_Server,
                name: server.name,
                icon_url: server.icon_url,
            },
        });
    } catch (error) {
        return res.status(500).send({ message: error.message});
    }
};

exports.leaveServer = async (req, res, userId, serverId) => {
  const id = Number(serverId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  }

  const server = await Server.findByPk(id);
  if (!server) {
    return res.status(404).send({ message: "Serwer nie istnieje." });
  }

  if (server.ID_USER === userId) {
    return res.status(409).send({
      message: "Jesteś właścicielem tego serwera. Przenieś własność albo usuń serwer."
    });
  }

  const membership = await Server_member.findOne({
    where: { ID_Server: id, ID_USER: userId }
  });

  if (!membership) {
    return res.status(404).send({ message: "Nie należysz do tego serwera." });
  }

  await membership.destroy();

  return res.status(200).send({
    message: "Pomyślnie opuściłeś serwer.",
    server: { ID_Server: server.ID_Server, name: server.name }
  });
};

exports.kickMember = async (req, res, ownerId, serverId, targetUserId) => {
  const sId = Number(serverId);
  const tId = Number(
    targetUserId ?? req.body?.targetUserId ?? req.body?.userId
  );

  if (!Number.isInteger(sId) || sId <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
  }
  if (!Number.isInteger(tId) || tId <= 0) {
    return res.status(400).send({ message: "Nieprawidłowy identyfikator użytkownika." });
  }
  const server = await Server.findByPk(sId);
  if (!server) return res.status(404).send({ message: "Serwer nie istnieje." });
  if (server.ID_USER !== ownerId) {
    return res.status(403).send({ message: "Brak uprawnień do wyrzucenia użytkownika." });
  }
  if (tId === server.ID_USER) {
    return res.status(409).send({ message: "Nie można wyrzucić właściciela serwera." });
  }

  const membership = await Server_member.findOne({ where: { ID_Server: sId, ID_USER: tId } });
  if (!membership) {
    return res.status(404).send({ message: "Użytkownik nie jest członkiem tego serwera." });
  }

  await membership.destroy();
  return res.status(200).send({
    message: "Użytkownik został wyrzucony z serwera.",
    kickedUserId: tId,
    server: { ID_Server: server.ID_Server, name: server.name }
  });
};

exports.listMembers = async (req, res, userId, serverId) => {
  try {
    const sId = Number(serverId);
    if (!Number.isInteger(sId) || sId <= 0) {
      return res.status(400).send({ message: "Nieprawidłowy identyfikator serwera." });
    }

    const server = await Server.findByPk(sId, {
      attributes: ["ID_Server", "ID_USER", "name"]
    });
    if (!server) {
      return res.status(404).send({ message: "Serwer nie istnieje." });
    }

    if (server.ID_USER !== userId) {
      const membership = await Server_member.findOne({
        where: { ID_Server: sId, ID_USER: userId },
        attributes: ["ID_Server", "ID_USER"]
      });
      if (!membership) {
        return res.status(403).send({ message: "Brak uprawnień do podglądu listy członków." });
      }
    }

    const rows = await Server_member.findAll({
  where: { ID_Server: sId },
  include: [{
    model: User,
    as: "user",
    attributes: ["ID_USER", "username", "avatar"],
    required: true
  }],
  attributes: ["createdAt"],
  order: [["createdAt", "ASC"]]
});

const members = rows.map(r => ({
  ID_USER:  r.user.ID_USER,
  username: r.user.username,
  avatar:   r.user.avatar,
  joinedAt: r.createdAt
}));

    return res.status(200).send({
      message: "Pobrano listę członków.",
      server: { ID_Server: server.ID_Server, name: server.name },
      totalItems: members.length,
      members
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};