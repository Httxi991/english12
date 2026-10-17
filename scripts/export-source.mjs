import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]||resolve(root,'../english12-source.zip'));
execFileSync('python3',['-c',String.raw`
import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]); dest=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        rel=path.relative_to(root)
        if not path.is_file() or any(part in {'.git','node_modules','.sites','.sites-runtime','.wrangler','.vinext','dist','public','coverage'} for part in rel.parts): continue
        if (path.name.startswith('.env') and path.name != '.env.example') or path.suffix in {'.zip','.tar','.tgz'}: continue
        if '.openai' in rel.parts: continue
        archive.write(path,pathlib.Path('english12')/rel)
print(str(dest))
`,root,destination],{stdio:'inherit'});
