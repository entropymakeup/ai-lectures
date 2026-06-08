(function () {
  var AUTH_KEY = 'em_lecture_auth';

  function init() {
    var gate = document.getElementById('gate');
    var main = document.getElementById('main');

    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      gate.style.display = 'none';
      main.style.display = 'block';
      loadAndRender();
      return;
    }

    var input = document.getElementById('pwInput');
    var btn   = document.getElementById('enterBtn');
    var err   = document.getElementById('gateError');

    function attempt() {
      if (input.value.trim() === config.password) {
        sessionStorage.setItem(AUTH_KEY, '1');
        gate.classList.add('gate--hide');
        setTimeout(function () {
          gate.style.display = 'none';
          main.style.display = 'block';
          loadAndRender();
        }, 500);
      } else {
        err.textContent = 'ACCESS DENIED';
        input.value = '';
        input.focus();
        setTimeout(function () { err.textContent = ''; }, 2000);
      }
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attempt();
    });
  }

  /* ── DATA LOADING ──────────────────────────────────────── */

  function loadAndRender() {
    document.getElementById('lectureGrid').innerHTML =
      '<p class="loading">LOADING</p>';

    fetchSheetData()
      .then(renderSite)
      .catch(function () {
        renderSite(lectures); // fallback to hardcoded data.js array
      });
  }

  function fetchSheetData() {
    return fetch(config.sheetCsvUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('sheet fetch failed');
        return res.text();
      })
      .then(function (csv) {
        var data = parseCSV(csv);
        if (!data.length) throw new Error('empty sheet');
        return data;
      });
  }

  /* ── CSV PARSER ────────────────────────────────────────── */
  // Columns detected by header name — order doesn't matter.
  // Recognised: 이름/주제, 날짜, 노션, 유튜브

  function parseCSV(text) {
    var rows = splitCSV(text);
    if (rows.length < 2) return [];

    var hdr = rows[0].map(function (h) { return h.trim(); });

    function idx(names) {
      for (var n = 0; n < names.length; n++) {
        var p = hdr.indexOf(names[n]);
        if (p !== -1) return p;
      }
      return -1;
    }

    var iEp     = 0;
    var iTopic  = idx(['이름', '주제', 'topic']);
    var iDate   = idx(['날짜', 'date']);
    var iNotion = idx(['노션', 'notion']);
    var iYt     = idx(['유튜브', 'youtube']);

    var result = [];
    for (var i = 1; i < rows.length; i++) {
      var c = rows[i];
      var epRaw = (c[iEp] || '').trim();
      if (!epRaw) continue;
      var notion  = iNotion >= 0 ? (c[iNotion] || '').trim() : '';
      var youtube = iYt     >= 0 ? (c[iYt]     || '').trim() : '';
      result.push({
        episode: parseInt(epRaw) || i,
        topic:   iTopic >= 0 ? (c[iTopic] || '').trim() : '',
        date:    iDate  >= 0 ? (c[iDate]  || '').trim() : '',
        youtube: isUrl(youtube) ? youtube : '',
        notion:  isUrl(notion)  ? notion  : ''
      });
    }
    return result;
  }

  function isUrl(s) {
    return s && (s.indexOf('http://') === 0 || s.indexOf('https://') === 0);
  }

  function splitCSV(text) {
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], nx = text[i + 1];
      if (inQ) {
        if (ch === '"' && nx === '"') { field += '"'; i++; }
        else if (ch === '"')          { inQ = false; }
        else                          { field += ch; }
      } else {
        if      (ch === '"')  { inQ = true; }
        else if (ch === ',')  { row.push(field); field = ''; }
        else if (ch === '\r') { /* skip */ }
        else if (ch === '\n') {
          row.push(field); field = '';
          if (row.some(function (c) { return c.trim(); })) rows.push(row);
          row = [];
        } else { field += ch; }
      }
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ── RENDER ────────────────────────────────────────────── */

  function renderSite(data) {
    document.getElementById('metaStart').textContent =
      formatDate(config.startDate) + ' 시작';
    document.getElementById('metaCount').textContent =
      '총 ' + data.length + '강';
    document.getElementById('footerYear').textContent =
      new Date().getFullYear();

    var grid = document.getElementById('lectureGrid');
    grid.innerHTML = '';

    data.forEach(function (lec) {
      var el = document.createElement('div');
      el.className = 'episode';

      var ytBtn = lec.youtube
        ? '<a href="' + lec.youtube + '" target="_blank" rel="noopener" class="ep-btn">YOUTUBE</a>'
        : '<span class="ep-btn ep-btn--off">YOUTUBE</span>';

      var ntBtn = lec.notion
        ? '<a href="' + lec.notion + '" target="_blank" rel="noopener" class="ep-btn">NOTION</a>'
        : '<span class="ep-btn ep-btn--off">NOTION</span>';

      el.innerHTML =
        '<div class="episode__num">'  + String(lec.episode).padStart(2, '0') + '</div>' +
        '<div class="episode__body">' +
          '<div class="episode__topic">' + lec.topic + '</div>' +
          (lec.date ? '<div class="episode__date">' + formatDate(lec.date) + '</div>' : '') +
        '</div>' +
        '<div class="episode__links">' + ytBtn + ntBtn + '</div>';

      grid.appendChild(el);
    });
  }

  function formatDate(str) {
    if (!str) return '';
    var d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
