const db = require("../models");
const Friend = db.Friendship;
const User = db.User;
const PrivateConversation = db.PrivateConversation;
const { Op } = db.Sequelize;
const sequelize = db.sequelize;
const { QueryTypes } = require("sequelize");

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

exports.sendRequest = async (req, res, userId, findUsername) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        //Szukanie użytkownika
        const findUser = await User.findOne({
            where: { username: findUsername },
            attributes: ["ID_USER", "username"],
        });
        if (!findUser) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        //Sprawdzanie samego siebie
        if (userId === findUser.ID_USER) {
            return res.status(400).send({ message: "Nie możesz zaprosić samego siebie."});
        }

        //Czy relacja już istnieje
        const low = Math.min(userId, findUser.ID_USER);
        const high = Math.max(userId, findUser.ID_USER);

        const existing = await Friend.findOne({
            where: {ID_user: low, ID_friend: high },
            attributes: ["ID_Friend", "status", "request_by" ],
        });

        if (existing) {
            if(existing.status === "accepted") {
                return res.status(409).send({message: "Już jesteście znajomymi."});
            }
            if (existing.status === "pending") {
                const who = existing.request_by === userId ? "Ty" : "Druga strona";
                return res.status(409).send({
                    message: `${who} już wysłał(a) zaproszenie - oczekuje na odpowiedź.`,
                });
            }

            if (existing.status === "blocked") {
                return res.status(403).send({ message: "Relacja jest zablokowana. "});
            }
            return res.status(409).send({message: "Taka relacja już istnieje."});
        }

        await Friend.create({
            ID_user: low,
            ID_friend: high,
            status: 'pending',
            request_by: userId,
        });

        return res.status(201).send({ message: 'Prośba została wysłana'});
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.acceptRequest = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        //Akceptacja zaproszenia
        const low = Math.min(userId, otherUserId);
        const high = Math.max(userId, otherUserId);

        const rel = await Friend.findOne({
            where: { ID_user: low, ID_friend: high },
            attributes: ["ID_Friend", "ID_user", "ID_friend", "status", "request_by"],
        });

        if(!rel) return res.status(404).send({ message: "Zaproszenie nie istnieje "});

        if (rel.status === "blocked") {
            return res.status(403).send({ message: "Relacja jest zablokowana"});
        }

        if (rel.status === "accepted") {
            return res.status(409).send({ message: "Już jesteście znajomymi"});
        }

        if (rel.status !== "pending") {
            return res.status(409).send({ message: "Brak oczekującego zaproszenia"});
        }

        if(rel.request_by === userId ) {
            return res.status(403).send({ message: "Nie możesz zaakceptować własnego zaproszenia."});
        }

        rel.status = "accepted";
        await rel.save();

        const [conv] = await PrivateConversation.findOrCreate({
            where: {
                ID_USER1: low,
                ID_USER2: high
            },
            defaults: {
                ID_USER1: low,
                ID_USER2: high
            },
        });

        const io = req.app?.locals?.io;
        if (io) {
            io.to(`user:${low}`).to(`user:${high}`).emit("friend:accepted", {
                conversationId: conv.ID_Conversation, userId, otherUserId
            });
        }

        return res.status(200).send({message: "Zaproszenie zaakceptowane",
            conversationId: {
                ID_Conversation: conv.ID_Conversation,
                ID_USER1: conv.ID_USER1,
                ID_USER2: conv.ID_USER2,
                createdAt: conv.createdAt,
            },
        });
    } catch (err) {
        return res.status(500).send({message: err.message});
    }
};

exports.rejectRequest = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        //Odrzucenie zaproszenia
        const low = Math.min(userId, otherUserId);
        const high = Math.max(userId, otherUserId);

        const rel = await Friend.findOne({
            where: { ID_user: low, ID_friend: high },
            attributes: ["ID_Friend", "ID_user", "ID_friend", "status", "request_by"],
        });

        if(!rel) return res.status(404).send({ message: "Zaproszenie nie istnieje "});

        if (rel.status === "accepted") {
            return res.status(409).send({ message: "Relacja jest już zaakceptowana"});
        }

        if (rel.status === "blocked") {
            return res.status(403).send({ message: "Relacja jest zablokowana"});
        }

        if (rel.status !== "pending") {
            return res.status(409).send({ message: "Brak oczekującego zaproszenia"});
        }

        await rel.destroy();

        return res.status(204).send();
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

