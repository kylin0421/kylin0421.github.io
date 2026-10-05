/* Shared by public Jekyll pages and the local editor. */
(function () {
  window.SiteMath = {
    render(element) {
      if (!element || !window.renderMathInElement) return;
      // Kramdown emits math/tex scripts for $$...$$; render their source first.
      element.querySelectorAll('script[type^="math/tex"]').forEach(script => {
        const node = document.createElement(script.type.includes('mode=display') ? 'div' : 'span');
        script.replaceWith(node);
        try { katex.render(script.textContent, node, {displayMode: script.type.includes('mode=display'), throwOnError: false, trust: false}); }
        catch { node.textContent = script.textContent; node.className = 'math-error'; }
      });
      renderMathInElement(element, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$', right: '$', display: false}
        ],
        ignoredClasses: ['katex', 'math-error'], throwOnError: false, trust: false
      });
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.page__content, .archive__item-excerpt').forEach(element => SiteMath.render(element));
  });
})();
