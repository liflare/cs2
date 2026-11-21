/* ============================================================
   MAP PAGE LOGIC WITH INTERACTIVE BUILDER AND UNSORTED GALLERY
   ============================================================ */

const params = new URLSearchParams(window.location.search);
const mapId = params.get('map') || 'mirage';

let mapData = null;
let activePosition = 'all';
let activeType = 'all';
let searchTerm = '';
let isEditMode = false;
let uploadedFiles = { 1: null, 2: null, 3: null, 4: null };

const TYPE_LABELS = { smoke: 'Дым', flash: 'Флешка', molotov: 'Молотов', he: 'Осколочная' };

async function init() {
  const res = await fetch(`data/maps/${mapId}.json`);
  mapData = await res.json();

  document.title = `CS2 Cheatsheet — ${mapData.name}`;
  document.getElementById('map-eyebrow').textContent = 'Карта';
  document.getElementById('map-title').textContent = mapData.name;
  document.getElementById('radar-img').src = mapData.radarImage;

  renderMarkers();
  renderPositionPills();
  renderLineups();
  renderStrategies();
  renderUnsorted();
  bindTabs();
  bindFilters();
  initConstructor();
  initUnsortedUploader();
}

/* ---------- radar markers ---------- */
function renderMarkers() {
  const wrap = document.getElementById('radar-wrap');
  wrap.querySelectorAll('.pos-marker:not(.temp-marker)').forEach(el => el.remove());

  mapData.positions.forEach((pos, i) => {
    const coords = mapData.positionCoords[pos.id];
    if (!coords) return;
    const marker = document.createElement('button');
    marker.className = 'pos-marker';
    marker.style.left = coords.x + '%';
    marker.style.top = coords.y + '%';
    marker.dataset.pos = pos.id;
    marker.title = pos.name;
    marker.innerHTML = `<span class="pulse"></span>` + (i + 1);
    marker.addEventListener('click', (e) => {
      if (isEditMode) { e.stopPropagation(); return; }
      setActivePosition(pos.id);
    });
    wrap.appendChild(marker);
  });
  syncMarkerState();
}

function syncMarkerState() {
  document.querySelectorAll('.pos-marker:not(.temp-marker)').forEach(el => {
    el.dataset.active = (el.dataset.pos === activePosition) ? 'true' : 'false';
  });
  document.querySelectorAll('.position-pill').forEach(el => {
    el.dataset.active = (el.dataset.pos === activePosition) ? 'true' : 'false';
  });
}

/* ---------- position pill list ---------- */
function renderPositionPills() {
  const list = document.getElementById('position-list');
  list.innerHTML = '';

  const allPill = document.createElement('button');
  allPill.className = 'position-pill';
  allPill.dataset.pos = 'all';
  allPill.textContent = 'Все позиции';
  allPill.addEventListener('click', () => setActivePosition('all'));
  list.appendChild(allPill);

  mapData.positions.forEach(pos => {
    const pill = document.createElement('button');
    pill.className = 'position-pill';
    pill.dataset.pos = pos.id;
    pill.textContent = pos.name;
    pill.addEventListener('click', () => setActivePosition(pos.id));
    list.appendChild(pill);
  });
  syncMarkerState();
}

function setActivePosition(id) {
  activePosition = id;
  syncMarkerState();
  renderLineups();
}

