import {API_BASE_URL} from './config.js';

const body = document.querySelector('#ranking-body');
const menu = document.querySelector('#menu-button');
const nav = document.querySelector('#site-nav');

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(Number(milliseconds || 0) / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

async function loadRanking() {
  try {
    const response = await fetch(`${API_BASE_URL}/getLeaderboard`);
    if (!response.ok) throw new Error();
    const {entries} = await response.json();
    body.replaceChildren();
    if (!entries.length) {
      const row = body.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = 'O campeonato ainda não começou. Seja o primeiro!';
      return;
    }
    entries.forEach((entry, index) => {
      const row = body.insertRow();
      [index + 1, entry.name, entry.score, formatTime(entry.elapsedMs), formatDate(entry.finishedAt)]
        .forEach((value) => {
          const cell = row.insertCell();
          cell.textContent = String(value);
        });
    });
  } catch {
    body.replaceChildren();
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = 'Não foi possível carregar o ranking agora.';
  }
}

menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
loadRanking();
