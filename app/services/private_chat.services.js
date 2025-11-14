const db = require("../models");
const { Op } = db.Sequelize;
const PrivateConversation = db.PrivateConversation;
const PrivateMessage = db.PrivateMessage;

//Funkcja pomocnicza
async function ensureMember(conversationId, userId) {
    const conv = await PrivateConversation.findByPk(conversationId, {
        attributes: ["ID_Conversation", "ID_USER1", "ID_USER2"]
    });
    if (!conv) {
         return { error: {code: 404, message: "Konwersacja nie istnieje"}};
    }
    if (conv.ID_USER1 !== userId && conv.ID_USER2 !== userId) {
        return { error: {code: 403, message: "Brak dostępu do tej konwersacji"}};
    }
    return { conv };
}

//Funkcja sprawdzająca właścicela wiadomości
async function getOwnMessage(conversationId, messageId, userId, opts = {}) {
    const { forbiddeenMessage = "Możesz edytować tylko swoje wiadomości" } = opts;
    const msg = await PrivateMessage.findOne({
        where: { 
            ID_Message: messageId,
            ID_Conversation: conversationId
        },
        attributes: [
            "ID_Message",
            "ID_Conversation",
            "ID_Sender",
            "content",
            "edited",
            "deleted",
            "createdAt",
            "updatedAt"
        ]
    });
    if (!msg) {
        return { error: {code: 404, message: "Wiadomość nie istnieje"}};
    }
    if (msg.ID_Sender !== userId) {
        return { error: {code: 403, message: forbiddeenMessage}};
    }
    return {msg};
}


exports.getRecentMessages = async ({ req, res, userId, conversationId, limit, beforeId}) => {
    try {
        const { error } = await ensureMember(conversationId, userId);
        if (error) {
            return res.status(error.code).send({ message: error.message});
        }

        const where = {
            ID_Conversation: conversationId,
            deleted: false,
            ...(beforeId ? { ID_Message: { [Op.lt]: beforeId}}: {}),
        };

        const rows = await PrivateMessage.findAll({
            where,
            order: [["ID_Message", "DESC"]],
            limit,
            attributes: [
                "ID_Message",
                "ID_Conversation",
                "ID_Sender",
                "content",
                "edited",
                "deleted",
                "createdAt"
            ]
        });

        //Zwróc listę
        const messages = rows.reverse();

        //Kursor do paginacji
        const nextBeforeId = messages.length ? messages[0].ID_Message : null;

        return res.status(200).send({ messages, nextBeforeId});
    } catch (e) {
        return res.status(500).send({ message: e.message});
    }
};

exports.sendMessage = async ({ req, res, userId, conversationId, content }) => {
  try {
    if (!content) {
      return res.status(400).send({ message: "Treść wiadomości jest wymagana" });
    }
    if (content.length > 5000) {
      return res.status(400).send({ message: "Wiadomość jest za długa (max 5000 znaków)" });
    }

    const { error, conv } = await ensureMember(conversationId, userId);
    if (error) {
      return res.status(error.code).send({ message: error.message });
    }

    const senderId    = Number(userId);
    const participant1 = Number(conv.ID_USER1);
    const participant2 = Number(conv.ID_USER2);
    const recipientId  = (participant1 === senderId) ? participant2 : participant1;

    const msg = await PrivateMessage.create({
      ID_Conversation: conversationId,
      ID_Sender: senderId,
      content
    });

    const payload = {
      ID_Message:      msg.ID_Message,
      ID_Conversation: msg.ID_Conversation,
      ID_Sender:       msg.ID_Sender,
      ID_Recipient:    recipientId,
      content:         msg.content,
      edited:          msg.edited,
      deleted:         msg.deleted,
      createdAt:       msg.createdAt
    };

    const io = req.app?.locals?.io;
    if (io) {
      // czat w otwartej konwersacji
      io.to(`conv:${conversationId}`).emit("message:new", payload);

      // bump listy u adresata
      io.to(`user:${recipientId}`).emit("inbox:new", payload);
      io.to(`user:${senderId}`).emit("inbox:new", payload);
    }

    return res.status(201).send({ message: "Wiadomość wysłana", data: msg });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};

exports.editMessage = async ({ req, res, userId, conversationId, messageId, content}) => {
    try {
        if (!content || !content.trim()) {
            return res.status(400).send({ message: "Treść wiadomości jest wymagana"});
        }

        if (content.length > 5000) {
            return res.status(400).send({ message: "Wiadomość jest za długa"});
        }

        const { error: accessError } = await ensureMember(conversationId, userId);
        if (accessError) {
            return res.status(accessError.code).send({message: accessError.message});
        }

        const { error, msg } = await getOwnMessage(conversationId, messageId, userId);
        if (error) {
            return res.status(error.code).send({ message: error.message});
        }

        if (msg.deleted) {
            return res.status(400).send({ message: "Nie można edytować usuniętej wiadomości"});
        }

        msg.content = content;
        msg.edited = true;
        await msg.save();

        const io = req.app?.locals?.io;
        if (io) {
            io.to(`conv:${conversationId}`).emit("message:edited", {
                ID_Message: msg.ID_Message,
                ID_Conversation: msg.ID_Conversation,
                ID_Sender: msg.ID_Sender,
                content: msg.content,
                edited: msg.edited,
                deleted: msg.deleted,
                updatedAt: msg.updatedAt
            });
        }

        return res.status(200).send({ message: "Wiadomość zaktualizowana", data: msg});
    } catch (e) {
        return res.status(500).send({ message: e.message});
    }
};

exports.deleteMessage = async ({ req, res, userId, conversationId, messageId}) => {
    try {
        const { error: accessError} = await ensureMember(conversationId, userId);
        if (accessError) {
            return res.status(accessError.code).send({message: accessError.message});
        }

        const { error, msg} = await getOwnMessage(conversationId, messageId, userId, {
            forbiddeenMessage: "Usunięta wiadomość",
        });
        if (error) {
            return res.status(error.code).send({ message: error.message});
        }

        if (msg.deleted) {
            return res.status(204).send();
        }

        msg.deleted = true;
        await msg.save();

        const io = req.app?.locals?.io;
        if (io) {
            io.to(`conv:${conversationId}`).emit("message:deleted", {
                ID_Message: msg.ID_Message,
                ID_Conversation: msg.ID_Conversation,
                deleted: true,
            });
        }
        return res.status(204).send();
    } catch (e) {
        return res.status(500).send({ message: e.message});
    }
};

async function findOrCreateConversation(userA, userB) {
  const [u1, u2] = userA < userB ? [userA, userB] : [userB, userA];

  let conv = await PrivateConversation.findOne({
    where: { ID_USER1: u1, ID_USER2: u2 },
    attributes: ["ID_Conversation", "ID_USER1", "ID_USER2"],
  });

  if (!conv) {
    conv = await PrivateConversation.create({
      ID_USER1: u1,
      ID_USER2: u2,
    });
  }
  return conv;
}

exports.getOrCreateByUser = async ({ req, res, userId, otherUserId }) => {
  try {
    const other = Number(otherUserId);
    if (!other || Number.isNaN(other)) {
      return res.status(400).send({ message: "Nieprawidłowe ID użytkownika." });
    }
    if (other === userId) {
      return res.status(400).send({ message: "Nie można rozmawiać samemu ze sobą." });
    }

    const conv = await findOrCreateConversation(userId, other);

    return res
      .status(200)
      .send({ conversationId: conv.ID_Conversation });
  } catch (e) {
    return res.status(500).send({ message: e.message });
  }
};