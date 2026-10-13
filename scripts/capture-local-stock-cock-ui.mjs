import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.STOCK_COCK_CAPTURE_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const outputDir = resolve("docs/evidence/2026-10-13-stock-cock-local-ui-capture");
const email = "portfolio-demo@stock-cock.local";
const password = "DemoPass!2026";
if (!existsSync(".env.local")) throw new Error("Missing local Supabase environment file");
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let videoPath;
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: resolve(outputDir, ".recordings"), size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: "networkidle" });
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/home");
  await page.getByText("재고 현황").waitFor({ state: "visible" });
  await page.waitForTimeout(1800);
  await page.getByRole("link", { name: "입/출고" }).click();
  await page.waitForURL("**/transactions");
  await page.waitForTimeout(1800);
  await page.getByText("데모 도시락").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1800);
  await context.close();
  videoPath = await video.path();
} finally {
  await browser.close();
}
if (!videoPath) throw new Error("Browser recording was not created");
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    videoPath,
    "-c:v",
    "libx264",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    resolve(outputDir, "stock-cock-local-ui-flow.mp4"),
  ],
  { stdio: "inherit" }
);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    resolve(outputDir, "stock-cock-local-ui-flow.mp4"),
    "-vf",
    "fps=12,scale=390:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4",
    "-loop",
    "0",
    resolve(outputDir, "stock-cock-local-ui-flow.gif"),
  ],
  { stdio: "inherit" }
);
writeFileSync(
  resolve(outputDir, "manifest.json"),
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      baseUrl,
      flow: ["local sign-in", "current inventory home", "transaction history"],
      fixture: "local Supabase only; capture user and seeded data",
      submittedMutations: false,
      unsupportedClaims: [
        "production data",
        "production user behavior",
        "live operational writes",
        "ERP Lab performance",
      ],
    },
    null,
    2
  )}\n`
);
console.log(`Local UI capture written to ${outputDir}`);
