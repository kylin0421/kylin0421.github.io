import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { handle, visitorDay } from '../worker/index.js';
const db=new DatabaseSync(':memory:');
db.exec(await readFile('drizzle/0001_visitors.sql','utf8'));
const DB = {
  prepare(sql) { return { bind(...args) { return {
    sql, args,
    async first() { return db.prepare(sql).get(...args); },
    async all() { return { results: db.prepare(sql).all(...args) }; }
  }; } }; },
  async batch(statements) {
    db.exec('BEGIN');
    try { for (const s of statements) db.prepare(s.sql).run(...s.args); db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }
};
const env={DB,ANALYTICS_SECRET:'test-secret'};
const headers={Origin:'https://kylin0421.github.io','cf-connecting-ip':'192.0.2.1','User-Agent':'Firefox'};
const visit=(extra={})=>handle(new Request('https://example.test/api/visit',{method:'POST',headers:{...headers,...extra}}),env,{});
assert.equal((await visit()).status,204);
await Promise.all(Array.from({length:20},()=>visit()));
assert.equal(db.prepare('SELECT visitors FROM visitor_daily').get().visitors,1);
await visit({'cf-connecting-ip':'192.0.2.2'});
assert.equal(db.prepare('SELECT visitors FROM visitor_daily').get().visitors,2);
await visit({'User-Agent':'Googlebot'});await visit({DNT:'1'});await visit({'Sec-GPC':'1'});
assert.equal(db.prepare('SELECT visitors FROM visitor_daily').get().visitors,2);
assert.equal((await visit({Origin:'https://evil.test'})).status,403);
const get=(path,headers={})=>handle(new Request('https://example.test'+path,{headers}),env,{});
assert.equal((await get('/api/visitors')).status,200);
assert.equal((await get('/visitors')).status,200);
assert.equal((await get('/api/visitors',{'oai-authenticated-user-id':'other','oai-authenticated-user-email':'other@example.com'})).status,200);
const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com'};
assert.equal((await get('/visitors',owner)).status,200);
assert.equal((await (await get('/api/visitors',owner)).json()).days[0].visitors,2);
assert.equal(visitorDay(new Date('2026-10-27T23:30:00Z')),'2026-10-28');
assert.equal(visitorDay(new Date('2026-07-01T22:30:00Z')),'2026-07-02');
db.prepare('INSERT INTO visitor_seen VALUES (?,?)').run('2020-01-01','old-hash');
await visit();assert.equal(db.prepare("SELECT COUNT(*) AS n FROM visitor_seen WHERE day='2020-01-01'").get().n,0);
assert.equal(db.prepare('SELECT visitors FROM visitor_daily').get().visitors,2);
const stored=JSON.stringify(db.prepare('SELECT * FROM visitor_seen').all());assert.ok(!stored.includes('192.0.2'));assert.ok(!stored.includes('Firefox'));
console.log('PASS: concurrent daily deduplication, separate visitors, privacy opt-outs, bot filter, public aggregate access, Budapest DST dates, expired identifier cleanup.');
