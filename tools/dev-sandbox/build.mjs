import { execFileSync } from "node:child_process";
const config = JSON.parse(execFileSync("pnpm", ["dlx","supabase","status","--workdir","tools/dev-sandbox","--output","json"], {encoding:"utf8",stdio:["ignore","pipe","ignore"]}));
if (new URL(config.API_URL).port !== "55321") throw new Error("Unexpected sandbox URL");
execFileSync("pnpm",["build"], {stdio:"inherit",env:{
 ...process.env,NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:config.ANON_KEY,
 SUPABASE_SERVICE_ROLE_KEY:config.SERVICE_ROLE_KEY,NEXT_DIST_DIR:".next-management-build",
 NEXT_TSCONFIG_PATH:"tools/dev-sandbox/tsconfig.json",
}});
