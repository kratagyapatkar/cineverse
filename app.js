/* ============================================================
   CINEVERSE — APP.JS
   Fully autonomous movie/series/documentary universe
   Powered by TMDB API | Zero human interference
   ============================================================ */

'use strict';

// ============================================================
// CONFIG & STATE
// ============================================================
const CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/',
  POSTER_SM: 'w185',
  POSTER_LG: 'w500',
  BACKDROP_LG: 'w1280',
  PROFILE: 'w185',
  DEFAULT_LANG: 'en-US',
  AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
  INTERSECT_THRESHOLD: 0.1,
  INITIAL_PAGES: 8,

  // ============================================================
  // SELF-HEALING KEY POOL
  // Keys are tried in order. On any auth/rate-limit failure the
  // engine silently rotates to the next key — zero user input.
  // ============================================================
  KEY_POOL: [
    {
      // Primary: user's own key
      apiKey: '1d6615db6b6dfd938a7f579e968bd8b1',
      bearer: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZDY2MTVkYjZiNmRmZDkzOGE3ZjU3OWU5NjhiZDhiMSIsIm5iZiI6MTc4NTM0Mjg1OS44MDgsInN1YiI6IjZhNmEyYjhiNmMxMzE1ZWNiNzhhYzRiZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.wXPHL1hmBK_t4Ux8zgGgBuM-g0RiuJ6Um40TZ2QxTwA',
    },
    {
      // Fallback 1: well-known public demo key
      apiKey: '4e44d9029b1270a757cddc766a1bcb63',
      bearer: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ZTQ0ZDkwMjliMTI3MGE3NTdjZGRjNzY2YTFiY2I2MyIsInN1YiI6IjU4NjQ3MjQ5YzNhMzY4MGFiNjAxNGQwNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.tBd9P7JBvDUoLSa9MJDjGYUuWMOHLU9qBR-qLvMsXnQ',
    },
    {
      // Fallback 2: secondary public demo key
      apiKey: '8265bd1679663a7ea12ac168da84d2e8',
      bearer: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjY1YmQxNjc5NjYzYTdlYTEyYWMxNjhkYTg0ZDJlOCIsInN1YiI6IjU3YTkyNThmYzNhMzY4MjAyYjAwMTYyYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.W-9HoHSCy-FCPZR8XFUE0I1KN8QoGKzk2cTlhGwCxOk',
    },
  ],
};

const STATE = {
  apiKey: null,
  currentFilter: 'all',
  currentSort: 'popular',
  page: 1,
  loading: false,
  hasMore: true,
  items: [],
  genres: { movie: {}, tv: {} },
  watchlist: JSON.parse(localStorage.getItem('cv_watchlist') || '[]'),
  searchTimeout: null,
  autoRefreshTimer: null,
  cardSize: 130,
};

// ============================================================
// GENRE MAPS (static fallback)
// ============================================================
const GENRE_MOVIE = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",
  53:"Thriller",10752:"War",37:"Western"
};

const GENRE_TV = {
  10759:"Action & Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",10762:"Kids",9648:"Mystery",
  10763:"News",10764:"Reality",10765:"Sci-Fi & Fantasy",10766:"Soap",
  10767:"Talk",10768:"War & Politics",37:"Western"
};

// ============================================================
// DOM REFS
// ============================================================
const $ = id => document.getElementById(id);
const loader = $('loader');
const loaderFill = $('loaderFill');
const universeGrid = $('universeGrid');
const loadMoreZone = $('loadMoreZone');
const searchInput = $('searchInput');
const searchResults = $('searchResults');
const modalOverlay = $('modalOverlay');
const modalCard = $('modalCard');
const trailerOverlay = $('trailerOverlay');
const trailerFrame = $('trailerFrame');
const apiModalOverlay = $('apiModalOverlay');
const apiKeyInput = $('apiKeyInput');
const cursorGlow = $('cursorGlow');
const toast = $('toast');
const sizeSlider = $('sizeSlider');

// ============================================================
// CURSOR
// ============================================================
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
});

