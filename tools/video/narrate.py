#!/usr/bin/env python3
"""動画のナレーションを作る。

    python3 tools/video/narrate.py tools/video/film-75s.html /tmp/nar.wav [声] [速さ]

元のページの window.CUES（字幕）をそのまま読み上げて、字幕と同じ時刻に置く。
だから音と字幕は必ず合う。

声は Kokoro（英語の音声合成、82Mの小さなモデル）。既定は af_heart（アメリカ英語の女性）。
モデルは /opt/kokoro に置く。入手先は

  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

速さを 1.35 にすると、1.35倍で読み上げる。

台本の枠には合わせない。実際に読み上げた長さで、前の行のすぐ後ろに詰めていく。
だから無音がほとんど残らない。詰めた結果の時刻は .spans.json に書き出すので、
render.cjs がそれを読んで、場面の長さもそこに合わせる。
"""
import json
import os
import re
import sys
import wave

import numpy as np

MODEL = os.environ.get("KOKORO_MODEL", "/opt/kokoro/kokoro-v1.0.onnx")
VOICES = os.environ.get("KOKORO_VOICES", "/opt/kokoro/voices-v1.0.bin")
DEFAULT_VOICE = "af_heart"
SR = 24000


def cues_from(page):
    """元のページから CUES と DURATION を取り出す"""
    src = open(page, encoding="utf-8").read()
    m = re.search(r"var CUES = (\[[\s\S]*?\]);", src)
    if not m:
        raise SystemExit(page + " に CUES がありません")
    rows = json.loads(m.group(1).replace("\n", " "))
    d = re.search(r"var DURATION = ([\d.]+);", src)
    return rows, float(d.group(1))


def main():
    page, out = sys.argv[1], sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_VOICE
    rate = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    cues, _ = cues_from(page)

    from kokoro_onnx import Kokoro
    kokoro = Kokoro(MODEL, VOICES)
    print(f"声: {voice}   速さ: ×{rate}")

    LEAD, GAP, TAIL = 0.30, 0.22, 0.55

    clips = []
    for _s, _e, text in cues:
        samples, sr = kokoro.create(text, voice=voice, speed=rate, lang="en-us")
        if sr != SR:
            idx = np.linspace(0, len(samples) - 1, int(len(samples) * SR / sr))
            samples = np.interp(idx, np.arange(len(samples)), samples).astype(np.float32)
        clips.append((samples, text))

    # 前の行のすぐ後ろに詰める。空いた時間を作らない。
    spans, at = [], LEAD
    for samples, text in clips:
        d = len(samples) / SR
        spans.append([round(at, 3), round(at + d, 3)])
        print(f"  {at:6.2f}s  {d:4.1f}秒  {text[:50]}")
        at += d + GAP
    duration = at - GAP + TAIL

    track = np.zeros(int(duration * SR) + 1, dtype=np.float32)
    for (samples, _), span in zip(clips, spans):
        a = int(span[0] * SR)
        n = min(len(samples), len(track) - a)
        track[a:a + n] = samples[:n]

    with open(out + ".spans.json", "w", encoding="utf-8") as f:
        json.dump(spans, f)

    peak = float(np.max(np.abs(track))) or 1.0
    pcm = (track / peak * 0.92 * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    speech = sum(len(c[0]) for c in clips) / SR
    print(f"✓ {out}  {duration:.1f}秒（うち声 {speech:.1f}秒 = {speech/duration*100:.0f}%）  {voice}  ×{rate}")


if __name__ == "__main__":
    main()
