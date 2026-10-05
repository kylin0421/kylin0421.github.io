(function () {
  function mount(root) {
    const search = root.querySelector('[data-notebook-search]');
    const sort = root.querySelector('[data-notebook-sort]');
    const list = root.querySelector('[data-notebook-list]');
    const cards = [...root.querySelectorAll('[data-notebook-card]')].map((element, index) => {
      let tags = [];
      try { tags = JSON.parse(element.dataset.tags || '[]'); } catch {}
      return {element, index, tags, title:element.dataset.title || '', date:element.dataset.date || '', text:[element.dataset.title,element.dataset.search,...tags].join(' ').toLocaleLowerCase()};
    });
    const tags = [...new Set(cards.flatMap(card => card.tags))].sort((a,b) => a.localeCompare(b));
    const syncUrl = root.dataset.syncUrl !== 'false';
    const params = new URLSearchParams(syncUrl ? location.search : '');
    let selected = tags.find(tag => tag.toLowerCase() === (params.get('tag') || '').toLowerCase()) || '';
    search.value = params.get('q') || '';
    sort.value = ['newest','oldest','title'].includes(params.get('sort')) ? params.get('sort') : 'newest';
    const container = root.querySelector('[data-notebook-tags]');
    const buttons = ['', ...tags].map(tag => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tag-filter';
      button.textContent = tag ? `${tag} · ${cards.filter(card => card.tags.includes(tag)).length}` : `All · ${cards.length}`;
      button.onclick = () => {selected = tag; update();};
      container.append(button);
      return {button, tag};
    });
    function update() {
      const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const sorted = [...cards].sort((a,b) => {
        if (sort.value === 'title') return a.title.localeCompare(b.title) || a.index-b.index;
        return (sort.value === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.index-b.index;
      });
      let visible = 0;
      sorted.forEach(card => {
        card.element.hidden = Boolean((selected && !card.tags.includes(selected)) || !terms.every(term => card.text.includes(term)));
        if (!card.element.hidden) visible++;
        list.append(card.element);
      });
      buttons.forEach(({button,tag}) => {button.classList.toggle('active',tag === selected);button.setAttribute('aria-pressed',String(tag === selected));});
      root.querySelector('[data-notebook-count]').textContent = `${visible} / ${cards.length} notes${selected ? ' · '+selected : ''}`;
      root.querySelector('[data-notebook-empty]').hidden = visible !== 0;
      if (syncUrl) {
        const url = new URL(location.href);
        [['tag',selected],['q',search.value.trim()],['sort',sort.value === 'newest' ? '' : sort.value]].forEach(([key,value]) => value ? url.searchParams.set(key,value) : url.searchParams.delete(key));
        history.replaceState(null,'',url);
      }
    }
    search.addEventListener('input',update); sort.addEventListener('change',update); update();
  }
  window.Notebook = {mount};
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-notebook]').forEach(mount));
})();
