/* ============================================================
   graph.js — Canvas-based function plotter for the calculator
   ============================================================ */

class GraphPlotter {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.padding = { top: 30, right: 30, bottom: 40, left: 54 };
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = Math.min(rect.width || 700, 900);
    this.canvas.height = 400;
    if (this._lastArgs) this.draw(...this._lastArgs);
  }

  /**
   * Main draw entry point.
   * @param {function} f        - parsed math function
   * @param {number}   a        - left bracket
   * @param {number}   b        - right bracket
   * @param {Array}    iters    - iteration data from runRegulaFalsi
   * @param {number}   activeI  - highlight this iteration index (-1 = all)
   */
  draw(f, a, b, iters = [], activeI = -1) {
    this._lastArgs = [f, a, b, iters, activeI];
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const pad = this.padding;

    // Compute view range
    const margin = (b - a) * 0.5;
    const xMin   = a - margin;
    const xMax   = b + margin;

    // Sample function for y-range
    const samples = 300;
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = f(x);
      if (isFinite(y)) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    }

    // Ensure y-axis is visible and zero is in view
    yMin = Math.min(yMin, 0);
    yMax = Math.max(yMax, 0);
    const yPad = (yMax - yMin) * 0.2 || 1;
    yMin -= yPad; yMax += yPad;

    // Coordinate transforms
    const toX = x => pad.left + ((x - xMin) / (xMax - xMin)) * (W - pad.left - pad.right);
    const toY = y => pad.top  + ((yMax - y)  / (yMax - yMin)) * (H - pad.top  - pad.bottom);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#fff7ee';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    this._drawGrid(ctx, xMin, xMax, yMin, yMax, toX, toY, W, H, pad);

    // Axes
    this._drawAxes(ctx, xMin, xMax, yMin, yMax, toX, toY, W, H, pad);

    // Draw iteration visuals
    const drawIters = activeI >= 0 ? iters.slice(0, activeI + 1) : iters;
    this._drawIterations(ctx, drawIters, activeI, f, toX, toY);

    // Draw function curve (on top)
    this._drawCurve(ctx, f, xMin, xMax, toX, toY, W);

    // Draw bracket markers a & b
    this._drawBrackets(ctx, a, b, f, toX, toY);

    // Root marker if last iteration
    if (iters.length > 0) {
      const last = iters[iters.length - 1];
      this._drawRoot(ctx, last.xr, toX, toY);
    }

    // Axis labels
    this._drawAxisLabels(ctx, xMin, xMax, yMin, yMax, toX, toY);
  }

  _drawGrid(ctx, xMin, xMax, yMin, yMax, toX, toY, W, H, pad) {
    ctx.strokeStyle = 'rgba(112,80,48,0.12)';
    ctx.lineWidth = 1;
    const xTicks = this._niceTicks(xMin, xMax, 8);
    const yTicks = this._niceTicks(yMin, yMax, 6);
    xTicks.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(toX(x), pad.top);
      ctx.lineTo(toX(x), H - pad.bottom);
      ctx.stroke();
    });
    yTicks.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(y));
      ctx.lineTo(W - pad.right, toY(y));
      ctx.stroke();
    });
  }

  _drawAxes(ctx, xMin, xMax, yMin, yMax, toX, toY, W, H, pad) {
    ctx.strokeStyle = 'rgba(112,80,48,0.45)';
    ctx.lineWidth = 1.5;
    // x-axis
    if (yMin <= 0 && yMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(0));
      ctx.lineTo(W - pad.right, toY(0));
      ctx.stroke();
    }
    // y-axis
    if (xMin <= 0 && xMax >= 0) {
      ctx.beginPath();
      ctx.moveTo(toX(0), pad.top);
      ctx.lineTo(toX(0), H - pad.bottom);
      ctx.stroke();
    }
  }

  _drawCurve(ctx, f, xMin, xMax, toX, toY, W) {
    ctx.beginPath();
    ctx.strokeStyle = '#b07c51';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#dfb48a';
    ctx.shadowBlur  = 6;
    let first = true;
    const steps = W * 2;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = f(x);
      if (!isFinite(y)) { first = true; continue; }
      const cx = toX(x), cy = toY(y);
      if (first) { ctx.moveTo(cx, cy); first = false; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawIterations(ctx, iters, activeI, f, toX, toY) {
    iters.forEach((row, idx) => {
      const isActive = idx === activeI || activeI === -1;
      const alpha    = isActive ? 0.9 : 0.3;

      // Secant line
      ctx.beginPath();
      ctx.strokeStyle = `rgba(159,114,71,${alpha})`;
      ctx.lineWidth = isActive ? 1.5 : 1;
      ctx.setLineDash([5, 4]);
      ctx.moveTo(toX(row.a), toY(row.fa));
      ctx.lineTo(toX(row.b), toY(row.fb));
      ctx.stroke();
      ctx.setLineDash([]);

      // xr vertical drop
      ctx.beginPath();
      ctx.strokeStyle = `rgba(159,114,71,${alpha * 0.7})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(toX(row.xr), toY(0));
      ctx.lineTo(toX(row.xr), toY(row.fxr));
      ctx.stroke();
      ctx.setLineDash([]);

      // xr dot on x-axis
      ctx.beginPath();
      ctx.fillStyle = `rgba(139,103,71,${alpha})`;
      ctx.arc(toX(row.xr), toY(0), isActive ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();

      // label
      if (isActive) {
        ctx.fillStyle = 'rgba(99,72,51,0.95)';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`x${row.iter}`, toX(row.xr), toY(0) - 10);
      }
    });
  }

  _drawBrackets(ctx, a, b, f, toX, toY) {
    [[a, f(a), '#8a6241', 'a'], [b, f(b), '#b89d70', 'b']].forEach(([x, y, color, label]) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(toX(x), toY(y), 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = 'bold 12px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, toX(x), toY(y) - 12);
    });
  }

  _drawRoot(ctx, xr, toX, toY) {
    const cx = toX(xr);
    const cy = toY(0);
    // glow ring
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(159,114,71,0.35)';
    ctx.lineWidth = 2;
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    // solid dot
    ctx.beginPath();
    ctx.fillStyle = '#8f6f55';
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawAxisLabels(ctx, xMin, xMax, yMin, yMax, toX, toY) {
    ctx.fillStyle = 'rgba(87,61,43,0.85)';
    ctx.font = '10px JetBrains Mono, monospace';
    const xTicks = this._niceTicks(xMin, xMax, 8);
    const yTicks = this._niceTicks(yMin, yMax, 6);

    ctx.textAlign = 'center';
    xTicks.forEach(x => {
      const lbl = Math.abs(x) < 1e-10 ? '0' : x.toPrecision(3);
      ctx.fillText(lbl, toX(x), this.canvas.height - this.padding.bottom + 14);
    });

    ctx.textAlign = 'right';
    yTicks.forEach(y => {
      const lbl = Math.abs(y) < 1e-10 ? '0' : y.toPrecision(3);
      ctx.fillText(lbl, this.padding.left - 6, toY(y) + 4);
    });
  }

  _niceTicks(min, max, count) {
    const range = max - min;
    const raw   = range / count;
    const mag   = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice  = [1, 2, 2.5, 5, 10].find(n => n * mag >= raw) * mag;
    const start = Math.ceil(min / nice) * nice;
    const ticks = [];
    for (let t = start; t <= max + nice * 0.01; t += nice) ticks.push(+t.toPrecision(10));
    return ticks;
  }
}
