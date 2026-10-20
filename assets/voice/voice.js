import { takeChunk, messagesFor, isBackchannel, isEcho } from './core.mjs';
const $ = id => document.getElementById(id);
const endpoint = 'https://linxiang-profile-chat.finecrumb18.chatgpt.site/api/voice';
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;
let epoch = 0, current = null, turns = [], active = false, recognition = null;
let restartTimer, turnTimer, sessionTimer, speechTimer, partial = '', finalText = '';
let recognitionFailures = 0, lastHeardSpeech = '', lastSpeechEnd = 0;
const states = {
  idle: ['Off the clock', 'Coffee acquired. Questions welcome.', 'AI portrait of Linxiang holding a coffee'],
  listening: ['Listening', 'You have my undivided ear.', 'AI portrait of Linxiang listening with a cupped ear'],
  thinking: ['Thinking', 'Chin support: engaged.', 'AI portrait of Linxiang thinking with his hand on his chin'],
  speaking: ['Speaking', 'A small explanation has escaped.', 'AI portrait of Linxiang enthusiastically explaining']
};
function state(name) {
  document.body.dataset.state = name;
  $('avatar').dataset.state = name;
  $('avatar').setAttribute('aria-label', states[name][2]);
  $('status').textContent = states[name][0]; $('aside').textContent = states[name][1];
  $('lamp').classList.toggle('active', name !== 'idle');
}
function notice(text) { $('notice').textContent = text; }
function message(role, text = '') {
  $('welcome')?.remove();
  const el = document.createElement('div'); el.className = 'message';
  const label = document.createElement('strong'); label.textContent = role;
  const body = document.createElement('div'); body.textContent = text;
  el.append(label, body); $('transcript').append(el); scroll();
  return body;
}
function scroll() { $('transcript').scrollTop = $('transcript').scrollHeight; }
function renderLinks(el, text) {
  el.replaceChildren();
  let pos = 0;
  for (const match of text.matchAll(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g)) {
    el.append(document.createTextNode(text.slice(pos, match.index)));
    const url = new URL(match[2]);
    if (url.hostname === 'kylin0421.github.io') {
      const link = document.createElement('a'); link.href = url.href; link.textContent = match[1];
      link.target = '_blank'; link.rel = 'noopener noreferrer'; el.append(link);
    } else el.append(document.createTextNode(match[1]));
    pos = match.index + match[0].length;
  }
  el.append(document.createTextNode(text.slice(pos)));
}
function resetInput() {
  clearTimeout(turnTimer); partial = ''; finalText = ''; $('partial').textContent = '';
}
function stopRecognition() {
  clearTimeout(restartTimer);
  if (recognition) { const old = recognition; recognition = null; old.onend = null; old.abort(); }
}
function cancel(reason = 'Interrupted') {
  ++epoch; clearTimeout(speechTimer);
  if (current) {
    current.controller.abort(); current.queue.length = 0;
    if (!current.finished) {
      const note = document.createElement('small'); note.textContent = reason;
      current.el.parentElement.append(note);
    }
    current = null;
  }
  synth?.cancel();
  $('interrupt').disabled = true;
  state(active ? 'listening' : 'idle');
}
function endSession(reason = 'Session ended. You can still type.') {
  active = false; clearTimeout(sessionTimer); resetInput(); stopRecognition(); cancel();
  $('start').disabled = !Recognition; $('end').disabled = true; notice(reason);
}
function maybeListen() {
  if (!active || recognition || document.hidden) return;
  if (current?.speaking && !$('handsfree').checked) return;
  const r = new Recognition(); recognition = r;
  r.lang = $('language').value; r.interimResults = true; r.continuous = true;
  r.onresult = event => {
    if (recognition !== r || !active) return;
    recognitionFailures = 0;
    let newFinal = '', interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const value = event.results[i][0].transcript.trim();
      if (event.results[i].isFinal) newFinal += value + ' '; else interim += value + ' ';
    }
    const incoming = (newFinal || interim).trim();
    if (!incoming) return;
    if (current && !current.finished) {
      if (isBackchannel(incoming)) return;
      if (current.speaking && isEcho(incoming, lastHeardSpeech)) return;
      if (incoming.replace(/\s/g, '').length < 3) return;
      cancel('Interrupted — unheard words excluded from voice history.');
    } else if (Date.now() - lastSpeechEnd < 700 && isEcho(incoming, lastHeardSpeech)) return;
    finalText += newFinal; partial = interim;
    $('partial').textContent = (finalText + partial).trim();
    state('listening'); clearTimeout(turnTimer);
    // Final results settle briefly; partial results get a longer pause allowance.
    turnTimer = setTimeout(submitSpeech, interim ? 1500 : 650);
  };
  r.onerror = event => {
    if (recognition !== r) return;
    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error))
      endSession('Microphone unavailable or permission denied. Check browser permissions, or type below.');
    else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      recognitionFailures++;
      notice('Speech recognition lost its connection. Retrying; typing is still available.');
      if (recognitionFailures >= 3) endSession('Voice recognition is unavailable. Try another browser, or type below.');
    }
  };
  r.onend = () => {
    if (recognition !== r) return;
    recognition = null;
    if (active) restartTimer = setTimeout(maybeListen, Math.min(1500, 250 * (recognitionFailures + 1)));
  };
  try { r.start(); } catch { recognition = null; endSession('Voice could not start. Please try again or type.'); }
}
function submitSpeech() {
  const text = (finalText + partial).trim();
  resetInput(); stopRecognition();
  if (text) ask(text);
  maybeListen();
}
function drain(turn, flush = false) {
  if (!turn.voice) return;
  let chunk;
  while ((chunk = takeChunk(turn.buffer, flush))) {
    turn.buffer = chunk.rest;
    if (chunk.text) turn.queue.push(chunk.text);
  }
  speakNext(turn);
}
function finish(turn) {
  if (turn.id !== epoch || !turn.done || turn.speaking || turn.queue.length) return;
  turn.finished = true; $('interrupt').disabled = true;
  renderLinks(turn.el, turn.answer); state(active ? 'listening' : 'idle'); maybeListen();
}
function speakNext(turn) {
  if (turn.id !== epoch || turn.speaking) return;
  const text = turn.queue.shift();
  if (!text) { finish(turn); return; }
  const u = new SpeechSynthesisUtterance(text);
  const selected = synth.getVoices().find(v => v.voiceURI === $('voice').value);
  u.lang = /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : $('language').value;
  u.voice = selected || synth.getVoices().find(v => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2)) && v.localService) || null;
  u.rate = 1.05;
  turn.speaking = true;
  let confirmed = 0;
  if (!$('handsfree').checked) { resetInput(); stopRecognition(); }
  const failed = () => {
    if (turn.id !== epoch) return;
    cancel('Audio playback stopped — reply remains readable.');
    notice('Your browser could not play this reply. Read it above, or try another voice.');
    maybeListen();
  };
  speechTimer = setTimeout(failed, 20000);
  u.onstart = () => {
    if (turn.id !== epoch) return;
    state('speaking'); lastHeardSpeech = text;
    if (!turn.firstAudio) {
      turn.firstAudio = performance.now();
      $('metrics').textContent = `First text ${turn.firstText ? ((turn.firstText - turn.start) / 1000).toFixed(2) : '—'}s · Voice start ${((turn.firstAudio - turn.start) / 1000).toFixed(2)}s`;
    }
  };
  u.onboundary = e => {
    if (turn.id !== epoch) return;
    // Boundary marks the next word's start: only preceding characters are confirmed.
    if (e.charIndex > confirmed) { turn.heard += text.slice(confirmed, e.charIndex); confirmed = e.charIndex; }
  };
  u.onend = () => {
    if (turn.id !== epoch) return;
    clearTimeout(speechTimer);
    turn.heard += text.slice(confirmed) + ' ';
    turn.speaking = false; lastSpeechEnd = Date.now();
    speakNext(turn);
    if (!turn.speaking && !turn.done) { state('thinking'); maybeListen(); }
  };
  u.onerror = failed;
  synth.speak(u);
}
async function ask(question) {
  question = question.trim();
  if (!question) return;
  if (question.length > 1600) { notice('Please keep the question under 1,600 characters.'); return; }
  resetInput(); stopRecognition(); cancel();
  const messages = messagesFor(turns, question);
  const turn = { id: epoch, question, answer: '', heard: '', buffer: '', queue: [],
    controller: new AbortController(), done: false, speaking: false, finished: false,
    voice: $('sound').checked && !!synth, start: performance.now() };
  message('YOU', question); turn.el = message('AI GUIDE');
  turns.push(turn); if (turns.length > 12) turns.shift();
  current = turn; state('thinking'); $('interrupt').disabled = false;
  notice(active ? 'Listening for follow-ups. Interrupt whenever you like.' : 'You can interrupt or send another question.');
  maybeListen();
  const timeout = setTimeout(() => {
    if (turn.id === epoch) { cancel('Response timed out.'); notice('The reply took too long. Please try again.'); maybeListen(); }
  }, 35000);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }), signal: turn.controller.signal });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'The service is unavailable. Please try again.');
    }
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', completed = false;
    while (true) {
      const { value, done } = await reader.read();
      if (turn.id !== epoch) { await reader.cancel(); return; }
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const item = JSON.parse(line);
        if (item.error) throw new Error(item.error);
        if (item.text) {
          if (!turn.firstText) { turn.firstText = performance.now(); $('metrics').textContent = `First text ${((turn.firstText - turn.start) / 1000).toFixed(2)}s`; }
          turn.answer += item.text; turn.buffer += item.text;
          turn.el.textContent = turn.answer; scroll(); drain(turn);
        }
        if (item.done) completed = true;
      }
    }
    if (!completed || !turn.answer.trim()) throw new Error('The reply ended unexpectedly. Please try again.');
    turn.done = true; drain(turn, true); finish(turn);
  } catch (error) {
    if (turn.id !== epoch) return;
    cancel('Reply interrupted.');
    notice(error.name === 'AbortError' ? 'Request cancelled.' : error.message);
    maybeListen();
  } finally { clearTimeout(timeout); }
}
$('form').onsubmit = event => { event.preventDefault(); const text = $('question').value; $('question').value = ''; ask(text); };
document.querySelectorAll('[data-question]').forEach(button => { button.onclick = () => ask(button.dataset.question); });
$('start').onclick = () => {
  if (!Recognition || active) return;
  active = true; $('start').disabled = true; $('end').disabled = false;
  state('listening'); notice('Listening. Allow microphone access if prompted.');
  sessionTimer = setTimeout(() => endSession('Ten-minute voice session ended. Start again to continue.'), 600000);
  maybeListen();
};
$('interrupt').onclick = () => {
  resetInput(); stopRecognition(); cancel('Interrupted — unheard words excluded from voice history.');
  notice(active ? 'Go ahead — I’m listening.' : 'Stopped. Type your next question, or start voice.');
  maybeListen(); if (!active) $('question').focus();
};
$('end').onclick = () => endSession();
$('clear').onclick = () => { endSession('Conversation cleared.'); turns = []; $('transcript').replaceChildren(); $('metrics').textContent = 'Ready when you are.'; };
$('language').onchange = () => { resetInput(); stopRecognition(); maybeListen(); loadVoices(); };
$('handsfree').onchange = () => { stopRecognition(); maybeListen(); notice($('handsfree').checked ? 'Use headphones: echo may otherwise interrupt the guide.' : 'Speaker mode: click Interrupt during replies to talk.'); };
$('sound').onchange = () => { if (!$('sound').checked) { cancel('Read-aloud disabled.'); maybeListen(); } };
function loadVoices() {
  if (!synth) return;
  const previous = $('voice').value;
  $('voice').replaceChildren(new Option('System default', ''));
  synth.getVoices().filter(v => /^(en|zh)/i.test(v.lang)).forEach(v => $('voice').add(new Option(`${v.name} (${v.lang})`, v.voiceURI)));
  if ([...$('voice').options].some(o => o.value === previous)) $('voice').value = previous;
}
if (synth) { loadVoices(); synth.addEventListener('voiceschanged', loadVoices); }
else { $('sound').checked = false; $('sound').disabled = true; }
if (!Recognition) { $('start').disabled = true; notice('This browser does not support voice recognition. Type a question below.'); }
document.addEventListener('visibilitychange', () => { if (document.hidden) endSession('Paused while the tab was hidden. Click Start voice to resume.'); });
window.addEventListener('pagehide', () => endSession());

