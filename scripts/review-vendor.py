import urllib.request, json, re, io, tarfile, hashlib, base64
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
lock=urllib.request.urlopen('https://raw.githubusercontent.com/vasturiano/globe.gl/v2.46.2/yarn.lock').read().decode()
blocks={}
for block in lock.split('\n\n'):
 lines=block.splitlines()
 if not lines or lines[0].startswith('#'):continue
 version=re.search(r'^  version "([^"]+)"',block,re.M)
 if not version:continue
 deps={}
 in_deps=False
 for line in lines[1:]:
  if line=='  dependencies:': in_deps=True
  elif in_deps:
   m=re.match(r'^    "?([^" ]+)"? "([^"]+)"$',line)
   if m:deps[m[1]]=m[2]
   elif line and not line.startswith('    '):in_deps=False
 item={'version':version[1],'dependencies':deps}
 for key in lines[0][:-1].split(', '):blocks[key.strip('"')]=item
root=json.load(urllib.request.urlopen('https://registry.npmjs.org/globe.gl/2.46.2'))
packages={('globe.gl','2.46.2')}
def walk(deps):
 for name,spec in deps.items():
  record=blocks[name+'@'+spec]; key=(name,record['version'])
  if key in packages:continue
  packages.add(key);walk(record['dependencies'])
walk(root['dependencies'])
def fetch(key):
 name,version=key
 metadata=json.load(urllib.request.urlopen('https://registry.npmjs.org/'+name+'/'+version))
 archive=urllib.request.urlopen(metadata['dist']['tarball']).read()
 integrity=metadata['dist'].get('integrity','')
 if integrity.startswith('sha512-'):assert base64.b64encode(hashlib.sha512(archive).digest()).decode()==integrity[7:]
 found=[]
 with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
  for member in tar.getmembers():
   if member.isfile() and re.match(r'^(license|licence|copying|notice)(\.|$|-)',Path(member.name).name,re.I):
    found.append((member.name,tar.extractfile(member).read().decode('utf-8',errors='replace').replace('\r\n','\n').replace('\r','\n')))
 if not found:raise Exception('Missing license '+name)
 entry={'name':name,'version':version,'license':metadata.get('license'),'tarball':metadata['dist']['tarball'],'integrity':integrity}
 return entry,'\n\n'.join([f'===== {name}@{version} / {path} =====\n{text}' for path,text in found])
with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(fetch,sorted(packages)))
Path('vendor/THIRD-PARTY-NOTICES.txt').write_text('Licenses for Globe.gl 2.46.2 and its runtime dependency tree.\nVersions resolved from the upstream v2.46.2 yarn.lock; notices retained from npm archives.\n\n'+'\n\n'.join(x[1] for x in results),encoding='utf-8',newline='\n')
Path('vendor/runtime-dependencies.json').write_text(json.dumps([x[0] for x in results],indent=2)+'\n',encoding='utf-8')
print('Collected licenses for',len(results),'runtime packages')
# Advisory lookup is scoped to the pinned upstream runtime tree.
body={'queries':[{'package':{'name':x[0]['name'],'ecosystem':'npm'},'version':x[0]['version']} for x in results]}
request=urllib.request.Request('https://api.osv.dev/v1/querybatch',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
response=json.load(urllib.request.urlopen(request))
print('OSV findings',[(results[i][0]['name'],v) for i,v in enumerate(response['results']) if v])
Path('docs/dependency-advisory-results.json').write_text(json.dumps({'reviewDate':datetime.now(timezone.utc).date().isoformat(),'source':'https://api.osv.dev/v1/querybatch','packages':[x[0]['name']+'@'+x[0]['version'] for x in results],'results':response['results']},indent=2)+'\n',encoding='utf-8')
