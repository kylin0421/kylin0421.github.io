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
const port = Number(process.env.EDITOR_PORT || 4310);

function send(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
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
  return { title: read('title'), lastModifiedAt: read('last_modified_at'), categories: list('categories'), tags: list('tags'), body: match[2] };
}

function postMarkdown(post) {
  const title = asText(post.title).trim();
  if (!title) throw new Error('请填写标题。');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(post.lastModifiedAt) ? post.lastModifiedAt : new Date().toISOString().slice(0, 10);
  const list = (items) => (Array.isArray(items) ? items : [])
    .map((item) => asText(item).trim()).filter(Boolean).map((item) => `  - ${item}`).join('\n');
  return `---\ntitle: ${JSON.stringify(title)}\nlast_modified_at: ${date}\ncategories:\n${list(post.categories) || '  - Blog'}\ntags:\n${list(post.tags) || '  - Casual'}\n---\n\n${asText(post.body).replace(/^\n+/, '')}`;
}

function slugify(title) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return slug || `post-${Date.now()}`;
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

async function listPosts() {
  const files = (await fs.readdir(postsDir)).filter(safeFileName).sort().reverse();
  return Promise.all(files.map(async (file) => {
    const raw = await fs.readFile(path.join(postsDir, file), 'utf8');
    const post = parsePost(raw);
    return { file, title: post.title || file, lastModifiedAt: post.lastModifiedAt, preview: post.body.replace(/\s+/g, ' ').slice(0, 110) };
  }));
}

async function saveAndPublish(file, post) {
  const relative = path.posix.join('_posts', file);
  await fs.writeFile(path.join(postsDir, file), postMarkdown(post), 'utf8');
  await git(['add', '--', relative]);
  const message = `Publish: ${asText(post.title).trim().replace(/[\r\n]+/g, ' ').slice(0, 72)}`;
  await git(['commit', '--only', '-m', message, '--', relative]);
  const pushed = await git(['push']);
  return `${(pushed.stdout || '').trim() || '已推送到 origin。'}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/api/posts') return send(res, 200, { posts: await listPosts() });
    if (req.method === 'GET' && url.pathname.startsWith('/api/posts/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/posts/'.length));
      if (!safeFileName(file)) return send(res, 400, { error: '无效的文章文件名。' });
      const raw = await fs.readFile(path.join(postsDir, file), 'utf8');
      return send(res, 200, { file, ...parsePost(raw) });
    }
    if (req.method === 'POST' && url.pathname === '/api/posts') {
      const post = await readRequest(req);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(post.lastModifiedAt) ? post.lastModifiedAt : new Date().toISOString().slice(0, 10);
      let file = `${date}-${slugify(asText(post.title))}.md`;
      let suffix = 2;
      while (true) {
        try { await fs.access(path.join(postsDir, file)); file = `${date}-${slugify(asText(post.title))}-${suffix++}.md`; }
        catch { break; }
      }
      const message = await saveAndPublish(file, { ...post, lastModifiedAt: date });
      return send(res, 201, { file, message });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/posts/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/posts/'.length));
      if (!safeFileName(file)) return send(res, 400, { error: '无效的文章文件名。' });
      const message = await saveAndPublish(file, await readRequest(req));
      return send(res, 200, { file, message });
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
