const encoder=new TextEncoder();
export const randomHex=(bytes=24)=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=s=>new Uint8Array(s.match(/.{2}/g).map(x=>parseInt(x,16)));
export async function hashCredential(value,salt=randomHex(16)){
 const key=await crypto.subtle.importKey('raw',encoder.encode(value),'PBKDF2',false,['deriveBits']);
 const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromHex(salt),iterations:100000},key,256);
 return `pbkdf2:100000:${salt}:${Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}`;
}
export async function verifyCredential(value,hash){
 if(typeof value!=='string'||value.length>200||typeof hash!=='string'||!/^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash))return false;
 const result=await hashCredential(value,hash.split(':')[2]);let diff=0;for(let i=0;i<result.length;i++)diff|=result.charCodeAt(i)^hash.charCodeAt(i);return diff===0;
}
export const normalizeName=value=>typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' '):'';
export function validName(value){const name=normalizeName(value);return name.length>=2&&name.length<=80&&/^[\p{L}\p{M}\p{N} .’'\-]+$/u.test(name)?name:null;}
export function studentCode(){const loginId=randomHex(6).toUpperCase();return {loginId,code:`E12-${loginId}-${randomHex(12).toUpperCase()}`};}
export function parseCode(value){if(typeof value!=='string')return null;const code=value.trim().toUpperCase(),match=/^E12-([A-F0-9]{12})-[A-F0-9]{24}$/.exec(code);return match?{code,loginId:match[1]}:null;}
export const safeUser=row=>({id:row.id,role:row.role,name:row.name,accountLabel:row.role==='teacher'?'english12.teacher':row.login_id,requiresPasswordChange:row.must_change===1});
