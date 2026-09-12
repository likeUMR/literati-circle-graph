import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, 'recordings', 'kpl-shot-library');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9336;
const shotDuration = 5000;
const profileDir = await mkdtemp(join(tmpdir(), 'kpl-shot-library-chrome-'));
const frameDir = await mkdtemp(join(tmpdir(), 'kpl-shot-library-frames-'));
await mkdir(outputDir, { recursive: true });
await mkdir(join(outputDir, 'clips'), { recursive: true });

const browser = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profileDir}`,
  '--window-size=1920,1080',
  '--force-device-scale-factor=1',
  '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=d3d11',
  '--enable-gpu-rasterization', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--no-first-run', '--no-default-browser-check', 'http://127.0.0.1:8080/',
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForBrowser() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      const page = pages.find((item) => item.type === 'page' && item.url.startsWith('http://127.0.0.1:8080'));
      if (page) return page;
    } catch { /* Chrome is still starting. */ }
    await delay(250);
  }
  throw new Error('Timed out waiting for the shot-library browser.');
}

const page = await waitForBrowser();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const listeners = new Map();
let commandId = 0;
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
  for (const listener of listeners.get(message.method) ?? []) listener(message.params);
};
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
    socket.send(JSON.stringify({ id, method, params }));
  });
}
function on(method, listener) {
  const group = listeners.get(method) ?? [];
  group.push(listener);
  listeners.set(method, group);
  return () => listeners.set(method, group.filter((item) => item !== listener));
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 2200) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return true;
    await delay(100);
  }
  return false;
}
async function clickButton(label, scope = 'document', exact = false) {
  const clicked = await evaluate(`(() => {
    const root = ${scope === 'detail' ? "document.querySelector('[data-node-detail-scroll]')" : 'document'};
    const buttons = [...(root?.querySelectorAll('button') ?? [])];
    const button = buttons.find((item) => ${exact ? `item.innerText.trim() === ${JSON.stringify(label)}` : `item.innerText.includes(${JSON.stringify(label)})`});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${label}`);
}
async function closeDetail() {
  if (await evaluate(`Boolean(document.querySelector('button[aria-label="关闭详情"]'))`)) {
    await evaluate(`document.querySelector('button[aria-label="关闭详情"]').click()`);
    await delay(250);
  }
}
async function installCapturePulse() {
  await evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = '@keyframes capture-pulse { from { opacity: .001; } to { opacity: .002; } }';
    document.head.appendChild(style);
    const pulse = document.createElement('div');
    pulse.setAttribute('aria-hidden', 'true');
    pulse.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;background:#000;pointer-events:none;z-index:9999;animation:capture-pulse 16ms linear infinite alternate';
    document.body.appendChild(pulse);
  })()`);
}
async function typeSearch(query) {
  await evaluate(`(() => {
    const input = document.querySelector('header input');
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  for (const character of query) {
    await command('Input.insertText', { text: character });
    await delay(90);
  }
  await waitFor(`[...document.querySelectorAll('header li button')].some((item) => item.innerText.includes(${JSON.stringify(query)}))`);
}
async function chooseSearchResult(query) {
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('header li button')].find((item) => item.innerText.includes(${JSON.stringify(query)}));
    if (!button) return false;
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return true;
  })()`);
  await waitFor(`document.querySelector('aside header')?.innerText.includes(${JSON.stringify(query)})`);
}
async function scrollPanel(target, duration = 1100) {
  const from = await evaluate(`document.querySelector('[data-node-detail-scroll]')?.scrollTop ?? 0`);
  const steps = Math.max(8, Math.round(duration / 55));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    await evaluate(`(() => { const panel = document.querySelector('[data-node-detail-scroll]'); if (panel) panel.scrollTop = ${from} + (${target} - ${from}) * ${eased}; return true; })()`);
    await delay(duration / steps);
  }
}

const shots = [
  { name: '01-orbit-original', label: '空转 · 原始线型', action: async () => { await delay(900); await clickButton('重置视角', 'document', true); } },
  { name: '02-orbit-neural', label: '空转 · 神经线型', action: async () => { await delay(700); await clickButton('神经', 'document', true); } },
  { name: '03-orbit-flow', label: '空转 · 流场线型', action: async () => { await delay(700); await clickButton('流场', 'document', true); } },
  { name: '04-orbit-reset', label: '空转 · 重置视角', action: async () => { await delay(700); await clickButton('重置视角', 'document', true); } },
  { name: '05-filter-nodes', label: '设置 · 节点筛选', action: async () => { await delay(650); await clickButton('筛选图谱', 'document', true); await delay(650); await clickButton('比赛'); await delay(950); await clickButton('同期队友'); } },
  { name: '06-filter-relations', label: '设置 · 关系筛选', action: async () => { await delay(700); await clickButton('同期队友'); await delay(800); await clickButton('收起筛选', 'document', true); } },
  { name: '07-search-hero', label: '聚焦 · 搜索小乔', action: async () => { await delay(550); await typeSearch('小乔'); await delay(450); await chooseSearchResult('小乔'); } },
  { name: '08-hero-detail', label: '详情 · 英雄资料', action: async () => { await delay(1100); await scrollPanel(520, 1300); } },
  { name: '09-hero-to-player', label: '跳转 · 英雄到选手', action: async () => { await delay(700); await clickButton('选手详情', 'detail'); await delay(1300); await scrollPanel(430, 900); } },
  { name: '10-player-to-club', label: '跳转 · 选手到俱乐部', action: async () => { await delay(700); await clickButton('查看俱乐部', 'detail'); await delay(1300); await scrollPanel(430, 900); } },
  { name: '11-club-to-season', label: '跳转 · 俱乐部到赛季', action: async () => { await delay(700); await clickButton('2026年KPL夏季赛', 'detail'); await delay(1300); await scrollPanel(420, 900); } },
  { name: '12-season-to-match', label: '跳转 · 赛季到比赛', action: async () => { await delay(700); await clickButton('重庆狼队 3:4 广州TTG', 'detail'); await delay(1300); await scrollPanel(620, 900); } },
  { name: '13-match-round', label: '详情 · 展开对局', action: async () => { await delay(750); await clickButton('第 1 局', 'detail'); await delay(1250); } },
  { name: '14-match-detail', label: '详情 · 比赛阵容', action: async () => { await delay(700); await scrollPanel(980, 1300); } },
  { name: '15-final-orbit', label: '收束 · 星图全景', action: async () => { await closeDetail(); await clickButton('原始', 'document', true); await clickButton('重置视角', 'document', true); await delay(1400); } },
];

