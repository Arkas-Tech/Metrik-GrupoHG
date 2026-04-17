/**
 * keepalive.js — pings the backend every 4 minutes to keep the DB connection
 * pool warm and prevent cold-start latency after periods of inactivity.
 */
const http = require("http");

function ping() {
  const req = http.get("http://localhost:8080/", (res) => {
    res.resume(); // drain response so socket is released
  });
  req.on("error", () => {}); // silent — server may be starting up
  req.setTimeout(5000, () => req.destroy());
}

// Ping on startup, then every 4 minutes
ping();
setInterval(ping, 4 * 60 * 1000);
