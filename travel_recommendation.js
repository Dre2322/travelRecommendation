/*
  File: travel_recommendation.js
  Author: Andres Melendez
  Purpose:
    Implements search and recommendation rendering for TravelBloom.

  Project Tasks Covered:
    Task 6: Fetch JSON data using fetch API and verify via console.log
    Task 7: Accept keyword variations (case-insensitive + plurals)
    Task 8: Display at least two recommendations with image + description
    Task 9: Reset button clears results
    Task 10 (Optional): Display current time for recommended country (live clock)

  Enhancements:
    - Navbar layout shifts:
        Home: space-between (brand left, nav middle, search right)
        About/Contact: centered layout (brand + nav centered)
    - Active nav highlighting
    - Smooth fade transitions between sections (CSS animation)
    - Results header (query + category + count)
*/

'use strict';

/* =========================
   Application State
   ========================= */
let apiData = null;

// Task 10: interval reference for live clock updates
let clockIntervalId = null;

/* =========================
   DOM Ready Wiring
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation behavior (single-page sections)
  document.getElementById('linkHome').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('home');
  });

  document.getElementById('linkAbout').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('about');
  });

  document.getElementById('linkContact').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('contact');
  });

  // Search + Reset buttons
  document.getElementById('btnSearch').addEventListener('click', handleSearch);
  document.getElementById('btnReset').addEventListener('click', clearResults);

  // Contact form (demo-only: prevents page reload)
  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thanks! Your message has been submitted.');
    e.target.reset();
  });

  // Ensure navbar matches initial Home state
  applyNavState('home');

  // Task 6: Fetch local JSON data (requires http/https server like Live Server)
  fetchApiData();
});

/* =========================
   Page Display + Navbar Rules
   ========================= */
/**
 * Shows one page section at a time.
 * Rubric requirement: About/Contact navbar should not include search UI.
 * We keep navbar centered but hide search controls on About/Contact.
 */
function showPage(pageName) {
  const home = document.getElementById('homePage');
  const about = document.getElementById('aboutPage');
  const contact = document.getElementById('contactPage');

  home.classList.remove('active');
  about.classList.remove('active');
  contact.classList.remove('active');

  if (pageName === 'home') {
    home.classList.add('active');
  } else if (pageName === 'about') {
    about.classList.add('active');
    clearResults();
  } else {
    contact.classList.add('active');
    clearResults();
  }

  // Update navbar layout + active link styling
  applyNavState(pageName);
}

/**
 * Applies navbar layout and active link style based on current page.
 */
function applyNavState(pageName) {
  const navbarInner = document.querySelector('.navbar-inner');
  const searchArea = document.getElementById('searchArea');

  const linkHome = document.getElementById('linkHome');
  const linkAbout = document.getElementById('linkAbout');
  const linkContact = document.getElementById('linkContact');

  // Reset active classes
  linkHome.classList.remove('active');
  linkAbout.classList.remove('active');
  linkContact.classList.remove('active');

  // Reset layout classes
  navbarInner.classList.remove('home-layout', 'center-layout');

  if (pageName === 'home') {
    navbarInner.classList.add('home-layout');

    // Show search normally (takes space + visible)
    searchArea.classList.remove('hidden');
    searchArea.style.display = 'flex';
    linkHome.classList.add('active');
  } else if (pageName === 'about') {
    navbarInner.classList.add('home-layout'); // keep same spacing logic as Home

    // Hide search but KEEP its width so center stays perfect
    searchArea.classList.add('hidden');
    searchArea.style.display = 'flex';

    linkAbout.classList.add('active');
  } else {
    navbarInner.classList.add('home-layout'); // keep same spacing logic as Home

    // Hide search but KEEP its width so center stays perfect
    searchArea.classList.add('hidden');
    searchArea.style.display = 'flex';

    linkContact.classList.add('active');
  }
}


/* =========================
   Task 6: Fetch API Data
   ========================= */
/**
 * Loads travel_recommendation_api.json from the same folder as the HTML file.
 * NOTE:
 *   This will fail with CORS if opened via file://
 *   Use Live Server / http server for fetch() to work.
 */
async function fetchApiData() {
  try {
    const response = await fetch('./travel_recommendation_api.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
    }

    apiData = await response.json();

    // Task 6 requirement: verify access via console.log
    console.log('✅ API Data Loaded:', apiData);
  } catch (err) {
    console.error('❌ Error loading API data:', err);
    renderEmpty('Unable to load recommendation data. Check your JSON file path (and use Live Server).');
  }
}

/* =========================
   Task 7 + 8: Search & Display
   ========================= */
/**
 * Handles search when Search button is clicked (Task 7 requirement).
 */
