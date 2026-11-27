"""Writes a gentle, upbeat background track made from scratch (no samples, no licence):
a warm pad, a plucked arpeggio and a soft pulse, over four chords."""
import sys, wave
import numpy as np

seconds = float(sys.argv[1])
out = sys.argv[2]
RATE = 44100
BPM = 96
beat = 60 / BPM
bar = beat * 4

# C major, G major, A minor, F major: bright and steady.
CHORDS = [
    [261.63, 329.63, 392.00, 523.25],
    [196.00, 293.66, 392.00, 493.88],
    [220.00, 261.63, 329.63, 440.00],
    [174.61, 261.63, 349.23, 440.00],
]
BASS = [130.81, 98.00, 110.00, 87.31]

total = int(seconds * RATE)
t = np.arange(total) / RATE
left = np.zeros(total)
right = np.zeros(total)


def place(buffer, start, sound):
    a = int(start * RATE)
    if a >= total:
        return
    b = min(total, a + len(sound))
    buffer[a:b] += sound[: b - a]


def envelope(length, attack, release):
    n = int(length * RATE)
    env = np.ones(n)
    a = int(attack * RATE)
    r = int(release * RATE)
    env[:a] = np.linspace(0, 1, a)
    env[-r:] = np.linspace(1, 0, r)
    return env


bars = int(seconds / bar) + 2
rng = np.random.default_rng(4)
for index in range(bars):
    start = index * bar
    chord = CHORDS[index % 4]
    # pad: each note is a few slightly detuned sines, slow in and out
    n = int(bar * 1.15 * RATE)
    tt = np.arange(n) / RATE
    env = envelope(bar * 1.15, 0.9, 1.1)
    for k, freq in enumerate(chord):
        tone = sum(np.sin(2 * np.pi * freq * (1 + d) * tt) for d in (-0.003, 0, 0.003)) / 3
        tone += 0.25 * np.sin(2 * np.pi * freq * 2 * tt)
        pan = 0.35 + 0.1 * k
        place(left, start, tone * env * 0.055 * (1 - pan + 0.5))
        place(right, start, tone * env * 0.055 * (pan + 0.5))
    # bass: one soft note per bar
    nb = int(bar * RATE)
    tb = np.arange(nb) / RATE
    bass = np.sin(2 * np.pi * BASS[index % 4] * tb) * np.exp(-tb * 0.9) * 0.16
    place(left, start, bass)
    place(right, start, bass)
    # arpeggio: eighth notes walking up and down the chord, starting after the intro
    if index >= 2:
        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for step, note in enumerate(pattern):
            na = int(beat * 0.9 * RATE)
            ta = np.arange(na) / RATE
            freq = chord[note] * 2
            pluck = (np.sin(2 * np.pi * freq * ta) + 0.3 * np.sin(2 * np.pi * freq * 2 * ta)) * np.exp(-ta * 7) * 0.07
            when = start + step * beat / 2
            side = step % 2
            place(left, when, pluck * (1.2 if side == 0 else 0.6))
            place(right, when, pluck * (0.6 if side == 0 else 1.2))
    # a soft pulse on every beat, like a heartbeat, from the fifth bar
    if index >= 4:
        for b in range(4):
            nk = int(0.22 * RATE)
            tk = np.arange(nk) / RATE
            kick = np.sin(2 * np.pi * (58 + 60 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 16) * 0.22
            place(left, start + b * beat, kick)
            place(right, start + b * beat, kick)
            ns = int(0.05 * RATE)
            shaker = rng.standard_normal(ns) * np.exp(-np.arange(ns) / RATE * 70) * 0.012
            place(left, start + b * beat + beat / 2, shaker)
            place(right, start + b * beat + beat / 2, shaker)

# fade the whole thing in and out
fade_in = int(1.5 * RATE)
fade_out = int(3.0 * RATE)
shape = np.ones(total)
shape[:fade_in] = np.linspace(0, 1, fade_in)
shape[-fade_out:] = np.linspace(1, 0, fade_out)
stereo = np.stack([left * shape, right * shape], axis=1)
stereo = stereo / max(1e-9, np.abs(stereo).max()) * 0.8

with wave.open(out, 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes((stereo * 32767).astype(np.int16).tobytes())
print('music', round(seconds, 1), 's ->', out)