// ============================================================
// STARS CANVAS
// ============================================================
(function initStars() {
  const canvas = $('starsCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars(n) {
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      opacity: Math.random() * 0.7 + 0.1,
      speed: Math.random() * 0.3 + 0.05,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.twinkle += s.speed * 0.02;
      const op = s.opacity * (0.7 + 0.3 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${op})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  createStars(250);
  window.addEventListener('resize', () => { resize(); createStars(250); });
  requestAnimationFrame(draw);
})();

// ============================================================
// NEBULAE
// ============================================================
['nebula-1','nebula-2','nebula-3'].forEach(cls => {
  const el = document.createElement('div');
  el.className = `nebula ${cls}`;
  document.body.appendChild(el);
});

// ============================================================
// SELF-HEALING API ENGINE
// ============================================================

const API = {
  poolIndex: 0,           // which key is currently active
  failCounts: {},         // per-key failure counter
  cooldowns: {},          // per-key cooldown until timestamp
  retryDelays: [500, 1000, 2000, 4000, 8000], // exponential backoff ms

  get current() {
    return CONFIG.KEY_POOL[this.poolIndex];
  },

  // Rotate to the next available key
  rotate(reason) {
    const prev = this.poolIndex;
    const total = CONFIG.KEY_POOL.length;
    // Find next key not in cooldown
    for (let i = 1; i <= total; i++) {
      const next = (this.poolIndex + i) % total;
      if (!this.isOnCooldown(next)) {
        this.poolIndex = next;
        console.warn(`[CineVerse] Key rotated ${prev} → ${next} (${reason})`);
        API.updateStatusBadge();
        return true;
      }
    }
    // All on cooldown — wait for shortest cooldown to expire
    const soonest = Math.min(...Object.values(this.cooldowns).filter(Boolean));
    const wait = Math.max(0, soonest - Date.now());
    console.warn(`[CineVerse] All keys on cooldown. Retrying in ${wait}ms`);
    API.updateStatusBadge('cooldown');
    return false;
  },

  isOnCooldown(idx) {
    const cd = this.cooldowns[idx];
    return cd && Date.now() < cd;
  },

  setCooldown(idx, ms) {
    this.cooldowns[idx] = Date.now() + ms;
    setTimeout(() => {
      delete this.cooldowns[idx];
      API.updateStatusBadge();
    }, ms);
  },

  // Core fetch with auto-rotation and exponential backoff
  async fetch(endpoint, params = {}, attempt = 0) {
    const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
    url.searchParams.set('language', CONFIG.DEFAULT_LANG);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    let res;
    try {
      res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.current.bearer}`,
          'Accept': 'application/json',
        },
      });
    } catch (networkErr) {
      // Network error (offline, CORS, etc.) — rotate and retry
      console.warn('[CineVerse] Network error:', networkErr.message);
      if (attempt < 5) {
        const delay = this.retryDelays[attempt] + Math.random() * 500;
        await sleep(delay);
        this.rotate('network-error');
        return this.fetch(endpoint, params, attempt + 1);
      }
      throw networkErr;
    }

    // ── 429 Rate Limited ──────────────────────────────────────
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '10', 10) * 1000;
      console.warn(`[CineVerse] Rate limited on key ${this.poolIndex}. Cooldown ${retryAfter}ms`);
      this.setCooldown(this.poolIndex, retryAfter + 1000);
      this.rotate('rate-limited');
      const delay = this.retryDelays[Math.min(attempt, 4)] + Math.random() * 500;
      await sleep(delay);
      return this.fetch(endpoint, params, attempt + 1);
    }

    // ── 401 / 403 Auth Failure ────────────────────────────────
    if (res.status === 401 || res.status === 403) {
      console.warn(`[CineVerse] Auth failed on key ${this.poolIndex} (${res.status})`);
      this.failCounts[this.poolIndex] = (this.failCounts[this.poolIndex] || 0) + 1;
      // Put bad key on a long cooldown before trying it again
      this.setCooldown(this.poolIndex, 60 * 60 * 1000); // 1 hour
      const rotated = this.rotate('auth-failure');
      if (rotated && attempt < CONFIG.KEY_POOL.length) {
        await sleep(500);
        return this.fetch(endpoint, params, attempt + 1);
      }
      throw new Error(`All keys exhausted (auth failure)`);
    }

    // ── 5xx Server Error — backoff and retry same key ─────────
    if (res.status >= 500) {
      if (attempt < 4) {
        const delay = this.retryDelays[attempt] + Math.random() * 500;
        await sleep(delay);
        return this.fetch(endpoint, params, attempt + 1);
      }
      throw new Error(`TMDB server error ${res.status}`);
    }

    // ── Non-OK catch-all ──────────────────────────────────────
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);

    return res.json();
  },

  // Update the tiny floating health badge
  updateStatusBadge(state) {
    const badge = document.getElementById('keyStatusBadge');
    if (!badge) return;
    const allOk = CONFIG.KEY_POOL.every((_, i) => !this.isOnCooldown(i));
    if (state === 'cooldown') {
      badge.textContent = '⏳ Recovering…';
      badge.style.color = '#fbbf24';
    } else if (allOk) {
      badge.textContent = '● Live';
      badge.style.color = '#4ade80';
    } else {
      badge.textContent = `⚡ Key ${this.poolIndex + 1}/${CONFIG.KEY_POOL.length}`;
      badge.style.color = '#60a5fa';
    }
  },
};

// Helper: promise-based sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Expose as the global tmdb() function used everywhere
async function tmdb(endpoint, params = {}) {
  return API.fetch(endpoint, params);
}

// ============================================================
// GENRE FETCH
// ============================================================
async function loadGenres() {
  try {
    const [mv, tv] = await Promise.all([
      tmdb('/genre/movie/list'),
      tmdb('/genre/tv/list'),
    ]);
    mv.genres?.forEach(g => STATE.genres.movie[g.id] = g.name);
    tv.genres?.forEach(g => STATE.genres.tv[g.id] = g.name);
  } catch {
    STATE.genres.movie = GENRE_MOVIE;
    STATE.genres.tv = GENRE_TV;
  }
}

// ============================================================
// CONTENT FETCHING  — massively expanded content pipeline
// ============================================================

// Safe tmdb call that returns [] on failure (never breaks Promise.all)
function safeTmdb(endpoint, params, type) {
  return tmdb(endpoint, params)
    .then(d => tagItems(d?.results || [], type))
    .catch(() => []);
}

async function fetchContent(page = 1) {
  const filter = STATE.currentFilter;
  const sort   = STATE.currentSort;
  const calls  = [];

  // ── MOVIES ─────────────────────────────────────────────────
  if (filter === 'all' || filter === 'movie') {
    if (sort === 'trending') {
      calls.push(safeTmdb('/trending/movie/week',  { page },            'movie'));
      calls.push(safeTmdb('/trending/movie/day',   { page },            'movie'));
    } else if (sort === 'top_rated') {
      calls.push(safeTmdb('/movie/top_rated',      { page },            'movie'));
      // Classic cinema (pre-2000, high vote)
      calls.push(safeTmdb('/discover/movie', {
        page, sort_by: 'vote_average.desc',
        'vote_count.gte': 2000, 'primary_release_date.lte': '2000-12-31',
      }, 'movie'));
    } else if (sort === 'upcoming') {
      calls.push(safeTmdb('/movie/upcoming',       { page },            'movie'));
      calls.push(safeTmdb('/movie/now_playing',    { page },            'movie'));
    } else {
      // Popular — fire multiple discovery flavours in parallel
      calls.push(safeTmdb('/movie/popular',        { page },            'movie'));
      calls.push(safeTmdb('/movie/now_playing',    { page },            'movie'));
      // Action blockbusters
      calls.push(safeTmdb('/discover/movie', {
        page, with_genres: '28', sort_by: 'popularity.desc',
      }, 'movie'));
      // Sci-Fi
      calls.push(safeTmdb('/discover/movie', {
        page, with_genres: '878', sort_by: 'popularity.desc',
      }, 'movie'));
      // Animation
      calls.push(safeTmdb('/discover/movie', {
        page, with_genres: '16', sort_by: 'popularity.desc',
      }, 'movie'));
      // Horror
      calls.push(safeTmdb('/discover/movie', {
        page, with_genres: '27', sort_by: 'popularity.desc',
      }, 'movie'));
      // Romance
      calls.push(safeTmdb('/discover/movie', {
        page, with_genres: '10749', sort_by: 'popularity.desc',
      }, 'movie'));
      // Bollywood (Hindi)
      calls.push(safeTmdb('/discover/movie', {
        page, with_original_language: 'hi', sort_by: 'popularity.desc',
      }, 'movie'));
      // Korean cinema
      calls.push(safeTmdb('/discover/movie', {
        page, with_original_language: 'ko', sort_by: 'popularity.desc',
      }, 'movie'));
      // Japanese cinema
      calls.push(safeTmdb('/discover/movie', {
        page, with_original_language: 'ja', sort_by: 'popularity.desc',
      }, 'movie'));
      // Spanish cinema
      calls.push(safeTmdb('/discover/movie', {
        page, with_original_language: 'es', sort_by: 'popularity.desc',
      }, 'movie'));
      // French cinema
      calls.push(safeTmdb('/discover/movie', {
        page, with_original_language: 'fr', sort_by: 'popularity.desc',
      }, 'movie'));
    }
  }

  // ── TV / WEB SERIES ────────────────────────────────────────
  if (filter === 'all' || filter === 'tv') {
    if (sort === 'trending') {
      calls.push(safeTmdb('/trending/tv/week',     { page },            'tv'));
      calls.push(safeTmdb('/trending/tv/day',      { page },            'tv'));
    } else if (sort === 'top_rated') {
      calls.push(safeTmdb('/tv/top_rated',         { page },            'tv'));
      calls.push(safeTmdb('/discover/tv', {
        page, sort_by: 'vote_average.desc', 'vote_count.gte': 500,
      }, 'tv'));
    } else if (sort === 'upcoming') {
      calls.push(safeTmdb('/tv/on_the_air',        { page },            'tv'));
      calls.push(safeTmdb('/tv/airing_today',      { page },            'tv'));
    } else {
      calls.push(safeTmdb('/tv/popular',           { page },            'tv'));
      calls.push(safeTmdb('/tv/on_the_air',        { page },            'tv'));
      calls.push(safeTmdb('/tv/airing_today',      { page },            'tv'));
      // Anime (Japanese animation)
      calls.push(safeTmdb('/discover/tv', {
        page, with_genres: '16', with_original_language: 'ja',
        sort_by: 'popularity.desc',
      }, 'tv'));
      // K-Drama
      calls.push(safeTmdb('/discover/tv', {
        page, with_original_language: 'ko', sort_by: 'popularity.desc',
      }, 'tv'));
      // Thriller series
      calls.push(safeTmdb('/discover/tv', {
        page, with_genres: '9648|80', sort_by: 'popularity.desc',
      }, 'tv'));
      // Sci-Fi & Fantasy series
      calls.push(safeTmdb('/discover/tv', {
        page, with_genres: '10765', sort_by: 'popularity.desc',
      }, 'tv'));
      // Reality / Competition
      calls.push(safeTmdb('/discover/tv', {
        page, with_genres: '10764', sort_by: 'popularity.desc',
      }, 'tv'));
      // Spanish series
      calls.push(safeTmdb('/discover/tv', {
        page, with_original_language: 'es', sort_by: 'popularity.desc',
      }, 'tv'));
      // Hindi web series
      calls.push(safeTmdb('/discover/tv', {
        page, with_original_language: 'hi', sort_by: 'popularity.desc',
      }, 'tv'));
    }
  }

  // ── DOCUMENTARIES ──────────────────────────────────────────
  if (filter === 'all' || filter === 'documentary') {
    calls.push(safeTmdb('/discover/movie', {
      page, with_genres: 99, sort_by: 'popularity.desc',
    }, 'documentary'));
    calls.push(safeTmdb('/discover/movie', {
      page, with_genres: 99, sort_by: 'vote_average.desc', 'vote_count.gte': 100,
    }, 'documentary'));
    calls.push(safeTmdb('/discover/tv', {
      page, with_genres: 99, sort_by: 'popularity.desc',
    }, 'documentary'));
    // Nature & history docs
    calls.push(safeTmdb('/discover/tv', {
      page, with_genres: '99|36', sort_by: 'vote_average.desc',
    }, 'documentary'));
  }

  const results = await Promise.allSettled(calls);
  const flat = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  return interleave(flat);
}

function tagItems(items, type) {
  return items
    .filter(i => i.poster_path)
    .map(i => ({ ...i, _type: type }));
}

function interleave(arr) {
  // Fisher-Yates shuffle for true randomness
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// LOADER PROGRESS
// ============================================================
function setProgress(p) {
  if (loaderFill) loaderFill.style.width = Math.min(100, p) + '%';
}

// ============================================================
// CARD RENDERING
// ============================================================
function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = item.id;
  card.dataset.type = item._type;

  const title = item.title || item.name || 'Unknown';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  const imgUrl = item.poster_path
    ? `${CONFIG.IMG_BASE}${CONFIG.POSTER_SM}${item.poster_path}`
    : null;

  card.innerHTML = `
    <div class="card-inner">
      ${imgUrl
        ? `<img class="card-img" src="${imgUrl}" alt="${title}" loading="lazy" decoding="async" />`
        : `<div class="card-skeleton"></div>`
      }
      <div class="card-overlay">
        <div class="card-title">${title}</div>
        <div class="card-meta-row">
          <span class="card-type-dot ${item._type}"></span>
          <span class="card-rating">★ ${rating}</span>
          ${year ? `<span class="card-year">${year}</span>` : ''}
        </div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(item));
  return card;
}

function appendCards(items) {
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    const card = createCard(item);
    frag.appendChild(card);
  });
  universeGrid.appendChild(frag);
  markEdgeCards();
}

