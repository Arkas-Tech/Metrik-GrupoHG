const http = require("http");
const crypto = require("crypto");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 9001;
const SECRET =
  "7ddf072ba7afe35a12faf54b020297330060e7439459446fa67cf51b48d1f315";
const DEPLOY_SCRIPT = "/home/sgpme/app/deploy.sh";
const LOG_FILE = "/home/sgpme/app/logs/webhook.log";

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

function verifySignature(payload, signature) {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function executeDeploy() {
  return new Promise((resolve, reject) => {
    log("Executing deployment script...");

    exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
      if (error) {
        log(`Deployment error: ${error.message}`);
        log(`Stderr: ${stderr}`);
        reject(error);
        return;
      }

      log(`Deployment stdout: ${stdout}`);
      if (stderr) {
        log(`Deployment stderr: ${stderr}`);
      }
      log("Deployment completed successfully");
      resolve(stdout);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const signature = req.headers["x-hub-signature-256"];

        // Verify signature
        if (!verifySignature(body, signature)) {
          log("Invalid signature received");
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid signature" }));
          return;
        }

        const payload = JSON.parse(body);
        const event = req.headers["x-github-event"];

        log(`Received ${event} event from GitHub`);

        // Only process push events to main branch
        if (event === "push" && payload.ref === "refs/heads/main") {
          log(
            `Push to main branch detected. Commit: ${payload.head_commit.id}`,
          );
          log(`Commit message: ${payload.head_commit.message}`);
          log(`Pushed by: ${payload.pusher.name}`);

          try {
            await executeDeploy();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "success",
                message: "Deployment executed successfully",
              }),
            );
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "error",
                message: "Deployment failed",
                error: error.message,
              }),
            );
          }
        } else {
          log(`Ignored: ${event} event for ref ${payload.ref || "N/A"}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ignored",
              message: "Event not configured for deployment",
            }),
          );
        }
      } catch (error) {
        log(`Error processing webhook: ${error.message}`);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad request" }));
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    // Health check endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  log(`Webhook server listening on port ${PORT}`);
  log(`Deployment script: ${DEPLOY_SCRIPT}`);
  log(`Log file: ${LOG_FILE}`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down gracefully...");
  server.close(() => {
    log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down gracefully...");
  server.close(() => {
    log("Server closed");
    process.exit(0);
  });
});
