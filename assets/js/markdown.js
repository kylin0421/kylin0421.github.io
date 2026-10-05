(function () {
  const html = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Math must be tokenized before Markdown consumes backslashes and underscores.
  marked.use({ extensions: [
    {
      name: 'blockMath', level: 'block',
      start: src => src.search(/\$\$|\\\[/),
      tokenizer(src) {
        const match = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])(?:\n|$)/.exec(src);
        if (match) return {type: 'blockMath', raw: match[0], text: match[1] || match[2]};
      },
      renderer: token => `<div class="math-source">${html('$$' + token.text + '$$')}</div>`
    },
    {
      name: 'inlineMath', level: 'inline',
      start: src => src.search(/\$|\\\(/),
      tokenizer(src) {
        const match = /^(?:\$\$([\s\S]+?)\$\$|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\])/.exec(src);
        if (match) return {type: 'inlineMath', raw: match[0], text: match[0]};
      },
      renderer: token => `<span class="math-source">${html(token.text)}</span>`
    }
  ]});
  window.MarkdownPreview = {
    render(source, element) {
      element.innerHTML = DOMPurify.sanitize(marked.parse(source || '', {gfm: true}), {ADD_TAGS: ['video', 'source'], ADD_ATTR: ['controls', 'playsinline', 'preload']});
      SiteMath.render(element);
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const source = document.getElementById('page-markdown-source');
    const content = document.querySelector('.page__content');
    if (source && content) {
      try {
        const markdown = JSON.parse(source.textContent).replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, '');
        MarkdownPreview.render(markdown, content);
      }
      catch (error) { console.warn('Markdown enhancement unavailable; keeping Jekyll content.', error); }
    }
  });
})();
