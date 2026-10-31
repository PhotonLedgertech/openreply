// Render free-tier entrypoint for the DM worker.
// Render Web Services must bind a PORT and free instances spin down after
// ~15 min without inbound HTTP, so this wrapper:
//   1. serves a tiny HTTP health endpoint on $PORT (keeps Render happy)
//   2. spawns the real worker (tsx worker/dm-worker.ts) as a child process
// External pinger (cron-job.org / UptimeRobot, every 5-10 min) hits / to
// prevent spin-down. If the child dies, the wrapper exits so Render restarts it.
import http from "node:http";
import { spawn } from "node:child_process";

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("openreply worker alive");
});
server.listen(port, () => {
  console.log(`[keepalive] http server listening on :${port}`);
});

const child = spawn("npx", ["tsx", "worker/dm-worker.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

child.on("exit", (code, signal) => {
  console.error(`[keepalive] worker exited code=${code} signal=${signal}`);
  server.close();
  process.exit(code ?? 1);
});