/* ---------- lineup list ---------- */
function renderLineups() {
  const heading = document.getElementById('lineup-heading');
  const countTag = document.getElementById('lineup-count');
  const list = document.getElementById('lineup-list');

  const posName = activePosition === 'all'
    ? 'Все позиции'
    : (mapData.positions.find(p => p.id === activePosition) || {}).name;
  heading.textContent = posName;

  let items = mapData.lineups.filter(l =>
    (activePosition === 'all' || l.positionId === activePosition) &&
    (activeType === 'all' || l.type === activeType) &&
    (searchTerm === '' || l.title.toLowerCase().includes(searchTerm) || l.description.toLowerCase().includes(searchTerm))
  );

  countTag.textContent = items.length + ` шт.`;
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">Ничего не найдено. Попробуй другой фильтр.</div>`;
    return;
  }

  items.forEach(l => {
    const card = document.createElement('div');
    card.className = 'lineup-card';
    card.dataset.lineupData = JSON.stringify(l);

    let media = '';
    if (l.video) {
      media += `<iframe src="` + l.video + `" title="` + escapeHtml(l.title) + `" allowfullscreen loading="lazy"></iframe>`;
    }

    let imgIdx = 1;
    while (true) {
      const key = imgIdx === 1 ? 'image' : `image` + imgIdx;
      if (l[key]) {
        media += `
          <a data-fslightbox="gallery-` + l.id + `" href="` + l[key] + `" style="max-width: calc(50% - 6px); display: block; cursor: pointer;">
            <img class="shot" src="` + l[key] + `" alt="` + escapeHtml(l.title) + `" loading="lazy" style="width: 100%; object-fit: cover; border-radius: 4px;">
          </a>
        `;
        imgIdx++;
      } else {
        break;
      }
    }

    const currentPosName = (mapData.positions.find(p => p.id === l.positionId) || {}).name || l.positionId;
    const editBtnHtml = isEditMode ? `<button class="edit-existing-btn" onclick="editLineupInForm(this)" style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px; width: 100%;">✏️ Редактировать / Заменить фото</button>` : '';

    card.innerHTML = `
      <div class="row-top">
        <span class="type-tag ` + l.type + `">` + (TYPE_LABELS[l.type] || l.type) + `</span>
        <span class="count-tag">` + currentPosName + `</span>
      </div>
      <h4>` + escapeHtml(l.title) + `</h4>
      <p class="desc">` + escapeHtml(l.description) + `</p>
      ` + (media ? `<div class="media-row" style="display: flex; gap: 12px; flex-wrap: wrap;">` + media + `</div>` : '') + `
      ` + editBtnHtml + `
    `;
    list.appendChild(card);
  });

  if (typeof refreshFsLightbox === 'function') {
    refreshFsLightbox();
  }
}

window.editLineupInForm = function(btn) {
  const card = btn.closest('.lineup-card');
  const data = JSON.parse(card.dataset.lineupData);

  const coords = mapData.positionCoords[data.positionId] || { x: 50, y: 50 };
  const posObj = mapData.positions.find(p => p.id === data.positionId) || { name: data.positionId };

  document.getElementById('form-x').value = coords.x;
  document.getElementById('form-y').value = coords.y;
  document.getElementById('form-pos-id').value = data.positionId;
  document.getElementById('form-pos-name').value = posObj.name;
  document.getElementById('form-lineup-id').value = data.id;
  document.getElementById('form-type').value = data.type;
  document.getElementById('form-title').value = data.title;
  document.getElementById('form-desc').value = data.description;

  document.querySelectorAll('.file-drop-zone').forEach(zone => {
    const img = zone.querySelector('img');
    if (img) img.remove();
  });
  uploadedFiles = { 1: null, 2: null, 3: null, 4: null };

  const wrap = document.getElementById('radar-wrap');
  let tempMarker = wrap.querySelector('.temp-marker');
  if (!tempMarker) {
    tempMarker = document.createElement('button');
    tempMarker.className = 'pos-marker temp-marker';
    tempMarker.innerHTML = '📍';
    wrap.appendChild(tempMarker);
  }
  tempMarker.style.left = coords.x + '%';
  tempMarker.style.top = coords.y + '%';

  document.getElementById('editor-form').scrollIntoView({ behavior: 'smooth' });
};

/* ---------- strategies ---------- */
function renderStrategies() {
  const list = document.getElementById('strategy-list');
  list.innerHTML = '';

  const strategies = mapData.strategies || [];
  if (strategies.length === 0) {
    list.innerHTML = `<div class="empty-state">Стратегий пока нет.</div>`;
    return;
  }

  strategies.forEach(s => {
    const card = document.createElement('div');
    card.className = 'strategy-card';

    const roles = (s.roles || []).map(r => `
      <div class="role-item">
        <span class="role-name">` + escapeHtml(r.role) + `</span>
        <span class="role-player">` + escapeHtml(r.player) + `</span>
      </div>
    `).join('');

    const steps = (s.steps || []).map(st => `<li>` + escapeHtml(st) + `</li>`).join('');
    const video = s.video ? `<div class="media-row"><iframe src="` + s.video + `" title="` + escapeHtml(s.title) + `" allowfullscreen loading="lazy"></iframe></div>` : '';

    card.innerHTML = `
      <span class="side-tag">` + escapeHtml(s.side || 'T') + ` СТОРОНА</span>
      <h3>` + escapeHtml(s.title) + `</h3>
      <p class="desc">` + escapeHtml(s.summary || '') + `</p>
      <div class="role-grid">` + roles + `</div>
      <ol class="steps">` + steps + `</ol>
      ` + video + `
    `;
    list.appendChild(card);
  });
}

