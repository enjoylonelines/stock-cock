// Starts only the isolated management sandbox. No production credentials are used.
import { execFileSync, spawn } from "node:child_process";
import { openSync, readFileSync, existsSync } from "node:fs";
const status = JSON.parse(execFileSync("pnpm", ["dlx", "supabase", "status", "--workdir", "tools/dev-sandbox", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
if (new URL(status.API_URL).port !== "55321") throw new Error("Unexpected sandbox URL");
const pidFile = "/tmp/stock-cock-management-dev.pid";
if (existsSync(pidFile)) {
  try { process.kill(Number(readFileSync(pidFile, "utf8")), 0); console.log("Sandbox server already running"); process.exit(0); }
  catch {}
}
const log = openSync("/tmp/stock-cock-management-dev.log", "a");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbopack", "--hostname", "0.0.0.0", "--port", "3000"], {
  detached: true, stdio: ["ignore", log, log],
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, NEXT_DIST_DIR: ".next-management", NEXT_TSCONFIG_PATH: "tools/dev-sandbox/tsconfig.json" },
});
const { writeFileSync } = await import("node:fs");
writeFileSync(pidFile, String(child.pid));
child.unref();
console.log("Development server: http://localhost:3000");
