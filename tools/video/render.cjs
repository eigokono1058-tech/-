/* ==========================================================================
   動画の書き出し。delivery-os-film.html を1コマずつ撮って、mp4にまとめる。

     node tools/video/render.cjs [出力先.mp4]

   Playwright と ffmpeg（imageio-ffmpeg 同梱のもの）を使う。
   ページは window.seek(秒) で任意の時刻の絵になるので、実時間で待たずに
   確実に同じコマが撮れる。撮り直しても結果は同じ。
   ========================================================================== */
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 24;
const W = 720, H = 1280;

const SRC = path.resolve(__dirname, "delivery-os-film.html");
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "../../assets/video/delivery-os.mp4"));

function ffmpegPath() {
  return execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"])
    .toString().trim();
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("file://" + SRC, { waitUntil: "networkidle" });

  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  process.stdout.write(`${duration}秒 / ${frames}コマ を ${dir} に書き出し\n`);

  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    await page.screenshot({
      path: path.join(dir, String(i).padStart(5, "0") + ".jpg"),
      type: "jpeg", quality: 94
    });
    if (i % 120 === 0) process.stdout.write(`  ${i}/${frames}\n`);
  }
  await browser.close();

  if (errs.length) { console.log("❌ ページのエラー: " + errs.join(" | ")); process.exit(1); }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync(ffmpegPath(), [
    "-y", "-framerate", String(FPS),
    "-i", path.join(dir, "%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "23",
    "-pix_fmt", "yuv420p",              // どの端末でも再生できる形に
    "-movflags", "+faststart",          // 頭から順に読めるようにする
    OUT
  ], { stdio: ["ignore", "ignore", "pipe"] });

  fs.rmSync(dir, { recursive: true, force: true });
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`✓ ${OUT}  ${kb}KB  ${duration}秒`);
})();
