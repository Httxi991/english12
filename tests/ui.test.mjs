// DOM/event smoke tests only. LinkeDOM does not perform browser layout or visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {lessons,units,questionById,writingPrompts} from '../dist/content.js';
import {STORAGE_KEY,wordCount} from '../dist/engine.js';

let instance=0;
async function boot(raw=null,hash='#/'){
 const {document,Event}=parseHTML(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 const handlers={};const storage={raw,getItem(){return this.raw;},setItem(k,v){this.raw=v;}};
 globalThis.document=document;
 globalThis.location={hash};
 globalThis.window={localStorage:storage,scrollTo(){},addEventListener(name,fn){handlers[name]=fn;},confirm(){return true;}};
 await import(`../dist/app.js?test=${++instance}`);
 const go=hash=>{globalThis.location.hash=hash;handlers.hashchange();};
 const click=selector=>{const el=document.querySelector(selector);assert.ok(el,`Missing ${selector}`);assert.ok(!el.disabled,`Disabled ${selector}`);el.dispatchEvent(new Event('click',{bubbles:true}));};
 const change=(el,type='change')=>el.dispatchEvent(new Event(type,{bubbles:true}));
 const fill=(selector,value)=>{const el=document.querySelector(selector);el.value=value;change(el,'input');};
 return {document,storage,go,click,change,fill,Event,state:()=>JSON.parse(storage.raw||'{}')};
}
function answer(h,q,wrong=false){
 if(q.type==='mc'){const index=wrong?(q.answer+1)%4:q.answer;const el=h.document.querySelector(`input[name="answer"][value="${index}"]`);el.setAttribute('checked','');el.checked=true;h.change(el);}
 else if(q.type==='fill')h.fill('#answer-input',wrong?'incorrect':q.answers[0]);
 else if(q.type==='match'){
  [...h.document.querySelectorAll('[data-match]')].forEach((select,i)=>{for(const o of select.querySelectorAll('option'))o.removeAttribute('selected');select.querySelector(`option[value="${wrong?(i+1)%q.pairs.length:i}"]`).setAttribute('selected','');h.change(select);});
 }else{
  const used=new Set();const tokens=wrong?[...q.answer].reverse():q.answer;
  for(const token of tokens){const index=q.tokens.findIndex((t,i)=>t===token&&!used.has(i));used.add(index);h.click(`[data-action="add-token"][data-index="${index}"]`);}
 }
 assert.ok(!h.document.querySelector('#check-answer').disabled,`answer is enabled: ${q.id}`);
 h.document.querySelector('#answer-form').dispatchEvent(new h.Event('submit',{bubbles:true,cancelable:true}));
 assert.ok(h.document.querySelector('.feedback'),`feedback for ${q.id}`);
}

test('all app routes render and their internal links resolve to actual content',async()=>{
 const h=await boot();const routes=['#/','#/units','#/dashboard','#/words','#/writing','#/settings',...units.map(u=>`#/unit/${u.id}`),...lessons.map(l=>`#/lesson/${l.id}`),...writingPrompts.map(w=>`#/writing/${w.id}`)];
 for(const route of routes){h.go(route);assert.ok(h.document.querySelector('h1'),route);assert.ok(!h.document.querySelector('main').textContent.includes('undefined'),route);for(const a of h.document.querySelectorAll('a[href^="#/"]')){const href=a.getAttribute('href');assert.ok(/^#\/(?:$|school(?:\/[a-z0-9-]+(?:\/(study|practice|quiz|write))?)?$|teacher$|units$|dashboard$|words$|writing(?:\/(opinion|proposal))?$|settings$|unit\/(vocabulary|grammar|reading|writing)$|lesson\/[vgrw][12]$|practice\/[vgrw][12]$|quiz\/(vocabulary|grammar|reading|writing)$|review\/(all|vocabulary|grammar|reading|writing)$)/.test(href),`${route}: invalid ${href}`);}}
 h.go('#/lesson/constructor');assert.match(h.document.querySelector('h1').textContent,/back on track/);
 h.go('#/not-a-real-page');assert.match(h.document.querySelector('h1').textContent,/back on track/);
 h.go('#/');const skipEvent=new h.Event('click',{bubbles:true,cancelable:true});h.document.querySelector('.skip').dispatchEvent(skipEvent);assert.ok(skipEvent.defaultPrevented);assert.equal(h.document.querySelector('main').getAttribute('tabindex'),'-1');assert.equal(globalThis.location.hash,'#/');
});
test('full UI journey covers all four question controls, saves progress and renders results',async()=>{
 const h=await boot();
 for(const l of lessons){h.go(`#/lesson/${l.id}`);assert.ok(h.document.querySelector(`a[href="#/practice/${l.id}"]`));h.go(`#/practice/${l.id}`);for(const id of l.practice){answer(h,questionById[id]);assert.ok(h.document.querySelector('.feedback.success'),id);h.click('[data-action="next"]');}assert.match(h.document.querySelector('.result-score').textContent,/3.*3/);}
 for(const u of units){h.go(`#/quiz/${u.id}`);for(const id of u.quiz){answer(h,questionById[id]);h.click('[data-action="next"]');}assert.match(h.document.querySelector('.result-score').textContent,/6.*6/);}
 assert.equal(h.state().completed.length,8);assert.equal(h.state().earned.length,48);assert.equal(h.state().attempts.length,12);h.go('#/dashboard');assert.match(h.document.querySelector('main').textContent,/640/);
 const reopened=await boot(h.storage.raw,'#/dashboard');assert.match(reopened.document.querySelector('main').textContent,/640/);assert.equal(reopened.state().completed.length,8);
});
test('UI retry retains earlier result and review corrects a missed answer',async()=>{
 const h=await boot();h.go('#/practice/v1');for(const [i,id]of ['v1','v2','v3'].entries()){answer(h,questionById[id],i===0);h.click('[data-action="next"]');}assert.equal(h.state().attempts[0].score,2);
 h.click('[data-action="retry"]');for(const id of ['v1','v2','v3']){answer(h,questionById[id]);h.click('[data-action="next"]');}assert.equal(h.state().attempts.length,2);assert.equal(h.state().attempts[0].score,2);assert.equal(h.state().earned.length,3);
 h.go('#/quiz/grammar');answer(h,questionById.g7,true);h.go('#/review/grammar');assert.ok(h.document.querySelector('#question-title'));answer(h,questionById.g7);h.click('[data-action="next"]');assert.equal(h.state().latest.g7.correct,true);
});
test('writing draft, word count, self-review and theme controls work through actual events',async()=>{
 const h=await boot();h.go('#/writing/opinion');const model=writingPrompts[0].model;h.fill('#writing-draft',model);assert.match(h.document.querySelector('#word-count').textContent,new RegExp(String(wordCount(model))));assert.ok(h.document.querySelector('[data-action="finish-writing"]').disabled);
 for(const el of h.document.querySelectorAll('[data-rubric]')){el.checked=true;h.change(el);}h.click('[data-action="finish-writing"]');assert.deepEqual(h.state().writingDone,['opinion']);assert.equal(h.state().drafts.opinion,model);
 h.click('[data-action="theme"]');assert.equal(h.document.documentElement.dataset.theme,'dark');h.click('[data-action="arabic"]');assert.ok(h.document.querySelector('[lang="ar"][dir="rtl"]'));
 const reopened=await boot(h.storage.raw,'#/writing/opinion');assert.equal(reopened.document.querySelector('#writing-draft').value,model);assert.equal(reopened.document.documentElement.dataset.theme,'dark');
});
test('vocabulary search, flip and known filters are functional',async()=>{
 const h=await boot();h.go('#/words');assert.equal(h.document.querySelectorAll('.flashcard').length,24);h.fill('#word-search','feasible');assert.equal(h.document.querySelectorAll('.flashcard').length,1);h.click('[data-action="flip"][data-id="feasible"]');assert.match(h.document.querySelector('.flashcard').textContent,/possible and practical/);h.click('[data-action="known"][data-id="feasible"]');assert.deepEqual(h.state().known,['feasible']);h.fill('#word-search','');h.click('[data-action="word-filter"][data-value="known"]');assert.equal(h.document.querySelectorAll('.flashcard').length,1);
});

test('classroom UI gates quiz, teaches, quizzes, saves writing and resumes without dropping foundation work',async()=>{
 const {schoolLessons}=await import('../dist/school-content.js');const l=schoolLessons[0];const h=await boot();h.go(`#/school/${l.id}/quiz`);assert.match(h.document.querySelector('main').textContent,/Finish the guided practice/);
 h.go(`#/school/${l.id}/study`);for(let i=0;i<l.sections.length;i++)h.click(`[data-action="school-read"][data-index="${i}"]`);
 for(const phase of ['practice','quiz']){h.go(`#/school/${l.id}/${phase}`);for(const q of l.questions.filter(q=>q.phase===phase)){if(q.type==='mc'){const el=h.document.querySelector(`input[name="school-answer"][value="${q.answer}"]`);el.checked=true;el.setAttribute('checked','');}else h.fill('#school-answer-input',q.answers[0]);h.document.querySelector('#school-answer-form').dispatchEvent(new h.Event('submit',{bubbles:true,cancelable:true}));assert.ok(h.document.querySelector('.feedback.success'));h.click('[data-action="school-next"]');}assert.ok(h.document.querySelector('.result-score'));}
 assert.equal(h.state().school.completed.length,1);h.go(`#/school/${l.id}/write`);h.fill('#school-draft','A clear claim supported by an example and thoughtful reasoning.');assert.match(h.document.querySelector('#school-word-count').textContent,/10 words/);
 h.go('#/school/submissions');h.fill('#school-student-name','Student');assert.ok(!h.document.querySelector('[data-action="school-export"]').disabled);
 const reopened=await boot(h.storage.raw,`#/school/${l.id}/write`);assert.match(reopened.document.querySelector('#school-draft').textContent,/clear claim/);assert.equal(reopened.state().school.completed.length,1);
});
test('classroom source and teacher pages render safely with user text and rubric controls',async()=>{
 const {freshState}=await import('../dist/engine.js');const {schoolLessons}=await import('../dist/school-content.js');const {openTeacherSubmission,COURSE_VERSION}=await import('../dist/school-engine.js');const state=freshState(),l=schoolLessons[0];openTeacherSubmission(state.school,{kind:'english12-submission',version:1,course:COURSE_VERSION,id:'test-student-123',student:'<img src=x onerror=alert(1)>',created:new Date().toISOString(),responses:[{lesson:l.id,answer:'<script>bad()</script> A response.'}]});
 const h=await boot(JSON.stringify(state),'#/teacher');assert.equal(h.document.querySelectorAll('select[data-school-mark]').length,4);assert.equal(h.document.querySelectorAll('.student-answer script').length,0);assert.match(h.document.querySelector('.student-answer').textContent,/<script>/);h.fill('#school-teacher-name','Teacher');h.fill('[data-school-comment]','Add one precise supporting detail.');assert.equal(h.state().school.teacher.marks[l.id].comment,'Add one precise supporting detail.');
 h.go('#/school/sources');assert.equal(h.document.querySelectorAll('.source-list>li').length,25);h.go('#/school');assert.equal(h.document.querySelectorAll('.school-group').length,6);h.go('#/school/constructor');assert.match(h.document.querySelector('h1').textContent,/back to learning/);
});

test('student download, teacher import, rubric events, feedback export and student import round-trip',async()=>{
 const {freshState}=await import('../dist/engine.js');const {schoolLessons}=await import('../dist/school-content.js');const {readSection,schoolSession,checkSchoolAnswer,nextSchoolQuestion}=await import('../dist/school-engine.js');
 const state=freshState(),l=schoolLessons[0],s=state.school;for(let i=0;i<l.sections.length;i++)readSection(s,l.id,i);for(const phase of ['practice','quiz']){const a=schoolSession(s,l.id,phase);while(!a.finished){const q=l.questions.find(q=>q.id===a.ids[a.index]);checkSchoolAnswer(s,a,q.type==='mc'?q.answer:q.answers[0]);nextSchoolQuestion(s,a);}}s.name='Student';s.drafts[l.id]='The hero protects others, but his final victory has a cost.';
 const original=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;let downloaded;URL.createObjectURL=blob=>{downloaded=blob;return 'blob:test';};URL.revokeObjectURL=()=>{};
 const importFile=async(h,selector,raw)=>{const input=h.document.querySelector(selector);Object.defineProperty(input,'files',{value:[{size:raw.length,text:async()=>raw}],configurable:true});h.change(input);await new Promise(resolve=>setTimeout(resolve,0));};
 try{
  const student=await boot(JSON.stringify(state),'#/school/submissions');student.click('[data-action="school-export"]');const studentSaved=student.storage.raw,submission=await downloaded.text();assert.equal(JSON.parse(submission).kind,'english12-submission');
  const teacher=await boot(null,'#/teacher');await importFile(teacher,'#school-import-submission',submission);assert.ok(teacher.document.querySelector('.student-answer'));teacher.fill('#school-teacher-name','Ms T');
  for(const select of teacher.document.querySelectorAll('[data-school-mark]')){for(const o of select.querySelectorAll('option'))o.removeAttribute('selected');select.querySelector('option[value="2"]').setAttribute('selected','');teacher.change(select);}
  teacher.fill('[data-school-comment]','Clear comparison. Keep using specific evidence.');assert.match(teacher.document.querySelector('[id^="mark-total-"]').textContent,/8 \/ 8/);teacher.click('[data-action="school-return"]');const feedback=await downloaded.text();assert.equal(JSON.parse(feedback).kind,'english12-feedback');
  const returned=await boot(studentSaved,'#/school/submissions');await importFile(returned,'#school-import-feedback',feedback);assert.match(returned.document.querySelector('.teacher-feedback').textContent,/8 \/ 8/);assert.match(returned.document.querySelector('.teacher-feedback').textContent,/Ms T/);
  returned.go(`#/school/${l.id}/write`);returned.fill('#school-draft','A revised answer.');assert.equal(returned.document.querySelector('#school-stale-feedback').hidden,false);
 }finally{URL.createObjectURL=original;URL.revokeObjectURL=oldRevoke;}
});
