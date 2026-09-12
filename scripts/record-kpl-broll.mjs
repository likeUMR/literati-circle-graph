import { access, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, 'recordings', 'kpl-broll');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9334;
const onlyMatch = process.argv.includes('--only-match');
const onlyEmpty = process.argv.includes('--only-empty');
const profileDir = await mkdtemp(join(tmpdir(), 'kpl-broll-chrome-'));
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
  '--use-angle=swiftshader',
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
  throw new Error('Timed out waiting for the recording browser.');
}

const page = await waitForBrowser();
const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
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

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await delay(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function clickButton(label, scope = 'document', exact = false) {
  const result = await evaluate(`(() => {
    const root = ${scope === 'detail' ? "document.querySelector('[data-node-detail-scroll]')" : 'document'};
    const buttons = [...(root?.querySelectorAll('button') ?? [])];
    const button = buttons.find((item) => ${exact ? `item.innerText.trim() === ${JSON.stringify(label)}` : `item.innerText.includes(${JSON.stringify(label)})`});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!result) throw new Error(`Button not found: ${label}`);
}

async function openSearchResult(query) {
  await evaluate(`(() => {
    const input = document.querySelector('header input');
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await command('Input.insertText', { text: query });
  await waitFor(`[...document.querySelectorAll('header li button')].some((item) => item.innerText.includes(${JSON.stringify(query)}))`);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('header li button')].find((item) => item.innerText.includes(${JSON.stringify(query)}));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('aside header')?.innerText.includes(${JSON.stringify(query)})`);
}

async function closeDetail() {
  const close = await evaluate(`Boolean(document.querySelector('button[aria-label="关闭详情"]'))`);
  if (close) await clickButton('×', 'document', true);
}

async function waitForDownload(path, timeout = 15000) {
  const started = Date.now();
  let previousSize = -1;
  let stableChecks = 0;
  while (Date.now() - started < timeout) {
    try {
      const file = await stat(path);
      let partialExists = true;
      try { await access(`${path}.crdownload`); } catch { partialExists = false; }
      if (!partialExists && file.size > 1024 && file.size === previousSize) stableChecks += 1;
      else stableChecks = 0;
      previousSize = file.size;
      if (stableChecks >= 5) return;
    } catch {
      stableChecks = 0;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for download: ${path}`);
}

async function recordShot(name) {
  const webm = join(outputDir, `${name}.webm`);
  const output = join(outputDir, `${name}.mp4`);
  await rm(webm, { force: true });
  await rm(output, { force: true });
  const capture = evaluate(`new Promise((resolve, reject) => {
    const canvas = document.querySelector('canvas');
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16000000 });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = (event) => reject(event.error);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = ${JSON.stringify(`${name}.webm`)};
      link.click();
      stream.getTracks().forEach((track) => track.stop());
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      resolve({ bytes: blob.size, width: canvas.width, height: canvas.height, mimeType });
    };
    recorder.start(100);
    setTimeout(() => recorder.stop(), 3000);
  })`);
  const metadata = await capture;
  await waitForDownload(webm);
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'csv=p=0', webm,
  ], { encoding: 'utf8' });
  const timestamps = probe.stdout.trim().split(/\r?\n/).map(Number).filter(Number.isFinite);
  const sourceSpan = timestamps.at(-1) - timestamps[0];
  if (!Number.isFinite(sourceSpan) || sourceSpan <= 0) throw new Error(`Invalid source timestamps for ${name}.`);
  const stretch = ((89 / 30) / sourceSpan).toFixed(8);
  const encoded = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', webm, '-t', '3',
    '-vf', `setpts=${stretch}*(PTS-STARTPTS),minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir,tpad=stop_mode=clone:stop_duration=0.1,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output,
  ], { stdio: 'inherit' });
  await rm(webm, { force: true });
  if (encoded.status !== 0) throw new Error(`ffmpeg failed for ${name}.`);
  console.log(`${name}: ${metadata.width}x${metadata.height}, ${metadata.bytes} bytes -> ${output}`);
}

async function dragGraph(fromX, fromY, toX, toY, duration = 900) {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1 });
  const steps = 18;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX + (toX - fromX) * t, y: fromY + (toY - fromY) * t, button: 'left' });
    await delay(duration / steps);
  }
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1 });
}

try {
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outputDir, eventsEnabled: true });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('canvas'))`);
  await delay(5000);

  if (onlyEmpty) {
    await closeDetail();
    const emptyShots = [
      ['00-empty-orbit-01', '原始', null],
      ['00-empty-orbit-02', '神经', [360, 540, 1420, 620]],
      ['00-empty-orbit-03', '流场', [1420, 620, 420, 470]],
      ['00-empty-orbit-04', '原始', [960, 420, 960, 760]],
      ['00-empty-orbit-05', '神经', [520, 760, 1500, 380]],
    ];
    for (const [name, style, drag] of emptyShots) {
      await clickButton(style, 'document', true);
      await clickButton('重置视角', 'document', true);
      if (drag) await dragGraph(...drag);
      await delay(700);
      await recordShot(name);
    }
    process.exit(0);
  }

  await closeDetail();
  if (!onlyMatch) {
    await clickButton('重置视角', 'document', true);
    await delay(1000);
    await recordShot('01-global-orbit');

    await clickButton('神经', 'document', true);
    await clickButton('重置视角', 'document', true);
    await delay(1200);
    await recordShot('02-neural-lines');

    await clickButton('原始', 'document', true);
    await openSearchResult('小乔');
    await delay(900);
    await recordShot('03-hero-xiaoqiao');

    await clickButton('紫幻', 'detail');
    await waitFor(`document.querySelector('aside header')?.innerText.includes('紫幻')`);
    await delay(900);
    await recordShot('04-player-zihuan');

    await clickButton('重庆狼队 · 查看俱乐部', 'detail');
    await waitFor(`document.querySelector('aside header')?.innerText.includes('重庆狼队')`);
    await delay(900);
    await recordShot('05-club-wolves');
  } else {
    await clickButton('原始', 'document', true);
    await openSearchResult('重庆狼队');
  }

  await clickButton('2026年KPL夏季赛', 'detail');
  await waitFor(`document.querySelector('aside header')?.innerText.includes('2026年KPL夏季赛')`);
  await clickButton('筛选图谱', 'document', true);
  await delay(350);
  await clickButton('比赛');
  await clickButton('收起筛选', 'document', true);
  await clickButton('重庆狼队 3:4 广州TTG', 'detail');
  await waitFor(`document.querySelector('aside header')?.innerText.includes('重庆狼队 3:4 广州TTG')`);
  await delay(1000);
  await recordShot('06-match-wolves-vs-ttg');
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