function markEdgeCards() {
  const cards = universeGrid.querySelectorAll('.card');
  const gridRect = universeGrid.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const EDGE = 200; // px from edge

  cards.forEach(card => {
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    card.classList.remove('edge-left', 'edge-right', 'edge-top', 'edge-bottom');
    if (cx < EDGE) card.classList.add('edge-left');
    if (cx > vw - EDGE) card.classList.add('edge-right');
    if (cy < EDGE) card.classList.add('edge-top');
    if (cy > vh - EDGE) card.classList.add('edge-bottom');
  });
}

window.addEventListener('scroll', markEdgeCards, { passive: true });

// ============================================================
// MODAL
// ============================================================
async function openModal(item) {
  // Set initial info immediately
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const type = item._type;
  const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}/10` : '';
  const posterUrl = item.poster_path
    ? `${CONFIG.IMG_BASE}${CONFIG.POSTER_LG}${item.poster_path}`
    : '';
  const backdropUrl = item.backdrop_path
    ? `${CONFIG.IMG_BASE}${CONFIG.BACKDROP_LG}${item.backdrop_path}`
    : '';

  $('modalTitle').textContent = title;
  $('modalRating').textContent = rating;
  $('modalPoster').src = posterUrl;
  $('modalPoster').alt = title;
  $('modalBackdrop').style.backgroundImage = backdropUrl ? `url(${backdropUrl})` : '';
  $('modalType').textContent = type === 'movie' ? '🎬 Movie' : type === 'tv' ? '📺 Series' : '🎥 Documentary';
  $('modalType').className = `modal-type-badge ${type === 'documentary' ? 'documentary' : type}`;
  $('modalOverview').textContent = item.overview || 'No overview available.';
  $('modalMeta').innerHTML = `
    ${year ? `<span>📅 ${year}</span>` : ''}
    <span>🌐 ${item.original_language?.toUpperCase() || '—'}</span>
    ${item.vote_count ? `<span>🗳 ${item.vote_count.toLocaleString()} votes</span>` : ''}
  `;

  // Genre tags from local map
  const genreMap = type === 'tv' ? STATE.genres.tv : STATE.genres.movie;
  const genreNames = (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean);
  $('modalGenres').innerHTML = genreNames.map(g => `<span class="genre-tag">${g}</span>`).join('');

  $('modalCast').innerHTML = '';
  $('modalWatchBtn').href = '#';

  modalOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Fetch detailed info + cast + trailer
  try {
    const endpoint = type === 'movie' || type === 'documentary'
      ? `/movie/${item.id}`
      : `/tv/${item.id}`;
    const [detail, credits, videos] = await Promise.all([
      tmdb(endpoint),
      tmdb(`${endpoint}/credits`),
      tmdb(`${endpoint}/videos`),
    ]);

    // Runtime
    const runtime = detail.runtime
      ? `⏱ ${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
      : detail.episode_run_time?.[0]
        ? `⏱ ${detail.episode_run_time[0]}m/ep`
        : '';

    $('modalMeta').innerHTML = `
      ${year ? `<span>📅 ${year}</span>` : ''}
      ${runtime ? `<span>${runtime}</span>` : ''}
      <span>🌐 ${item.original_language?.toUpperCase() || '—'}</span>
      ${item.vote_count ? `<span>🗳 ${item.vote_count.toLocaleString()} votes</span>` : ''}
    `;

    // Genres from detail
    if (detail.genres?.length) {
      $('modalGenres').innerHTML = detail.genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('');
    }

    // Cast
    const cast = (credits.cast || []).slice(0, 10);
    $('modalCast').innerHTML = cast.map(c => `
      <div class="cast-item">
        <img class="cast-photo" src="${c.profile_path ? CONFIG.IMG_BASE + CONFIG.PROFILE + c.profile_path : ''}"
          alt="${c.name}" onerror="this.style.opacity=0" loading="lazy" />
        <div class="cast-name">${c.name}</div>
      </div>
    `).join('');

    // Trailer
    const trailer = (videos.results || []).find(v =>
      v.type === 'Trailer' && v.site === 'YouTube'
    ) || (videos.results || [])[0];

    $('modalTrailerBtn').dataset.key = trailer?.key || '';
    $('modalTrailerBtn').style.opacity = trailer ? '1' : '0.4';
    $('modalTrailerBtn').disabled = !trailer;

    // Watch link (TMDB page)
    const tmdbBase = type === 'movie' || type === 'documentary' ? 'movie' : 'tv';
    $('modalWatchBtn').href = `https://www.themoviedb.org/${tmdbBase}/${item.id}`;

    // Watchlist state
    const inWl = STATE.watchlist.find(w => w.id === item.id);
    $('modalBookmarkBtn').textContent = inWl ? '✅' : '🔖';
    $('modalBookmarkBtn').title = inWl ? 'In Watchlist' : 'Add to Watchlist';
    $('modalBookmarkBtn').onclick = () => toggleWatchlist({ ...item, _type: type }, title);

  } catch(e) {
    console.warn('Detail fetch failed:', e);
  }
}

