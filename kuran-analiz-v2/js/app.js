(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     KUR'AN KÖK ANALİZİ v2 — Ana Uygulama
     ══════════════════════════════════════════════════════════════ */

  var API = '/api/kuran/enhanced-search';
  var WBW_API = '/api/kuran/wbw';
  var LIMIT = 20;

  var app = document.getElementById('app');
  var currentQuery = '';
  var currentMode = 'text'; // text | root
  var currentOffset = 0;
  var totalResults = 0;
  var allResults = [];
  var debounceTimer = null;
  var surahStatsData = null;
  var chartInstance = null;
  var heatmapData = null;
  var exactMatch = false;
  var correlationData = null;

  // ── Arabic Utilities ──
  var TASHKEEL_RE = /[\u064B-\u0652\u0670\u06E1\u06E2\u06E5\u06E6\u06ED]/g;

  function stripTashkeel(text) {
    if (!text) return '';
    return text.replace(TASHKEEL_RE, '');
  }

  function normalizeArabic(text) {
    if (!text) return '';
    var s = stripTashkeel(text);
    s = s.replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627');
    s = s.replace(/\u0629/g, '\u0647');
    s = s.replace(/\u0649/g, '\u064A');
    return s;
  }

  function isArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
  }

  // ── Common Quranic Roots for Suggestions ──
  var COMMON_ROOTS = [
    { root: '\u0631\u062D\u0645', meaning: 'merhamet, rahmet', latin: 'r-h-m' },
    { root: '\u0639\u0644\u0645', meaning: 'bilmek, ilim', latin: 'a-l-m' },
    { root: '\u0643\u062A\u0628', meaning: 'yazmak, kitap', latin: 'k-t-b' },
    { root: '\u0642\u0648\u0644', meaning: 's\u00F6ylemek, s\u00F6z', latin: 'q-w-l' },
    { root: '\u0639\u0628\u062F', meaning: 'kulluk etmek', latin: 'a-b-d' },
    { root: '\u0627\u0645\u0646', meaning: 'iman etmek, g\u00FCven', latin: '\u00E2-m-n' },
    { root: '\u062D\u0645\u062F', meaning: '\u00F6vmek, hamd', latin: 'h-m-d' },
    { root: '\u0633\u0644\u0645', meaning: 'bar\u0131\u015F, \u0130slam', latin: 's-l-m' },
    { root: '\u0646\u0632\u0644', meaning: 'indirmek, naz\u00FCl', latin: 'n-z-l' },
    { root: '\u0647\u062F\u064A', meaning: 'hidayet, do\u011Fru yol', latin: 'h-d-y' },
    { root: '\u062E\u0644\u0642', meaning: 'yaratmak', latin: 'kh-l-q' },
    { root: '\u0633\u0628\u062D', meaning: 'tesbih, y\u00FCzmek', latin: 's-b-h' },
    { root: '\u0635\u0644\u0648', meaning: 'namaz, dua', latin: 's-l-w' },
    { root: '\u0630\u0643\u0631', meaning: 'zikretmek, hat\u0131rlamak', latin: 'dh-k-r' },
    { root: '\u062C\u0639\u0644', meaning: 'yapmak, k\u0131lmak', latin: 'j-a-l' },
    { root: '\u0634\u0643\u0631', meaning: '\u015F\u00FCkretmek', latin: 'sh-k-r' },
    { root: '\u0639\u0630\u0628', meaning: 'azap', latin: 'a-dh-b' },
    { root: '\u0642\u062F\u0631', meaning: 'kudret, kader', latin: 'q-d-r' },
    { root: '\u0641\u0631\u0642', meaning: 'ay\u0131rmak, furkan', latin: 'f-r-q' },
    { root: '\u062D\u0642\u0642', meaning: 'hak, hakikat', latin: 'h-q-q' },
    { root: '\u0646\u0648\u0631', meaning: 'nur, \u0131\u015F\u0131k', latin: 'n-w-r' },
    { root: '\u0633\u0645\u0639', meaning: 'duymak, i\u015Fitmek', latin: 's-m-a' },
    { root: '\u0628\u0635\u0631', meaning: 'g\u00F6rmek, basiret', latin: 'b-s-r' },
    { root: '\u062D\u064A\u064A', meaning: 'hayat, ya\u015Famak', latin: 'h-y-y' },
    { root: '\u0645\u0648\u062A', meaning: '\u00F6l\u00FCm', latin: 'm-w-t' },
    { root: '\u062C\u0646\u0646', meaning: 'cennet, \u00F6rt\u00FCnmek', latin: 'j-n-n' },
    { root: '\u0646\u0631\u0631', meaning: 'ate\u015F, cehennem', latin: 'n-r-r' },
    { root: '\u0643\u0641\u0631', meaning: '\u00F6rtmek, ink\u00E2r', latin: 'k-f-r' },
    { root: '\u0635\u0628\u0631', meaning: 'sabretmek', latin: 's-b-r' },
    { root: '\u062A\u0648\u0628', meaning: 'tevbe etmek', latin: 't-w-b' },
  ];

  /* ══════════════════════════════════════════════════════════════
     BAŞLATMA
     ══════════════════════════════════════════════════════════════ */
  function init() {
    renderHero(false);
    document.addEventListener('click', function (e) {
      var suggestions = document.getElementById('suggestions');
      if (suggestions && !suggestions.contains(e.target)) {
        suggestions.classList.remove('active');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     HERO / ARAMA BÖLÜMÜ
     ══════════════════════════════════════════════════════════════ */
  function renderHero(compact) {
    var heroClass = compact ? 'ka-hero ka-hero--compact' : 'ka-hero';
    var textActive = currentMode === 'text' ? ' active' : '';
    var rootActive = currentMode === 'root' ? ' active' : '';

    var placeholder = currentMode === 'root'
      ? 'Bir k\u00F6k girin\u2026 (\u00D6rn: \u0631\u062D\u0645, \u0639\u0644\u0645, \u0643\u062A\u0628)'
      : 'Bir kelime aray\u0131n\u2026 (\u00D6rn: furkan, rahmet, \u0631\u062D\u0645\u0629)';

    var exactChecked = exactMatch ? ' checked' : '';
    var exactToggleHtml = currentMode === 'text'
      ? '<label class="ka-exact-toggle" title="Sadece tam kelime e\u015Fle\u015Fmesi (k\u0131smi e\u015Fle\u015Fmeleri hari\u00E7 tutar)">' +
          '<input type="checkbox" id="exactToggle"' + exactChecked + '>' +
          '<span class="ka-exact-label">Tam Kelime</span>' +
        '</label>'
      : '';

    var html =
      '<section class="' + heroClass + '">' +
        '<h1 class="ka-title">Kur\'an K\u00F6k Analizi</h1>' +
        '<p class="ka-subtitle">K\u00F6k tarama, harekesiz Arap\u00E7a arama ve korelasyon analizi</p>' +

        // Mode toggle
        '<div class="ka-mode-toggle">' +
          '<button class="ka-mode-btn' + textActive + '" data-mode="text">' +
            '<span class="ka-mode-icon">\u{1F50D}</span> Metin Arama' +
          '</button>' +
          '<button class="ka-mode-btn' + rootActive + '" data-mode="root">' +
            '<span class="ka-mode-icon">\u{1F333}</span> K\u00F6k Arama' +
          '</button>' +
        '</div>' +

        '<div class="ka-search-wrapper">' +
          '<div class="ka-search-box">' +
            '<input type="text" id="searchInput" class="ka-search-input" ' +
              'placeholder="' + placeholder + '" ' +
              'autocomplete="off" value="' + escapeHtml(currentQuery) + '" dir="auto">' +
            '<button class="ka-search-btn" id="searchBtn">Ara</button>' +
          '</div>' +
          exactToggleHtml +
          '<div class="ka-suggestions" id="suggestions"></div>' +
          '<div class="ka-search-hint" id="searchHint">' +
            (currentMode === 'root'
              ? 'Arap\u00E7a k\u00F6k harflerini girin (2\u20134 harf). T\u00FCm \u00E7ekim formlar\u0131 taranacakt\u0131r.'
              : 'Hareke (te\u015Fkil) duyars\u0131z arama: Arap\u00E7a metni harekesiz de arayabilirsiniz.') +
          '</div>' +
        '</div>' +

        // Popular roots section (only when not compact and in root mode)
        ((!compact && currentMode === 'root')
          ? '<div class="ka-popular-roots">' +
              '<h3 class="ka-popular-title">S\u0131k Kullan\u0131lan K\u00F6kler</h3>' +
              '<div class="ka-roots-grid">' +
                COMMON_ROOTS.slice(0, 15).map(function (r) {
                  return '<button class="ka-root-chip" data-root="' + r.root + '">' +
                    '<span class="ka-root-arabic">' + r.root + '</span>' +
                    '<span class="ka-root-meaning">' + r.meaning + '</span>' +
                  '</button>';
                }).join('') +
              '</div>' +
            '</div>'
          : '') +
      '</section>' +
      '<div id="statsPanel"></div>' +
      '<div id="correlationPanel"></div>' +
      '<div id="resultsInfo"></div>' +
      '<div class="ka-results" id="results"></div>';

    app.innerHTML = html;
    bindSearchEvents();
    bindModeToggle();
    bindRootChips();
    bindExactToggle();

    var input = document.getElementById('searchInput');
    if (input) input.focus();
  }

  /* ══════════════════════════════════════════════════════════════
     EVENT BINDING
     ══════════════════════════════════════════════════════════════ */
  function bindSearchEvents() {
    var input = document.getElementById('searchInput');
    var btn = document.getElementById('searchBtn');

    if (input) {
      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        var q = input.value.trim();
        if (q.length < 2) {
          hideSuggestions();
          return;
        }
        debounceTimer = setTimeout(function () {
          if (currentMode === 'root') {
            showRootSuggestions(q);
          } else {
            fetchSuggestions(q);
          }
        }, 300);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          hideSuggestions();
          doSearch(input.value.trim());
        }
      });
    }

    if (btn) {
      btn.addEventListener('click', function () {
        hideSuggestions();
        if (input) doSearch(input.value.trim());
      });
    }
  }

  function bindModeToggle() {
    var btns = document.querySelectorAll('.ka-mode-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var newMode = this.getAttribute('data-mode');
        if (newMode !== currentMode) {
          currentMode = newMode;
          currentQuery = '';
          allResults = [];
          totalResults = 0;
          surahStatsData = null;
          renderHero(false);
        }
      });
    }
  }

  function bindRootChips() {
    var chips = document.querySelectorAll('.ka-root-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        var root = this.getAttribute('data-root');
        var input = document.getElementById('searchInput');
        if (input) input.value = root;
        doSearch(root);
      });
    }
  }

  function bindExactToggle() {
    var toggle = document.getElementById('exactToggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        exactMatch = this.checked;
        // Re-search if there is an active query
        var input = document.getElementById('searchInput');
        if (input && input.value.trim().length >= 2) {
          doSearch(input.value.trim());
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     SUGGESTIONS
     ══════════════════════════════════════════════════════════════ */
  function fetchSuggestions(q) {
    fetch(API + '?q=' + encodeURIComponent(q) + '&limit=5&mode=text')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.results && data.results.length > 0) {
          showSuggestions(data.results, q);
        } else {
          hideSuggestions();
        }
      })
      .catch(function () { hideSuggestions(); });
  }

  function showRootSuggestions(q) {
    var box = document.getElementById('suggestions');
    if (!box) return;

    var matching = COMMON_ROOTS.filter(function (r) {
      var normalQ = normalizeArabic(q);
      var normalRoot = normalizeArabic(r.root);
      return normalRoot.indexOf(normalQ) !== -1 ||
             r.meaning.toLowerCase().indexOf(q.toLowerCase()) !== -1 ||
             r.latin.indexOf(q.toLowerCase()) !== -1;
    }).slice(0, 6);

    if (matching.length === 0) {
      hideSuggestions();
      return;
    }

    var html = '';
    for (var i = 0; i < matching.length; i++) {
      var r = matching[i];
      html +=
        '<div class="ka-suggestion-item ka-root-suggestion" data-root="' + r.root + '">' +
          '<span class="ka-suggestion-ref">' + r.root + ' (' + r.latin + ')</span>' +
          '<span class="ka-suggestion-text">' + escapeHtml(r.meaning) + '</span>' +
        '</div>';
    }

    box.innerHTML = html;
    box.classList.add('active');

    var items = box.querySelectorAll('.ka-root-suggestion');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function () {
        var root = this.getAttribute('data-root');
        var input = document.getElementById('searchInput');
        if (input) input.value = root;
        hideSuggestions();
        doSearch(root);
      });
    }
  }

  function showSuggestions(items, q) {
    var box = document.getElementById('suggestions');
    if (!box) return;

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var v = items[i];
      var snippet = '';
      if (isArabic(q)) {
        snippet = getArabicSnippet(v.arabicText, q, 40);
      }
      if (!snippet) {
        snippet = getSnippet(v.turkishMeal, q, 60);
      }
      if (!snippet && v.transliteration) {
        snippet = getSnippet(v.transliteration, q, 60);
      }
      html +=
        '<div class="ka-suggestion-item" data-query="' + escapeAttr(q) + '">' +
          '<span class="ka-suggestion-ref">' +
            escapeHtml(v.surahNameTr) + ' ' + v.surahNo + ':' + v.ayahNo +
          '</span>' +
          '<span class="ka-suggestion-text">' + highlightText(snippet || v.turkishMeal.substring(0, 120), q) + '</span>' +
        '</div>';
    }

    box.innerHTML = html;
    box.classList.add('active');

    var suggestionItems = box.querySelectorAll('.ka-suggestion-item');
    for (var j = 0; j < suggestionItems.length; j++) {
      suggestionItems[j].addEventListener('click', function () {
        var input = document.getElementById('searchInput');
        if (input) input.value = q;
        hideSuggestions();
        doSearch(q);
      });
    }
  }

  function hideSuggestions() {
    var box = document.getElementById('suggestions');
    if (box) box.classList.remove('active');
  }

  /* ══════════════════════════════════════════════════════════════
     SEARCH
     ══════════════════════════════════════════════════════════════ */
  function doSearch(q) {
    if (!q || q.length < 2) return;

    currentQuery = q;
    currentOffset = 0;
    allResults = [];
    surahStatsData = null;
    correlationData = null;

    renderHero(true);
    showLoading();

    var exactParam = (currentMode === 'text' && exactMatch) ? '&exact=true' : '';

    // Fetch stats, results, and correlation in parallel
    Promise.all([
      fetch(API + '?q=' + encodeURIComponent(q) + '&mode=' + currentMode + '&stats=true' + exactParam)
        .then(function (r) { return r.json(); }),
      fetch(API + '?q=' + encodeURIComponent(q) + '&mode=' + currentMode + '&limit=' + LIMIT + '&offset=0' + exactParam)
        .then(function (r) { return r.json(); }),
      fetch(API + '?q=' + encodeURIComponent(q) + '&mode=' + currentMode + '&correlation=true')
        .then(function (r) { return r.json(); })
        .catch(function () { return { correlations: [] }; })
    ]).then(function (responses) {
      var statsData = responses[0];
      var searchData = responses[1];
      var corrData = responses[2];

      if (searchData.error) {
        showError(searchData.error);
        return;
      }

      surahStatsData = statsData.surahStats || [];
      totalResults = searchData.total;
      allResults = searchData.results || [];
      currentOffset = allResults.length;
      correlationData = corrData.correlations || [];

      renderStats();
      renderCorrelation();
      renderResults();
    }).catch(function (err) {
      showError('Ba\u011Flant\u0131 hatas\u0131: ' + err.message);
    });
  }

  function fetchMoreResults() {
    var exactParam = (currentMode === 'text' && exactMatch) ? '&exact=true' : '';
    fetch(API + '?q=' + encodeURIComponent(currentQuery) + '&mode=' + currentMode + '&limit=' + LIMIT + '&offset=' + currentOffset + exactParam)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          showError(data.error);
          return;
        }
        allResults = allResults.concat(data.results || []);
        currentOffset += (data.results || []).length;
        renderResults();
      })
      .catch(function (err) {
        showError('Ba\u011Flant\u0131 hatas\u0131: ' + err.message);
      });
  }

  /* ══════════════════════════════════════════════════════════════
     STATS & CHARTS
     ══════════════════════════════════════════════════════════════ */
  function renderStats() {
    var panel = document.getElementById('statsPanel');
    if (!panel || !surahStatsData || surahStatsData.length === 0) return;

    var top10 = surahStatsData.slice(0, 10);
    var totalOccurrences = surahStatsData.reduce(function (sum, s) { return sum + s.count; }, 0);
    var surahCount = surahStatsData.length;

    var modeLabel = currentMode === 'root' ? 'K\u00F6k' : 'Kelime';

    panel.innerHTML =
      '<div class="ka-stats-panel">' +
        '<div class="ka-stats-summary">' +
          '<div class="ka-stat-card">' +
            '<div class="ka-stat-number">' + totalOccurrences + '</div>' +
            '<div class="ka-stat-label">Toplam Ayet</div>' +
          '</div>' +
          '<div class="ka-stat-card">' +
            '<div class="ka-stat-number">' + surahCount + '</div>' +
            '<div class="ka-stat-label">Farkl\u0131 Sure</div>' +
          '</div>' +
          '<div class="ka-stat-card">' +
            '<div class="ka-stat-number">' + (totalOccurrences / 6236 * 100).toFixed(1) + '%</div>' +
            '<div class="ka-stat-label">Kur\'an Oran\u0131</div>' +
          '</div>' +
        '</div>' +

        '<div class="ka-charts-grid">' +
          '<div class="ka-chart-container">' +
            '<h3 class="ka-chart-title">Sure Da\u011F\u0131l\u0131m Grafi\u011Fi (En \u00C7ok ' + modeLabel + ' Ge\u00E7en Sureler)</h3>' +
            '<canvas id="surahChart" width="600" height="300"></canvas>' +
          '</div>' +
          '<div class="ka-chart-container">' +
            '<h3 class="ka-chart-title">Sure S\u0131ras\u0131na G\u00F6re Da\u011F\u0131l\u0131m</h3>' +
            '<canvas id="distributionChart" width="600" height="300"></canvas>' +
          '</div>' +
        '</div>' +

        // Heatmap
        '<div class="ka-heatmap-container">' +
          '<h3 class="ka-chart-title">Kur\'an Is\u0131 Haritas\u0131 \u2014 Her Surede Ka\u00E7 Ayet E\u015Fle\u015Fiyor</h3>' +
          '<div class="ka-heatmap" id="heatmap"></div>' +
        '</div>' +
      '</div>';

    renderBarChart(top10);
    renderDistributionChart();
    renderHeatmap();
  }

  function renderBarChart(data) {
    var ctx = document.getElementById('surahChart');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var textColor = isDark ? '#E0DED5' : '#333333';
    var gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(function (s) { return s.surahNameTr + ' (' + s.surahNo + ')'; }),
        datasets: [{
          label: 'Ayet Say\u0131s\u0131',
          data: data.map(function (s) { return s.count; }),
          backgroundColor: isDark
            ? 'rgba(143, 188, 139, 0.6)'
            : 'rgba(107, 155, 107, 0.6)',
          borderColor: isDark
            ? 'rgba(143, 188, 139, 1)'
            : 'rgba(107, 155, 107, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1C1F32' : '#fff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDark ? '#2C2F45' : '#E8E3D0',
            borderWidth: 1,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor, maxRotation: 45 },
            grid: { display: false }
          }
        }
      }
    });
  }

  function renderDistributionChart() {
    var ctx = document.getElementById('distributionChart');
    if (!ctx || !surahStatsData) return;

    var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var textColor = isDark ? '#E0DED5' : '#333333';
    var gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    // Create data for all 114 surahs
    var surahCounts = new Array(114).fill(0);
    for (var i = 0; i < surahStatsData.length; i++) {
      var s = surahStatsData[i];
      surahCounts[s.surahNo - 1] = s.count;
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: surahCounts.map(function (_, i) { return (i + 1).toString(); }),
        datasets: [{
          label: 'E\u015Fle\u015Fen Ayet',
          data: surahCounts,
          borderColor: isDark ? '#8FB8D4' : '#7BA7C2',
          backgroundColor: isDark
            ? 'rgba(143, 184, 212, 0.1)'
            : 'rgba(123, 167, 194, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) {
                var idx = items[0].dataIndex;
                var stat = surahStatsData.find(function (s) { return s.surahNo === idx + 1; });
                return stat ? stat.surahNameTr + ' (' + (idx + 1) + ')' : 'Sure ' + (idx + 1);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: {
              color: textColor,
              maxTicksLimit: 20,
              callback: function (val) { return Number(val) + 1; }
            },
            grid: { display: false },
            title: { display: true, text: 'Sure No', color: textColor }
          }
        }
      }
    });
  }

  function renderHeatmap() {
    var container = document.getElementById('heatmap');
    if (!container || !surahStatsData) return;

    // Build surah map
    var surahMap = {};
    var maxCount = 0;
    for (var i = 0; i < surahStatsData.length; i++) {
      surahMap[surahStatsData[i].surahNo] = surahStatsData[i].count;
      if (surahStatsData[i].count > maxCount) maxCount = surahStatsData[i].count;
    }

    var html = '';
    for (var s = 1; s <= 114; s++) {
      var count = surahMap[s] || 0;
      var intensity = maxCount > 0 ? count / maxCount : 0;
      var title = s + '. sure: ' + count + ' ayet';
      html += '<div class="ka-heatmap-cell" style="opacity: ' + (0.15 + intensity * 0.85) + '; background: ' +
        (count > 0 ? 'var(--mod-green)' : 'var(--mod-border)') +
        ';" title="' + title + '">' +
        '<span>' + s + '</span>' +
      '</div>';
    }

    container.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════════════════
     KORELASYON ANALİZİ
     ══════════════════════════════════════════════════════════════ */
  function renderCorrelation() {
    var panel = document.getElementById('correlationPanel');
    if (!panel || !correlationData || correlationData.length === 0) return;

    var top15 = correlationData.slice(0, 15);
    var maxCount = top15[0] ? top15[0].count : 1;

    var html =
      '<div class="ka-stats-panel">' +
        '<div class="ka-correlation-container">' +
          '<h3 class="ka-chart-title">Kelime Korelasyonu \u2014 "\u200E' + escapeHtml(currentQuery) + '\u200E" ile birlikte en \u00E7ok ge\u00E7en kelimeler</h3>' +
          '<p class="ka-correlation-desc">Aranan kelimenin ge\u00E7ti\u011Fi ayetlerde en s\u0131k kullan\u0131lan di\u011Fer kelimeler</p>' +
          '<div class="ka-correlation-grid">';

    for (var i = 0; i < top15.length; i++) {
      var item = top15[i];
      var barWidth = Math.max(5, Math.round((item.count / maxCount) * 100));
      html +=
        '<div class="ka-corr-row">' +
          '<span class="ka-corr-word">' + escapeHtml(item.word) + '</span>' +
          '<div class="ka-corr-bar-wrapper">' +
            '<div class="ka-corr-bar" style="width: ' + barWidth + '%"></div>' +
          '</div>' +
          '<span class="ka-corr-count">' + item.count + ' ayet (%' + item.percentage + ')</span>' +
        '</div>';
    }

    html += '</div>';

    // Show remaining as chips
    if (correlationData.length > 15) {
      html += '<div class="ka-corr-chips">';
      for (var j = 15; j < correlationData.length; j++) {
        html += '<span class="ka-corr-chip">' +
          escapeHtml(correlationData[j].word) +
          ' <small>(' + correlationData[j].count + ')</small></span>';
      }
      html += '</div>';
    }

    html += '</div></div>';
    panel.innerHTML = html;
  }
  function showLoading() {
    var results = document.getElementById('results');
    if (results) {
      results.innerHTML =
        '<div class="ka-loading">' +
          '<div class="ka-spinner"></div>' +
          '<div>Aran\u0131yor\u2026</div>' +
        '</div>';
    }
  }

  function showError(msg) {
    var results = document.getElementById('results');
    if (results) {
      results.innerHTML = '<div class="ka-error">' + escapeHtml(msg) + '</div>';
    }
  }

  /* ══════════════════════════════════════════════════════════════
     RESULTS RENDERING
     ══════════════════════════════════════════════════════════════ */
  function renderResults() {
    var info = document.getElementById('resultsInfo');
    var container = document.getElementById('results');
    if (!container) return;

    var modeLabel = currentMode === 'root' ? 'K\u00F6k' : 'Metin';
    var exactLabel = (currentMode === 'text' && exactMatch) ? ' \u2014 Tam Kelime' : '';

    if (info) {
      info.innerHTML =
        '<div class="ka-results-info">' +
          '<strong>' + totalResults + '</strong> ayet bulundu' +
          (currentQuery ? ' \u2014 "' + escapeHtml(currentQuery) + '" (' + modeLabel + ' Arama' + exactLabel + ')' : '') +
        '</div>';
    }

    if (allResults.length === 0) {
      container.innerHTML =
        '<div class="ka-empty">' +
          '<h3>Sonu\u00E7 bulunamad\u0131</h3>' +
          '<p>"' + escapeHtml(currentQuery) + '" ile e\u015Fle\u015Fen ayet bulunamad\u0131. ' +
          (currentMode === 'root'
            ? 'Farkl\u0131 bir k\u00F6k deneyin veya metin aramas\u0131na ge\u00E7in.'
            : 'Farkl\u0131 bir arama terimi deneyin veya k\u00F6k aramas\u0131na ge\u00E7in.') +
          '</p>' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < allResults.length; i++) {
      html += renderVerseCard(allResults[i], i);
    }

    if (allResults.length < totalResults) {
      html +=
        '<div class="ka-load-more-wrapper">' +
          '<button class="ka-load-more" id="loadMoreBtn">Daha fazla g\u00F6ster (' +
            allResults.length + '/' + totalResults +
          ')</button>' +
        '</div>';
    }

    container.innerHTML = html;

    var loadMore = document.getElementById('loadMoreBtn');
    if (loadMore) {
      loadMore.addEventListener('click', function () {
        loadMore.textContent = 'Y\u00FCkleniyor\u2026';
        loadMore.disabled = true;
        fetchMoreResults();
      });
    }
  }

  function renderVerseCard(verse, index) {
    var wbwId = 'wbw-' + verse.surahNo + '-' + verse.ayahNo;
    var highlightedArabic = currentMode === 'root' || isArabic(currentQuery)
      ? highlightArabic(verse.arabicText, currentQuery)
      : escapeHtml(verse.arabicText);

    return (
      '<div class="ka-verse-card" style="animation-delay: ' + (index * 0.03) + 's">' +
        '<div class="ka-verse-ref">' +
          '<span class="ka-badge">' + verse.surahNo + ':' + verse.ayahNo + '</span>' +
          escapeHtml(verse.surahNameTr) +
          ' <span class="ka-surah-arabic">' + escapeHtml(verse.surahNameAr) + '</span>' +
        '</div>' +
        '<div class="ka-arabic-text" dir="rtl">' + highlightedArabic + '</div>' +
        '<div id="' + wbwId + '">' +
          '<button class="ka-wbw-toggle" onclick="window.__loadWBW(' +
            verse.surahNo + ',' + verse.ayahNo + ')">' +
            '\u25B6 Kelime Kelime G\u00F6ster' +
          '</button>' +
        '</div>' +
        (verse.transliteration
          ? '<div class="ka-transliteration">' + highlightText(verse.transliteration, currentQuery) + '</div>'
          : '') +
        '<div class="ka-turkish-meal">' +
          highlightText(verse.turkishMeal, currentQuery) +
        '</div>' +
      '</div>'
    );
  }

  /* ══════════════════════════════════════════════════════════════
     WORD BY WORD
     ══════════════════════════════════════════════════════════════ */
  window.__loadWBW = function (surahNo, ayahNo) {
    var container = document.getElementById('wbw-' + surahNo + '-' + ayahNo);
    if (!container) return;

    container.innerHTML = '<div class="ka-wbw-loading">Kelime verileri y\u00FCkleniyor\u2026</div>';

    fetch(WBW_API + '?surah=' + surahNo + '&ayah=' + ayahNo)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.words || data.words.length === 0) {
          container.innerHTML = '<div class="ka-wbw-loading">Kelime verisi bulunamad\u0131.</div>';
          return;
        }

        var html = '<div class="ka-words-grid">';
        for (var i = 0; i < data.words.length; i++) {
          var w = data.words[i];
          html +=
            '<div class="ka-word-item">' +
              '<span class="ka-word-arabic">' + escapeHtml(w.arabic) + '</span>' +
              (w.transliteration
                ? '<span class="ka-word-translit">' + escapeHtml(w.transliteration) + '</span>'
                : '') +
              '<span class="ka-word-meaning-tr">' + escapeHtml(w.turkish_meaning || '\u2014') + '</span>' +
              '<span class="ka-word-meaning-en">' + escapeHtml(w.english_meaning || '') + '</span>' +
            '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
      })
      .catch(function () {
        container.innerHTML = '<div class="ka-wbw-loading">Kelime verisi y\u00FCklenemedi.</div>';
      });
  };

  /* ══════════════════════════════════════════════════════════════
     YARDIMCI FONKSİYONLAR
     ══════════════════════════════════════════════════════════════ */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);
    var safe = escapeHtml(text);
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'gi');
    return safe.replace(regex, '<span class="ka-highlight-match">$1</span>');
  }

  function highlightArabic(text, query) {
    if (!query || !text) return escapeHtml(text);

    // Normalize both for comparison
    var normalizedText = normalizeArabic(text);
    var normalizedQuery = normalizeArabic(query);

    if (currentMode === 'root') {
      // For root mode, highlight individual words containing the root letters
      return highlightRootInArabic(text, normalizedQuery);
    }

    // For text mode, find matches in normalized text and map back to original
    var safe = escapeHtml(text);
    var idx = normalizedText.indexOf(normalizedQuery);
    if (idx === -1) return safe;

    // Simple approach: highlight based on normalized positions
    // We need to map normalized positions back to original positions
    var origPositions = mapNormalizedPositions(text);
    var start = origPositions[idx] || 0;
    var end = origPositions[idx + normalizedQuery.length] || text.length;

    var before = escapeHtml(text.substring(0, start));
    var match = escapeHtml(text.substring(start, end));
    var after = escapeHtml(text.substring(end));

    return before + '<span class="ka-highlight-match">' + match + '</span>' + after;
  }

  function highlightRootInArabic(text, normalizedRoot) {
    // Split Arabic text into words and highlight words containing root letters in order
    var words = text.split(/(\s+)/);
    var result = '';

    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (/^\s+$/.test(word)) {
        result += word;
        continue;
      }

      var normalizedWord = normalizeArabic(word);
      if (containsRoot(normalizedWord, normalizedRoot)) {
        result += '<span class="ka-highlight-root">' + escapeHtml(word) + '</span>';
      } else {
        result += escapeHtml(word);
      }
    }

    return result;
  }

  function containsRoot(normalizedWord, rootLetters) {
    // Check if the word contains all root letters in order
    // with at most 2 characters between consecutive root letters
    var pos = 0;
    for (var i = 0; i < rootLetters.length; i++) {
      var found = normalizedWord.indexOf(rootLetters[i], pos);
      if (found === -1) return false;
      // Check gap constraint: max 2 chars between consecutive root letters
      if (i > 0 && (found - pos) > 2) return false;
      pos = found + 1;
    }
    return true;
  }

  function mapNormalizedPositions(text) {
    // Maps positions in normalized text to positions in original text
    var map = [];
    var normalIdx = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var normalized = normalizeArabic(ch);
      if (normalized.length > 0) {
        map[normalIdx] = i;
        normalIdx++;
      }
    }
    map[normalIdx] = text.length;
    return map;
  }

  function getSnippet(text, query, radius) {
    if (!text) return '';
    var lower = text.toLowerCase();
    var qLower = query.toLowerCase();
    var idx = lower.indexOf(qLower);
    if (idx === -1) return '';

    var start = Math.max(0, idx - radius);
    var end = Math.min(text.length, idx + query.length + radius);
    var snippet = '';
    if (start > 0) snippet += '\u2026';
    snippet += text.substring(start, end);
    if (end < text.length) snippet += '\u2026';
    return snippet;
  }

  function getArabicSnippet(text, query, radius) {
    if (!text) return '';
    var normalText = normalizeArabic(text);
    var normalQuery = normalizeArabic(query);
    var idx = normalText.indexOf(normalQuery);
    if (idx === -1) return '';

    var origMap = mapNormalizedPositions(text);
    var start = origMap[Math.max(0, idx - radius)] || 0;
    var end = origMap[Math.min(normalText.length, idx + normalQuery.length + radius)] || text.length;

    var snippet = '';
    if (start > 0) snippet += '\u2026';
    snippet += text.substring(start, end);
    if (end < text.length) snippet += '\u2026';
    return snippet;
  }

  /* ── Ba\u015Flat ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
