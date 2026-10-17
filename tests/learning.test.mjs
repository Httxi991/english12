import test from 'node:test';
import assert from 'node:assert/strict';
import {units,lessons,questions,questionById,passages,vocabulary,writingPrompts} from '../web/content.js';
import {freshState,grade,completeAnswer,checkAnswer,startSession,finishSession,scoreSession,saveState,loadState,validateState,xp,progress,weakQuestions,performance,recommend,wordCount,badges} from '../web/engine.js';

const right=q=>q.type==='mc'?q.answer:q.type==='fill'?q.answers[0]:q.type==='match'?q.pairs.map((_,i)=>i):(()=>{const used=new Set();return q.answer.map(t=>{const i=q.tokens.findIndex((x,i)=>x===t&&!used.has(i));used.add(i);return i;});})();
const wrong=q=>q.type==='mc'?(q.answer+1)%q.options.length:q.type==='fill'?'not-the-answer':q.type==='match'?q.pairs.map((_,i)=>(i+1)%q.pairs.length):[...q.tokens.keys()].reverse();
function complete(s,kind,id,correct=true){const session=startSession(s,kind,id,true);for(let i=0;i<session.ids.length;i++){session.index=i;const q=questionById[session.ids[i]];checkAnswer(s,session,correct?right(q):wrong(q));}finishSession(s,session);return session;}
const memoryStorage=()=>({raw:null,getItem(){return this.raw;},setItem(k,v){this.raw=v;}});

