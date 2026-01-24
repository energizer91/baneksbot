/**
 * Created by Александр on 13.12.2015.
 */

/**
 * Module dependencies.
 */
import * as config from "config";
import * as http from "http";
import app from "./app";
import createLogger from "./helpers/logger";

const logger = createLogger("baneks-node:server");

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
}

/**
 * Get port from environment and store in Express.
 */

const port = config.get<number>("application.port");
app.set("port", port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: ErrnoException) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      logger.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      logger.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  logger.info("Listening on " + bind);
}
