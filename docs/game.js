/** @type {HTMLTemplateElement} */
const tileTemplate = document.getElementById('tile');
/** @type {HTMLElement} */
const field = document.getElementById('field');

// settings
/** @type {HTMLElement} */
const size = document.getElementById('size');
/** @type {HTMLElement} */
const mines = document.getElementById('mines');

// stats
/** @type {HTMLElement} */
const mineCounter = document.getElementById('mineCounter');
/** @type {HTMLElement} */
const timer = document.getElementById('timer');
/** @type {HTMLElement} */
const phase = document.getElementById('status');

/** @type {{ rows: number; cols: number; mines: number }} */
const settings = {
  rows: 3,
  cols: 3,

  mines: 1,
};

/**
 * @typedef {number} Tile
 * @typedef {Tile[][]} Field
 */

// tile states:
const TileState = {
  Empty: 0,
  Mine: 1,
  FlaggedEmpty: 2,
  FlaggedMine: 3,
  Opened: 4,
  Opened1: 5,
  Opened2: 6,
  Opened3: 7,
  Opened4: 8,
  Opened5: 9,
  Opened6: 10,
  Opened7: 11,
  Opened8: 12,
};

/**
 * @typedef {'win' | 'lose' | 'running' | 'stopped'} Phase
 */

const Phase = {
  Win: 'win',
  Lose: 'lose',
  Running: 'running',
  Stopped: 'stopped',
};

/** @type {{ field: Field; phase: Phase; mines: number; timer: number; timerInterval: any }} */
const state = {
  field: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  phase: Phase.Stopped,
  mines: 0,
  timer: 0,
  timerInterval: null,
};

function saveScore() {
  const score = {
    rows: settings.rows,
    cols: settings.cols,
    mines: settings.mines,
    time: state.timer,
  };

  const scores = JSON.parse(localStorage.getItem('scores')) || [];

  scores.push(score);

  scores.sort((a, b) => a.time - b.time);

  localStorage.setItem('scores', JSON.stringify(scores));

  console.log('win, score:', score);
}

