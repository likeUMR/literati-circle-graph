import { spawn } from 'node:child_process';
const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', port=9351;
const browser=spawn(chrome,['--headless=new',`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--user-data-dir=C:\\Temp\\edg-probe','--window-size=1920,1080','https://origingame.dev/g/edg-5c15/play?v=29'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms)); let page;
for(let i=0;i<100&&!page;i++){try{page=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{} await delay(200)}
const ws=new WebSocket(page.webSocketDebuggerUrl), pending=new Map(); let id=0;
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}};
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
const cmd=(method,params={})=>new Promise((r,j)=>{const n=++id;pending.set(n,m=>m.error?j(m.error):r(m.result));ws.send(JSON.stringify({id:n,method,params}))});
await cmd('Runtime.enable'); await delay(15000);
await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:825,y:370,button:'left',clickCount:1}); await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:825,y:370,button:'left',clickCount:1}); await delay(1200);
await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:890,y:785,button:'left',clickCount:1}); await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:890,y:785,button:'left',clickCount:1}); await delay(60000);
const val=await cmd('Runtime.evaluate',{expression:`({text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(x=>x.innerText),frames:[...document.querySelectorAll('iframe')].map(x=>x.src),canvas:[...document.querySelectorAll('canvas')].map(x=>({w:x.width,h:x.height})),divs:[...document.querySelectorAll('div')].slice(-20).map(x=>x.innerText).filter(Boolean)})`,returnByValue:true});
console.log('TARGETS', JSON.stringify(await (await fetch(`http://127.0.0.1:${port}/json`)).json(), null, 2));
const shot=await cmd('Page.captureScreenshot',{format:'png'}); await import('node:fs/promises').then(fs=>fs.writeFile('C:/Users/23531/Documents/创意工作台-电竞/edg-game-probe.png',Buffer.from(shot.data,'base64')));
console.log(JSON.stringify(val.result.value,null,2)); await cmd('Browser.close');ws.close();browser.kill();
