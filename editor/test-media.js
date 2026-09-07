// Integration checks run entirely in a temporary repository with a local remote.
const { mkdtemp, mkdir, cp, writeFile, readFile } = require('fs/promises');
const { tmpdir } = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const assert = require('node:assert/strict');

(async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'blog-media-test-'));
  const repo = path.join(temp, 'site');
  await mkdir(repo);
  const source = path.resolve(__dirname, '..');
  for (const entry of ['editor', '_pages', '_data', '_config.yml', 'assets', '_includes']) {
    await cp(path.join(source, entry), path.join(repo, entry), { recursive: true });
  }
  await mkdir(path.join(repo, '_posts'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('config', 'user.name', 'Editor Test'); git('config', 'user.email', 'test@example.invalid');
  git('add', '.'); git('commit', '-m', 'Baseline');
  git('init', '--bare', path.join(temp, 'remote.git'));
  git('remote', 'add', 'origin', path.join(temp, 'remote.git')); git('push', '-u', 'origin', 'main');
  const server = spawn(process.execPath, ['editor/server.js'], { cwd: repo, env: { ...process.env, EDITOR_PORT: '0', EDITOR_OPEN_BROWSER: '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 10000);
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
      server.stdout.on('data', chunk => { const match = String(chunk).match(/Editor ready: (http:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=', 'base64');
    const upload = (name, bytes, headers = {}) => fetch(`${base}/api/media?name=${encodeURIComponent(name)}`, { method: 'POST', headers: { 'X-Editor-Upload': '1', ...headers }, body: bytes });
    let response = await upload('image.png', png);
    assert.equal(response.status, 201); const image = await response.json();
    const duplicate = await (await upload('image.png', png)).json(); assert.notEqual(image.url, duplicate.url);
    assert.equal((await upload('bad.png', Buffer.from('not an image'))).status, 400);
    assert.equal((await upload('script.html', png)).status, 400);
    assert.equal((await upload('image.png', png, { Origin: 'https://untrusted.invalid' })).status, 403);
    const video = await (await upload('clip.mp4', Buffer.from('000000186674797069736f6d0000000069736f6d6d703432', 'hex'))).json();
    response = await fetch(base + video.url, { headers: { Range: 'bytes=4-7' } });
    assert.equal(response.status, 206); assert.equal(await response.text(), 'ftyp');
    assert.equal((await fetch(base + video.url, { headers: { Range: 'bytes=99999-' } })).status, 416);
    response = await fetch(base + image.url); assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    await writeFile(path.join(repo, 'unrelated.txt'), 'Do not publish'); git('add', 'unrelated.txt');
    const body = `![Image](${image.url})\n\n<video controls src="${video.url}"></video>`;
    response = await fetch(base + '/api/posts', { method: 'POST', body: JSON.stringify({ title: 'Media test', body, diaryDate: '2026-09-07' }) });
    const published = await response.json(); assert.equal(response.status, 201, JSON.stringify(published)); assert.equal(published.published, true);
    const committed = git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').sort();
    assert.deepEqual(committed, [`_posts/${published.file}`, image.url.slice(1), video.url.slice(1)].sort());
    assert.equal(git('diff', '--cached', '--name-only'), 'unrelated.txt');
    assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'));
    const missing = await fetch(base + '/api/posts/' + published.file, { method: 'POST', body: JSON.stringify({ title: 'Missing', body: '![x](/assets/media/missing.png)' }) });
    assert.equal(missing.status, 400);
    assert.match(await readFile(path.join(repo, '_posts', published.file), 'utf8'), /Media test/);
    console.log('PASS: uploads, format checks, origin checks, unique names, media reads, video ranges, isolated commit/push, missing references.');
    if (process.env.KEEP_EDITOR_TEST === '1') {
      console.log(`UI test server: ${base}\nUI test repository: ${repo}`);
      await new Promise(resolve => server.once('exit', resolve));
    }
  } finally { server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
