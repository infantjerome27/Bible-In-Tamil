/* திருவிவிலியம் — Bible in Tamil webapp */
(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const view=$('#view'), titleEl=$('#pageTitle'), subEl=$('#pageSub'), backBtn=$('#backBtn');
const store={get(k,d){try{const v=localStorage.getItem('tamilbible_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('tamilbible_'+k,JSON.stringify(v));}catch(e){}}};

let META=null, bookCache={}, searchIdx={};
const prefs={version:store.get('version','ecu'), fs:store.get('fs',18)};

const DAILY=[
 ["தொடக்க நூல் 1:1","தொடக்கத்தில் கடவுள் விண்ணையும் மண்ணையும் படைத்தார்."],
 ["திருப்பாடல்கள் 23:1","ஆண்டவரே என் ஆயர்; எனக்கேதும் குறையில்லை."],
 ["நீதிமொழிகள் 3:5","உன் முழு இதயத்தோடும் ஆண்டவரில் நம்பிக்கை கொள்."],
 ["ஏசாயா 41:10","அஞ்சாதே, நான் உன்னோடு இருக்கிறேன்."],
 ["எரேமியா 29:11","உங்களுக்கு நல்வாழ்வு அளிக்கும் திட்டங்களையே நான் கொண்டுள்ளேன்."],
 ["மத்தேயு 11:28","பெருஞ்சுமை சுமந்து சோர்ந்திருப்பவர்களே, என்னிடம் வாருங்கள்."],
 ["மத்தேயு 28:20","இதோ! உலக முடிவுவரை எந்நாளும் நான் உங்களுடன் இருக்கிறேன்."],
 ["யோவான் 3:16","தம் ஒரே மகனை விசுவாசிப்போர் அழியாமல் நிலைவாழ்வு பெறும்பொருட்டு கடவுள் அவரையே அளித்தார்."],
 ["யோவான் 14:6","வழியும் உண்மையும் வாழ்வும் நானே."],
 ["ரோமர் 8:28","கடவுளிடம் அன்பு கொள்வோருக்கு அனைத்தும் நன்மைக்கே ஏதுவாகும்."],
 ["பிலிப்பியர் 4:13","எனக்கு வலுவூட்டுகிறவரின் துணைகொண்டு எதையும் செய்ய எனக்கு ஆற்றல் உண்டு."],
 ["சங்கீதம் 46:1","கடவுள் நமக்கு அடைக்கலமும் ஆற்றலுமாய் உள்ளார்."],
 ["நீதிமொழிகள் 16:3","உன் செயல்களை ஆண்டவரிடம் ஒப்படைத்துவிடு; உன் திட்டங்கள் நிறைவேறும்."],
 ["ஏசாயா 40:31","ஆண்டவருக்காகக் காத்திருப்போர் புதுப்பெலன் பெறுவர்."],
 ["மத்தேயு 5:16","உங்கள் ஒளி மனிதர்முன் ஒளிர்க!"],
 ["மாற்கு 10:27","மனிதரால் இயலாதது கடவுளால் இயலும்."],
 ["லூக்கா 1:37","கடவுளால் இயலாதது ஒன்றுமில்லை."],
 ["யோவான் 8:12","உலகின் ஒளி நானே; என்னைப் பின்தொடர்பவர் இருளில் நடக்கமாட்டார்."],
 ["உரோமையர் 10:13","ஆண்டவரின் திருப்பெயரைத் தொழுது வேண்டுவோர் அனைவரும் மீட்பு பெறுவர்."],
 ["1 கொரிந்தியர் 13:13","நம்பிக்கை, எதிர்நோக்கு, அன்பு ஆகிய மூன்றும் நிலைத்திருக்கின்றன. இவற்றுள் உயர்ந்தது அன்பே."],
 ["எபேசியர் 6:10","ஆண்டவரிடமும் அவரது வலிமைமிகு ஆற்றலிலும் வலுப்பெறுங்கள்."],
 ["திருப்பாடல்கள் 119:105","உமது வாக்கு என் காலடிக்கு விளக்கு; என் பாதைக்கு ஒளி."],
 ["யோசுவா 1:9","திடன் கொள், துணிவுடன் இரு; உன் கடவுளாகிய ஆண்டவர் உன்னோடு இருப்பார்."],
 ["சங்கீதம் 37:4","ஆண்டவரில் மகிழ்ச்சி கொள்; உன் உள்ள விருப்பங்களை அவர் நிறைவேற்றுவார்."],
];

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add('hidden'),2200);}
function setTitle(t,s){titleEl.textContent=t;subEl.textContent=s||'Bible in Tamil';}
function showBack(show,fn){backBtn.style.visibility=show?'visible':'hidden';backBtn.onclick=fn||history.back;}
function markTab(r){$$('#tabbar .tab').forEach(b=>b.classList.toggle('on',b.dataset.route===r));}

async function loadMeta(){if(!META){const r=await fetch('data/meta.json');META=await r.json();}return META;}
async function loadBook(v,b){const k=v+'/'+b;if(!bookCache[k]){const r=await fetch(`data/${v}/${b}.json`);bookCache[k]=await r.json();}return bookCache[k];}
async function loadIndex(kind,slug){const r=await fetch(`data/${kind}/${slug}.json`);return r.json();}

function go(hash){location.hash=hash;}
function parseHash(){
  let h=location.hash.replace(/^#\/?/,'');
  let frag='';
  const fm=h.match(/#(v\d+)$/);
  if(fm){frag=fm[1];h=h.slice(0,-fm[0].length);}
  const [path,qs]=h.split('?');const p={};
  if(qs)qs.split('&').forEach(kv=>{const [k,v]=kv.split('=');p[decodeURIComponent(k)]=decodeURIComponent(v||'');});
  return {route:path||'home',params:p,frag};
}

/* ---------- views ---------- */
async function vHome(){
  setTitle('திருவிவிலியம்','Bible in Tamil');showBack(false);markTab('home');
  const meta=await loadMeta();
  const day=Math.floor(Date.now()/864e5);const dv=DAILY[day%DAILY.length];
  const last=store.get('last',null);
  let html=`<div class="hero"><h2>📖 திருவிவிலியம்</h2><p>தமிழில் இறைவனின் வார்த்தை — 6 மொழிபெயர்ப்புகள், ${meta.ecu.books.length} நூல்கள், குரல் வசனத்துடன்</p></div>`;
  html+=`<div class="verse-card"><div class="ref">✦ இன்றைய வசனம் — ${esc(dv[0])}</div><div class="txt">“${esc(dv[1])}”</div></div>`;
  if(last)html+=`<button class="list-item" id="continueBtn"><span class="n">▶</span><span>தொடர்ந்து வாசிக்க: ${esc(last.label)}</span><span class="chev">›</span></button>`;
  html+=`<div class="sec-title">மொழிபெயர்ப்புகள்</div><div class="grid">`;
  const icons={ecu:'🕊️',kjt:'👑',rct:'⛪',nae:'📜',kje:'📖',nrsv:'🌍'};
  for(const k of ['ecu','kjt','rct','nae','kje','nrsv']){
    const v=meta[k];
    html+=`<button class="card-btn" data-v="${k}"><span class="big">${icons[k]||'📖'}</span>${esc(v.short)}<small>${v.books.length} நூல்கள்</small></button>`;
  }
  html+=`</div><div class="sec-title">பகுதிகள்</div><div class="grid">
    <button class="card-btn" data-go="prayers"><span class="big">🙏</span>ஜெபங்கள்</button>
    <button class="card-btn" data-go="search"><span class="big">⌕</span>வசனம் தேடுக</button>
    <button class="card-btn" data-go="compare"><span class="big">◐</span>ஒப்பிடுக</button>
    <button class="card-btn" data-go="songs"><span class="big">🎵</span>பாடல்கள்</button>
    <button class="card-btn" data-go="more"><span class="big">☰</span>மேலும்</button>
  </div>
  <div class="credit">மூலம்: bibleintamil.com<br>தொகுப்பு: Fr. Mariadas Lipton</div>`;
  view.innerHTML=html;
  view.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{prefs.version=b.dataset.v;store.set('version',prefs.version);go('books?v='+b.dataset.v);});
  view.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  const cb=$('#continueBtn');if(cb)cb.onclick=()=>go(`read?v=${last.v}&b=${last.b}&c=${last.c}`);
}

async function vBible(){
  setTitle('மொழிபெயர்ப்பை தேர்வு செய்க','Choose version');showBack(true,()=>go('home'));markTab('bible');
  const meta=await loadMeta();
  let html='';
  for(const k of ['ecu','kjt','rct','nae','kje','nrsv']){
    const v=meta[k];
    html+=`<button class="list-item" data-v="${k}"><span class="n">${v.lang==='ta'?'அ':'A'}</span><span>${esc(v.full)}<br><small style="color:var(--muted)">${v.books.length} நூல்கள்</small></span><span class="chev">›</span></button>`;
  }
  view.innerHTML=html;
  view.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{prefs.version=b.dataset.v;store.set('version',prefs.version);go('books?v='+b.dataset.v);});
}

async function vBooks(v){
  const meta=await loadMeta();const ver=meta[v]||meta.ecu;
  setTitle(ver.short,'புத்தகங்கள் · Books');showBack(true,()=>go('bible'));markTab('bible');
  const ot=ver.books.filter(b=>!isNT(v,b.key)), nt=ver.books.filter(b=>isNT(v,b.key));
  let html=`<div class="pill-row">${['ecu','kjt','rct','nae','kje','nrsv'].map(k=>`<button class="pill${k===v?' on':''}" data-v="${k}">${esc(meta[k].short)}</button>`).join('')}</div>`;
  const grp=(t,arr)=>`<div class="sec-title">${t} (${arr.length})</div>`+arr.map(b=>`<button class="list-item" data-b="${b.key}"><span class="n">${esc(b.name.slice(0,2))}</span><span>${esc(b.name)}</span><span class="chev">›</span></button>`).join('');
  html+=grp('பழைய ஏற்பாடு · Old Testament',ot)+grp('புதிய ஏற்பாடு · New Testament',nt);
  view.innerHTML=html;
  view.querySelectorAll('.pill').forEach(p=>p.onclick=()=>go('books?v='+p.dataset.v));
  view.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>go(`read?v=${v}&b=${b.dataset.b}&c=1`));
}
function isNT(v,key){
  const nt=['mathew','mark','luke','john','acts','romans','corinthier1','corinthier2','galatians','ephesians','philipier','colosier','thesolon1','thesolon2','thimothe1','thimothe2','titus','philomone','hebrews','james','peter1','peter2','john1','john2','john3','jude','revelation'];
  return nt.includes(key);
}

async function vRead(v,b,c){
  const meta=await loadMeta();const ver=meta[v];
  const bk=await loadBook(v,b);
  const chs=Object.keys(bk.chapters).map(Number).sort((x,y)=>x-y);
  c=chs.includes(+c)?+c:chs[0];
  const ch=bk.chapters[String(c)];
  setTitle(`${bk.name} ${c}`,ver.short);showBack(true,()=>go(`books?v=${v}`));markTab('bible');
  store.set('last',{v,b,c,label:`${bk.name} ${c} (${ver.short})`});
  const idx=chs.indexOf(c);
  const verses=Object.entries(ch.verses).map(([n,t])=>`<div class="verse" id="v${n}"><span class="vn">${n}</span><span class="vt">${esc(t)}</span></div>`).join('');
  view.innerHTML=`
    <div class="reader-head"><h2>${esc(bk.name)} · அதிகாரம் ${c}</h2>
    ${ch.audio?`<button class="audio-btn" id="audBtn">🔊 கேளுங்கள்</button>`:''}</div>
    ${ch.audio?`<audio id="aud" preload="none" src="${ch.audio}"></audio>`:''}
    <div class="pill-row" id="chapRow">${chs.map(x=>`<button class="pill${x===c?' on':''}" data-c="${x}">${x}</button>`).join('')}</div>
    <div id="verses">${verses}</div>
    <div class="nav-row">
      <button id="prevBtn" ${idx<=0?'disabled':''}>‹ முந்தைய அதிகாரம்</button>
      <button id="nextBtn" ${idx>=chs.length-1?'disabled':''}>அடுத்த அதிகாரம் ›</button>
    </div>`;
  $('#chapRow').querySelectorAll('.pill').forEach(p=>p.onclick=()=>go(`read?v=${v}&b=${b}&c=${p.dataset.c}`));
  $('#prevBtn').onclick=()=>{if(idx>0)go(`read?v=${v}&b=${b}&c=${chs[idx-1]}`);};
  $('#nextBtn').onclick=()=>{if(idx<chs.length-1)go(`read?v=${v}&b=${b}&c=${chs[idx+1]}`);};
  const ab=$('#audBtn'),au=$('#aud');
  if(ab)ab.onclick=()=>{if(au.paused){au.play().catch(()=>toast('ஒலி ஏற்ற முடியவில்லை — இணையம் தேவை'));ab.textContent='⏸ நிறுத்து';}else{au.pause();ab.textContent='🔊 கேளுங்கள்';}};
  if(au)au.onended=()=>{ab.textContent='🔊 கேளுங்கள்';};
}

async function vCompare(p){
  setTitle('விவிலிய ஒப்பீடு','Compare versions');showBack(true,()=>go('home'));markTab('compare');
  const meta=await loadMeta();
  const va=p.va||'ecu', vb=p.vb||'kjt', b=p.b||'genesis', c=+(p.c||1);
  const opts=sel=>['ecu','kjt','rct','nae','kje','nrsv'].map(k=>`<option value="${k}"${k===sel?' selected':''}>${esc(meta[k].short)}</option>`).join('');
  const bkA=await loadBook(va,b).catch(()=>null);
  const books=meta[va].books;
  const bname=bkA?bkA.name:b;
  const chsA=bkA?Object.keys(bkA.chapters).map(Number).sort((x,y)=>x-y):[];
  const cc=chsA.includes(c)?c:(chsA[0]||1);
  let colA='',colB='';
  if(bkA&&bkA.chapters[String(cc)]){
    colA=Object.entries(bkA.chapters[String(cc)].verses).map(([n,t])=>`<div class="cmp-verse"><span class="vn">${n}</span> ${esc(t)}</div>`).join('');
    const bkB=await loadBook(vb,b).catch(()=>null);
    if(bkB&&bkB.chapters[String(cc)])colB=Object.entries(bkB.chapters[String(cc)].verses).map(([n,t])=>`<div class="cmp-verse"><span class="vn">${n}</span> ${esc(t)}</div>`).join('');
    else colB='<div class="empty">இந்த மொழிபெயர்ப்பில் இல்லை</div>';
  }
  view.innerHTML=`
    <label class="lbl">மொழிபெயர்ப்பு 1</label><select id="selA">${opts(va)}</select>
    <label class="lbl">மொழிபெயர்ப்பு 2</label><select id="selB">${opts(vb)}</select>
    <label class="lbl">நூல்</label><select id="selB2">${books.map(x=>`<option value="${x.key}"${x.key===b?' selected':''}>${esc(x.name)}</option>`).join('')}</select>
    <label class="lbl">அதிகாரம்</label><div class="pill-row" id="cmpChaps">${chsA.map(x=>`<button class="pill${x===cc?' on':''}" data-c="${x}">${x}</button>`).join('')}</div>
    <div class="sec-title">${esc(bname)} ${cc}</div>
    <div class="cmp-grid"><div class="cmp-col"><h3>${esc(meta[va].short)}</h3>${colA}</div>
    <div class="cmp-col"><h3>${esc(meta[vb].short)}</h3>${colB}</div></div>`;
  const upd=()=>go(`compare?va=${$('#selA').value}&vb=${$('#selB').value}&b=${$('#selB2').value}&c=${cc}`);
  $('#selA').onchange=upd;$('#selB').onchange=upd;$('#selB2').onchange=()=>go(`compare?va=${va}&vb=${vb}&b=${$('#selB2').value}&c=1`);
  $('#cmpChaps').querySelectorAll('.pill').forEach(x=>x.onclick=()=>go(`compare?va=${va}&vb=${vb}&b=${b}&c=${x.dataset.c}`));
}

async function vSearch(p){
  setTitle('வசனம் தேடுக','Search the Bible');showBack(true,()=>go('home'));markTab('search');
  const meta=await loadMeta();
  const v=p.v||prefs.version, q=p.q||'';
  view.innerHTML=`
    <div class="search-box"><input id="q" type="text" placeholder="தேடும் சொல்… (எ.கா: அன்பு)" value="${esc(q)}"><button class="btn" id="sBtn">தேடுக</button></div>
    <div class="pill-row">${['ecu','kjt','rct'].map(k=>`<button class="pill${k===v?' on':''}" data-v="${k}">${esc(meta[k].short)}</button>`).join('')}</div>
    <div id="sRes">${q?'':'<div class="empty">வசனங்களில் தேட — குறைந்தது 2 எழுத்துக்கள்</div>'}</div>`;
  view.querySelectorAll('.pill').forEach(x=>x.onclick=()=>go(`search?v=${x.dataset.v}&q=${encodeURIComponent(q)}`));
  const run=()=>{const val=$('#q').value.trim();if(val.length>=2)go(`search?v=${v}&q=${encodeURIComponent(val)}`);else toast('குறைந்தது 2 எழுத்துக்கள்');};
  $('#sBtn').onclick=run;$('#q').onkeydown=e=>{if(e.key==='Enter')run();};
  if(q.length>=2)doSearch(v,q);
}
async function doSearch(v,q){
  const box=$('#sRes');box.innerHTML='<div class="loading">தேடுகிறது</div>';
  try{
    if(!searchIdx[v]){searchIdx[v]={};for(let i=0;i<6;i++){const r=await fetch(`data/search/${v}-${i}.json`);Object.assign(searchIdx[v],await r.json());}}
    const idx=searchIdx[v];
    const words=q.split(/[\s,;:.!?""''()\[\]—–-]+/).filter(w=>w.length>=2);
    const meta=await loadMeta();const books=meta[v].books;
    let hits=new Map();
    for(const w of words){
      const refs=idx[w]||[];
      for(const [bi,ch,vn] of refs){
        const k=bi+':'+ch+':'+vn;
        hits.set(k,(hits.get(k)||0)+1);
      }
    }
    const sorted=[...hits.entries()].sort((a,b)=>b[1]-a[1]).slice(0,60);
    if(!sorted.length){box.innerHTML='<div class="empty">முடிவுகள் இல்லை</div>';return;}
    // load verse texts
    const need={};
    sorted.forEach(([k])=>{const [bi]=k.split(':').map(Number);need[bi]=1;});
    const bookData={};
    for(const bi of Object.keys(need)){bookData[bi]=await loadBook(v,books[bi].key);}
    let html=`<div class="sec-title">${sorted.length} முடிவுகள்</div>`;
    for(const [k] of sorted){
      const [bi,ch,vn]=k.split(':').map(Number);
      const bk=books[bi], bd=bookData[bi];
      const t=bd&&bd.chapters[String(ch)]?bd.chapters[String(ch)].verses[String(vn)]:'';
      let h=esc(t);
      for(const w of words){h=h.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','g'),'<mark>$1</mark>');}
      html+=`<div class="verse-card result" data-bi="${bi}" data-ch="${ch}"><div class="ref">${esc(bk.name)} ${ch}:${vn} · ${esc(meta[v].short)}</div><div class="txt">${h}</div></div>`;
    }
    box.innerHTML=html;
    box.querySelectorAll('.result').forEach(r=>r.onclick=()=>go(`read?v=${v}&b=${books[+r.dataset.bi].key}&c=${r.dataset.ch}#v${r.dataset.vn}`));
  }catch(e){box.innerHTML='<div class="empty">தேடல் தரவு ஏற்ற முடியவில்லை</div>';}
}

async function vPrayers(){
  setTitle('ஜெபங்கள்','Catholic Prayers');showBack(true,()=>go('more'));markTab('');
  const idx=await loadIndex('prayers','_index');
  view.innerHTML='<div class="sec-title">கத்தோலிக்க ஜெபங்கள் ('+idx.length+')</div>'+
    idx.map(p=>`<button class="list-item" data-s="${p.slug}"><span class="n">🙏</span><span>${esc(p.title||p.slug)}</span><span class="chev">›</span></button>`).join('');
  view.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>go('prayer?slug='+b.dataset.s));
}
async function vPrayer(slug){
  const d=await loadIndex('prayers',slug);
  setTitle(d.title.slice(0,34),'ஜெபம்');showBack(true,()=>go('prayers'));markTab('');
  const paras=d.text.split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('');
  view.innerHTML=`<div class="article"><h2>${esc(d.title)}</h2><div class="lead">${esc(d.url||'')}</div>${paras}</div>`;
}

async function vSongs(){
  setTitle('பாடல்கள்','Christian Songs');showBack(true,()=>go('more'));markTab('');
  const idx=await loadIndex('songs','_index').catch(()=>[]);
  view.innerHTML='<div class="sec-title">பாடல் தொகுப்புகள் ('+idx.length+')</div>'+
    idx.map(a=>`<button class="list-item" data-s="${a.slug}"><span class="n">🎵</span><span>${esc(a.album)}<br><small style="color:var(--muted)">${a.count} பாடல்கள்</small></span><span class="chev">›</span></button>`).join('');
  view.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>go('album?slug='+b.dataset.s));
}
async function vAlbum(slug){
  const d=await loadIndex('songs',slug);
  setTitle(d.album.slice(0,32),'பாடல்கள்');showBack(true,()=>go('songs'));markTab('');
  view.innerHTML=`<div class="sec-title">${esc(d.album)} (${d.songs.length})</div>
    <audio id="songAud" controls preload="none" style="position:sticky;top:64px;z-index:5;background:var(--bg2);"></audio>
    <div id="songList">`+d.songs.map((s,i)=>`<button class="list-item" data-i="${i}"><span class="n">${i+1}</span><span>${esc(s.title)}</span><span class="chev">▶</span></button>`).join('')+`</div>
    <div class="credit">ஒலி: bibleintamil.com (இணையம் தேவை)</div>`;
  const aud=$('#songAud');
  view.querySelectorAll('#songList [data-i]').forEach(b=>b.onclick=()=>{
    const s=d.songs[+b.dataset.i];
    aud.src=s.audio;aud.play().catch(()=>toast('ஒலி ஏற்ற முடியவில்லை — இணையம் தேவை'));
    view.querySelectorAll('#songList .list-item').forEach(x=>x.style.borderColor='');
    b.style.borderColor='var(--gold)';
    setTitle(s.title.slice(0,30),d.album.slice(0,24));
  });
}

async function vMore(){
  setTitle('மேலும்','More sections');showBack(true,()=>go('home'));markTab('more');
  const idx=await loadIndex('pages','_index').catch(()=>[]);
  const groups={
    '📖 விவிலியம் பற்றி':['about-bible','bible-history','books-timeline','bible-maps','tamil-bible-history','about-translation','site-info','thanks','font-converter'],
    '🙏 ஜெபமும் வாழ்வும்':['prayers-link','stations-of-cross','daily-reflection','christ-life','matha'],
    '⛪ திருப்பலி':['mass-book','mass-ordinary','mass-people','mass-songs'],
    '✝️ இறையியல்':['church-history','sacraments','eucharist','mariology','spiritual-talks','study-bible'],
    '🕯️ புனிதர்கள்':['saints-calendar','saints-alpha','saints-datewise','saints-feasts'],
    '📅 வாழ்வு':['lectionary','marriage-prep','marriage-book','lent','palm-sunday','quiz','search-tamil','search-english'],
  };
  const bySlug={};idx.forEach(p=>bySlug[p.slug]=p);
  let html=`<button class="list-item" data-go="prayers"><span class="n">🙏</span><span>அனைத்து ஜெபங்களும்</span><span class="chev">›</span></button>
  <button class="list-item" data-go="songs"><span class="n">🎵</span><span>பாடல்கள் (கேட்க)</span><span class="chev">›</span></button>`;
  for(const [g,slugs] of Object.entries(groups)){
    html+=`<div class="sec-title">${g}</div>`;
    for(const s of slugs){
      if(s==='prayers-link')continue;
      const p=bySlug[s];
      if(!p)continue;
      html+=`<button class="list-item" data-p="${s}"><span class="n">›</span><span>${esc(p.label||p.title)}</span><span class="chev">›</span></button>`;
    }
  }
  html+=`<div class="credit">மூலம்: bibleintamil.com<br>தொகுப்பு: Fr. Mariadas Lipton</div>`;
  view.innerHTML=html;
  view.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  view.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>go('page?slug='+b.dataset.p));
}
async function vPage(slug){
  const d=await loadIndex('pages',slug);
  setTitle((d.label||d.title).slice(0,34),'');showBack(true,()=>go('more'));markTab('');
  const paras=d.text.split(/\n\n+/).slice(0,400).map(p=>`<p>${esc(p)}</p>`).join('');
  view.innerHTML=`<div class="article"><h2>${esc(d.label||d.title)}</h2>${paras||'<div class="empty">உள்ளடக்கம் இல்லை</div>'}</div>`;
  window.scrollTo(0,0);
}

