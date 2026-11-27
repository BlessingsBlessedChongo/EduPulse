"""Records Ava's narration for each scene and writes the scene lengths to scenes.json.
Run with the Python that has edge-tts installed."""
import asyncio, json, re, subprocess, sys
from pathlib import Path
import edge_tts

HERE = Path(__file__).parent
FFMPEG = sys.argv[1]

SCENES = [
    ('hero', "Meet EduPulse. The study coach that tells you what to study today."),
    ('idea', "Most of us revise by rereading our notes, and it barely sticks. What really works is testing yourself, a little, every day. EduPulse does the hard part for you."),
    ('today', "Each day you get a short set of questions, about ten minutes. Some are new. The rest are coming back, just before you would forget them."),
    ('course', "It all starts with your own material. Add your notes as a PDF, a photo, or pasted text, and every question is written from your pages. Add a past paper, and EduPulse learns how your lecturer asks questions, down to the wording and the marks."),
    ('typed', "Type your answer, and it is marked straight away. In maths, your final answer is checked by calculation, not by opinion. So a right answer is always marked right."),
    ('photo', "Or solve it on paper, and take a photo. EduPulse reads your working, gives you method marks line by line, and shows you exactly where it went wrong, with the sentence from your own notes."),
    ('pulse', "Your pulse shows how strong you are in every topic, honestly. Weak topics come back sooner. Strong ones come back later."),
    ('close', "EduPulse. Your notes. Your exam. Ten minutes a day. Start with tonight's notes."),
]


def duration(path):
    out = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


async def main():
    (HERE / 'audio').mkdir(exist_ok=True)
    scenes = []
    for name, text in SCENES:
        path = HERE / 'audio' / f'{name}.mp3'
        for attempt in range(5):
            try:
                # The name is spelled the way it should sound; the voice misreads it as written.
                spoken_text = text.replace('EduPulse', 'Edoo Pulse')
                await edge_tts.Communicate(spoken_text, 'en-US-AvaNeural', rate='-4%').save(str(path))
                break
            except Exception as failed:
                print('retry', name, str(failed)[:80])
                await asyncio.sleep(3)
        spoken = duration(path)
        # each scene: a short lead-in, the words, and a breath afterwards
        scenes.append({'name': name, 'spoken': round(spoken, 2), 'length': round(spoken + 1.5, 2)})
        print(name, round(spoken, 1))
    (HERE / 'scenes.json').write_text(json.dumps(scenes, indent=1))
    print('total', round(sum(s['length'] for s in scenes), 1))

asyncio.run(main())
