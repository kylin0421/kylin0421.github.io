export function spokenText(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
}

// Hold incomplete Markdown links so neither their syntax nor URLs are spoken.
export function takeChunk(buffer, final = false) {
  let safe = buffer.length;
  const open = buffer.lastIndexOf('[');
  if (open >= 0 && !/\]\([^)]*\)/.test(buffer.slice(open))) safe = open;
  const prefix = buffer.slice(0, safe);
  let end = -1;
  const sentence = /[.!?](?:\s|$)|[。！？]/g;
  for (const match of prefix.matchAll(sentence)) {
    if (match.index >= 18 || /[。！？]/.test(match[0])) { end = match.index + match[0].length; break; }
  }
  if (end < 0 && prefix.length > 85) {
    const punctuation = /[,;:，；：]\s*/g;
    for (const match of prefix.matchAll(punctuation)) {
      if (match.index > 35) { end = match.index + match[0].length; break; }
    }
  }
  if (end < 0 && prefix.length > 180) {
    end = prefix.lastIndexOf(' ', 160);
    if (end < 50) end = 120;
  }
  if (end < 0 && final) end = prefix.length;
  if (end <= 0) return null;
  return { text: spokenText(prefix.slice(0, end)), rest: buffer.slice(end) };
}

export function messagesFor(turns, question) {
  const messages = [];
  for (const turn of turns.slice(-4)) {
    messages.push({ role: 'user', content: turn.question });
    // Never treat generated-but-unplayed words as spoken conversation history.
    messages.push({ role: 'assistant', content: turn.voice
      ? (turn.heard.trim() || '[Reply interrupted before any confirmed playback.]')
      : (turn.answer.trim() || '[Reply interrupted.]') });
  }
  return [...messages, { role: 'user', content: question }];
}

export function isBackchannel(text) {
  return /^(uh|um|hmm|mhm|uh huh|okay|ok|yeah|yes|嗯|哦|好|好的)[.!?。！？，,\s]*$/i.test(text.trim());
}
export function isEcho(text, spoken) {
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const a = norm(text), b = norm(spoken);
  return a.length >= 4 && b.includes(a);
}
