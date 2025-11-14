module.exports = (sequelize, Sequelize) => {
    const PrivateConversation = sequelize.define("private_conversation", {
        ID_Conversation: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ID_USER1: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        ID_USER2: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
        },
    }, {
        timestamps: true,
        freezeTableName: true,
        indexes: [
            { unique: true, fields: ['ID_USER1', 'ID_USER2'] },
            { fields: ['ID_USER1']},
            { fields: ['ID_USER2']},
        ],
    });

    PrivateConversation.addHook('beforeValidate', (row) => {
        if (row.ID_USER1 === row.ID_USER2) {
            throw new Error('Nie można utworzyć konwersacji z samym sobą');
        }
        if (row.ID_USER1 > row.ID_USER2) {
            const tmp = row.ID_USER1;
            row.ID_USER1 = row.ID_USER2;
            row.ID_USER2 = tmp;
        }
    });

    PrivateConversation.associate = (models) => {
        PrivateConversation.belongsTo(models.User, {
            foreignKey: 'ID_USER1',
            as: 'user1',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        PrivateConversation.belongsTo(models.User, {
            foreignKey: 'ID_USER2',
            as: 'user2',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        PrivateConversation.hasMany(models.PrivateMessage, {
            foreignKey: 'ID_Conversation',
            as: 'messages',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return PrivateConversation;
}