let currentPokemon = null;

// Cache to reduce API calls
const cache = {};

// DOM elements
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

// Load saved team when page loads
renderTeam();

// Connect buttons to functions
findBtn.addEventListener("click", findPokemon);
addBtn.addEventListener("click", addToTeam);
clearBtn.addEventListener("click", clearTeam);


// Fetch pokemon from API
async function findPokemon() {

  const query = input.value.trim().toLowerCase();

  if (!query) {
    statusText.textContent = "Enter a Pokemon name or ID.";
    return;
  }

  statusText.textContent = "Loading...";

  let data = cache[query];

  try {

    // Fetch if not cached
    if (!data) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);

      if (!response.ok) {
        statusText.textContent = "Pokemon not found.";
        return;
      }

      data = await response.json();
      cache[query] = data;
    }

    currentPokemon = data;

    // Show image
    const img =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    pokemonImage.src = img;
    pokemonImage.alt = data.name;

    // Load cry audio
    const cry = data.cries?.latest || data.cries?.legacy || "";

    if (cry) {
      pokemonCry.src = cry;
      pokemonCry.load();
    }

    // Load moves into dropdowns
    const moves = data.moves.map(m => m.move.name);

    fillDropdown(move1, moves);
    fillDropdown(move2, moves);
    fillDropdown(move3, moves);
    fillDropdown(move4, moves);

    statusText.textContent = "Pokemon loaded!";

  } catch (error) {
    statusText.textContent = "Error loading Pokemon.";
  }
}


// Fill dropdown menus
function fillDropdown(dropdown, moves) {

  dropdown.innerHTML = "";

  moves.slice(0,50).forEach(move => {

    const option = document.createElement("option");

    option.value = move;
    option.textContent = move;

    dropdown.appendChild(option);

  });

}


// Add pokemon to team
function addToTeam() {

  if (!currentPokemon) {
    statusText.textContent = "Find a Pokemon first.";
    return;
  }

  const team = getTeam();

  if (team.length >= 6) {
    statusText.textContent = "Team is full (max 6).";
    return;
  }

  const moves = [
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
    moves: moves
  };

  team.push(member);

  localStorage.setItem("team", JSON.stringify(team));

  renderTeam();

  statusText.textContent = `${currentPokemon.name} added to team!`;
}


// Display team on page
function renderTeam() {

  const team = getTeam();

  teamDiv.innerHTML = "";

  team.forEach(pokemon => {

    const card = document.createElement("div");
    card.className = "teamCard";

    card.innerHTML = `
      <div class="teamRow">
        <img src="${pokemon.image}" width="90">
        <div>
          <strong>${pokemon.name}</strong>
          <ul>
            <li>${pokemon.moves[0]}</li>
            <li>${pokemon.moves[1]}</li>
            <li>${pokemon.moves[2]}</li>
            <li>${pokemon.moves[3]}</li>
          </ul>
        </div>
      </div>
    `;

    teamDiv.appendChild(card);

  });

}


// Clear team
function clearTeam() {

  localStorage.removeItem("team");

  renderTeam();

  statusText.textContent = "Team cleared.";

}


// Get team from storage
function getTeam() {

  try {
    return JSON.parse(localStorage.getItem("team")) || [];
  }
  catch {
    return [];
  }

}