function handleSearch() {
  const inputEl = document.getElementById('searchInput');
  const raw = (inputEl.value || '').trim();

  if (!raw) {
    stopClock();
    setTimeBox(null);
    setResultsHeader(null, 0, null);
    renderEmpty('Type a keyword like "beach", "temple", "country", or a country/city name.');
    return;
  }

  if (!apiData) {
    stopClock();
    setTimeBox(null);
    setResultsHeader(null, 0, null);
    renderEmpty('Data is still loading. Try again in a moment.');
    return;
  }

  const keyword = normalizeKeyword(raw);

  // Beaches
  if (keyword === 'beach') {
    stopClock();
    setTimeBox(null);

    const list = apiData.beaches || [];
    setResultsHeader(raw, list.length, 'Beaches');
    renderRecommendations(list, 'Beaches');
    return;
  }

  // Temples
  if (keyword === 'temple') {
    stopClock();
    setTimeBox(null);

    const list = apiData.temples || [];
    setResultsHeader(raw, list.length, 'Temples');
    renderRecommendations(list, 'Temples');
    return;
  }

  // Countries keyword: show all cities
  if (keyword === 'country') {
    const allCities = flattenAllCities(apiData.countries || []);
    setResultsHeader(raw, allCities.length, 'Countries (Cities)');
    renderRecommendations(allCities, 'Countries');

    // Task 10: show multiple clocks for mapped countries
    const tzList = getTimeZonesForCountries((apiData.countries || []).map(c => c.name));
    startMultiClock(tzList);
    return;
  }

  // Exact country match
  const exactCountry = (apiData.countries || []).find((c) =>
    (c.name || '').toLowerCase() === keyword
  );

  if (exactCountry) {
    const cities = Array.isArray(exactCountry.cities) ? exactCountry.cities : [];
    setResultsHeader(raw, cities.length, `${exactCountry.name} (Cities)`);
    renderRecommendations(cities, exactCountry.name);

    const tz = getTimeZoneForCountry(exactCountry.name);
    startSingleClock(exactCountry.name, tz);
    return;
  }

  // Partial country match
  const partialCountry = (apiData.countries || []).find((c) =>
    (c.name || '').toLowerCase().includes(keyword)
  );

  if (partialCountry) {
    const cities = Array.isArray(partialCountry.cities) ? partialCountry.cities : [];
    setResultsHeader(raw, cities.length, `${partialCountry.name} (Cities)`);
    renderRecommendations(cities, partialCountry.name);

    const tz = getTimeZoneForCountry(partialCountry.name);
    startSingleClock(partialCountry.name, tz);
    return;
  }

  // City search
  const allCities = flattenAllCities(apiData.countries || []);
  const matchedCities = allCities.filter((city) =>
    (city.name || '').toLowerCase().includes(keyword)
  );

  if (matchedCities.length > 0) {
    setResultsHeader(raw, matchedCities.length, 'City Results');
    renderRecommendations(matchedCities, 'City');

    const inferredCountry = inferCountryFromCityName(matchedCities[0].name);
    if (inferredCountry) {
      const tz = getTimeZoneForCountry(inferredCountry);
      startSingleClock(inferredCountry, tz);
    } else {
      stopClock();
      setTimeBox(null);
    }
    return;
  }

  stopClock();
  setTimeBox(null);
  setResultsHeader(raw, 0, null);
  renderEmpty('No matches found. Try "beach", "temple", "country", or a country/city name.');
}

/**
 * Normalizes user input for matching:
 * - lowercase
 * - remove punctuation
 * - handle plurals
 */
function normalizeKeyword(text) {
  let t = text.toLowerCase();
  t = t.replace(/[^\w\s-]/g, '').trim();

  if (t === 'beaches') return 'beach';
  if (t === 'temples') return 'temple';
  if (t === 'countries') return 'country';

  return t;
}

/**
 * Converts countries -> cities into one flat list of city objects.
 */
function flattenAllCities(countries) {
  if (!Array.isArray(countries)) return [];
  return countries.flatMap((c) => Array.isArray(c.cities) ? c.cities : []);
}

/**
 * Task 8: Renders cards with image + title + description.
 * Must display at least 2 recommendations if available.
 */
