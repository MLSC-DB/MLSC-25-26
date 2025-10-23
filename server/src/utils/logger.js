const pino = require("pino");

const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

module.exports = logger;
