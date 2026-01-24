import pino, { Logger } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || "info";

const transport = !isProduction
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    })
  : undefined;

const baseLogger = pino(
  {
    level,
    base: {
      service: "baneks-node",
    },
  },
  transport,
);

const createLogger = (scope: string): Logger => {
  return baseLogger.child({ scope });
};

export default createLogger;
