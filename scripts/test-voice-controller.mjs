// Isolated controller tests: no microphone, browser, network or paid provider.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as core from '../assets/voice/core.mjs';
class Element {
  constructor() { this.children = []; this.dataset = {}; this.checked = false; this.value = ''; this.options = []; this.classList = { toggle() {} }; }
  setAttribute() {}
  append(...items) { for (const item of items) { if (typeof item === 'object') item.parentElement = this; this.children.push(item); } }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  add(item) { this.options.push(item); }
  remove() {}
  focus() {}
}
const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
el('sound').checked = true; el('language').value = 'en-US';
const speech = [], requests = [], timers = new Map(), documentListeners = {};
let timer = 0;
class Recognition { start() {} abort() { this.aborted = true; } }
const document = { hidden: false, body: new Element(), getElementById: el,
  createElement: () => new Element(), createTextNode: text => ({ text }),
  querySelectorAll: () => [], addEventListener(name, fn) { documentListeners[name] = fn; } };
const synth = { speak(u) { speech.push(u); }, cancel() {}, getVoices: () => [], addEventListener() {} };
const sandbox = { ...core, document, window: { SpeechRecognition: Recognition, speechSynthesis: synth, addEventListener() {} },
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  Option: class { constructor(label, value) { this.label = label; this.value = value; } },
  performance, URL, AbortController, TextDecoder, console,
  setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); },
  fetch(url, options) { return new Promise(resolve => requests.push({ url, options, resolve })); } };
const source = (await readFile(new URL('../assets/voice/voice.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/, '');
vm.createContext(sandbox);
vm.runInContext(source + '\nthis.testAPI = { ask, cancel, endSession, get: () => ({ current, epoch, turns, active, recognition }) };', sandbox);
const api = sandbox.testAPI, encode = new TextEncoder();
function respond(index, text) {
  requests[index].resolve(new Response(encode.encode(JSON.stringify({ text }) + '\n{"done":true}\n')));
}
const first = api.ask('First question');
respond(0, 'This is the first complete sentence. This is the unheard second sentence.');
await first;
assert.equal(speech.length, 1, 'Queue submits one utterance at a time');
speech[0].onstart();
speech[0].onboundary({ charIndex: 12 });
const firstTurn = api.get().current;
const second = api.ask('A new question');
assert.equal(requests[0].options.signal.aborted, true);
const sent = JSON.parse(requests[1].options.body);
assert.equal(sent.messages[1].content, firstTurn.heard.trim());
assert.ok(!sent.messages[1].content.includes('unheard'));
const before = speech.length;
speech[0].onend();
assert.equal(speech.length, before, 'Stale completion cannot enqueue old audio');
assert.equal(document.body.dataset.state, 'thinking', 'Stale callback cannot change new state');
respond(1, 'The new answer is complete.');
await second;
speech.at(-1).onstart(); speech.at(-1).onend();
assert.equal(api.get().current.finished, true);
assert.equal(document.body.dataset.state, 'idle');
// Late network output from an aborted turn is discarded.
const third = api.ask('Will cancel');
api.cancel();
respond(2, 'This late reply must never play.');
await third;
assert.equal(speech.length, before + 1);
el('start').onclick();
assert.equal(api.get().active, true);
const r = api.get().recognition;
document.hidden = true; documentListeners.visibilitychange();
assert.equal(api.get().active, false);
assert.equal(r.aborted, true);
assert.equal(api.get().recognition, null);
assert.equal(timers.size, 0, 'Hidden-page cleanup clears all application timers');
console.log('PASS: single-utterance queue, abort propagation, stale stream/audio callbacks, played-prefix history, session and hidden-tab cleanup.');