exports.removeRequest = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
    
        //Zabezpieczenie
        const otheruser = await User.findByPk(otherUserId);
        if (!otheruser) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});

        //Usuwanie znajomego
        const low = Math.min(userId, otherUserId);
        const high = Math.max(userId, otherUserId);

        const rel = await Friend.findOne({
            where: { ID_user: low, ID_friend: high},
            attributes: ["ID_Friend", "status"]
        });

        if (!rel) {
            return res.status(204).send();
        }

        await rel.destroy();
        return res.status(204).send();
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

exports.blockUser = async (req, res, userId, otherUserId) => {
    try {
        //Użytkownik
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).send({ message: 'Nie znaleziono użytkownika'});
        
        //Zabezpieczenie
        if(userId === otherUserId) {
            return res.status(400).send({ message: "Nie możesz zablokować samego siebie "});
        }

        const low = Math.min(userId, otherUserId);
        const high = Math.max(userId, otherUserId);
        let rel = await Friend.findOne({
            where: { ID_user: low, ID_friend: high },
            attributes: ["ID_Friend", "ID_user", "ID_friend", "status", "request_by"]
        });

        if (!rel) {
            rel = await Friend.create({
                ID_user: low,
                ID_friend: high,
                status: "blocked",
                request_by: userId
            });
            return res.status(200).send({ message: "Użytkownik zablokowany"});
        }

        if (rel.status === "blocked") {
        return res.status(200).send({ message: "Użytkownik już był zablokowany"});
        }

        rel.status = "blocked";
        rel.request_by = userId;
        await rel.save();

        return res.status(200).send({ message: "użytkownik zablokowany"});
    } catch (err) {
        return res.status(500).send({ message: err.message});
    }
};

