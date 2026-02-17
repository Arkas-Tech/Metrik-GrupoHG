module.exports = {
  apps: [
    // ═══════════════════════════════════════════
    //  METRIK BACKEND (FastAPI + Uvicorn)
    // ═══════════════════════════════════════════
    {
      name: "metrik-backend",
      script: "/home/sgpme/app/backend/start.sh",
      cwd: "/home/sgpme/app/backend",
      exec_mode: "fork",
      interpreter: "bash",
      max_memory_restart: "500M",
      error_file: "/home/sgpme/app/logs/backend-error.log",
      out_file: "/home/sgpme/app/logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },

    // ═══════════════════════════════════════════
    //  METRIK FRONTEND (Next.js - Cluster Mode)
    //  2 workers = Zero Downtime Deployments
    // ═══════════════════════════════════════════
    {
      name: "metrik-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3030",
      cwd: "/home/sgpme/app/frontend",
      exec_mode: "cluster",
      instances: 2,
      // Graceful shutdown: espera a que peticiones activas terminen
      kill_timeout: 8000,
      // Tiempo máximo para considerar el worker como listo
      listen_timeout: 15000,
      // Evitar restart loops
      max_restarts: 10,
      min_uptime: "5s",
      // Memoria máxima por worker
      max_memory_restart: "250M",
      env: {
        PORT: 3030,
        NODE_ENV: "production",
      },
      error_file: "/home/sgpme/app/logs/frontend-error.log",
      out_file: "/home/sgpme/app/logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },

    // ═══════════════════════════════════════════
    //  METRIK WEBHOOK (GitHub Webhook Receiver)
    // ═══════════════════════════════════════════
    {
      name: "metrik-webhook",
      script: "/home/sgpme/app/webhook-server.js",
      cwd: "/home/sgpme/app",
      exec_mode: "fork",
      interpreter: "node",
      max_memory_restart: "100M",
      error_file: "/home/sgpme/app/logs/webhook-error.log",
      out_file: "/home/sgpme/app/logs/webhook-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },
  ],
};
