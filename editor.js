/**
 * KrishnaiteEditor — Professional knowledge publishing editor
 * Standalone module. Exposes: KrishnaiteEditor.open(editId?)
 * Requires: state, saveState, renderActiveView from app.js (global scope)
 */

const KrishnaiteEditor = (() => {
  // ── DOM refs (resolved lazily after open()) ──────────────────────────────
  let _editorView, _mainApp, _body, _title, _saveStatus,
      _backBtn, _publishBtn, _draftBtn, _settingsBtn,
      _settingsSidebar, _settingsCloseBtn,
      _postId, _communitySelect, _excerptInput, _tagsInput,
      _pinnedCheckbox, _commentsCheckbox,
      _coverImage, _coverPlaceholder, _coverUrlInput, _coverRemove,
      _coverSliderBox, _coverSlider,
      _floatingToolbar, _slashMenu, _wordCount;

  let _coverUrl = '';
  let _coverY = 50;
  let _autoSaveTimer = null;
  let _lastHash = '';
  let _slashQuery = '';
  let _slashAnchorNode = null;
  let _slashAnchorOffset = 0;
  let _activeSlashIdx = 0;
  let _initialized = false;

  // ── Public API ────────────────────────────────────────────────────────────
  function open(editId = null) {
    _resolve();
    _show();

    if (editId) {
      const post = state.posts.find(p => p.id === editId);
      if (!post) return;
      _postId.value = post.id;
      _title.value = post.title || '';
      _body.innerHTML = post.body || '';
      _communitySelect.value = post.community || 'free';
      _excerptInput.value = post.excerpt || '';
      _tagsInput.value = (post.tags || []).join(', ');
      _pinnedCheckbox.checked = !!post.pinned;
      _commentsCheckbox.checked = post.commentsEnabled !== false;
      _setCover(post.coverImage || '', post.coverY || 50);
      _saveStatus.textContent = 'Editing saved article';
    } else {
      _postId.value = '';
      if (state.editorDraft && state.editorDraft.title) {
        if (confirm('Restore unsaved draft?')) {
          const d = state.editorDraft;
          _title.value = d.title || '';
          _body.innerHTML = d.body || '';
          _communitySelect.value = d.community || 'free';
          _excerptInput.value = d.excerpt || '';
          _tagsInput.value = d.tags || '';
          _pinnedCheckbox.checked = !!d.pinned;
          _commentsCheckbox.checked = d.commentsEnabled !== false;
          _setCover(d.coverImage || '', d.coverY || 50);
          _saveStatus.textContent = 'Draft restored';
        } else {
          _clearInputs();
        }
      } else {
        _clearInputs();
      }
    }

    _autoResize();
    _body.focus();
    _startAutoSave();
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  function _resolve() {
    _editorView        = document.getElementById('editor-view');
    _mainApp           = document.getElementById('main-app-container');
    _body              = document.getElementById('editor-body-input');
    _title             = document.getElementById('editor-title-input');
    _saveStatus        = document.getElementById('editor-save-status');
    _backBtn           = document.getElementById('editor-back-btn');
    _publishBtn        = document.getElementById('editor-publish-btn');
    _draftBtn          = document.getElementById('editor-draft-btn');
    _settingsBtn       = document.getElementById('editor-settings-btn');
    _settingsSidebar   = document.getElementById('editor-settings-sidebar');
    _settingsCloseBtn  = document.getElementById('editor-settings-close-btn');
    _postId            = document.getElementById('editor-post-id');
    _communitySelect   = document.getElementById('editor-community-select');
    _excerptInput      = document.getElementById('editor-excerpt-input');
    _tagsInput         = document.getElementById('editor-tags-input');
    _pinnedCheckbox    = document.getElementById('editor-pinned-checkbox');
    _commentsCheckbox  = document.getElementById('editor-comments-checkbox');
    _coverImage        = document.getElementById('editor-cover-image');
    _coverPlaceholder  = document.getElementById('editor-cover-placeholder');
    _coverUrlInput     = document.getElementById('editor-cover-url-input');
    _coverRemove       = document.getElementById('editor-cover-remove');
    _coverSliderBox    = document.getElementById('cover-slider-box');
    _coverSlider       = document.getElementById('cover-reposition-slider');
    _floatingToolbar   = document.getElementById('floating-toolbar');
    _slashMenu         = document.getElementById('slash-menu');
    _wordCount         = document.getElementById('editor-word-count');

    if (!_initialized) {
      _initialized = true;
      _bindEvents();
    }
  }

  function _show() {
    _mainApp.classList.add('hidden');
    _editorView.classList.remove('hidden');
    _settingsSidebar.classList.remove('open');
    _hideSlashMenu();
    _floatingToolbar.classList.add('hidden');
  }

  function _close() {
    _stopAutoSave();
    _editorView.classList.add('hidden');
    _mainApp.classList.remove('hidden');
    renderActiveView();
  }

  function _clearInputs() {
    _title.value = '';
    _body.innerHTML = '';
    _communitySelect.value = 'free';
    _excerptInput.value = '';
    _tagsInput.value = '';
    _pinnedCheckbox.checked = false;
    _commentsCheckbox.checked = true;
    _setCover('', 50);
    _saveStatus.textContent = 'Draft saved';
  }

  function _setCover(url, y = 50) {
    _coverUrl = url;
    _coverY = y;
    if (url) {
      _coverImage.style.backgroundImage = `url('${url}')`;
      _coverImage.style.backgroundPositionY = `${y}%`;
      _coverImage.style.backgroundSize = 'cover';
      _coverImage.style.backgroundRepeat = 'no-repeat';
      _coverPlaceholder.classList.add('hidden');
      _coverSliderBox.classList.remove('hidden');
      _coverSlider.value = y;
      _coverUrlInput.value = url;
    } else {
      _coverImage.style.backgroundImage = 'none';
      _coverPlaceholder.classList.remove('hidden');
      _coverSliderBox.classList.add('hidden');
      _coverUrlInput.value = '';
    }
  }

  function _autoResize() {
    _title.style.height = 'auto';
    _title.style.height = _title.scrollHeight + 'px';
  }

  function _hash() {
    return _title.value + _body.innerHTML + _coverUrl + _coverY;
  }

  function _saveDraft() {
    state.editorDraft = {
      title: _title.value,
      body: _body.innerHTML,
      community: _communitySelect.value,
      excerpt: _excerptInput.value,
      tags: _tagsInput.value,
      pinned: _pinnedCheckbox.checked,
      commentsEnabled: _commentsCheckbox.checked,
      coverImage: _coverUrl,
      coverY: _coverY
    };
    saveState();
  }

  function _startAutoSave() {
    _stopAutoSave();
    _lastHash = _hash();
    let secsAgo = 0;
    _autoSaveTimer = setInterval(() => {
      if (_editorView.classList.contains('hidden')) return;
      const h = _hash();
      if (h !== _lastHash) {
        _saveDraft();
        _lastHash = h;
        secsAgo = 0;
        _saveStatus.textContent = 'Draft saved just now';
      } else {
        secsAgo += 3;
        if (secsAgo > 3) _saveStatus.textContent = `Last saved ${secsAgo}s ago`;
      }
      _updateWordCount();
    }, 3000);
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
  }

  function _updateWordCount() {
    if (!_wordCount) return;
    const text = _body.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w).length;
    const readMins = Math.max(1, Math.round(words / 200));
    _wordCount.textContent = `${words.toLocaleString()} words · ${readMins} min read`;
  }

  async function _publish(isDraft) {
    const title = _title.value.trim();
    if (!isDraft && !title) {
      alert('Please add a title before publishing.');
      return;
    }

    const body = _body.innerHTML;
    const community = _communitySelect.value;
    const excerpt = _excerptInput.value.trim();
    const tags = _tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const pinned = _pinnedCheckbox.checked;
    const commentsEnabled = _commentsCheckbox.checked;
    const idVal = _postId.value;

    if (pinned) {
      state.posts.forEach(p => { if (p.community === community) p.pinned = false; });
    }

    if (idVal) {
      const idx = state.posts.findIndex(p => p.id === idVal);
      if (idx !== -1) {
        Object.assign(state.posts[idx], { title, body, community, excerpt, tags, pinned, commentsEnabled, coverImage: _coverUrl || null, coverY: parseInt(_coverY) });
      }
    } else {
      const newPost = {
        id: 'post-' + Date.now(), title, body, community, excerpt, tags,
        author: { name: 'Harshita', email: 'founder@krishnaite.dev', avatar: 'assets/founder.png', role: 'founder' },
        createdAt: new Date().toISOString(), pinned, coverImage: _coverUrl || null,
        coverY: parseInt(_coverY), commentsEnabled, likes: [], attachments: [], comments: []
      };
      
      // Real insert to Supabase posts table
      if (window.client) {
        _saveStatus.textContent = 'Publishing to DB...';
        try {
          const { data: { session } } = await window.client.auth.getSession();
          if (session) {
            const { data, error } = await window.client.from("posts").insert([{
              title,
              body,
              community,
              excerpt,
              tags,
              pinned,
              comments_enabled: commentsEnabled,
              cover_image: _coverUrl || null,
              cover_y: parseInt(_coverY),
              author_id: session.user.id,
              likes: [],
              comments: []
            }]);
            console.log("Supabase insert result:", { data, error });
            if (error) {
              console.error("Error inserting post to Supabase:", error);
              alert("Database Error: " + error.message + "\n\nDid you run the SQL script in Supabase dashboard?");
              return;
            }
          }
        } catch (dbErr) {
          console.error("Database connection error:", dbErr);
          alert("Database connection error: " + dbErr.message);
          return;
        }
      }

      state.posts.unshift(newPost);
      if (pinned) {
        state.notifications.unshift({ id: 'notif-' + Date.now(), text: `Founder pinned: **${title}**`, time: 'Just now', unread: true, type: 'announcement' });
      }
    }

    if (!isDraft) state.editorDraft = null;
    saveState();

    if (!isDraft) {
      _saveStatus.textContent = '✅ Published!';
      setTimeout(() => _close(), 600);
    } else {
      _saveStatus.textContent = '💾 Draft saved';
    }
  }

  // ── Paste handler — preserve formatting from any source ───────────────────
  function _handlePaste(e) {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const clean = _sanitizeHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      // Detect markdown-like text and convert
      const converted = _markdownToHtml(text);
      document.execCommand('insertHTML', false, converted);
    }
  }

  function _sanitizeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove dangerous tags
    doc.querySelectorAll('script,style,link,meta,iframe[src*="javascript"],object,embed').forEach(el => el.remove());
    // Clean attributes
    doc.querySelectorAll('[style]').forEach(el => {
      const s = el.getAttribute('style') || '';
      const allowed = s.split(';').filter(rule => {
        const prop = rule.split(':')[0]?.trim().toLowerCase();
        return ['font-weight','font-style','text-decoration','color','background-color'].includes(prop);
      }).join(';');
      if (allowed) el.setAttribute('style', allowed);
      else el.removeAttribute('style');
    });
    // Convert Google Docs spans to semantic HTML
    doc.querySelectorAll('span[style*="font-weight:700"], span[style*="font-weight: 700"], span[style*="font-weight:bold"]').forEach(span => {
      const b = document.createElement('strong');
      b.innerHTML = span.innerHTML;
      span.replaceWith(b);
    });
    doc.querySelectorAll('span[style*="font-style:italic"], span[style*="font-style: italic"]').forEach(span => {
      const em = document.createElement('em');
      em.innerHTML = span.innerHTML;
      span.replaceWith(em);
    });
    return doc.body.innerHTML;
  }

  function _markdownToHtml(text) {
    const lines = text.split('\n');
    let html = '';
    let inCode = false;
    let inList = false;
    let inOList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Fenced code blocks
      if (line.startsWith('```')) {
        if (inCode) { html += '</pre>'; inCode = false; }
        else { html += '<pre>'; inCode = true; }
        continue;
      }
      if (inCode) { html += _esc(line) + '\n'; continue; }

      // Close open lists
      if (inList && !line.match(/^[-*+] /)) { html += '</ul>'; inList = false; }
      if (inOList && !line.match(/^\d+\. /)) { html += '</ol>'; inOList = false; }

      if (!line.trim()) { html += '<p><br></p>'; continue; }

      if (line.startsWith('#### ')) { html += `<h4>${_inlineFormat(line.slice(5))}</h4>`; }
      else if (line.startsWith('### ')) { html += `<h3>${_inlineFormat(line.slice(4))}</h3>`; }
      else if (line.startsWith('## ')) { html += `<h2>${_inlineFormat(line.slice(3))}</h2>`; }
      else if (line.startsWith('# ')) { html += `<h1>${_inlineFormat(line.slice(2))}</h1>`; }
      else if (line.startsWith('> ')) { html += `<blockquote>${_inlineFormat(line.slice(2))}</blockquote>`; }
      else if (line.startsWith('---') || line.startsWith('===')) { html += `<hr style="border:none;border-top:1px solid var(--border);margin:20px 0;">`; }
      else if (line.match(/^[-*+] /)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${_inlineFormat(line.replace(/^[-*+] /, ''))}</li>`;
      }
      else if (line.match(/^\d+\. /)) {
        if (!inOList) { html += '<ol>'; inOList = true; }
        html += `<li>${_inlineFormat(line.replace(/^\d+\. /, ''))}</li>`;
      }
      else { html += `<p>${_inlineFormat(line)}</p>`; }
    }

    if (inList) html += '</ul>';
    if (inOList) html += '</ol>';
    if (inCode) html += '</pre>';
    return html;
  }

  function _inlineFormat(text) {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
  }

  function _esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Markdown shortcut on Space/Enter ─────────────────────────────────────
  function _handleKeydown(e) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    // Slash menu navigation
    if (!_slashMenu.classList.contains('hidden')) {
      const items = _slashMenu.querySelectorAll('.slash-menu-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); _activeSlashIdx = (_activeSlashIdx + 1) % items.length; _highlightSlash(); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); _activeSlashIdx = (_activeSlashIdx - 1 + items.length) % items.length; _highlightSlash(); return; }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = items[_activeSlashIdx]?.getAttribute('data-command'); if (cmd) _execSlashCommand(cmd); return; }
      if (e.key === 'Escape')    { _hideSlashMenu(); return; }
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); document.execCommand('bold'); return; }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); document.execCommand('italic'); return; }
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); document.execCommand('underline'); return; }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); _promptLink(); return; }
      if (e.shiftKey && e.key === '8') { e.preventDefault(); document.execCommand('insertUnorderedList'); return; }
      if (e.shiftKey && e.key === '7') { e.preventDefault(); document.execCommand('insertOrderedList'); return; }
      if (e.key === 'z' || e.key === 'Z') { if (!e.shiftKey) { e.preventDefault(); document.execCommand('undo'); } return; }
      if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); document.execCommand('redo'); return; }
      if (e.shiftKey && e.key === 'z') { e.preventDefault(); document.execCommand('redo'); return; }
    }

    // Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      return;
    }

    // Markdown shortcuts on Space
    if (e.key === ' ') {
      const block = _getBlock();
      if (!block) return;
      const t = block.innerText || '';
      if (t === '#')   { e.preventDefault(); _replaceBlock(block, 'h1', ''); return; }
      if (t === '##')  { e.preventDefault(); _replaceBlock(block, 'h2', ''); return; }
      if (t === '###') { e.preventDefault(); _replaceBlock(block, 'h3', ''); return; }
      if (t === '####'){ e.preventDefault(); _replaceBlock(block, 'h4', ''); return; }
      if (t === '>')   { e.preventDefault(); _replaceBlock(block, 'blockquote', ''); return; }
      if (t === '-' || t === '*') { e.preventDefault(); _replaceBlock(block, 'p', ''); document.execCommand('insertUnorderedList'); return; }
      if (t === '1.') { e.preventDefault(); _replaceBlock(block, 'p', ''); document.execCommand('insertOrderedList'); return; }
    }

    // Markdown shortcuts on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const block = _getBlock();
      if (block && block.tagName === 'PRE') { e.preventDefault(); document.execCommand('insertText', false, '\n'); return; }
      // triple-dash divider
      const t = (block?.innerText || '').trim();
      if (t === '---') { e.preventDefault(); _replaceBlock(block, 'p', ''); document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid var(--border);margin:20px 0;"><p><br></p>'); return; }
      if (t.startsWith('```')) { e.preventDefault(); _replaceBlock(block, 'pre', ''); return; }
    }
  }

  function _handleKeyup(e) {
    // Slash command detection
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    if (!node || !_body.contains(node)) { _hideSlashMenu(); return; }
    const text = node.textContent || '';
    const offset = sel.anchorOffset;
    const lastSlash = text.lastIndexOf('/', offset);
    if (lastSlash !== -1 && lastSlash >= offset - 20) {
      _slashQuery = text.slice(lastSlash + 1, offset).toLowerCase();
      _slashAnchorNode = node;
      _slashAnchorOffset = lastSlash;
      _showSlashMenu();
    } else {
      _hideSlashMenu();
    }
  }

  function _getBlock() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let n = sel.anchorNode;
    while (n && n !== _body) {
      if (n.nodeType === 1 && ['P','H1','H2','H3','H4','BLOCKQUOTE','PRE','LI','DIV'].includes(n.tagName)) return n;
      n = n.parentNode;
    }
    return null;
  }

  function _replaceBlock(el, tag, content) {
    const newEl = document.createElement(tag);
    newEl.innerHTML = content || '<br>';
    el.parentNode.replaceChild(newEl, el);
    const r = document.createRange();
    const s = window.getSelection();
    r.selectNodeContents(newEl); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  }

  // ── Floating toolbar ──────────────────────────────────────────────────────
  function _updateFloatingToolbar() {
    if (_editorView.classList.contains('hidden')) { _floatingToolbar.classList.add('hidden'); return; }
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { _floatingToolbar.classList.add('hidden'); return; }
    const range = sel.getRangeAt(0);
    if (!_body.contains(range.commonAncestorContainer)) { _floatingToolbar.classList.add('hidden'); return; }
    const rect = range.getBoundingClientRect();
    const tbW = 460;
    let left = rect.left + window.scrollX + rect.width / 2 - tbW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tbW - 8));
    _floatingToolbar.classList.remove('hidden');
    _floatingToolbar.style.top = `${window.scrollY + rect.top - 52}px`;
    _floatingToolbar.style.left = `${left}px`;
    _floatingToolbar.style.width = `${tbW}px`;
  }

  function _promptLink() {
    const url = prompt('Enter URL:');
    if (url) { document.execCommand('createLink', false, url); }
  }

  // ── Slash menu ────────────────────────────────────────────────────────────
  const SLASH_COMMANDS = [
    { cmd: 'h1', label: 'Heading 1', desc: 'Large section heading', icon: 'heading-1' },
    { cmd: 'h2', label: 'Heading 2', desc: 'Medium section heading', icon: 'heading-2' },
    { cmd: 'h3', label: 'Heading 3', desc: 'Small section heading', icon: 'heading-3' },
    { cmd: 'bullet', label: 'Bullet List', desc: 'Unordered list', icon: 'list' },
    { cmd: 'number', label: 'Numbered List', desc: 'Ordered list', icon: 'list-ordered' },
    { cmd: 'checklist', label: 'Checklist', desc: 'Interactive to-do', icon: 'check-square' },
    { cmd: 'quote', label: 'Blockquote', desc: 'Styled quote block', icon: 'quote' },
    { cmd: 'code', label: 'Code Block', desc: 'Syntax highlighted', icon: 'code' },
    { cmd: 'divider', label: 'Divider', desc: 'Horizontal separator', icon: 'minus' },
    { cmd: 'callout', label: 'Callout', desc: 'Highlighted notice', icon: 'info' },
    { cmd: 'table', label: 'Table', desc: 'Data grid', icon: 'table' },
    { cmd: 'image', label: 'Image', desc: 'Insert image URL', icon: 'image' },
    { cmd: 'video', label: 'Video', desc: 'YouTube or direct URL', icon: 'video' },
  ];

  function _showSlashMenu() {
    const filtered = SLASH_COMMANDS.filter(c =>
      !_slashQuery || c.label.toLowerCase().includes(_slashQuery) || c.cmd.includes(_slashQuery)
    );
    if (!filtered.length) { _hideSlashMenu(); return; }

    _slashMenu.innerHTML = filtered.map((c, i) => `
      <div class="slash-menu-item${i === _activeSlashIdx ? ' active' : ''}" data-command="${c.cmd}">
        <i data-lucide="${c.icon}"></i>
        <div><span class="slash-item-title">${c.label}</span><span class="slash-item-desc">${c.desc}</span></div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Position near cursor
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      let left = rect.left + window.scrollX;
      left = Math.max(8, Math.min(left, window.innerWidth - 300));
      _slashMenu.style.top = `${window.scrollY + rect.bottom + 6}px`;
      _slashMenu.style.left = `${left}px`;
    }
    _slashMenu.classList.remove('hidden');
    _activeSlashIdx = 0;
  }

  function _hideSlashMenu() {
    _slashMenu.classList.add('hidden');
    _slashQuery = '';
    _activeSlashIdx = 0;
  }

  function _highlightSlash() {
    _slashMenu.querySelectorAll('.slash-menu-item').forEach((el, i) => {
      el.classList.toggle('active', i === _activeSlashIdx);
      if (i === _activeSlashIdx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function _execSlashCommand(cmd) {
    // Remove the slash + query from the text node
    if (_slashAnchorNode && _slashAnchorNode.nodeType === 3) {
      _slashAnchorNode.textContent =
        _slashAnchorNode.textContent.slice(0, _slashAnchorOffset) +
        _slashAnchorNode.textContent.slice(_slashAnchorOffset + 1 + _slashQuery.length);
      const r = document.createRange();
      r.setStart(_slashAnchorNode, _slashAnchorOffset);
      r.collapse(true);
      const s = window.getSelection();
      s.removeAllRanges(); s.addRange(r);
    }
    _hideSlashMenu();

    switch (cmd) {
      case 'h1': document.execCommand('formatBlock', false, '<h1>'); break;
      case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
      case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
      case 'bullet': document.execCommand('insertUnorderedList'); break;
      case 'number': document.execCommand('insertOrderedList'); break;
      case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
      case 'code': document.execCommand('formatBlock', false, '<pre>'); break;
      case 'divider':
        document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid var(--border);margin:24px 0;"><p><br></p>');
        break;
      case 'checklist':
        document.execCommand('insertHTML', false,
          '<div class="editor-checklist-item"><input type="checkbox" class="editor-checklist-checkbox"><div contenteditable="true" style="outline:none;flex:1;padding:2px 0;">Checklist item</div></div><p><br></p>');
        break;
      case 'callout':
        document.execCommand('insertHTML', false,
          '<div class="editor-callout"><div class="editor-callout-icon">💡</div><div class="editor-callout-text" contenteditable="true" style="outline:none;">Your callout message here...</div></div><p><br></p>');
        break;
      case 'table':
        document.execCommand('insertHTML', false, `
          <table><thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead>
          <tbody><tr><td>Cell A</td><td>Cell B</td><td>Cell C</td></tr>
          <tr><td>Cell D</td><td>Cell E</td><td>Cell F</td></tr></tbody></table><p><br></p>`);
        break;
      case 'image': {
        const url = prompt('Image URL:');
        if (url) document.execCommand('insertHTML', false,
          `<figure style="margin:20px 0;"><img src="${url}" alt="Image" style="max-width:100%;border-radius:8px;display:block;"><figcaption contenteditable="true" style="text-align:center;font-size:13px;color:var(--text-muted);padding:6px;outline:none;">Add a caption...</figcaption></figure><p><br></p>`);
        break;
      }
      case 'video': {
        const url = prompt('Video URL (YouTube or direct):');
        if (url) {
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop().split('?')[0];
            document.execCommand('insertHTML', false,
              `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:20px 0;"><iframe src="https://www.youtube.com/embed/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:12px;" allowfullscreen></iframe></div><p><br></p>`);
          } else {
            document.execCommand('insertHTML', false,
              `<video src="${url}" controls style="width:100%;border-radius:12px;margin:20px 0;"></video><p><br></p>`);
          }
        }
        break;
      }
    }
    _body.focus();
  }

  // ── Emoji picker (simple) ─────────────────────────────────────────────────
  function _openEmojiPicker() {
    const emojis = ['😀','😎','🔥','💡','✅','❌','⚠️','📌','📚','🎯','🚀','💻','🛠️','📝','🔗','⭐','👍','👏','🙏','💬'];
    const existing = document.getElementById('emoji-picker-popover');
    if (existing) { existing.remove(); return; }
    const sel = window.getSelection();
    const rect = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : { top: 200, left: 200 };
    const div = document.createElement('div');
    div.id = 'emoji-picker-popover';
    div.style.cssText = `position:fixed;top:${rect.top - 52}px;left:${rect.left}px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:8px;display:flex;flex-wrap:wrap;gap:4px;width:240px;box-shadow:var(--shadow-lg);z-index:999;`;
    emojis.forEach(em => {
      const btn = document.createElement('button');
      btn.textContent = em;
      btn.style.cssText = 'border:none;background:none;font-size:20px;cursor:pointer;padding:4px;border-radius:4px;line-height:1;';
      btn.onmouseenter = () => btn.style.background = 'var(--bg-hover)';
      btn.onmouseleave = () => btn.style.background = 'none';
      btn.onclick = () => { document.execCommand('insertText', false, em); div.remove(); _body.focus(); };
      div.appendChild(btn);
    });
    document.body.appendChild(div);
    setTimeout(() => document.addEventListener('click', () => div.remove(), { once: true }), 100);
  }

  // ── Event bindings ────────────────────────────────────────────────────────
  function _bindEvents() {
    // Title auto-resize
    _title.addEventListener('input', _autoResize);

    // Back / save / publish
    _backBtn.addEventListener('click', _close);
    _draftBtn.addEventListener('click', () => { _publish(true); });
    _publishBtn.addEventListener('click', () => { _publish(false); });

    // Settings panel
    _settingsBtn.addEventListener('click', () => _settingsSidebar.classList.toggle('open'));
    _settingsCloseBtn.addEventListener('click', () => _settingsSidebar.classList.remove('open'));

    // Cover image
    _coverUrlInput.addEventListener('input', e => _setCover(e.target.value.trim(), _coverY));
    _coverRemove.addEventListener('click', () => _setCover('', 50));
    _coverSlider.addEventListener('input', e => {
      _coverY = e.target.value;
      _coverImage.style.backgroundPositionY = `${_coverY}%`;
    });

    // Drag & drop cover
    _coverImage.addEventListener('dragover', e => { e.preventDefault(); _coverImage.style.borderColor = 'var(--primary)'; });
    _coverImage.addEventListener('dragleave', () => { _coverImage.style.borderColor = ''; });
    _coverImage.addEventListener('drop', e => {
      e.preventDefault(); _coverImage.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => _setCover(ev.target.result, 50);
        reader.readAsDataURL(file);
      }
    });

    // Paste
    _body.addEventListener('paste', _handlePaste);

    // Keyboard
    _body.addEventListener('keydown', _handleKeydown);
    _body.addEventListener('keyup', _handleKeyup);

    // Floating toolbar
    document.addEventListener('selectionchange', _updateFloatingToolbar);

    // Toolbar buttons
    const tb = id => document.getElementById(id);
    const cmd = (c) => (e) => { e.preventDefault(); document.execCommand(c); };
    tb('tb-bold').addEventListener('mousedown', cmd('bold'));
    tb('tb-italic').addEventListener('mousedown', cmd('italic'));
    tb('tb-underline').addEventListener('mousedown', cmd('underline'));
    tb('tb-strike').addEventListener('mousedown', cmd('strikeThrough'));
    tb('tb-list-bullet').addEventListener('mousedown', cmd('insertUnorderedList'));
    tb('tb-list-num').addEventListener('mousedown', cmd('insertOrderedList'));

    tb('tb-color').addEventListener('mousedown', e => {
      e.preventDefault();
      const color = prompt('Enter color (hex or name):', '#c5a059');
      if (color) document.execCommand('foreColor', false, color);
    });
    tb('tb-highlight').addEventListener('mousedown', e => {
      e.preventDefault();
      const color = prompt('Enter highlight color:', '#faf6ee');
      if (color) document.execCommand('hiliteColor', false, color);
    });
    tb('tb-quote').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('formatBlock', false, '<blockquote>'); });
    tb('tb-code-block').addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('formatBlock', false, '<pre>'); });
    tb('tb-link').addEventListener('mousedown', e => { e.preventDefault(); _promptLink(); });
    tb('tb-image').addEventListener('mousedown', e => {
      e.preventDefault();
      const url = prompt('Image URL:');
      if (url) document.execCommand('insertHTML', false,
        `<figure style="margin:20px 0;"><img src="${url}" alt="Image" style="max-width:100%;border-radius:8px;display:block;"><figcaption contenteditable="true" style="text-align:center;font-size:13px;color:var(--text-muted);padding:6px;outline:none;">Add a caption...</figcaption></figure>`);
    });
    tb('tb-table').addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('insertHTML', false, `<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Cell A</td><td>Cell B</td></tr></tbody></table><p><br></p>`);
    });
    tb('tb-emoji').addEventListener('mousedown', e => { e.preventDefault(); _openEmojiPicker(); });

    tb('tb-heading').addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'p') document.execCommand('formatBlock', false, '<p>');
      else document.execCommand('formatBlock', false, `<${val}>`);
    });

    // Slash menu clicks
    _slashMenu.addEventListener('click', e => {
      const item = e.target.closest('.slash-menu-item');
      if (item) _execSlashCommand(item.getAttribute('data-command'));
    });

    // Drag & drop images into body
    _body.addEventListener('dragover', e => { e.preventDefault(); });
    _body.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => {
          document.execCommand('insertHTML', false,
            `<figure style="margin:20px 0;"><img src="${ev.target.result}" alt="Dropped image" style="max-width:100%;border-radius:8px;display:block;"><figcaption contenteditable="true" style="text-align:center;font-size:13px;color:var(--text-muted);padding:6px;outline:none;">Add a caption...</figcaption></figure>`);
        };
        reader.readAsDataURL(file);
      }
    });

    // Paste images into body
    _body.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = ev => {
            document.execCommand('insertHTML', false,
              `<figure style="margin:20px 0;"><img src="${ev.target.result}" alt="Pasted image" style="max-width:100%;border-radius:8px;display:block;"><figcaption contenteditable="true" style="text-align:center;font-size:13px;color:var(--text-muted);padding:6px;outline:none;">Add a caption...</figcaption></figure>`);
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }, true); // capture phase so it runs before the other paste handler
  }

  // Public interface
  return { open };
})();
