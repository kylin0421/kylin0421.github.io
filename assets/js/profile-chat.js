(() => {
  'use strict';
  const root = document.querySelector('[data-profile-chat]');
  if (!root) return;
  const form = root.querySelector('[data-chat-form]');
  const input = root.querySelector('[data-chat-input]');
  const send = root.querySelector('[data-chat-send]');
  const reset = root.querySelector('[data-chat-reset]');
  const transcript = root.querySelector('[data-chat-transcript]');
  const status = root.querySelector('[data-chat-status]');
  const suggestions = [...root.querySelectorAll('[data-prompt]')];
  let messages = [];
  let busy = false;

  function bubble(role, content) {
    const article = document.createElement('article');
    article.className = `chat-message chat-message--${role}`;
    const label = document.createElement('span');
    label.className = 'chat-speaker';
    label.textContent = role === 'user' ? 'You' : "Linxiang’s website";
    const body = document.createElement('div');
    body.className = 'chat-message-body';
    if (role === 'assistant' && window.marked && window.DOMPurify) {
      body.innerHTML = DOMPurify.sanitize(marked.parse(content, { breaks: true }), {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
        ALLOWED_ATTR: ['href', 'title']
      });
      for (const link of body.querySelectorAll('a')) {
        const url = new URL(link.getAttribute('href'), location.origin);
        if (!['http:', 'https:'].includes(url.protocol)) link.removeAttribute('href');
        else { link.href = url.href; link.rel = 'noopener noreferrer'; }
      }
    } else body.textContent = content;
    article.append(label, body);
    transcript.append(article);
    transcript.hidden = false;
    reset.hidden = false;
    transcript.scrollTop = transcript.scrollHeight;
    return article;
  }

  function setBusy(value) {
    busy = value;
    send.disabled = value;
    reset.disabled = value;
    input.readOnly = value;
    suggestions.forEach(button => { button.disabled = value; });
    root.setAttribute('aria-busy', String(value));
    send.textContent = value ? 'Thinking…' : 'Ask ↗';
  }

  async function ask(question) {
    if (busy || !question.trim()) return;
    question = question.trim().slice(0, 1600);
    setBusy(true);
    status.textContent = 'Reading the website and thinking…';
    const userBubble = bubble('user', question);
    input.value = '';
    try {
      const response = await fetch(root.dataset.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages.slice(-8), { role: 'user', content: question }] }),
        signal: AbortSignal.timeout(65000), credentials: 'omit'
      });
      const data = await response.json();
      if (!response.ok || typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error(data.error || 'The chat is temporarily unavailable. Please try again shortly.');
      }
      bubble('assistant', data.answer);
      messages = [...messages, { role: 'user', content: question }, { role: 'assistant', content: data.answer }].slice(-8);
      status.textContent = '';
    } catch (error) {
      userBubble.remove();
      input.value = question;
      status.textContent = error.name === 'TimeoutError' ? 'That took too long. Your question is ready to try again.' : error.message === 'Failed to fetch' ? 'Could not reach the chat. Please try again shortly.' : error.message;
      status.classList.add('chat-status--error');
    } finally { setBusy(false); input.focus({ preventScroll: true }); }
  }

  form.addEventListener('submit', event => { event.preventDefault(); status.classList.remove('chat-status--error'); ask(input.value); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
  });
  suggestions.forEach(button => button.addEventListener('click', () => { status.classList.remove('chat-status--error'); ask(button.dataset.prompt); }));
  reset.addEventListener('click', () => { messages = []; transcript.replaceChildren(); transcript.hidden = true; reset.hidden = true; status.textContent = ''; input.value = ''; input.focus({ preventScroll: true }); });
  // Preserve links from the old home notebook without putting posts back on the home page.
  if (new URLSearchParams(location.search).has('tag')) location.replace(`/posts/${location.search}#writing`);
})();
