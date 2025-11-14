// ustawienia dockera
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