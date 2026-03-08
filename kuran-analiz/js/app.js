(function () {
  'use strict';

  var API = '/api/kuran/search';
  var WBW_API = '/api/kuran/wbw';
  var LIMIT = 20;

  var app = document.getElementById('app');
  var currentQuery = '';
  var currentOffset = 0;
  var totalResults = 0;
  var allResults = [];
  var debounceTimer = null;

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
              'placeholder="Bir kelime arayın\u2026 (Örn: furkan, rahmet, \u0631\u062D\u0645)" ' +
              'autocomplete="off" value="' + escapeHtml(currentQuery) + '">' +
            '<button class="ka-search-btn" id="searchBtn">Ara</button>' +
          '</div>' +
          '<div class="ka-suggestions" id="suggestions"></div>' +
          '<div class="ka-search-hint">' +
            'T\u00FCrk\u00E7e meal, transliterasyon ve Arap\u00E7a metin \u00FCzerinden e\u015F zamanl\u0131 arama yapar' +
          '</div>' +
        '</div>' +
      '</section>' +
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
  }

  function fetchSuggestions(q) {
    fetch(API + '?q=' + encodeURIComponent(q) + '&limit=5')
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
      // If match is from transliteration, show that instead
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
  }

  function fetchResults() {
    fetch(API + '?q=' + encodeURIComponent(currentQuery) + '&limit=' + LIMIT + '&offset=' + currentOffset)
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
      info.innerHTML =
        '<div class="ka-results-info">' +
          '<strong>' + totalResults + '</strong> ayet bulundu' +
          (currentQuery ? ' — "' + escapeHtml(currentQuery) + '"' : '') +
        '</div>';
    }

    if (allResults.length === 0) {
      container.innerHTML =
        '<div class="ka-empty">' +
          '<h3>Sonuç bulunamadı</h3>' +
          '<p>"' + escapeHtml(currentQuery) + '" ile eşleşen ayet bulunamadı. Farklı bir arama deneyin.</p>' +
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
    var regex = new RegExp('(' + escaped + ')', 'gi');
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
