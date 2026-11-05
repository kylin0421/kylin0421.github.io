Pinned browser distributions, hosted with the site so previews and formula fonts work offline.

- KaTeX 0.16.22: `katex.min.js`, CSS, auto-render extension, fonts (MIT).
- Marked 15.0.12: `marked.umd.js` (MIT).
- DOMPurify 3.2.7: `purify.min.js` (Apache-2.0 OR MPL-2.0).
- Mermaid Tiny 12.3.0 (`@mermaid-js/tiny`): `mermaid.tiny.js` (MIT), loaded only for diagram code blocks. Supports flowcharts and the Tiny distribution's other diagram types; excludes mindmaps, architecture, and ELK layout.

Downloaded from the npm registry using `npm pack`. Upstream license files are included in each directory. Public articles and the editor share `assets/js/markdown.js`, `assets/js/math.js`, and `assets/js/mermaid.js`.
