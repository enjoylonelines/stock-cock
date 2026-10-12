import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "docs/evidence/2026-10-12-stock-cock-erp-portfolio-scenario");
const mobileScreenshot = resolve(root, "public/screenshots/mobile.png");
const durableResultPath = resolve(root, "labs/erp-domain/ecount/evidence/2026-10-09-durable-import-job-set-based-v1.json");
const rowWorkerResultPath = resolve(root, "labs/erp-domain/ecount/evidence/2026-10-09-durable-import-job-v1.json");

for (const path of [mobileScreenshot, durableResultPath, rowWorkerResultPath]) {
  if (!existsSync(path)) throw new Error(`Missing required evidence: ${path}`);
}

const durable = JSON.parse(readFileSync(durableResultPath, "utf8"));
const rowWorker = JSON.parse(readFileSync(rowWorkerResultPath, "utf8"));
const percentDecrease = ((1 - durable.timing.worker_elapsed_ms / rowWorker.timing.worker_elapsed_ms) * 100).toFixed(1);
const mobilePng = readFileSync(mobileScreenshot).toString("base64");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const wrap = (eyebrow, title, body, content) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#081827"/><stop offset="1" stop-color="#102f3e"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <rect x="96" y="84" width="1728" height="8" rx="4" fill="#36c0ab"/>
  <text x="120" y="162" fill="#77e2d0" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="28" font-weight="700">${escape(eyebrow)}</text>
  <text x="120" y="244" fill="#f6fbff" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="58" font-weight="700">${escape(title)}</text>
  <text x="120" y="308" fill="#bed0dc" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="30">${escape(body)}</text>
  ${content}
  <text x="120" y="1012" fill="#8aa1af" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="24">portfolio scenario · actual UI screenshot and disposable-lab evidence are intentionally separated</text>
</svg>`;

const metric = (x, y, value, label, note = "") => `<g><rect x="${x}" y="${y}" width="500" height="218" rx="22" fill="#15394b" stroke="#2a6377"/><text x="${x + 36}" y="${y + 70}" fill="#7ce6d1" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="50" font-weight="700">${escape(value)}</text><text x="${x + 36}" y="${y + 126}" fill="#f3f9fc" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="29" font-weight="700">${escape(label)}</text><text x="${x + 36}" y="${y + 170}" fill="#aec1cc" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="23">${escape(note)}</text></g>`;

const slides = [
  wrap("01 · stock-cock 실제 업무 화면", "현재고 확인 → 입출고 기록 → 이력 확인", "모바일 PWA에서 현장 재고 업무를 한 흐름으로 묶었습니다.", `<rect x="1280" y="360" width="390" height="690" rx="32" fill="#ecf3f7"/><image x="1300" y="380" width="351" height="624" href="data:image/png;base64,${mobilePng}"/><text x="150" y="470" fill="#f6fbff" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="40" font-weight="700">실사용 피드백을 반영한 제품 범위</text><text x="150" y="540" fill="#c4d4dd" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">• 현재고와 입·출고 진입점을 모바일에서 확인</text><text x="150" y="600" fill="#c4d4dd" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">• 완제품뿐 아니라 원재료 단위 관리로 확장</text><text x="150" y="660" fill="#c4d4dd" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">• 운영 데이터 조회·제출을 재현하지 않은 화면 근거</text>`),
  wrap("02 · stock-cock 기록 경계", "입출고는 DB RPC 한 호출로 기록합니다", "애플리케이션의 여러 순차 쓰기를 DB 함수 한 호출로 옮겼습니다.", `<g font-family="Apple SD Gothic Neo, Arial, sans-serif" font-weight="700"><rect x="150" y="440" width="300" height="150" rx="24" fill="#15394b"/><text x="220" y="530" fill="#f6fbff" font-size="35">Mobile UI</text><path d="M470 515h155" stroke="#77e2d0" stroke-width="10"/><path d="M605 490l38 25-38 25" fill="#77e2d0"/><rect x="660" y="440" width="360" height="150" rx="24" fill="#15394b"/><text x="750" y="530" fill="#f6fbff" font-size="35">API route</text><path d="M1040 515h155" stroke="#77e2d0" stroke-width="10"/><path d="M1175 490l38 25-38 25" fill="#77e2d0"/><rect x="1230" y="440" width="500" height="150" rx="24" fill="#1f5b67"/><text x="1292" y="515" fill="#f6fbff" font-size="35">create_transaction RPC</text><text x="1292" y="558" fill="#c4d4dd" font-size="23">transaction · inventory · items</text></g><text x="150" y="720" fill="#f6fbff" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">확인된 범위: in/out RPC 코드·migration 경로</text><text x="150" y="778" fill="#ffcc88" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">미검증 범위: 운영 migration 적용, rollback, 동시성, 음수 재고 방지</text>`),
  wrap("03 · 후속 ERP Lab", "50,000행 receipt를 요청 대기 없이 durable job으로", "disposable PostgreSQL 16 · direct DB job-command · single-line receipt fixture", `${metric(150, 410, `${durable.job.posted.toLocaleString()} POSTED`, "정상 반영", `${durable.job.rejected} REJECTED · pending ${durable.job.pending}`)}${metric(710, 410, "lease 재개", "3,000행 뒤 강제 만료", "새 lease로 이어서 완료")}${metric(1270, 410, `${durable.reconciliation.reconciliation_mismatches}`, "대사 불일치", "posted without ledger 0")}${metric(430, 700, `${durable.timing.enqueue_ms.toFixed(3)}ms`, "job 등록", "요청을 오래 붙잡지 않음")}${metric(990, 700, `${durable.timing.worker_elapsed_ms.toFixed(3)}ms`, "set-based worker 완료", `${durable.timing.worker_rows_per_second.toFixed(3)} rows/s`)} `),
  wrap("04 · 개선 결과와 적용 경계", `row worker → set-based: ${percentDecrease}% 시간 감소`, "같은 50,000행 single-line receipt fixture에서만 비교했습니다.", `${metric(250, 410, `${(rowWorker.timing.worker_elapsed_ms / 1000).toFixed(3)}초`, "row worker", "49,999 POSTED · 1 REJECTED")}${metric(880, 410, `${(durable.timing.worker_elapsed_ms / 1000).toFixed(3)}초`, "receipt set-based worker", "49,999 POSTED · 1 REJECTED")}<text x="190" y="770" fill="#ffcc88" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="31">이 결과는 stock-cock 운영 성과가 아닙니다.</text><text x="190" y="830" fill="#c4d4dd" font-family="Apple SD Gothic Neo, Arial, sans-serif" font-size="28">HTTP API · 인증/RLS · multi-worker · 다른 전표 유형 · 실제 운영 트래픽에는 일반화하지 않았습니다.</text>`),
];

