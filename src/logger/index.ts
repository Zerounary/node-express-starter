const pino = require("pino");
// const dest = pino.destination("./logs.log");
// const logger = pino(dest);
const logger = pino();

export default logger;