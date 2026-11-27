// Records the real app, scene by scene, each for as long as its narration lasts.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../shots/', import.meta.url));
const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:5199';
const [ffmpegPath, photo, scale = '1.5', only = ''] = process.argv.slice(2);
const scenes = Object.fromEntries(JSON.parse(readFileSync(new URL('./scenes.json', import.meta.url))).map((s) => [s.name, s.length]));
mkdirSync(new URL('./clips/', import.meta.url), { recursive: true });
const clip = (name) => fileURLToPath(new URL(`./clips/${name}.webm`, import.meta.url));
const want = (name) => !only || only.split(',').includes(name);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
});
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: Number(scale) });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  // The demo notice is hidden in the film; everything else is the app as it is.
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '.demo-banner{display:none!important}';
      document.head.appendChild(style);
    });
  });
  return page;
}

const clickText = async (page, text, selector = 'button, a') => {
  const handle = await page.evaluateHandle((t, s) => [...document.querySelectorAll(s)].find((e) => e.textContent.trim().includes(t)), text, selector);
  const element = handle.asElement();
  if (!element) throw new Error(`no element with text: ${text}`);
  await element.click();
};

/** Scrolls to a position smoothly over the given time, easing in and out. */
const glide = (page, to, ms) => page.evaluate(async (to, ms) => {
  const target = typeof to === 'number' ? to : (() => {
    const element = [...document.querySelectorAll(to.selector)].find((e) => !to.text || e.textContent.includes(to.text));
    return element ? element.getBoundingClientRect().top + window.scrollY - (to.offset ?? 90) : window.scrollY;
  })();
  const from = window.scrollY;
  const start = performance.now();
  await new Promise((done) => {
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
}, to, ms);

async function film(page, name, length, actions) {
  const recorder = await page.screencast({ path: clip(name), ffmpegPath });
  const started = Date.now();
  await actions();
  const left = length * 1000 - (Date.now() - started);
  if (left > 0) await pause(left);
  await recorder.stop();
  console.log('filmed', name, ((Date.now() - started) / 1000).toFixed(1), 's');
}

// ------------------------------------------------------------ the landing page
const front = await open();
await front.goto(BASE, { waitUntil: 'networkidle0' });
await pause(1500);
if (want('hero')) await film(front, 'hero', scenes.hero, async () => {});
if (want('idea')) await film(front, 'idea', scenes.idea, async () => {
  await pause(600);
  await glide(front, { selector: '.steps' , offset: 150 }, 3200);
  await pause(2300);
  await glide(front, { selector: '.bento', offset: 130 }, 3000);
});

// ------------------------------------------------------------ inside the app
const app = await open();
await app.goto(BASE, { waitUntil: 'networkidle0' });
await clickText(app, 'Try the demo');
await app.waitForFunction(() => location.pathname === '/today');
await app.waitForNetworkIdle({ idleTime: 400 }).catch(() => undefined);
await clickText(app, 'More', '.topnav a');
await pause(900);

if (want('today')) await film(app, 'today', scenes.today, async () => {
  await pause(500);
  await clickText(app, 'Today', '.topnav a');
  await pause(4200);
  await glide(app, 360, 2600);
});

await clickText(app, 'Courses', '.topnav a');
await app.waitForSelector('.course-card');
await pause(1200);
if (want('course')) await film(app, 'course', scenes.course, async () => {
  await pause(1300);
  await clickText(app, 'BIO 110', 'a');
  await app.waitForSelector('.topic');
  await pause(2600);
  await glide(app, { selector: 'h2', text: 'Your material', offset: 110 }, 3200);
  await pause(2600);
  await glide(app, { selector: 'h2', text: 'How your exam asks', offset: 100 }, 3000);
});

// A typed maths answer, right first time.
await clickText(app, 'Courses', '.topnav a');
await app.waitForSelector('.course-card');
await clickText(app, 'MA 110', 'a');
await app.waitForSelector('.topic');
await clickText(app, 'Practise this course');
await app.waitForSelector('.question-prompt');
await pause(1200);
const first = await app.$eval('.question-prompt', (e) => e.textContent);
console.log('first question:', first);
const answers = { 'Find the discriminant': '-8', 'Differentiate y = 5x': '15x^2 - 4x', 'Find the gradient': '7', 'Find the x-coordinate': 'x = 3', 'Evaluate (2': '64', 'Simplify a': 'a^8' };
const key = Object.keys(answers).find((k) => first.startsWith(k));
if (!key) throw new Error('unexpected first question');
if (want('typed')) await film(app, 'typed', scenes.typed, async () => {
  await pause(1500);
  await app.click('textarea');
  await app.type('textarea', answers[key], { delay: 260 });
  await pause(900);
  await clickText(app, 'Check my answer');
  await app.waitForSelector('.verdict');
  await pause(3200);
  await glide(app, 170, 2200);
});
if (!want('typed')) {
  await app.type('textarea', answers[key]);
  await clickText(app, 'Check my answer');
  await app.waitForSelector('.verdict');
}

// A photo of working with a slip in it.
if (want('photo')) {
  for (let i = 0; i < 10; i++) {
    await clickText(app, 'Next question');
    await pause(1100);
    const prompt = await app.$eval('.question-prompt', (e) => e.textContent);
    if (prompt.startsWith('Solve x2 - 7x')) break;
    await clickText(app, "I don't know");
    await app.waitForSelector('.verdict');
    await pause(300);
  }
  const input = await app.$('input[type=file]');
  await input.uploadFile(photo);
  await pause(900);
  await film(app, 'photo-a', 4.2, async () => {
    await pause(2400);
    await clickText(app, 'Check my answer');
  });
  let summary = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    await app.waitForSelector('.verdict', { timeout: 100000 });
    summary = await app.$eval('.verdict p', (e) => e.textContent);
    console.log('photo verdict, try', attempt + ':', summary);
    if (!/could not be read|could not be marked/.test(summary)) break;
    if (attempt === 5) throw new Error('the photo was not marked after five tries');
    // The AI service did not answer: wait, then send the same photo again (not filmed).
    await pause(25000);
    await clickText(app, 'Try this question again');
    await pause(900);
    const again = await app.$('input[type=file]');
    await again.uploadFile(photo);
    await pause(700);
    await clickText(app, 'Check my answer');
    await pause(1500);
  }
  await app.evaluate(() => window.scrollTo(0, 0));
  await pause(700);
  await film(app, 'photo-b', scenes.photo - 4.2 + 0.4, async () => {
    await pause(2600);
    await glide(app, { selector: '.source', offset: 420 }, 3400);
  });
}

if (want('pulse')) {
  await app.goto(`${BASE}/today`, { waitUntil: 'networkidle0' });
  await pause(1200);
  await film(app, 'pulse', scenes.pulse, async () => {
    await pause(500);
    await clickText(app, 'Pulse', '.topnav a');
    await pause(3600);
    await glide(app, 520, 3200);
  });
}

// ------------------------------------------------------------ the close
if (want('close')) {
  await front.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pause(1400);
  await film(front, 'close', scenes.close, async () => {
    await pause(3600);
    await glide(front, 0, 2600);
  });
}

await browser.close();
console.log('done');
