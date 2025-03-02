// The store will hold all information needed globally
let store = {
  track_id: undefined,
  track_name: undefined,
  player_id: undefined,
  player_name: undefined,
  race_id: undefined,
};

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  console.log("Getting form info for dropdowns!");
  try {
    getTracks().then((tracks) => {
      const html = renderTrackCards(tracks);
      renderAt("#tracks", html);
    });

    getRacers().then((racers) => {
      const html = renderRacerCars(racers);
      renderAt("#racers", html);
    });
  } catch (error) {
    console.log("Problem getting tracks and racers ::", error.message);
    console.error(error);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      const { target } = event;

      // Race track form field
      if (target.matches(".card.track")) {
        handleSelectTrack(target);
        store.track_id = target.id;
        store.track_name = target.innerHTML;
      }

      // Racer form field
      if (target.matches(".card.racer")) {
        handleSelectRacer(target);
        store.player_id = target.id;
        store.player_name = target.innerHTML;
      }

      // Submit create race form
      if (target.matches("#submit-create-race")) {
        event.preventDefault();

        // start race
        handleCreateRace();
      }

      // Handle acceleration click
      if (target.matches("#gas-peddle")) {
        handleAccelerate();
      }

      console.log("Store updated :: ", store);
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here");
    console.log(error);
  }
}

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {
  try {

    const player_id = store.player_id;
    const track_id = store.track_id;

    const race = await createRace(player_id, track_id);

    renderAt("#race", renderRaceStartView(race.Track));
    console.log("RACE: ", race);

    store.race_id = race.ID;

    await runCountdown();
    await startRace(store.race_id);
    await runRace(store.race_id);
  } catch (error) {
    console.log("A problem occurred while creating the race: ", error);
  }
}

// This functions handles the game states, showing the leaderboard if the game is in progress, and showing the results page when the game is finished.
function runRace(raceID) {
  return new Promise((resolve) => {
    const raceInterval = setInterval(async() => {
      try {
        const res = await getRace(raceID);
        if (res.status === "finished") {
          clearInterval(raceInterval);
          renderAt("#race", resultsView(res.positions));
          resolve(res);
        }
        else if (res.status === "in-progress") {
          renderAt("#leaderBoard", raceProgress(res.positions));
        }
      }
      catch (error) {
        console.log("A problem occurred while running the race: ", error);
      }
    }, 500)
  })
}

// This functions handles the countdown before the race starts.
async function runCountdown() {
  try {
    // wait for the DOM to load
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      const countDownInterval = setInterval(() => {
        document.getElementById("big-numbers").innerHTML = --timer;
        if (timer === 0) {
          clearInterval(countDownInterval);
          resolve();
          return;
        }
      }, 1000);
    });
  } catch (error) {
    console.log(error);
  }
}

function handleSelectRacer(target) {
  console.log("selected a racer", target.id);

  // remove class selected from all racer options
  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");
}

function handleSelectTrack(target) {
  console.log("selected track", target.id);

  // remove class selected from all track options
  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");
}

// This functions handles the accelerating.
async function handleAccelerate() {
  try {
    const raceInfo = await getRace(store.race_id);

    if (raceInfo.status !== "in-progress") {
      console.log("Cannot accelerate, race is not in progress.");
      return
    }
    console.log("Accelerate button clicked");
    await accelerate(store.race_id);
  }
  catch (error) {
    console.log("Error while accelerating: ", error);
  }

}

// HTML VIEWS

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer
	return `<h4 class="card racer" id="${id}">${driver_name}</h4>`
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join("");

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `<h4 id="${id}" class="card track">${name}</h4>`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track) {
  return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
	let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
	userPlayer.driver_name += " (you)";

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${results.join('')}
			<a href="/race">Start a new race</a>
		</main>
	`
}

function raceProgress(positions) {
  let userPlayer = positions.find((e) => e.id === parseInt(store.player_id));
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<table>
			${results.join("")}
		</table>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

// API CALLS

const SERVER = "http://localhost:3001";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

// GET request to `${SERVER}/api/tracks` for fetching the tracks.

function getTracks() {
  console.log(`calling server :: ${SERVER}/api/tracks`);
  return fetch(`${SERVER}/api/tracks`)
    .then((response) => response.json())
    .catch((error) => console.log("Couldn't get tracks: ", error));
}

// GET request to `${SERVER}/api/cars` for fetching the racers.
function getRacers() {
  return fetch(`${SERVER}/api/cars`)
    .then((response) => response.json())
    .catch((error) => console.log("Couldn't get racers: ", error));
}

// POST request to `${SERVER}/api/races` for creating the race.
function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) => console.log("Problem with createRace request::", err));
}

// GET request to `${SERVER}/api/races/${id}` for getting the race status/info.
function getRace(id) {
  return fetch(`${SERVER}/api/races/${id}`)
    .then((response) => response.json())
    .catch((error) => console.log("Problem getting race info:", error));
}

// POST request to `${SERVER}/api/races/${id}/start` for starting the race.
function startRace(id) {
    return fetch(`${SERVER}/api/races/${id}/start`, {
      method: "POST",
      ...defaultFetchOpts(),
    })
    .then((response) => {
      if (response.ok) {
        return;
      }
    })
    .catch(error => console.log("Problem with getRace request:", error))
}

// POST request to `${SERVER}/api/races/${id}/accelerate` for accelerating the car.
function accelerate(id) {
  return fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  })
  .then(response => response)
  .catch(error => console.log("Problem with accelerate request: ", error));
}