test('content contract: four complete units, 48 unique questions and all references valid',()=>{
 assert.equal(units.length,4);assert.equal(lessons.length,8);assert.equal(questions.length,48);assert.equal(new Set(questions.map(q=>q.id)).size,48);assert.equal(new Set(questions.map(q=>q.prompt)).size,48);
 const used=[];for(const u of units){assert.equal(u.lessons.length,2);assert.equal(u.quiz.length,6);for(const id of u.lessons){const l=lessons.find(l=>l.id===id);assert.equal(l.unit,u.id);assert.equal(l.practice.length,3);used.push(...l.practice);}used.push(...u.quiz);assert.equal(questions.filter(q=>q.unit===u.id).length,12);}
 assert.equal(new Set(used).size,48);for(const id of used)assert.ok(questionById[id]);
 assert.equal(Object.keys(passages).length,2);assert.equal(vocabulary.length,24);assert.equal(writingPrompts.length,2);
 for(const q of questions){assert.ok(q.explanation.length>25);if(q.passage)assert.ok(passages[q.passage]);if(q.type==='mc')assert.equal(new Set(q.options).size,4);}
 for(const w of writingPrompts){const count=wordCount(w.model);assert.ok(count>=w.min&&count<=w.max,`${w.id} model has ${count} words`);}
});
test('every authored answer is accepted and all distractors are rejected',()=>{
 for(const q of questions){assert.equal(completeAnswer(q,right(q)),true,q.id);assert.equal(grade(q,right(q)),true,q.id);if(q.type==='mc')for(let i=0;i<q.options.length;i++)assert.equal(grade(q,i),i===q.answer,`${q.id}/${i}`);else assert.equal(grade(q,wrong(q)),false,q.id);}
});
test('fill normalisation is forgiving; incomplete and malformed structured answers are rejected',()=>{
 assert.ok(grade(questionById.v2,'  RELIABLE!  '));assert.ok(!grade(questionById.v2,'unreliable'));assert.ok(!completeAnswer(questionById.v3,[0,null,2]));assert.ok(!grade(questionById.v3,[0,1]));assert.ok(!grade(questionById.g10,[0,0,0,0,0,0,0]));assert.ok(!grade(questionById.v1,'1'));assert.ok(!grade(questionById.v6,[-1,1,2,3,4,5]));
});
test('end-to-end learning flow survives reload, records results and resumes next lesson',()=>{
 const storage=memoryStorage();let s=freshState();s.lastLesson='v1';let session=startSession(s,'practice','v1');checkAnswer(s,session,1);session.index=1;s.lastActivity='#/practice/v1';saveState(storage,s);
 s=loadState(storage).state;session=startSession(s,'practice','v1');assert.equal(session.index,1);assert.equal(session.answers.v1.checked,true);assert.equal(xp(s),10);
 checkAnswer(s,session,'reliable');session.index=2;checkAnswer(s,session,[0,1,2]);finishSession(s,session);assert.equal(scoreSession(session),3);assert.equal(progress(s),13);assert.equal(xp(s),50);assert.equal(s.attempts.length,1);assert.equal(recommend(s).href,'#/lesson/v2');
 saveState(storage,s);s=loadState(storage).state;assert.equal(s.completed[0],'v1');assert.equal(s.attempts[0].score,3);assert.equal(s.lastActivity,'#/practice/v1');
});
test('partial matching and sentence-building selections are retained on reload',()=>{
 const s=freshState();const one=startSession(s,'practice','v1');one.index=2;one.answers.v3={value:[0,null,2],checked:false};const two=startSession(s,'practice','v2');two.index=2;two.answers.v6={value:[4,3],checked:false};const restored=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.sessions['practice:v1'].answers.v3.value,[0,null,2]);assert.deepEqual(restored.sessions['practice:v2'].answers.v6.value,[4,3]);
});
test('incorrect answers produce a targeted recommendation; review updates latest accuracy',()=>{
 const s=freshState();complete(s,'practice','v1',false);assert.equal(weakQuestions(s).length,3);assert.equal(performance(s,'vocabulary').percent,0);assert.equal(recommend(s).href,'#/review/vocabulary');
 const review=complete(s,'review','vocabulary',true);assert.equal(scoreSession(review),3);assert.equal(weakQuestions(s).length,0);assert.equal(performance(s,'vocabulary').percent,100);assert.equal(s.attempts[0].score,0);assert.equal(s.attempts[1].score,3);
});
test('retry keeps history, prevents duplicate points and prevents repeated submit or finish',()=>{
 const s=freshState();const first=complete(s,'practice','v1');assert.equal(xp(s),50);complete(s,'practice','v1');assert.equal(xp(s),50);assert.equal(s.attempts.length,2);finishSession(s,first);assert.equal(s.attempts.length,2);assert.equal(checkAnswer(s,first,1),null);
 const unfinished=startSession(s,'quiz','grammar');assert.throws(()=>finishSession(s,unfinished),/every question/);
});
test('quiz score, matching all-or-nothing scoring and earned badges are accurate',()=>{
 const s=freshState();const quiz=complete(s,'quiz','vocabulary');assert.equal(scoreSession(quiz),6);assert.equal(xp(s),60);assert.equal(badges(s).find(b=>b.title==='Checkpoint ace').earned,true);assert.equal(s.completed.length,0);assert.equal(grade(questionById.v9,[0,1,1]),false);
});
test('all lessons and quizzes complete without unreachable questions; XP max excludes repetition',()=>{
 const s=freshState();for(const l of lessons)complete(s,'practice',l.id);for(const u of units)complete(s,'quiz',u.id);assert.equal(s.earned.length,48);assert.equal(progress(s),100);assert.equal(xp(s),640);assert.equal(s.attempts.length,12);assert.equal(recommend(s).href,'#/writing/opinion');assert.equal(badges(s).find(b=>b.title==='Full circle').earned,true);
});
test('drafts and settings persist; corrupt or unavailable storage has a safe fallback',()=>{
 const s=freshState();s.drafts.opinion='My original draft.';s.arabic=true;s.theme='dark';const storage=memoryStorage();assert.equal(saveState(storage,s),true);const loaded=loadState(storage);assert.equal(loaded.state.drafts.opinion,s.drafts.opinion);assert.equal(loaded.state.theme,'dark');assert.ok(loaded.state.arabic);storage.raw='{bad JSON';assert.ok(loadState(storage).warning);assert.equal(saveState({setItem(){throw Error('quota');}},s),false);assert.ok(loadState({getItem(){throw Error('denied');}}).warning);
});
test('backup validation recalculates scores and filters invalid IDs and injected routes',()=>{
 const s=freshState();complete(s,'quiz','grammar');s.attempts[0].score=900;s.earned.push('unknown');s.lastActivity='#/unknown/<script>';const v=validateState(s);assert.equal(v.attempts[0].score,6);assert.ok(!v.earned.includes('unknown'));assert.equal(v.lastActivity,null);assert.throws(()=>validateState({version:999}),/version 1/);
});
test('word counting handles punctuation, contractions and empty drafts',()=>{assert.equal(wordCount(''),0);assert.equal(wordCount("We’re ready for a four-week trial."),6);assert.equal(wordCount('one\n\ntwo  three'),3);});
