/* ============================================
   SAUMYA SHUKLA — Recipe Editor
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('recipe-editor-content');
  const titleInput = document.getElementById('recipe-title');
  const descInput = document.getElementById('recipe-desc');
  const ingredientInput = document.getElementById('ingredient-field');
  const addIngredientBtn = document.getElementById('add-ingredient');
  const chipsContainer = document.getElementById('ingredient-chips-editor');
  const toolbar = document.querySelector('.editor__toolbar');

  if (!content || !toolbar) return;

  let ingredients = [];

  /* --- Ingredient chip management --- */
  function renderChips() {
    chipsContainer.innerHTML = ingredients.map((ing, i) =>
      `<span class="ingredient-chip">${escapeHtml(ing)}<button class="ingredient-chip__remove" data-idx="${i}">&times;</button></span>`
    ).join('');

    chipsContainer.querySelectorAll('.ingredient-chip__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        ingredients.splice(parseInt(btn.dataset.idx), 1);
        renderChips();
      });
    });
  }

  function addIngredient() {
    const val = ingredientInput.value.trim().toLowerCase();
    if (val && !ingredients.includes(val)) {
      ingredients.push(val);
      renderChips();
    }
    ingredientInput.value = '';
    ingredientInput.focus();
  }

  addIngredientBtn.addEventListener('click', addIngredient);
  ingredientInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  });

  /* --- Toolbar commands --- */
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    e.preventDefault();
    content.focus();

    const cmd = btn.dataset.cmd;
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
      case 'hr':
        document.execCommand('insertHorizontalRule');
        break;
      default:
        document.execCommand(cmd, false, null);
    }
    updateToolbarState();
  });

  function updateToolbarState() {
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].includes(cmd)) {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }
    });
  }

  content.addEventListener('keyup', updateToolbarState);
  content.addEventListener('mouseup', updateToolbarState);

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
      }
      updateToolbarState();
    }
  });

  /* --- Save / Load drafts --- */
  const STORAGE_KEY = 'saumya_recipe_drafts';

  function getDrafts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function saveDraftsToStorage(drafts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }

  const saveBtn = document.getElementById('save-recipe-draft');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled Recipe';
      const desc = descInput.value.trim();
      const body = content.innerHTML;
      const drafts = getDrafts();

      const editingId = content.dataset.draftId;
      if (editingId) {
        const idx = drafts.findIndex(d => d.id === editingId);
        if (idx > -1) {
          drafts[idx] = { ...drafts[idx], title, desc, ingredients: [...ingredients], body, updatedAt: new Date().toISOString() };
          saveDraftsToStorage(drafts);
          showToast('Draft updated');
          renderDrafts();
          return;
        }
      }

      const draft = {
        id: Date.now().toString(36),
        title, desc, ingredients: [...ingredients], body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      drafts.unshift(draft);
      saveDraftsToStorage(drafts);
      content.dataset.draftId = draft.id;
      showToast('Draft saved');
      renderDrafts();
    });
  }

  /* --- Export as HTML --- */
  const exportBtn = document.getElementById('export-recipe');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled Recipe';
      const desc = descInput.value.trim();
      const body = content.innerHTML;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const html = generateRecipeHTML(title, desc, ingredients, body, slug);

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.html`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Recipe exported as HTML');
    });
  }

  /* --- Preview --- */
  const previewBtn = document.getElementById('preview-recipe');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const title = titleInput.value.trim() || 'Untitled Recipe';
      const desc = descInput.value.trim();
      const body = content.innerHTML;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const html = generateRecipeHTML(title, desc, ingredients, body, slug);
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
    });
  }

  /* --- Clear --- */
  const clearBtn = document.getElementById('clear-recipe-editor');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear the editor? Unsaved changes will be lost.')) {
        titleInput.value = '';
        descInput.value = '';
        content.innerHTML = '';
        ingredients = [];
        renderChips();
        delete content.dataset.draftId;
        showToast('Editor cleared');
      }
    });
  }

  /* --- Render drafts --- */
  function renderDrafts() {
    const list = document.getElementById('recipe-drafts-list');
    if (!list) return;
    const drafts = getDrafts();
    const container = list.closest('.drafts');

    if (drafts.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    if (container) container.style.display = '';
    list.innerHTML = drafts.map(d => {
      const date = new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    list.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => loadDraft(btn.dataset.load));
    });
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => { if (confirm('Delete this draft?')) deleteDraft(btn.dataset.delete); });
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
    descInput.value = draft.desc || '';
    content.innerHTML = draft.body;
    ingredients = [...(draft.ingredients || [])];
    renderChips();
    content.dataset.draftId = draft.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Draft loaded');
  }

  function deleteDraft(id) {
    let drafts = getDrafts().filter(d => d.id !== id);
    saveDraftsToStorage(drafts);
    if (content.dataset.draftId === id) delete content.dataset.draftId;
    renderDrafts();
    showToast('Draft deleted');
  }

  /* --- Generate recipe HTML --- */
  function generateRecipeHTML(title, desc, ings, body, slug) {
    const chipsHtml = ings.map(i => `<span class="recipe-header__chip">${escapeHtml(i)}</span>`).join('\n      ');
    const descHtml = desc ? `<p class="recipe-header__desc">${escapeHtml(desc)}</p>` : '';

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

  <header class="recipe-header container">
    <h1 class="recipe-header__title">${escapeHtml(title)}</h1>
    ${descHtml}
    <div class="recipe-header__chips">
      ${chipsHtml}
    </div>
  </header>

  <article class="recipe-content">
    ${body}
    <div style="margin-top: 2.5rem; text-align: center;">
      <div data-lyket-type="like" data-lyket-id="${slug}" data-lyket-namespace="recipes"></div>
    </div>
  </article>

  <nav class="post-nav container">
    <a href="../recipes.html">&larr; All Recipes</a>
    <span></span>
  </nav>

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
  <script src="https://unpkg.com/@lyket/widget@latest/dist/lyket.js?apiKey=pt_6d7c4185902c012840bc9c1ef0afad"><\/script>
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

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  // Init
  renderChips();
  renderDrafts();
});