const frames = [];
const shotMarks = [];
let removeCaptureListener;
let captureStartedAt = 0;
let captureEndedAt = 0;
try {
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('canvas'))`, 12000);
  await delay(4500);
  await installCapturePulse();
  await closeDetail();
  await clickButton('原始', 'document', true);
  await clickButton('重置视角', 'document', true);

  removeCaptureListener = on('Page.screencastFrame', ({ data, sessionId }) => {
    frames.push(Buffer.from(data, 'base64'));
    socket.send(JSON.stringify({ id: ++commandId, method: 'Page.screencastFrameAck', params: { sessionId } }));
  });
  await command('Page.startScreencast', { format: 'jpeg', quality: 93, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  captureStartedAt = Date.now();

  for (const shot of shots) {
    const startFrame = frames.length;
    const started = Date.now();
    try {
      await shot.action();
    } catch (error) {
      console.warn(`${shot.name}: ${error.message}`);
    }
    const remaining = shotDuration - (Date.now() - started);
    if (remaining > 0) await delay(remaining);
    shotMarks.push({ name: shot.name, label: shot.label, startFrame, endFrame: frames.length, startMs: started - captureStartedAt, endMs: Date.now() - captureStartedAt });
    console.log(`${shot.name}: frames ${startFrame}-${frames.length - 1}`);
  }
  await command('Page.stopScreencast');
  captureEndedAt = Date.now();
  removeCaptureListener();
  removeCaptureListener = undefined;
} finally {
  if (removeCaptureListener) removeCaptureListener();
  try { await command('Browser.close'); } catch { browser.kill(); }
  socket.close();
  browser.kill();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try { await rm(profileDir, { recursive: true, force: true }); break; } catch { await delay(400); }
  }
}

if (frames.length < 30) throw new Error(`Captured only ${frames.length} frames for the shot library.`);
await Promise.all(frames.map((frame, index) => writeFile(join(frameDir, `frame-${String(index).padStart(6, '0')}.jpg`), frame)));
const totalSeconds = Math.max(shots.length * shotDuration / 1000, (captureEndedAt - captureStartedAt) / 1000);
const sourceRate = frames.length / totalSeconds;
const master = join(outputDir, 'kpl-shot-library-master.mp4');
const encodeArgs = [
  '-y', '-loglevel', 'error', '-framerate', sourceRate.toFixed(8), '-i', join(frameDir, 'frame-%06d.jpg'),
  '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', master,
];
if (spawnSync('ffmpeg', encodeArgs, { stdio: 'inherit' }).status !== 0) throw new Error('Failed to encode the shot-library master.');

const clipDir = join(outputDir, 'clips');
for (const [index, shot] of shotMarks.entries()) {
  const output = join(clipDir, `${shot.name}.mp4`);
  const args = [
    '-y', '-loglevel', 'error', '-ss', (shot.startMs / 1000).toFixed(3), '-i', master, '-t', '5',
    '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=5,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output,
  ];
  if (spawnSync('ffmpeg', args, { stdio: 'ignore' }).status !== 0) console.warn(`Failed to encode ${shot.name}`);
}

const manifest = { width: 1920, height: 1080, fps: 30, shotDurationSeconds: 5, sourceRate, master, shots: shotMarks };
await writeFile(join(outputDir, 'shot-manifest.json'), JSON.stringify(manifest, null, 2));
const markdown = [
  '# KPL 星图镜头库', '',
  `总片源：\`${master}\``, '',
  '每个镜头约 5 秒，1920×1080，30fps，无音轨。可直接使用 clips 目录中的独立镜头，也可以在总片源上二次剪辑。', '',
  '| 编号 | 镜头 | 文件 |', '| --- | --- | --- |',
  ...shotMarks.map((shot, index) => `| ${String(index + 1).padStart(2, '0')} | ${shot.label} | clips/${shot.name}.mp4 |`),
  '', '录制脚本：`scripts/record-kpl-shot-library.mjs`',
].join('\n');
await writeFile(join(outputDir, 'SHOT_LIST.md'), markdown);
await rm(frameDir, { recursive: true, force: true });
console.log(`Shot library complete: ${shots.length} shots, ${frames.length} frames -> ${outputDir}`);