function setPhase(newPhase) {
  const samePhase = state.phase === newPhase;

  state.phase = newPhase;

  const body = document.body;

  body.classList.remove('win', 'lose');

  if (state.phase === Phase.Running) {
    return;
  }

  stopTimer();

  switch (state.phase) {
    case Phase.Win:
      body.classList.add('win');
      if (!samePhase) {
        saveScore();
      }
      break;
    case Phase.Lose:
      body.classList.add('lose');
      break;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function onSizeChange() {
  const newSize = clamp(Number(size.value), 3, 50);

  settings.rows = newSize;
  settings.cols = newSize;

  newGame();
}

function updateSize() {
  const style = `--rows: ${settings.rows};--cols: ${settings.cols};`;
  field.setAttribute('style', style);

  mines.setAttribute('max', settings.rows * settings.cols - 1);
  mines.value = clamp(Number(mines.value), 1, settings.rows * settings.cols - 1);
}

function onMinesChange() {
  const newMines = clamp(Number(mines.value), 1, settings.rows * settings.cols - 1);

  settings.mines = newMines;
}

let tileElements = field.querySelectorAll('#field > div');

function render() {
  tileElements.forEach((tile, index) => {
    const row = Math.floor(index / settings.cols);
    const col = index % settings.cols;

    const tileState = state.field[row][col];
    tile.setAttribute('data-s', tileState);
  });
}

function updateTimer() {
  timer.textContent = state.timer;
}

function startTimer() {
  state.timer = 0;

  updateTimer();

  state.timerInterval = setInterval(() => {
    state.timer++;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function updateMineCounter(newValue) {
  state.mines = newValue;
  mineCounter.textContent = clamp(state.mines, 0, settings.mines);
}

function setTile(row, col, newState) {
  state.field[row][col] = newState;
}

function forAllNeighbors(row, col, callback) {
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r < 0 || r >= settings.rows || c < 0 || c >= settings.cols) {
        continue;
      }

      const tile = state.field[r][c];

      callback(tile, r, c);
    }
  }
}

function onTileClick(row, col) {
  let firstClick = false;
  switch (state.phase) {
    case Phase.Stopped:
      setPhase(Phase.Running);
      startTimer();
      firstClick = true;
      break;
    case Phase.Win:
    case Phase.Lose:
      return;
  }

  const tile = state.field[row][col];

  switch (tile) {
    case TileState.FlaggedEmpty:
    case TileState.FlaggedMine:
      return;
    case TileState.Opened:
    case TileState.Opened1:
    case TileState.Opened2:
    case TileState.Opened3:
    case TileState.Opened4:
    case TileState.Opened5:
    case TileState.Opened6:
    case TileState.Opened7:
    case TileState.Opened8:
      forAllNeighbors(row, col, (t, r, c) => {
        if (t !== TileState.FlaggedEmpty && t !== TileState.FlaggedMine && t < TileState.Opened) {
          onTileClick(r, c);
        }
      });

      return;
    case TileState.Mine:
      if (firstClick) {
        // move mine to another tile
        console.log('moving mine becuase you were unlucky');
        let newMineRow;
        let newMineCol;

        do {
          newMineRow = Math.floor(Math.random() * settings.rows);
          newMineCol = Math.floor(Math.random() * settings.cols);
        } while (state.field[newMineRow][newMineCol] === TileState.Mine);

        setTile(row, col, TileState.Empty);
        setTile(newMineRow, newMineCol, TileState.Mine);
      } else {
        setPhase(Phase.Lose);
        return;
      }
  }

  let neighboringMines = 0;

  forAllNeighbors(row, col, (t) => {
    if (t === TileState.Mine || t === TileState.FlaggedMine) {
      neighboringMines++;
    }
  });

  setTile(row, col, TileState.Opened + neighboringMines);

  if (neighboringMines === 0) {
    forAllNeighbors(row, col, (t, r, c) => {
      if (t === TileState.Empty || t === TileState.FlaggedEmpty) {
        onTileClick(r, c);
      }
    });
  }

  checkWin();

  render();
}

function onTileRightClick(e, row, col) {
  e.preventDefault();

  switch (state.phase) {
    case Phase.Stopped:
      setPhase(Phase.Running);
      startTimer();
      break;
    case Phase.Win:
    case Phase.Lose:
      return;
  }

  checkWin();

  const tile = state.field[row][col];

  let change = 0;
  let newState = TileState.Empty;

  switch (tile) {
    case TileState.FlaggedEmpty:
      newState = TileState.Empty;
      change = 1;
      break;
    case TileState.FlaggedMine:
      newState = TileState.Mine;
      change = 1;
      break;
    case TileState.Empty:
      newState = TileState.FlaggedEmpty;
      change = -1;
      break;
    case TileState.Mine:
      newState = TileState.FlaggedMine;
      change = -1;
      break;
  }

  if (change !== 0) {
    updateMineCounter(state.mines + change);
    setTile(row, col, newState);
  }

  render();
}

function calculateTileSize() {
  const fieldSize = field.parentElement.getBoundingClientRect();

  const xGapsSize = (settings.cols - 1) * 2;
  const yGapsSize = (settings.rows - 1) * 2;

  const xSize = (fieldSize.width - xGapsSize - 24) / settings.cols;
  const ySize = (fieldSize.height - yGapsSize - 24) / settings.rows;

  let tileSize = Math.min(xSize, ySize);

  tileSize = clamp(tileSize, 1, 36);

  field.style.setProperty('--size', `${tileSize}px`);
}

function newGame() {
  setPhase(Phase.Stopped);
  state.field = [];
  stopTimer();
  state.timer = 0;
  updateTimer();

  updateSize();
  onMinesChange();

  field.innerHTML = '';

  // fill with empty tiles
  state.field = Array.from({ length: settings.rows }, () =>
    Array.from({ length: settings.cols }, () => TileState.Empty),
  );

  // distribute mines
  for (let i = 0; i < settings.mines; i++) {
    let row;
    let col;

    // avoid placing mine on the same tile
    do {
      row = Math.floor(Math.random() * settings.rows);
      col = Math.floor(Math.random() * settings.cols);
    } while (state.field[row][col] === TileState.Mine);

    state.field[row][col] = TileState.Mine;
  }

  state.mines = settings.mines;

  updateMineCounter(state.mines);

  // add tiles to the field
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < settings.cols; col++) {
      const tile = state.field[row][col];

      const tileEl = document.createElement('div');

      tileEl.setAttribute('data-s', tile);

      tileEl.onclick = () => onTileClick(row, col);
      tileEl.oncontextmenu = (e) => onTileRightClick(e, row, col);

      field.appendChild(tileEl);
    }
  }

  tileElements = field.querySelectorAll('#field > div');

  calculateTileSize();

  render();
}

function checkWin() {
  // check if any non mine tile remains
  let allOpened = true;

  outer: for (let r = 0; r < settings.rows; r++) {
    for (let c = 0; c < settings.cols; c++) {
      const tile = state.field[r][c];

      if (tile !== TileState.Mine && tile !== TileState.FlaggedMine && tile < TileState.Opened) {
        allOpened = false;
        break outer;
      }
    }
  }

  if (allOpened) {
    setPhase(Phase.Win);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  onSizeChange();
  onMinesChange();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    newGame();
  }
});
