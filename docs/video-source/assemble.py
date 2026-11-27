"""Joins the recorded scenes, lays Ava's narration over them and puts the music underneath."""
import json, subprocess, sys
from pathlib import Path
import imageio_ffmpeg

HERE = Path(__file__).parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
FADE = 0.4
LEAD = 0.55

scenes = {s['name']: s for s in json.loads((HERE / 'scenes.json').read_text())}
photo_a = 4.2
# (clip file, how long it stays, narration that starts with it)
parts = [
    ('hero', scenes['hero']['length'], 'hero'),
    ('idea', scenes['idea']['length'], 'idea'),
    ('today', scenes['today']['length'], 'today'),
    ('course', scenes['course']['length'], 'course'),
    ('typed', scenes['typed']['length'], 'typed'),
    ('photo-a', photo_a, 'photo'),
    ('photo-b', scenes['photo']['length'] - photo_a + FADE, None),
    ('pulse', scenes['pulse']['length'], 'pulse'),
    ('close', scenes['close']['length'] + 1.2, 'close'),
]

cmd = [FF, '-y', '-loglevel', 'error']
for name, _, _ in parts:
    cmd += ['-i', str(HERE / 'clips' / f'{name}.webm')]
spoken = [p for p in parts if p[2]]
for _, _, narration in spoken:
    cmd += ['-i', str(HERE / 'audio' / f'{narration}.mp3')]

starts = []
at = 0.0
for _, length, _ in parts:
    starts.append(at)
    at += length - FADE
total = at + FADE

music = HERE / 'music.wav'
subprocess.run([sys.executable, str(HERE / 'music.py'), f'{total:.2f}', str(music)], check=True)
cmd += ['-i', str(music)]

graph = []
for i, (_, length, _) in enumerate(parts):
    graph.append(f'[{i}:v]fps=30,scale=1280:720:flags=lanczos,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=40,'
                 f'trim=duration={length:.3f},setpts=PTS-STARTPTS[v{i}]')
previous = 'v0'
for i in range(1, len(parts)):
    graph.append(f'[{previous}][v{i}]xfade=transition=fade:duration={FADE}:offset={starts[i]:.3f}[x{i}]')
    previous = f'x{i}'
graph.append(f'[{previous}]fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.9:.2f}:d=0.9[video]')

voices = []
n = len(parts)
for k, (name, _, narration) in enumerate(spoken):
    index = [p[0] for p in parts].index(name)
    ms = int((starts[index] + LEAD) * 1000)
    graph.append(f'[{n + k}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.35,adelay={ms}|{ms}[n{k}]')
    voices.append(f'[n{k}]')
graph.append(f'[{n + len(spoken)}:a]volume=0.17[bed]')
graph.append(''.join(voices) + f'[bed]amix=inputs={len(voices) + 1}:normalize=0,alimiter=limit=0.95,atrim=duration={total:.3f}[audio]')

out = HERE / 'meet-edupulse.mp4'
cmd += ['-filter_complex', ';'.join(graph), '-map', '[video]', '-map', '[audio]', '-r', '30', '-c:v', 'libx264', '-preset', 'medium',
        '-crf', '21', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '160k', '-t', f'{total:.3f}', '-movflags', '+faststart', str(out)]
subprocess.run(cmd, check=True)
print('video', round(total, 1), 's ->', out, round(out.stat().st_size / 1048576, 1), 'MB')
