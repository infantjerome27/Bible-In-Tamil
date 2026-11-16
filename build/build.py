#!/usr/bin/env python3
"""Full build pipeline: app/ -> deploy/ (bundled+patched) -> chunks/ ."""
import json, os, shutil, gzip, hashlib

ROOT = '/home/hatch/workspace/bible-app'
SRC = os.path.join(ROOT, 'app')
DST = os.path.join(ROOT, 'deploy')
CHD = os.path.join(ROOT, 'chunks')
CHUNK = 90 * 1024

LOADER_PATCH_OLD = """async function loadMeta(){if(!META){const r=await fetch('data/meta.json');META=await r.json();}return META;}
async function loadBook(v,b){const k=v+'/'+b;if(!bookCache[k]){const r=await fetch(`data/${v}/${b}.json`);bookCache[k]=await r.json();}return bookCache[k];}
async function loadIndex(kind,slug){const r=await fetch(`data/${kind}/${slug}.json`);return r.json();}"""

LOADER_PATCH_NEW = """let MANIFEST=null;
async function fetchBytes(url){const r=await fetch(url);if(!r.ok)throw new Error('fetch '+url);return new Uint8Array(await r.arrayBuffer());}
async function loadLogical(logical,asJson){
  if(!MANIFEST){const r=await fetch('manifest.json');MANIFEST=await r.json();}
  const m=MANIFEST[logical];
  let bytes;
  if(m.enc==='raw'){
    bytes=await fetchBytes(logical);
  }else{
    const ps=[];for(let i=0;i<m.parts;i++)ps.push(fetchBytes(logical+'.gz.'+String(i).padStart(3,'0')));
    const parts=await Promise.all(ps);
    let total=0;for(const p of parts)total+=p.length;
    const cat=new Uint8Array(total);let o=0;
    for(const p of parts){cat.set(p,o);o+=p.length;}
    const ds=new DecompressionStream('gzip');
    bytes=new Uint8Array(await new Response(new Blob([cat]).stream().pipeThrough(ds)).arrayBuffer());
  }
  const text=new TextDecoder().decode(bytes);
  return asJson?JSON.parse(text):text;
}
async function loadMeta(){if(!META)META=await loadLogical('data/meta.json',true);return META;}
async function loadBook(v,b){const k='bible:'+v;if(!bookCache[k])bookCache[k]=await loadLogical(`data/bibles/${v}.json`,true);return bookCache[k][b];}
async function loadIndex(kind,slug){
  if(!blobCache[kind])blobCache[kind]=await loadLogical(`data/${kind}.json`,true);
  const blob=blobCache[kind];
  return slug==='_index'?blob._index:blob[slug];
}"""

def dump(obj, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))

# ---- 1. bundle ----
shutil.rmtree(DST, ignore_errors=True)
os.makedirs(os.path.join(DST, 'data', 'bibles'), exist_ok=True)
os.makedirs(os.path.join(DST, 'data', 'search'), exist_ok=True)
os.makedirs(os.path.join(DST, 'css'), exist_ok=True)
os.makedirs(os.path.join(DST, 'js'), exist_ok=True)
DATA = os.path.join(SRC, 'data')
shutil.copy(os.path.join(SRC, 'index.html'), DST)
shutil.copy(os.path.join(SRC, 'css', 'app.css'), os.path.join(DST, 'css'))
shutil.copy(os.path.join(SRC, 'js', 'app.js'), os.path.join(DST, 'js'))
shutil.copy(os.path.join(DATA, 'meta.json'), os.path.join(DST, 'data', 'meta.json'))

for v in ['ecu', 'kjt', 'rct', 'nae', 'kje', 'nrsv']:
    bundle = {}
    vd = os.path.join(DATA, v)
    for fn in sorted(os.listdir(vd)):
        if fn.startswith('_') or not fn.endswith('.json'):
            continue
        b = json.load(open(os.path.join(vd, fn), encoding='utf-8'))
        entry = {'name': b['name'], 'chapters': b['chapters']}
        if 'intro' in b:
            entry['intro'] = b['intro']
        bundle[b['book']] = entry
    dump(bundle, os.path.join(DST, 'data', 'bibles', v + '.json'))

for v in ['ecu', 'kjt', 'rct']:
    shutil.copy(os.path.join(DATA, 'search', v + '.json'), os.path.join(DST, 'data', 'search', v + '.json'))

