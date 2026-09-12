import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'recordings', 'kpl-broll-5s');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9341;
const profile = await mkdtemp(join(tmpdir(), 'kpl-node-types-'));
await mkdir(out, { recursive: true });
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1920,1080', '--force-device-scale-factor=1', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', 'http://127.0.0.1:8080/'], { stdio: 'ignore' });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
for (let i = 0; i < 80 && !page; i++) { try { const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); page = pages.find((p) => p.type === 'page'); } catch {} await delay(250); }
if (!page) throw new Error('browser timeout');
const ws = new WebSocket(page.webSocketDebuggerUrl); const pending = new Map(); let id = 0;
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, (m) => m.error ? reject(new Error(m.error.message)) : resolve(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
const waitFor = async (expression) => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(120); } throw new Error(`timeout: ${expression}`); };
async function openSearch(query) {
  await evaluate(`(() => { const input=document.querySelector('header input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,''); input.dispatchEvent(new Event('input',{bubbles:true})); input.focus(); })()`);
  for (const character of query) { await cmd('Input.insertText', { text: character }); await delay(120); }
  await waitFor(`[...document.querySelectorAll('header li button')].some((b)=>b.innerText.includes(${JSON.stringify(query)}))`);
  await evaluate(`(() => { const b=[...document.querySelectorAll('header li button')].find((b)=>b.innerText.includes(${JSON.stringify(query)})); b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); })()`);
  await waitFor(`Boolean(document.querySelector('aside header'))`); await delay(500);
}
async function record(name) {
  const webm = join(out, `${name}.webm`), mp4 = join(out, `${name}.mp4`); await rm(webm, { force: true }); await rm(mp4, { force: true });
  await evaluate(`new Promise((resolve,reject)=>{const c=document.querySelector('canvas'),s=c.captureStream(30),chunks=[],r=new MediaRecorder(s,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:12000000});r.ondataavailable=e=>e.data.size&&chunks.push(e.data);r.onerror=e=>reject(e.error);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download=${JSON.stringify(`${name}.webm`)};a.click();resolve(true)};r.start(100);setTimeout(()=>r.stop(),3200)})`);
  for (let i = 0; i < 100; i++) { try { const s = await stat(webm); if (s.size > 1000) { const probe = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0',webm], { encoding:'utf8' }); if (Number(probe.stdout.trim()) > 0) break; } } catch {} await delay(200); }
  spawnSync('ffmpeg', ['-y','-loglevel','error','-i',webm,'-t','3','-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4], { stdio:'inherit' }); await rm(webm,{force:true}); console.log(name);
}
try {
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false}); await cmd('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out,eventsEnabled:true}); await waitFor(`document.readyState==='complete'&&Boolean(document.querySelector('canvas'))`); await delay(2500);
  const shots = [['07-node-season','2026年KPL夏季赛'],['08-node-club','狼队'],['09-node-player','紫幻'],['10-node-hero','小乔'],['11-node-match','TTG']];
  for (const [name, query] of shots) { await cmd('Page.reload'); await waitFor(`document.readyState==='complete'&&Boolean(document.querySelector('canvas'))`); await delay(700); await openSearch(query); await record(name); }
} finally { try { await cmd('Browser.close'); } catch {} ws.close(); browser.kill(); try { await rm(profile,{recursive:true,force:true}); } catch {} }
