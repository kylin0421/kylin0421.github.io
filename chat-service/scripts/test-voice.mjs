import assert from 'node:assert/strict';
import { streamVoice, handle } from '../worker/index.js';
const encoder = new TextEncoder();
const delta = text => 'data: ' + JSON.stringify({ choices: [{ delta: { content: text, reasoning_content: 'private' } }] }) + '\n\n';
const input = encoder.encode(delta('你好。') + delta('Hello.') + 'data: [DONE]\n\n');
let offset = 0;
const response = streamVoice(new Response(new ReadableStream({
  pull(c) {
    if (offset === input.length) return c.close();
    c.enqueue(input.slice(offset, offset += 1));
  }
})), 'https://kylin0421.github.io');
const output = await response.text();
assert.deepEqual(output.trim().split('\n').map(JSON.parse), [{ text: '你好。' }, { text: 'Hello.' }, { done: true }]);
assert.ok(!output.includes('private'));
for (const broken of ['data: {invalid}\n\n', delta('partial'), 'data: {"error":"secret-provider-details"}\n\n']) {
  const result = await streamVoice(new Response(broken), 'test').text();
  assert.ok(result.includes('"error"'));
  assert.ok(!result.includes('secret-provider-details'));
}
let cancelled = false;
const source = new ReadableStream({ pull(c) { c.enqueue(encoder.encode(delta('one'))); }, cancel() { cancelled = true; } });
const reader = streamVoice(new Response(source), 'test').body.getReader();
await reader.read(); await reader.cancel();
assert.equal(cancelled, true);
const env = { DEEPSEEK_API_KEY: 'test-only', DB: { prepare() { return { bind() { return { first: async () => ({ used: 1 }), run: async () => {} }; } }; } } };
const request = new Request('https://test/api/voice', { method: 'POST', headers: { Origin: 'https://kylin0421.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }) });
const result = await handle(request, env, { waitUntil() {} }, async (url, options) => {
  if (url.endsWith('knowledge.json')) return Response.json({ documents: [{ kind: 'profile', title: 'About', url: '/about/', content: 'Research' }] });
  const body = JSON.parse(options.body);
  assert.equal(body.stream, true); assert.equal(body.max_tokens, 320);
  assert.equal(body.thinking.type, 'disabled');
  assert.ok(body.messages[0].content.includes('VOICE MODE'));
  assert.equal(options.signal.aborted, false);
  return new Response(delta('Hello there.') + 'data: [DONE]\n\n');
});
assert.equal(result.status, 200);
assert.ok((await result.text()).includes('Hello there.'));
console.log('PASS: voice route, non-thinking streaming, fragmented UTF-8/SSE, cancellation, truncation, malformed frames, safe errors.');
