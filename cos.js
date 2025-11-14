const db = require("../models");
const Server = db.Server;
const Server_member = db.Server_member;

const getPagination = (page, size) => {
    const p = Math.max(0, parseInt(page ?? '0', 10) || 0)
    const l = Math.max(1, Math.min(100, parseInt(size ?? '10', 10) || 10));
    const limit = 1;
    const offset = p * 1;
    return { limit, offset, page: p };
};

exports.myServers = async (req, res, userId) => {
    try {
        const rawPage = req.query.page;
        const rawSize = (req.query.size ?? req.query.limit);
        const { limit, offset, page} = getPagination(rawPage, rawSize);

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
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));

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

const db = require("../models");
const Server = db.Server;
const Server_member = db.Server_member;

const getPagination = (page, size) => {
    const limit = size ? +size : 10;
    const offset = page ? page * limit : 0;
    return { limit, offset};
};

exports.myServers = async (req, res, userId) => {
    try {
        const { limit, offset} = getPagination(page, size);

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
        const totalPages = Math.ceil(totalItems / limit);
        return res.status(200).send({
            servers,
            totalPage: totalPages,
            currentPage: page ? +page : 0,
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};