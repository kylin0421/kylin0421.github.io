import assert from 'node:assert/strict';
import { takeChunk, spokenText, messagesFor, isBackchannel, isEcho } from '../assets/voice/core.mjs';
assert.equal(takeChunk('Hello there, I am still'), null);
assert.equal(takeChunk('你好，这是一个测试。下一句').text, '你好，这是一个测试。');
assert.equal(takeChunk('This is the first sentence. Another sentence.').text, 'This is the first sentence.');
assert.equal(takeChunk('[About](https://example.com', true), null);
assert.equal(spokenText('See [About](https://example.com).'), 'See About.');
const history = messagesFor([{ question: 'First?', voice: true, answer: 'Heard. SECRET UNPLAYED', heard: 'Heard.' }], 'Second?');
assert.equal(history[1].content, 'Heard.');
assert.equal(history.length, 3);
assert.equal(messagesFor(Array.from({ length: 20 }, () => ({ question: 'q', voice: false, answer: 'a' })), 'next').length, 9);
assert.equal(isBackchannel('嗯'), true);
assert.equal(isBackchannel('Actually stop'), false);
assert.equal(isEcho('research interests', 'His research interests are broad.'), true);
assert.equal(isEcho('something else', 'His research interests are broad.'), false);
// Every character must survive segmentation, including a URL split over tokens.
const text = 'This is a useful first sentence. See [the research](https://example.com/path) for more.';
let buffer = '', collected = '';
for (const char of text) {
  buffer += char;
  let part;
  while ((part = takeChunk(buffer))) { collected += part.text + ' '; buffer = part.rest; }
}
let part;
while ((part = takeChunk(buffer, true))) { collected += part.text + ' '; buffer = part.rest; }
assert.equal(collected.trim(), spokenText(text));
console.log('PASS: English/Chinese chunking, incomplete links, echo/backchannel guards, bounded history, unheard text exclusion.');