/* ---------- НЕОТСОРТИРОВАННЫЕ СКРИНШОТЫ ---------- */
function renderUnsorted() {
  const grid = document.getElementById('unsorted-grid');
  const badge = document.getElementById('unsorted-badge');
  const items = mapData.unsorted || [];

  if (badge) badge.textContent = items.length > 0 ? `(${items.length})` : '';
  if (!grid) return;

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">В этой вкладке пока пусто. Закинь сюда свои скриншоты пачкой сверху!</div>`;
    return;
  }

  items.forEach(imgSrc => {
    const div = document.createElement('div');
    div.className = 'unsorted-item';
    div.style.position = 'relative';
    div.innerHTML = `
      <a data-fslightbox="unsorted-gallery" href="${imgSrc}">
        <img src="${imgSrc}" alt="Скриншот раскидки" loading="lazy">
      </a>
      <button onclick="deleteUnsortedPhoto('${imgSrc}')" title="Удалить фото" style="position: absolute; top: 8px; right: 8px; background: rgba(231, 76, 60, 0.9); color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-weight: bold; font-size: 12px; z-index: 10;">✕ Удалить</button>
    `;
    grid.appendChild(div);
  });

  if (typeof refreshFsLightbox === 'function') {
    refreshFsLightbox();
  }
}

window.deleteUnsortedPhoto = async function(imgSrc) {
  if (!confirm('Удалить этот скриншот навсегда?')) return;

  try {
    const response = await fetch('http://localhost:3000/api/delete-unsorted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapId, imgSrc })
    });

    const result = await response.json();
    if (result.success) {
      location.reload();
    } else {
      alert('Ошибка удаления: ' + result.error);
    }
  } catch (e) {
    alert('❌ Робот-сервер не запущен! Введите в терминале: node server.js');
  }
};

function initUnsortedUploader() {
  const dropZone = document.getElementById('unsorted-drop-zone');
  const fileInput = document.getElementById('unsorted-file-input');
  const statusEl = document.getElementById('unsorted-status');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadUnsortedBatch(e.target.files);
  });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#d6eaf8'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#ebf5fb'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '#ebf5fb';
    if (e.dataTransfer.files.length > 0) uploadUnsortedBatch(e.dataTransfer.files);
  });

  async function uploadUnsortedBatch(files) {
    statusEl.style.color = '#f39c12';
    statusEl.textContent = `⏳ Загружаю и сохраняю ${files.length} шт. на диск...`;
    const promises = Array.from(files).map(file => {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });
    const imagesData = (await Promise.all(promises)).filter(Boolean);
    try {
      const response = await fetch('http://localhost:3000/api/save-unsorted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, images: imagesData })
      });
      const result = await response.json();
      if (result.success) {
        statusEl.style.color = '#2ecc71';
        statusEl.textContent = `✔ Успешно загружено ${imagesData.length} фото! Обновляю...`;
        setTimeout(() => location.reload(), 1000);
      } else {
        statusEl.style.color = '#e74c3c';
        statusEl.textContent = 'Ошибка: ' + result.error;
      }
    } catch (e) {
      statusEl.style.color = '#e74c3c';
      statusEl.textContent = '❌ Робот-сервер не запущен! Введите в терминале: node server.js';
    }
  }
}

/* ---------- tabs & filters ---------- */
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.dataset.active = 'false');
      btn.dataset.active = 'true';
      const tab = btn.dataset.tab;
      document.getElementById('tab-lineups').style.display = tab === 'lineups' ? '' : 'none';
      document.getElementById('tab-strategies').style.display = tab === 'strategies' ? '' : 'none';
      document.getElementById('tab-unsorted').style.display = tab === 'unsorted' ? '' : 'none';
    });
  });
}

function bindFilters() {
  document.querySelectorAll('#type-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#type-filters .chip').forEach(c => c.dataset.active = 'false');
      chip.dataset.active = 'true';
      activeType = chip.dataset.type;
      renderLineups();
    });
  });
  document.getElementById('lineup-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderLineups();
  });
}

