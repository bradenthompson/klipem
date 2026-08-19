// ==UserScript==
// @name         Discogs → Juno Player
// @namespace    https://www.discogs.com/
// @version      2.4.0
// @description  Juno preview player for Discogs
// @author       Nino_Industries
// @match        https://www.discogs.com/sell/list*
// @match        https://www.discogs.com/sell/mywants*
// @match        https://www.discogs.com/marketplace*
// @match        https://www.discogs.com/seller/*/profile*
// @match        https://www.discogs.com/sell/item*
// @match        https://www.discogs.com/release/*
// @match        https://www.discogs.com/*/release/*
// @match        https://www.discogs.com/master/*
// @match        https://www.discogs.com/*/master/*
// @grant        GM_xmlhttpRequest
// @connect      juno.co.uk
// ==/UserScript==

(function () {
  'use strict';

  // ─── Styles ───────────────────────────────────────────────────────────────
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `
    .juno-btn {
      display:inline-flex;align-items:center;gap:4px;margin-left:8px;
      padding:2px 7px 2px 5px;background:#f5a623;color:#000;border-radius:3px;
      font:700 10px/1 Arial;letter-spacing:.05em;text-transform:uppercase;
      text-decoration:none;vertical-align:middle;white-space:nowrap;
      border:none;cursor:pointer;transition:background .15s,transform .1s;
    }
    .juno-btn:hover{background:#e8960d;transform:translateY(-1px);text-decoration:none;color:#000}
    .juno-btn:active{transform:none}
    .kw {
      position:fixed;font:13px Arial;z-index:999999;background:#1a1a1a;color:#fff;
      border:1px solid #2e2e2e;border-top:2px solid #f5a623;border-radius:7px;
      box-shadow:0 10px 36px rgba(0,0,0,.65);display:none;flex-direction:column;
      user-select:none;
    }
    .kw.on{display:flex}
    .kw-bar {
      display:flex;align-items:center;gap:8px;padding:8px 10px;
      border-bottom:1px solid #252525;cursor:grab;flex-shrink:0;
    }
    .kw-bar:active{cursor:grabbing}
    .kw-title{font:700 11px Arial;color:#ddd;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .kw-x{background:none;border:none;color:#555;font-size:15px;cursor:pointer;padding:0;line-height:1;transition:color .15s}
    .kw-x:hover{color:#fff}
    /* picker */
    #jp{width:310px;max-height:440px;min-height:70px}
    #jp-list{overflow-y:auto;flex:1;padding:6px 8px 8px}
    .jp-msg{color:#666;font-style:italic;padding:8px 2px;font-size:12px}
    .jp-row{display:flex;align-items:center;gap:9px;padding:7px 9px;margin-bottom:3px;
      background:#222;border:1px solid #2e2e2e;border-radius:5px;cursor:pointer;transition:background .15s,border-color .15s}
    .jp-row:hover{background:#2a2a2a;border-color:#f5a623}
    .jp-icon{width:21px;height:21px;background:#f5a623;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .jp-name{flex:1;font-size:12px;line-height:1.3}
    .jp-id{font-size:10px;color:#555;white-space:nowrap}
    /* player */
    #jpl{width:290px}
    #jpl-transport{display:flex;align-items:center;gap:5px;padding:7px 9px 3px}
    .jpl-btn{background:none;border:none;color:#ddd;cursor:pointer;padding:4px;display:flex;
      align-items:center;opacity:.6;transition:opacity .15s,background .15s;border-radius:3px;flex-shrink:0}
    .jpl-btn:hover{opacity:1;background:#252525}
    .jpl-btn:disabled{opacity:.2;cursor:default;background:none}
    #jpl-prog{flex:1;height:3px;background:#333;border-radius:2px;cursor:pointer;transition:height .1s}
    #jpl-prog:hover{height:5px}
    #jpl-bar{height:100%;background:#f5a623;border-radius:2px;width:0%;pointer-events:none}
    #jpl-time{font-size:10px;color:#555;white-space:nowrap;flex-shrink:0;min-width:66px;text-align:right}
    #jpl-tracks{display:flex;flex-wrap:wrap;gap:3px;padding:4px 9px 9px}
    .jpl-trk{background:#222;border:1px solid #2e2e2e;color:#777;font:700 10px Arial;
      padding:3px 7px;border-radius:3px;cursor:pointer;transition:background .15s,color .15s,border-color .15s;white-space:nowrap}
    .jpl-trk:hover{background:#2a2a2a;color:#ddd;border-color:#555}
    .jpl-trk.on{background:#f5a623;color:#000;border-color:#f5a623}
    #jpl-juno{font:700 9px Arial;color:#555;text-decoration:none;text-transform:uppercase;
      letter-spacing:.05em;border:1px solid #2e2e2e;border-radius:3px;padding:2px 5px;
      white-space:nowrap;flex-shrink:0;transition:background .15s,color .15s,border-color .15s}
    #jpl-juno:hover{background:#f5a623;color:#000;border-color:#f5a623}
  `}));

  // ─── SVGs ────────────────────────────────────────────────────────────────
  const svgPlay  = `<svg width="9" height="10" viewBox="0 0 9 10" fill="none"><path d="M1 1L8 5L1 9V1Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`;
  const svgPrev  = `<svg width="9" height="10" viewBox="0 0 9 10" fill="none"><path d="M8 1L1 5L8 9V1Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`;
  const svgPause = `<svg width="9" height="10" viewBox="0 0 9 10" fill="none"><rect x="1" y="1" width="2.5" height="8" fill="currentColor"/><rect x="5.5" y="1" width="2.5" height="8" fill="currentColor"/></svg>`;

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const clean = s => s.replace(/\s*[\(\[].*?[\)\]]\s*$/, '').trim();

  const sanitise = s => s
    .replace(/\s*[\(\[].*?[\)\]]/g, '')
    .replace(/\b(ft\.?|feat\.?|featuring|vs\.?|pres\.?|presents|aka)\b.*/i, '')
    .replace(/[&+"""''`/\\|*^~@#$%!?=<>{}]/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();

  const junoSearchUrl = t =>
    `https://www.juno.co.uk/search/?q%5Ball%5D%5B0%5D=${encodeURIComponent(sanitise(t)).replace(/%20/g,'+')}&solrorder=relevancy&hide_forthcoming=0&show_out_of_stock=1`;

  const fmt = s => isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const gmGet = url => new Promise((res,rej) =>
    GM_xmlhttpRequest({method:'GET',url,onload:r=>res(r.responseText),onerror:rej}));

  const head = url => new Promise(res =>
    GM_xmlhttpRequest({method:'HEAD',url,onload:r=>res(r.status<400),onerror:()=>res(false)}));

  // ─── Draggable ────────────────────────────────────────────────────────────
  function draggable(el, handle) {
    let dx=0, dy=0, on=false;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button,a')) return;
      on=true;
      const r=el.getBoundingClientRect();
      dx=e.clientX-r.left; dy=e.clientY-r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!on) return;
      el.style.left = Math.max(0, Math.min(window.innerWidth-el.offsetWidth,   e.clientX-dx)) + 'px';
      el.style.top  = Math.max(0, Math.min(window.innerHeight-el.offsetHeight, e.clientY-dy)) + 'px';
    });
    document.addEventListener('mouseup', () => on=false);
  }

  // position a window — offset from picker if it exists, else default
  function placeNear(el, defaultLeft, defaultTop) {
    el.style.left = defaultLeft + 'px';
    el.style.top  = defaultTop  + 'px';
  }

  // ─── Juno API ─────────────────────────────────────────────────────────────
  async function search(title) {
    const html = await gmGet(junoSearchUrl(title));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const seen = new Set(), results = [];
    doc.querySelectorAll('a.text-md[href*="/products/"]').forEach(a => {
      if (results.length >= 10) return;
      const m = a.getAttribute('href').match(/([0-9]{5,})-[0-9]+\//);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      results.push({ name: a.textContent.trim(), id: m[1], url: 'https://www.juno.co.uk' + a.getAttribute('href') });
    });
    return results;
  }

  async function getTracks(id) {
    const tracks = [], sides = ['A','B','C','D'];
    for (let s=1; s<=4; s++) {
      const sp = s.toString().padStart(2,'0');
      const found = (await Promise.all(
        Array.from({length:20}, (_,i) => {
          const tp = (i+1).toString().padStart(2,'0');
          const url = `https://www.juno.co.uk/MP3/SF${id}-01-${sp}-${tp}.mp3`;
          return head(url).then(ok => ok ? {label:`${sides[s-1]}${i+1}`, url} : null);
        })
      )).filter(Boolean);
      if (!found.length) break;
      tracks.push(...found);
    }
    // If only one side, use plain numbers instead of A1, A2...
    if (sides.indexOf(tracks[tracks.length-1]?.label[0]) === 0)
      tracks.forEach((t,i) => t.label = String(i+1));
    return tracks;
  }

  // ─── Picker ───────────────────────────────────────────────────────────────
  let picker = null;

  function buildPicker() {
    if (picker) return;
    picker = document.createElement('div');
    picker.id = 'jp';
    picker.className = 'kw';
    picker.innerHTML = `<div class="kw-bar"><span class="kw-title">Select release</span><button class="kw-x">✕</button></div><div id="jp-list"></div>`;
    picker.querySelector('.kw-x').onclick = hidePicker;
    placeNear(picker, 16, 16);
    document.body.appendChild(picker);
    draggable(picker, picker.querySelector('.kw-bar'));
  }

  const hidePicker = () => picker && picker.classList.remove('on');

  async function openPicker(title) {
    buildPicker();
    hidePlayer();
    const list = picker.querySelector('#jp-list');
    list.innerHTML = '<div class="jp-msg">Searching…</div>';
    picker.classList.add('on');

    let results;
    try { results = await search(title); }
    catch { list.innerHTML = '<div class="jp-msg">Error fetching results.</div>'; return; }

    if (!results.length) { list.innerHTML = '<div class="jp-msg">No results found on Juno.</div>'; return; }

    list.innerHTML = '';
    results.forEach(r => {
      const row = document.createElement('div');
      row.className = 'jp-row';
      row.innerHTML = `<div class="jp-icon">${svgPlay}</div><div class="jp-name">${r.name}</div><div class="jp-id">#${r.id}</div>`;
      row.onclick = () => { hidePicker(); openPlayer(r.name || title, r.id, r.url); };
      list.appendChild(row);
    });
  }

  // ─── Player ───────────────────────────────────────────────────────────────
  let player = null, audio = null, tracks = [], idx = 0;

  function buildPlayer() {
    if (player) return;
    audio = new Audio();
    player = document.createElement('div');
    player.id = 'jpl';
    player.className = 'kw';
    player.innerHTML = `
      <div class="kw-bar">
        <span class="kw-title" id="jpl-name"></span>
        <a id="jpl-juno" href="#" target="_blank" rel="noopener">↗</a>
        <button class="kw-x">✕</button>
      </div>
      <div id="jpl-transport">
        <button class="jpl-btn" id="jpl-prev">${svgPrev}</button>
        <button class="jpl-btn" id="jpl-pp">${svgPlay}</button>
        <button class="jpl-btn" id="jpl-next">${svgPlay}</button>
        <div id="jpl-prog"><div id="jpl-bar"></div></div>
        <div id="jpl-time">0:00 / 0:00</div>
      </div>
      <div id="jpl-tracks"></div>`;

    player.querySelector('.kw-x').onclick = hidePlayer;
    player.querySelector('#jpl-prev').onclick = () => playAt(idx-1);
    player.querySelector('#jpl-next').onclick = () => playAt(idx+1);
    player.querySelector('#jpl-pp').onclick = toggle;
    player.querySelector('#jpl-prog').onclick = e => {
      if (!audio.duration) return;
      const r = e.currentTarget.getBoundingClientRect();
      audio.currentTime = ((e.clientX-r.left)/r.width) * audio.duration;
    };
    audio.addEventListener('timeupdate', () => {
      const p = audio.duration ? (audio.currentTime/audio.duration)*100 : 0;
      player.querySelector('#jpl-bar').style.width = p + '%';
      player.querySelector('#jpl-time').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
    });
    audio.addEventListener('ended', () => idx < tracks.length-1 ? playAt(idx+1) : setPP(false));

    document.body.appendChild(player);
    draggable(player, player.querySelector('.kw-bar'));
  }

  const hidePlayer = () => { audio&&(audio.pause(),audio.src=''); player&&player.classList.remove('on'); };
  const setPP = playing => { if (player) player.querySelector('#jpl-pp').innerHTML = playing ? svgPause : svgPlay; };
  const toggle = () => { audio.paused ? audio.play() : audio.pause(); setPP(!audio.paused); };

  function playAt(i) {
    if (i < 0 || i >= tracks.length) return;
    idx = i;
    audio.src = tracks[i].url;
    audio.play();
    setPP(true);
    player.querySelectorAll('.jpl-trk').forEach((b,j) => b.classList.toggle('on', j===i));
    player.querySelector('#jpl-prev').disabled = i===0;
    player.querySelector('#jpl-next').disabled = i===tracks.length-1;
  }

  async function openPlayer(title, id, url) {
    buildPlayer();

    // Position player near where picker was, offset slightly so they don't overlap
    if (picker) {
      const r = picker.getBoundingClientRect();
      player.style.left = Math.min(r.left + 20, window.innerWidth - 310) + 'px';
      player.style.top  = Math.min(r.top  + 20, window.innerHeight - 200) + 'px';
    } else {
      placeNear(player, window.innerWidth - 306, 16);
    }

    player.querySelector('#jpl-name').textContent = title;
    player.querySelector('#jpl-juno').href = url || '#';
    player.querySelector('#jpl-tracks').innerHTML = '<span style="color:#555;font-size:11px;padding:4px 0;display:block">Loading…</span>';
    player.classList.add('on');

    tracks = await getTracks(id);

    const tEl = player.querySelector('#jpl-tracks');
    if (!tracks.length) { tEl.innerHTML = '<span style="color:#555;font-size:11px;padding:4px 0;display:block">No previews found</span>'; return; }

    tEl.innerHTML = '';
    tracks.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'jpl-trk';
      b.textContent = t.label;
      b.onclick = () => playAt(i);
      tEl.appendChild(b);
    });
    playAt(0);
  }

  // ─── Page button injection ────────────────────────────────────────────────
  const SELECTORS = [
    'td.item_description a.item_description_title',
    'td.item_description a[href*="/sell/item"]',
    'span.marketplace_item_title a',
    'a.item_description_title',
    '.marketplace-listing-title a',
  ].join(',');

  function mkBtn(title) {
    const a = document.createElement('a');
    a.href='#'; a.className='juno-btn'; a.title=`Preview on Juno: ${title}`;
    a.innerHTML=svgPlay;
    a.onclick = e => { e.preventDefault(); e.stopPropagation(); openPicker(title); };
    return a;
  }

  function injectButtons() {
    document.querySelectorAll(SELECTORS).forEach(link => {
      if (link.dataset.ji) return;
      link.dataset.ji = '1';
      const raw = link.textContent.trim();
      if (!raw.includes(' - ')) return;
      const btn = mkBtn(clean(raw));
      link.after(btn);
    });
  }

  function isDetailPage() { return /\/(release|master)\/\d+/.test(location.pathname); }

  function tryInjectDetailBtn() {
    if (document.querySelector('.juno-btn-detail')?.isConnected) return true;
    const h1 = document.querySelector('h1[class*="title_"],h1.title,h1');
    if (!h1) return false;
    const raw = h1.textContent.trim().replace(/\s*–\s*/g,' - ');
    if (!raw.includes(' - ')) return false;
    const btn = mkBtn(clean(raw));
    btn.classList.add('juno-btn-detail');
    btn.style.cssText = 'font-size:11px;padding:4px 9px 4px 7px;margin-left:10px';
    h1.style.display = 'inline';
    h1.after(btn);
    return true;
  }

  function injectDetailBtn() {
    if (tryInjectDetailBtn()) return;
    let n=0;
    const iv = setInterval(() => { if (tryInjectDetailBtn() || ++n>33) clearInterval(iv); }, 300);
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  let rtimer;
  new MutationObserver(() => {
    injectButtons();
    if (isDetailPage()) { clearTimeout(rtimer); rtimer = setTimeout(tryInjectDetailBtn, 400); }
  }).observe(document.body, {childList:true, subtree:true});

  injectButtons();
  if (isDetailPage()) injectDetailBtn();

})();
