/* ============================================
   SAUMYA SHUKLA — Blog Editor
   Medium-like rich text editor
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('editor-content');
  const titleInput = document.getElementById('editor-title');
  const tagInput = document.getElementById('editor-tag');
  const wordCount = document.getElementById('word-count');
  const toolbar = document.querySelector('.editor__toolbar');

  if (!content || !toolbar) return;

  /* --- Toolbar commands --- */
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    e.preventDefault();
    content.focus();

    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val || null;

    switch (cmd) {
      case 'h2':
        document.execCommand('formatBlock', false, '<h2>');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, '<h3>');
        break;
      case 'paragraph':
        document.execCommand('formatBlock', false, '<p>');
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, '<blockquote>');
        break;
      case 'code-block':
        insertCodeBlock();
        break;
      case 'link':
        openLinkModal();
        break;
      case 'image':
        openImageModal();
        break;
      case 'hr':
        document.execCommand('insertHorizontalRule');
        break;
      default:
        document.execCommand(cmd, false, val);
    }

    updateToolbarState();
    updateWordCount();
  });

  /* --- Code block insertion --- */
  function insertCodeBlock() {
    const selection = window.getSelection();
    const text = selection.toString() || 'code here';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = text;
    pre.appendChild(code);

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(pre);

    // Move cursor after the code block
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    pre.parentNode.insertBefore(p, pre.nextSibling);
    const newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  /* --- Link modal --- */
  function openLinkModal() {
    const selection = window.getSelection();
    const text = selection.toString();
    const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

    const overlay = document.getElementById('link-modal');
    const urlInput = overlay.querySelector('#link-url');
    const textInput = overlay.querySelector('#link-text');
    const insertBtn = overlay.querySelector('#link-insert');
    const cancelBtn = overlay.querySelector('#link-cancel');

    textInput.value = text;
    urlInput.value = '';
    overlay.classList.add('open');
    urlInput.focus();

    function close() {
      overlay.classList.remove('open');
      insertBtn.removeEventListener('click', insert);
      cancelBtn.removeEventListener('click', close);
    }

    function insert() {
      const url = urlInput.value.trim();
      const linkText = textInput.value.trim() || url;

      if (url && savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);

        const a = document.createElement('a');
        a.href = url;
        a.textContent = linkText;
        a.target = '_blank';

        savedRange.deleteContents();
        savedRange.insertNode(a);

        const range = document.createRange();
        range.setStartAfter(a);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      close();
      content.focus();
    }

    insertBtn.addEventListener('click', insert);
    cancelBtn.addEventListener('click', close);

    // Enter key to insert
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') insert();
    });
  }

  /* --- Image modal --- */
  function openImageModal() {
    const overlay = document.getElementById('image-modal');
    const urlInput = overlay.querySelector('#image-url');
    const altInput = overlay.querySelector('#image-alt');
    const insertBtn = overlay.querySelector('#image-insert');
    const cancelBtn = overlay.querySelector('#image-cancel');

    urlInput.value = '';
    altInput.value = '';
    overlay.classList.add('open');
    urlInput.focus();

    function close() {
      overlay.classList.remove('open');
      insertBtn.removeEventListener('click', insert);
      cancelBtn.removeEventListener('click', close);
    }

    function insert() {
      const url = urlInput.value.trim();
      const alt = altInput.value.trim() || '';

      if (url) {
        document.execCommand('insertHTML', false,
          `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`);
      }
      close();
      content.focus();
    }

    insertBtn.addEventListener('click', insert);
    cancelBtn.addEventListener('click', close);

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') insert();
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* --- Toolbar state --- */
  function updateToolbarState() {
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (['bold', 'italic', 'underline', 'strikeThrough',
           'insertUnorderedList', 'insertOrderedList'].includes(cmd)) {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }
    });
  }

  content.addEventListener('keyup', updateToolbarState);
  content.addEventListener('mouseup', updateToolbarState);

  /* --- Word count --- */
  function updateWordCount() {
    if (!wordCount) return;
    const text = content.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(words / 250));
    wordCount.textContent = `${words} word${words !== 1 ? 's' : ''} · ${readTime} min read`;
  }

  content.addEventListener('input', updateWordCount);
  updateWordCount();

  /* --- Keyboard shortcuts --- */
  content.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          openLinkModal();
          break;
      }
      updateToolbarState();
    }
  });

  /* --- Tab key for code indentation --- */
  content.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const sel = window.getSelection();
      const node = sel.anchorNode;
      if (node && (node.closest && node.closest('pre') || node.parentElement && node.parentElement.closest('pre'))) {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
    }
  });

  /* --- Save / Load drafts --- */
  const STORAGE_KEY = 'saumya_blog_drafts';

  function getDrafts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveDrafts(drafts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }

  // Save draft
  const saveBtn = document.getElementById('save-draft');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled';
      const tags = tagInput.value.trim();
      const body = content.innerHTML;
      const drafts = getDrafts();

      // Check if editing an existing draft
      const editingId = content.dataset.draftId;
      if (editingId) {
        const idx = drafts.findIndex(d => d.id === editingId);
        if (idx > -1) {
          drafts[idx].title = title;
          drafts[idx].tags = tags;
          drafts[idx].body = body;
          drafts[idx].updatedAt = new Date().toISOString();
          saveDrafts(drafts);
          showToast('Draft updated');
          renderDrafts();
          return;
        }
      }

      const draft = {
        id: Date.now().toString(36),
        title,
        tags,
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      drafts.unshift(draft);
      saveDrafts(drafts);
      content.dataset.draftId = draft.id;
      showToast('Draft saved');
      renderDrafts();
    });
  }

  // Export as HTML
  const exportBtn = document.getElementById('export-html');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled';
      const tags = tagInput.value.trim();
      const body = content.innerHTML;
      const date = new Date();
      const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const html = generatePostHTML(title, tags, dateStr, body);

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.html`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Post exported as HTML');
    });
  }

  // Preview
  const previewBtn = document.getElementById('preview-post');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled';
      const tags = tagInput.value.trim();
      const body = content.innerHTML;
      const date = new Date();
      const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const html = generatePostHTML(title, tags, dateStr, body);
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
    });
  }

  // Clear editor
  const clearBtn = document.getElementById('clear-editor');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear the editor? Unsaved changes will be lost.')) {
        titleInput.value = '';
        tagInput.value = '';
        content.innerHTML = '';
        delete content.dataset.draftId;
        updateWordCount();
        showToast('Editor cleared');
      }
    });
  }

  /* --- Render drafts list --- */
  function renderDrafts() {
    const list = document.getElementById('drafts-list');
    if (!list) return;
    const drafts = getDrafts();
    const container = list.closest('.drafts');

    if (drafts.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    if (container) container.style.display = '';
    list.innerHTML = drafts.map(d => {
      const date = new Date(d.updatedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return `
        <li class="drafts__item">
          <div>
            <div class="drafts__item-title" data-id="${d.id}">${escapeHtml(d.title)}</div>
            <div class="drafts__item-date">Last edited ${date}</div>
          </div>
          <div class="drafts__item-actions">
            <button class="btn btn--sm btn--outline" data-load="${d.id}">Edit</button>
            <button class="btn btn--sm btn--outline" data-delete="${d.id}" style="color:var(--muted);border-color:var(--muted);">Delete</button>
          </div>
        </li>
      `;
    }).join('');

    // Bind events
    list.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => loadDraft(btn.dataset.load));
    });

    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this draft?')) {
          deleteDraft(btn.dataset.delete);
        }
      });
    });

    list.querySelectorAll('.drafts__item-title').forEach(el => {
      el.addEventListener('click', () => loadDraft(el.dataset.id));
    });
  }

  function loadDraft(id) {
    const drafts = getDrafts();
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    titleInput.value = draft.title;
    tagInput.value = draft.tags || '';
    content.innerHTML = draft.body;
    content.dataset.draftId = draft.id;
    updateWordCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Draft loaded');
  }

  function deleteDraft(id) {
    let drafts = getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    saveDrafts(drafts);
    if (content.dataset.draftId === id) {
      delete content.dataset.draftId;
    }
    renderDrafts();
    showToast('Draft deleted');
  }

  /* --- Generate post HTML --- */
  function generatePostHTML(title, tags, dateStr, body) {
    const tagHtml = tags ? `<div class="post-header__tag">${escapeHtml(tags)}</div>` : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Saumya Shukla</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <nav class="nav">
    <div class="nav__inner">
      <a href="../index.html" class="nav__logo">Saumya Shukla</a>
      <button class="nav__toggle" aria-label="Menu"><span></span><span></span><span></span></button>
      <ul class="nav__links">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li><a href="../recipes.html">Recipes</a></li>
        <li><a href="../archive.html">Archive</a></li>
      </ul>
    </div>
  </nav>

  <header class="post-header container">
    ${tagHtml}
    <h1 class="post-header__title">${escapeHtml(title)}</h1>
    <div class="post-header__meta">${dateStr}</div>
  </header>

  <article class="post-content">
    ${body}
  </article>

  <footer class="footer">
    <div class="container">
      <div class="footer__name">Saumya Shukla</div>
      <ul class="footer__links">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li><a href="../recipes.html">Recipes</a></li>
        <li><a href="../archive.html">Archive</a></li>
      </ul>
    </div>
  </footer>

  <script src="../js/main.js"><\/script>
</body>
</html>`;
  }

  /* --- Toast --- */
  function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // Init drafts
  renderDrafts();
});
