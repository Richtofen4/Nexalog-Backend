const config = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(
    config.DB,
    config.USER,
    config.PASSWORD,
    {
        host: config.HOST,
        dialect: config.dialect,
        pool: {
            max: config.pool.max,
            min: config.pool.min,
            acquire: config.pool.acquire,
            idle: config.pool.idle
        }
    }
);

const db = {}
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user.model.js')(sequelize, Sequelize);
db.Friendship = require('./friend.model.js')(sequelize, Sequelize);
db.Server = require('./server.model.js')(sequelize, Sequelize);
db.Server_member = require('./server_members.model.js')(sequelize, Sequelize);
db.Channel = require('./channel.model.js')(sequelize, Sequelize);
db.Channel_message = require('./channel_message.model.js')(sequelize, Sequelize);
db.PrivateMessage = require('./private_message.model.js')(sequelize, Sequelize);
db.PrivateConversation = require('./private_conversation.model.js')(sequelize, Sequelize);
db.Notification = require("./notification.model.js")(sequelize, Sequelize);

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

module.exports = db;