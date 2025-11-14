const { toDefaultValue } = require("sequelize/lib/utils");

module.exports = (sequelize, Sequelize) => {
    const Channel_message = sequelize.define("channels_message", {
        ID_Channel_message: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ID_Channel: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'channel',
                key: 'ID_Channel'
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        ID_USER: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        name: {
            type: Sequelize.STRING
        },
        content: {
            type: Sequelize.STRING
        },
        edited: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        deleted: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        createdAt: { 
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW')
        }

    },
    {
        timestamps: true,
        freezeTableName: true
    });

    Channel_message.associate = function(models) {
        Channel_message.belongsTo(models.User, {
            foreignKey: 'ID_USER',
            as: 'user'
        });
        Channel_message.belongsTo(models.Channel, {
            foreignKey: {
                name: 'ID_Channel',
                allowNull: false,
            },
            as: 'channel'
        });
    };

    return Channel_message;
}