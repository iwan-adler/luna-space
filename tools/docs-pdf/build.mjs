// Luna Space planning docs: Markdown -> HTML -> PDF (two-pass so the TOC carries real page numbers).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const REPO = path.resolve(HERE, '..', '..');
const SRC = path.join(REPO, 'docs', 'specs');
const OUT = path.join(REPO, 'planning', 'pdf');
const HTMLDIR = path.join(HERE, '.cache');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(HTMLDIR, { recursive: true });

const VERSION = '1.1';
const DATE = '17 November 2026';
const DOCS = [
  { n: '01', src: '01_prd.md', pdf: '01_Luna_Space_PRD.pdf', title: 'Product Requirements Document', short: 'PRD' },
  { n: '02', src: '02_flow.md', pdf: '02_Luna_Space_Application_Flow.pdf', title: 'Application Flow and Navigation Architecture', short: 'Application Flow' },
  { n: '03', src: '03_impl.md', pdf: '03_Luna_Space_Implementation_Plan.pdf', title: 'Implementation Plan', short: 'Implementation Plan' },
  { n: '04', src: '04_trd.md', pdf: '04_Luna_Space_TRD.pdf', title: 'Technical Requirements Document', short: 'TRD' },
  { n: '05', src: '05_uiux.md', pdf: '05_Luna_Space_UI_UX_Flow.pdf', title: 'UI/UX Flow and Design Specification', short: 'UI/UX Specification' },
  { n: '06', src: '06_schema.md', pdf: '06_Luna_Space_Backend_Schema.pdf', title: 'Backend Database Schema and Data Architecture', short: 'Backend Schema' },
];
const only = process.argv.slice(2);

