import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const accounts=sqliteTable('accounts',{
 id:text('id').primaryKey(),role:text('role').notNull(),name:text('name').notNull(),nameKey:text('name_key').notNull(),loginId:text('login_id').notNull(),credentialHash:text('credential_hash').notNull(),mustChange:integer('must_change').notNull().default(0),createdAt:integer('created_at').notNull(),lastActive:integer('last_active').notNull()
},t=>[uniqueIndex('account_login_unique').on(t.loginId),index('account_roster').on(t.role,t.createdAt)]);
export const sessions=sqliteTable('account_sessions',{
 tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('session_account').on(t.accountId),index('session_expiry').on(t.expiresAt)]);
export const progress=sqliteTable('account_progress',{
 accountId:text('account_id').primaryKey().references(()=>accounts.id,{onDelete:'cascade'}),stateJson:text('state_json').notNull(),revision:integer('revision').notNull().default(0),updatedAt:integer('updated_at').notNull()
});
export const submissions=sqliteTable('classroom_submissions',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),lessonId:text('lesson_id').notNull(),courseVersion:text('course_version').notNull(),answer:text('answer').notNull(),status:text('status').notNull().default('pending'),scoresJson:text('scores_json'),comment:text('comment'),teacherId:text('teacher_id').references(()=>accounts.id),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),revision:integer('revision').notNull().default(0)
},t=>[index('submission_student').on(t.studentId,t.createdAt),index('submission_queue').on(t.status,t.createdAt)]);
export const rateLimits=sqliteTable('request_limits',{
 key:text('key').primaryKey(),count:integer('count').notNull().default(0),expiresAt:integer('expires_at').notNull()
},t=>[index('limit_expiry').on(t.expiresAt)]);
