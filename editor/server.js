#!/usr/bin/env node
/**
 * A dependency-free local editor for this Jekyll site.
 * It deliberately listens only on 127.0.0.1: it is a desktop tool, not a
 * public CMS.
 */
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, '_posts');
const configPath = path.join(root, '_config.yml');
const aboutPath = path.join(root, '_pages', 'about.md');
const navigationPath = path.join(root, '_data', 'navigation.yml');
const port = Number(process.env.EDITOR_PORT || 4310);

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function normaliseDate(value) {
  const match = asText(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  if (candidate.getFullYear() !== Number(year) || candidate.getMonth() !== Number(month) - 1 || candidate.getDate() !== Number(day)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function send(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function sendLocalAsset(res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const assetRoot = path.resolve(root, 'assets', 'images');
  const file = path.resolve(root, `.${decoded}`);
  if (!file.startsWith(`${assetRoot}${path.sep}`)) throw new Error('无效的本地资源路径。');
  const extension = path.extname(file).toLowerCase();
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  if (!types[extension]) throw new Error('不支持的图片格式。');
  const contents = await fs.readFile(file);
  res.writeHead(200, { 'Content-Type': types[extension], 'Cache-Control': 'no-store' });
  res.end(contents);
}

function safeFileName(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._ -]*\.md$/.test(value) && !value.includes('..');
}

function asText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : '';
}

function parsePost(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { title: '', lastModifiedAt: '', categories: [], tags: [], body: raw };
  const frontMatter = match[1];
  const read = (key) => (frontMatter.match(new RegExp(`^${key}:\\s*[\\\"']?([^\\n\\\"']*)`, 'm')) || [, ''])[1].trim();
  const list = (key) => {
    const block = frontMatter.match(new RegExp(`^${key}:\\s*\\n((?:^[ \\t]+-.*(?:\\n|$))*)`, 'm'));
    return block ? [...block[1].matchAll(/^\s*-\s*(.+?)\s*$/gm)].map((m) => m[1]) : [];
  };
  return { title: read('title'), lastModifiedAt: normaliseDate(read('last_modified_at')), categories: list('categories'), tags: list('tags'), body: match[2] };
}

function yamlValue(value) {
  const trimmed = asText(value).trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
  }
  return trimmed.replace(/^'|'$/g, '');
}

function readYamlLine(raw, expression) {
  const match = raw.match(expression);
  return match ? yamlValue(match[1]) : '';
}

function replaceYamlLine(raw, expression, replacement, missingMessage) {
  if (!expression.test(raw)) throw new Error(missingMessage);
  return raw.replace(expression, replacement);
}

function parseNavigation(raw) {
  return [...raw.matchAll(/^\s*-\s*title:\s*(.+)\r?\n\s*url:\s*(.+)$/gm)].map((match) => ({
    title: yamlValue(match[1]), url: yamlValue(match[2]),
  }));
}

function navigationMarkdown(items) {
  const cleaned = (Array.isArray(items) ? items : []).map((item) => ({
    title: asText(item.title).trim(), url: asText(item.url).trim(),
  })).filter((item) => item.title && item.url);
  if (!cleaned.length) throw new Error('请至少保留一个导航项目。');
  return `main:\n${cleaned.map((item) => `  - title: ${JSON.stringify(item.title)}\n    url: ${JSON.stringify(item.url)}`).join('\n')}`;
}

async function siteData() {
  const [config, about, navigation] = await Promise.all([
    fs.readFile(configPath, 'utf8'), fs.readFile(aboutPath, 'utf8'), fs.readFile(navigationPath, 'utf8'),
  ]);
  return {
    profile: {
      siteTitle: readYamlLine(config, /^title\s*:\s*(.+)$/m),
      name: readYamlLine(config, /^  name\s*:\s*(.+)$/m),
      avatar: readYamlLine(config, /^  avatar\s*:\s*(.+)$/m),
      bio: readYamlLine(config, /^  bio\s*:\s*(.+)$/m),
    },
    about: { title: parsePost(about).title || 'About', body: parsePost(about).body },
    navigation: parseNavigation(navigation),
  };
}

function postMarkdown(post) {
  const title = asText(post.title).trim();
  if (!title) throw new Error('请填写标题。');
  const date = normaliseDate(post.lastModifiedAt) || today();
  const list = (items) => (Array.isArray(items) ? items : [])
    .map((item) => asText(item).trim()).filter(Boolean).map((item) => `  - ${item}`).join('\n');
  return `---\ntitle: ${JSON.stringify(title)}\nlast_modified_at: ${date}\ncategories:\n${list(post.categories) || '  - Blog'}\ntags:\n${list(post.tags) || '  - Casual'}\n---\n\n${asText(post.body).replace(/^\n+/, '')}`;
}

function slugify(title) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return slug || `post-${Date.now()}`;
}

