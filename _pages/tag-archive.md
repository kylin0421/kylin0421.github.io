---
title: "Notebook"
permalink: /tags/
layout: default
---
<p>Tags are now part of the <a href="{{ '/' | relative_url }}#writing">homepage notebook</a>.</p>
<script>
  const tags = [{% for tag in site.tags %}{name:{{ tag[0] | jsonify }},slug:{{ tag[0] | slugify | jsonify }}}{% unless forloop.last %},{% endunless %}{% endfor %}];
  const slug = decodeURIComponent(location.hash.slice(1));
  const tag = tags.find(item => item.slug === slug || item.name === slug);
  location.replace({{ '/' | relative_url | jsonify }} + (tag ? '?tag=' + encodeURIComponent(tag.name) : '') + '#writing');
</script>
