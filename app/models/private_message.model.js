module.exports = (sequelize, Sequelize) => {
    const PrivateMessage = sequelize.define("private_messages", {
        ID_Message: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ID_Conversation: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'private_conversation',
                key: 'ID_Conversation'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        ID_Sender: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            },
        },
        content: {
            type: Sequelize.TEXT,
            allowNull: false,
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
            defaultValue: Sequelize.fn('NOW'),
        },
    }, 
    {
            timestamps: true,
            freezeTableName: true,
            indexes: [
                { fields: ['ID_Conversation', 'createdAt']},
                { fields: ['ID_Sender']},
            ], 
    });
    PrivateMessage.associate = (models) => {
        PrivateMessage.belongsTo(models.PrivateConversation, {
            foreignKey: 'ID_Conversation',
            as: 'conversation',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }),
        PrivateMessage.belongsTo(models.User, {
            foreignKey: 'ID_Sender',
            as: 'sender',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        })
    }

    return PrivateMessage;
}