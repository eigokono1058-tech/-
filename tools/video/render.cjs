/* ==========================================================================
   動画の書き出し。元のページを1コマずつ撮って、mp4とwebmにまとめる。

     python3 tools/video/narrate.py tools/video/film-50s.html /tmp/nar.wav
     node tools/video/render.cjs film-50s.html assets/video/delivery-os-full /tmp/nar.wav

   ページは window.seek(秒) で任意の時刻の絵になるので、実時間で待たずに
   確実に同じコマが撮れる。撮り直しても結果は同じ。
   window.CUES（字幕）があれば .vtt も一緒に書き出す。
   3つめにwavを渡すと、それを音声として入れる（narrate.py が作る。人の声に
   差し替えるときも、同じ長さのwavを渡せばよい）。
   ========================================================================== */
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 24;
const W = 720, H = 1280;

const SRC = path.resolve(__dirname, process.argv[2] || "film-50s.html");
const BASE = path.resolve(process.argv[3] || path.join(__dirname, "../../assets/video/delivery-os-full"));
const WAV = process.argv[4] ? path.resolve(process.argv[4]) : null;

function ffmpeg() {
  return execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"])
    .toString().trim();
}
function vttTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" +
    sec.toFixed(3).padStart(6, "0");
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("file://" + SRC, { waitUntil: "networkidle" });

  const duration = await page.evaluate(() => window.DURATION);
  const cues = await page.evaluate(() => window.CUES || null);
  const frames = Math.round(duration * FPS);
  process.stdout.write(`${path.basename(SRC)} → ${duration}秒 / ${frames}コマ\n`);

  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    await page.screenshot({
      path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 94
    });
    if (i % 200 === 0) process.stdout.write(`  ${i}/${frames}\n`);
  }
  await browser.close();
  if (errs.length) { console.log("❌ ページのエラー: " + errs.join(" | ")); process.exit(1); }

  fs.mkdirSync(path.dirname(BASE), { recursive: true });
  const ff = ffmpeg();
  const mp4 = ["-y", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg")];
  if (WAV) mp4.push("-i", WAV);
  mp4.push("-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p");
  if (WAV) mp4.push("-c:a", "aac", "-b:a", "96k", "-ac", "1", "-shortest");
  mp4.push("-movflags", "+faststart", BASE + ".mp4");
  execFileSync(ff, mp4, { stdio: ["ignore", "ignore", "pipe"] });

  const webm = ["-y", "-i", BASE + ".mp4", "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0",
    "-row-mt", "1", "-deadline", "good", "-cpu-used", "2"];
  if (WAV) webm.push("-c:a", "libopus", "-b:a", "72k");
  webm.push(BASE + ".webm");
  execFileSync(ff, webm, { stdio: ["ignore", "ignore", "pipe"] });

  if (cues && cues.length) {
    const vtt = "WEBVTT\n\n" + cues.map((c, i) =>
      (i + 1) + "\n" + vttTime(c[0]) + " --> " + vttTime(c[1]) + "\n" + c[2]).join("\n\n") + "\n";
    fs.writeFileSync(BASE + ".en.vtt", vtt);
  }

  fs.rmSync(dir, { recursive: true, force: true });
  const kb = (f) => Math.round(fs.statSync(f).size / 1024);
  console.log(`✓ ${BASE}.mp4 ${kb(BASE + ".mp4")}KB / .webm ${kb(BASE + ".webm")}KB` +
    (cues ? ` / .en.vtt ${cues.length}行` : "") + `  ${duration}秒`);
})();
