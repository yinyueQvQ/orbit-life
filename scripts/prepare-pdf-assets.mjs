import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('node_modules/pdfjs-dist'),out=path.resolve('public/pdf-assets');
fs.mkdirSync(out,{recursive:true});
fs.copyFileSync(path.join(base,'legacy/build/pdf.worker.min.mjs'),path.join(out,'pdf.worker.min.mjs'));
for(const name of ['cmaps','standard_fonts','wasm'])if(fs.existsSync(path.join(base,name)))fs.cpSync(path.join(base,name),path.join(out,name),{recursive:true});
fs.copyFileSync(path.join(base,'LICENSE'),path.join(out,'LICENSE.txt'));
