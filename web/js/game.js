import {API_BASE_URL} from './config.js';

const elements = {
  clue: document.querySelector('#clue'),
  finalScore: document.querySelector('#final-score'),
  finalTime: document.querySelector('#final-time'),
  gameOver: document.querySelector('#game-over'),
  image: document.querySelector('#player-image'),
  loading: document.querySelector('#loading-player'),
  menu: document.querySelector('#menu-button'),
  name: document.querySelector('#player-name'),
  nav: document.querySelector('#site-nav'),
  newGame: document.querySelector('#new-game-button'),
  options: document.querySelector('#options'),
  retry: document.querySelector('#retry-button'),
  score: document.querySelector('#score'),
  scoreForm: document.querySelector('#score-form'),
  share: document.querySelector('#share-button'),
  status: document.querySelector('#status-message'),
  submitStatus: document.querySelector('#submit-status'),
  timer: document.querySelector('#timer'),
};

let sessionId = null;
let currentRound = null;
let currentScore = 0;
let startedAt = 0;
let elapsedMs = 0;
let timerHandle = null;
let awaitingAnswer = false;
let roundQueue = [];
const preloadedImages = new Map();

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  elapsedMs = Math.max(0, Date.now() - startedAt);
  elements.timer.textContent = formatTime(elapsedMs);
}

function startTimer() {
  stopTimer();
  startedAt = Date.now();
  elapsedMs = 0;
  updateTimer();
  timerHandle = window.setInterval(updateTimer, 250);
}

function stopTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    ...options,
    headers: {'Content-Type': 'application/json', ...(options.headers || {})},
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível falar com o servidor.');
  return body;
}

function setOptionsDisabled(disabled) {
  elements.options.querySelectorAll('button').forEach((button) => {
    button.disabled = disabled;
  });
}

function setRoundQueue(rounds) {
  roundQueue = rounds.filter(Boolean);
  const queuedIds = new Set(roundQueue.map((round) => round.id));
  preloadedImages.forEach((_, roundId) => {
    if (!queuedIds.has(roundId)) preloadedImages.delete(roundId);
  });
  roundQueue.forEach((round) => {
    if (preloadedImages.has(round.id)) return;
    const image = new Image();
    image.src = round.silhouetteUrl;
    preloadedImages.set(round.id, image);
  });
}

function showRound(round) {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  currentRound = round;
  awaitingAnswer = false;
  elements.options.replaceChildren();
  elements.status.textContent = '';
  elements.retry.hidden = true;
  elements.clue.textContent = `${round.clue.team} · Camisa ${round.clue.jerseyNumber} · ${round.clue.position}`;
  elements.image.hidden = false;
  elements.loading.hidden = true;
  elements.image.alt = `Silhueta de jogador do ${round.clue.team}`;
  elements.image.src = round.silhouetteUrl;

  round.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.textContent = option.name;
    button.dataset.optionId = option.id;
    button.addEventListener('click', () => answer(option.id));
    elements.options.append(button);
  });
}

async function startGame() {
  stopTimer();
  sessionId = null;
  currentRound = null;
  roundQueue = [];
  preloadedImages.clear();
  currentScore = 0;
  awaitingAnswer = true;
  elements.score.textContent = '0';
  elements.timer.textContent = '00:00';
  elements.gameOver.hidden = true;
  elements.image.hidden = true;
  elements.loading.hidden = false;
  elements.loading.textContent = 'Entrando em campo...';
  elements.options.replaceChildren();
  elements.clue.textContent = 'Preparando a escalação...';
  elements.status.textContent = '';
  elements.retry.hidden = true;
  elements.submitStatus.textContent = '';

  try {
    const game = await api('startGame', {method: 'POST', body: '{}'});
    sessionId = game.sessionId;
    currentScore = game.score;
    elements.score.textContent = String(currentScore);
    startTimer();
    setRoundQueue(game.rounds || [game.round]);
    showRound(roundQueue[0]);
  } catch (error) {
    elements.loading.textContent = 'O vestiário ainda não abriu.';
    elements.status.textContent = error.message;
    elements.retry.hidden = false;
  }
}

async function answer(optionId) {
  if (awaitingAnswer || !currentRound || !sessionId) return;
  awaitingAnswer = true;
  setOptionsDisabled(true);
  elements.status.textContent = 'Conferindo no VAR...';

  try {
    const result = await api('answerRound', {
      method: 'POST',
      body: JSON.stringify({sessionId, roundId: currentRound.id, optionId}),
    });
    currentScore = result.score;
    elements.score.textContent = String(currentScore);
    elements.image.src = result.revealUrl;
    elements.image.alt = 'Foto revelada do jogador';

    elements.options.querySelectorAll('button').forEach((button) => {
      if (button.dataset.optionId === result.correctOptionId) button.classList.add('correct');
      if (button.dataset.optionId === optionId && !result.correct) button.classList.add('wrong');
    });

    if (result.correct) {
      elements.status.textContent = 'Gol! Resposta certa.';
      setRoundQueue(result.rounds || [result.nextRound]);
      window.setTimeout(() => showRound(roundQueue[0]), 1100);
    } else {
      stopTimer();
      updateTimer();
      elements.status.textContent = 'Bola fora! Fim de jogo!';
      elements.finalScore.textContent = String(currentScore);
      elements.finalTime.textContent = formatTime(elapsedMs);
      window.setTimeout(() => {
        elements.gameOver.hidden = false;
        elements.gameOver.scrollIntoView({behavior: 'smooth', block: 'center'});
      }, 500);
    }
  } catch (error) {
    awaitingAnswer = false;
    setOptionsDisabled(false);
    elements.status.textContent = error.message;
  }
}

async function submitScore(event) {
  event.preventDefault();
  const submitButton = elements.scoreForm.querySelector('button');
  submitButton.disabled = true;
  elements.submitStatus.textContent = 'Enviando resultado...';
  try {
    await api('submitScore', {
      method: 'POST',
      body: JSON.stringify({sessionId, name: elements.name.value}),
    });
    elements.submitStatus.textContent = 'Resultado confirmado no ranking.';
    elements.name.disabled = true;
  } catch (error) {
    elements.submitStatus.textContent = error.message;
    submitButton.disabled = false;
  }
}

async function shareResult() {
  const text = `Fiz ${currentScore} acerto(s) em ${formatTime(elapsedMs)} no Quem é o jogadô? Você consegue bater?`;
  const shareData = {title: 'Quem é o jogadô?', text, url: window.location.href};
  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      elements.share.textContent = 'Copiado!';
      window.setTimeout(() => { elements.share.textContent = 'Compartilhar'; }, 1400);
    }
  } catch (error) {
    if (error.name !== 'AbortError') elements.submitStatus.textContent = 'Não foi possível compartilhar.';
  }
}

elements.menu.addEventListener('click', () => {
  const open = elements.nav.classList.toggle('open');
  elements.menu.setAttribute('aria-expanded', String(open));
});
elements.retry.addEventListener('click', startGame);
elements.newGame.addEventListener('click', startGame);
elements.scoreForm.addEventListener('submit', submitScore);
elements.share.addEventListener('click', shareResult);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
startGame();
