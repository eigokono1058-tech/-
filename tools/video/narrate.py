#!/usr/bin/env python3
"""動画のナレーションを作る。

    python3 tools/video/narrate.py tools/video/film-75s.html /tmp/nar.wav [声] [速さ]

元のページの window.CUES（字幕）をそのまま読み上げて、字幕と同じ時刻に置く。
だから音と字幕は必ず合う。

声は Kokoro（英語の音声合成、82Mの小さなモデル）。既定は af_heart（アメリカ英語の女性）。
モデルは /opt/kokoro に置く。入手先は

  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

速さを 1.2 にすると、1.2倍で読み上げ、置く時刻も 1.2 で割る。
動画側も同じ数字で書き出せば、全体がそのぶん短くなる（82秒 → 68秒）。

枠に収まらない行は、収まるまで少しだけ速くする。それでも入らない行は
CUES の文章そのものを短くするほうがよい（早口は聞き取りにくい）。
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
    cues, duration = cues_from(page)
    duration /= rate

    from kokoro_onnx import Kokoro
    kokoro = Kokoro(MODEL, VOICES)
    print(f"声: {voice}   速さ: ×{rate}")

    track = np.zeros(int(duration * SR), dtype=np.float32)

    for start, end, text in cues:
        start, end = start / rate, end / rate
        window = end - start
        speed = rate
        samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
        # 枠に収まらなければ、収まるまで少しだけ速くする
        for _ in range(6):
            if len(samples) / sr <= window - 0.12:
                break
            speed *= 1.07
            samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
        if sr != SR:
            idx = np.linspace(0, len(samples) - 1, int(len(samples) * SR / sr))
            samples = np.interp(idx, np.arange(len(samples)), samples).astype(np.float32)
        at = int(start * SR)
        n = min(len(samples), len(track) - at)
        track[at:at + n] = samples[:n]
        print(f"  {start:6.1f}s  {len(samples)/SR:4.1f}秒 / 枠{window:4.1f}秒  "
              f"×{speed:.2f}  {text[:44]}")

    peak = float(np.max(np.abs(track))) or 1.0
    pcm = (track / peak * 0.92 * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"✓ {out}  {duration:.1f}秒  {SR}Hz  {voice}  ×{rate}")


if __name__ == "__main__":
    main()
