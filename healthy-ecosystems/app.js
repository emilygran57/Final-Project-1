// Healthy Ecosystems - page behavior. Each page sets <body data-page="...">.

function $(selector, root) { return (root || document).querySelector(selector); }
function $all(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }

function param(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function productImage(product, className) {
  if (product.image) {
    return '<img class="' + className + '" src="' + product.image + '" alt="' + escapeHTML(product.name) + '">';
  }
  return '<span class="' + className + ' emoji-photo" role="img" aria-label="' + escapeHTML(product.name) + '">' + product.emoji + "</span>";
}

function fillSelect(select, items, selectedId) {
  select.innerHTML = items.map(function (item) {
    return '<option value="' + item.id + '"' + (item.id === selectedId ? " selected" : "") + ">" + escapeHTML(item.name) + "</option>";
  }).join("");
}

function setTag(el, rating, word) {
  el.className = el.className.replace(/\b(good|okay|bad)\b/g, "").trim() + " " + rating;
  el.textContent = word;
}

// Semicircle gauge drawn as SVG so it can show any score.
// The arc fills to the score and turns green, yellow or red; the number counts up or down.
const GAUGE_COLORS = { good: "#9ad339", okay: "#f1d84b", bad: "#ff7d6c" };

function renderGauge(el, score) {
  if (!el.querySelector("svg")) {
    el.innerHTML = '<svg viewBox="0 0 140 92" width="140" height="92" aria-hidden="true">' +
      '<path d="M12 70 A58 58 0 0 1 128 70" pathLength="100" fill="none" stroke="#d9d9d9" stroke-width="14" stroke-linecap="round"/>' +
      '<path class="fill" d="M12 70 A58 58 0 0 1 128 70" pathLength="100" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="0 100"/>' +
      '<text x="12" y="90" text-anchor="middle">0</text><text x="128" y="90" text-anchor="middle">100</text>' +
      "</svg><span>0</span>";
    el.querySelector(".fill").getBoundingClientRect(); // let the first fill animate from 0
  }
  const fill = el.querySelector(".fill");
  fill.setAttribute("stroke-dasharray", score + " 100");
  fill.setAttribute("stroke", GAUGE_COLORS[rateScore(score)]);
  el.setAttribute("aria-label", "Health score " + score + " out of 100");

  const number = el.querySelector("span");
  const from = Number(number.textContent) || 0;
  const start = performance.now();
  cancelAnimationFrame(el.countFrame);
  (function step(now) {
    const t = Math.min(1, (now - start) / 800);
    number.textContent = Math.round(from + (score - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) el.countFrame = requestAnimationFrame(step);
  })(start);
}

let toastTimer;
function toast(message) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
}

// Rows for the Top Items / Recent Purchases cards
function itemRows(rows) {
  if (!rows.length) return '<li class="empty">Your list is empty. <a href="search.html">Find products</a></li>';
  return rows.map(function (row) {
    return '<li><a href="product.html?id=' + row.product.id + "&store=" + row.store.id + '">' +
      productImage(row.product, "food") +
      "<span>" + escapeHTML(row.product.name) + "</span>" +
      '<span class="pill ' + rateScore(row.score.ecosystem) + '">' + row.score.ecosystem + "</span>" +
      '<img class="arrow" src="assets/arrow-forward.png" alt=""></a></li>';
  }).join("");
}

function topAndRecent(summary) {
  const top = summary.rows.slice().sort(function (a, b) { return b.score.ecosystem - a.score.ecosystem; }).slice(0, 3);
  const recent = summary.rows.slice().sort(function (a, b) { return b.item.added - a.item.added; }).slice(0, 3);
  return { top: top, recent: recent };
}

// Product cards used on Home, Search and the product page
function productCard(product, storeId) {
  const score = scoreProduct(product, findStore(storeId));
  return '<div class="product-card">' +
    '<a href="product.html?id=' + product.id + '">' + productImage(product, "photo") + "</a>" +
    "<h3>" + escapeHTML(product.name) + "</h3>" +
    '<p class="category">' + product.category + ': <span class="score ' + rateScore(score.ecosystem) + '">' + score.ecosystem + "</span></p>" +
    '<div class="card-actions">' +
    '<a class="explore-link" href="product.html?id=' + product.id + '">Explore Impact <img src="assets/arrow-right.svg" alt=""></a>' +
    '<button class="add-button" type="button" data-add="' + product.id + '">+ Add</button>' +
    "</div></div>";
}

function wireAddButtons(root, storeId) {
  $all("[data-add]", root).forEach(function (button) {
    button.addEventListener("click", function () {
      const product = findProduct(button.dataset.add);
      const store = typeof storeId === "function" ? storeId() : storeId;
      addToList(product.id, store);
      toast(product.name + " added to your list");
    });
  });
}

// Fill the four impact cards (Home calculator and product page)
function renderImpactCards(product, store) {
  const s = scoreProduct(product, store);
  const emissionsRating = rateEmissions(s.emissions);
  const localRating = rateLocal(s.localShare);
  const healthRating = rateScore(s.health);

  $("#emissions-value").textContent = s.emissions.toFixed(2) + " kg";
  setTag($("#emissions-tag"), emissionsRating, RATING_WORDS.emissions[emissionsRating]);
  $("#local-value").textContent = money(s.localDollars);
  setTag($("#local-tag"), localRating, RATING_WORDS.local[localRating]);
  renderGauge($("#health-gauge"), s.health);
  setTag($("#health-tag"), healthRating, RATING_WORDS.score[healthRating]);
  $("#eco-value").innerHTML = s.ecosystem + "/<small>100</small>";
  setTag($("#eco-tag"), rateScore(s.ecosystem), RATING_WORDS.score[rateScore(s.ecosystem)]);
  return s;
}

// Home hero: cycle through the slogans after "app."
function rotateSlogans() {
  const slogans = $all(".slogans .mission");
  let current = 0;
  setInterval(function () {
    const leaving = slogans[current];
    current = (current + 1) % slogans.length;
    leaving.classList.add("leaving");
    leaving.classList.remove("active");
    slogans[current].classList.add("active");
    setTimeout(function () { leaving.classList.remove("leaving"); }, 500);
  }, 3000);
}

// ---------- Pages ----------
const pages = {
  home: function () {
    rotateSlogans();
    const productSelect = $("#product");
    const storeSelect = $("#store");
    fillSelect(productSelect, PRODUCTS, "potato-chips");
    fillSelect(storeSelect, STORES, "meijer");

    function calculate() {
      const product = findProduct(productSelect.value);
      renderImpactCards(product, findStore(storeSelect.value));
      $("#details-link").href = "product.html?id=" + product.id + "&store=" + storeSelect.value;
    }

    $("#calculate").addEventListener("click", function () {
      calculate();
      $(".stat-cards").classList.remove("flash");
      void $(".stat-cards").offsetWidth;
      $(".stat-cards").classList.add("flash");
    });
    productSelect.addEventListener("change", calculate);
    storeSelect.addEventListener("change", calculate);
    calculate();

    const featured = ["apples", "wheat-bread", "greek-yogurt"].map(findProduct);
    $("#featured").innerHTML = featured.map(function (p) { return productCard(p, "meijer"); }).join("");
    wireAddButtons($("#featured"), "meijer");
  },

  demo: function () {
    const summary = summarizeList(loadList());
    const lists = topAndRecent(summary);
    const left = WEEKLY_BUDGET - summary.spent;

    $("#eco-big").innerHTML = summary.ecosystem + "/<small>100</small>";
    $("#eco-bar").style.width = summary.ecosystem + "%";

    $("#d-emissions").textContent = summary.emissions.toFixed(1) + " kg";
    const er = rateEmissions(summary.emissions / Math.max(1, summary.rows.length));
    $("#d-emissions-note").className = "note " + er;
    $("#d-emissions-note span").textContent = RATING_WORDS.emissions[er] + " impact per item";

    $("#d-local").textContent = money(summary.localDollars);
    $("#d-local-note span").textContent = Math.round(summary.localShare * 100) + "% local spend";

    renderGauge($("#d-health"), summary.health);
    const hr = rateScore(summary.health);
    setTag($("#d-health-level"), hr, RATING_WORDS.score[hr]);

    $("#d-budget").innerHTML = "$" + Math.round(summary.spent) + "/<small>" + WEEKLY_BUDGET + "</small>";
    $("#d-budget-note").textContent = left >= 0 ? money(left) + " left to spend" : money(-left) + " over budget";
    $("#d-budget-bar").style.width = Math.min(100, (summary.spent / WEEKLY_BUDGET) * 100) + "%";
    $("#d-budget-bar").classList.toggle("over", left < 0);

    $("#top-items").innerHTML = itemRows(lists.top);
    $("#recent-items").innerHTML = itemRows(lists.recent);
    wireSearchBox();
  },

  search: function () {
    const box = $("#search");
    const results = $("#results");
    const count = $("#result-count");

    function render() {
      const q = box.value.trim().toLowerCase();
      const matches = PRODUCTS.filter(function (p) {
        return !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
          (q.endsWith("s") && p.name.toLowerCase().includes(q.slice(0, -1)));
      });
      count.textContent = matches.length ? matches.length + " product" + (matches.length === 1 ? "" : "s") : "";
      results.innerHTML = matches.length
        ? matches.map(function (p) { return productCard(p, "meijer"); }).join("")
        : '<p class="no-results">No products match “' + escapeHTML(box.value) + '”. Try one of the suggestions above.</p>';
      wireAddButtons(results, "meijer");
    }

    box.value = param("q") || "";
    box.addEventListener("input", render);
    $all(".chips button").forEach(function (chip) {
      chip.addEventListener("click", function () { box.value = chip.textContent; render(); });
    });
    render();
  },

  product: function () {
    const product = findProduct(param("id")) || PRODUCTS[0];
    const storeSelect = $("#store");
    fillSelect(storeSelect, STORES, findStore(param("store")).id);
    document.title = product.name + " | Healthy Ecosystems";

    $("#p-image").innerHTML = productImage(product, "hero-photo");
    $("#p-name").textContent = product.name;
    $("#p-category").textContent = product.category;
    $("#compare-link").href = "compare.html?a=" + product.id;

    function render() {
      const store = findStore(storeSelect.value);
      const s = renderImpactCards(product, store);
      $("#p-price").textContent = money(s.price) + " at " + store.name;

      // Swaps: other products in the same category, or anything, that score higher
      const better = PRODUCTS.filter(function (p) { return p.id !== product.id; })
        .map(function (p) { return { p: p, s: scoreProduct(p, store) }; })
        .filter(function (x) { return x.s.ecosystem > s.ecosystem; })
        .sort(function (a, b) {
          return (b.p.category === product.category) - (a.p.category === product.category) || b.s.ecosystem - a.s.ecosystem;
        })
        .slice(0, 3);
      $("#swaps").innerHTML = better.length
        ? better.map(function (x) { return productCard(x.p, store.id); }).join("")
        : '<p class="no-results">This is already one of the best choices at ' + store.name + ".</p>";
      wireAddButtons($("#swaps"), store.id);
    }

    storeSelect.addEventListener("change", render);
    $("#add").addEventListener("click", function () {
      addToList(product.id, storeSelect.value);
      toast(product.name + " added to your list");
    });
    render();
  },

  compare: function () {
    const a = $("#compare-a");
    const b = $("#compare-b");
    const storeSelect = $("#store");
    fillSelect(a, PRODUCTS, findProduct(param("a")) ? param("a") : "potato-chips");
    fillSelect(b, PRODUCTS, findProduct(param("b")) ? param("b") : "apples");
    fillSelect(storeSelect, STORES, "meijer");

    const rows = [
      { label: "Ecosystems Score", key: "ecosystem", better: "high", show: function (s) { return s.ecosystem + "/100"; } },
      { label: "Emissions", key: "emissions", better: "low", show: function (s) { return s.emissions.toFixed(2) + " kg"; } },
      { label: "Health Score", key: "health", better: "high", show: function (s) { return s.health + "/100"; } },
      { label: "Local Dollars", key: "localDollars", better: "high", show: function (s) { return money(s.localDollars); } },
      { label: "Price", key: "price", better: "low", show: function (s) { return money(s.price); } }
    ];

    function side(product, s, other) {
      return '<div class="compare-side">' + productImage(product, "photo") +
        "<h3>" + escapeHTML(product.name) + "</h3>" +
        rows.map(function (r) {
          const wins = r.better === "high" ? s[r.key] > other[r.key] : s[r.key] < other[r.key];
          return '<div class="compare-row' + (wins ? " wins" : "") + '"><span>' + r.label + "</span><strong>" + r.show(s) + "</strong></div>";
        }).join("") +
        '<button class="button" type="button" data-add="' + product.id + '">Add to list</button></div>';
    }

    function render() {
      const store = findStore(storeSelect.value);
      const pa = findProduct(a.value);
      const pb = findProduct(b.value);
      const sa = scoreProduct(pa, store);
      const sb = scoreProduct(pb, store);
      $("#comparison").innerHTML = side(pa, sa, sb) + side(pb, sb, sa);
      const winner = sa.ecosystem === sb.ecosystem ? null : sa.ecosystem > sb.ecosystem ? pa : pb;
      $("#verdict").textContent = winner
        ? winner.name + " is the better choice for the ecosystem at " + store.name + "."
        : "These two score the same at " + store.name + ".";
      wireAddButtons($("#comparison"), store.id);
    }

    [a, b, storeSelect].forEach(function (el) { el.addEventListener("change", render); });
    render();
  },

  list: function () {
    function render() {
      const summary = summarizeList(loadList());
      $("#list-rows").innerHTML = summary.rows.length
        ? summary.rows.map(function (row) {
          return "<tr>" +
            '<td><a class="list-product" href="product.html?id=' + row.product.id + "&store=" + row.store.id + '">' + productImage(row.product, "food") + escapeHTML(row.product.name) + "</a></td>" +
            "<td>" + row.store.name + "</td>" +
            "<td>" + money(row.score.price) + "</td>" +
            "<td>" + row.score.emissions.toFixed(2) + " kg</td>" +
            '<td><span class="pill ' + rateScore(row.score.ecosystem) + '">' + row.score.ecosystem + "</span></td>" +
            '<td><button class="remove" type="button" data-remove="' + row.index + '" aria-label="Remove ' + escapeHTML(row.product.name) + '">✕</button></td>' +
            "</tr>";
        }).join("")
        : '<tr><td colspan="6" class="empty">Your list is empty. <a href="search.html">Find products to add</a>.</td></tr>';

      $("#list-total").textContent = money(summary.spent);
      $("#list-emissions").textContent = summary.emissions.toFixed(1) + " kg";
      $("#list-score").textContent = summary.ecosystem + "/100";

      $all("[data-remove]").forEach(function (button) {
        button.addEventListener("click", function () {
          removeFromList(Number(button.dataset.remove));
          render();
        });
      });
    }

    $("#clear-list").addEventListener("click", function () { saveList([]); render(); });
    $("#reset-list").addEventListener("click", function () { resetList(); render(); });
    render();
  },

  profile: function () {
    const summary = summarizeList(loadList());
    const lists = topAndRecent(summary);
    const points = summary.rows.reduce(function (total, row) { return total + Math.round(row.score.ecosystem / 10) * 5; }, 0);

    $("#pf-eco").textContent = summary.ecosystem;
    $("#pf-points").textContent = points;
    $("#pf-health").textContent = summary.health;
    $("#pf-top").innerHTML = itemRows(lists.top);
    $("#pf-recent").innerHTML = itemRows(lists.recent);
  },

  scan: function () {
    wireSearchBox();
  }
};

// The search box on dashboard pages sends you to the Search page
function wireSearchBox() {
  const box = $("#search");
  if (!box) return;
  box.closest("form").addEventListener("submit", function (event) {
    event.preventDefault();
    window.location.href = "search.html?q=" + encodeURIComponent(box.value);
  });
  $all(".chips button").forEach(function (chip) {
    chip.addEventListener("click", function () {
      window.location.href = "search.html?q=" + encodeURIComponent(chip.textContent);
    });
  });
}

const page = pages[document.body.dataset.page];
if (page) page();
