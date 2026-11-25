/*!
 * qrcode.js — gerador de QR Code compacto, sem dependências (modo byte, níveis L/M/Q/H, versões 1–40).
 * Baseado no algoritmo de referência da norma ISO/IEC 18004 (mesma lógica do "QR Code generator" de Nayuki, MIT).
 * Uso: QR.svg('texto', { ecc: 'M', border: 4, dark: '#3b2a1a', light: '#fff' })  → string <svg>
 */
(function (global) {
  'use strict';

  var ECC = { L: 0, M: 1, Q: 2, H: 3 };
  var FORMAT_BITS = [1, 0, 3, 2]; // L, M, Q, H
  var ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver, ecl) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
  }

  // ---- Reed–Solomon em GF(256) ----
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ res.shift();
      res.push(0);
      div.forEach(function (c, i) { res[i] ^= gfMul(c, f); });
    });
    return res;
  }

  function encode(text, eclName) {
    var ecl = ECC[eclName || 'M'];
    var bytes = Array.from(new TextEncoder().encode(text));

    // escolhe a menor versão que comporta os dados
    var ver, ccBits;
    for (ver = 1; ver <= 40; ver++) {
      ccBits = ver <= 9 ? 8 : 16;
      if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
    }
    if (ver > 40) throw new Error('Texto longo demais para QR Code');

    // fluxo de bits
    var bb = [];
    function append(val, len) { for (var i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); }
    append(0x4, 4);                 // modo byte
    append(bytes.length, ccBits);
    bytes.forEach(function (b) { append(b, 8); });
    var cap = dataCodewords(ver, ecl) * 8;
    append(0, Math.min(4, cap - bb.length));
    append(0, (8 - bb.length % 8) % 8);
    for (var pad = 0xEC; bb.length < cap; pad ^= 0xEC ^ 0x11) append(pad, 8);
    var data = [];
    for (var i = 0; i < bb.length; i += 8) {
      var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bb[i + j];
      data.push(v);
    }

    // blocos + correção de erro + intercalação
    var nb = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var div = rsDivisor(eccLen), blocks = [], k = 0;
    for (var b = 0; b < nb; b++) {
      var dat = data.slice(k, k + shortLen - eccLen + (b < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (b < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) {
      for (var d = 0; d < blocks.length; d++) {
        if (c !== shortLen - eccLen || d >= nShort) all.push(blocks[d][c]);
      }
    }

    // matriz
    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (var y = 0; y < size; y++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, dark) { mod[y][x] = dark; fn[y][x] = true; }

    function finder(x, y) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, dist !== 2 && dist !== 4);
      }
    }
    function align(x, y) {
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
        setF(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    function alignPos() {
      if (ver === 1) return [];
      var n = Math.floor(ver / 7) + 2;
      var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
      var res = [6];
      for (var p = size - 7; res.length < n; p -= step) res.splice(1, 0, p);
      return res;
    }
    function formatBits(mask) {
      var dataF = FORMAT_BITS[ecl] << 3 | mask, rem = dataF;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = (dataF << 10 | rem) ^ 0x5412;
      for (i = 0; i <= 5; i++) setF(8, i, bit(bits, i));
      setF(8, 7, bit(bits, 6)); setF(8, 8, bit(bits, 7)); setF(7, 8, bit(bits, 8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(bits, i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(bits, i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(bits, i));
      setF(8, size - 8, true);
    }
    function versionBits() {
      if (ver < 7) return;
      var rem = ver;
      for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = ver << 12 | rem;
      for (i = 0; i < 18; i++) {
        var bt = bit(bits, i), a = size - 11 + i % 3, bb2 = Math.floor(i / 3);
        setF(a, bb2, bt); setF(bb2, a, bt);
      }
    }

    for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var ap = alignPos(), na = ap.length;
    for (var ai = 0; ai < na; ai++) for (var aj = 0; aj < na; aj++) {
      if (!((ai === 0 && aj === 0) || (ai === 0 && aj === na - 1) || (ai === na - 1 && aj === 0))) align(ap[ai], ap[aj]);
    }
    formatBits(0);
    versionBits();

    // posiciona os codewords em zigue-zague
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj, up = ((right + 1) & 2) === 0, yy2 = up ? size - 1 - vert : vert;
          if (!fn[yy2][x] && bi < all.length * 8) {
            mod[yy2][x] = bit(all[bi >>> 3], 7 - (bi & 7));
            bi++;
          }
        }
      }
    }

    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        if (fn[y][x]) continue;
        var inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (inv) mod[y][x] = !mod[y][x];
      }
    }
    // pontuação simplificada (regras 1, 2 e 4 da norma) para escolher a melhor máscara
    function penalty() {
      var p = 0, x, y, run, dark = 0;
      for (y = 0; y < size; y++) {
        run = 1;
        for (x = 1; x < size; x++) {
          if (mod[y][x] === mod[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
      for (x = 0; x < size; x++) {
        run = 1;
        for (y = 1; y < size; y++) {
          if (mod[y][x] === mod[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
        var c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
      // regra 3: padrões parecidos com o "olho" (1:1:3:1:1) seguidos/precedidos de 4 claros
      var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      function at(xx, yy) { return (xx < 0 || yy < 0 || xx >= size || yy >= size) ? 0 : (mod[yy][xx] ? 1 : 0); }
      function match(xx, yy, dx, dy, pat) {
        for (var i = 0; i < 11; i++) if (at(xx + dx * i, yy + dy * i) !== pat[i]) return false;
        return true;
      }
      for (y = 0; y < size; y++) for (x = -4; x < size; x++) {
        if (match(x, y, 1, 0, P1) || match(x, y, 1, 0, P2)) p += 40;
        if (match(y, x, 0, 1, P1) || match(y, x, 0, 1, P2)) p += 40;
      }
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mod[y][x]) dark++;
      var total = size * size;
      p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return p;
    }
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); formatBits(m);
      var pp = penalty();
      if (pp < bestP) { bestP = pp; best = m; }
      applyMask(m);
    }
    applyMask(best); formatBits(best);
    return { size: size, modules: mod, version: ver };
  }

  function svg(text, opt) {
    opt = opt || {};
    var q = encode(text, opt.ecc || 'M');
    var border = opt.border == null ? 4 : opt.border;
    var n = q.size + border * 2, d = [];
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) {
      if (q.modules[y][x]) d.push('M' + (x + border) + ' ' + (y + border) + 'h1v1h-1z');
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="' + (opt.label || 'QR Code') + '">' +
      '<rect width="100%" height="100%" fill="' + (opt.light || '#ffffff') + '"/>' +
      '<path fill="' + (opt.dark || '#000000') + '" d="' + d.join('') + '"/></svg>';
  }

  global.QR = { encode: encode, svg: svg };
})(typeof window !== 'undefined' ? window : globalThis);
