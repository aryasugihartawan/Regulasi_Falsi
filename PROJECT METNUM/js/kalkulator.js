/* ============================================================
   kalkulator.js — Controller for the interactive calculator page
   Depends on: regulaFalsi.js, graph.js
   ============================================================ */

(function () {
  /* ---- DOM refs ---- */
  const fnInput       = document.getElementById('fnInput');
  const fnPreview     = document.getElementById('fnPreview');
  const aInput        = document.getElementById('aInput');
  const bInput        = document.getElementById('bInput');
  const epsilonInput  = document.getElementById('epsilonInput');
  const maxIterInput  = document.getElementById('maxIterInput');
  const runBtn        = document.getElementById('runBtn');
  const resetBtn      = document.getElementById('resetBtn');

  const resultBox     = document.getElementById('resultBox');
  const errorBox      = document.getElementById('errorBox');
  const resPivot      = document.getElementById('resPivot');
  const resFxr        = document.getElementById('resFxr');
  const resIter       = document.getElementById('resIter');
  const resErr        = document.getElementById('resErr');
  const resStatus     = document.getElementById('resStatus');

  const iterControls  = document.getElementById('iterControls');
  const icPrev        = document.getElementById('icPrev');
  const icNext        = document.getElementById('icNext');
  const icAll         = document.getElementById('icAll');
  const icLabel       = document.getElementById('icLabel');

  const tableSection  = document.getElementById('tableSection');
  const iterTableBody = document.getElementById('iterTableBody');
  const canvasPlaceholder = document.getElementById('canvasPlaceholder');

  /* ---- State ---- */
  let plotter   = null;
  let lastF     = null;
  let lastA     = 0, lastB = 0;
  let lastIters = [];
  let viewIdx   = -1; // -1 = show all

  function formatNumber(value, digits = 6) {
    if (!isFinite(value)) return String(value);
    if (Math.abs(value) < 1e-12) return '0';
    return value.toFixed(digits).replace(/(\.[0-9]*?)0+$/,'$1').replace(/\.$/, '');
  }

  /* ---- Init plotter ---- */
  plotter = new GraphPlotter('graphCanvas');

  /* ---- Live function preview ---- */
  fnInput.addEventListener('input', () => {
    updatePreview();
    try {
      const f = parseFn(fnInput.value);
      // Quick plot preview with current a/b
      const a = parseFloat(aInput.value), b = parseFloat(bInput.value);
      if (isFinite(a) && isFinite(b) && a < b) {
        canvasPlaceholder.style.display = 'none';
        plotter.draw(f, a, b, [], -1);
      }
    } catch (_) {}
  });

  aInput.addEventListener('input', tryLivePlot);
  bInput.addEventListener('input', tryLivePlot);

  function tryLivePlot() {
    try {
      const f = parseFn(fnInput.value);
      const a = parseFloat(aInput.value), b = parseFloat(bInput.value);
      if (isFinite(a) && isFinite(b) && a < b) {
        canvasPlaceholder.style.display = 'none';
        plotter.draw(f, a, b, [], -1);
      }
    } catch (_) {}
  }

  function updatePreview() {
    const raw = fnInput.value || '';
    fnPreview.textContent = `f(x) = ${raw}`;
  }

  /* ---- Presets ---- */
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fnInput.value = btn.dataset.fn;
      aInput.value  = btn.dataset.a;
      bInput.value  = btn.dataset.b;
      updatePreview();
      tryLivePlot();
    });
  });

  /* ---- Run calculation ---- */
  runBtn.addEventListener('click', run);
  fnInput.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });

  function run() {
    hideMessages();
    const fnStr   = fnInput.value.trim();
    const a       = parseFloat(aInput.value);
    const b       = parseFloat(bInput.value);
    const epsilon = parseFloat(epsilonInput.value);
    const maxIter = parseInt(maxIterInput.value, 10);

    // Validate
    if (!fnStr) return showError('Masukkan fungsi f(x) terlebih dahulu.');
    if (!isFinite(a) || !isFinite(b)) return showError('Nilai a dan b harus bilangan yang valid.');
    if (a >= b) return showError('Batas kiri a harus lebih kecil dari batas kanan b.');

    let f;
    try { f = parseFn(fnStr); f(1); }
    catch (e) { return showError(`Fungsi tidak valid: ${e.message}`); }

    let result;
    try { result = runRegulaFalsi(f, a, b, epsilon, maxIter); }
    catch (e) { return showError(e.message); }

    if (!result.iterations.length && result.root === null) {
      return showError(result.message);
    }

    // Save state
    lastF     = f;
    lastA     = a;
    lastB     = b;
    lastIters = result.iterations;
    viewIdx   = -1;

    // Show graph (all iterations)
    canvasPlaceholder.style.display = 'none';
    plotter.draw(f, a, b, lastIters, viewIdx);

    // Show iteration controls
    iterControls.style.display = 'flex';
    updateIterLabel();

    // Populate table
    renderTable(result.iterations);
    tableSection.style.display = 'block';

    // Show summary
    const last = result.iterations[result.iterations.length - 1];
    resPivot.textContent  = formatNumber(last.xr, 10);
    resFxr.textContent    = formatNumber(last.fxr, 8);
    resIter.textContent   = last.iter;
    resErr.textContent    = last.errRel !== null ? formatNumber(last.errRel, 8) : '—';
    resStatus.textContent = result.converged ? 'Konvergen' : 'Maks. Iterasi';
    resStatus.style.color = result.converged ? 'var(--accent3)' : '#fbbf24';
    resultBox.style.display = 'flex';
  }

  /* ---- Iteration nav controls ---- */
  icPrev.addEventListener('click', () => {
    if (viewIdx === -1) viewIdx = lastIters.length - 1;
    viewIdx = Math.max(0, viewIdx - 1);
    updateIterView();
  });

  icNext.addEventListener('click', () => {
    if (viewIdx === -1) return;
    viewIdx = Math.min(lastIters.length - 1, viewIdx + 1);
    if (viewIdx === lastIters.length - 1) viewIdx = -1; // wrap to all
    updateIterView();
  });

  icAll.addEventListener('click', () => {
    viewIdx = -1;
    updateIterView();
  });

  function updateIterView() {
    plotter.draw(lastF, lastA, lastB, lastIters, viewIdx);
    updateIterLabel();
    highlightTableRow(viewIdx);
  }

  function updateIterLabel() {
    if (viewIdx === -1) icLabel.textContent = `Semua (${lastIters.length})`;
    else icLabel.textContent = `Iterasi ${viewIdx + 1} / ${lastIters.length}`;
  }

  /* ---- Render table ---- */
  function renderTable(rows) {
    iterTableBody.innerHTML = rows.map((r, idx) => `
      <tr data-idx="${idx}">
        <td>${r.iter}</td>
        <td>${formatNumber(r.a, 8)}</td>
        <td>${formatNumber(r.b, 8)}</td>
        <td><strong style="color:var(--accent3)">${formatNumber(r.xr, 8)}</strong></td>
        <td>${formatNumber(r.fa, 6)}</td>
        <td>${formatNumber(r.fxr, 6)}</td>
        <td>${formatNumber(Math.abs(r.b - r.a), 6)}</td>
        <td>${r.errRel === null ? '—' : formatNumber(r.errRel, 8)}</td>
      </tr>
    `).join('');

    // Click row to jump to that iteration
    iterTableBody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        viewIdx = parseInt(tr.dataset.idx, 10);
        updateIterView();
      });
    });
  }

  function highlightTableRow(idx) {
    iterTableBody.querySelectorAll('tr').forEach(tr => tr.style.background = '');
    if (idx >= 0) {
      const tr = iterTableBody.querySelector(`tr[data-idx="${idx}"]`);
      if (tr) {
        tr.style.background = 'rgba(166,120,75,0.12)';
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  /* ---- Reset ---- */
  resetBtn.addEventListener('click', () => {
    fnInput.value        = 'x^3 - 3*x - 1';
    aInput.value         = '1';
    bInput.value         = '3';
    epsilonInput.value   = '1e-6';
    maxIterInput.value   = '100';
    updatePreview();
    hideMessages();
    resultBox.style.display  = 'none';
    tableSection.style.display = 'none';
    iterControls.style.display = 'none';
    canvasPlaceholder.style.display = 'flex';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    lastIters = []; viewIdx = -1;
    plotter.draw(x => 0, 0, 1, [], -1); // blank redraw
    canvasPlaceholder.style.display = 'flex';
  });

  /* ---- Helpers ---- */
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function hideMessages() {
    errorBox.style.display  = 'none';
    resultBox.style.display = 'none';
  }

  // Init preview
  updatePreview();

})();
