import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export const randomToken=()=>randomBytes(32).toString('base64url');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(value){if(typeof value!=='string'||value.length<12||value.length>128)throw Error('密码须为12到128个字符');const salt=randomBytes(16).toString('hex');const hash=await scrypt(value,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});return `scrypt-v1$${salt}$${hash.toString('hex')}`;}
export async function verifyPassword(value,stored){if(typeof value!=='string'||value.length>128)return false;const [scheme,salt,hash]=String(stored).split('$');if(scheme!=='scrypt-v1'||!salt||!hash)return false;const actual=await scrypt(value,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
