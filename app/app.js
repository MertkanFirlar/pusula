(function () {
  'use strict';
  var view = document.getElementById('view');
  var appbar = document.getElementById('appbar');
  var tabsEl = document.getElementById('tabs');
  var DATA = {};
  var tab = 'konular';
  var navStack = []; // {render, title}

  var SUBJ = {
    tarih: {e: '📜', g: 'linear-gradient(135deg,#F59E0B,#F97316)', a: '#EA7B0E', s: '#FEF3E2', l: 'Tarih'},
    cografya: {e: '🌍', g: 'linear-gradient(135deg,#10B981,#14B8A6)', a: '#0E9F73', s: '#E5F8F1', l: 'Coğrafya'},
    vatandaslik: {e: '⚖️', g: 'linear-gradient(135deg,#6366F1,#7C3AED)', a: '#5B53E8', s: '#EDEBFB', l: 'Vatandaşlık'},
    guncel: {e: '🗞️', g: 'linear-gradient(135deg,#EC4899,#EF4444)', a: '#E0457C', s: '#FCE9F1', l: 'Güncel'},
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
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) { out.push('<hr>'); i++; continue; }
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
        out.push('<table>' + th + tb + '</table>'); continue;
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
  function setBar(title, sub, withBack, right) {
    appbar.innerHTML = '<div class="row">' +
      (withBack ? '<button class="back" id="bk">‹</button>' : '') +
      '<div style="flex:1;min-width:0"><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
      (right ? '<button class="barbtn" id="barright">' + right.label + '</button>' : '') +
      '</div>';
    if (withBack) document.getElementById('bk').onclick = goBack;
    if (right) document.getElementById('barright').onclick = right.onClick;
  }
  function goBack() { navStack.pop(); var f = navStack[navStack.length - 1]; if (f) f(); else openTab(tab); window.scrollTo(0, 0); }
  function openTab(t) {
    tab = t; navStack = [];
    Array.prototype.forEach.call(tabsEl.children, function (c) { c.classList.toggle('on', c.dataset.t === t); });
    closeSheet();
    if (t === 'konular') renderSubjects();
    else if (t === 'harita') renderMap();
    else if (t === 'test') renderTestHome();
    else if (t === 'notlar') renderNotes();
    window.scrollTo(0, 0);
  }

  /* ---------- Konular ---------- */
  function renderSubjects() {
    setBar('📖 KPSS Pusula', 'Genel Kültür · web', false);
    var total = DATA.content.reduce(function (a, s) { return a + s.topics.length; }, 0);
    var h = '<div class="wrap"><p class="hint">' + total + ' konu hazır — birini seç</p><div class="grid">';
    DATA.content.forEach(function (s) {
      var st = sj(s.key);
      h += '<div class="card subj" data-s="' + s.key + '">' +
        '<div class="badge" style="background:' + st.g + '">' + st.e + '</div>' +
        '<h3>' + st.l + '</h3>' +
        '<span class="pill" style="background:' + st.s + ';color:' + st.a + '">' + s.topics.length + ' konu</span></div>';
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
    var h = '<div class="wrap tlist">';
    s.topics.forEach(function (t, idx) {
      h += '<div class="card" data-t="' + idx + '"><div class="tnum" style="background:' + st.a + '">' + (idx + 1) + '</div>' +
        '<div class="ttl">' + esc(t.title) + '</div><div class="chev">›</div></div>';
    });
    h += '</div>';
    view.innerHTML = h;
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
    view.innerHTML = '<div class="chips">' + chips + '</div><div class="wrap"><div class="mapwrap"><svg viewBox="' + m.viewBox + '">' + paths + '</svg></div></div>' + sub +
      '<p class="hint">💡 Bir ile dokun → bilgileri alttan açılır.</p>';
    Array.prototype.forEach.call(view.querySelectorAll('[data-l]'), function (el) { el.onclick = function () { mapLayer = el.dataset.l; mapItem = 0; renderMap(); }; });
    Array.prototype.forEach.call(view.querySelectorAll('[data-i]'), function (el) { el.onclick = function () { mapItem = +el.dataset.i; renderMap(); }; });
    Array.prototype.forEach.call(view.querySelectorAll('path'), function (el) { el.onclick = function () { showProvince(+el.dataset.p); }; });
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

  /* ---------- Test ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function renderTestHome() {
    setBar('🎯 Test Çöz', 'Ders seç, kendini sına', false);
    var byS = {}; DATA.questions.forEach(function (q) { byS[q.subject] = (byS[q.subject] || 0) + 1; });
    var h = '<div class="wrap"><div class="card" style="background:' + 'linear-gradient(135deg,#5B53E8,#7C3AED)' + ';color:#fff" data-q="karisik"><h3 style="margin:0;color:#fff">🎲 Karışık Test</h3><div style="opacity:.85;font-size:13px;margin-top:4px">Tüm derslerden ' + DATA.questions.length + ' soru</div></div>';
    Object.keys(SUBJ).forEach(function (k) {
      var st = sj(k), c = byS[k] || 0;
      h += '<div class="card tlist" data-q="' + k + '" style="' + (c ? '' : 'opacity:.45;pointer-events:none') + '"><div style="display:flex;align-items:center;gap:12px"><div class="badge" style="background:' + st.s + ';width:46px;height:46px;font-size:22px">' + st.e + '</div><div style="flex:1"><div class="ttl">' + st.l + '</div><div style="font-size:12.5px;color:var(--soft)">' + (c ? c + ' soru' : 'Soru yok') + '</div></div><div class="chev">›</div></div></div>';
    });
    h += '</div>';
    view.innerHTML = h;
    Array.prototype.forEach.call(view.querySelectorAll('[data-q]'), function (el) {
      el.onclick = function () { startQuiz(el.dataset.q); };
    });
  }
  function startQuiz(key) {
    var pool = key === 'karisik' ? DATA.questions : DATA.questions.filter(function (q) { return q.subject === key; });
    pool = shuffle(pool); var idx = 0, score = 0;
    function q() {
      var cur = pool[idx], st = sj(cur.subject), picked = null;
      setBar('Soru ' + (idx + 1) + '/' + pool.length, '', false);
      function draw() {
        var opts = cur.options.map(function (o, oi) {
          var cls = 'opt', lt = 'ABCDE'[oi];
          if (picked != null) { if (oi === cur.correct) { cls = 'opt ok'; lt = '✓'; } else if (oi === picked) { cls = 'opt no'; lt = '✕'; } }
          return '<div class="' + cls + '" data-o="' + oi + '"><div class="lt">' + lt + '</div><div>' + esc(o) + '</div></div>';
        }).join('');
        var ex = '';
        if (picked != null) {
          ex = '<div class="explain"><b>' + (picked === cur.correct ? '✅ Doğru!' : '❌ Yanlış') + '</b><p style="margin:6px 0 0;color:var(--soft);font-size:14px">' + esc(cur.explain) + '</p>' +
            (cur.topicKey ? '<button class="btn ghost" id="goto" style="margin-top:12px">📖 Konuya Git</button>' : '') + '</div>' +
            '<button class="btn" id="nx" style="width:100%;margin-top:12px">' + (idx + 1 >= pool.length ? 'Bitir' : 'Sonraki ›') + '</button>';
        }
        view.innerHTML = '<div class="wrap"><div class="qprog"><div style="width:' + ((idx + 1) / pool.length * 100) + '%"></div></div>' +
          '<span class="pill" style="background:' + st.s + ';color:' + st.a + '">' + st.e + ' ' + st.l + '</span>' +
          '<p style="font-size:17px;font-weight:700;margin:12px 0 16px">' + esc(cur.q) + '</p>' + opts + ex + '</div>';
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
      setBar('Sonuç', '', false);
      view.innerHTML = '<div class="wrap" style="text-align:center;padding-top:40px"><div style="font-size:60px;font-weight:900;color:var(--indigo)">' + score + '/' + pool.length + '</div>' +
        '<div style="font-size:20px;font-weight:800;color:var(--soft)">%' + pct + '</div>' +
        '<p style="font-size:17px;font-weight:700;margin:18px 0 26px">' + (pct >= 80 ? 'Mükemmel! 🏆' : pct >= 50 ? 'İyi gidiyorsun! 💪' : 'Tekrar çalış 📚') + '</p>' +
        '<button class="btn" id="again" style="width:100%">🔄 Tekrar Çöz</button><button class="btn ghost" id="home" style="width:100%;margin-top:10px">Ders Seçimine Dön</button></div>';
      document.getElementById('again').onclick = function () { startQuiz(key); };
      document.getElementById('home').onclick = renderTestHome;
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
    Array.prototype.forEach.call(tabsEl.children, function (c) { c.classList.toggle('on', c.dataset.t === 'konular'); });
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
  /* Konu okurken yandan kayan zengin not çekmecesi (glass) */
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
    var sel = p.querySelector('.np-sel');
    sel.onchange = function () { editor.focus(); document.execCommand('formatBlock', false, sel.value); sel.value = 'P'; };
    Array.prototype.forEach.call(p.querySelectorAll('.np-tools button'), function (btn) {
      btn.onmousedown = function (e) { e.preventDefault(); }; // seçim kaybolmasın
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
  function push(fn) { navStack.push(fn); fn(); window.scrollTo(0, 0); }

  /* ---------- Toast ---------- */
  function toast(msg) {
    var t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(20,18,40,.92);color:#fff;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px;z-index:50';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1700);
  }

  /* ---------- Başlat ---------- */
  Promise.all(['content', 'questions', 'map'].map(function (n) {
    return fetch('data/' + n + '.json').then(function (r) { return r.json(); });
  })).then(function (res) {
    DATA.content = res[0]; DATA.questions = res[1]; DATA.map = res[2];
    var tabs = [['konular', '📚', 'Dersler'], ['harita', '🗺️', 'Harita'], ['test', '🎯', 'Test'], ['notlar', '📒', 'Notlar']];
    tabsEl.innerHTML = tabs.map(function (t) { return '<button class="tab" data-t="' + t[0] + '"><span class="ic">' + t[1] + '</span>' + t[2] + '</button>'; }).join('');
    Array.prototype.forEach.call(tabsEl.children, function (c) { c.onclick = function () { openTab(c.dataset.t); }; });
    openTab('konular');
    // Ana sayfadan ders linkiyle gelindiyse (app/#tarih) o dersi aç
    var hs = (location.hash || '').replace('#', '');
    if (hs && DATA.content.some(function (s) { return s.key === hs; })) {
      push(function () { renderTopicList(hs); });
    }
  }).catch(function (e) {
    view.innerHTML = '<p class="muted">Veri yüklenemedi: ' + e + '</p>';
  });
})();