function postDateFromFile(file) {
  const match = file.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:-|\s|\.)/);
  if (!match) return '';
  return normaliseDate(`${match[1]}-${match[2]}-${match[3]}`);
}

async function readRequest(req) {
  let body = '';
  for await (const part of req) {
    body += part;
    if (body.length > 2_000_000) throw new Error('内容过大。');
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('请求格式无效。'); }
}

async function git(args) {
  return run('git', args, { cwd: root, timeout: 60_000, windowsHide: true, maxBuffer: 1_000_000 });
}

async function hasStagedChanges(relative) {
  try {
    await git(['diff', '--cached', '--quiet', '--', relative]);
    return false;
  } catch (error) {
    // Git uses exit code 1 to say that a diff exists; other failures still
    // need to be surfaced to the editor.
    if (error && Number(error.code) === 1) return true;
    throw error;
  }
}

async function saveTextAndPublish(relative, text, message) {
  await fs.writeFile(path.join(root, relative), text, 'utf8');
  await git(['add', '--', relative]);
  if (!await hasStagedChanges(relative)) return { published: false, message: '内容没有变化，无需提交或推送。' };
  await git(['commit', '--only', '-m', message, '--', relative]);
  await git(['push']);
  return { published: true, message: '已保存、提交并推送。' };
}

async function saveProfile(profile) {
  let config = await fs.readFile(configPath, 'utf8');
  const values = {
    siteTitle: asText(profile.siteTitle).trim(), name: asText(profile.name).trim(),
    avatar: asText(profile.avatar).trim(), bio: asText(profile.bio).trim(),
  };
  if (!values.siteTitle || !values.name || !values.bio) throw new Error('网站标题、姓名和简介不能为空。');
  config = replaceYamlLine(config, /^title\s*:\s*.*$/m, `title: ${JSON.stringify(values.siteTitle)}`, '未找到网站标题。');
  config = replaceYamlLine(config, /^  name\s*:\s*.*$/m, `  name: ${JSON.stringify(values.name)}`, '未找到作者姓名。');
  config = replaceYamlLine(config, /^  avatar\s*:\s*.*$/m, `  avatar: ${JSON.stringify(values.avatar)}`, '未找到头像设置。');
  config = replaceYamlLine(config, /^  bio\s*:\s*.*$/m, `  bio: ${JSON.stringify(values.bio)}`, '未找到简介设置。');
  return saveTextAndPublish('_config.yml', config, 'Update site profile');
}

async function saveAbout(about) {
  const title = asText(about.title).trim();
  if (!title) throw new Error('请填写 About 标题。');
  const original = await fs.readFile(aboutPath, 'utf8');
  const match = original.match(/^---\s*\n([\s\S]*?)\n---\s*\n?[\s\S]*$/);
  if (!match) throw new Error('About 页面格式无效。');
  const frontMatter = replaceYamlLine(match[1], /^title\s*:\s*.*$/m, `title: ${JSON.stringify(title)}`, '未找到 About 标题。');
  return saveTextAndPublish('_pages/about.md', `---\n${frontMatter}\n---\n\n${asText(about.body).replace(/^\n+/, '')}`, 'Update about page');
}

