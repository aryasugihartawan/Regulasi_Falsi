/* ============================================================
   regulaFalsi.js — Core Regula Falsi computation engine
   Used by: kalkulator.html via <script src>
   ============================================================ */

/**
 * Parse a math expression string into a callable JS function.
 * Supports: +, -, *, /, ^, (), sin, cos, tan, exp, log, sqrt, abs, PI, E
 *
 * @param {string} expr - e.g. "x^3 - 3*x - 1"
 * @returns {function(number): number}
 */
function parseFn(expr) {
  // Replace ^ with ** for exponentiation
  let e = expr
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\blog\b/g, 'Math.log')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs');

  return new Function('x', `"use strict"; return (${e});`);
}

/**
 * Run Regula Falsi method.
 *
 * @param {function} f        - evaluated function
 * @param {number}   a        - left bracket
 * @param {number}   b        - right bracket
 * @param {number}   epsilon  - stopping tolerance |f(xr)|
 * @param {number}   maxIter  - maximum iterations
 * @returns {{ root: number, iterations: Array, converged: boolean, message: string }}
 */
function runRegulaFalsi(f, a, b, epsilon = 1e-7, maxIter = 100) {
  const fa0 = f(a);
  const fb0 = f(b);

  function formatNumber(value, digits = 6) {
    if (!isFinite(value)) return String(value);
    if (Math.abs(value) < 1e-12) return '0';
    return value.toFixed(digits).replace(/(\.[0-9]*?)0+$/,'$1').replace(/\.$/, '');
  }

  if (fa0 * fb0 > 0) {
    return {
      root: null,
      iterations: [],
      converged: false,
      message: `f(a)·f(b) = ${formatNumber(fa0 * fb0, 6)} > 0. Pilih interval yang mengapit akar (f(a)·f(b) < 0).`
    };
  }

  if (fa0 === 0) return { root: a, iterations: [], converged: true, message: `a = ${a} sudah merupakan akar.` };
  if (fb0 === 0) return { root: b, iterations: [], converged: true, message: `b = ${b} sudah merupakan akar.` };

  const rows = [];
  let xr = a, xrPrev;
  let curA = a, curB = b;

  for (let i = 0; i < maxIter; i++) {
    const fa  = f(curA);
    const fb  = f(curB);
    xrPrev    = xr;

    // Regula Falsi formula
    xr = curB - (fb * (curB - curA)) / (fb - fa);
    const fxr = f(xr);

    const errRel = i === 0
      ? null
      : Math.abs((xr - xrPrev) / xr);

    rows.push({
      iter:   i + 1,
      a:      curA,
      b:      curB,
      xr,
      fa,
      fb,
      fxr,
      errRel,
      width:  curB - curA
    });

    // Stopping criteria
    if (Math.abs(fxr) <= epsilon) {
      return {
        root: xr,
        iterations: rows,
        converged: true,
        message: `Konvergen setelah ${i + 1} iterasi. Akar ≈ ${xr.toFixed(10)}`
      };
    }

    // Update bracket
    if (fa * fxr < 0) curB = xr;
    else               curA = xr;
  }

  return {
    root: xr,
    iterations: rows,
    converged: false,
    message: `Mencapai iterasi maksimum (${maxIter}). Aproksimasi terakhir: ${xr.toFixed(10)}`
  };
}