function renderRecommendations(items, badgeLabel) {
  const resultsEl = document.getElementById('results');
  const emptyEl = document.getElementById('emptyState');

  resultsEl.innerHTML = '';
  emptyEl.style.display = 'none';
  emptyEl.textContent = '';

  if (!Array.isArray(items) || items.length === 0) {
    renderEmpty('No recommendations found for that search.');
    return;
  }

  // Show up to 6; ensure at least 2 if possible
  const maxToShow = Math.min(items.length, 6);
  const toShow = items.slice(0, Math.max(2, maxToShow));

  toShow.forEach((item) => {
    const name = item.name || 'Unknown Place';
    const description = item.description || 'No description available.';
    const imageUrl = item.imageUrl || 'images/placeholder.jpg';

    const card = document.createElement('div');
    card.className = 'card';

    const media = document.createElement('div');
    media.className = 'card-media';

    const img = document.createElement('img');
    img.alt = name;
    img.src = imageUrl;

    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    const badge = document.createElement('div');
    badge.className = 'card-badge';
    badge.textContent = badgeLabel;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = name;

    overlay.appendChild(badge);
    overlay.appendChild(title);

    media.appendChild(img);
    media.appendChild(overlay);

    const body = document.createElement('div');
    body.className = 'card-body';

    const p = document.createElement('p');
    p.textContent = description;

    body.appendChild(p);

    card.appendChild(media);
    card.appendChild(body);

    resultsEl.appendChild(card);
  });
}

/* =========================
   Task 9: Reset / Clear
   ========================= */
/**
 * Clears search input, results, header, and time display.
 */
function clearResults() {
  document.getElementById('searchInput').value = '';
  document.getElementById('results').innerHTML = '';

  const emptyEl = document.getElementById('emptyState');
  emptyEl.style.display = 'none';
  emptyEl.textContent = '';

  setResultsHeader(null, 0, null);

  stopClock();
  setTimeBox(null);
}

/**
 * Shows an "empty" message in the info box area.
 */
function renderEmpty(message) {
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';

  const emptyEl = document.getElementById('emptyState');
  emptyEl.textContent = message;
  emptyEl.style.display = 'block';
}

/* =========================
   Results Header (Upgrade)
   ========================= */
function setResultsHeader(queryRaw, totalFound, categoryLabel) {
  const header = document.getElementById('resultsHeader');
  const titleEl = document.getElementById('resultsTitle');
  const metaEl = document.getElementById('resultsMeta');

  if (!queryRaw) {
    header.style.display = 'none';
    titleEl.textContent = 'Results';
    metaEl.textContent = '';
    return;
  }

  header.style.display = 'block';
  titleEl.textContent = `Showing results for: "${queryRaw}"`;

  const catText = categoryLabel ? `Category: ${categoryLabel}` : 'Category: (no match)';
  metaEl.textContent = `${catText} • Matches found: ${totalFound}`;
}

/* =========================
   Task 10: Country Time Display
   ========================= */
function getTimeZoneForCountry(countryName) {
  const map = {
    australia: 'Australia/Sydney',
    japan: 'Asia/Tokyo',
    brazil: 'America/Sao_Paulo'
  };

  const key = (countryName || '').toLowerCase().trim();
  return map[key] || null;
}

function getTimeZonesForCountries(countryNames) {
  const unique = Array.from(
    new Set((countryNames || []).map(n => (n || '').trim()).filter(Boolean))
  );

  return unique
    .map((name) => ({ label: name, timeZone: getTimeZoneForCountry(name) }))
    .filter((x) => x.timeZone);
}

function startSingleClock(countryName, timeZone) {
  stopClock();

  if (!timeZone) {
    setTimeBox(`Current time: (time zone not configured for ${countryName})`);
    return;
  }

  updateSingleClock(countryName, timeZone);
  clockIntervalId = setInterval(() => updateSingleClock(countryName, timeZone), 1000);
}

function updateSingleClock(countryName, timeZone) {
  const options = {
    timeZone,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  };

  const timeStr = new Date().toLocaleTimeString('en-US', options);
  setTimeBox(`Current time in ${countryName}: ${timeStr}`);
}

function startMultiClock(tzList) {
  stopClock();

  if (!Array.isArray(tzList) || tzList.length === 0) {
    setTimeBox(null);
    return;
  }

  updateMultiClock(tzList);
  clockIntervalId = setInterval(() => updateMultiClock(tzList), 1000);
}

function updateMultiClock(tzList) {
  const lines = tzList.map(({ label, timeZone }) => {
    const options = {
      timeZone,
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    };
    const t = new Date().toLocaleTimeString('en-US', options);
    return `${label}: ${t}`;
  });

  setTimeBox(`Current times:\n${lines.join('\n')}`);
}

function setTimeBox(message) {
  const timeBox = document.getElementById('timeBox');
  if (!timeBox) return;

  if (!message) {
    timeBox.style.display = 'none';
    timeBox.textContent = '';
    return;
  }

  timeBox.style.display = 'block';
  timeBox.textContent = message;
}

function stopClock() {
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
}

function inferCountryFromCityName(cityName) {
  const text = (cityName || '').trim();
  const parts = text.split(',');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].trim();
}
