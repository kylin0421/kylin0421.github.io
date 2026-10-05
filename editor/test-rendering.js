// Regression checks for math preservation before Markdown parsing.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({window: {}, document: {addEventListener() {}}, DOMPurify: {sanitize: html => html}, SiteMath: {render() {}}});
for (const file of ['assets/vendor/marked/marked.umd.js', 'assets/js/markdown.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const element = {};
context.window.MarkdownPreview.render(String.raw`# Heading

Inline $x_i^2 + \alpha$ and \(QK^{\top}\).

$$
\sum_{i=1}^{n} x_i
$$

\[a_b + c_d\]

| Method | Score |
| --- | --- |
| A | 42 |

` + '`$literal$`\n\n```python\nprint("$code$")\n```', element);
assert.match(element.innerHTML, /<h1>Heading<\/h1>/);
assert.match(element.innerHTML, /<table>/);
assert.match(element.innerHTML, /<span class="math-source">\$x_i\^2 \+ \\alpha\$<\/span>/);
assert.match(element.innerHTML, /QK\^{\\top}/);
assert.match(element.innerHTML, /\\sum_\{i=1\}\^\{n\}/);
assert.match(element.innerHTML, /a_b \+ c_d/);
assert.match(element.innerHTML, /<code>\$literal\$<\/code>/);
assert.match(element.innerHTML, /print\(&quot;\$code\$&quot;\)/);
assert.equal((element.innerHTML.match(/class="math-source"/g) || []).length, 4);
console.log('PASS: Markdown headings/tables, four math delimiters, preserved backslashes/subscripts, literal code. Browser checks cover sanitization and actual KaTeX DOM rendering.');
