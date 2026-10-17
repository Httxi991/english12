import {freshState,validateState} from '../web/engine.js';
import {schoolLessonById,teacherRubric} from '../web/school-content.js';
import {COURSE_VERSION} from '../web/school-engine.js';
import {randomHex,digest,hashCredential,verifyCredential,validName,normalizeName,studentCode,parseCode,safeUser} from './security.mjs';
export const API_VERSION='2.0.0';
const origins=new Set(['https://httxi991.github.io','https://english12-learning.jauntydaisy1.chatgpt.site']);
const epoch=()=>Date.now();
const fail=(status,message,extra={})=>{throw Object.assign(new Error(message),{status,extra});};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
const first=(db,sql,...args)=>query(db,sql,...args).first();
const rows=async(db,sql,...args)=>(await query(db,sql,...args).all()).results??[];
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON data.');
 if(Number(request.headers.get('content-length'))>2000000)fail(413,'This request is too large.');
 const reader=request.body?.getReader();if(!reader)fail(400,'No request data.');const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();fail(413,'This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'The request is not valid JSON.');}
}
export function cleanProgress(input){
 let s;try{s=validateState(input);}catch{fail(400,'The saved progress format is invalid.');}
 // Teacher grades and workspaces never come from a student-controlled progress upload.
 s.school.feedback={};s.school.teacher={name:'',submission:null,marks:{}};s.school.sent=[];s.school.name='';
 const raw=JSON.stringify(s);if(new TextEncoder().encode(raw).length>1500000)fail(413,'Your saved work is too large. Export a backup and shorten unused drafts before syncing.');return {state:s,raw};
}
async function rate(db,env,request,label,max,seconds=600){
 const ip=request.headers.get('cf-connecting-ip')??request.headers.get('x-real-ip')??'unknown';
 const slot=Math.floor(epoch()/(seconds*1000)),key=await digest(`${env.ACCOUNT_RATE_SECRET}:${label}:${ip}:${slot}`);
 const result=await query(db,'INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',key,(slot+1)*seconds*1000).first();
 if(result.count>max)fail(429,'Too many attempts. Please try again in a few minutes.');
 // No raw IP addresses are stored. Expired counters and sessions are bounded.
 await db.batch([query(db,'DELETE FROM request_limits WHERE expires_at < ?',epoch()-3600000),query(db,'DELETE FROM account_sessions WHERE expires_at < ?',epoch())]);
}
async function loginSession(db,account){const token=randomHex(32),now=epoch(),expires=now+30*86400000;await db.batch([query(db,'INSERT INTO account_sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)',await digest(token),account.id,expires,now),query(db,'UPDATE accounts SET last_active=? WHERE id=?',now,account.id)]);return {token,expiresAt:expires,user:safeUser(account)};}
async function auth(db,request,role=null,allowChange=false){
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)fail(401,'Please sign in to your account.');const hash=await digest(token);
 const row=await first(db,'SELECT a.*,s.token_hash,s.expires_at FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?',hash,epoch());
 if(!row)fail(401,'Your session has expired. Sign in again; your saved work is safe.');
 if(role&&row.role!==role)fail(403,'This action is available only to the account owner with the required role.');
 if(row.must_change&&!allowChange)fail(403,'Change the temporary teacher password first.',{requiresPasswordChange:true});return row;
}
const submissionView=r=>({id:r.id,studentId:r.student_id,studentName:r.student_name,lesson:r.lesson_id,answer:r.answer,status:r.status,scores:r.scores_json?JSON.parse(r.scores_json):null,comment:r.comment,teacher:r.teacher_name,createdAt:r.created_at,updatedAt:r.updated_at,revision:r.revision});
async function inbox(db,id){return (await rows(db,'SELECT s.*,t.name AS teacher_name FROM classroom_submissions s LEFT JOIN accounts t ON t.id=s.teacher_id WHERE s.student_id=? ORDER BY s.created_at DESC LIMIT 100',id)).map(submissionView);}
function requireEnv(env){if(!env.DB||!env.ACCOUNT_RATE_SECRET||!env.TEACHER_INITIAL_HASH)fail(503,'Accounts are being configured. Please try again shortly.');}
async function route(request,env){
 const db=env.DB,url=new URL(request.url),path=url.pathname.replace(/^\/api\/v1/,'').replace(/\/$/,''),method=request.method;
 if(path==='/health'&&method==='GET'){requireEnv(env);await first(db,'SELECT 1 AS ok');return json({ok:true,version:API_VERSION,accounts:true});}
 requireEnv(env);
 if(path==='/auth/register'&&method==='POST'){
  await rate(db,env,request,'register',90,900);const b=await body(request),name=validName(b.name);if(!name)fail(400,'Enter your name (2–80 letters, spaces or name punctuation).');
  const credential=studentCode(),now=epoch(),account={id:crypto.randomUUID(),role:'student',name,name_key:name.toLowerCase(),login_id:credential.loginId,credential_hash:await hashCredential(credential.code),must_change:0,created_at:now,last_active:now};
  await db.batch([query(db,'INSERT INTO accounts (id,role,name,name_key,login_id,credential_hash,must_change,created_at,last_active) VALUES (?,?,?,?,?,?,?,?,?)',account.id,account.role,account.name,account.name_key,account.login_id,account.credential_hash,0,now,now),query(db,'INSERT INTO account_progress (account_id,state_json,revision,updated_at) VALUES (?,?,0,?)',account.id,JSON.stringify(freshState()),now)]);
  return json({...await loginSession(db,account),loginCode:credential.code},201);
 }
 if(path==='/auth/student/login'&&method==='POST'){
  await rate(db,env,request,'student-login',90,600);const b=await body(request),parsed=parseCode(b.code),name=normalizeName(b.name).toLowerCase();
  const row=parsed?await first(db,"SELECT * FROM accounts WHERE login_id=? AND role='student'",parsed.loginId):null;
  if(!row||row.name_key!==name||!await verifyCredential(parsed.code,row.credential_hash))fail(401,'The name or login code is incorrect. Check both, or ask your teacher for a new code.');return json(await loginSession(db,row));
 }
 if(path==='/auth/teacher/login'&&method==='POST'){
  await rate(db,env,request,'teacher-login',20,900);const b=await body(request);if(b.username!=='english12.teacher'||typeof b.password!=='string')fail(401,'The teacher account or password is incorrect.');
  let row=await first(db,"SELECT * FROM accounts WHERE login_id='TEACHER' AND role='teacher'");
  if(!await verifyCredential(b.password,row?.credential_hash??env.TEACHER_INITIAL_HASH))fail(401,'The teacher account or password is incorrect.');
  if(!row){const now=epoch();await query(db,'INSERT OR IGNORE INTO accounts (id,role,name,name_key,login_id,credential_hash,must_change,created_at,last_active) VALUES (?,?,?,?,?,?,1,?,?)',crypto.randomUUID(),'teacher','English12 teacher','english12 teacher','TEACHER',env.TEACHER_INITIAL_HASH,now,now).run();row=await first(db,"SELECT * FROM accounts WHERE login_id='TEACHER'");}
  return json(await loginSession(db,row));
 }
 if(path==='/auth/me'&&method==='GET'){const user=await auth(db,request,null,true);return json({user:safeUser(user),expiresAt:user.expires_at});}
 if(path==='/auth/logout'&&method==='POST'){const user=await auth(db,request,null,true);await query(db,'DELETE FROM account_sessions WHERE token_hash=?',user.token_hash).run();return json({ok:true});}
 if(path==='/auth/password'&&method==='POST'){
  const user=await auth(db,request,'teacher',true);await rate(db,env,request,'teacher-password',15,900);const b=await body(request);
  if(typeof b.newPassword!=='string'||b.newPassword.length<16||b.newPassword.length>128||b.newPassword===b.currentPassword)fail(400,'Choose a different password of 16–128 characters.');
  if(!await verifyCredential(b.currentPassword,user.credential_hash))fail(401,'The current password is incorrect.');const hash=await hashCredential(b.newPassword);
  const changed=await query(db,'UPDATE accounts SET credential_hash=?,must_change=0 WHERE id=? AND credential_hash=?',hash,user.id,user.credential_hash).run();if(changed.meta.changes!==1)fail(409,'The password was changed in another session. Sign in again.');
  await query(db,'DELETE FROM account_sessions WHERE account_id=?',user.id).run();return json(await loginSession(db,{...user,credential_hash:hash,must_change:0}));
 }
 if(path==='/student/progress'&&method==='GET'){
  const user=await auth(db,request,'student'),row=await first(db,'SELECT * FROM account_progress WHERE account_id=?',user.id);return json({state:JSON.parse(row.state_json),revision:row.revision,updatedAt:row.updated_at});
 }
 if(path==='/student/progress'&&method==='PUT'){
  const user=await auth(db,request,'student'),b=await body(request);if(!Number.isInteger(b.revision)||b.revision<0)fail(400,'The progress revision is missing.');const clean=cleanProgress(b.state),now=epoch();
  const result=await query(db,'UPDATE account_progress SET state_json=?,revision=revision+1,updated_at=? WHERE account_id=? AND revision=?',clean.raw,now,user.id,b.revision).run();
  if(result.meta.changes!==1){const current=await first(db,'SELECT revision,state_json,updated_at FROM account_progress WHERE account_id=?',user.id);fail(409,'Another device has newer saved work. Choose which version to continue with.',{state:JSON.parse(current.state_json),revision:current.revision,updatedAt:current.updated_at});}
  await query(db,'UPDATE accounts SET last_active=? WHERE id=?',now,user.id).run();return json({revision:b.revision+1,updatedAt:now});
 }
 if(path==='/student/inbox'&&method==='GET'){const user=await auth(db,request,'student');return json({submissions:await inbox(db,user.id)});}
 if(path==='/student/submissions'&&method==='POST'){
  const user=await auth(db,request,'student'),b=await body(request);if(!schoolLessonById[b.lesson]||typeof b.requestId!=='string'||!/^[-a-f0-9]{36}$/i.test(b.requestId))fail(400,'Choose a valid classroom response.');
  const duplicate=await first(db,'SELECT * FROM classroom_submissions WHERE id=?',b.requestId);if(duplicate){if(duplicate.student_id!==user.id)fail(409,'Please retry with a new submission ID.');return json({submission:submissionView(duplicate)});}
  const p=await first(db,'SELECT * FROM account_progress WHERE account_id=?',user.id),state=JSON.parse(p.state_json);
  if(b.progressRevision!==p.revision)fail(409,'Save the latest progress before sending this answer.');
  if(!state.school.completed.includes(b.lesson))fail(400,'Complete the lesson quiz first.');const answer=state.school.drafts[b.lesson];if(!answer?.trim())fail(400,'Write your response before sending it.');
  const same=await first(db,'SELECT * FROM classroom_submissions WHERE student_id=? AND lesson_id=? ORDER BY created_at DESC LIMIT 1',user.id,b.lesson);if(same&&same.answer===answer)return json({submission:submissionView(same),unchanged:true});
  const now=epoch();await query(db,'INSERT INTO classroom_submissions (id,student_id,lesson_id,course_version,answer,status,created_at,updated_at,revision) VALUES (?,?,?,?,?,\'pending\',?,?,0)',b.requestId,user.id,b.lesson,COURSE_VERSION,answer,now,now).run();return json({submission:submissionView(await first(db,'SELECT * FROM classroom_submissions WHERE id=?',b.requestId))},201);
 }
 if(path==='/teacher/students'&&method==='GET'){
  await auth(db,request,'teacher');const offset=Math.max(0,Math.min(10000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
  const students=await rows(db,"SELECT a.id,a.name,a.login_id,a.created_at,a.last_active,p.state_json,(SELECT count(*) FROM classroom_submissions s WHERE s.student_id=a.id AND s.status='pending') AS pending FROM accounts a LEFT JOIN account_progress p ON p.account_id=a.id WHERE a.role='student' ORDER BY a.created_at DESC,a.id LIMIT 100 OFFSET ?",offset);
  const total=(await first(db,"SELECT count(*) AS n FROM accounts WHERE role='student'")).n;
  return json({students:students.map(r=>{const s=JSON.parse(r.state_json??'{}');return {id:r.id,name:r.name,accountLabel:r.login_id,createdAt:r.created_at,lastActive:r.last_active,pending:r.pending,foundationCompleted:s.completed?.length??0,classroomCompleted:s.school?.completed?.length??0,quizAttempts:s.school?.history?.length??0};}),total,nextOffset:offset+students.length<total?offset+students.length:null});
 }
 const detail=path.match(/^\/teacher\/students\/([-a-f0-9]{36})$/i);
 if(detail&&method==='GET'){
  await auth(db,request,'teacher');const student=await first(db,"SELECT * FROM accounts WHERE id=? AND role='student'",detail[1]);if(!student)fail(404,'Student not found.');const p=await first(db,'SELECT * FROM account_progress WHERE account_id=?',student.id);return json({student:safeUser(student),progress:JSON.parse(p.state_json),updatedAt:p.updated_at,submissions:await inbox(db,student.id)});
 }
 const reset=path.match(/^\/teacher\/students\/([-a-f0-9]{36})\/reset-code$/i);
 if(reset&&method==='POST'){
  await auth(db,request,'teacher');const student=await first(db,"SELECT * FROM accounts WHERE id=? AND role='student'",reset[1]);if(!student)fail(404,'Student not found.');const secret=studentCode(),code=`E12-${student.login_id}-${secret.code.split('-').at(-1)}`,hash=await hashCredential(code);
  await db.batch([query(db,'UPDATE accounts SET credential_hash=? WHERE id=?',hash,student.id),query(db,'DELETE FROM account_sessions WHERE account_id=?',student.id)]);return json({name:student.name,loginCode:code});
 }
 const mark=path.match(/^\/teacher\/submissions\/([-a-f0-9]{36})$/i);
 if(mark&&method==='PUT'){
  const teacher=await auth(db,request,'teacher'),b=await body(request);
  if(!Array.isArray(b.scores)||b.scores.length!==teacherRubric.length||!b.scores.every(x=>Number.isInteger(x)&&x>=0&&x<=2)||typeof b.comment!=='string'||!b.comment.trim()||b.comment.length>4000||!Number.isInteger(b.revision))fail(400,'Choose four scores (0–2) and add a helpful comment.');
  const existing=await first(db,'SELECT * FROM classroom_submissions WHERE id=?',mark[1]);if(!existing)fail(404,'Response not found.');
  const result=await query(db,"UPDATE classroom_submissions SET scores_json=?,comment=?,teacher_id=?,status='graded',updated_at=?,revision=revision+1 WHERE id=? AND revision=?",JSON.stringify(b.scores),b.comment.trim(),teacher.id,epoch(),mark[1],b.revision).run();
  if(result.meta.changes!==1)fail(409,'This response was updated elsewhere. Refresh it before marking again.');return json({ok:true});
 }
 fail(404,'This account service route does not exist.');
}
export async function handleAccountRequest(request,env){
 const origin=request.headers.get('origin'),url=new URL(request.url);const local=['localhost','127.0.0.1'].includes(url.hostname);
 const allowed=!origin||origins.has(origin)||(local&&origin===url.origin);
 if(!allowed)return json({error:'This origin is not allowed.'},403);
 let response;
 if(request.method==='OPTIONS')response=new Response(null,{status:204});
 else try{response=await route(request,env);}catch(error){const status=Number.isInteger(error.status)?error.status:500;if(status===500)console.error('Account request failed',error?.name??'Error');response=json({error:status===500?'The service could not save this request. Please retry; your local work is kept.':error.message,...(error.extra??{})},status);}
 response.headers.set('vary','Origin');if(origin)response.headers.set('access-control-allow-origin',origin);
 response.headers.set('access-control-allow-methods','GET,POST,PUT,OPTIONS');response.headers.set('access-control-allow-headers','Authorization,Content-Type');response.headers.set('access-control-max-age','600');return response;
}
