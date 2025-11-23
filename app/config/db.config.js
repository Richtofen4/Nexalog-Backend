// ustawienia dockera
/*
module.exports = {
    HOST: "localhost",
    USER: "postgres",
    PASSWORD: "postgres",
    DB: "postgres",
    port: 5432,
    dialect: "postgres",
    pool: {
        max: 100,
        min: 0,
        acquire: 10000,
        idle: 20000
    },
    logging: false
};
*/

module.exports = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
  PORT: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};
