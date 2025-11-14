const { toDefaultValue } = require("sequelize/lib/utils");

module.exports = (sequelize, Sequelize) => {
    const Channel = sequelize.define("channel", {
        ID_Channel: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ID_Server: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'servers',
                key: 'ID_Server'
            }
        },
        name: {
            type: Sequelize.STRING
        },
        type: {
            type: Sequelize.STRING
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

    Channel.associate = function(models) {
        Channel.belongsTo(models.Server, {
            foreignKey: 'ID_Server',
            as: 'server'
        });
        Channel.hasMany(models.Channel_message, {
            foreignKey: 'ID_Channel',
            as: 'channel_message'
        });
    };

    return Channel;
}