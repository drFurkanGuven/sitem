(function () {
  'use strict';

  var API = '/api/kuran/search';
  var WBW_API = '/api/kuran/wbw';
  var CORRELATE_API = '/api/kuran/correlate';
  var LIMIT = 20;

  var app = document.getElementById('app');
  var currentQuery = '';
  var currentOffset = 0;
  var totalResults = 0;
  var allResults = [];
  var debounceTimer = null;
  var strictMode = false;

  function init() {
    renderHero(false);
    document.addEventListener('click', function (e) {
      var suggestions = document.getElementById('suggestions');
      if (suggestions && !suggestions.contains(e.target)) {
        suggestions.classList.remove('active');
      }
    });
  }

  function renderHero(compact) {
    var heroClass = compact ? 'ka-hero ka-hero--compact' : 'ka-hero';
    var html =
      '<section class="' + heroClass + '">' +
        '<h1 class="ka-title">Kur\'an Lafız Analizi</h1>' +
        '<p class="ka-subtitle">Kök, transliterasyon ve Arapça metin üzerinden çok katmanlı arama yapın</p>' +
        '<div class="ka-search-wrapper">' +
          '<div class="ka-search-box">' +
            '<input type="text" id="searchInput" class="ka-search-input" ' +
              'placeholder="Bir kelime arayın\u2026 (Örn: nur, rahmet, \u0631\u062D\u0645)" ' +
              'autocomplete="off" value="' + escapeHtml(currentQuery) + '">' +
            '<button class="ka-search-btn" id="searchBtn">Ara</button>' +
          '</div>' +
          '<div class="ka-suggestions" id="suggestions"></div>' +
          '<div class="ka-filter-row">' +
            '<label class="ka-toggle-label" for="strictToggle">' +
              '<span class="ka-toggle-switch">' +
                '<input type="checkbox" id="strictToggle" ' + (strictMode ? 'checked' : '') + '>' +
                '<span class="ka-toggle-slider"></span>' +
              '</span>' +
              '<span class="ka-toggle-text">Tam Kelime Filtresi</span>' +
              '<span class="ka-toggle-hint">' +
                (strictMode
                  ? 'Aktif — sadece bağımsız kelime eşleşmeleri gösterilir'
                  : 'Pasif — kelime parçası eşleşmeleri de dahil edilir') +
              '</span>' +
            '</label>' +
          '</div>' +
          '<div class="ka-search-hint">' +
            'Türkçe meal, transliterasyon ve Arapça metin üzerinden eş zamanlı arama yapar' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<div id="correlationPanel"></div>' +
      '<div id="resultsInfo"></div>' +
      '<div class="ka-results" id="results"></div>';

    app.innerHTML = html;
    bindSearchEvents();

    var input = document.getElementById('searchInput');
    if (input) input.focus();
  }

  function bindSearchEvents() {
    var input = document.getElementById('searchInput');
    var btn = document.getElementById('searchBtn');
    var toggle = document.getElementById('strictToggle');

    if (input) {
      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        var q = input.value.trim();
        if (q.length < 2) {
          hideSuggestions();
          return;
        }
        debounceTimer = setTimeout(function () {
          fetchSuggestions(q);
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
        doSearch(input.value.trim());
      });
    }

    if (toggle) {
      toggle.addEventListener('change', function () {
        strictMode = toggle.checked;
        // Update hint text
        var hint = document.querySelector('.ka-toggle-hint');
        if (hint) {
          hint.textContent = strictMode
            ? 'Aktif — sadece bağımsız kelime eşleşmeleri gösterilir'
            : 'Pasif — kelime parçası eşleşmeleri de dahil edilir';
        }
        // Re-search if there's an active query
        if (currentQuery) {
          doSearch(currentQuery);
        }
      });
    }
  }

  function fetchSuggestions(q) {
    var url = API + '?q=' + encodeURIComponent(q) + '&limit=5';
    if (strictMode) url += '&strict=1';

    fetch(url)
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

  function showSuggestions(items, q) {
    var box = document.getElementById('suggestions');
    if (!box) return;

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var v = items[i];
      var snippet = getSnippet(v.turkishMeal, q, 60);
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

  function doSearch(q) {
    if (!q || q.length < 2) return;

    currentQuery = q;
    currentOffset = 0;
    allResults = [];

    renderHero(true);
    showLoading();
    fetchResults();
    fetchCorrelation(q);
  }

  function fetchResults() {
    var url = API + '?q=' + encodeURIComponent(currentQuery) +
      '&limit=' + LIMIT + '&offset=' + currentOffset;
    if (strictMode) url += '&strict=1';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          showError(data.error);
          return;
        }
        totalResults = data.total;
        allResults = allResults.concat(data.results);
        currentOffset += data.results.length;
        renderResults();
      })
      .catch(function (err) {
        showError('Bağlantı hatası: ' + err.message);
      });
  }

  function fetchCorrelation(q) {
    var panel = document.getElementById('correlationPanel');
    if (!panel) return;

    panel.innerHTML =
      '<div class="ka-correlation ka-correlation--loading">' +
        '<div class="ka-correlation-header">' +
          '<span class="ka-correlation-icon">◎</span> Korelasyon Analizi' +
        '</div>' +
        '<div class="ka-correlation-body">' +
          '<div class="ka-spinner-small"></div> Hesaplanıyor\u2026' +
        '</div>' +
      '</div>';

    var url = CORRELATE_API + '?q=' + encodeURIComponent(q) + '&top=12';
    if (strictMode) url += '&strict=1';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          panel.innerHTML = '';
          return;
        }
        renderCorrelation(data);
      })
      .catch(function () {
        panel.innerHTML = '';
      });
  }

  function renderCorrelation(data) {
    var panel = document.getElementById('correlationPanel');
    if (!panel || !data.correlations || data.correlations.length === 0) {
      if (panel) panel.innerHTML = '';
      return;
    }

    var maxPct = data.correlations[0].percentage;

    var html =
      '<div class="ka-correlation">' +
        '<div class="ka-correlation-header">' +
          '<span class="ka-correlation-icon">◎</span>' +
          ' Korelasyon Analizi' +
          '<span class="ka-correlation-meta">' +
            '"' + escapeHtml(data.query) + '" ile birlikte en çok geçen kelimeler' +
            ' <span class="ka-correlation-count">(' + data.totalVerses + ' ayet analiz edildi)</span>' +
          '</span>' +
        '</div>' +
        '<div class="ka-correlation-body">' +
          '<div class="ka-correlation-grid">';

    for (var i = 0; i < data.correlations.length; i++) {
      var c = data.correlations[i];
      var barWidth = maxPct > 0 ? Math.max((c.percentage / maxPct) * 100, 8) : 8;

      html +=
        '<div class="ka-corr-item">' +
          '<span class="ka-corr-word">' + escapeHtml(c.word) + '</span>' +
          '<div class="ka-corr-bar-track">' +
            '<div class="ka-corr-bar-fill" style="width:' + barWidth + '%"></div>' +
          '</div>' +
          '<span class="ka-corr-pct">%' + c.percentage + '</span>' +
        '</div>';
    }

    html +=
          '</div>' +
        '</div>' +
      '</div>';

    panel.innerHTML = html;
  }

  function showLoading() {
    var results = document.getElementById('results');
    if (results) {
      results.innerHTML =
        '<div class="ka-loading">' +
          '<div class="ka-spinner"></div>' +
          '<div>Aranıyor\u2026</div>' +
        '</div>';
    }
  }

  function showError(msg) {
    var results = document.getElementById('results');
    if (results) {
      results.innerHTML = '<div class="ka-error">' + escapeHtml(msg) + '</div>';
    }
  }

  function renderResults() {
    var info = document.getElementById('resultsInfo');
    var container = document.getElementById('results');
    if (!container) return;

    if (info) {
      var modeLabel = strictMode
        ? '<span class="ka-mode-badge ka-mode-badge--strict">Tam Kelime</span>'
        : '<span class="ka-mode-badge ka-mode-badge--wide">Geniş Arama</span>';

      info.innerHTML =
        '<div class="ka-results-info">' +
          modeLabel +
          '<strong>' + totalResults + '</strong> ayet bulundu' +
          (currentQuery ? ' — "' + escapeHtml(currentQuery) + '"' : '') +
        '</div>';
    }

    if (allResults.length === 0) {
      container.innerHTML =
        '<div class="ka-empty">' +
          '<h3>Sonuç bulunamadı</h3>' +
          '<p>"' + escapeHtml(currentQuery) + '" ile eşleşen ayet bulunamadı.' +
          (strictMode ? ' Tam kelime filtresi aktif. Geniş aramayı deneyebilirsiniz.' : ' Farklı bir arama deneyin.') +
          '</p>' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < allResults.length; i++) {
      html += renderVerseCard(allResults[i]);
    }

    if (allResults.length < totalResults) {
      html +=
        '<div class="ka-load-more-wrapper">' +
          '<button class="ka-load-more" id="loadMoreBtn">Daha fazla göster (' +
            allResults.length + '/' + totalResults +
          ')</button>' +
        '</div>';
    }

    container.innerHTML = html;

    var loadMore = document.getElementById('loadMoreBtn');
    if (loadMore) {
      loadMore.addEventListener('click', function () {
        loadMore.textContent = 'Yükleniyor\u2026';
        loadMore.disabled = true;
        fetchResults();
      });
    }
  }

  function renderVerseCard(verse) {
    var wbwId = 'wbw-' + verse.surahNo + '-' + verse.ayahNo;
    return (
      '<div class="ka-verse-card">' +
        '<div class="ka-verse-ref">' +
          '<span class="ka-badge">' + verse.surahNo + ':' + verse.ayahNo + '</span>' +
          escapeHtml(verse.surahNameTr) +
          ' <span style="font-family:Amiri,serif;font-size:0.9rem;color:var(--ka-arabic-color);">' +
            escapeHtml(verse.surahNameAr) +
          '</span>' +
        '</div>' +
        '<div class="ka-arabic-text">' + escapeHtml(verse.arabicText) + '</div>' +
        '<div id="' + wbwId + '">' +
          '<button class="ka-wbw-toggle" onclick="window.__loadWBW(' +
            verse.surahNo + ',' + verse.ayahNo + ')">' +
            '\u25B6 Kelime Kelime Göster' +
          '</button>' +
        '</div>' +
        '<div class="ka-turkish-meal">' +
          highlightText(verse.turkishMeal, currentQuery) +
        '</div>' +
      '</div>'
    );
  }

  window.__loadWBW = function (surahNo, ayahNo) {
    var container = document.getElementById('wbw-' + surahNo + '-' + ayahNo);
    if (!container) return;

    container.innerHTML = '<div class="ka-wbw-loading">Kelime verileri yükleniyor\u2026</div>';

    fetch(WBW_API + '?surah=' + surahNo + '&ayah=' + ayahNo)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.words || data.words.length === 0) {
          container.innerHTML = '<div class="ka-wbw-loading">Kelime verisi bulunamadı.</div>';
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
              '<span class="ka-word-meaning-tr">' + escapeHtml(w.turkish_meaning || '—') + '</span>' +
              '<span class="ka-word-meaning-en">' + escapeHtml(w.english_meaning || '') + '</span>' +
            '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
      })
      .catch(function () {
        container.innerHTML = '<div class="ka-wbw-loading">Kelime verisi yüklenemedi.</div>';
      });
  };

  /* ── Yardımcı Fonksiyonlar ── */

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
    var pattern;
    if (strictMode) {
      // In strict mode, highlight only whole-word matches
      pattern = '\\b(' + escaped + ')\\b';
    } else {
      pattern = '(' + escaped + ')';
    }
    var regex = new RegExp(pattern, 'gi');
    return safe.replace(regex, '<span class="ka-highlight-match">$1</span>');
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

  /* ── Başlat ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
