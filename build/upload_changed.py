#!/usr/bin/env python3
"""Upload changed chunks to Vercel. Usage: upload_changed.py <batch> <nbatches>"""
import os, sys, json, base64, hashlib, subprocess

ROOT = '/home/hatch/workspace/bible-app'
CHUNKS = os.path.join(ROOT, 'chunks')
manifest = json.load(open(os.path.join(CHUNKS, 'manifest.json')))

def cname_of(vp):
    if '.gz.' in vp:
        rel, nnn = vp.rsplit('.gz.', 1)
        return rel.replace('/', '__') + f'.p{int(nnn):03d}'
    return vp.replace('/', '__') + '.p000'

def main():
    batch, nbatches = int(sys.argv[1]), int(sys.argv[2])
    changed_vp = json.load(open('/tmp/changed_vps.json'))
    mine = [vp for i, vp in enumerate(changed_vp) if i % nbatches == batch]
    print(f'batch {batch}: {len(mine)} files', flush=True)
    refs = []
    for vp in mine:
        p = os.path.join(CHUNKS, cname_of(vp))
        with open(p, 'rb') as fh:
            raw = fh.read()
        sha = hashlib.sha1(raw).hexdigest()
        args = {"contentLength": len(raw), "xNowDigest": sha, "xNowSize": len(raw),
                "requestBody": base64.b64encode(raw).decode()}
        proc = subprocess.run(['/opt/hatch/bin/vercel', 'call-tool', '--name', 'upload_file',
                               '--arguments-json', json.dumps(args)],
                              capture_output=True, timeout=120)
        try:
            res = json.loads(proc.stdout.decode())
            txt = res['result']['content'][0]['text']
            if 'cloudfront.net' in txt or '"urls"' in txt or '"result": {}' in txt:
                refs.append({'file': vp, 'sha': sha, 'size': len(raw)})
                print('ok', vp, flush=True)
            else:
                print('FAIL', vp, txt[:100], flush=True)
        except Exception as e:
            print('ERR', vp, str(e)[:80], flush=True)
    json.dump(refs, open(f'/tmp/new_refs_{batch}.json', 'w'))
    print(f'batch {batch} done: {len(refs)}/{len(mine)}', flush=True)

main()
