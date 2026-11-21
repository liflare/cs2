/* ============================================================
   HOMEPAGE LOGIC
   Loads data/maps-index.json (the list of maps) and, for each
   map, peeks into its full data file just to report whether it
   has real content yet ("full") or is still a template stub.
   ============================================================ */

const grid = document.getElementById('map-grid');
const searchInput = document.getElementById('search');

let allMaps = [];

async function init() {
  const indexRes = await fetch('data/maps-index.json');
  const index = await indexRes.json();

  // For each map, fetch its data file so we can show a small
  // "N lineups" count on the card. Falls back gracefully if a
  // map's data file doesn't exist yet.
  allMaps = await Promise.all(index.map(async (m) => {
    try {
      const res = await fetch(`data/maps/${m.id}.json`);
      const data = await res.json();
      return {
        ...m,
        lineupCount: (data.lineups || []).length,
        strategyCount: (data.strategies || []).length,
      };
    } catch (e) {
      return { ...m, lineupCount: 0, strategyCount: 0 };
    }
  }));

  render(allMaps);
}

function render(maps) {
  grid.innerHTML = '';
  maps.forEach(m => {
    const isFull = m.lineupCount >= 5; // arbitrary "has real content" threshold
    const card = document.createElement('a');
    card.href = `map.html?map=${m.id}`;
    card.className = 'map-card';
    card.innerHTML = `
      <span class="status-tag" data-full="${isFull}">${isFull ? 'Готово' : 'Шаблон'}</span>
      <div class="thumb" style="background-image:url('${m.thumb}')"></div>
      <div class="card-body">
        <h3>${m.name}</h3>
        <div class="meta">${m.lineupCount} раскидок · ${m.strategyCount} стратегий</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  render(allMaps.filter(m => m.name.toLowerCase().includes(q)));
});

init();
