(function () {
  'use strict';
  var view = document.getElementById('view');
  var ctx = document.getElementById('ctx');
  var tabsEl = document.getElementById('tabs');
  var DATA = {};
  var tab = 'konular';
  var navStack = []; // {render}

  var SUBJ = {
    turkce: {e: '🔤', g: 'linear-gradient(135deg,#3B82F6,#2563EB)', a: '#2563EB', s: '#E8F0FE', l: 'Türkçe', d: 'Sözcük–cümle anlam, paragraf, dil bilgisi', svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'},
    tarih: {e: '📜', g: 'linear-gradient(135deg,#F59E0B,#F97316)', a: '#EA7B0E', s: '#FEF3E2', l: 'Tarih', d: 'İlk Türkler → Osmanlı → Cumhuriyet', svg: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 2 20 7H4z"/>'},
    cografya: {e: '🌍', g: 'linear-gradient(135deg,#10B981,#14B8A6)', a: '#0E9F73', s: '#E5F8F1', l: 'Coğrafya', d: 'Konum, iklim, yer şekilleri, ekonomi', svg: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>'},
    vatandaslik: {e: '⚖️', g: 'linear-gradient(135deg,#6366F1,#7C3AED)', a: '#5B53E8', s: '#EDEBFB', l: 'Vatandaşlık', d: 'Anayasa, yasama, yürütme, yargı', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},
    guncel: {e: '🗞️', g: 'linear-gradient(135deg,#EC4899,#EF4444)', a: '#E0457C', s: '#FCE9F1', l: 'Güncel', d: 'Güncel bilgiler ve rekortmenler', svg: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>'},
  };
  function sj(k) { return SUBJ[k] || SUBJ.guncel; }
  function esc(t) { return (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inl(t) { return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }

  /* ---------- Markdown ---------- */
  function md(src) {
    var lines = (src || '').replace(/\r\n/g, '\n').split('\n');
    var out = [], i = 0;
    while (i < lines.length) {
      var raw = lines[i], line = raw.trim();
      if (line === '') { i++; continue; }
      if (/^(={3,}|-{3,}|_{3,}|\*{3,})$/.test(line)) { out.push('<hr>'); i++; continue; }
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { var lv = Math.min(3, h[1].length); out.push('<h' + lv + '>' + inl(h[2]) + '</h' + lv + '>'); i++; continue; }
      if (line[0] === '>') {
        var q = [];
        while (i < lines.length && lines[i].trim()[0] === '>') { q.push(inl(lines[i].trim().replace(/^>\s?/, ''))); i++; }
        out.push('<blockquote>' + q.join('<br>') + '</blockquote>'); continue;
      }
      if (line[0] === '|') {
        var rows = [];
        while (i < lines.length && lines[i].trim()[0] === '|') { rows.push(lines[i].trim()); i++; }
        var parsed = rows.map(function (r) { return r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); });
        var hdr = null, body = parsed;
        if (parsed.length >= 2 && parsed[1].every(function (c) { return c === '' || /^:?-{2,}:?$/.test(c); })) { hdr = parsed[0]; body = parsed.slice(2); }
        var th = '';
        if (hdr) th = '<tr>' + hdr.map(function (c) { return '<th>' + inl(c) + '</th>'; }).join('') + '</tr>';
        var tb = body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inl(c) + '</td>'; }).join('') + '</tr>'; }).join('');
        out.push('<div class="tblwrap"><table>' + th + tb + '</table></div>'); continue;
      }
      var b = raw.match(/^\s*[-*•]\s+(.*)$/);
      if (b) {
        var items = [];
        while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items.push('<li>' + inl(lines[i].replace(/^\s*[-*•]\s+/, '')) + '</li>'); i++; }
        out.push('<ul>' + items.join('') + '</ul>'); continue;
      }
      var n = raw.match(/^\s*\d+[.)]\s+(.*)$/);
      if (n) {
        var its = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { its.push('<li>' + inl(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); i++; }
        out.push('<ol>' + its.join('') + '</ol>'); continue;
      }
      out.push('<p>' + inl(line) + '</p>'); i++;
    }
    return out.join('');
  }

  /* ---------- Router ---------- */
  function setActive(t) {
    Array.prototype.forEach.call(tabsEl.querySelectorAll('button[data-t]'), function (c) { c.classList.toggle('on', c.dataset.t === t); });
  }
  function setBar(title, sub, withBack, right) {
    ctx.innerHTML = '<div class="ctx-in">' +
      (withBack ? '<button class="cback" id="bk" aria-label="Geri">‹</button>' : '') +
      '<div class="ctx-t"><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
      (right ? '<button class="barbtn" id="barright">' + right.label + '</button>' : '') +
      '</div>';
    if (withBack) document.getElementById('bk').onclick = goBack;
    if (right) document.getElementById('barright').onclick = right.onClick;
  }
  function goBack() { navStack.pop(); var f = navStack[navStack.length - 1]; if (f) f(); else openTab(tab); window.scrollTo(0, 0); }
  function push(fn) { navStack.push(fn); fn(); window.scrollTo(0, 0); }
  function openTab(t) {
    tab = t; navStack = [];
    setActive(t);
    closeSheet();
    if (t === 'konular') renderSubjects();
    else if (t === 'harita') renderMap();
    else if (t === 'test') renderTestHome();
    else if (t === 'hizli') renderHizliHome();
    else if (t === 'notlar') renderNotes();
    window.scrollTo(0, 0);
  }

  /* ---------- Konular ---------- */
  function renderSubjects() {
    setBar('📖 KPSS Pusula', 'Konu anlatımı · web', false);
    var total = DATA.content.reduce(function (a, s) { return a + s.topics.length; }, 0);
    var h = '<div class="wrap">' +
      '<div class="welcome"><h2>Nereden başlayalım?</h2><p>' + total + ' konu · ' + DATA.questions.length + ' soru · ' + DATA.exams.count + ' deneme — hepsi çevrimdışı.</p></div>' +
      '<div class="subjlist">';
    DATA.content.forEach(function (s) {
      var st = sj(s.key);
      h += '<div class="card subjrow" data-s="' + s.key + '">' +
        '<div class="badge" style="background:' + st.g + '"><svg viewBox="0 0 24 24">' + (st.svg || '') + '</svg></div>' +
        '<div class="sb-body"><h3>' + st.l + '</h3><p>' + (st.d || '') + '</p></div>' +
        '<span class="pill" style="background:' + st.s + ';color:' + st.a + '">' + s.topics.length + ' konu</span>' +
        '<span class="sb-chev">›</span></div>';
    });
    h += '</div></div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('[data-s]'), function (el) {
      el.onclick = function () { push(function () { renderTopicList(el.dataset.s); }); };
    });
  }
  function renderTopicList(skey) {
    var s = DATA.content.find(function (x) { return x.key === skey; }); var st = sj(skey);
    setBar(st.e + ' ' + st.l, s.topics.length + ' konu', true);
    var h = '<div class="wrap tlistwrap">';
    if (skey === 'tarih') {
      h += '<div class="card hzcard" id="hzquick"><div class="badge" style="background:linear-gradient(135deg,#F59E0B,#EF4444);width:46px;height:46px">⚡</div>' +
        '<div class="sb-body"><h3>Hızlı Tekrar</h3><p>Padişahlar + tüm konu özetleri</p></div><span class="sb-chev">›</span></div>';
    }
    h += '<div class="tlist">';
    s.topics.forEach(function (t, idx) {
      h += '<div class="card" data-t="' + idx + '"><div class="tnum" style="background:' + st.a + '">' + (idx + 1) + '</div>' +
        '<div class="ttl">' + esc(t.title) + '</div><div class="chev">›</div></div>';
    });
    h += '</div></div>';
    view.innerHTML = h;
    var hq = document.getElementById('hzquick');
    if (hq) hq.onclick = function () { tab = 'hizli'; setActive('hizli'); navStack = [function () { renderTopicList(skey); }]; push(renderHizliHome); };
    Array.prototype.forEach.call(view.querySelectorAll('[data-t]'), function (el) {
      el.onclick = function () { push(function () { renderTopic(skey, +el.dataset.t); }); };
    });
  }
  function renderTopic(skey, idx, jump) {
    var s = DATA.content.find(function (x) { return x.key === skey; }); var st = sj(skey); var t = s.topics[idx];
    setBar(st.l + ' · ' + (idx + 1) + '/' + s.topics.length, '', true, {
      label: '📝 Not',
      onClick: function () { openNotePanel(t.title, skey + '#' + idx); }
    });
    view.innerHTML = '<div class="wrap"><div class="topic" id="tc">' + md(t.body) + '</div>' +
      '<button class="btn" id="addnote" style="width:100%;margin-top:14px">📌 Bu konuyu Notlarım\'a ekle</button>' +
      '<div class="btnrow">' +
      (idx > 0 ? '<button class="btn ghost" id="prev">‹ Önceki</button>' : '') +
      (idx < s.topics.length - 1 ? '<button class="btn ghost" id="next">Sonraki ›</button>' : '') +
      '</div></div>';
    document.getElementById('addnote').onclick = function () {
      addNote(t.title, '📌 ' + st.l + '\n\n' + t.body.replace(/[#*>]/g, '').slice(0, 600));
      toast('📌 Notlarım\'a eklendi');
    };
    var pv = document.getElementById('prev'), nx = document.getElementById('next');
    if (pv) pv.onclick = function () { navStack.pop(); push(function () { renderTopic(skey, idx - 1); }); };
    if (nx) nx.onclick = function () { navStack.pop(); push(function () { renderTopic(skey, idx + 1); }); };
    window.scrollTo(0, 0);
    if (jump) highlight(document.getElementById('tc'), jump);
  }
  function highlight(container, term) {
    var tw = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var nl = term.toLocaleLowerCase('tr');
    while (tw.nextNode()) {
      var node = tw.currentNode;
      if (node.nodeValue.toLocaleLowerCase('tr').indexOf(nl) >= 0) {
        var span = document.createElement('span'); span.className = 'hl';
        node.parentNode.replaceChild(span, node); span.appendChild(node);
        setTimeout(function () { span.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 120);
        return;
      }
    }
  }

  /* ---------- Hızlı Tekrar ---------- */
  function renderHizliHome() {
    setBar('⚡ Hızlı Tekrar', 'Sınav öncesi hızlı göz gezdir', tab !== 'hizli');
    var h = '<div class="wrap"><div class="welcome" style="padding-bottom:10px"><h2>Hızlı Tekrar</h2><p>Konuların en can alıcı bilgileri, tek akışta.</p></div><div class="subjlist">';
    h += '<div class="card subjrow" data-h="padisah"><div class="badge" style="background:linear-gradient(135deg,#B45309,#F59E0B)">👑</div>' +
      '<div class="sb-body"><h3>Osmanlı Padişahları</h3><p>36 padişah, dönem dönem tüm ayrıntılar</p></div><span class="sb-chev">›</span></div>';
    DATA.hizli.sections.forEach(function (sec) {
      h += '<div class="card subjrow" data-h="' + sec.key + '"><div class="badge" style="background:linear-gradient(135deg,#6D5DF6,#7C3AED)">📌</div>' +
        '<div class="sb-body"><h3>' + esc(sec.title.replace(/^[^A-Za-zÇĞİÖŞÜ0-9]+/, '')) + '</h3></div><span class="sb-chev">›</span></div>';
    });
    h += '</div></div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('[data-h]'), function (el) {
      el.onclick = function () {
        var k = el.dataset.h;
        if (k === 'padisah') push(renderPadisah);
        else push(function () { renderHizliSection(k); });
      };
    });
  }
  function renderHizliSection(key) {
    var sec = DATA.hizli.sections.find(function (x) { return x.key === key; });
    if (!sec) return;
    setBar('⚡ ' + esc(sec.title.replace(/^[^A-Za-zÇĞİÖŞÜ0-9]+/, '')).slice(0, 30), '', true);
    view.innerHTML = '<div class="wrap"><div class="topic">' + md(sec.raw) + '</div></div>';
    window.scrollTo(0, 0);
  }
  function renderPadisah() {
    setBar('👑 Osmanlı Padişahları', 'Dönem dönem', true);
    var h = '<div class="wrap">';
    DATA.hizli.padisah.forEach(function (era) {
      h += '<div class="era"><div class="era-h"><span>' + esc(era.title) + '</span><span class="era-y">' + esc(era.years || '') + '</span></div>';
      era.items.forEach(function (it) {
        if (it.type === 'note') { h += '<div class="pnote">' + inl(it.text) + '</div>'; return; }
        var stars = it.stars ? ' <span class="pstar">' + Array(it.stars + 1).join('⭐') + '</span>' : '';
        h += '<div class="pcard"><div class="pc-h"><span class="pno">' + (it.no || '') + '</span><span class="pname">' + esc(it.name) + stars + '</span><span class="preign">' + esc(it.reign || '') + '</span></div>';
        (it.fields || []).forEach(function (f) {
          h += '<div class="pf' + (f.important ? ' imp' : '') + '"><span class="pf-l">' + esc(f.label) + '</span><span class="pf-v">' + inl(f.value) + '</span></div>';
        });
        h += '</div>';
      });
      h += '</div>';
    });
    h += '</div>';
    view.innerHTML = h;
    window.scrollTo(0, 0);
  }

  /* ---------- Harita ---------- */
  var mapLayer = 'bolgeler', mapItem = 0;
  function renderMap() {
    setBar('🗺️ Türkiye Haritası', 'Katman seç, illere dokun', false);
    var m = DATA.map;
    var chips = m.layers.map(function (l) {
      return '<button class="chip ' + (l.key === mapLayer ? 'on' : '') + '" data-l="' + l.key + '">' + l.icon + ' ' + l.title + '</button>';
    }).join('');
    var layer = m.layers.find(function (l) { return l.key === mapLayer; }) || m.layers[0];
    var colorBy = {};
    if (layer.multi) layer.items.forEach(function (it) { it.plates.forEach(function (p) { colorBy[p] = it.color; }); });
    else { var it = layer.items[mapItem]; if (it) it.plates.forEach(function (p) { colorBy[p] = it.color; }); }
    var paths = m.provinces.map(function (p) {
      return '<path d="' + p.d + '" data-p="' + p.plate + '" fill="' + (colorBy[p.plate] || '#E6E8EE') + '"></path>';
    }).join('');
    var sub = '';
    if (!layer.multi) {
      sub = '<div class="chips">' + layer.items.map(function (it, i) {
        return '<button class="chip ' + (i === mapItem ? 'on' : '') + '" data-i="' + i + '" style="' + (i === mapItem ? 'background:' + it.color + ';border-color:' + it.color : '') + '">' + it.label + '</button>';
      }).join('') + '</div>';
      var act = layer.items[mapItem];
      if (act && act.note) sub += '<div class="wrap" style="padding-top:0"><div class="explain" style="border-left:4px solid ' + act.color + '">' + esc(act.note).replace(/\n/g, '<br>') + '</div></div>';
    } else {
      sub = '<div class="wrap" style="padding-top:0"><div class="legend">' + layer.items.map(function (it) {
        return '<div class="lg"><span class="dot" style="background:' + it.color + '"></span>' + it.label + '</div>';
      }).join('') + '</div></div>';
    }
    view.innerHTML = '<div class="chips">' + chips + '</div><div class="wrap mapwide"><div class="mapwrap"><svg viewBox="' + m.viewBox + '">' + paths + '</svg></div></div>' + sub +
      '<p class="hint">💡 Bir ile dokun → bilgileri alttan açılır.</p>' +
      (DATA.placement ? '<div class="wrap mapwide" style="padding-top:0"><button class="btn wide" id="goplace">🎯 Yerleştirme Oyunu — sürükle-bırak</button></div>' : '');
    Array.prototype.forEach.call(view.querySelectorAll('[data-l]'), function (el) { el.onclick = function () { mapLayer = el.dataset.l; mapItem = 0; renderMap(); }; });
    Array.prototype.forEach.call(view.querySelectorAll('[data-i]'), function (el) { el.onclick = function () { mapItem = +el.dataset.i; renderMap(); }; });
    Array.prototype.forEach.call(view.querySelectorAll('.mapwrap path'), function (el) { el.onclick = function () { showProvince(+el.dataset.p); }; });
    var gp = document.getElementById('goplace'); if (gp) gp.onclick = function () { push(renderPlacement); };
  }
  function showProvince(plate) {
    var m = DATA.map;
    var prov = m.provinces.find(function (p) { return p.plate === plate; });
    var region = m.plateRegion[plate] || '';
    var facts = [];
    m.layers.forEach(function (l) {
      if (l.key === 'bolgeler') return;
      var labels = l.items.filter(function (it) { return it.plates && it.plates.indexOf(plate) >= 0; }).map(function (it) { return it.label; });
      if (labels.length) facts.push('<div class="fact"><span class="ic">' + l.icon + '</span><div><div class="ft">' + l.title + '</div><div class="fl">' + labels.join(' · ') + '</div></div></div>');
    });
    var sh = document.getElementById('sheet');
    sh.innerHTML = '<div class="handle"></div><div class="row" style="align-items:flex-start"><div style="flex:1"><h3>📍 ' + (prov ? prov.name : '') + '</h3><div class="reg">' + region + ' Bölgesi</div></div><button class="x" id="shx">✕</button></div>' +
      '<div style="max-height:240px;overflow:auto">' + (facts.length ? facts.join('') : '<p class="muted" style="padding:14px 0">Bu il için ek katman bilgisi yok.</p>') + '</div>';
    sh.style.display = 'block';
    document.getElementById('shx').onclick = closeSheet;
  }
  function closeSheet() { var sh = document.getElementById('sheet'); if (sh) sh.style.display = 'none'; }

  /* ---------- Yerleştirme Oyunu ---------- */
  var PCOL = {
    dag_kuzey: '#8B5E3C', dag_guney: '#8B5E3C', dag_volkanik: '#EF4444', dag_kirik: '#8B5E3C',
    akarsu: '#2563EB', gol: '#06B6D4', ova: '#10B981', plato: '#92400E',
    delta: '#0D9488', sehir: '#EC4899', komsu: '#F59E0B',
  };
  var placeCat = null, placeSolved = {}, placeOrder = {};
  function pcol(k) { return PCOL[k] || '#7C3AED'; }
  function renderPlacement() {
    var P = DATA.placement;
    if (!placeCat || !P.categories.some(function (c) { return c.key === placeCat; })) placeCat = P.categories[0].key;
    var cat = P.categories.find(function (c) { return c.key === placeCat; });
    var col = pcol(placeCat);
    var solved = placeSolved[placeCat] || (placeSolved[placeCat] = {});
    var total = cat.items.length;
    var done = cat.items.filter(function (it) { return solved[it.name]; }).length;
    setBar('🎯 Yerleştirme Oyunu', cat.title, true);

    var chips = P.categories.map(function (c) {
      var d = placeSolved[c.key] ? Object.keys(placeSolved[c.key]).length : 0;
      var on = c.key === placeCat;
      return '<button class="chip' + (on ? ' on' : '') + '" data-pc="' + c.key + '"' +
        (on ? ' style="background:' + pcol(c.key) + ';border-color:' + pcol(c.key) + '"' : '') +
        '>' + esc(c.title) + ' (' + d + '/' + c.items.length + ')</button>';
    }).join('');

    var paths = DATA.map.provinces.map(function (p) { return '<path d="' + p.d + '"/>'; }).join('');
    var markers = cat.items.map(function (it, i) {
      if (solved[it.name]) {
        return '<g class="psolved">' +
          '<text x="' + it.x + '" y="' + (it.y - 12) + '" text-anchor="middle" class="plabel" style="fill:' + col + '">' + esc(it.name) + '</text>' +
          '<circle cx="' + it.x + '" cy="' + it.y + '" r="6.5" fill="' + col + '" stroke="#fff" stroke-width="1.6"/></g>';
      }
      return '<g class="ptarget"><circle cx="' + it.x + '" cy="' + it.y + '" r="9" fill="#fff" stroke="' + col + '" stroke-width="2.4" stroke-dasharray="3 3"/>' +
        '<text x="' + it.x + '" y="' + (it.y + 4) + '" text-anchor="middle" class="pq" style="fill:' + col + '">?</text></g>';
    }).join('');

    if (!placeOrder[placeCat]) placeOrder[placeCat] = shuffle(cat.items.map(function (it) { return it.name; }));
    var pool = placeOrder[placeCat].filter(function (nm) { return !solved[nm]; });
    var poolHtml = pool.map(function (nm) { return '<button class="pchip" data-name="' + esc(nm) + '" style="border-color:' + col + '55">' + esc(nm) + '</button>'; }).join('');

    var progress = '<div class="pbar"><div class="pbar-in" style="width:' + Math.round(done / total * 100) + '%;background:' + col + '"></div></div>';
    var bottom;
    if (done === total) {
      bottom = '<div class="wrap mapwide"><div class="pdone" style="border-color:' + col + '"><div class="pd-em">🎉</div>' +
        '<h3>Tebrikler!</h3><p><b>' + esc(cat.title) + '</b> — ' + total + '/' + total + ' doğru</p>' +
        '<button class="btn" id="preset">↺ Tekrar Başla</button></div></div>';
    } else {
      bottom = '<div class="wrap mapwide"><p class="hint" style="margin:10px 0 6px">💡 Aşağıdaki ismi haritadaki doğru noktaya sürükle-bırak.</p>' +
        '<div class="ppool">' + poolHtml + '</div></div>';
    }

    view.innerHTML = '<div class="chips pcats">' + chips + '</div>' +
      '<div class="wrap mapwide" style="padding-bottom:4px">' + progress +
      '<div class="mapwrap pmap"><svg id="pmap" viewBox="' + DATA.map.viewBox + '">' + paths + markers + '</svg></div></div>' + bottom;

    Array.prototype.forEach.call(view.querySelectorAll('[data-pc]'), function (el) {
      el.onclick = function () { placeCat = el.dataset.pc; renderPlacement(); };
    });
    var rs = document.getElementById('preset');
    if (rs) rs.onclick = function () { placeSolved[placeCat] = {}; placeOrder[placeCat] = null; renderPlacement(); };
    wirePlacementDrag(cat, solved, col);
  }

  function wirePlacementDrag(cat, solved, col) {
    var svg = document.getElementById('pmap');
    if (!svg) return;
    Array.prototype.forEach.call(view.querySelectorAll('.pchip'), function (chip) {
      chip.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var name = chip.dataset.name;
        var target = cat.items.find(function (it) { return it.name === name; });
        var fl = document.createElement('div');
        fl.className = 'pfloat';
        fl.textContent = name;
        fl.style.borderColor = col;
        document.body.appendChild(fl);
        chip.style.visibility = 'hidden';
        var move = function (e) { fl.style.left = e.clientX + 'px'; fl.style.top = e.clientY + 'px'; };
        move(ev);
        var up = function (e) {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          if (fl.parentNode) fl.parentNode.removeChild(fl);
          var r = svg.getBoundingClientRect();
          var vb = svg.viewBox.baseVal;
          var vx = vb.x + (e.clientX - r.left) / r.width * vb.width;
          var vy = vb.y + (e.clientY - r.top) / r.height * vb.height;
          var d2 = (target.x - vx) * (target.x - vx) + (target.y - vy) * (target.y - vy);
          if (d2 < 78 * 78) {
            solved[name] = true;
            renderPlacement();
          } else {
            chip.style.visibility = '';
            chip.classList.add('wrong');
            setTimeout(function () { chip.classList.remove('wrong'); }, 480);
          }
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    });
  }

  /* ---------- Test ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function byId(id) { return DATA.byId[id]; }

  function renderTestHome() {
    setBar('🎯 Test & Deneme', 'Kendini sına', false);
    var byS = {}; DATA.questions.forEach(function (q) { byS[q.subject] = (byS[q.subject] || 0) + 1; });
    var h = '<div class="wrap">' +
      '<div class="card feature" id="go-exam"><div class="ft-ic">📝</div><div style="flex:1"><h3>Denemeler</h3><p>' + DATA.exams.count + ' tam deneme · net hesabı · yanlış analizi</p></div><span class="sb-chev">›</span></div>' +
      '<div class="card feature alt" id="go-mix"><div class="ft-ic">🎲</div><div style="flex:1"><h3>Karışık Test</h3><p>Tüm derslerden 20 rastgele soru</p></div><span class="sb-chev">›</span></div>' +
      '<div class="secttl">Derse göre çöz</div>';
    Object.keys(SUBJ).forEach(function (k) {
      var st = sj(k), c = byS[k] || 0;
      h += '<div class="card trow" data-q="' + k + '" style="' + (c ? '' : 'opacity:.4;pointer-events:none') + '">' +
        '<div class="badge" style="background:' + st.s + ';width:46px;height:46px;font-size:22px">' + st.e + '</div>' +
        '<div style="flex:1"><div class="ttl">' + st.l + '</div><div class="sub2">' + (c ? c + ' soru' : 'Soru yok') + '</div></div><div class="chev">›</div></div>';
    });
    h += '</div>';
    view.innerHTML = h;
    document.getElementById('go-exam').onclick = function () { push(renderExams); };
    document.getElementById('go-mix').onclick = function () { startPractice(shuffle(DATA.questions).slice(0, 20), '🎲 Karışık Test', renderTestHome); };
    Array.prototype.forEach.call(view.querySelectorAll('[data-q]'), function (el) {
      el.onclick = function () { push(function () { renderTestSubject(el.dataset.q); }); };
    });
  }

  function renderTestSubject(skey) {
    var st = sj(skey);
    var s = DATA.content.find(function (x) { return x.key === skey; });
    var subjQ = DATA.questions.filter(function (q) { return q.subject === skey; });
    setBar(st.e + ' ' + st.l + ' Testleri', subjQ.length + ' soru', true);
    var h = '<div class="wrap">' +
      '<div class="card feature" style="background:' + st.g + '" id="mixsub"><div class="ft-ic">🎲</div><div style="flex:1"><h3 style="color:#fff">Karışık ' + st.l + '</h3><p style="color:rgba(255,255,255,.85)">20 rastgele soru</p></div><span class="sb-chev" style="color:#fff">›</span></div>' +
      '<div class="secttl">Konu konu test</div>';
    var any = false;
    (s ? s.topics : []).forEach(function (t) {
      var tests = DATA.topictests[t.key];
      if (!tests || !tests.length) return;
      any = true;
      h += '<div class="card ttcard"><div class="tt-top"><div class="tnum" style="background:' + st.a + '">•</div><div class="tt-name">' + esc(t.title) + '</div></div><div class="tt-btns">';
      tests.forEach(function (ids, i) {
        h += '<button class="ttbtn" data-topic="' + esc(t.key) + '" data-i="' + i + '">Test ' + (i + 1) + ' <small>' + ids.length + '</small></button>';
      });
      h += '</div></div>';
    });
    if (!any) h += '<p class="muted">Bu ders için konu testi yok.</p>';
    h += '</div>';
    view.innerHTML = h;
    document.getElementById('mixsub').onclick = function () { startPractice(shuffle(subjQ).slice(0, 20), '🎲 Karışık ' + st.l, function () { renderTestSubject(skey); }); };
    Array.prototype.forEach.call(view.querySelectorAll('[data-topic]'), function (el) {
      el.onclick = function () {
        var ids = DATA.topictests[el.dataset.topic][+el.dataset.i];
        var pool = ids.map(byId).filter(Boolean);
        var tt = DATA.content.find(function (x) { return x.key === skey; }).topics.find(function (t) { return t.key === el.dataset.topic; });
        startPractice(pool, (tt ? tt.title : '') + ' · Test ' + (+el.dataset.i + 1), function () { renderTestSubject(skey); });
      };
    });
  }

  /* --- Alıştırma (anında geri bildirim) --- */
  function startPractice(pool, title, backFn) {
    if (!pool.length) { toast('Soru bulunamadı'); return; }
    navStack.push(function () { startPractice(pool, title, backFn); });
    var idx = 0, score = 0;
    function q() {
      var cur = pool[idx], st = sj(cur.subject), picked = null;
      function draw() {
        setBar(title, 'Soru ' + (idx + 1) + '/' + pool.length, true);
        var opts = cur.options.map(function (o, oi) {
          var cls = 'opt', lt = 'ABCDE'[oi];
          if (picked != null) { if (oi === cur.correct) { cls = 'opt ok'; lt = '✓'; } else if (oi === picked) { cls = 'opt no'; lt = '✕'; } }
          return '<div class="' + cls + '" data-o="' + oi + '"><div class="lt">' + lt + '</div><div>' + inl(o) + '</div></div>';
        }).join('');
        var ex = '';
        if (picked != null) {
          ex = '<div class="explain"><b>' + (picked === cur.correct ? '✅ Doğru!' : '❌ Yanlış') + '</b><p style="margin:6px 0 0;color:var(--soft);font-size:14px">' + inl(cur.explain || '') + '</p>' +
            (cur.topicKey ? '<button class="btn ghost" id="goto" style="margin-top:12px">📖 Konuya Git</button>' : '') + '</div>' +
            '<button class="btn" id="nx" style="width:100%;margin-top:12px">' + (idx + 1 >= pool.length ? 'Bitir' : 'Sonraki ›') + '</button>';
        }
        view.innerHTML = '<div class="wrap"><div class="qprog"><div style="width:' + ((idx + 1) / pool.length * 100) + '%"></div></div>' +
          '<span class="pill" style="background:' + st.s + ';color:' + st.a + '">' + st.e + ' ' + st.l + '</span>' +
          '<p class="qtext">' + inl(cur.q) + '</p>' + opts + ex + '</div>';
        if (picked == null) Array.prototype.forEach.call(view.querySelectorAll('[data-o]'), function (el) {
          el.onclick = function () { picked = +el.dataset.o; if (picked === cur.correct) score++; draw(); };
        });
        else {
          document.getElementById('nx').onclick = function () { if (idx + 1 >= pool.length) result(); else { idx++; q(); } };
          var g = document.getElementById('goto');
          if (g) g.onclick = function () { gotoTopic(cur.topicKey, cur.jump); };
        }
        window.scrollTo(0, 0);
      }
      draw();
    }
    function result() {
      var pct = Math.round(score / pool.length * 100);
      setBar('Sonuç', title, true);
      view.innerHTML = '<div class="wrap resultwrap"><div class="ring" style="--p:' + pct + '"><div class="ring-in"><div class="ring-n">' + score + '/' + pool.length + '</div><div class="ring-p">%' + pct + '</div></div></div>' +
        '<p class="result-msg">' + (pct >= 80 ? 'Mükemmel! 🏆' : pct >= 50 ? 'İyi gidiyorsun! 💪' : 'Tekrar çalışalım 📚') + '</p>' +
        '<button class="btn" id="again" style="width:100%">🔄 Tekrar Çöz</button><button class="btn ghost" id="back" style="width:100%;margin-top:10px">Geri Dön</button></div>';
      document.getElementById('again').onclick = function () { navStack.pop(); startPractice(pool, title, backFn); };
      document.getElementById('back').onclick = goBack;
    }
    q();
  }

  /* --- Denemeler --- */
  var EKEY = 'kpss_web_exam_';
  function examResult(no) { try { return JSON.parse(localStorage.getItem(EKEY + no) || 'null'); } catch (e) { return null; } }
  function renderExams() {
    setBar('📝 Denemeler', DATA.exams.count + ' tam deneme', true);
    var h = '<div class="wrap"><p class="hint" style="margin:2px 0 14px">Her deneme ~60 soru · Net = Doğru − Yanlış ÷ 4</p><div class="examgrid">';
    DATA.exams.list.forEach(function (ex) {
      var r = examResult(ex.no);
      h += '<div class="card examcard" data-no="' + ex.no + '"><div class="ex-no">' + ex.no + '</div><div class="ex-body"><div class="ex-t">Deneme ' + ex.no + '</div>' +
        '<div class="ex-s">' + (r ? '✅ Net: <b>' + r.net + '</b> · D:' + r.dogru + ' Y:' + r.yanlis : ex.ids.length + ' soru') + '</div></div><span class="chev">›</span></div>';
    });
    h += '</div></div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('[data-no]'), function (el) {
      el.onclick = function () { var no = +el.dataset.no; var ex = DATA.exams.list.find(function (x) { return x.no === no; }); startExam(no, ex.ids.map(byId).filter(Boolean)); };
    });
  }
  function startExam(no, pool) {
    if (!pool.length) { toast('Deneme yüklenemedi'); return; }
    navStack.push(function () { renderExams(); });
    var idx = 0, answers = new Array(pool.length).fill(null);
    function q() {
      var cur = pool[idx], st = sj(cur.subject);
      setBar('Deneme ' + no, 'Soru ' + (idx + 1) + '/' + pool.length, true);
      var opts = cur.options.map(function (o, oi) {
        var cls = 'opt' + (answers[idx] === oi ? ' sel' : '');
        return '<div class="' + cls + '" data-o="' + oi + '"><div class="lt">' + 'ABCDE'[oi] + '</div><div>' + inl(o) + '</div></div>';
      }).join('');
      var nav = '<div class="btnrow">' +
        (idx > 0 ? '<button class="btn ghost" id="pv">‹ Önceki</button>' : '') +
        (idx + 1 < pool.length ? '<button class="btn" id="nx">Sonraki ›</button>' : '<button class="btn" id="fin" style="background:linear-gradient(135deg,#10B981,#0E9F73)">Bitir & Net Gör ✓</button>') +
        '</div>';
      view.innerHTML = '<div class="wrap"><div class="qprog"><div style="width:' + ((idx + 1) / pool.length * 100) + '%"></div></div>' +
        '<span class="pill" style="background:' + st.s + ';color:' + st.a + '">' + st.e + ' ' + st.l + '</span>' +
        '<p class="qtext">' + inl(cur.q) + '</p>' + opts + nav +
        '<button class="btn ghost" id="jump" style="width:100%;margin-top:10px;font-size:13px">⏭ Soruya git / bitir</button></div>';
      Array.prototype.forEach.call(view.querySelectorAll('[data-o]'), function (el) {
        el.onclick = function () { answers[idx] = (answers[idx] === +el.dataset.o) ? null : +el.dataset.o; q(); };
      });
      var pv = document.getElementById('pv'), nx = document.getElementById('nx'), fin = document.getElementById('fin');
      if (pv) pv.onclick = function () { idx--; q(); };
      if (nx) nx.onclick = function () { idx++; q(); };
      if (fin) fin.onclick = function () { finish(); };
      document.getElementById('jump').onclick = function () { confirmFinish(); };
      window.scrollTo(0, 0);
    }
    function confirmFinish() {
      var answered = answers.filter(function (a) { return a != null; }).length;
      if (answered < pool.length && !window.confirm((pool.length - answered) + ' soru boş. Yine de bitirilsin mi?')) return;
      finish();
    }
    function finish() {
      var dogru = 0, yanlis = 0, bos = 0, wrong = [];
      pool.forEach(function (c, i) {
        if (answers[i] == null) bos++;
        else if (answers[i] === c.correct) dogru++;
        else { yanlis++; wrong.push({q: c, a: answers[i]}); }
      });
      var net = Math.round((dogru - yanlis / 4) * 100) / 100;
      var prev = examResult(no);
      if (!prev || net >= prev.net) localStorage.setItem(EKEY + no, JSON.stringify({net: net, dogru: dogru, yanlis: yanlis, bos: bos, ts: Date.now()}));
      setBar('Deneme ' + no + ' · Sonuç', '', true);
      var pct = Math.round(dogru / pool.length * 100);
      var h = '<div class="wrap resultwrap"><div class="ring" style="--p:' + pct + '"><div class="ring-in"><div class="ring-n">' + net + '</div><div class="ring-p">NET</div></div></div>' +
        '<div class="netrow"><span class="nb ok">✓ ' + dogru + ' Doğru</span><span class="nb no">✕ ' + yanlis + ' Yanlış</span><span class="nb bl">○ ' + bos + ' Boş</span></div>';
      if (wrong.length) {
        h += '<div class="secttl">Yanlışların (' + wrong.length + ')</div>';
        wrong.forEach(function (w) {
          var st2 = sj(w.q.subject);
          h += '<div class="card wcard"><span class="pill" style="background:' + st2.s + ';color:' + st2.a + '">' + st2.l + '</span>' +
            '<p class="wq">' + inl(w.q.q) + '</p>' +
            '<div class="wa no">Senin: ' + inl(w.q.options[w.a]) + '</div>' +
            '<div class="wa ok">Doğru: ' + inl(w.q.options[w.q.correct]) + '</div>' +
            (w.q.topicKey ? '<button class="btn ghost gotoW" data-tk="' + esc(w.q.topicKey) + '" data-jp="' + esc(w.q.jump || '') + '" style="margin-top:10px;font-size:13px">📖 Konuya Git</button>' : '') +
            '</div>';
        });
      }
      h += '<button class="btn" id="retry" style="width:100%;margin-top:14px">🔄 Tekrar Çöz</button><button class="btn ghost" id="back" style="width:100%;margin-top:10px">Denemelere Dön</button></div>';
      view.innerHTML = h;
      Array.prototype.forEach.call(view.querySelectorAll('.gotoW'), function (el) {
        el.onclick = function () { gotoTopic(el.dataset.tk, el.dataset.jp); };
      });
      document.getElementById('retry').onclick = function () { navStack.pop(); startExam(no, pool); };
      document.getElementById('back').onclick = goBack;
      window.scrollTo(0, 0);
    }
    q();
  }

  function gotoTopic(topicKey, jump) {
    var sk = topicKey.split('/')[0];
    var s = DATA.content.find(function (x) { return x.key === sk; });
    if (!s) return;
    var idx = s.topics.findIndex(function (t) { return t.key === topicKey; });
    if (idx < 0) return;
    tab = 'konular';
    setActive('konular');
    navStack = [function () { renderTopicList(sk); }];
    push(function () { renderTopic(sk, idx, jump); });
  }

  /* ---------- Notlar ---------- */
  var NKEY = 'kpss_web_notes';
  function getNotes() { try { return JSON.parse(localStorage.getItem(NKEY) || '[]'); } catch (e) { return []; } }
  function setNotes(l) { localStorage.setItem(NKEY, JSON.stringify(l)); }
  function addNote(title, body) { var l = getNotes(); l.unshift({id: 'n' + Date.now(), title: title, body: body, ts: Date.now()}); setNotes(l); }
  function renderNotes() {
    setBar('📒 Notlarım', null, false);
    var l = getNotes();
    var h = '<div class="wrap">';
    if (!l.length) h += '<p class="muted">📝 Henüz notun yok.<br>Konuları okurken "📌 Notlarım\'a ekle" ile kaydet ya da aşağıdan yeni not oluştur.</p>';
    l.forEach(function (n) {
      var prev = n.html ? stripHtml(n.html) : (n.body || '');
      h += '<div class="note" data-n="' + n.id + '"><div class="nt">' + esc(n.title || 'Başlıksız') + '</div>' + (prev ? '<div class="nb">' + esc(prev).slice(0, 220) + '</div>' : '') + '</div>';
    });
    h += '</div><button class="fab" id="newn">＋ Yeni Not</button>';
    view.innerHTML = h;
    document.getElementById('newn').onclick = function () { push(function () { editNote(null); }); };
    Array.prototype.forEach.call(view.querySelectorAll('[data-n]'), function (el) {
      el.onclick = function () { var n = getNotes().find(function (x) { return x.id === el.dataset.n; }); if (n && n.key) openNotePanel(n.title, n.key); else push(function () { editNote(n); }); };
    });
  }
  function editNote(n) {
    setBar(n ? 'Notu Düzenle' : 'Yeni Not', null, true);
    view.innerHTML = '<div class="wrap"><input class="f" id="nt" placeholder="Başlık" value="' + (n ? esc(n.title) : '') + '"><textarea class="f" id="nb" placeholder="Not..." style="margin-top:10px">' + (n ? esc(n.body) : '') + '</textarea>' +
      '<div class="btnrow"><button class="btn" id="sv">Kaydet</button><button class="btn ghost" id="pdf">📄 PDF</button>' + (n ? '<button class="btn ghost" id="del">Sil</button>' : '') + '</div></div>';
    document.getElementById('sv').onclick = function () {
      var l = getNotes(), title = document.getElementById('nt').value, body = document.getElementById('nb').value;
      if (n) { var x = l.find(function (i) { return i.id === n.id; }); if (x) { x.title = title; x.body = body; x.ts = Date.now(); } }
      else l.unshift({id: 'n' + Date.now(), title: title, body: body, ts: Date.now()});
      setNotes(l); navStack.pop(); renderNotes();
    };
    document.getElementById('pdf').onclick = function () {
      downloadNotePDF(document.getElementById('nt').value, esc(document.getElementById('nb').value).replace(/\n/g, '<br>'));
    };
    var d = document.getElementById('del');
    if (d) d.onclick = function () { setNotes(getNotes().filter(function (i) { return i.id !== n.id; })); navStack.pop(); renderNotes(); };
  }
  function downloadNotePDF(title, html) {
    var w = window.open('', '_blank');
    if (!w) { toast('Açılır pencereye izin ver'); return; }
    var t = esc(title || 'Not'), b = (html && html.trim()) ? html : '<span style="color:#9aa0b4">(boş not)</span>';
    var ds = new Date().toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'});
    w.document.write(
      '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>' + t + '</title><style>' +
      '@page{margin:18mm}' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1E2138;line-height:1.62;max-width:720px;margin:0 auto;padding:26px}' +
      '.brand{display:flex;align-items:center;gap:9px;color:#5B4FE6;font-weight:800;font-size:15px;border-bottom:2px solid #ECEAF6;padding-bottom:13px;margin-bottom:22px}' +
      '.dot{width:12px;height:12px;border-radius:4px;background:linear-gradient(135deg,#4F46E5,#7C3AED)}' +
      'h1{font-size:25px;margin:0 0 6px}.date{color:#697086;font-size:13px;margin-bottom:24px}' +
      '.body{font-size:15.5px}.foot{margin-top:36px;border-top:1px solid #ECEAF6;padding-top:12px;color:#9aa0b4;font-size:12px}' +
      '.bar{margin-top:26px}.bar button{background:#4F46E5;color:#fff;border:none;padding:12px 24px;border-radius:11px;font-weight:700;font-size:15px;cursor:pointer}' +
      '@media print{.bar{display:none}}' +
      '</style></head><body>' +
      '<div class="brand"><span class="dot"></span>KPSS Pusula · Notlarım</div>' +
      '<h1>' + t + '</h1><div class="date">' + ds + '</div><div class="body">' + b + '</div>' +
      '<div class="foot">KPSS Pusula ile oluşturuldu</div>' +
      '<div class="bar"><button onclick="window.print()">📄 PDF olarak kaydet</button></div>' +
      '</body></html>'
    );
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 500);
  }
  function stripHtml(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent || ''; }
  function saveTopicNote(key, title, html) {
    var l = getNotes(), x = l.find(function (n) { return n.key === key; });
    if (x) { x.html = html; x.title = title; x.ts = Date.now(); }
    else l.unshift({id: 'n' + Date.now(), key: key, title: title, html: html, ts: Date.now()});
    setNotes(l);
  }
  function openNotePanel(title, key) {
    var existing = getNotes().find(function (n) { return n.key === key; });
    var COLS = ['#E11D48', '#EA580C', '#CA8A04', '#16A34A', '#2563EB', '#7C3AED', '#111827'];
    var sw = COLS.map(function (c) { return '<button class="sw" data-col="' + c + '" style="background:' + c + '"></button>'; }).join('');
    var p = document.createElement('div');
    p.className = 'notepanel';
    p.innerHTML =
      '<div class="np-back"></div><div class="np-sheet">' +
      '<div class="np-head"><div class="np-title">📝 <span>Notum</span></div><button class="np-x" aria-label="Kapat">✕</button></div>' +
      '<div class="np-tt">' + esc(title) + '</div>' +
      '<div class="np-tools">' +
        '<select class="np-sel"><option value="P">Normal</option><option value="H2">Başlık</option><option value="H3">Alt başlık</option></select>' +
        '<span class="np-sep"></span>' +
        '<button data-c="bold" title="Kalın"><b>B</b></button>' +
        '<button data-c="italic" title="İtalik"><i>I</i></button>' +
        '<button data-c="under" title="Altı çizili"><u>U</u></button>' +
        '<button data-c="ul" title="Liste">•</button>' +
        '<span class="np-sep"></span>' +
        '<span class="np-cols">' + sw + '</span>' +
      '</div>' +
      '<div class="np-surface"><div class="np-editor" contenteditable="true" data-ph="Buraya yaz… metni seçip biçimlendir">' + (existing ? existing.html : '') + '</div></div>' +
      '<div class="np-meta"><span class="np-wc"></span><span class="np-saved"></span></div>' +
      '<div class="np-foot"><button class="np-pdf">📄 PDF</button><button class="np-save">Kaydet</button></div>' +
      '</div>';
    document.body.appendChild(p);
    requestAnimationFrame(function () { p.classList.add('open'); });
    var editor = p.querySelector('.np-editor'), wc = p.querySelector('.np-wc'), saved = p.querySelector('.np-saved');
    function count() { var t = editor.innerText.trim(); wc.textContent = (t ? t.split(/\s+/).length : 0) + ' kelime'; }
    count();
    editor.addEventListener('input', function () { count(); saved.textContent = ''; });
    function close() { p.classList.remove('open'); setTimeout(function () { p.remove(); }, 300); }
    p.querySelector('.np-x').onclick = close;
    p.querySelector('.np-back').onclick = close;
    var sel = p.querySelector('.np-sel');
    sel.onchange = function () { editor.focus(); document.execCommand('formatBlock', false, sel.value); sel.value = 'P'; };
    Array.prototype.forEach.call(p.querySelectorAll('.np-tools button'), function (btn) {
      btn.onmousedown = function (e) { e.preventDefault(); };
      btn.onclick = function () {
        editor.focus();
        var c = btn.dataset.c, col = btn.dataset.col;
        if (col) document.execCommand('foreColor', false, col);
        else if (c === 'bold') document.execCommand('bold');
        else if (c === 'italic') document.execCommand('italic');
        else if (c === 'under') document.execCommand('underline');
        else if (c === 'ul') document.execCommand('insertUnorderedList');
      };
    });
    p.querySelector('.np-save').onclick = function () { saveTopicNote(key, title, editor.innerHTML); saved.textContent = '✓ Kaydedildi'; toast('📝 Not kaydedildi'); };
    p.querySelector('.np-pdf').onclick = function () { downloadNotePDF(title, editor.innerHTML); };
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    var t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(20,18,40,.92);color:#fff;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px;z-index:50';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1700);
  }

  /* ---------- Başlat ---------- */
  Promise.all(['content', 'questions', 'map', 'exams', 'topictests', 'hizli', 'placement'].map(function (n) {
    return fetch('data/' + n + '.json').then(function (r) { return r.json(); });
  })).then(function (res) {
    DATA.content = res[0]; DATA.questions = res[1]; DATA.map = res[2];
    DATA.exams = res[3]; DATA.topictests = res[4]; DATA.hizli = res[5]; DATA.placement = res[6];
    DATA.byId = {}; DATA.questions.forEach(function (q) { DATA.byId[q.id] = q; });
    var tabs = [['konular', '📚', 'Dersler'], ['harita', '🗺️', 'Harita'], ['test', '🎯', 'Test'], ['hizli', '⚡', 'Tekrar'], ['notlar', '📒', 'Notlar']];
    tabsEl.innerHTML =
      '<a class="nlink ext" href="../"><span class="ic">🏠</span>Ana Sayfa</a>' +
      tabs.map(function (t) { return '<button class="nlink" data-t="' + t[0] + '"><span class="ic">' + t[1] + '</span>' + t[2] + '</button>'; }).join('') +
      '<a class="nlink ext dim" href="../gizlilik.html">Gizlilik</a>';
    Array.prototype.forEach.call(tabsEl.querySelectorAll('button[data-t]'), function (c) { c.onclick = function () { openTab(c.dataset.t); }; });
    openTab('konular');
    var hs = (location.hash || '').replace('#', '');
    if (hs && DATA.content.some(function (s) { return s.key === hs; })) {
      push(function () { renderTopicList(hs); });
    }
  }).catch(function (e) {
    view.innerHTML = '<p class="muted">Veri yüklenemedi: ' + e + '</p>';
  });
})();
