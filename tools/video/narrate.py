#!/usr/bin/env python3
"""動画のナレーションを作る。

    python3 tools/video/narrate.py tools/video/film-50s.html /tmp/narration.wav

元のページの window.CUES（字幕）をそのまま読み上げて、字幕と同じ時刻に置く。
だから音と字幕は必ず合う。

声は espeak-ng（pip の espeakng-loader に同梱されている共有ライブラリ）。
オフラインで動く代わりに、機械的な声になる。人の声に差し替えるときは
同じ長さのwavを用意して render.cjs に渡せばよい。
"""
import ctypes
import json
import re
import struct
import subprocess
import sys
import wave

import espeakng_loader

AUDIO_OUTPUT_RETRIEVAL = 1
espeakCHARS_UTF8 = 1
espeakRATE, espeakVOLUME, espeakPITCH = 1, 2, 3
SAMPLE_RATE = None

lib = ctypes.CDLL(espeakng_loader.get_library_path())
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short),
                      ctypes.c_int, ctypes.c_void_p)
_buf = bytearray()


@CB
def _on_samples(wav, n, events):
    if wav and n > 0:
        _buf.extend(ctypes.string_at(wav, n * 2))
    return 0


def init():
    global SAMPLE_RATE
    rate = lib.espeak_Initialize(AUDIO_OUTPUT_RETRIEVAL, 600,
                                 espeakng_loader.get_data_path().encode(), 0)
    if rate <= 0:
        raise SystemExit("espeak-ng を初期化できませんでした")
    SAMPLE_RATE = rate
    lib.espeak_SetSynthCallback(_on_samples)
    lib.espeak_SetVoiceByName(b"en-us")
    lib.espeak_SetParameter(espeakPITCH, 42, 0)
    lib.espeak_SetParameter(espeakVOLUME, 130, 0)


def say(text, wpm):
    """1行を読み上げて、16bitのサンプル列を返す"""
    _buf.clear()
    lib.espeak_SetParameter(espeakRATE, int(wpm), 0)
    data = text.encode("utf-8") + b"\x00"
    lib.espeak_Synth(data, len(data), 0, 0, 0, espeakCHARS_UTF8, None, None)
    lib.espeak_Synchronize()
    return bytes(_buf)


def cues_from(page):
    """元のページから CUES と DURATION を取り出す（Node を使わずに正規表現で）"""
    src = open(page, encoding="utf-8").read()
    m = re.search(r"var CUES = (\[[\s\S]*?\]);", src)
    if not m:
        raise SystemExit(page + " に CUES がありません")
    rows = json.loads(m.group(1).replace("\n", " "))
    d = re.search(r"var DURATION = ([\d.]+);", src)
    return rows, float(d.group(1))


def main():
    page, out = sys.argv[1], sys.argv[2]
    cues, duration = cues_from(page)
    init()

    total = int(duration * SAMPLE_RATE)
    track = bytearray(total * 2)          # 無音で埋めておく

    for start, end, text in cues:
        window = end - start
        wpm = 152
        pcm = say(text, wpm)
        # 枠に収まらなければ、収まるまで少しだけ速くする
        for _ in range(6):
            if len(pcm) / 2 / SAMPLE_RATE <= window - 0.12:
                break
            wpm = int(wpm * 1.08)
            pcm = say(text, wpm)
        at = int(start * SAMPLE_RATE) * 2
        n = min(len(pcm), len(track) - at)
        track[at:at + n] = pcm[:n]
        print(f"  {start:6.1f}s  {len(pcm)/2/SAMPLE_RATE:4.1f}秒 / 枠{window:4.1f}秒  "
              f"{wpm}wpm  {text[:44]}")

    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(track))
    print(f"✓ {out}  {duration}秒  {SAMPLE_RATE}Hz")


if __name__ == "__main__":
    main()