/* ---------- router ---------- */
async function route(){
  const {route,params}=parseHash();
  try{
    if(route==='home')await vHome();
    else if(route==='bible')await vBible();
    else if(route==='books')await vBooks(params.v||prefs.version);
    else if(route==='read')await vRead(params.v||prefs.version,params.b||'genesis',params.c||1);
    else if(route==='compare')await vCompare(params);
    else if(route==='search')await vSearch(params);
    else if(route==='prayers')await vPrayers();
    else if(route==='prayer')await vPrayer(params.slug);
    else if(route==='songs')await vSongs();
    else if(route==='album')await vAlbum(params.slug);
    else if(route==='more')await vMore();
    else if(route==='page')await vPage(params.slug);
    else await vHome();
  }catch(e){view.innerHTML='<div class="empty">ஏற்ற முடியவில்லை. மீண்டும் முயல்க.</div>';console.error(e);}
  const {frag}=parseHash();
  if(route==='read'&&frag){setTimeout(()=>{const el=document.getElementById(frag);if(el){el.scrollIntoView({block:'center'});el.classList.add('hl');}},300);}
  else window.scrollTo(0,0);
}

/* font size */
function applyFs(){document.documentElement.style.setProperty('--fs',prefs.fs+'px');$$('.font-row button').forEach(b=>b.classList.toggle('on',+b.dataset.fs===prefs.fs));}
$('#fontBtn').onclick=()=>$('#fontSheet').classList.remove('hidden');
$('#fontSheet').onclick=e=>{if(e.target.id==='fontSheet')$('#fontSheet').classList.add('hidden');};
$$('.font-row button').forEach(b=>b.onclick=()=>{prefs.fs=+b.dataset.fs;store.set('fs',prefs.fs);applyFs();$('#fontSheet').classList.add('hidden');});
$$('#tabbar .tab').forEach(b=>b.onclick=()=>go(b.dataset.route));

applyFs();
window.addEventListener('hashchange',route);
route();
})();