const css = fs.readFileSync(path.join(HERE, 'style.css'), 'utf8');
const mermaidJs = fs.readFileSync(path.join(HERE, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf8');

function slug(s, used) {
  let b = s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'h';
  let k = b, i = 2;
  while (used.has(k)) k = `${b}-${i++}`;
  used.add(k);
  return k;
}
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

function render(doc, pageMap) {
  const md = fs.readFileSync(path.join(SRC, doc.src), 'utf8');
  const used = new Set();
  const heads = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = slug(strip(text), used);
        if (depth === 2 || depth === 3) heads.push({ depth, text: strip(text), id });
        const cls = depth === 2 ? ' class="sec"' : '';
        return `<h${depth} id="${id}"${cls}>${text}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (lang === 'mermaid') return `<figure class="diagram"><pre class="mermaid">${esc}</pre></figure>\n`;
        return `<pre class="code"><code class="lang-${lang || 'text'}">${esc}</code></pre>\n`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        const m = body.match(/^<p><strong>([A-Za-z /-]+?):?<\/strong>/);
        const kind = m ? m[1].toLowerCase().split(/[ /]/)[0] : 'note';
        return `<aside class="callout c-${kind}">${body}</aside>\n`;
      },
    },
  });
  const body = marked.parse(md);
  let k = 0;
  const toc = heads.map((h) => {
    const p = pageMap ? pageMap[k++] ?? '' : '000';
    return `<li class="t${h.depth}"><a href="#${h.id}"><span class="tt">${h.text}</span><span class="dots"></span><span class="pg">${p}</span></a></li>`;
  }).join('\n');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Luna Space — ${doc.title}</title>
<style>${css}</style></head><body>
<section class="cover">
  <div class="cover-top"><div class="logo"><span class="moon"></span>Luna Space</div><div class="docno">Document ${doc.n} of 06</div></div>
  <div class="cover-mid">
    <div class="kicker">Planning &amp; specification package</div>
    <h1 class="title">${doc.title}</h1>
    <div class="sub">Luna Space — a private two-person workspace for hackathons, opportunities, projects and productivity</div>
  </div>
  <table class="meta">
    <tr><th>Document</th><td>${doc.pdf}</td></tr>
    <tr><th>Version</th><td>${VERSION}</td></tr>
    <tr><th>Date</th><td>${DATE}</td></tr>
    <tr><th>Status</th><td>Draft for review. All architecture is <b>proposed</b>; nothing in this package describes a confirmed implementation.</td></tr>
    <tr><th>Companion documents</th><td>01 PRD · 02 Application Flow · 03 Implementation Plan · 04 TRD · 05 UI/UX Specification · 06 Backend Schema</td></tr>
    <tr><th>Precedence</th><td>Scope and priority: 01 PRD. Navigation: 02. Delivery order: 03. Technology: 04. Visual design: 05. Data model: 06.</td></tr>
  </table>
  <table class="meta rev"><tr><th>Version</th><th>Date</th><th>Change</th></tr><tr><td>1.0</td><td>${DATE}</td><td>Initial release of the six-document package.</td></tr><tr><td>1.1</td><td>${DATE}</td><td>Added project-scoped guest access (R1), project meetings with Google Meet links (R2) and optional Google OAuth / automatic Meet links (R3). Two-member workspace limit unchanged.</td></tr></table>
</section>
<section class="toc"><h2 class="toc-h">Contents</h2><ol class="toclist">${toc}</ol></section>
<main>${body}</main>
<script>${mermaidJs}</script>
<script>
mermaid.initialize({ startOnLoad:false, securityLevel:'loose', theme:'base',
  flowchart:{ htmlLabels:true, curve:'basis', nodeSpacing:28, rankSpacing:36, padding:8, useMaxWidth:true },
  sequence:{ useMaxWidth:true, mirrorActors:false, wrap:true, width:120, actorMargin:36, boxMargin:6, messageMargin:26, messageFontSize:12, actorFontSize:12, noteFontSize:12 },
  er:{ useMaxWidth:true, fontSize:11 },
  themeVariables:{ fontFamily:'Segoe UI, Arial, sans-serif', fontSize:'13px', primaryColor:'#EEECFD', primaryBorderColor:'#5B4FE0', primaryTextColor:'#1B1D2E', lineColor:'#5E6178', secondaryColor:'#FDF5E2', tertiaryColor:'#F2F3F8', clusterBkg:'#F7F7FB', clusterBorder:'#C9C8E8', edgeLabelBackground:'#ffffff' } });
window.__done = false;
mermaid.run({ querySelector: 'pre.mermaid' }).then(()=>{
  document.querySelectorAll('pre.mermaid svg').forEach(s=>{ const mw=parseFloat(s.style.maxWidth); if(mw){ s.setAttribute('width', mw); s.style.maxWidth=''; s.removeAttribute('height'); } });
  window.__done = true; }).catch(e=>{ window.__err = (e && (e.message||e.str)) || JSON.stringify(e); window.__done = true; });
</script>
</body></html>`;
  return { html, heads };
}

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function toPdf(doc, html, file) {
  const htmlFile = path.join(HTMLDIR, doc.src.replace('.md', '.html'));
  fs.writeFileSync(htmlFile, html);
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${doc.n} console]`, m.text()); });
  await page.goto('file:///' + htmlFile.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction('window.__done === true', { timeout: 120000 });
  const err = await page.evaluate('window.__err');
  if (err) console.log(`[${doc.n}] MERMAID ERROR:`, err);
  const bad = await page.evaluate(() => [...document.querySelectorAll('pre.mermaid')].filter(p => !p.querySelector('svg') || p.textContent.includes('Syntax error')).map(p=>p.textContent.slice(0,90)));
  if (bad.length) console.log(`[${doc.n}] FAILED diagrams:`, bad);
  const foot = `<div style="width:100%;font:7.5pt 'Segoe UI',Arial;color:#6b6e85;padding:0 16mm;display:flex;justify-content:space-between"><span>Luna Space · ${doc.n} ${doc.short} · v${VERSION}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  await page.pdf({ path: file, format: 'A4', printBackground: true, outline: true, tagged: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>', footerTemplate: foot, margin: { top: '16mm', bottom: '17mm', left: '16mm', right: '16mm' } });
  await page.close();
}

for (const doc of DOCS) {
  if (only.length && !only.includes(doc.n)) continue;
  if (!fs.existsSync(path.join(SRC, doc.src))) { console.log('skip (missing)', doc.src); continue; }
  const pass1 = path.join(HTMLDIR, `pass1_${doc.n}.pdf`);
  const r1 = render(doc, null);
  await toPdf(doc, r1.html, pass1);
  const info = JSON.parse(execFileSync('python', [path.join(HERE, 'outline.py'), pass1]).toString());
  // Outline contains h1..h6 in document order; keep the ones whose title matches our TOC headings sequentially.
  const flat = info.outline;
  const map = [];
  let j = 0;
  const norm = (s) => s.replace(/[\s ]+/g, '').toLowerCase();
  for (const h of r1.heads) {
    let k = j;
    while (k < flat.length && norm(flat[k][1]) !== norm(h.text)) k++;
    if (k < flat.length) { map.push(flat[k][2]); j = k + 1; }
    else { map.push('?'); console.log(`[${doc.n}] TOC unmatched: ${h.text}`); }
  }
  const missing = map.filter((x) => x === '?').length;
  const r2 = render(doc, map);
  const final = path.join(OUT, doc.pdf);
  await toPdf(doc, r2.html, final);
  const info2 = JSON.parse(execFileSync('python', [path.join(HERE, 'outline.py'), final]).toString());
  console.log(`${doc.pdf}: ${info2.pages} pages, ${r1.heads.length} TOC entries, unmatched=${missing}, pagecount stable=${info.pages === info2.pages}`);
}
await browser.close();
if (!only.length) execFileSync('python', [path.join(HERE, 'make_zip.py'), OUT, path.join(REPO, 'planning', 'Luna_Space_Planning_Documents.zip')], { stdio: 'inherit' });
