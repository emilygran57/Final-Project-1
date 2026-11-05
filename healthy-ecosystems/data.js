// Healthy Ecosystems - sample product data, scoring and the saved shopping list.
// The numbers are rough sample values for this demo, not measured data.
// Emissions use typical kg CO2e per kg of food (Our World in Data averages).

const PRODUCTS = [
  { id: "apples", name: "Apples", category: "Produce", image: "assets/apples.png", price: 4.99, weightKg: 1.4, co2PerKg: 0.4, health: 95, localFit: 1.2 },
  { id: "banana", name: "Bananas", category: "Produce", image: "assets/banana.png", price: 1.49, weightKg: 1.0, co2PerKg: 0.9, health: 90, localFit: 0.4 },
  { id: "spinach", name: "Spinach", category: "Produce", emoji: "🥬", price: 3.49, weightKg: 0.3, co2PerKg: 0.5, health: 98, localFit: 1.2 },
  { id: "wheat-bread", name: "Wheat Bread", category: "Pantry", image: "assets/wheat-bread.png", price: 3.29, weightKg: 0.6, co2PerKg: 1.6, health: 70, localFit: 1.0 },
  { id: "greek-yogurt", name: "Greek Yogurt", category: "Dairy", image: "assets/greek-yogurt.png", price: 5.49, weightKg: 0.9, co2PerKg: 2.5, health: 85, localFit: 1.1 },
  { id: "milk", name: "Milk", category: "Dairy", emoji: "🥛", price: 3.99, weightKg: 3.8, co2PerKg: 3.2, health: 72, localFit: 1.1 },
  { id: "eggs", name: "Eggs", category: "Dairy", image: "assets/fried-egg.png", price: 3.79, weightKg: 0.7, co2PerKg: 4.7, health: 80, localFit: 1.1 },
  { id: "steak", name: "Steak", category: "Meat", image: "assets/steak.png", price: 12.99, weightKg: 0.45, co2PerKg: 99.5, health: 55, localFit: 0.9 },
  { id: "rotisserie-chicken", name: "Rotisserie Chicken", category: "Meat", image: "assets/rotisserie-chicken.png", price: 7.99, weightKg: 1.2, co2PerKg: 9.9, health: 75, localFit: 0.9 },
  { id: "potato-chips", name: "Potato Chips", category: "Snacks", image: "assets/chips.png", price: 4.29, weightKg: 0.28, co2PerKg: 2.5, health: 20, localFit: 0.6 },
  { id: "doritos", name: "Doritos", category: "Snacks", emoji: "🌽", price: 4.99, weightKg: 0.28, co2PerKg: 2.5, health: 15, localFit: 0.6 }
];

const STORES = [
  { id: "meijer", name: "Meijer", localShare: 0.3, priceFactor: 1.0, travel: 1.0 },
  { id: "kroger", name: "Kroger", localShare: 0.15, priceFactor: 1.0, travel: 1.0 },
  { id: "whole-foods", name: "Whole Foods", localShare: 0.2, priceFactor: 1.2, travel: 1.0 },
  { id: "aldi", name: "Aldi", localShare: 0.1, priceFactor: 0.85, travel: 1.0 },
  { id: "farmers-market", name: "Farmers Market", localShare: 0.8, priceFactor: 1.1, travel: 0.9 }
];

const WEEKLY_BUDGET = 100;
const LIST_KEY = "he-shopping-list";

const SAMPLE_LIST = [
  { id: "apples", store: "meijer" },
  { id: "eggs", store: "meijer" },
  { id: "steak", store: "kroger" },
  { id: "banana", store: "meijer" },
  { id: "rotisserie-chicken", store: "meijer" },
  { id: "potato-chips", store: "meijer" }
];

function findProduct(id) {
  return PRODUCTS.find(function (p) { return p.id === id; });
}

function findStore(id) {
  return STORES.find(function (s) { return s.id === id; }) || STORES[0];
}

// Scores for one product bought at one store
function scoreProduct(product, store) {
  const emissions = product.weightKg * product.co2PerKg * store.travel;
  const price = product.price * store.priceFactor;
  const localShare = Math.min(1, store.localShare * product.localFit);
  const environment = 100 * Math.exp(-emissions / 15);
  const ecosystem = 0.45 * environment + 0.35 * product.health + 0.2 * localShare * 100;

  return {
    emissions: emissions,
    price: price,
    localDollars: price * localShare,
    localShare: localShare,
    health: product.health,
    ecosystem: Math.round(ecosystem)
  };
}

// "good" / "okay" / "bad" ratings used for the colored tags
function rateEmissions(kg) { return kg < 1 ? "good" : kg < 5 ? "okay" : "bad"; }
function rateLocal(share) { return share >= 0.5 ? "good" : share >= 0.25 ? "okay" : "bad"; }
function rateScore(score) { return score >= 75 ? "good" : score >= 50 ? "okay" : "bad"; }

const RATING_WORDS = {
  emissions: { good: "low", okay: "medium", bad: "high" },
  local: { good: "high", okay: "medium", bad: "low" },
  score: { good: "great", okay: "medium", bad: "low" }
};

// ---------- Shopping list (saved in this browser) ----------
function loadList() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIST_KEY));
    if (Array.isArray(saved)) return saved.filter(function (item) { return findProduct(item.id); });
  } catch (e) { /* storage unavailable: fall back to the sample list */ }
  return SAMPLE_LIST.map(function (item, i) { return { id: item.id, store: item.store, added: i }; });
}

function saveList(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

function addToList(productId, storeId) {
  const list = loadList();
  list.push({ id: productId, store: storeId, added: Date.now() });
  saveList(list);
  return list;
}

function removeFromList(index) {
  const list = loadList();
  list.splice(index, 1);
  saveList(list);
  return list;
}

function resetList() {
  try { localStorage.removeItem(LIST_KEY); } catch (e) { /* ignore */ }
  return loadList();
}

// Totals for a whole list
function summarizeList(list) {
  const rows = list.map(function (item, index) {
    const product = findProduct(item.id);
    const store = findStore(item.store);
    return { index: index, item: item, product: product, store: store, score: scoreProduct(product, store) };
  });

  const sum = function (key) {
    return rows.reduce(function (total, row) { return total + row.score[key]; }, 0);
  };
  const count = rows.length || 1;
  const spent = sum("price");

  return {
    rows: rows,
    emissions: sum("emissions"),
    localDollars: sum("localDollars"),
    localShare: spent ? sum("localDollars") / spent : 0,
    health: rows.length ? Math.round(sum("health") / count) : 0,
    ecosystem: rows.length ? Math.round(sum("ecosystem") / count) : 0,
    spent: spent
  };
}

function money(value) {
  return "$" + value.toFixed(2);
}
