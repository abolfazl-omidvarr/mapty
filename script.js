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
const formButtRem = document.querySelector('.form__btn-remove');
const sortOption = document.querySelector('.sort__select');
const ascendButt = document.querySelector('.ascend__butt');
const descendButt = document.querySelector('.descend__butt');

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
  #ascend = 1;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener(
      'change',
      this._toggleElevationField.bind(this, inputCadence, inputElevation)
    );

    containerWorkouts.addEventListener('click', this._moveScreen.bind(this));
    sortOption.addEventListener('change', this._sorting.bind(this));

    ascendButt.addEventListener('click', () => {
      this.#ascend = 1;
      this._sorting.bind(this)();
    });

    descendButt.addEventListener('click', () => {
      this.#ascend = -1;
      this._sorting.bind(this)();
    });
    formButtRem.addEventListener('click', e => {
      e.preventDefault();
      this._hideForm(1);
    });
  }
  _formValidation(type, distance, duration, cadence, elevation) {
    const validCheck = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    if (type === 'running') {
      if (
        !validCheck(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return 1;
    }

    if (type === 'cycling') {
      if (
        !validCheck(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return 1;
    }
  }
  _selectAndBindButtons() {
    btnRemove = document.querySelectorAll('.workout__btn-remove');
    btnEdit = document.querySelectorAll('.workout__btn-edit');
    btnRemove.forEach(btn => {
      btn.addEventListener('click', this._removeWorkout.bind(this));
    });
    btnEdit.forEach(btn => {
      btn.addEventListener('click', this._editing.bind(this));
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

  _hideForm(status = 0) {
    if (status === 1) {
      form.classList.add('hidden');
    }
    if (status === 0) {
      form.style.display = 'none';
      form.classList.add('hidden');
      setTimeout(() => (form.style.display = 'grid'), 1000);
    }
  }

  _toggleElevationField(cad, elev) {
    cad.closest('.form__row').classList.toggle('form__row--hidden');
    elev.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    if (!this.#mapEvent) return;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (this._formValidation(type, distance, duration, cadence, ''))
        return alert('Invalid Inputs');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (this._formValidation(type, distance, duration, '', elevation))
        return alert('Invalid Inputs');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);

    this._renderWorkoutList(workout, form);
    this._renderWorkoutMarker(workout);

    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    this._hideForm();

    this._setLocalStorage();

    this._selectAndBindButtons();

    this._sorting();

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
    const createObj = function (dta, Cls) {
      const obj = new Cls(dta.coords, dta.distance, dta.duration);
      if (dta.type === 'running') obj.cadence = dta.cadence;
      if (dta.type === 'cycling') obj.elevationGain = dta.elevationGain;
      obj.id = dta.id;
      return obj;
    };
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (data != null)
      data.forEach(dta => {
        dta.date = new Date(dta.date);
        if (dta.type === 'running')
          this.#workouts.push(createObj(dta, Running));

        if (dta.type === 'cycling')
          this.#workouts.push(createObj(dta, Cycling));
      });
    if (!data) return;
  }

  _removeWorkout(e) {
    e.stopPropagation();
    //identifying html element and workout list
    const workoutList = e.target.closest('.workout');
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
  _sorting() {
    const ascend = this.#ascend;
    if (sortOption.value === 'dur') {
      this.#workouts.sort(function (a, b) {
        return ascend * (a.duration - b.duration);
      });
    }
    if (sortOption.value === 'dist') {
      this.#workouts.sort(function (a, b) {
        return ascend * (a.distance - b.distance);
      });
    }
    if (sortOption.value === 'ns') {
      this.#workouts.sort(function (a, b) {
        return +a.id - +b.id;
      });
    }
    document
      .querySelectorAll('.workout')
      .forEach(wo => wo.parentElement.removeChild(wo));
    this.#workouts.forEach(wo => this._renderWorkoutList(wo));
    this._selectAndBindButtons();
  }

  #lastObj; //editing memory
  _editing(e) {
    //close open forms by clicking on other workout's edit butt
    if (this.#lastObj) {
      const lastForm = Array.from(document.getElementsByClassName('form-edit'));
      if (lastForm.length > 0) {
        lastForm[0].parentNode.removeChild(lastForm[0]);
        this._renderWorkoutList(this.#lastObj);
        this._sorting();
        return;
      }
    }

    //select workout to and edit extract its ID
    const workout = e.target.closest('.workout');
    const workoutId = workout.dataset.id;

    //extract object to edit
    let editObj;
    this.#workouts.forEach(wo => {
      if (wo.id === workoutId) editObj = wo;
    });

    this.#lastObj = editObj;

    // this._renderWorkoutList(editObj)
    const formHtml = `
    <form class="form form-edit">
    <div class="form__row">
      <label class="form__label">Type</label>
      <select class="form__input form-edit__input--type">
        <option value="running">Running</option>
        <option value="cycling">Cycling</option>
      </select>
    </div>
    <div class="form__row">
      <label class="form__label">Distance</label>
      <input class="form__input form-edit__input--distance" placeholder="km" />
    </div>
    <div class="form__row">
      <label class="form__label">Duration</label>
      <input
        class="form__input form-edit__input--duration"
        placeholder="min"
      />
    </div>
    <div class="form__row ${
      editObj.type === 'cycling' ? 'form__row--hidden' : ''
    }">
      <label class="form__label">Cadence</label>
      <input
        class="form__input form-edit__input--cadence"
        placeholder="step/min"
      />
    </div>
    <div class="form__row ${
      editObj.type === 'running' ? 'form__row--hidden' : ''
    }">
      <label class="form__label">Elev Gain</label>
      <input
        class="form__input form-edit__input--elevation"
        placeholder="meters"
      />
    </div>
    <div class="form__btn-container">
      <button class="form__btn form-edit__btn-submit">
        <i style="color: #038303" class="ph-check"></i>
      </button>
      <button class="form__btn form-edit__btn-remove">
        <i style="color: #c01111" class="ph-x"></i>
      </button>
    </div>
  </form>
    `;

    //DOM manipulation and selecting edit-form elements
    workout.insertAdjacentHTML('afterend', formHtml);
    workout.parentNode.removeChild(workout);
    const form = document.querySelector('.form-edit');
    const inputType = document.querySelector('.form-edit__input--type');
    const inputDistance = document.querySelector('.form-edit__input--distance');
    const inputDuration = document.querySelector('.form-edit__input--duration');
    const inputCadence = document.querySelector('.form-edit__input--cadence');
    const inputElevation = document.querySelector(
      '.form-edit__input--elevation'
    );
    // const cancel = document.querySelector('.');

    inputType.value = editObj.type;
    inputDistance.value = editObj.distance;
    inputDuration.value = editObj.duration;
    if (editObj.type === 'running') {
      inputCadence.value = editObj.cadence;
      inputElevation.value = null;
    }
    if (editObj.type === 'cycling') {
      inputCadence.value = null;
      inputElevation.value = editObj.elevationGain;
    }

    //add event listener to submit button and workout option
    inputType.addEventListener(
      'change',
      this._toggleElevationField.bind(this, inputCadence, inputElevation)
    );

    form.addEventListener('submit', e => {
      e.preventDefault();
      //create new object and replace old one by new one
      let obj;
      if (inputType.value === 'running') {
        obj = new Running(
          editObj.coords,
          +inputDistance.value,
          +inputDuration.value,
          +inputCadence.value
        );
      }
      if (inputType.value === 'cycling') {
        obj = new Cycling(
          editObj.coords,
          +inputDistance.value,
          +inputDuration.value,
          +inputElevation.value
        );
      }
      obj.id = editObj.id; //make the identical by id

      //update workouts list
      const index = this.#workouts.indexOf(
        this.#workouts.find(wo => wo.id === editObj.id)
      );

      this.#workouts.splice(index, 1);
      this.#workouts.push(obj);

      //update local storage
      this._setLocalStorage();
      //hide form and show workout list and sort
      e.target.parentNode.removeChild(e.target);
      this._renderWorkoutList(editObj);
      this._sorting();
    });
  }
}

const app = new App();
