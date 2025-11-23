module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define("notifications", {
    ID_Notification: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ID_USER: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "ID_USER",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },

    serverId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    channelId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    conversationId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    title: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    body: {
      type: Sequelize.STRING(500),
      allowNull: false,
    },

    isRead: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
  }, {
    tableName: "notifications",
    timestamps: true,
    updatedAt: false,
    freezeTableName: true,
    indexes: [
      { fields: ["ID_USER", "isRead"] },
      { fields: ["type"] },
    ],
  });

  Notification.associate = function(models) {
    Notification.belongsTo(models.User, {
      foreignKey: "ID_USER",
      as: "user",
    });
  };

  return Notification;
};
