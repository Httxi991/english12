import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolLessons,schoolQuestions,schoolQuestionById,schoolSources} from '../dist/school-content.js';
import {freshState,validateState,xp} from '../dist/engine.js';
import {freshSchool,validateSchool,studied,readSection,schoolSession,checkSchoolAnswer,nextSchoolQuestion,schoolCorrect,schoolScore,createSubmission,openTeacherSubmission,createGrades,acceptGrades,validateSubmission,schoolRecommendation} from '../dist/school-engine.js';
const answer=q=>q.type==='mc'?q.answer:q.answers[0];
function study(s,l){for(let i=0;i<l.sections.length;i++)assert.equal(readSection(s,l.id,i),true);}
function finish(s,l,phase,wrong=false){const a=schoolSession(s,l.id,phase);while(!a.finished){const q=schoolQuestionById[a.ids[a.index]];checkSchoolAnswer(s,a,wrong?(q.type==='mc'?(q.answer+1)%q.options.length:'incorrect'):answer(q));nextSchoolQuestion(s,a);}return a;}
function ready(){const s=freshSchool(),l=schoolLessons[0];study(s,l);finish(s,l,'practice');finish(s,l,'quiz');s.name='Student A';s.drafts[l.id]='A developed response with a specific example and reasoning.';return s;}
test('25 source files mapped to 18 complete lessons; 108 unique objective questions and 18 manual tasks',()=>{
 assert.equal(schoolSources.length,25);assert.equal(schoolLessons.length,18);assert.equal(schoolQuestions.length,108);assert.equal(new Set(schoolQuestions.map(q=>q.prompt)).size,108);
 const covered=new Set(schoolLessons.flatMap(l=>l.sources));for(let i=1;i<=25;i++)assert.ok(covered.has(i),`source ${i}`);
 for(const l of schoolLessons){assert.ok(l.sections.length>=3);assert.equal(l.questions.filter(q=>q.phase==='practice').length,2);assert.equal(l.questions.filter(q=>q.phase==='quiz').length,4);assert.ok(l.task&&l.guide);for(const p of l.sections)assert.ok(p.text&&p.example&&p.ar);}
 for(const q of schoolQuestions){assert.ok(schoolCorrect(q,answer(q)),q.id);if(q.type==='mc'){assert.equal(new Set(q.options).size,4);q.options.forEach((_,i)=>assert.equal(schoolCorrect(q,i),i===q.answer));}assert.ok(q.explanation);}
});
test('study and practice gates survive direct access and persisted sessions',()=>{
 const s=freshSchool(),l=schoolLessons[0];assert.equal(schoolSession(s,l.id,'quiz'),null);assert.equal(schoolSession(s,l.id,'practice'),null);assert.equal(readSection(s,l.id,2),false);study(s,l);assert.equal(schoolSession(s,l.id,'quiz'),null);finish(s,l,'practice');assert.ok(schoolSession(validateSchool(s),l.id,'quiz'));assert.equal(schoolSession(s,'constructor'),null);
});
test('all classroom paths complete; score, history, saved progress, recommendations and XP are accurate',()=>{
 const state=freshState(),s=state.school;
 for(const l of schoolLessons){study(s,l);assert.equal(schoolScore(finish(s,l,'practice')),2);assert.equal(schoolScore(finish(s,l,'quiz')),4);}
 assert.equal(s.completed.length,18);assert.equal(s.earned.length,108);assert.equal(s.history.length,18);assert.equal(xp(state),1440);assert.equal(schoolRecommendation(s),null);
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.school.completed.length,18);assert.equal(xp(restored),1440);
 const l=schoolLessons[0];schoolSession(s,l.id,'quiz',true);finish(s,l,'quiz');assert.equal(s.history.length,19);assert.equal(xp(state),1440);
 assert.equal(nextSchoolQuestion(s,s.sessions[`${l.id}:quiz`]),false);assert.equal(s.history.length,19);
});
test('wrong-answer review uses only misses; partial quiz resumes and old foundation progress migrates',()=>{
 const s=ready(),l=schoolLessons[0];schoolSession(s,l.id,'quiz',true);finish(s,l,'quiz',true);assert.equal(schoolScore(s.sessions[`${l.id}:quiz`]),0);assert.equal(schoolRecommendation(s).id,l.id);
 const review=schoolSession(s,l.id,'quiz',true,true);assert.equal(review.ids.length,4);checkSchoolAnswer(s,review,answer(schoolQuestionById[review.ids[0]]));nextSchoolQuestion(s,review);
 const resumed=validateSchool(JSON.parse(JSON.stringify(s)));assert.equal(resumed.sessions[`${l.id}:quiz`].index,1);finish(resumed,l,'quiz');assert.equal(schoolScore(resumed.sessions[`${l.id}:quiz`]),4);
 const old=freshState();delete old.school;old.completed=['v1'];old.drafts.opinion='My original draft';const migrated=validateState(old);assert.deepEqual(migrated.completed,['v1']);assert.equal(migrated.drafts.opinion,old.drafts.opinion);assert.equal(migrated.school.completed.length,0);
});
test('teacher file exchange returns actual manual rubric scores, comments and answer snapshot',()=>{
 const student=ready(),id=schoolLessons[0].id,sub=createSubmission(student),teacher=freshSchool();openTeacherSubmission(teacher,JSON.parse(JSON.stringify(sub)));teacher.teacher.name='Teacher B';assert.throws(()=>createGrades(teacher),/four scores/);
 teacher.teacher.marks[id]={scores:[2,1,2,1],comment:'Clear claim. Add a more precise textual detail.'};const marked=createGrades(teacher);assert.equal(acceptGrades(student,marked),1);assert.deepEqual(student.feedback[id].scores,[2,1,2,1]);assert.equal(student.feedback[id].teacher,'Teacher B');
 const restored=validateSchool(JSON.parse(JSON.stringify(student)));assert.equal(restored.feedback[id].comment,marked.responses[0].comment);student.drafts[id]='A revised answer.';assert.notEqual(student.feedback[id].answer,student.drafts[id]);assert.equal(student.feedback[id].scores.reduce((a,b)=>a+b),6);
 assert.equal(validateSchool(teacher).teacher.marks[id].comment,teacher.teacher.marks[id].comment);
});
test('teacher imports reject mismatched, malformed, duplicated and out-of-range data atomically',()=>{
 const s=ready(),sub=createSubmission(s),t=freshSchool(),id=schoolLessons[0].id;openTeacherSubmission(t,sub);t.teacher.name='T';t.teacher.marks[id]={scores:[2,2,2,2],comment:'Specific feedback.'};const raw=createGrades(t);
 for(const mutate of [r=>r.id='unmatched123',r=>r.responses[0].scores[0]=3,r=>r.responses[0].answer='A different answer',r=>r.student='Other student',r=>r.responses.push(r.responses[0]),r=>r.responses[0].comment='']){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>acceptGrades(s,bad));assert.deepEqual(Object.keys(s.feedback),[]);}
 assert.throws(()=>validateSubmission({...sub,responses:[...sub.responses,...sub.responses]}),/duplicated/);
 assert.throws(()=>validateSubmission({...sub,responses:[{lesson:'constructor',answer:'x'}]}));
 const malformed=validateSchool({read:{constructor:99},sessions:{'constructor:quiz':{}},teacher:{submission:{kind:'fake'}}});assert.equal(malformed.teacher.submission,null);assert.equal(studied(malformed,'constructor'),false);
});

test('retrying guided practice after completion preserves quiz access and written work on reload',()=>{
 const s=ready(),id=schoolLessons[0].id;schoolSession(s,id,'practice',true);const restored=validateSchool(s);assert.ok(restored.completed.includes(id));assert.ok(schoolSession(restored,id,'quiz'));assert.equal(restored.drafts[id],s.drafts[id]);
});