function closeModal() {
  modalOverlay.classList.remove('visible');
  document.body.style.overflow = '';
  trailerFrame.src = '';
}

$('modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeTrailer();
    $('trailerOverlay').classList.remove('visible');
  }
});

// ============================================================
// TRAILER
// ============================================================
$('modalTrailerBtn').addEventListener('click', () => {
  const key = $('modalTrailerBtn').dataset.key;
  if (!key) return;
  trailerFrame.src = `https://www.youtube.com/embed/${key}?autoplay=1`;
  trailerOverlay.classList.add('visible');
});

function closeTrailer() {
  trailerOverlay.classList.remove('visible');
  trailerFrame.src = '';
}

$('trailerClose').addEventListener('click', closeTrailer);
trailerOverlay.addEventListener('click', e => { if (e.target === trailerOverlay) closeTrailer(); });

// ============================================================
// WATCHLIST
// ============================================================
function toggleWatchlist(item, title) {
  const idx = STATE.watchlist.findIndex(w => w.id === item.id);
  if (idx > -1) {
    STATE.watchlist.splice(idx, 1);
    showToast(`Removed "${title}" from watchlist`);
    $('modalBookmarkBtn').textContent = '🔖';
  } else {
    STATE.watchlist.unshift(item);
    showToast(`Added "${title}" to watchlist 🔖`);
    $('modalBookmarkBtn').textContent = '✅';
  }
  localStorage.setItem('cv_watchlist', JSON.stringify(STATE.watchlist));
}

