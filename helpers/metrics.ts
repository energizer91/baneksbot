import * as http from "http";
import * as client from "prom-client";

client.collectDefaultMetrics({
  prefix: "baneksbot_",
});

export const updatesTotal = new client.Counter({
  name: "baneksbot_updates_total",
  help: "Total number of Telegram updates processed",
  labelNames: ["type"], // e.g. message, callback_query
});

export const handlerDuration = new client.Histogram({
  name: "baneksbot_update_handler_duration_seconds",
  help: "Time spent handling a Telegram update",
  labelNames: ["type", "status"], // status: ok|error
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const errorsTotal = new client.Counter({
  name: "baneksbot_errors_total",
  help: "Total errors",
  labelNames: ["where", "code"], // where: telegram|mongo|elastic|handler, code: class/name
});

export const inFlight = new client.Gauge({
  name: "baneksbot_in_flight",
  help: "Currently processed updates",
});

export const usersCreatedTotal = new client.Counter({
  name: "baneksbot_users_created_total",
  help: "Total created user/chat records",
  labelNames: ["kind"], // user|chat
});

export const usersTotal = new client.Gauge({
  name: "baneksbot_users_total",
  help: "Total users count",
});

export const usersSubscribedTotal = new client.Gauge({
  name: "baneksbot_users_subscribed_total",
  help: "Total subscribed users count",
});

export const usersApproverTotal = new client.Gauge({
  name: "baneksbot_users_approver_total",
  help: "Total approver users count",
});

export const usersAdminTotal = new client.Gauge({
  name: "baneksbot_users_admin_total",
  help: "Total admin users count",
});

export const usersEditorTotal = new client.Gauge({
  name: "baneksbot_users_editor_total",
  help: "Total editor users count",
});

export const usersBannedTotal = new client.Gauge({
  name: "baneksbot_users_banned_total",
  help: "Total banned users count",
});

export const updateEventsTotal = new client.Counter({
  name: "baneksbot_update_events_total",
  help: "Total bot events emitted",
  labelNames: ["event"], // e.g. message, command, inline_query
});

export const commandsTotal = new client.Counter({
  name: "baneksbot_commands_total",
  help: "Total bot commands processed",
  labelNames: ["command"],
});

export const callbackQueriesTotal = new client.Counter({
  name: "baneksbot_callback_queries_total",
  help: "Total callback queries processed",
  labelNames: ["action"],
});

export const outboundMessagesTotal = new client.Counter({
  name: "baneksbot_outbound_messages_total",
  help: "Total outgoing Telegram messages",
  labelNames: ["method"],
});

export const networkRequestsTotal = new client.Counter({
  name: "baneksbot_network_requests_total",
  help: "Total outbound network requests",
  labelNames: ["service", "method", "status", "code"],
});

export const networkRequestDuration = new client.Histogram({
  name: "baneksbot_network_request_duration_seconds",
  help: "Outbound network request duration",
  labelNames: ["service", "method", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

export const networkRetriesTotal = new client.Counter({
  name: "baneksbot_network_retries_total",
  help: "Total outbound request retries/backoffs",
  labelNames: ["service", "method", "reason"],
});

export const apiErrorsTotal = new client.Counter({
  name: "baneksbot_api_errors_total",
  help: "API-level errors returned by providers",
  labelNames: ["service", "method", "code"],
});

export const queueLengthByRule = new client.Gauge({
  name: "baneksbot_queue_length",
  help: "Queue size by rule",
  labelNames: ["rule"],
});

export const queueLengthTotal = new client.Gauge({
  name: "baneksbot_queue_length_total",
  help: "Total queue size",
});

export const queueInFlight = new client.Gauge({
  name: "baneksbot_queue_in_flight",
  help: "Queue requests currently in flight",
  labelNames: ["rule"],
});

export const queueWaitDuration = new client.Histogram({
  name: "baneksbot_queue_wait_duration_seconds",
  help: "Time spent waiting in queue before execution",
  labelNames: ["rule"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const queueRequestDuration = new client.Histogram({
  name: "baneksbot_queue_request_duration_seconds",
  help: "Queue request duration",
  labelNames: ["rule", "status"], // status: ok|error|retry
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

export const queueRetriesTotal = new client.Counter({
  name: "baneksbot_queue_retries_total",
  help: "Queue retries scheduled",
  labelNames: ["rule"],
});

export const queueErrorsTotal = new client.Counter({
  name: "baneksbot_queue_errors_total",
  help: "Queue request errors",
  labelNames: ["rule"],
});

export const cronJobDuration = new client.Histogram({
  name: "baneksbot_cron_job_duration_seconds",
  help: "Cron job runtime duration",
  labelNames: ["job", "status"], // status: ok|error
  buckets: [0.01, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
});

export const cronJobRunsTotal = new client.Counter({
  name: "baneksbot_cron_job_runs_total",
  help: "Cron job runs",
  labelNames: ["job", "status"],
});

export function startMetricsServer(port: number) {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/metrics") {
      res.statusCode = 200;
      res.setHeader("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
  });

  server.listen(port, "0.0.0.0");
}
