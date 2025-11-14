const { toDefaultValue } = require("sequelize/lib/utils");

module.exports = (sequelize, Sequelize) => {
    const Server = sequelize.define("servers", {
        ID_Server: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING
        },
        ID_USER: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            }
        },
        icon_url: {
            type: Sequelize.STRING
        },
        code: {
            type: Sequelize.STRING,
            unique: true,
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

    Server.associate = function(models) {
        Server.belongsToMany(models.User, {
            through: models.Server_member,
            foreignKey: 'ID_Server',
            otherKey: 'ID_USER',
            as: 'member' 
        });
        Server.hasMany(models.Channel, {
            foreignKey: 'ID_Server',
            as: 'channel'
        });
    };

    return Server;
}