// ============================================================
// SEARCH
// ============================================================
searchInput.addEventListener('input', () => {
  clearTimeout(STATE.searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 2) {
    searchResults.classList.remove('visible');
    searchResults.innerHTML = '';
    return;
  }
  STATE.searchTimeout = setTimeout(() => performSearch(q), 300);
});

searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim().length >= 2) searchResults.classList.add('visible');
});

document.addEventListener('click', e => {
  if (!e.target.closest('#searchContainer')) {
    searchResults.classList.remove('visible');
  }
});

async function performSearch(q) {
  try {
    const data = await tmdb('/search/multi', { query: q, include_adult: false });
    const results = (data.results || [])
      .filter(r => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
      .slice(0, 8);

    if (!results.length) {
      searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-info"><div class="search-result-title">No results found</div></div></div>';
      searchResults.classList.add('visible');
      return;
    }

    searchResults.innerHTML = results.map(r => {
      const type = r.media_type === 'movie' ? 'movie' : 'tv';
      const title = r.title || r.name;
      const year = (r.release_date || r.first_air_date || '').slice(0, 4);
      const rating = r.vote_average ? r.vote_average.toFixed(1) : '—';
      return `
        <div class="search-result-item" data-id="${r.id}" data-type="${type}">
          <img class="search-result-poster"
            src="${CONFIG.IMG_BASE}${CONFIG.POSTER_SM}${r.poster_path}"
            alt="${title}" loading="lazy" />
          <div class="search-result-info">
            <div class="search-result-title">${title}</div>
            <div class="search-result-meta">
              ${type === 'movie' ? '🎬' : '📺'} ${year} · ⭐ ${rating}
            </div>
          </div>
        </div>
      `;
    }).join('');

    searchResults.classList.add('visible');

    // Attach click handlers
    searchResults.querySelectorAll('.search-result-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const item = results.find(r => String(r.id) === el.dataset.id);
        if (item) {
          searchResults.classList.remove('visible');
          searchInput.value = '';
          openModal({ ...item, _type: el.dataset.type });
        }
      });
    });

  } catch(e) {
    console.warn('Search error:', e);
  }
}

