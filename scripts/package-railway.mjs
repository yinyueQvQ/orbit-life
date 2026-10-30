// Package the verified Android web assets once, alongside the matching Node server.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import pinned from '../deploy/android-release.json' with {type:'json'};
const target=path.resolve(process.argv[2]||'work/railway-package');
if(fs.existsSync(target))throw Error('Choose a new empty package directory');
const apk=fs.readFileSync('release/Orbit-Life-Android.apk');
if(apk.length!==pinned.size||createHash('sha256').update(apk).digest('hex')!==pinned.sha256)throw Error('APK does not match pinned release');
fs.mkdirSync(target,{recursive:true});
for(const folder of ['server','shared','deploy'])fs.cpSync(folder,path.join(target,folder),{recursive:true});
fs.writeFileSync(path.join(target,'deploy/Orbit-Life-Android.apk'),apk);
// Confirm the APK contains a launch document before producing the deployment.
if(!apk.includes(Buffer.from('assets/www/local.html')))throw Error('Missing web entry');
const extractor=`import fs from 'node:fs';import path from 'node:path';import {inflateRawSync} from 'node:zlib';
const apk=fs.readFileSync('deploy/Orbit-Life-Android.apk');let count=0;
for(let p=0;p+46<apk.length;p++){if(apk.readUInt32LE(p)!==0x02014b50)continue;const method=apk.readUInt16LE(p+10),size=apk.readUInt32LE(p+20),n=apk.readUInt16LE(p+28),extra=apk.readUInt16LE(p+30),comment=apk.readUInt16LE(p+32),offset=apk.readUInt32LE(p+42),name=apk.subarray(p+46,p+46+n).toString();if(name.startsWith('assets/www/')&&!name.endsWith('/')){const relative=name.slice(11),file=path.resolve('dist-local',relative);if(!file.startsWith(path.resolve('dist-local')+path.sep))throw Error('Invalid asset path');const start=offset+30+apk.readUInt16LE(offset+26)+apk.readUInt16LE(offset+28),data=apk.subarray(start,start+size);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,method===0?data:method===8?inflateRawSync(data):(()=>{throw Error('Unsupported ZIP compression')})());count++}p+=45+n+extra+comment;}if(!fs.existsSync('dist-local/local.html'))throw Error('Missing extracted launch document');console.log('Verified web assets extracted: '+count);
`;
fs.writeFileSync(path.join(target,'extract.mjs'),extractor);
fs.writeFileSync(path.join(target,'Dockerfile'),`FROM node:24-bookworm-slim\nWORKDIR /app\nENV NODE_ENV=production ORBIT_DATA_DIR=/data PORT=8080\nCOPY . .\nRUN node extract.mjs\nEXPOSE 8080\nCMD ["node","deploy/server.mjs"]\n`);
fs.copyFileSync('railway.json',path.join(target,'railway.json'));
console.log('Railway package: '+target);
