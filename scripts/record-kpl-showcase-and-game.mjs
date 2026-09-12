import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'recordings', 'kpl-showcase-game-5s');
const gameOnly = process.argv.includes('--game-only');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9346;
const profile = await mkdtemp(join(tmpdir(), 'kpl-showcase-game-'));
await mkdir(out, { recursive: true });

const browser = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  `--user-data-dir=${profile}`, '--window-size=1920,1080', '--force-device-scale-factor=1',
  '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check',
], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let page;
for (let i = 0; i < 100 && !page; i += 1) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    page = pages.find((item) => item.type === 'page');
  } catch {}
  await delay(150);
}
if (!page) throw new Error('Chrome did not start.');
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const events = new Map();
let commandId = 0;
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  for (const listener of events.get(message.method) ?? []) listener(message.params);
};
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId;
  pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
  socket.send(JSON.stringify({ id, method, params }));
});
const on = (method, listener) => { const list = events.get(method) ?? []; list.push(listener); events.set(method, list); return () => events.set(method, list.filter((item) => item !== listener)); };
const evaluate = async (expression) => (await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
const waitFor = async (expression, timeout = 20000) => { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await delay(150); } throw new Error(`Timeout: ${expression}`); };
const navigate = async (url, settle = 4000) => { await command('Page.navigate', { url }); await waitFor(`document.readyState === 'complete'`); await delay(settle); };
const scrollTo = async (y) => { await evaluate(`window.scrollTo({ top: ${y}, behavior: 'smooth' })`); await delay(1800); };

async function record(name, interaction = async () => {}) {
  const frames = [];
  const remove = on('Page.screencastFrame', ({ data, sessionId }) => { frames.push(Buffer.from(data, 'base64')); socket.send(JSON.stringify({ id: ++commandId, method: 'Page.screencastFrameAck', params: { sessionId } })); });
  await command('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await interaction();
  await delay(5000);
  await command('Page.stopScreencast');
  remove();
  if (frames.length < 10) throw new Error(`${name}: insufficient frames`);
  const frameDir = await mkdtemp(join(tmpdir(), `kpl-shot-${name}-`));
  await Promise.all(frames.map((frame, index) => writeFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.jpg`), frame)));
  const output = join(out, `${name}.mp4`);
  const rate = (frames.length / 5).toFixed(8);
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', rate, '-i', join(frameDir, 'frame-%04d.jpg'), '-t', '5', '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=0.2,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output], { stdio: 'inherit' });
  await rm(frameDir, { recursive: true, force: true });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${name}`);
  console.log(`${name} -> ${output}`);
}

try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  if (!gameOnly) {
    await navigate('http://127.0.0.1:8080/applications.html');
    await record('01-showcase-intro');
    await scrollTo(720); await record('02-showcase-asset-ledger');
    await scrollTo(1500); await record('03-showcase-team-game');
    await scrollTo(2450); await record('04-showcase-content-studio');
    await scrollTo(3500); await record('05-showcase-city-map');
  }

  await navigate('https://origingame.dev/g/edg-5c15/play?v=29', 70000);
  // Enter the first level, confirm the briefing, then wait for the 3D battle scene.
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: 825, y: 370, button: 'left', clickCount: 1 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 825, y: 370, button: 'left', clickCount: 1 });
  await delay(1400);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: 890, y: 838, button: 'left', clickCount: 1 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 890, y: 838, button: 'left', clickCount: 1 });
  await delay(60000);
  await record('06-game-opening');
  await record('07-game-interaction', async () => {
    const moves = [[706, 350, 784, 350], [941, 430, 1019, 430], [784, 590, 862, 590], [1019, 748, 1097, 748]];
    for (const [x1, y1, x2, y2] of moves) {
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
      await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
      await delay(160);
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x2, y: y2, button: 'left' });
      await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
      await delay(650);
    }
  });
} finally {
  try { await command('Browser.close'); } catch {}
  socket.close(); browser.kill();
  try { await rm(profile, { recursive: true, force: true }); } catch {}
}