for kind in ['prayers', 'pages', 'songs']:
    kd = os.path.join(DATA, kind)
    idx = json.load(open(os.path.join(kd, '_index.json'), encoding='utf-8'))
    blob = {'_index': idx}
    for e in idx:
        blob[e['slug']] = json.load(open(os.path.join(kd, e['slug'] + '.json'), encoding='utf-8'))
    dump(blob, os.path.join(DST, 'data', kind + '.json'))

# ---- 2. patch loader into deploy app.js ----
ajsp = os.path.join(DST, 'js', 'app.js')
src = open(ajsp, encoding='utf-8').read()
assert LOADER_PATCH_OLD in src, 'loader pattern not found in app.js!'
src = src.replace(LOADER_PATCH_OLD, LOADER_PATCH_NEW)
src = src.replace('let META=null, bookCache={}, searchIdx={};',
                  'let META=null, bookCache={}, searchIdx={}, blobCache={};')
SEARCH_OLD = "if(!searchIdx[v]){const r=await fetch(`data/search/${v}.json`);searchIdx[v]=await r.json();}"
SEARCH_NEW = "if(!searchIdx[v])searchIdx[v]=await loadLogical(`data/search/${v}.json`,true);"
assert SEARCH_OLD in src, 'search pattern not found in app.js!'
src = src.replace(SEARCH_OLD, SEARCH_NEW)
VN_OLD = '<div class="verse-card result" data-bi="${bi}" data-ch="${ch}">'
VN_NEW = '<div class="verse-card result" data-bi="${bi}" data-ch="${ch}" data-vn="${vn}">'
assert VN_OLD in src, 'verse-card pattern not found in app.js!'
src = src.replace(VN_OLD, VN_NEW)
open(ajsp, 'w', encoding='utf-8').write(src)
print('loader patched')

# ---- 3. chunk ----
shutil.rmtree(CHD, ignore_errors=True)
os.makedirs(CHD, exist_ok=True)
manifest = {}
for root, _, files in os.walk(DST):
    for fn in sorted(files):
        srcp = os.path.join(root, fn)
        rel = os.path.relpath(srcp, DST)
        with open(srcp, 'rb') as f:
            raw = f.read()
        if len(raw) < CHUNK and rel.rsplit('.', 1)[-1] in ('html', 'css', 'js'):
            blob, enc = raw, 'raw'
        else:
            blob, enc = gzip.compress(raw, compresslevel=9), 'gz'
        parts = [blob[i:i+CHUNK] for i in range(0, len(blob), CHUNK)]
        manifest[rel] = {'enc': enc, 'parts': len(parts), 'size': len(raw)}
        for i, part in enumerate(parts):
            with open(os.path.join(CHD, rel.replace('/', '__') + f'.p{i:03d}'), 'wb') as f:
                f.write(part)
json.dump(manifest, open(os.path.join(CHD, 'manifest.json'), 'w'))
shutil.copy(os.path.join(CHD, 'manifest.json'), os.path.join(CHD, 'manifest.json.p000'))
nchunks = len([f for f in os.listdir(CHD) if f != 'manifest.json'])
print(f'bundled {len(manifest)} files -> {nchunks} chunks')

# ---- 4. report changed chunks vs all_refs.json ----
def vpath(cname):
    rel = cname.rsplit('.p', 1)[0].replace('__', '/')
    nnn = cname.rsplit('.p', 1)[1]
    m = manifest.get(rel)
    return f'{rel}.gz.{nnn}' if (m and m['enc'] == 'gz') else rel

old_refs = {}
arp = os.path.join(ROOT, 'all_refs.json')
if os.path.exists(arp):
    old_refs = {r['file']: r['sha'] for r in json.load(open(arp))}
changed, current = [], set()
for cname in sorted(os.listdir(CHD)):
    if cname == 'manifest.json':
        continue
    sha = hashlib.sha1(open(os.path.join(CHD, cname), 'rb').read()).hexdigest()
    vp = vpath(cname)
    current.add(vp)
    if old_refs.get(vp) != sha:
        changed.append(vp)
removed = [vp for vp in old_refs if vp not in current]
json.dump(changed, open('/tmp/changed_vps.json', 'w'))
json.dump(removed, open('/tmp/removed_vps.json', 'w'))
print(f'changed: {len(changed)}, removed: {len(removed)}')
for vp in changed:
    print('  ', vp)