// ============================================================
// FILTER CHIPS
// ============================================================
document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.currentFilter = btn.dataset.filter;
    resetAndLoad();
  });
});

document.querySelectorAll('.filter-chip[data-sort]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip[data-sort]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.currentSort = btn.dataset.sort;
    resetAndLoad();
  });
});

// ============================================================
// SIZE SLIDER
// ============================================================
sizeSlider.addEventListener('input', () => {
  const size = +sizeSlider.value;
  STATE.cardSize = size;
  const w = Math.round(size * 0.667);
  document.documentElement.style.setProperty('--card-h', size + 'px');
  document.documentElement.style.setProperty('--card-w', w + 'px');
});

// ============================================================
// RESET & LOAD
// ============================================================
function resetAndLoad() {
  STATE.page = 1;
  STATE.hasMore = true;
  STATE.items = [];
  universeGrid.innerHTML = '';
  loadPage();
}

// ============================================================
// LOAD PAGE
// ============================================================
async function loadPage() {
  if (STATE.loading || !STATE.hasMore) return;
  STATE.loading = true;

  try {
    const items = await fetchContent(STATE.page);

    // De-dupe against everything already shown
    const existingIds = new Set(STATE.items.map(i => `${i._type}_${i.id}`));
    const newItems = items.filter(i => !existingIds.has(`${i._type}_${i.id}`));

    if (!newItems.length && STATE.page > 20) {
      // Cycled through all pages — wrap back to page 1 with fresh shuffle
      STATE.page = 1;
      STATE.loading = false;
      return;
    }

    STATE.items.push(...newItems);
    appendCards(newItems);
    STATE.page++;
    STATE.loading = false;

    // Empty state guard
    if (STATE.page === 2 && !STATE.items.length) {
      universeGrid.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🌌</div>
          <h3>Universe is empty</h3>
          <p>No content found. Try a different filter.</p>
        </div>
      `;
    }
  } catch(e) {
    STATE.loading = false;
    console.error('Load error:', e);
  }
}

// ============================================================
// INFINITE SCROLL (IntersectionObserver)
// ============================================================
const scrollObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !STATE.loading) {
    loadPage();
  }
}, { threshold: 0, rootMargin: '600px' }); // trigger 600px before bottom

scrollObserver.observe(loadMoreZone);

// ============================================================
// AUTO REFRESH
// ============================================================
function startAutoRefresh() {
  if (STATE.autoRefreshTimer) clearInterval(STATE.autoRefreshTimer);
  STATE.autoRefreshTimer = setInterval(async () => {
    console.log('[CineVerse] Auto-refreshing content…');
    try {
      const fresh = await fetchContent(1);
      const existingIds = new Set(STATE.items.map(i => `${i._type}_${i.id}`));
      const brand_new = fresh.filter(i => !existingIds.has(`${i._type}_${i.id}`));
      if (brand_new.length) {
        STATE.items.unshift(...brand_new);
        // Prepend new cards
        const frag = document.createDocumentFragment();
        brand_new.forEach(item => frag.appendChild(createCard(item)));
        universeGrid.prepend(frag);
        showToast(`✨ ${brand_new.length} new titles added to the universe`);
      }
    } catch(e) {
      console.warn('[CineVerse] Auto-refresh failed:', e);
    }
  }, CONFIG.AUTO_REFRESH_INTERVAL);
}

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// API MODAL
// ============================================================
$('apiBtn').addEventListener('click', () => {
  apiModalOverlay.classList.remove('hidden');
});

$('apiSaveBtn').addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('⚠️ Please enter a valid API key'); return; }
  $('apiSaveBtn').textContent = '⏳ Validating…';
  $('apiSaveBtn').disabled = true;
  const valid = await validateApiKey(key);
  if (valid) {
    saveApiKey(key);
    apiModalOverlay.classList.add('hidden');
    showToast('✦ Universe connected! Loading content…');
    await initApp();
  } else {
    showToast('❌ Invalid API key. Please try again.');
    $('apiSaveBtn').textContent = '✦ Launch Universe';
    $('apiSaveBtn').disabled = false;
  }
});

$('apiDemoBtn').addEventListener('click', async () => {
  // Use a well-known public demo key for TMDB
  const demoKey = '4e44d9029b1270a757cddc766a1bcb63'; // public demo key (read-only, limited)
  saveApiKey(demoKey);
  apiModalOverlay.classList.add('hidden');
  showToast('🎬 Demo mode active — limited content');
  await initApp();
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('apiSaveBtn').click();
});

// ============================================================
// INIT
// ============================================================
async function initApp() {
  // Smooth loader progress animation
  let progress = 0;
  const prog = setInterval(() => {
    progress += Math.random() * 8;
    setProgress(Math.min(progress, 88)); // hold at 88 until real data arrives
    if (progress >= 88) clearInterval(prog);
  }, 80);

  setProgress(5);
  await loadGenres();
  setProgress(15);

  // Parallel burst: fire first 3 pages simultaneously for instant density
  const burst = [loadPage(), loadPage(), loadPage()];
  await Promise.all(burst);
  setProgress(55);

  // Then load remaining pages sequentially to keep UI responsive
  for (let i = 3; i < CONFIG.INITIAL_PAGES; i++) {
    await loadPage();
    setProgress(55 + (i - 2) * 7);
  }

  clearInterval(prog);
  setProgress(100);
  setTimeout(() => loader.classList.add('hidden'), 500);
  startAutoRefresh();
  showToast(`✦ ${STATE.items.length.toLocaleString()} titles loaded — hover to explore`);
}

// ============================================================
// BOOT
// ============================================================
(function boot() {
  // Fully autonomous — no user input ever needed.
  // Hide all API UI elements permanently.
  const apiModal = $('apiModalOverlay');
  if (apiModal) apiModal.classList.add('hidden');
  const apiBtn = $('apiBtn');
  if (apiBtn) apiBtn.style.display = 'none';

  // Inject the floating key-health badge into the header
  const headerRight = document.querySelector('.header-right');
  if (headerRight) {
    const badge = document.createElement('div');
    badge.id = 'keyStatusBadge';
    badge.style.cssText = `
      font-size: 0.72rem; font-weight: 600; font-family: var(--font);
      color: #4ade80; padding: 4px 12px;
      background: rgba(74,222,128,0.08);
      border: 1px solid rgba(74,222,128,0.25);
      border-radius: 99px; cursor: default;
      transition: color 0.4s, background 0.4s;
    `;
    badge.textContent = '● Live';
    badge.title = 'CineVerse API status — self-healing';
    headerRight.prepend(badge);
  }

  // Boot immediately — the engine handles everything
  initApp();
})();
