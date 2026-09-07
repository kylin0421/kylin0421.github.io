let mediaBusy = false;

function renderMediaPreview() {
  const container = document.querySelector('#media-preview-items');
  if (!container || !activePost) return;
  const urls = [...new Set(activePost.body.match(/\/assets\/(?:media|images)\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|gif|webp|mp4|webm)\b/gi) || [])];
  if (container.dataset.urls === JSON.stringify(urls)) return;
  container.dataset.urls = JSON.stringify(urls);
  container.replaceChildren();
  if (!urls.length) { container.textContent = '插入图片或视频后，可以在这里查看、播放。'; return; }
  for (const url of urls) {
    const video = /\.(mp4|webm)$/i.test(url);
    const figure = document.createElement('figure');
    const media = document.createElement(video ? 'video' : 'img');
    media.src = url;
    if (video) { media.controls = true; media.preload = 'metadata'; media.playsInline = true; }
    else { media.alt = '文章图片'; media.loading = 'lazy'; }
    const caption = document.createElement('figcaption');
    caption.textContent = video ? '视频 · 可直接播放预览' : '图片 · 发布后自适应页面宽度';
    media.onerror = () => { caption.textContent = '无法预览：请确认文件存在，视频编码推荐 H.264 MP4 或 WebM。'; };
    figure.append(media, caption);
    container.append(figure);
  }
}

function uploadFile(file, progress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media?name=' + encodeURIComponent(file.name));
    xhr.setRequestHeader('X-Editor-Upload', '1');
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress.value = event.loaded / event.total * 100; };
    xhr.onerror = () => reject(new Error('上传连接中断，请重试。'));
    xhr.timeout = 120000;
    xhr.ontimeout = () => reject(new Error('上传超时，请重试。'));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(data.error || '上传失败。'));
        else resolve(data);
      } catch { reject(new Error('上传失败：服务器响应无效。')); }
    };
    xhr.send(file);
  });
}

async function insertMedia(files) {
  if (mediaBusy || !activePost || !files.length) return;
  const body = document.querySelector('#post-body');
  const progress = document.querySelector('#upload-progress');
  const disabled = [...document.querySelectorAll('button, input, textarea')].map(el => [el, el.disabled]);
  mediaBusy = true;
  clearTimeout(draftTimer);
  disabled.forEach(([el]) => { el.disabled = true; });
  progress.hidden = false;
  let inserted = 0;
  try {
    for (const file of files) {
      if (!/\.(jpe?g|png|gif|webp|mp4|webm)$/i.test(file.name)) throw new Error(`${file.name}：请选择 JPG、PNG、GIF、WebP、MP4 或 WebM。`);
      if (!file.size || file.size > 50 * 1024 * 1024) throw new Error(`${file.name}：文件不能为空，也不能超过 50 MB。`);
      progress.value = 0;
      setStatus(`正在上传 ${inserted + 1}/${files.length}：${file.name}`);
      const media = await uploadFile(file, progress);
      const label = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]<>\\\r\n]/g, '').replace(/\{/g, '').replace(/\}/g, '');
      const snippet = media.type.startsWith('video/')
        ? `<video controls playsinline preload="metadata" style="width:100%;max-width:100%;height:auto" src="${media.url}">您的浏览器不支持视频播放。<a href="${media.url}">下载视频</a></video>`
        : `![${label}](${media.url})`;
      body.setRangeText(`\n\n${snippet}\n\n`, body.selectionStart, body.selectionEnd, 'end');
      activePost.body = body.value;
      persistDraft();
      renderMediaPreview();
      inserted++;
    }
    setStatus(`已插入 ${inserted} 个文件并保存本机草稿；点击“保存并发布”后上线。`, 'success');
  } catch (error) {
    setStatus(`${inserted ? `已插入 ${inserted} 个文件。` : ''}${error.message}`, 'error');
  } finally {
    mediaBusy = false;
    progress.hidden = true;
    disabled.forEach(([el, wasDisabled]) => { el.disabled = wasDisabled; });
    body.focus();
  }
}

function bindMedia() {
  for (const [button, input] of [['insert-image', 'image-files'], ['insert-video', 'video-files']]) {
    const picker = document.getElementById(input);
    document.getElementById(button).onclick = () => picker.click();
    picker.onchange = () => { const files = [...picker.files]; picker.value = ''; insertMedia(files); };
  }
  const body = document.getElementById('post-body');
  body.addEventListener('dragover', event => { event.preventDefault(); body.classList.add('drag-over'); });
  body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
  body.addEventListener('drop', event => {
    event.preventDefault(); body.classList.remove('drag-over'); insertMedia([...event.dataTransfer.files]);
  });
  body.addEventListener('paste', event => {
    const files = [...event.clipboardData.files];
    if (files.length) { event.preventDefault(); insertMedia(files); }
  });
  renderMediaPreview();
}

window.addEventListener('beforeunload', event => {
  if (mediaBusy) { event.preventDefault(); event.returnValue = ''; }
  else persistDraft();
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (view === 'edit' && !mediaBusy) savePost();
  }
});
