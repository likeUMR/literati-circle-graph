import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, 'recordings', 'kpl-broll-5s');
const onlyEmpty = process.argv.includes('--only-empty');
const onlyFilterLines = process.argv.includes('--only-filter-lines');
const onlyRefreshFilters = process.argv.includes('--refresh-filters');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9335;
const profileDir = await mkdtemp(join(tmpdir(), 'kpl-interaction-chrome-'));
await mkdir(outputDir, { recursive: true });

const browser = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profileDir}`,
  '--window-size=1920,1080',
  '--force-device-scale-factor=1',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=d3d11',
  '--enable-gpu-rasterization',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--no-first-run',
  '--no-default-browser-check',
  'http://127.0.0.1:8080/',
], { stdio: 'ignore' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBrowser() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      const page = pages.find((item) => item.type === 'page' && item.url.startsWith('http://127.0.0.1:8080'));
      if (page) return page;
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error('Timed out waiting for the interaction recording browser.');
}

const page = await waitForBrowser();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const eventListeners = new Map();
let commandId = 0;

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
  for (const listener of eventListeners.get(message.method) ?? []) listener(message.params);
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

function acknowledgeScreencast(sessionId) {
  socket.send(JSON.stringify({ id: ++commandId, method: 'Page.screencastFrameAck', params: { sessionId } }));
}

function on(method, listener) {
  const group = eventListeners.get(method) ?? [];
  group.push(listener);
  eventListeners.set(method, group);
  return () => eventListeners.set(method, group.filter((item) => item !== listener));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await delay(120);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
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

async function typeSearch(query) {
  await evaluate(`(() => {
    const input = document.querySelector('header input');
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  for (const character of query) {
    await command('Input.insertText', { text: character });
    await delay(120);
  }
  await waitFor(`[...document.querySelectorAll('header li button')].some((item) => item.innerText.includes(${JSON.stringify(query)}))`);
}

async function chooseSearchResult(query) {
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('header li button')].find((item) => item.innerText.includes(${JSON.stringify(query)}));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('aside header')?.innerText.includes(${JSON.stringify(query)})`);
}

async function closeDetail() {
  if (await evaluate(`Boolean(document.querySelector('button[aria-label="关闭详情"]'))`)) {
    await evaluate(`document.querySelector('button[aria-label="关闭详情"]').click()`);
    await delay(300);
  }
}

async function smoothScrollPanel(target, duration = 1300) {
  const from = await evaluate(`document.querySelector('[data-node-detail-scroll]')?.scrollTop ?? 0`);
  const steps = Math.max(8, Math.round(duration / 55));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    await evaluate(`(() => { const panel = document.querySelector('[data-node-detail-scroll]'); if (panel) panel.scrollTop = ${from} + (${target} - ${from}) * ${eased}; return true; })()`);
    await delay(duration / steps);
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

async function recordShot(name, interaction = async () => {}) {
  const frames = [];
  let acceptingFrames = true;
  const removeListener = on('Page.screencastFrame', ({ data, sessionId }) => {
    if (acceptingFrames) frames.push(Buffer.from(data, 'base64'));
    acknowledgeScreencast(sessionId);
  });
  await command('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const interactionPromise = interaction();
  await delay(5150);
  acceptingFrames = false;
  await command('Page.stopScreencast');
  removeListener();
  await interactionPromise;
  if (frames.length < 10) throw new Error(`${name} captured only ${frames.length} frames.`);

  const frameDir = await mkdtemp(join(tmpdir(), `kpl-interaction-${name}-`));
  await Promise.all(frames.map((frame, index) => writeFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.jpg`), frame)));
  const output = join(outputDir, `${name}.mp4`);
  const sourceRate = (frames.length / 5).toFixed(8);
  const encoded = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', sourceRate, '-i', join(frameDir, 'frame-%04d.jpg'), '-t', '5',
    '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=0.2,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output,
  ], { stdio: 'inherit' });
  await rm(frameDir, { recursive: true, force: true });
  if (encoded.status !== 0) throw new Error(`ffmpeg failed for ${name}.`);
  console.log(`${name}: ${frames.length} captured frames -> ${output}`);
}

async function dragGraph(fromX, fromY, toX, toY) {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left' });
  for (let i = 1; i <= 20; i += 1) { const t = i / 20; await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX + (toX - fromX) * t, y: fromY + (toY - fromY) * t, button: 'left' }); await delay(45); }
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left' });
}

