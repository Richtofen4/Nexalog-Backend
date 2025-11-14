module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
        ID_USER: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: Sequelize.STRING
        },
        email: {
            type: Sequelize.STRING
        },
        password: {
            type: Sequelize.STRING
        },
       avatar: {
            type: Sequelize.STRING
        },
        about: {
            type: Sequelize.STRING
        },
        isAdmin: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        isBanned: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        status: {
            type: Sequelize.STRING,
            defaultValue: 'Created'
        },
        confirmationCode: {
            type: Sequelize.STRING,
            unique: true
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

    User.associate = function(models) {
        User.belongsToMany(models.Server, {
            through: models.Server_member,
            foreignKey: 'ID_USER',
            otherKey: 'ID_Server',
            as: 'server' 
        });
        User.hasMany(models.Channel_message, {
            foreignKey: 'ID_USER',
            as: 'channel_message',
            SourceKey: "ID_USER",
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
        User.hasMany(models.Friendship, { 
            foreignKey: 'ID_user',
            as: 'friendshipAsUser'
        });
        User.hasMany(models.Friendship, { 
            foreignKey: 'ID_friend',
            as: 'friendshipAsFriend'
        });
        User.hasMany(models.Friendship, { 
            foreignKey: 'request_by',
            as: 'friendRequestSent'
        });
        User.hasMany(models.PrivateConversation, {
            foreignKey: 'ID_USER1',
            as: 'conversationAsUser1'
        });
        User.hasMany(models.PrivateConversation, {
            foreignKey: 'ID_USER2',
            as: 'conversationAsUser2'
        });
        User.hasMany(models.PrivateMessage, {
            foreignKey: 'ID_Sender',
            as: 'private_messages'
        });
    };

    return User;
}