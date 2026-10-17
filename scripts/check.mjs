import {readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
for(const dir of ['web','server'])for(const f of readdirSync(dir))if(f.endsWith('.js')||f.endsWith('.mjs'))execFileSync(process.execPath,['--check',dir+'/'+f],{stdio:'inherit'});
