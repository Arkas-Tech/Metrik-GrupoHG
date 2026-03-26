"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuthUnified";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ============ TYPES ============

interface PM2Process {
  name: string;
  pid: number;
  status: string;
  uptime: number;
  restarts: number;
  memory: number;
  cpu: number;
  error?: string;
}

interface SystemStatus {
  pm2: PM2Process[];
  database: {
    table_counts: Record<string, number>;
    db_size: string;
    active_connections: number;
  };
  git: { commit: string; branch: string; last_commit: string; error?: string };
  system: { platform: string; python_version: string; hostname: string };
  disk: { total: string; used: string; available: string; use_percent: string };
}

interface RequestLogEntry {
  id: number;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  user_id: number | null;
  user_role: string | null;
  ip_address: string | null;
  error_detail: string | null;
  created_at: string;
}

interface UserDiagnostic {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  requests_today: number;
  errors_today: number;
  last_activity: string | null;
  marcas_count: number;
}

interface EndpointStat {
  path: string;
  method: string;
  avg_time: number;
  max_time?: number;
  min_time?: number;
  count: number;
  error_count?: number;
}

interface EndpointStats {
  period_hours: number;
  total_requests: number;
  total_errors: number;
  avg_response_ms: number;
  error_rate: number;
  slowest: EndpointStat[];
  most_errors: EndpointStat[];
  most_called: EndpointStat[];
}

interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

interface DataHealth {
  health_score: number;
  total_issues: number;
  issues: {
    severity: string;
    entity: string;
    message: string;
    count?: number;
  }[];
  stats: Record<string, Record<string, number>>;
}

interface FeatureFlagItem {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============ HELPERS ============

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "Nunca";
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function statusColor(code: number): string {
  if (code < 300) return "text-green-400";
  if (code < 400) return "text-yellow-400";
  if (code < 500) return "text-orange-400";
  return "text-red-400";
}

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-300",
    POST: "bg-green-500/20 text-green-300",
    PUT: "bg-yellow-500/20 text-yellow-300",
    DELETE: "bg-red-500/20 text-red-300",
    PATCH: "bg-purple-500/20 text-purple-300",
  };
  return colors[method] || "bg-gray-500/20 text-gray-300";
}

// ============ TABS ============

const TABS = [
  { id: "system", label: "Sistema", icon: "🖥️" },
  { id: "errors", label: "Errores", icon: "🔴" },
  { id: "users", label: "Usuarios", icon: "👥" },
  { id: "performance", label: "Performance", icon: "⚡" },
  { id: "activity", label: "Actividad", icon: "📋" },
  { id: "sync", label: "Sync", icon: "🔄" },
  { id: "health", label: "Data Health", icon: "💚" },
  { id: "flags", label: "Feature Flags", icon: "🚩" },
];

// ============ MAIN COMPONENT ============

interface DevToolsPanelProps {
  onClose?: () => void;
  initialTab?: string;
}

export default function DevToolsPanel({
  onClose,
  initialTab = "system",
}: DevToolsPanelProps) {
  const { usuario } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchApi = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    [token],
  );

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-sm font-bold text-black">
            D
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">
              Developer Tools
            </h1>
            <p className="text-gray-400 text-xs">
              {usuario?.nombre} &middot; Metrik Dev Panel
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded hover:bg-gray-700"
        >
          ✕ Cerrar
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-gray-800 border-b border-gray-700 px-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "system" && <SystemStatusTab fetchApi={fetchApi} />}
        {activeTab === "errors" && <ErrorLogsTab fetchApi={fetchApi} />}
        {activeTab === "users" && <UserDiagnosticsTab fetchApi={fetchApi} />}
        {activeTab === "performance" && <PerformanceTab fetchApi={fetchApi} />}
        {activeTab === "activity" && <ActivityLogTab fetchApi={fetchApi} />}
        {activeTab === "sync" && <SyncTab fetchApi={fetchApi} />}
        {activeTab === "health" && <DataHealthTab fetchApi={fetchApi} />}
        {activeTab === "flags" && <FeatureFlagsTab fetchApi={fetchApi} />}
      </div>
    </div>
  );
}

