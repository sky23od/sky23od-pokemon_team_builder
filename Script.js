// --- PokeAPI base ---
const API = "https://pokeapi.co/api/v2/pokemon/";

// --- DOM ---
const pokeInput = document.getElementById("pokeInput");
const findBtn = document.getElementById("findBtn");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");

const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const pokeNameEl = document.getElementById("pokeName");
const pokeImgEl = document.getElementById("pokeImg");
const pokeAudioEl = document.getElementById("pokeAudio");

const moveSelects = [
  document.getElementById("move1"),
  document.getElementById("move2"),
  document.getElementById("move3"),
  document.getElementById("move4"),
];

const teamEl = document.getElementById("team");

// --- Caching (memory + localStorage) ---
const memoryCache = new Map();
// TTL: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKeyFor(query) {
  return `pokeapi:pokemon:${String(query).toLowerCase().trim()}`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function normalizeQuery(q) {
  return String(q).trim().toLowerCase();
}

function loadLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.savedAt) return null;

    const age = Date.now() - parsed.savedAt;
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // If storage is full, fail silently (assignment still works)
  }
}

async function getPokemon(query) {
  const q = normalizeQuery(query);
  if (!q) throw new Error("Enter a Pokemon name or ID.");

  // 1) memory cache
  if (memoryCache.has(q)) return memoryCache.get(q);

  // 2) localStorage cache
  const lk = cacheKeyFor(q);
  const local = loadLocalCache(lk);
  if (local) {
    memoryCache.set(q, local);
    return local;
  }

  // 3) network
  const url = API + encodeURIComponent(q);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Pokemon not found. Try a name like 'pikachu' or an ID 1–151.");
    }
  const data = await res.json();

  memoryCache.set(q, data);
  saveLocalCache(lk, data);

  // Also store by official name so future lookups hit cache
  if (data?.name) {
    const nameKey = normalizeQuery(data.name);
    memoryCache.set(nameKey, data);
    saveLocalCache(cacheKeyFor(nameKey), data);
  }

  return data;
}

// --- UI helpers ---
function titleCase(s) {
  return String(s)
    .split("-")
    .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : "")
    .join(" ");
}

function clearSelect(select) {
  while (select.firstChild) select.removeChild(select.firstChild);
}

function fillMovesDropdowns(moves) {
  // moves: array of move name strings
  for (const sel of moveSelects) {
    clearSelect(sel);
    for (const m of moves) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    }
    // default to first item if exists
    if (moves.length > 0) sel.value = moves[0];
  }
}

function pickSprite(data) {
  // Prefer official artwork, fallback to default sprite
  return (
    data?.sprites?.other?.["official-artwork"]?.front_default ||
    data?.sprites?.front_default ||
    ""
  );
}

function pickCry(data) {
  // PokeAPI v2 includes cries in newer data; fallback if missing
  return data?.cries?.latest || data?.cries?.legacy || "";
}

let currentPokemon = null;

// --- Search flow ---
async function handleFind() {
  setStatus("");
  resultEl.classList.add("hidden");
  currentPokemon = null;

  const query = pokeInput.value;

  try {
    setStatus("Loading...");
    const data = await getPokemon(query);

    // Name + image
    const name = titleCase(data.name);
    pokeNameEl.textContent = name;

    const sprite = pickSprite(data);
    pokeImgEl.src = sprite || "";
    pokeImgEl.alt = sprite ? `${name} image` : `${name} (no image available)`;

    // Audio
    const cry = pickCry(data);
    if (cry) {
      pokeAudioEl.src = cry;
      pokeAudioEl.load();
    } else {
      // If no audio, clear it but keep controls visible
      pokeAudioEl.removeAttribute("src");
      pokeAudioEl.load();
    }

    // Moves -> 4 dropdowns
    const moves = (data.moves || [])
      .map(m => m?.move?.name)
      .filter(Boolean);

    if (moves.length === 0) {
      fillMovesDropdowns(["(no moves found)"]);
    } else {
      // Use the full list (assignment says moves loaded into dropdowns)
      fillMovesDropdowns(moves);
    }

    currentPokemon = data;
    resultEl.classList.remove("hidden");
    setStatus("Loaded!");
  } catch (err) {
    setStatus(err.message || "Something went wrong.");
  }
}

// --- Team saving + rendering ---
function loadTeam() {
  try {
    const raw = localStorage.getItem("team");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTeam(team) {
  try {
    localStorage.setItem("team", JSON.stringify(team));
  } catch {
    // ignore
  }
}

function renderTeam() {
  const team = loadTeam();
  teamEl.innerHTML = "";

  if (team.length === 0) {
    teamEl.textContent = "No Pokemon on your team yet.";
    return;
  }

  for (const member of team) {
    const card = document.createElement("div");
    card.className = "team-card";

    const top = document.createElement("div");
    top.className = "team-top";

    const img = document.createElement("img");
    img.src = member.sprite || "";
    img.alt = member.sprite ? `${member.name} image` : member.name;

    const info = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = member.name;

    info.appendChild(h3);

    top.appendChild(img);
    top.appendChild(info);

    const ul = document.createElement("ul");
    for (const mv of member.moves) {
      const li = document.createElement("li");
      li.textContent = mv;
      ul.appendChild(li);
    }

    card.appendChild(top);
    card.appendChild(ul);
    teamEl.appendChild(card);
  }
}

function handleAddToTeam() {
  if (!currentPokemon) {
    setStatus("Find a Pokemon first.");
    return;
  }

  const team = loadTeam();
  if (team.length >= 6) {
    setStatus("Team is full (max 6). Clear team to add more.");
    return;
  }

  const name = titleCase(currentPokemon.name);
  const sprite = pickSprite(currentPokemon);

  const chosenMoves = moveSelects.map(s => s.value).filter(Boolean);

  const member = {
    name,
    sprite,
    moves: chosenMoves
  };

  team.push(member);
  saveTeam(team);
  renderTeam();
  setStatus(`${name} added to team!`);
}

function handleClearTeam() {
  localStorage.removeItem("team");
  renderTeam();
  setStatus("Team cleared.");
}

// --- Events ---
findBtn.addEventListener("click", handleFind);
pokeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleFind();
});
addBtn.addEventListener("click", handleAddToTeam);
clearBtn.addEventListener("click", handleClearTeam);

// --- Init ---
renderTeam();
setStatus("Ready. Enter a Pokemon name or ID.");
