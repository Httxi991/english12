import {freshSchool,validateSchool,schoolXP} from './school-engine.js';
import {units,lessons,questions,questionById,lessonById,vocabulary,writingPrompts} from './content.js';

export const STORAGE_KEY='english12.progress.v1';
export const normalise = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
export function grade(q,answer){
 if(q.type==='mc') return Number.isInteger(answer) && answer===q.answer;
 if(q.type==='fill') return q.answers.some(a=>normalise(a)===normalise(answer));
 if(q.type==='order') return Array.isArray(answer) && answer.length===q.tokens.length && new Set(answer).size===answer.length && answer.every(i=>Number.isInteger(i)&&i>=0&&i<q.tokens.length) && answer.map(i=>q.tokens[i]).join(' ')===q.answer.join(' ');
 if(q.type==='match') return Array.isArray(answer) && answer.length===q.pairs.length && answer.every((v,i)=>v===i);
 return false;
}
export function completeAnswer(q,a){
 if(q.type==='mc') return Number.isInteger(a)&&a>=0&&a<q.options.length;
 if(q.type==='fill') return typeof a==='string'&&a.trim().length>0;
 if(q.type==='order') return Array.isArray(a)&&a.length===q.tokens.length&&new Set(a).size===a.length&&a.every(i=>Number.isInteger(i)&&i>=0&&i<q.tokens.length);
 if(q.type==='match') return Array.isArray(a)&&a.length===q.pairs.length&&a.every(i=>Number.isInteger(i)&&i>=0&&i<q.pairs.length);
 return false;
}
export function answerText(q,a){
 if(q.type==='mc') return q.options[a]??'No answer';
 if(q.type==='fill') return String(a??'No answer');
 if(q.type==='order') return Array.isArray(a)?a.map(i=>q.tokens[i]).filter(Boolean).join(' '):'No answer';
 return q.pairs.map(([term],i)=>`${term} → ${q.pairs[a?.[i]]?.[1]??'No answer'}`).join('; ');
}
export function solution(q){
 if(q.type==='mc') return q.options[q.answer];
 if(q.type==='fill') return q.answers[0];
 if(q.type==='order') return q.answer.join(' ');
 return q.pairs.map(([word,meaning])=>`${word} → ${meaning}`).join('; ');
}
export const wordCount=text=>(String(text).trim().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
export const freshState=()=>({version:1,school:freshSchool(),theme:'light',arabic:false,completed:[],earned:[],latest:{},attempts:[],sessions:{},drafts:{},writingDone:[],known:[],lastLesson:null,lastActivity:null});
export function validateState(input){
 if(!input||input.version!==1||typeof input!=='object') throw new Error('This is not an English12 version 1 backup.');
 const s=freshState();s.school=validateSchool(input.school);
 s.theme=input.theme==='dark'?'dark':'light'; s.arabic=input.arabic===true;
 const pick=(arr,valid)=>Array.isArray(arr)?[...new Set(arr.filter(x=>valid.includes(x)))]:[];
 s.completed=pick(input.completed,lessons.map(l=>l.id));
 s.earned=pick(input.earned,questions.map(q=>q.id));
 s.known=pick(input.known,vocabulary.map(v=>v.id));
 s.writingDone=pick(input.writingDone,writingPrompts.map(w=>w.id));
 s.lastLesson=lessonById[input.lastLesson]?input.lastLesson:null;
 for(const p of writingPrompts) if(typeof input.drafts?.[p.id]==='string')s.drafts[p.id]=input.drafts[p.id].slice(0,50000);
 for(const q of questions){const a=input.latest?.[q.id];if(a&&completeAnswer(q,a.answer))s.latest[q.id]={answer:a.answer,correct:grade(q,a.answer)};}
 const cleanSession=raw=>{
  if(!raw||!['practice','quiz','review'].includes(raw.kind))return null;
  const unit=units.find(u=>u.id===raw.target),lesson=lessonById[raw.target];
  const expected=raw.kind==='practice'?lesson?.practice:raw.kind==='quiz'?unit?.quiz:null;
  const ids=expected??(raw.kind==='review'&&Array.isArray(raw.ids)?raw.ids.filter(id=>questionById[id]):[]);
  if(!ids.length||ids.length>questions.length||new Set(ids).size!==ids.length)return null;
  const answers={};
  for(const id of ids){
   const a=raw.answers?.[id],q=questionById[id];if(!a)continue;
   const valid=q.type==='fill'?typeof a.value==='string'&&a.value.length<=200:q.type==='mc'?completeAnswer(q,a.value):Array.isArray(a.value)&&a.value.length<=(q.type==='order'?q.tokens.length:q.pairs.length)&&a.value.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<(q.type==='order'?q.tokens.length:q.pairs.length));
   if(valid&&(!a.checked||completeAnswer(q,a.value)))answers[id]={value:a.value,checked:a.checked===true};
  }
  return {kind:raw.kind,target:raw.target,ids,answers,index:Math.min(Math.max(Number.isInteger(raw.index)?raw.index:0,0),ids.length-1),finished:raw.finished===true&&ids.every(id=>answers[id]?.checked),id:typeof raw.id==='string'?raw.id.slice(0,100):'recovered'};
 };
 for(const [key,raw] of Object.entries(input.sessions??{})){
  const session=cleanSession(raw);
  if(session&&key===`${session.kind}:${session.target}`&&key.length<100)s.sessions[key]=session;
 }
 if(Array.isArray(input.attempts))for(const raw of input.attempts.slice(-80)){
  const a=cleanSession(raw);if(a?.finished)s.attempts.push({...a,date:typeof raw.date==='string'&&Number.isFinite(Date.parse(raw.date))?raw.date:new Date(0).toISOString(),score:scoreSession(a)});
 }
 s.lastActivity=typeof input.lastActivity==='string'&&/^#\/(lesson|practice|quiz|review|writing)\/[a-z0-9-]+$/.test(input.lastActivity)?input.lastActivity:null;
 return s;
}
export function loadState(storage){
 try {const raw=storage.getItem(STORAGE_KEY);return {state:raw?validateState(JSON.parse(raw)):freshState(),warning:null};}
 catch{return {state:freshState(),warning:'Your saved progress could not be read. This session is starting fresh. You can restore an English12 backup in Settings.'};}
}
export function saveState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export const xp=s=>s.earned.length*10+s.completed.length*20+s.writingDone.length*30+schoolXP(s.school);
export const progress=s=>Math.round(s.completed.length/lessons.length*100);
export function performance(s,unit){const entries=questions.filter(q=>q.unit===unit&&s.latest[q.id]).map(q=>s.latest[q.id]);return {total:entries.length,correct:entries.filter(a=>a.correct).length,percent:entries.length?Math.round(entries.filter(a=>a.correct).length/entries.length*100):null};}
export function weakQuestions(s,unit){return questions.filter(q=>(!unit||q.unit===unit)&&s.latest[q.id]&&!s.latest[q.id].correct).map(q=>q.id);}
export function recommend(s){
 const weak=units.map(u=>({u,p:performance(s,u.id)})).filter(x=>x.p.total>=3&&x.p.percent<70).sort((a,b)=>a.p.percent-b.p.percent)[0];
 if(weak)return {href:`#/review/${weak.u.id}`,title:`Revisit ${weak.u.skill.toLowerCase()}`,reason:`Your latest answers are ${weak.p.percent}% correct in this skill. Review the questions you missed.`};
 const lesson=lessons.find(l=>!s.completed.includes(l.id));
 if(lesson)return {href:`#/lesson/${lesson.id}`,title:lesson.title,reason:'The next unfinished lesson in your learning path.'};
 const unit=units.find(u=>!s.attempts.some(a=>a.kind==='quiz'&&a.target===u.id));
 if(unit)return {href:`#/quiz/${unit.id}`,title:`${unit.skill} checkpoint`,reason:'You have finished the lessons. Check your understanding with a unit quiz.'};
 const draft=writingPrompts.find(w=>!s.writingDone.includes(w.id));
 if(draft)return {href:`#/writing/${draft.id}`,title:draft.title,reason:'Put your skills into practice with a writing task and self-review.'};
 return {href:'#/words',title:'Keep your words fresh',reason:'Your learning path is complete. Revisit vocabulary or retry a unit checkpoint.'};
}
export function startSession(s,kind,target,force=false){
 const key=`${kind}:${target}`;
 if(s.sessions[key]&&!force)return s.sessions[key];
 const ids=kind==='practice'?lessonById[target]?.practice:kind==='quiz'?units.find(u=>u.id===target)?.quiz:weakQuestions(s,target==='all'?null:target);
 if(!ids?.length)return null;
 const session={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,kind,target,ids:[...ids],index:0,answers:{},finished:false};s.sessions[key]=session;return session;
}
export function checkAnswer(s,session,value){
 const id=session.ids[session.index],q=questionById[id];
 if(session.finished||session.answers[id]?.checked||!completeAnswer(q,value))return null;
 const correct=grade(q,value); session.answers[id]={value,checked:true}; s.latest[id]={answer:value,correct};
 if(correct&&!s.earned.includes(id))s.earned.push(id);
 return correct;
}
export function scoreSession(session){return session.ids.filter(id=>session.answers[id]?.checked&&grade(questionById[id],session.answers[id].value)).length;}
export function finishSession(s,session){
 if(session.finished)return session;
 if(!session.ids.every(id=>session.answers[id]?.checked))throw new Error('Answer every question before finishing.');
 session.finished=true;
 if(session.kind==='practice'&&!s.completed.includes(session.target))s.completed.push(session.target);
 s.attempts.push({...JSON.parse(JSON.stringify(session)),date:new Date().toISOString(),score:scoreSession(session)});
 s.attempts=s.attempts.slice(-80);return session;
}
export function badges(s){return [
 {title:'First step',detail:'Complete your first lesson',icon:'flag',earned:s.completed.length>=1},
 {title:'Word collector',detail:'Mark 12 vocabulary cards as known',icon:'spark',earned:s.known.length>=12},
 {title:'Checkpoint ace',detail:'Score at least 70% in any unit quiz',icon:'award',earned:s.attempts.some(a=>a.kind==='quiz'&&a.score/a.ids.length>=.7)},
 {title:'Your voice',detail:'Finish a writing task and self-review',icon:'pen',earned:s.writingDone.length>=1},
 {title:'Full circle',detail:'Complete all 8 lessons',icon:'check',earned:s.completed.length===lessons.length}
];}
