/* ═══════════════════════════════════════════
   techniques.js – Technique randomiser logic
   ═══════════════════════════════════════════ */

const TechniqueModule = (() => {
  let lastTechnique = null;
  const savedTechniques = [];

  function getFiltered() {
    const pos = document.getElementById('position-filter').value;
    return pos === 'all' ? TECHNIQUES : TECHNIQUES.filter(t => t.position === pos);
  }

  function randomise() {
    const pool = getFiltered();
    if (pool.length === 0) return;

    // avoid repeating the same technique twice in a row
    let pick;
    do {
      pick = pool[Math.floor(Math.random() * pool.length)];
    } while (pool.length > 1 && pick === lastTechnique);
    lastTechnique = pick;

    const display = document.getElementById('technique-display');
    display.classList.remove('flash');
    void display.offsetWidth; // reflow
    display.classList.add('flash');

    document.querySelector('.technique-position').textContent = pick.position.toUpperCase();
    document.querySelector('.technique-name').textContent    = pick.name;
    document.querySelector('.technique-type').textContent    = pick.type;
    document.querySelector('.technique-desc').textContent    = pick.desc;
  }

  function saveCurrent() {
    if (!lastTechnique) { showToast('Randomise a technique first!'); return; }
    if (savedTechniques.includes(lastTechnique)) { showToast('Already saved!'); return; }
    savedTechniques.push(lastTechnique);
    renderSaved();
    showToast(`📌 ${lastTechnique.name} saved!`);
  }

  function clearSaved() {
    savedTechniques.length = 0;
    renderSaved();
    showToast('Saved list cleared.');
  }

  function renderSaved() {
    const ul = document.getElementById('saved-tech-list');
    ul.innerHTML = savedTechniques
      .map(t => `<li><strong>${t.name}</strong> — ${t.position}</li>`)
      .join('');
  }

  function init() {
    document.getElementById('btn-randomise').addEventListener('click', randomise);
    document.getElementById('btn-save-tech').addEventListener('click', saveCurrent);
    document.getElementById('btn-clear-saved').addEventListener('click', clearSaved);
  }

  return { init };
})();
