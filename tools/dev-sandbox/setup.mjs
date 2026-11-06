import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
const container = "supabase_db_stock-cock-management-dev";
const psql = (sql) => execFileSync("docker",["exec","-i",container,"psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-At"], {input:sql,encoding:"utf8"});
try {
  execFileSync("pnpm",["dlx","supabase","start","--workdir","tools/dev-sandbox","--exclude","studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta"],{stdio:"ignore",timeout:180000});
} catch (error) {
  // The CLI may time out after containers become healthy; verify this exact sandbox below.
  if (!psql("select 1").includes("1")) throw error;
}
if (psql("select to_regclass('public.products')").trim()) {
  if (!psql("select to_regclass('public.management_audit')").trim())
    throw new Error("Sandbox contains an older schema. Inspect it before applying additional migrations.");
  console.log("Management sandbox is already initialized.");
} else {
  for (const file of readdirSync("supabase/migrations").filter(name=>name.endsWith(".sql")).sort()) {
    psql("BEGIN;\n"+readFileSync("supabase/migrations/"+file,"utf8")+"\nCOMMIT;");
  }
  psql("NOTIFY pgrst, 'reload schema';");
  console.log("Isolated migrations applied on port 55321.");
}