async function listPosts() {
  const files = (await fs.readdir(postsDir)).filter(safeFileName).sort((a, b) => {
    // Article order follows the date encoded in the Jekyll filename, rather
    // than lexical ordering (which puts e.g. "2026-2" after "2026-12").
    return postDateFromFile(b).localeCompare(postDateFromFile(a)) || b.localeCompare(a);
  });
  return Promise.all(files.map(async (file) => {
    const raw = await fs.readFile(path.join(postsDir, file), 'utf8');
    const post = parsePost(raw);
    return { file, title: post.title || file, diaryDate: postDateFromFile(file), lastModifiedAt: post.lastModifiedAt, preview: post.body.replace(/\s+/g, ' ').slice(0, 110) };
  }));
}

async function saveAndPublish(file, post) {
  const relative = path.posix.join('_posts', file);
  // `last_modified_at` is deliberately maintained by the editor, rather than
  // relying on a manually entered date that easily becomes stale.
  await fs.writeFile(path.join(postsDir, file), postMarkdown({ ...post, lastModifiedAt: today() }), 'utf8');
  await git(['add', '--', relative]);
  if (!await hasStagedChanges(relative)) {
    return { published: false, message: '内容没有变化，无需提交或推送。' };
  }
  const message = `Publish: ${asText(post.title).trim().replace(/[\r\n]+/g, ' ').slice(0, 72)}`;
  await git(['commit', '--only', '-m', message, '--', relative]);
  await git(['push']);
  return { published: true, message: '已保存、提交并推送。' };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname.startsWith('/assets/images/')) return sendLocalAsset(res, url.pathname);
    if (req.method === 'GET' && url.pathname === '/api/site') return send(res, 200, await siteData());
    if (req.method === 'POST' && url.pathname === '/api/profile') return send(res, 200, await saveProfile(await readRequest(req)));
    if (req.method === 'POST' && url.pathname === '/api/about') return send(res, 200, await saveAbout(await readRequest(req)));
    if (req.method === 'POST' && url.pathname === '/api/navigation') {
      const data = await readRequest(req);
      return send(res, 200, await saveTextAndPublish('_data/navigation.yml', navigationMarkdown(data.items), 'Update site navigation'));
    }
    if (req.method === 'GET' && url.pathname === '/api/posts') return send(res, 200, { posts: await listPosts() });
    if (req.method === 'GET' && url.pathname.startsWith('/api/posts/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/posts/'.length));
      if (!safeFileName(file)) return send(res, 400, { error: '无效的文章文件名。' });
      const raw = await fs.readFile(path.join(postsDir, file), 'utf8');
      return send(res, 200, { file, diaryDate: postDateFromFile(file), ...parsePost(raw) });
    }
    if (req.method === 'POST' && url.pathname === '/api/posts') {
      const post = await readRequest(req);
      const date = normaliseDate(post.diaryDate) || today();
      let file = `${date}-${slugify(asText(post.title))}.md`;
      let suffix = 2;
      while (true) {
        try { await fs.access(path.join(postsDir, file)); file = `${date}-${slugify(asText(post.title))}-${suffix++}.md`; }
        catch { break; }
      }
      const result = await saveAndPublish(file, { ...post, lastModifiedAt: date });
      return send(res, 201, { file, ...result });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/posts/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/posts/'.length));
      if (!safeFileName(file)) return send(res, 400, { error: '无效的文章文件名。' });
      const result = await saveAndPublish(file, await readRequest(req));
      return send(res, 200, { file, ...result });
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/posts/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/posts/'.length));
      if (!safeFileName(file)) return send(res, 400, { error: '无效的文章文件名。' });
      const relative = path.posix.join('_posts', file);
      await git(['rm', '--', relative]);
      await git(['commit', '--only', '-m', `Delete post: ${file}`, '--', relative]);
      await git(['push']);
      return send(res, 200, { published: true, message: '文章已删除、提交并推送。' });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(await fs.readFile(path.join(__dirname, 'index.html')));
    }
    send(res, 404, { error: '未找到。' });
  } catch (error) {
    const details = `${error.stderr || ''}${error.stdout || ''}`.trim();
    send(res, 500, { error: error.message || '操作失败。', details });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Editor ready: http://127.0.0.1:${port}`);
});