exports.unblockUser = async (req, res, userId, otherUserId) => {
  try {
    const low  = Math.min(userId, otherUserId);
    const high = Math.max(userId, otherUserId);

    const rel = await Friend.findOne({
      where: { ID_user: low, ID_friend: high, status: "blocked" },
    });

    if (!rel) {
      return res.status(404).send({ message: "Brak blokady dla tego użytkownika." });
    }

    await rel.destroy();
    return res.status(200).send({ message: "Użytkownik odblokowany." });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.myFriend = async (req, res, userId) => {
  try {
    const { page, size } = normalizePageSize(
      req.query.page,
      req.query.size ?? req.query.limit
    );
    const { limit, offset } = getPagination(page, size);
    const uid = Number(userId) || 0;

    // 1) lista zablokowanych
    const blockedRels = await Friend.findAll({
      where: {
        status: "blocked",
        [Op.or]: [{ ID_user: uid }, { ID_friend: uid }],
      },
      attributes: ["ID_user", "ID_friend"],
      raw: true,
    });

    const blockedIdsRaw = blockedRels.map((r) =>
      r.ID_user === uid ? r.ID_friend : r.ID_user
    );
    const blockedIds = [...new Set(blockedIdsRaw)];

    // budujemy fragment WHERE w zależności czy są blokady
    const blockedWhere =
      blockedIds.length > 0 ? ' AND u."ID_USER" NOT IN (:blockedIds)' : "";

    // 2) count – ile użytkowników
    const countReplacements = blockedIds.length > 0
      ? { uid, blockedIds }
      : { uid };

    const [countRow] = await sequelize.query(
      `
      SELECT COUNT(*)::int AS "cnt"
      FROM "users" u
      WHERE u."ID_USER" <> :uid
      ${blockedWhere}
    `,
      {
        type: QueryTypes.SELECT,
        replacements: countReplacements,
      }
    );

    const totalItems = countRow?.cnt ?? 0;
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const inRange =
      totalPages === 0 ? page === 0 : page >= 0 && page < totalPages;

    if (!inRange) {
      return res.status(404).send({
        message: "Strona poza zakresem",
        totalItems,
        totalPages,
        requestedPage: page,
      });
    }

    // 3) właściwa lista
    const listReplacements = blockedIds.length > 0
      ? { uid, blockedIds, limit, offset }
      : { uid, limit, offset };

    const users = await sequelize.query(
      `
      SELECT
        u."ID_USER",
        u."username",
        u."avatar",
        u."createdAt",
        COALESCE((
          SELECT MAX(pm."createdAt")
          FROM "private_messages" pm
          JOIN "private_conversation" pc
            ON pc."ID_Conversation" = pm."ID_Conversation"
          WHERE
            (pc."ID_USER1" = :uid AND pc."ID_USER2" = u."ID_USER")
            OR
            (pc."ID_USER2" = :uid AND pc."ID_USER1" = u."ID_USER")
        ), TIMESTAMP '1970-01-01') AS "lastActivityAt"
      FROM "users" u
      WHERE u."ID_USER" <> :uid
      ${blockedWhere}
      ORDER BY "lastActivityAt" DESC, u."username" ASC
      LIMIT :limit OFFSET :offset
    `,
      {
        type: QueryTypes.SELECT,
        replacements: listReplacements,
      }
    );

    const friends = users.map((u) => ({
      FriendshipId: null,
      since: u.createdAt,
      lastActivityAt: u.lastActivityAt,
      isRequester: false,
      user: {
        ID_USER: u.ID_USER,
        username: u.username,
        avatar: u.avatar,
      },
    }));

    return res.status(200).send({
      totalItems,
      friends,
      totalPages,
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    console.error("myFriend error:", error);
    return res.status(500).send({ message: error.message });
  }
};






exports.myFriendPending = async (req, res, userId) => {
    try {
        const rows = await Friend.findAll({
            where: {
                status: 'pending',
                [Op.or]: [
                    {ID_user: userId},
                    {ID_friend: userId},
                ]
            },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "ID_USER",
                        "username",
                        "avatar",
                        "createdAt"
                    ],
                    required: false,
                },
                {
                    model: User,
                    as: "friend",
                    attributes: [
                        "ID_USER",
                        "username",
                        "avatar",
                        "createdAt"
                    ],
                    required: false,
                },
            ],
        });

        const incoming = [];
        const outgoing = [];

        for (const row of rows) {
            const other = row.ID_user === userId ? row.friend : row.user;
            if (!other) continue;

            const base = {
                FriendshipId: row.ID_Friend,
                since: row.createdAt,
                isRequester: row.request_by === userId,
                user: 
                    {
                        ID_USER: other.ID_USER,
                        username: other.username,
                        avatar: other.avatar,
                    },
            };

            if (row.request_by === userId) {
                outgoing.push(base);
            } else {
                incoming.push(base);
            }
        };


        return res.status(200).send({
            totalItems: rows.length,
            incoming,
            outgoing,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.myFriendBlocked = async (req, res, userId) => {
    try {
        const rows = await Friend.findAll({
            where: {
                status: 'blocked',
                [Op.or]: [
                    {ID_user: userId},
                    {ID_friend: userId},
                ]
            },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "ID_USER",
                        "username",
                        "avatar",
                        "createdAt"
                    ],
                    required: false,
                },
                {
                    model: User,
                    as: "friend",
                    attributes: [
                        "ID_USER",
                        "username",
                        "avatar",
                        "createdAt"
                    ],
                    required: false,
                },
            ],
        });

        const blockedByMe = [];
        const blockedMe = [];

        for (const row of rows) {
            const other = row.ID_user === userId ? row.friend : row.user;
            if (!other) continue;

            const base = {
                FriendshipId: row.ID_Friend,
                since: row.createdAt,
                blockedByUserId: row.request_by === userId,
                user: 
                    {
                        ID_USER: other.ID_USER,
                        username: other.username,
                        avatar: other.avatar,
                    },
            };

            if (row.request_by === userId) {
                blockedByMe.push(base);
            } else {
                blockedMe.push(base);
            }
        };


        return res.status(200).send({
            totalItems: rows.length,
            blockedByMe,
            blockedMe,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};