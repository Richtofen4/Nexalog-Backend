const { toDefaultValue } = require("sequelize/lib/utils");

module.exports = (sequelize, Sequelize) => {
    const Server_member = sequelize.define("servers_member", {
        ID_Server: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'servers',
                key: 'ID_Server'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            primaryKey: true
        },
        ID_USER: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            primaryKey: true
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

    Server_member.associate = function(models) {
        Server_member.belongsTo(models.Server, {
            foreignKey: 'ID_Server',
            as: 'server',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Server_member.belongsTo(models.User, {
            foreignKey: 'ID_USER',
            as: 'user',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return Server_member;
}