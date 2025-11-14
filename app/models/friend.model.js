module.exports = (sequelize, Sequelize) => {
    const Friendship = sequelize.define("friendships", {
        ID_Friend: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ID_user: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            }
        },
        ID_friend: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'ID_USER'
            }
        },
        status: {
            type: Sequelize.ENUM('pending', 'accepted', 'blocked'),
            allowNull: false,
            defaultValue: 'pending'
        },
        request_by: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users', 
                key: 'ID_USER'
            }
        },
        createdAt: { 
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW')
        }

    },
    {
        tableName: 'friendships',
        timestamps: true,
        freezeTableName: true,
        indexes: [
            {
                unique: true,
                fields: ['ID_user', 'ID_friend']
            },
            { fields: ['ID_user']},
            { fields: ['ID_friend']}
        ]
    });

    Friendship.addHook('beforeValidate', (row) => {
        if (row.ID_user === row.ID_friend) {
            throw new Error('Nie można dodać do znajomych samego siebie');
        }
        if (row.ID_user > row.ID_friend) {
            const tmp = row.ID_user;
            row.ID_user = row.ID_friend;
            row.ID_friend = tmp;
        }
        if (row.request_by !== row.ID_user && row.request_by !== row.ID_friend) {
            throw new Error('request_by nie prawidłowy');
        }
    });

    Friendship.associate = function(models) {
        Friendship.belongsTo(models.User, { 
            foreignKey: 'ID_user', as: 'user'
        });
        Friendship.belongsTo(models.User, { 
            foreignKey: 'ID_friend', as: 'friend'
        });
        Friendship.belongsTo(models.User, { 
            foreignKey: 'request_by', as: 'requester'
        });
    };

    return Friendship;
}