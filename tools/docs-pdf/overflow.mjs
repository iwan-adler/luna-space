import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const f of fs.readdirSync('.cache').filter(x=>x.endsWith('.html'))) {
  const p = await b.newPage(); await p.setViewport({width: 672, height: 1000});
  await p.emulateMediaType('print');
  await p.goto('file:///' + process.cwd().split(String.fromCharCode(92)).join('/') + '/.cache/' + f); await p.waitForFunction('window.__done===true',{timeout:120000});
  const r = await p.evaluate(() => { const W = document.documentElement.clientWidth; const out=[];
    document.querySelectorAll('main *').forEach(e => { const rc = e.getBoundingClientRect(); if (rc.right > W + 2 && rc.width>0) out.push(e.tagName+'.'+e.className+' '+Math.round(rc.right)+' '+(e.textContent||'').slice(0,50)); });
    const small=[]; document.querySelectorAll('figure.diagram svg').forEach((sv,i)=>{ const nat=parseFloat(sv.getAttribute('width'))||0; const r=sv.getBoundingClientRect(); const sc=nat? r.width/nat:1; const vb=sv.viewBox.baseVal; const hs = vb && vb.height ? r.height/vb.height : 1; const scale=Math.min(sc,hs); if (scale<0.72) small.push(i+': '+scale.toFixed(2)+' '+(sv.closest('figure').previousElementSibling||{}).textContent?.slice(0,40)); });
    return out.slice(0,8).concat(small); });
  console.log(f, r.length ? r : 'OK'); await p.close();
}
await b.close();
