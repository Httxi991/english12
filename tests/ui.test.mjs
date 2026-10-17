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
 for(const route of routes){h.go(route);assert.ok(h.document.querySelector('h1'),route);assert.ok(!h.document.querySelector('main').textContent.includes('undefined'),route);for(const a of h.document.querySelectorAll('a[href^="#/"]')){const href=a.getAttribute('href');assert.ok(/^#\/(?:$|units$|dashboard$|words$|writing(?:\/(opinion|proposal))?$|settings$|unit\/(vocabulary|grammar|reading|writing)$|lesson\/[vgrw][12]$|practice\/[vgrw][12]$|quiz\/(vocabulary|grammar|reading|writing)$|review\/(all|vocabulary|grammar|reading|writing)$)/.test(href),`${route}: invalid ${href}`);}}
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
