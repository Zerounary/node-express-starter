const pino = require("pino");
const dest = pino.destination("./logs.log");
const logger = pino(dest);

module.exports = logger;