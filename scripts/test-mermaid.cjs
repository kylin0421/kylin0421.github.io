// Run after the Jekyll build, then open /mermaid-test.html on the local preview.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const post = fs.readFileSync(path.join(root, '_posts/2026-11-05-how-does-kimi-k3-handle-vision.md'), 'utf8');
const source = post.match(/```mermaid\r?\n([\s\S]*?)```/)[1];
fs.writeFileSync(path.join(root, '_site/mermaid-test.html'), `<!doctype html>
<meta charset="utf-8"><title>Mermaid regression checks</title>
<link rel="stylesheet" href="/assets/css/modern.css">
<link rel="stylesheet" href="/assets/css/mermaid.css">
<link rel="stylesheet" href="/assets/vendor/katex/katex.min.css">
<style>body{background:#080f18;color:white;padding:24px}section{max-width:800px}.narrow{width:320px}</style>
<h1>Mermaid regression checks</h1><pre id="results">Running…</pre>
<h2>Actual article, narrow preview</h2><section id="article" class="prose narrow"></section>
<h2>Error isolation</h2><section id="errors" class="prose"></section>
<h2>Rapid preview updates</h2><section id="race" class="prose"></section>
<h2>Jekyll code fence</h2><section id="jekyll" class="prose"><pre class="language-mermaid"><code>graph LR; A[Jekyll] --&gt; B[Supported]</code></pre></section>
<script src="/assets/vendor/marked/marked.umd.js"></script>
<script src="/assets/vendor/dompurify/purify.min.js"></script>
<script src="/assets/vendor/katex/katex.min.js"></script>
<script src="/assets/vendor/katex/auto-render.min.js"></script>
<script src="/assets/js/math.js"></script>
<script src="/assets/js/mermaid.js"></script>
<script src="/assets/js/markdown.js"></script>
<script>
(async () => {
  const results = [];
  const check = (value, message) => { if (!value) throw new Error(message); results.push('PASS: ' + message); };
  const fence = (text, lang = 'mermaid') => '\u0060\u0060\u0060' + lang + '\\n' + text + '\\n\u0060\u0060\u0060';
  try {
    const article = document.getElementById('article');
    await MarkdownPreview.render(fence(${JSON.stringify(source).replace(/</g, '\u003c')}), article);
    check(article.querySelectorAll('.mermaid-diagram svg').length === 1, 'Actual article flowchart rendered');
    check(article.textContent.includes('Multi-teacher'), 'Node labels preserved');
    check(article.scrollWidth <= article.clientWidth, 'Wide diagram contained in narrow preview');
    const errors = document.getElementById('errors');
    await MarkdownPreview.render(fence('flowchart TD; A[') + '\\n\\n' + fence('flowchart LR; A[Healthy] --> B[Still renders]', 'flowchart') + '\\n\\n' + fence('print("ordinary code")', 'python') + '\\n\\nInline $x_i^2$.', errors);
    check(errors.querySelectorAll('.mermaid-error').length === 1 && errors.querySelector('code.language-mermaid'), 'Invalid syntax retains source and shows feedback');
    check(errors.querySelectorAll('.mermaid-diagram svg').length === 1, 'Invalid diagram does not block the next diagram or flowchart alias');
    check(errors.querySelector('code.language-python') && errors.querySelector('.katex'), 'Regular code and math preserved');
    const race = document.getElementById('race');
    await Promise.all([MarkdownPreview.render(fence('graph TD; A[Old] --> B[Old]'), race), MarkdownPreview.render(fence('graph TD; A[Latest] --> B[Current]'), race)]);
    check(race.querySelectorAll('svg').length === 1 && race.textContent.includes('Latest') && !race.textContent.includes('Old'), 'Rapid preview updates keep only latest content');
    await SiteMermaid.render(document.getElementById('jekyll'));
    check(document.querySelector('#jekyll svg'), 'Jekyll pre-level language class supported');
    check(!document.querySelector('[style*="-100000px"]'), 'Temporary rendering containers cleaned up');
    document.getElementById('results').textContent = results.join('\\n');
  } catch (error) { document.getElementById('results').textContent = results.join('\\n') + '\\nFAIL: ' + error.message; }
})();
</script>`);
console.log('Open http://127.0.0.1:4318/mermaid-test.html for browser regression checks.');
