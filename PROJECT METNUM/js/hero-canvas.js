/* ============================================================
   hero-canvas.js — Animated Regula Falsi illustration on hero
   ============================================================ */

(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;

  // Map math coords to canvas
  const xMin = -0.5, xMax = 4, yMin = -3, yMax = 6;

  function toCanvasX(x) { return ((x - xMin) / (xMax - xMin)) * W; }
  function toCanvasY(y) { return H - ((y - yMin) / (yMax - yMin)) * H; }

  // f(x) = x^3 - 3x - 1
  function f(x) { return x * x * x - 3 * x - 1; }

  let t = 0; // animation time

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(gx), 0);
      ctx.lineTo(toCanvasX(gx), H);
      ctx.stroke();
    }
    for (let gy = Math.ceil(yMin); gy <= yMax; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, toCanvasY(gy));
      ctx.lineTo(W, toCanvasY(gy));
      ctx.stroke();
    }
  }

  function drawAxes() {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    // x-axis
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0));
    ctx.lineTo(W, toCanvasY(0));
    ctx.stroke();
    // y-axis
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), H);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 3; i++) {
      if (i === 0) continue;
      ctx.fillText(i, toCanvasX(i), toCanvasY(0) + 14);
    }
  }

  function drawCurve() {
    ctx.beginPath();
    ctx.strokeStyle = '#a6784b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a6784b';
    ctx.shadowBlur = 8;
    let first = true;
    for (let px = 0; px < W; px++) {
      const x = xMin + (px / W) * (xMax - xMin);
      const y = f(x);
      const cy = toCanvasY(y);
      if (cy < -10 || cy > H + 10) { first = true; continue; }
      if (first) { ctx.moveTo(px, cy); first = false; }
      else ctx.lineTo(px, cy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Animate regula falsi iterations
  const a0 = 1.8, b0 = 2.2;
  const iterations = [];
  let a = a0, b = b0;
  for (let i = 0; i < 5; i++) {
    const fa = f(a), fb = f(b);
    const c = b - (fb * (b - a)) / (fb - fa);
    const fc = f(c);
    iterations.push({ a, b, c, fa, fb, fc });
    if (fa * fc < 0) b = c;
    else a = c;
  }

  function drawIteration(idx, alpha) {
    const iter = iterations[Math.min(idx, iterations.length - 1)];
    const { a, b, c, fa, fb } = iter;

    // Shaded interval
    ctx.fillStyle = `rgba(166,120,75,${0.05 * alpha})`;
    ctx.fillRect(toCanvasX(a), 0, toCanvasX(b) - toCanvasX(a), H);

    // Secant line
    ctx.beginPath();
    ctx.strokeStyle = `rgba(184,157,112,${0.8 * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.moveTo(toCanvasX(a), toCanvasY(fa));
    ctx.lineTo(toCanvasX(b), toCanvasY(fb));
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoint dots
    [[a, fa], [b, fb]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(184,157,112,${alpha})`;
      ctx.arc(toCanvasX(px), toCanvasY(py), 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // c point
    ctx.beginPath();
    ctx.fillStyle = `rgba(123,141,113,${alpha})`;
    ctx.arc(toCanvasX(c), toCanvasY(0), 5, 0, Math.PI * 2);
    ctx.fill();

    // vertical drop
    ctx.beginPath();
    ctx.strokeStyle = `rgba(123,141,113,${0.5 * alpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(toCanvasX(c), toCanvasY(0));
    ctx.lineTo(toCanvasX(c), toCanvasY(f(c)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Label xr
    ctx.fillStyle = `rgba(123,141,113,${alpha})`;
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`x${idx+1}`, toCanvasX(c), toCanvasY(0) - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAxes();

    const cycleLen = 3;
    const totalCycles = iterations.length;
    const cycleDur = 120; // frames per iteration
    const frame = (t % (totalCycles * cycleDur));
    const iterIdx = Math.floor(frame / cycleDur);
    const iterT   = (frame % cycleDur) / cycleDur;
    const alpha   = Math.min(1, iterT * 4);

    // Draw all previous fully
    for (let i = 0; i < iterIdx; i++) {
      drawIteration(i, 0.35);
    }
    // Draw current with fade-in
    drawIteration(iterIdx, alpha);

    drawCurve();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('f(x) = x³ − 3x − 1', 12, 20);

    // Iteration counter
    ctx.fillStyle = 'rgba(166,120,75,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`Iterasi ke-${iterIdx + 1}`, W - 12, 20);

    t++;
    requestAnimationFrame(draw);
  }

  draw();
})();
