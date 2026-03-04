let currentPokemon = null;

// Cache (to reduce API calls)
const cache = {};

// DOM
const input = document.getElementById("pokemonInput");
const findBtn = document.getElementById("findBtn");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");

const statusText = document.getElementById("status");
const pokemonImage = document.getElementById("pokemonImage");
const pokemonCry = document.getElementById("pokemonCry");

const move1 = document.getElementById("move1");
const move2 = document.getElementById("move2");
const move3 = document.getElementById("move3");
const move4 = document.getElementById("move4");

const teamDiv = document.getElementById("team");

// Load existing team on page load
renderTeam();

findBtn.addEventListener("click", findPokemon);
addBtn.addEventListener("click", addToTeam);
clearBtn.addEventListener("click", clearTeam);

async function findPokemon() {
  const query = input.value.trim().toLowerCase();

  if (!query) {
    statusText.textContent = "Please enter a Pokemon name or ID.";
    return;
  }

  statusText.textContent = "Loading...";

  // try local cache first
  let data = cache[query] || getLocalCache(query);

  try {
    // if not cached, fetch from API
    if (!data) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
      if (!response.ok) throw new Error("Pokemon not found.");
      data = await response.json();

      cache[query] = data;
      saveLocalCache(query, data);
    }

    currentPokemon = data;

    // show image
    const img =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    pokemonImage.src = img;
    pokemonImage.alt = data.name;

    // audio (cry)
    const cry = data.cries?.latest || data.cries?.legacy || "";
    if (cry) {
      pokemonCry.src = cry;
      pokemonCry.load();
    } else {
      pokemonCry.removeAttribute("src");
      pokemonCry.load();
    }

    // moves
    const moves = data.moves.map(m => m.move.name);

    fillDropdown(move1, moves);
    fillDropdown(move2, moves);
    fillDropdown(move3, moves);
    fillDropdown(move4, moves);

    statusText.textContent = "Loaded!";
  } catch (err) {
    statusText.textContent = err.message;
  }
}

function fillDropdown(dropdown, moves) {
  dropdown.innerHTML = "";

  // put first ~50 moves so dropdowns aren’t insanely long
  moves.slice(0, 50).forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    dropdown.appendChild(option);
  });
}

function addToTeam() {
  if (!currentPokemon) {
    statusText.textContent = "Find a Pokemon first.";
    return;
  }

  const team = getTeam();

  if (team.length >= 6) {
    statusText.textContent = "Team full (max 6). Clear team to add more.";
    return;
  }

  const selectedMoves = [
    move1.value,
    move2.value,
    move3.value,
    move4.value
  ];

  const img =
    currentPokemon.sprites.other["official-artwork"].front_default ||
    currentPokemon.sprites.front_default;

  const member = {
    name: currentPokemon.name,
    image: img,
    moves: selectedMoves
  };

  team.push(member);
  localStorage.setItem("team", JSON.stringify(team));

  renderTeam();
  statusText.textContent = `${currentPokemon.name} added to team!`;
}

function renderTeam() {
  const team = getTeam();
  teamDiv.innerHTML = "";

  team.forEach(p => {
    const card = document.createElement("div");
    card.className = "teamCard";

    card.innerHTML = `
      <div class="teamRow">
        <img src="${p.image}" width="90" />
        <div>
          <strong>${p.name}</strong>
          <ul>
            <li>${p.moves[0]}</li>
            <li>${p.moves[1]}</li>
            <li>${p.moves[2]}</li>
            <li>${p.moves[3]}</li>
          </ul>
        </div>
      </div>
    `;

    teamDiv.appendChild(card);
  });
}

function clearTeam() {
  localStorage.removeItem("team");
  renderTeam();
  statusText.textContent = "Team cleared.";
}

function getTeam() {
  try {
    return JSON.parse(localStorage.getItem("team")) || [];
  } catch {
    return [];
  }
}

// localStorage caching for API
function saveLocalCache(key, data) {
  localStorage.setItem("pokeCache_" + key, JSON.stringify(data));
}

function getLocalCache(key) {
  try {
    const item = localStorage.getItem("pokeCache_" + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}