for (const [index, svg] of slides.entries()) {
  const svgPath = resolve(outputDir, `slide-${index + 1}.svg`);
  writeFileSync(svgPath, svg);
  // Homebrew ffmpeg does not include an SVG decoder on this host. macOS `sips`
  // preserves the SVG's 1920x1080 canvas before ffmpeg assembles MP4/GIF output.
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", resolve(outputDir, `slide-${index + 1}.png`)], { stdio: "inherit" });
}
const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", ...args], { stdio: "inherit" });
ffmpeg([
  "-loop", "1", "-t", "4", "-i", resolve(outputDir, "slide-1.png"),
  "-loop", "1", "-t", "4", "-i", resolve(outputDir, "slide-2.png"),
  "-loop", "1", "-t", "4", "-i", resolve(outputDir, "slide-3.png"),
  "-loop", "1", "-t", "4", "-i", resolve(outputDir, "slide-4.png"),
  "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,format=yuv420p[v]", "-map", "[v]", "-r", "24", "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", resolve(outputDir, "stock-cock-erp-scenario.mp4"),
]);
ffmpeg(["-i", resolve(outputDir, "stock-cock-erp-scenario.mp4"), "-vf", "fps=10,scale=960:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", resolve(outputDir, "stock-cock-erp-scenario.gif")]);
writeFileSync(resolve(outputDir, "manifest.json"), JSON.stringify({
  capturedAt: new Date().toISOString(),
  type: "portfolio scenario video",
  sourceUi: "public/screenshots/mobile.png",
  sourceEvidence: ["docs/portfolio/PRODUCT_WORKFLOW_EVIDENCE.md", "docs/portfolio/TRANSACTION_INTEGRITY_EVIDENCE.md", durableResultPath.replace(`${root}/`, ""), rowWorkerResultPath.replace(`${root}/`, "")],
  supportedClaims: ["mobile stock workflow UI", "in/out RPC code path", "disposable single-line receipt fixture result"],
  unsupportedClaims: ["stock-cock production throughput", "production concurrency safety", "negative stock prevention", "HTTP or multi-worker ERP performance", "actual cost savings"],
}, null, 2) + "\n");
console.log(`Scenario video written to ${outputDir}`);
