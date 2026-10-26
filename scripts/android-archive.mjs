// ZIP headers store paths as UTF-8 forward-slash names regardless of build OS.
// Rewrite only filename bytes; compressed data, CRCs and offsets are unchanged.
export function zipEntries(input){
 const b=Buffer.from(input);let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(b.readUInt32LE(i)===0x06054b50&&i+22+b.readUInt16LE(i+20)===b.length){end=i;break;}
 if(end<0)throw Error('ZIP end record not found');
 const count=b.readUInt16LE(end+10);let p=b.readUInt32LE(end+16);const result=[];
 for(let i=0;i<count;i++){
  if(p+46>b.length||b.readUInt32LE(p)!==0x02014b50)throw Error('Invalid ZIP directory');
  const n=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30),comment=b.readUInt16LE(p+32),local=b.readUInt32LE(p+42);
  if(local+30>b.length||b.readUInt32LE(local)!==0x04034b50)throw Error('Invalid ZIP local header');
  result.push({name:b.subarray(p+46,p+46+n).toString('utf8'),centralNameOffset:p+46,nameLength:n,localNameOffset:local+30,localNameLength:b.readUInt16LE(local+26)});
  p+=46+n+extra+comment;
 }
 return result;
}
export function normalizeZipPaths(input){const b=Buffer.from(input);for(const e of zipEntries(b)){for(const [offset,length] of [[e.centralNameOffset,e.nameLength],[e.localNameOffset,e.localNameLength]])for(let i=offset;i<offset+length;i++)if(b[i]===92)b[i]=47;}return b;}
export function assertAndroidAssets(input,required=[]){const names=zipEntries(input).map(x=>x.name);if(names.some(n=>n.includes('\\')))throw Error('Android APK contains Windows-style ZIP paths');for(const path of ['assets/www/local.html',...required])if(!names.includes(path))throw Error('Android asset missing: '+path);return names;}