/* ---------- ВИЗУАЛЬНЫЙ КОНСТРУКТОР ---------- */
function initConstructor() {
  const adminBtn = document.getElementById('admin-btn');
  const form = document.getElementById('editor-form');
  const wrap = document.getElementById('radar-wrap');
  const multiZone = document.getElementById('multi-drop-zone');
  const multiInput = document.getElementById('multi-file-input');
  if (!adminBtn || !form || !wrap || !multiZone || !multiInput) return;

  adminBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    adminBtn.dataset.active = isEditMode;
    adminBtn.textContent = isEditMode ? 'Выключить конструктор' : 'Включить конструктор точек';
    form.style.display = isEditMode ? 'block' : 'none';
    wrap.dataset.edit = isEditMode;
    const oldTemp = wrap.querySelector('.temp-marker');
    if (oldTemp) oldTemp.remove();
    renderLineups();
  });

  wrap.addEventListener('click', (e) => {
    if (!isEditMode) return;
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    document.getElementById('form-x').value = roundedX;
    document.getElementById('form-y').value = roundedY;
    let tempMarker = wrap.querySelector('.temp-marker');
    if (!tempMarker) {
      tempMarker = document.createElement('button');
      tempMarker.className = 'pos-marker temp-marker';
      tempMarker.innerHTML = '📍';
      wrap.appendChild(tempMarker);
    }
    tempMarker.style.left = roundedX + '%';
    tempMarker.style.top = roundedY + '%';
  });

  multiZone.addEventListener('click', () => multiInput.click());
  multiInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) distributeFiles(e.target.files);
  });
  multiZone.addEventListener('dragover', (e) => { e.preventDefault(); multiZone.style.background = '#d6eaf8'; });
  multiZone.addEventListener('dragleave', () => { multiZone.style.background = '#ebf5fb'; });
  multiZone.addEventListener('drop', (e) => {
    e.preventDefault();
    multiZone.style.background = '#ebf5fb';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) distributeFiles(e.dataTransfer.files);
  });

  function distributeFiles(files) {
    document.querySelectorAll('.file-drop-zone img').forEach(img => img.remove());
    uploadedFiles = { 1: null, 2: null, 3: null, 4: null };
    const maxFiles = Math.min(files.length, 4);
    for (let i = 0; i < maxFiles; i++) {
      const file = files[i];
      const idx = i + 1;
      uploadedFiles[idx] = file;
      const zone = document.getElementById('drop-zone-' + idx);
      const reader = new FileReader();
      reader.onload = (e) => {
        let img = document.createElement('img');
        img.src = e.target.result;
        zone.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }

  document.getElementById('gen-btn').addEventListener('click', async () => {
    const x = document.getElementById('form-x').value;
    const y = document.getElementById('form-y').value;
    const posId = document.getElementById('form-pos-id').value.trim();
    const posName = document.getElementById('form-pos-name').value.trim();
    const lineupId = document.getElementById('form-lineup-id').value.trim();
    const type = document.getElementById('form-type').value.trim() || 'smoke';
    const title = document.getElementById('form-title').value.trim();
    const desc = document.getElementById('form-desc').value.trim();
    if (!x || !posId || !posName || !lineupId || !title) {
      alert('Заполни сначала координаты (кликни на карту) и ключевые поля!');
      return;
    }
    const btn = document.getElementById('gen-btn');
    btn.textContent = '🔄 Сохраняю на диск...';
    btn.style.background = '#f39c12';
    const promises = [];
    for (let idx = 1; idx <= 4; idx++) {
      const file = uploadedFiles[idx];
      if (file) {
        promises.push(new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        }));
      } else {
        promises.push(Promise.resolve(null));
      }
    }
    const imagesData = await Promise.all(promises);
    try {
      const response = await fetch('http://localhost:3000/api/save-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapId, x, y, posId, posName, lineupId, type, title, desc, images: imagesData
        })
      });
      const result = await response.json();
      if (result.success) {
        btn.textContent = '✔ УСПЕШНО СОХРАНЕНО!';
        btn.style.background = '#2ecc71';
        setTimeout(() => location.reload(), 1000);
      } else {
        alert('Ошибка сервера: ' + result.error);
        btn.textContent = 'Ошибка';
      }
    } catch (e) {
      alert('Робот-сервер не запущен! Запустите в терминале: node server.js');
      btn.textContent = 'Ошибка подключения';
      btn.style.background = '#e74c3c';
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

init();