import {schoolLessons,schoolLessonById,schoolQuestionById,teacherRubric} from './school-content.js';
export const COURSE_VERSION='2026-10-v1';
const text=(v,max=12000)=>typeof v==='string'?v.slice(0,max):'';
const object=()=>Object.create(null);
const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stamp=()=>new Date().toISOString();
const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export const schoolCorrect=(q,a)=>q.type==='mc'?Number.isInteger(a)&&a===q.answer:q.answers.some(v=>String(a??'').normalize('NFKC').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ')===v.toLowerCase());
export const schoolSolution=q=>q.type==='mc'?q.options[q.answer]:q.answers[0];
export const schoolAnswerText=(q,a)=>q.type==='mc'?(q.options[a]??'No answer'):String(a??'No answer');
const validAnswer=(q,a)=>q.type==='mc'?Number.isInteger(a)&&a>=0&&a<q.options.length:typeof a==='string'&&a.trim().length>0&&a.length<=500;
export const freshSchool=()=>({read:object(),sessions:object(),history:[],drafts:object(),earned:[],completed:[],name:'',lastLesson:null,sent:[],feedback:object(),teacher:{name:'',submission:null,marks:object()}});
export const schoolXP=s=>(s?.earned.length??0)*10+(s?.completed.length??0)*20;
export const studied=(s,id)=>(s.read[id]??0)>=schoolLessonById[id]?.sections.length;
export const practiceDone=(s,id)=>s.sessions[`${id}:practice`]?.finished===true||s.completed.includes(id);
export const schoolScore=session=>session.ids.filter(id=>schoolCorrect(schoolQuestionById[id],session.answers[id]?.value)).length;
export function readSection(s,id,index){const l=schoolLessonById[id];if(!l||index!==(s.read[id]??0)||index>=l.sections.length)return false;s.read[id]=index+1;s.lastLesson=id;return true;}
export function schoolSession(s,id,phase='practice',reset=false,review=false){
 const l=schoolLessonById[id];if(!l||!['practice','quiz'].includes(phase)||!studied(s,id)||(phase==='quiz'&&!practiceDone(s,id)))return null;
 const key=`${id}:${phase}`,old=s.sessions[key];if(old&&!reset)return old;
 let ids=l.questions.filter(q=>q.phase===phase).map(q=>q.id);
 if(review){if(!old?.finished)return null;ids=old.ids.filter(qid=>!schoolCorrect(schoolQuestionById[qid],old.answers[qid]?.value));if(!ids.length)return null;}
 s.sessions[key]={id:uid(),lesson:id,phase,review,ids,index:0,answers:object(),finished:false};s.lastLesson=id;return s.sessions[key];
}
export function checkSchoolAnswer(s,session,value){
 if(!session||session.finished)return null;const q=schoolQuestionById[session.ids[session.index]];
 if(session.answers[q.id]?.checked||!validAnswer(q,value))return null;
 session.answers[q.id]={value,checked:true};const correct=schoolCorrect(q,value);if(correct&&!s.earned.includes(q.id))s.earned.push(q.id);return correct;
}
export function nextSchoolQuestion(s,session){
 if(!session||session.finished||!session.answers[session.ids[session.index]]?.checked)return false;
 if(session.index<session.ids.length-1){session.index++;return true;}
 session.finished=true;
 if(session.phase==='quiz'){
  s.history.push({...JSON.parse(JSON.stringify(session)),date:stamp()});s.history=s.history.slice(-60);
  if(!session.review&&!s.completed.includes(session.lesson))s.completed.push(session.lesson);
 }
 return true;
}
function cleanSession(raw,l,phase){
 if(!raw||raw.lesson!==l.id||raw.phase!==phase)return null;
 const expected=l.questions.filter(q=>q.phase===phase).map(q=>q.id);
 const ids=raw.review===true?Array.isArray(raw.ids)?[...new Set(raw.ids.filter(id=>expected.includes(id)))]:[]:expected;
 if(!ids.length)return null;const answers=object();for(const id of ids){const a=raw.answers?.[id];if(a?.checked===true&&validAnswer(schoolQuestionById[id],a.value))answers[id]={value:a.value,checked:true};}
 const first=ids.findIndex(id=>!answers[id]);
 return {id:text(raw.id,100)||uid(),lesson:l.id,phase,review:raw.review===true,ids,answers,index:first<0?ids.length-1:first,finished:raw.finished===true&&first<0};
}
export function validateSubmission(raw){
 if(!raw||raw.kind!=='english12-submission'||raw.version!==1||raw.course!==COURSE_VERSION)throw Error('Choose an English12 classroom submission file (current course version).');
 if(typeof raw.id!=='string'||!/^[-a-zA-Z0-9]{8,100}$/.test(raw.id)||!validTime(raw.created))throw Error('The submission ID or date is invalid.');
 if(typeof raw.student!=='string'||!raw.student.trim()||raw.student.length>100)throw Error('The student name is missing or too long.');
 if(!Array.isArray(raw.responses)||raw.responses.length<1||raw.responses.length>schoolLessons.length)throw Error('The response list is invalid.');
 const seen=new Set(),responses=raw.responses.map(r=>{if(!r||!schoolLessonById[r.lesson]||seen.has(r.lesson)||typeof r.answer!=='string'||!r.answer.trim()||r.answer.length>12000)throw Error('A response is missing, duplicated or too long.');seen.add(r.lesson);return {lesson:r.lesson,answer:r.answer};});
 return {kind:raw.kind,version:1,course:COURSE_VERSION,id:raw.id,created:raw.created,student:raw.student.trim(),responses};
}
export function createSubmission(s){
 if(!s.name.trim())throw Error('Enter your name or a classroom alias first.');
 const responses=schoolLessons.filter(l=>s.completed.includes(l.id)&&s.drafts[l.id]?.trim()).map(l=>({lesson:l.id,answer:s.drafts[l.id]}));
 if(!responses.length)throw Error('Complete a lesson quiz and write its teacher-marked response first.');
 const submission=validateSubmission({kind:'english12-submission',version:1,course:COURSE_VERSION,id:uid(),created:stamp(),student:s.name,responses});
 s.sent.push(submission);s.sent=s.sent.slice(-5);return submission;
}
export function openTeacherSubmission(s,raw){const submission=validateSubmission(raw);s.teacher={name:s.teacher.name,submission,marks:object()};return submission;}
const validScores=scores=>Array.isArray(scores)&&scores.length===teacherRubric.length&&scores.every(v=>Number.isInteger(v)&&v>=0&&v<=2);
export function createGrades(s){
 const t=s.teacher,sub=t.submission;if(!sub)throw Error('Open a student submission first.');if(!t.name.trim())throw Error('Enter the teacher name first.');
 const responses=sub.responses.map(r=>{const m=t.marks[r.lesson];if(!validScores(m?.scores)||!m.comment?.trim())throw Error(`Add four scores and a helpful comment for ${schoolLessonById[r.lesson].title}.`);return {...r,scores:[...m.scores],comment:m.comment.trim()};});
 return {kind:'english12-feedback',version:1,course:COURSE_VERSION,id:sub.id,created:sub.created,student:sub.student,teacher:t.name.trim(),markedAt:stamp(),responses};
}
export function acceptGrades(s,raw){
 if(!raw||raw.kind!=='english12-feedback'||raw.version!==1||raw.course!==COURSE_VERSION)throw Error('Choose a returned English12 teacher-feedback file.');
 const sub=s.sent.find(x=>x.id===raw.id);if(!sub)throw Error('This result does not match one of the five recent submissions on this device. Restore the student progress backup if needed.');
 if(raw.student!==sub.student||raw.created!==sub.created||typeof raw.teacher!=='string'||!raw.teacher.trim()||raw.teacher.length>100||!validTime(raw.markedAt)||!Array.isArray(raw.responses)||raw.responses.length!==sub.responses.length)throw Error('The returned submission details do not match.');
 const clean=object(),seen=new Set();for(const r of raw.responses){const original=sub.responses.find(x=>x.lesson===r?.lesson);if(!original||seen.has(r.lesson)||r.answer!==original.answer||!validScores(r.scores)||typeof r.comment!=='string'||!r.comment.trim()||r.comment.length>4000)throw Error('A returned answer, rubric score or comment is invalid.');seen.add(r.lesson);clean[r.lesson]={submission:sub.id,answer:r.answer,scores:[...r.scores],comment:r.comment,teacher:raw.teacher,markedAt:raw.markedAt};}
 Object.assign(s.feedback,clean);return Object.keys(clean).length;
}
export function validateSchool(raw){
 const s=freshSchool();if(!raw||typeof raw!=='object')return s;
 s.name=text(raw.name,100);s.lastLesson=schoolLessonById[raw.lastLesson]?raw.lastLesson:null;
 for(const l of schoolLessons){s.read[l.id]=Number.isInteger(raw.read?.[l.id])?Math.max(0,Math.min(l.sections.length,raw.read[l.id])):0;s.drafts[l.id]=text(raw.drafts?.[l.id]);if(Array.isArray(raw.completed)&&raw.completed.includes(l.id)&&studied(s,l.id))s.completed.push(l.id);
  for(const phase of ['practice','quiz']){const key=`${l.id}:${phase}`,session=cleanSession(raw.sessions?.[key],l,phase);if(session&&studied(s,l.id)&&(phase==='practice'||practiceDone(s,l.id)))s.sessions[key]=session;}
 }
 for(const r of Array.isArray(raw.history)?raw.history.slice(-60):[]){const l=schoolLessonById[r?.lesson];if(!l)continue;const a=cleanSession(r,l,'quiz');if(a?.finished)s.history.push({...a,date:validTime(r.date)?r.date:new Date(0).toISOString()});}
 s.earned=Array.isArray(raw.earned)?[...new Set(raw.earned.filter(id=>schoolQuestionById[id]))]:[];
 s.completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(id=>schoolLessonById[id]&&studied(s,id)&&practiceDone(s,id)))]:[];
 for(const r of Array.isArray(raw.sent)?raw.sent.slice(-5):[])try{s.sent.push(validateSubmission(r));}catch{}
 for(const l of schoolLessons){const f=raw.feedback?.[l.id];if(f&&typeof f.answer==='string'&&f.answer.length<=12000&&validScores(f.scores)&&typeof f.comment==='string'&&f.comment.length<=4000)s.feedback[l.id]={submission:text(f.submission,100),answer:f.answer,scores:[...f.scores],comment:f.comment,teacher:text(f.teacher,100),markedAt:validTime(f.markedAt)?f.markedAt:new Date(0).toISOString()};}
 s.teacher.name=text(raw.teacher?.name,100);try{if(raw.teacher?.submission)s.teacher.submission=validateSubmission(raw.teacher.submission);}catch{}
 for(const r of s.teacher.submission?.responses??[]){const m=raw.teacher?.marks?.[r.lesson];s.teacher.marks[r.lesson]={scores:teacherRubric.map((_,i)=>Number.isInteger(m?.scores?.[i])&&m.scores[i]>=0&&m.scores[i]<=2?m.scores[i]:null),comment:text(m?.comment,4000)};}
 return s;
}
export function schoolRecommendation(s){
 const weak=[...s.history].reverse().find(a=>!a.review&&schoolScore(a)<a.ids.length*.7&&s.history.filter(b=>b.lesson===a.lesson&&!b.review).at(-1)?.id===a.id);
 if(weak)return {id:weak.lesson,reason:'Your latest full quiz is below 70%. Revisit the explanation and retry the questions.'};
 if(s.lastLesson&&!s.completed.includes(s.lastLesson))return {id:s.lastLesson,reason:'Continue the classroom lesson you last opened.'};
 const next=schoolLessons.find(l=>!s.completed.includes(l.id));return next?{id:next.id,reason:'Your next unfinished classroom lesson.'}:null;
}