try {
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('canvas'))`);
  await delay(5000);
  await installCapturePulse();

  if (onlyEmpty) {
    const shots = [['00-empty-orbit-01', '原始', null], ['00-empty-orbit-02', '神经', [360, 540, 1420, 620]], ['00-empty-orbit-03', '流场', [1420, 620, 420, 470]], ['00-empty-orbit-04', '原始', [960, 420, 960, 760]], ['00-empty-orbit-05', '神经', [520, 760, 1500, 380]]];
    for (const [name, style, drag] of shots) { await clickButton(style, 'document', true); await clickButton('重置视角', 'document', true); if (drag) await dragGraph(...drag); await delay(500); await recordShot(name); }
    process.exit(0);
  }

  if (onlyFilterLines) {
    const shots = [
      ['12-filter-seasons-players', async () => { await delay(700); await clickButton('筛选图谱', 'document', true); await delay(500); await clickButton('赛季'); await clickButton('选手'); await delay(900); await clickButton('收起筛选', 'document', true); }],
      ['13-filter-clubs-matches', async () => { await delay(700); await clickButton('筛选图谱', 'document', true); await delay(500); await clickButton('俱乐部'); await clickButton('比赛'); await delay(700); await clickButton('使用英雄'); await delay(900); await clickButton('收起筛选', 'document', true); }],
      ['14-line-original-neural', async () => { await delay(900); await clickButton('神经', 'document', true); await delay(1300); await clickButton('原始', 'document', true); }],
      ['15-line-flow-neural', async () => { await delay(900); await clickButton('流场', 'document', true); await delay(1300); await clickButton('神经', 'document', true); }],
    ];
    for (const [name, interaction] of shots) { await closeDetail(); await clickButton('原始', 'document', true); await clickButton('重置视角', 'document', true); await recordShot(name, interaction); }
    process.exit(0);
  }

  if (onlyRefreshFilters) {
    const shots = [
      ['02-filter-and-layout', async () => { await delay(500); await clickButton('筛选图谱', 'document', true); await delay(550); await clickButton('比赛'); await delay(650); await clickButton('同期队友'); await delay(500); await clickButton('收起筛选', 'document', true); await dragGraph(430, 560, 1460, 590); await dragGraph(1460, 590, 500, 460); }],
      ['12-filter-seasons-players', async () => { await delay(500); await clickButton('筛选图谱', 'document', true); await delay(550); await clickButton('赛季'); await clickButton('选手'); await delay(600); await clickButton('收起筛选', 'document', true); await dragGraph(1450, 500, 470, 650); await dragGraph(470, 650, 1500, 420); }],
    ];
    for (const [name, interaction] of shots) { await closeDetail(); await clickButton('原始', 'document', true); await clickButton('重置视角', 'document', true); await recordShot(name, interaction); }
    process.exit(0);
  }

  await closeDetail();
  await clickButton('重置视角', 'document', true);
  await clickButton('原始', 'document', true);
  await recordShot('01-line-style-switch', async () => {
    await delay(1400);
    await clickButton('神经', 'document', true);
    await delay(1800);
    await clickButton('流场', 'document', true);
  });

  await clickButton('原始', 'document', true);
  await clickButton('重置视角', 'document', true);
  await recordShot('02-filter-and-layout', async () => {
    await delay(700);
    await clickButton('筛选图谱', 'document', true);
    await delay(650);
    await clickButton('比赛');
    await delay(900);
    await clickButton('同期队友');
    await delay(1200);
    await clickButton('收起筛选', 'document', true);
  });

  await closeDetail();
  await recordShot('03-search-and-focus-hero', async () => {
    await delay(600);
    await typeSearch('小乔');
    await delay(500);
    await chooseSearchResult('小乔');
  });

  await recordShot('04-hero-to-player', async () => {
    await delay(900);
    await clickButton('选手详情', 'detail');
    await waitFor(`document.querySelector('aside header')?.innerText.includes('选手')`);
    await delay(1200);
    await smoothScrollPanel(470, 1500);
  });

  await evaluate(`document.querySelector('[data-node-detail-scroll]').scrollTop = 0`);
  await recordShot('05-player-to-club', async () => {
    await delay(900);
    await clickButton('查看俱乐部', 'detail');
    await waitFor(`document.querySelector('aside header')?.innerText.includes('俱乐部')`);
    await delay(1200);
    await smoothScrollPanel(430, 1500);
  });

  await clickButton('2026年KPL夏季赛', 'detail');
  await waitFor(`document.querySelector('aside header')?.innerText.includes('2026年KPL夏季赛')`);
  await evaluate(`document.querySelector('[data-node-detail-scroll]').scrollTop = 0`);
  await delay(700);
  await recordShot('06-season-to-match', async () => {
    await delay(700);
    await clickButton('重庆狼队 3:4 广州TTG', 'detail');
    await waitFor(`document.querySelector('aside header')?.innerText.includes('重庆狼队 3:4 广州TTG')`);
    await delay(1000);
    await smoothScrollPanel(760, 1700);
    await clickButton('第 1 局', 'detail');
  });
} finally {
  try { await command('Browser.close'); } catch { browser.kill(); }
  socket.close();
  browser.kill();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      break;
    } catch {
      await delay(500);
    }
  }
}
