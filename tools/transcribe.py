"""Transcribe a rehearsal recording offline with faster-whisper.

Usage: python3 tools/transcribe.py rehearsal/run2.m4a
Writes <name>_transcript.json (segments + word timestamps) and <name>_transcript.txt next to the audio.
Audio is decoded with PyAV here because faster-whisper's own decoder breaks on newer PyAV.
"""
import json, sys, time, pathlib
import av, numpy as np
from faster_whisper import WhisperModel

src = pathlib.Path(sys.argv[1])
c = av.open(str(src))
rs = av.AudioResampler(format="s16", layout="mono", rate=16000)
chunks = [o.to_ndarray().reshape(-1) for fr in c.decode(audio=0) for o in rs.resample(fr)]
chunks += [o.to_ndarray().reshape(-1) for o in rs.resample(None)]
audio = np.concatenate(chunks).astype(np.float32) / 32768
print(f"audio {len(audio) / 16000:.0f} s", flush=True)

t0 = time.time()
m = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=16)
segs, _ = m.transcribe(audio, beam_size=5, vad_filter=True, word_timestamps=True,
    initial_prompt="SimpleFold, AlphaFold2, ESMFold, ESM2, MSA, transthyretin, tafamidis, flow matching, triangle updates, "
                   "pair representation, adaLN, DiT, QK-norm, SwiGLU, RoPE, LDDT, pLDDT, TM-score, CASP14, CAMEO22, epsilon, residue")
out = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
        "words": [(round(w.start, 2), round(w.end, 2), w.word) for w in (s.words or [])]} for s in segs]
stem = src.with_suffix("")
json.dump(out, open(f"{stem}_transcript.json", "w"))
with open(f"{stem}_transcript.txt", "w") as f:
    for s in out:
        f.write(f"[{int(s['start'] // 60)}:{s['start'] % 60:05.2f}] {s['text']}\n")
print("segments", len(out), "secs", round(time.time() - t0))
