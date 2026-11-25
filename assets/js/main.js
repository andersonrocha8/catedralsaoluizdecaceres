/* =========================================================
   Comportamento da página: config, PIX, QR, tags, animações
   ========================================================= */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var C = window.CAMPANHA || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var get = function (path) { return path.split('.').reduce(function (o, k) { return o ? o[k] : undefined; }, C); };
  var brl = function (v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Preenche a página com a configuração ---------- */
  $$('[data-cfg]').forEach(function (el) { var v = get(el.dataset.cfg); if (v) el.textContent = v; });
  $$('[data-cfg-href]').forEach(function (el) { var v = get(el.dataset.cfgHref); if (v) el.href = v; });
  var host = (C.site && C.site.url) ? C.site.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : location.host;
  $$('[data-host]').forEach(function (el) { if (host) el.textContent = host; });
  if (C.banco && C.banco.ativo === false) { var b = $('#banco'); if (b) b.hidden = true; }
  if (C.contato && C.contato.whatsapp) {
    $('#wa-wrap').hidden = false;
    $('#wa-link').href = 'https://wa.me/' + C.contato.whatsapp + '?text=' + encodeURIComponent('Olá! Quero ajudar na restauração da Catedral São Luiz.');
  }

  /* ---------- 2. Origem (tags / QR codes) ---------- */
  var params = new URLSearchParams(location.search);
  var tagCode = (params.get('t') || '').toLowerCase().replace(/[^a-z0-9\-_]/g, '').slice(0, 40);
  var tag = tagCode && C.tags ? C.tags[tagCode] : null;
  if (tag && tag.redirect) { location.replace(tag.redirect); return; }
  var txid = (tag && tag.txid) || (C.pix && C.pix.txidPadrao) || '';
  try { if (tagCode) sessionStorage.setItem('origem', tagCode); } catch (e) {}

  /* Estatística opcional sem cookies (GoatCounter) */
  function track(path, title) {
    var gc = C.analytics && C.analytics.goatcounter;
    if (!gc) return;
    var url = gc + '?p=' + encodeURIComponent(path) + '&t=' + encodeURIComponent(title || path) + '&rnd=' + Math.random().toString(36).slice(2);
    if (navigator.sendBeacon) navigator.sendBeacon(url); else new Image().src = url;
  }
  track(tagCode ? '/t/' + tagCode : location.pathname, tag ? tag.rotulo : document.title);

  /* ---------- 3. PIX: valores, copia-e-cola e QR ---------- */
  var pixCfg = C.pix || {};
  var state = { valor: null };
  var initialValor = parseFloat((params.get('v') || '').replace(',', '.'));
  if (tag && tag.valor) initialValor = tag.valor;

  function copiaECola() {
    return window.Pix.brcode({
      chave: pixCfg.chave, nome: pixCfg.nomeBrCode, cidade: pixCfg.cidadeBrCode,
      valor: state.valor, txid: txid, descricao: pixCfg.descricao
    });
  }
  function renderQR() {
    var box = $('#qr-img'); if (!box || !window.QR) return;
    box.innerHTML = window.QR.svg(copiaECola(), { ecc: 'M', border: 2, dark: '#2E2216', light: '#FFFDF9', label: 'QR Code PIX para doação' });
    $('#qr-hint').innerHTML = state.valor
      ? 'QR Code para doar <strong>' + brl(state.valor) + '</strong>'
      : 'QR Code para doar <strong>qualquer valor</strong>';
  }
  function setValor(v, fromInput) {
    state.valor = v && v > 0 ? Math.round(v * 100) / 100 : null;
    $$('.amount').forEach(function (b) { b.setAttribute('aria-checked', String(Number(b.dataset.v) === state.valor)); });
    if (!fromInput) { var inp = $('#valor-outro'); if (inp) inp.value = ''; }
    renderQR();
  }
  var amounts = $('#valores');
  (pixCfg.valoresSugeridos || []).forEach(function (v) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'amount'; b.dataset.v = v; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.textContent = brl(v).replace(',00', '');
    b.addEventListener('click', function () { setValor(state.valor === v ? null : v); });
    amounts.appendChild(b);
  });
  var outro = $('#valor-outro');
  if (outro) outro.addEventListener('input', function () {
    var raw = outro.value.replace(/[^\d,\.]/g, '');
    outro.value = raw;
    var v = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    setValor(isNaN(v) ? null : Math.min(v, 1000000), true);
  });
  setValor(isNaN(initialValor) ? null : initialValor);
  if (!isNaN(initialValor) && initialValor > 0 && outro && !(pixCfg.valoresSugeridos || []).includes(initialValor)) outro.value = String(initialValor).replace('.', ',');

  /* ---------- 4. Copiar (Clipboard API + alternativa) ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(e); }
      document.body.removeChild(ta);
    });
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var kind = btn.dataset.copy;
      var text = kind === 'chave' ? pixCfg.chave : copiaECola();
      var label = btn.querySelector('span'), old = label ? label.textContent : '';
      copyText(text).then(function () {
        btn.classList.add('is-done'); if (label) label.textContent = 'Copiado!';
        toast(kind === 'chave' ? 'Chave PIX copiada. Agora abra o app do seu banco.' : 'PIX Copia e Cola copiado. Cole no app do banco.');
        if (navigator.vibrate) navigator.vibrate(30);
        track('/evento/copiar-' + kind + (tagCode ? '/' + tagCode : ''), 'Copiou ' + kind);
        setTimeout(function () { btn.classList.remove('is-done'); if (label) label.textContent = old; }, 2400);
      }).catch(function () {
        toast('Não foi possível copiar. Toque e segure a chave para copiar.');
      });
    });
  });

  /* Compartilhar (Web Share API, só aparece se o aparelho suportar) */
  var share = $('#btn-share');
  if (share && navigator.share) {
    share.hidden = false;
    share.addEventListener('click', function () {
      navigator.share({ title: 'Restauração da Catedral São Luiz de Cáceres', text: 'Ajude a restaurar a Catedral São Luiz de Cáceres. Doe via PIX:', url: (C.site && C.site.url) || location.origin + location.pathname }).catch(function () {});
    });
  }

  /* ---------- 5. Progresso da arrecadação ---------- */
  var pr = C.progresso || {};
  if (pr.meta && pr.arrecadado != null) {
    var pct = Math.max(0, Math.min(100, pr.arrecadado / pr.meta * 100));
    $('#progresso').hidden = false;
    $('#prog-valor').textContent = brl(pr.arrecadado);
    $('#prog-meta').textContent = 'Meta: ' + brl(pr.meta) + ' (' + pct.toFixed(0) + '%)';
    if (pr.atualizadoEm) $('#prog-data').textContent = 'Atualizado em ' + new Date(pr.atualizadoEm + 'T12:00:00').toLocaleDateString('pt-BR');
    $('#progresso [role=progressbar]').setAttribute('aria-valuenow', pct.toFixed(0));
    $('#progresso').dataset.pct = pct;
  }

  /* ---------- 6. Agenda (some sozinha após a data) ---------- */
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var futuros = (C.eventos || []).filter(function (e) { return new Date(e.data + 'T23:59:59') >= hoje; });
  var evBox = $('#events');
  if (!futuros.length) { $('#agenda').hidden = true; $$('a[href="#agenda"]').forEach(function (a) { a.hidden = true; }); }
  futuros.forEach(function (e, i) {
    var d = new Date(e.data + 'T12:00:00');
    var art = document.createElement('article');
    art.className = 'event reveal'; art.style.setProperty('--d', (i * 0.1) + 's');
    art.innerHTML = '<div class="event__date"><b>' + d.getDate() + '</b><span>' + meses[d.getMonth()] + '</span></div>' +
      '<div><h3></h3><p class="ev-h"></p><p class="ev-l"></p><p class="ev-t"></p>' + (e.detalhe ? '<span class="tag"></span>' : '') + '</div>';
    art.querySelector('h3').textContent = e.titulo;
    art.querySelector('.ev-h').textContent = '⏰ ' + e.horario;
    art.querySelector('.ev-l').textContent = '📍 ' + e.local;
    art.querySelector('.ev-t').textContent = e.texto || '';
    if (e.detalhe) art.querySelector('.tag').textContent = e.detalhe;
    evBox.appendChild(art);
  });

  /* ---------- 7. Benfeitores ---------- */
  var niveis = { 'pedra-angular': 'Pedra Angular', 'coluna': 'Coluna', 'vitral': 'Vitral' };
  var bf = (C.benfeitores || []);
  var grid = $('#benf-grid');
  if (bf.length) {
    $('#benf-empty').hidden = true;
    var ordem = ['pedra-angular', 'coluna', 'vitral'];
    bf.slice().sort(function (a, b) { return ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel); }).forEach(function (p, i) {
      var el = document.createElement(p.site ? 'a' : 'div');
      el.className = 'benf reveal benf--' + (p.nivel || 'vitral');
      el.style.setProperty('--d', (i % 6) * 0.06 + 's');
      if (p.site) { el.href = p.site; el.target = '_blank'; el.rel = 'noopener'; }
      if (p.logo) { var img = new Image(); img.src = p.logo; img.alt = p.nome; img.loading = 'lazy'; el.appendChild(img); }
      var n = document.createElement('span'); n.className = 'benf__name'; n.textContent = p.nome; el.appendChild(n);
      var t = document.createElement('span'); t.className = 'benf__tier'; t.textContent = niveis[p.nivel] || ''; el.appendChild(t);
      grid.appendChild(el);
    });
  }

  /* ---------- 8. Mural (v2: só liga quando o backend existir) ---------- */
  if (C.mural && C.mural.ativo && C.mural.endpoint) {
    fetch(C.mural.endpoint, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (itens) {
        if (!itens || !itens.length) return;
        var ul = $('#mural-list');
        itens.forEach(function (it) {
          var li = document.createElement('li'); li.className = 'mural__item';
          var b2 = document.createElement('b'); b2.textContent = it.nome; li.appendChild(b2);
          if (it.mensagem) { var p = document.createElement('p'); p.textContent = '“' + it.mensagem + '”'; li.appendChild(p); }
          ul.appendChild(li);
        });
        $('#mural').hidden = false;
      }).catch(function () {});
  }

  /* ---------- 9. Animações de entrada (IntersectionObserver) ---------- */
  function observe() {
    var els = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        if (en.target.id === 'progresso') { $('#prog-fill').style.width = en.target.dataset.pct + '%'; }
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
    var img = $('.objetivo__img'); if (img) io.observe(img);
  }
  observe();
  if (reduced && $('#progresso').dataset.pct) $('#prog-fill').style.width = $('#progresso').dataset.pct + '%';

  /* ---------- 10. Cabeçalho, barra de leitura, parallax, dock ---------- */
  var topbar = $('.topbar'), bar = $('.topbar__progress'), paint = $('.hero__paint');
  var dock = $('#dock'), doar = $('#doar'), footer = $('.footer');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    topbar.classList.toggle('is-scrolled', y > 10);
    bar.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
    if (paint && !reduced && y < innerHeight) paint.style.setProperty('--parallax', (y * 0.08).toFixed(1) + 'px');
    // dock aparece depois do hero e some quando a seção de doação ou o rodapé estão na tela
    var rD = doar.getBoundingClientRect(), rF = footer.getBoundingClientRect();
    var inDoar = rD.top < innerHeight * 0.85 && rD.bottom > innerHeight * 0.15;
    var on = y > innerHeight * 0.6 && !inDoar && rF.top > innerHeight;
    dock.classList.toggle('is-on', on);
    dock.setAttribute('aria-hidden', String(!on));
    var dockBtn = dock.querySelector('button'); if (dockBtn) dockBtn.tabIndex = on ? 0 : -1;
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- 11. Tag com seção de destino ---------- */
  if (tag && tag.secao) {
    var alvo = $(tag.secao);
    if (alvo) setTimeout(function () { alvo.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }, 350);
  }
})();
