import {mkdir,cp,rm} from 'node:fs/promises';
await mkdir('public',{recursive:true});
await cp('web','public',{recursive:true});
await rm('public/index.html',{force:true});
