'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let btnRemove = document.querySelectorAll('.workout__btn-remove');
let btnEdit = document.querySelectorAll('.workout__btn-edit');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, dist, dur) {
    this.coords = coords;
    this.distance = dist;
    this.duration = dur;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, dist, dur, cad) {
    super(coords, dist, dur);
    this.cadence = cad;
    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, dist, dur, elevG) {
    super(coords, dist, dur);
    this.elevationGain = elevG;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.duration / 60;
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #label = '';

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveScreen.bind(this));
  }

  _selectAndBindButtons() {
    btnRemove = document.querySelectorAll('.workout__btn-remove');
    btnEdit = document.querySelectorAll('.workout__btn-edit');
    btnRemove.forEach(btn => {
      btn.addEventListener('click', this._removeWorkout.bind(this));
    });
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
      alert('NAN')
    );
  }

  _loadMap(pos) {
    const { latitude } = pos.coords;
    const { longitude } = pos.coords;
    const coord = [latitude, longitude];
    this.#map = L.map('map').setView(coord, 13);
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(wo => {
      this._renderWorkoutList(wo);
      this._renderWorkoutMarker(wo);
    });
    this._selectAndBindButtons();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validCheck = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validCheck(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('invalid input');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validCheck(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('invalid input');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);

    this._renderWorkoutList(workout);
    this._renderWorkoutMarker(workout);

    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    this._hideForm();

    this._setLocalStorage();

    this._selectAndBindButtons();
  }

  _renderWorkoutMarker(workout) {
    const coordClick = workout.coords;
    L.marker(coordClick)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 250,
          closeOnClick: false,
          autoClose: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${this.#label}`)
      .openPopup();
  }

  _renderWorkoutList(workout) {
    this.#label = `${
      workout.type[0].toUpperCase() + workout.type.slice(1)
    } on ${workout.date.getDate()} ${months[workout.date.getMonth()]}`;
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${this.#label}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>

      `;
    }
    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  `;
    }
    html += `
      <div class="workout__btn-container">
        <button class="workout__btn workout__btn-edit"><i style="color: #e4b10a;" class="ph-pen"></i></button>
        <button class="workout__btn workout__btn-remove"><i style="color: #c01111;" class="ph-trash"></i></button>
      </div>
    </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveScreen(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 0.5 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    data.forEach(dta => (dta.date = new Date(dta.date)));

    if (!data) return;

    this.#workouts = data;
  }

  _removeWorkout(e) {
    e.stopPropagation();

    //identifying html element and workout list
    const workoutList = e.path[1].closest('.workout');
    const id = workoutList.dataset.id;
    const index = this.#workouts.indexOf(
      this.#workouts.find(wo => wo.id === id)
    );
    if (index === -1) return;

    //remove from sidebar
    workoutList.style.marginBottom = `0`;
    workoutList.style.marginTop = `-1.75rem`;
    workoutList.style.opacity = '0';
    workoutList.style.height = '0';
    setTimeout(() => workoutList.parentNode.removeChild(workoutList), 200);

    //   //remove from workout list
    this.#workouts.splice(index, 1);
    this._setLocalStorage(); //update local storage

    //   //remove marker
    let i = 0;
    this.#map.eachLayer(layer => {
      if (i > 0) layer.remove();
      i++;
    });
    this.#workouts.forEach(wo => this._renderWorkoutMarker(wo));
  }
}

const app = new App();
