/* Shared by public Jekyll pages and the local editor. */
(function () {
  const libraryUrl = new URL('../vendor/mermaid/mermaid.tiny.js', document.currentScript.src).href;
  const pending = new WeakSet();
  let library;
  let sequence = 0;

  function loadLibrary() {
    if (!library) {
      library = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = libraryUrl;
        script.onload = () => {
          try {
            window.mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'strict',
              suppressErrorRendering: true,
              theme: 'dark',
              fontFamily: 'Arial, sans-serif',
              flowchart: {useMaxWidth: false}
            });
            resolve(window.mermaid);
          } catch (error) { reject(error); }
        };
        script.onerror = () => {
          script.remove();
          library = undefined;
          reject(new Error('Mermaid could not be loaded.'));
        };
        document.head.append(script);
      });
    }
    return library;
  }

  window.SiteMermaid = {
    async render(element) {
      const blocks = [...element.querySelectorAll('pre > code.language-mermaid, pre > code.language-flowchart, pre.language-mermaid > code, pre.language-flowchart > code')];
      await Promise.all(blocks.map(async code => {
        if (pending.has(code)) return;
        pending.add(code);
        const pre = code.parentElement;
        let stage;
        try {
          const mermaid = await loadLibrary();
          // Editor input may have replaced this preview while the library loaded.
          if (!code.isConnected) return;
          stage = document.createElement('div');
          stage.style.cssText = 'position:absolute;left:-100000px;top:0;width:1200px;';
          stage.setAttribute('aria-hidden', 'true');
          document.body.append(stage);
          const {svg} = await mermaid.render('site-mermaid-' + (++sequence), code.textContent, stage);
          if (!code.isConnected) return;
          const diagram = document.createElement('figure');
          diagram.className = 'mermaid-diagram';
          diagram.tabIndex = 0;
          diagram.setAttribute('aria-label', 'Mermaid diagram');
          diagram.innerHTML = svg;
          pre.replaceWith(diagram);
        } catch (error) {
          if (code.isConnected && !pre.nextElementSibling?.classList.contains('mermaid-error')) {
            const notice = document.createElement('p');
            notice.className = 'mermaid-error';
            notice.setAttribute('role', 'status');
            notice.textContent = 'Mermaid diagram unavailable. Source is shown above; check the diagram syntax or reload to retry.';
            pre.after(notice);
          }
          console.warn('Mermaid diagram unavailable; keeping source.', error);
        } finally {
          stage?.remove();
        }
      }));
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.page__content').forEach(element => SiteMermaid.render(element));
  });
})();