// ============ TAB: SYSTEM STATUS ============

function SystemStatusTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<SystemStatus>;
}) {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await fetchApi("/dev/system-status");
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Cargando estado del sistema..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">🖥️ Estado del Sistema</h2>
        <button
          onClick={load}
          className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* PM2 Processes */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
          PM2 Procesos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.pm2.map((p, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg p-3 border border-gray-700"
            >
              {"error" in p ? (
                <div className="text-red-400 text-sm">{p.error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-mono font-semibold">
                      {p.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "online"
                          ? "bg-green-500/20 text-green-400"
                          : p.status === "stopped"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-400">
                      PID:{" "}
                      <span className="text-gray-200 font-mono">{p.pid}</span>
                    </div>
                    <div className="text-gray-400">
                      Uptime:{" "}
                      <span className="text-gray-200">
                        {formatUptime(p.uptime)}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      RAM:{" "}
                      <span className="text-gray-200">
                        {formatBytes(p.memory)}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      CPU: <span className="text-gray-200">{p.cpu}%</span>
                    </div>
                    <div className="text-gray-400">
                      Restarts:{" "}
                      <span
                        className={
                          p.restarts > 5
                            ? "text-red-400 font-bold"
                            : "text-gray-200"
                        }
                      >
                        {p.restarts}
                      </span>
                    </div>
                  </div>
                  {/* Memory bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.memory > 500_000_000
                            ? "bg-red-500"
                            : p.memory > 200_000_000
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min((p.memory / 1_000_000_000) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Git + System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
            Git
          </h3>
          {data.git.error ? (
            <div className="text-red-400 text-sm">{data.git.error}</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="text-gray-400">
                Branch:{" "}
                <span className="text-cyan-400 font-mono">
                  {data.git.branch}
                </span>
              </div>
              <div className="text-gray-400">
                Commit:{" "}
                <span className="text-yellow-400 font-mono">
                  {data.git.commit}
                </span>
              </div>
              <div className="text-gray-400">
                Último:{" "}
                <span className="text-gray-200">{data.git.last_commit}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
            Sistema
          </h3>
          <div className="space-y-2 text-sm">
            <div className="text-gray-400">
              Host:{" "}
              <span className="text-gray-200">{data.system.hostname}</span>
            </div>
            <div className="text-gray-400">
              Python:{" "}
              <span className="text-gray-200">
                {data.system.python_version}
              </span>
            </div>
            <div className="text-gray-400">
              OS:{" "}
              <span className="text-gray-200 text-xs">
                {data.system.platform}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
            Disco
          </h3>
          <div className="space-y-2 text-sm">
            <div className="text-gray-400">
              Total: <span className="text-gray-200">{data.disk.total}</span>
            </div>
            <div className="text-gray-400">
              Usado: <span className="text-gray-200">{data.disk.used}</span>
            </div>
            <div className="text-gray-400">
              Uso:{" "}
              <span
                className={`font-bold ${
                  parseInt(data.disk.use_percent) > 80
                    ? "text-red-400"
                    : parseInt(data.disk.use_percent) > 60
                      ? "text-yellow-400"
                      : "text-green-400"
                }`}
              >
                {data.disk.use_percent}
              </span>
            </div>
            <div className="mt-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    parseInt(data.disk.use_percent) > 80
                      ? "bg-red-500"
                      : parseInt(data.disk.use_percent) > 60
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: data.disk.use_percent || "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
          Base de Datos
        </h3>
        <div className="flex gap-4 mb-4">
          <div className="bg-gray-900 rounded px-3 py-2 text-sm">
            <span className="text-gray-400">Tamaño: </span>
            <span className="text-cyan-400 font-mono font-bold">
              {data.database.db_size}
            </span>
          </div>
          <div className="bg-gray-900 rounded px-3 py-2 text-sm">
            <span className="text-gray-400">Conexiones: </span>
            <span className="text-cyan-400 font-mono font-bold">
              {data.database.active_connections}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Object.entries(data.database.table_counts).map(([table, count]) => (
            <div
              key={table}
              className="bg-gray-900 rounded px-3 py-2 flex justify-between items-center"
            >
              <span className="text-gray-400 text-xs font-mono truncate mr-2">
                {table}
              </span>
              <span
                className={`text-sm font-bold font-mono ${count === -1 ? "text-red-400" : count === 0 ? "text-gray-500" : "text-white"}`}
              >
                {count === -1 ? "ERR" : count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TAB: ERROR LOGS ============

function ErrorLogsTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<RequestLogEntry[]>;
}) {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi("/dev/error-logs?limit=100&status_min=400");
      setLogs(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Cargando errores..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">🔴 Monitor de Errores</h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
            {logs.length} errores recientes
          </span>
          <button
            onClick={load}
            className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
          >
            ↻
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-green-400 font-semibold">
            Sin errores recientes
          </div>
          <div className="text-gray-500 text-sm mt-1">
            No hay errores 4xx/5xx registrados
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-800 rounded border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full px-3 py-2 flex items-center gap-3 text-left"
              >
                <span
                  className={`font-mono text-sm font-bold ${statusColor(log.status_code)}`}
                >
                  {log.status_code}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono ${methodColor(log.method)}`}
                >
                  {log.method}
                </span>
                <span className="text-gray-300 text-sm font-mono truncate flex-1">
                  {log.path}
                </span>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {timeAgo(log.created_at)}
                </span>
                <span className="text-gray-500 text-xs">
                  {log.response_time_ms}ms
                </span>
              </button>
              {expanded === log.id && (
                <div className="px-3 pb-3 border-t border-gray-700 mt-1 pt-2 space-y-1 text-xs">
                  <div className="text-gray-400">
                    User:{" "}
                    <span className="text-gray-200">
                      {log.user_id ?? "anon"} ({log.user_role ?? "N/A"})
                    </span>
                  </div>
                  <div className="text-gray-400">
                    IP: <span className="text-gray-200">{log.ip_address}</span>
                  </div>
                  <div className="text-gray-400">
                    Fecha:{" "}
                    <span className="text-gray-200">{log.created_at}</span>
                  </div>
                  {log.error_detail && (
                    <pre className="bg-gray-900 text-red-300 p-2 rounded text-xs overflow-x-auto mt-2 max-h-40 overflow-y-auto">
                      {log.error_detail}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TAB: USER DIAGNOSTICS ============

function UserDiagnosticsTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<UserDiagnostic[]>;
}) {
  const [users, setUsers] = useState<UserDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi("/dev/users-diagnostic");
      setUsers(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Diagnosticando usuarios..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  const roleColor = (role: string) => {
    const colors: Record<string, string> = {
      developer: "bg-amber-500/20 text-amber-400",
      administrador: "bg-purple-500/20 text-purple-400",
      coordinador: "bg-blue-500/20 text-blue-400",
      auditor: "bg-green-500/20 text-green-400",
    };
    return colors[role] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">
          👥 Diagnóstico de Usuarios
        </h2>
        <button
          onClick={load}
          className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
        >
          ↻
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={users.length} color="text-white" />
        <StatCard
          label="Activos hoy"
          value={users.filter((u) => u.requests_today > 0).length}
          color="text-green-400"
        />
        <StatCard
          label="Con errores"
          value={users.filter((u) => u.errors_today > 0).length}
          color="text-red-400"
        />
        <StatCard
          label="Requests hoy"
          value={users.reduce((s, u) => s + u.requests_today, 0)}
          color="text-cyan-400"
        />
      </div>

      {/* User table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Rol</th>
                <th className="px-3 py-2 text-right">Req. Hoy</th>
                <th className="px-3 py-2 text-right">Errores</th>
                <th className="px-3 py-2 text-right">Marcas</th>
                <th className="px-3 py-2 text-left">Última actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="text-white font-medium">{u.full_name}</div>
                    <div className="text-gray-500 text-xs">@{u.username}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(u.role)}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-200">
                    {u.requests_today}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    <span
                      className={
                        u.errors_today > 0 ? "text-red-400" : "text-gray-500"
                      }
                    >
                      {u.errors_today}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-200">
                    {u.marcas_count}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {timeAgo(u.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ TAB: PERFORMANCE ============

function PerformanceTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<EndpointStats>;
}) {
  const [data, setData] = useState<EndpointStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi(`/dev/endpoint-stats?hours=${hours}`);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi, hours]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Analizando performance..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  const maxAvgTime = Math.max(...data.slowest.map((s) => s.avg_time), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">⚡ Performance</h2>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600"
          >
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={72}>3d</option>
            <option value={168}>7d</option>
          </select>
          <button
            onClick={load}
            className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Requests"
          value={data.total_requests.toLocaleString()}
          color="text-white"
        />
        <StatCard
          label="Errores"
          value={data.total_errors}
          color="text-red-400"
        />
        <StatCard
          label="Tasa error"
          value={`${data.error_rate}%`}
          color={
            data.error_rate > 5
              ? "text-red-400"
              : data.error_rate > 1
                ? "text-yellow-400"
                : "text-green-400"
          }
        />
        <StatCard
          label="Avg Response"
          value={`${data.avg_response_ms}ms`}
          color={
            data.avg_response_ms > 1000
              ? "text-red-400"
              : data.avg_response_ms > 500
                ? "text-yellow-400"
                : "text-green-400"
          }
        />
      </div>

      {/* Slowest Endpoints */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
          Endpoints más lentos
        </h3>
        <div className="space-y-2">
          {data.slowest.slice(0, 10).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-mono w-14 text-center ${methodColor(s.method)}`}
              >
                {s.method}
              </span>
              <span className="text-gray-300 text-sm font-mono flex-1 truncate">
                {s.path}
              </span>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    s.avg_time > 1000
                      ? "bg-red-500"
                      : s.avg_time > 500
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min((s.avg_time / maxAvgTime) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-gray-200 text-xs font-mono w-20 text-right">
                {s.avg_time}ms avg
              </span>
              <span className="text-gray-500 text-xs w-14 text-right">
                ×{s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Most Called */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
          Endpoints más llamados
        </h3>
        <div className="space-y-2">
          {data.most_called.slice(0, 10).map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-mono w-14 text-center ${methodColor(m.method)}`}
              >
                {m.method}
              </span>
              <span className="text-gray-300 text-sm font-mono flex-1 truncate">
                {m.path}
              </span>
              <span className="text-cyan-400 text-xs font-mono font-bold w-16 text-right">
                {m.count.toLocaleString()}
              </span>
              <span className="text-gray-500 text-xs w-16 text-right">
                {m.avg_time}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Most Errors */}
      {data.most_errors.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-red-900/50">
          <h3 className="text-red-400 font-semibold mb-3 text-sm uppercase tracking-wider">
            Endpoints con más errores
          </h3>
          <div className="space-y-2">
            {data.most_errors.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono w-14 text-center ${methodColor(e.method)}`}
                >
                  {e.method}
                </span>
                <span className="text-gray-300 text-sm font-mono flex-1 truncate">
                  {e.path}
                </span>
                <span className="text-red-400 text-xs font-mono font-bold">
                  {e.error_count} errores
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ TAB: ACTIVITY LOG ============

function ActivityLogTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<ActivityLogEntry[]>;
}) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi("/dev/activity-log?limit=100");
      setLogs(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Cargando actividad..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  const actionIcons: Record<string, string> = {
    post_factura: "📄",
    put_factura: "✏️",
    delete_factura: "🗑️",
    post_campana: "📢",
    put_campana: "✏️",
    delete_campana: "🗑️",
    post_presupuesto: "💰",
    put_presupuesto: "💰",
    post_evento: "🎪",
    delete_evento: "🗑️",
    post_proyeccion: "📊",
    put_proyeccion: "📊",
    post_marca: "🏷️",
    post_embajador: "🧑‍💼",
    sync_triggered: "🔄",
    feature_flag_created: "🚩",
    feature_flag_updated: "🚩",
    feature_flag_deleted: "🚩",
    logs_cleanup: "🧹",
    post_admin: "👤",
    put_admin: "✏️",
    delete_admin: "🗑️",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">📋 Actividad Reciente</h2>
        <button
          onClick={load}
          className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
        >
          ↻
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-gray-400">No hay actividad registrada aún</div>
          <div className="text-gray-500 text-sm mt-1">
            Las acciones se registran automáticamente
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-800 rounded px-3 py-2 border border-gray-700 flex items-center gap-3"
            >
              <span className="text-lg">{actionIcons[log.action] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200 text-sm font-medium">
                    {log.action}
                  </span>
                  {log.entity_type && (
                    <span className="text-xs bg-gray-700 text-gray-400 px-1.5 rounded">
                      {log.entity_type}
                      {log.entity_id ? `#${log.entity_id}` : ""}
                    </span>
                  )}
                </div>
                {log.details && (
                  <div className="text-gray-500 text-xs truncate">
                    {log.details}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-xs">
                  {log.user_name || `user:${log.user_id}`}
                </div>
                <div className="text-gray-500 text-xs">
                  {timeAgo(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TAB: SYNC ============

function SyncTab({
  fetchApi,
}: {
  fetchApi: (
    url: string,
    options?: RequestInit,
  ) => Promise<Record<string, unknown>>;
}) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<
    string,
    Record<string, unknown>
  > | null>(null);
  const [error, setError] = useState("");

  const triggerSync = async (service: string) => {
    setSyncing(service);
    setError("");
    try {
      const d = await fetchApi(`/dev/sync/${service}`, { method: "POST" });
      setResults(d as Record<string, Record<string, unknown>>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSyncing(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-white text-xl font-bold">🔄 Re-sincronización</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: "google_ads",
            name: "Google Ads",
            icon: "📊",
            color: "from-blue-600 to-blue-800",
          },
          {
            id: "meta_ads",
            name: "Meta Ads",
            icon: "📱",
            color: "from-indigo-600 to-indigo-800",
          },
          {
            id: "all",
            name: "Todos",
            icon: "🔁",
            color: "from-amber-600 to-amber-800",
          },
        ].map((service) => (
          <button
            key={service.id}
            onClick={() => triggerSync(service.id)}
            disabled={syncing !== null}
            className={`bg-gradient-to-br ${service.color} rounded-lg p-6 text-left border border-white/10 hover:border-white/30 transition-all ${
              syncing === service.id
                ? "animate-pulse"
                : syncing
                  ? "opacity-50"
                  : ""
            }`}
          >
            <div className="text-3xl mb-2">{service.icon}</div>
            <div className="text-white font-bold">{service.name}</div>
            <div className="text-white/60 text-sm mt-1">
              {syncing === service.id
                ? "Verificando..."
                : "Click para verificar config"}
            </div>
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      {results && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-amber-400 font-semibold mb-3">Resultados</h3>
          <pre className="text-gray-300 text-sm bg-gray-900 p-3 rounded overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============ TAB: DATA HEALTH ============

function DataHealthTab({
  fetchApi,
}: {
  fetchApi: (url: string) => Promise<DataHealth>;
}) {
  const [data, setData] = useState<DataHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi("/dev/data-health");
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Validando datos..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  const scoreColor =
    data.health_score >= 80
      ? "text-green-400"
      : data.health_score >= 50
        ? "text-yellow-400"
        : "text-red-400";

  const scoreRingColor =
    data.health_score >= 80
      ? "stroke-green-400"
      : data.health_score >= 50
        ? "stroke-yellow-400"
        : "stroke-red-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">💚 Data Health</h2>
        <button
          onClick={load}
          className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
        >
          ↻ Re-scan
        </button>
      </div>

      {/* Health Score Circle */}
      <div className="flex items-center gap-8">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className={scoreRingColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(data.health_score / 100) * 339.29} 339.29`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor}`}>
              {data.health_score}
            </span>
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {data.health_score >= 80
              ? "Saludable"
              : data.health_score >= 50
                ? "Revisar"
                : "Crítico"}
          </div>
          <div className="text-gray-400 text-sm">
            {data.total_issues} problemas encontrados
          </div>
        </div>
      </div>

      {/* Issues */}
      {data.issues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
            Problemas detectados
          </h3>
          {data.issues.map((issue, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 border flex items-center gap-3 ${
                issue.severity === "error"
                  ? "bg-red-900/20 border-red-800"
                  : issue.severity === "warning"
                    ? "bg-yellow-900/20 border-yellow-800"
                    : "bg-blue-900/20 border-blue-800"
              }`}
            >
              <span className="text-lg">
                {issue.severity === "error"
                  ? "❌"
                  : issue.severity === "warning"
                    ? "⚠️"
                    : "ℹ️"}
              </span>
              <div className="flex-1">
                <div className="text-gray-200 text-sm">{issue.message}</div>
                <div className="text-gray-500 text-xs">{issue.entity}</div>
              </div>
              {issue.count !== undefined && (
                <span className="text-gray-400 font-mono text-sm">
                  {issue.count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
          Estadísticas por entidad
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.stats).map(([entity, stats]) => (
            <div
              key={entity}
              className="bg-gray-900 rounded-lg p-3 border border-gray-700"
            >
              <div className="text-gray-400 text-xs font-mono uppercase">
                {entity}
              </div>
              <div className="text-white text-xl font-bold mt-1">
                {stats.total?.toLocaleString() ?? "?"}
              </div>
              {Object.entries(stats)
                .filter(([k]) => k !== "total")
                .map(([key, val]) => (
                  <div key={key} className="text-gray-500 text-xs mt-0.5">
                    {key}:{" "}
                    <span
                      className={
                        typeof val === "number" && val > 0
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }
                    >
                      {typeof val === "number" ? val : String(val)}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TAB: FEATURE FLAGS ============

function FeatureFlagsTab({
  fetchApi,
}: {
  fetchApi: (url: string, options?: RequestInit) => Promise<unknown>;
}) {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchApi("/dev/feature-flags");
      setFlags(d as FeatureFlagItem[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFlag = async (flag: FeatureFlagItem) => {
    try {
      await fetchApi(`/dev/feature-flags/${flag.id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const createFlag = async () => {
    if (!newName.trim()) return;
    try {
      await fetchApi("/dev/feature-flags", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || null,
          enabled: false,
        }),
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteFlag = async (flag: FeatureFlagItem) => {
    if (!confirm(`¿Eliminar flag "${flag.name}"?`)) return;
    try {
      await fetchApi(`/dev/feature-flags/${flag.id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <LoadingSpinner label="Cargando feature flags..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">🚩 Feature Flags</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-500 font-medium"
          >
            + Nuevo Flag
          </button>
          <button
            onClick={load}
            className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
          >
            ↻
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-800 rounded-lg p-4 border border-amber-600/50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="nombre_del_flag (snake_case)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm focus:border-amber-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm focus:border-amber-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={createFlag}
                className="bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-500"
              >
                Crear
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flags list */}
      {flags.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="text-4xl mb-2">🏁</div>
          <div className="text-gray-400">No hay feature flags creados</div>
          <div className="text-gray-500 text-sm mt-1">
            Crea uno para controlar features en producción
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className={`bg-gray-800 rounded-lg p-4 border transition-colors ${
                flag.enabled ? "border-green-600/50" : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleFlag(flag)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      flag.enabled ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flag.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <div className="text-white font-mono font-medium">
                      {flag.name}
                    </div>
                    {flag.description && (
                      <div className="text-gray-500 text-xs">
                        {flag.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      flag.enabled
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-600/50 text-gray-400"
                    }`}
                  >
                    {flag.enabled ? "ON" : "OFF"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {timeAgo(flag.updated_at)}
                  </span>
                  <button
                    onClick={() => deleteFlag(flag)}
                    className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SHARED COMPONENTS ============

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
        <span className="text-gray-400">{label}</span>
      </div>
    </div>
  );
}

function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="text-red-400 font-medium text-sm">Error</div>
        <div className="text-red-300 text-xs mt-1">{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs bg-red-800 text-red-200 px-3 py-1.5 rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="text-gray-400 text-xs uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>
        {value}
      </div>
    </div>
  );
}
