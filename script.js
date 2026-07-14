const ballsEl = document.querySelector('#balls');
const drawButton = document.querySelector('#drawButton');
const buttonText = document.querySelector('#buttonText');
const copyButton = document.querySelector('#copyButton');
const clearButton = document.querySelector('#clearButton');
const historyList = document.querySelector('#historyList');
const statusText = document.querySelector('#statusText');
const drawCount = document.querySelector('#drawCount');
const today = document.querySelector('#today');

const HISTORY_KEY = 'lucky-number-history';
let history = loadHistory();
let currentNumbers = history[0]?.numbers || [];
let isDrawing = false;

today.textContent = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
}).format(new Date());

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(data) ? data.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function getColor(number) {
  if (number <= 10) return 'yellow';
  if (number <= 20) return 'blue';
  if (number <= 30) return 'red';
  if (number <= 40) return 'gray';
  return 'green';
}

function generateNumbers() {
  const pool = Array.from({ length: 45 }, (_, index) => index + 1);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).sort((a, b) => a - b);
}

function renderMain(numbers, animated = false) {
  ballsEl.innerHTML = '';
  numbers.forEach((number, index) => {
    const ball = document.createElement('div');
    ball.className = `ball ${getColor(number)}${animated ? ' reveal' : ''}`;
    ball.textContent = number;
    if (animated) ball.style.animationDelay = `${index * 90}ms`;
    ballsEl.appendChild(ball);
  });
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<div class="empty-history"><span>아직 추첨 기록이 없어요.</span><span class="empty-line"></span></div>';
    return;
  }

  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <span class="history-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="mini-balls">
        ${item.numbers.map(number => `<span class="mini-ball ${getColor(number)}">${number}</span>`).join('')}
      </div>
      <time class="history-time">${item.time}</time>
    </div>
  `).join('');
}

function showShuffle() {
  ballsEl.innerHTML = Array.from({ length: 6 }, () => {
    const number = Math.floor(Math.random() * 45) + 1;
    return `<div class="ball ${getColor(number)} shuffle">${number}</div>`;
  }).join('');
}

async function drawNumbers() {
  if (isDrawing) return;
  isDrawing = true;
  drawButton.disabled = true;
  copyButton.disabled = true;
  buttonText.textContent = '번호를 고르는 중...';
  statusText.textContent = '행운의 숫자들이 섞이고 있어요.';

  const shuffleTimer = setInterval(showShuffle, 110);
  await new Promise(resolve => setTimeout(resolve, 900));
  clearInterval(shuffleTimer);

  currentNumbers = generateNumbers();
  const now = new Date();
  history.unshift({
    numbers: currentNumbers,
    time: new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(now)
  });
  history = history.slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  renderMain(currentNumbers, true);
  renderHistory();
  drawCount.textContent = `# ${String(history.length).padStart(3, '0')}`;
  statusText.textContent = '오늘의 행운 번호가 도착했어요!';
  buttonText.textContent = '한 번 더 뽑기';
  drawButton.disabled = false;
  copyButton.disabled = false;
  isDrawing = false;
}

async function copyResult() {
  if (!currentNumbers.length) return;
  const text = `나의 행운 번호: ${currentNumbers.join(', ')}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  statusText.textContent = '행운 번호를 복사했어요.';
  setTimeout(() => { statusText.textContent = '오늘의 행운 번호가 도착했어요!'; }, 1600);
}

function clearHistory() {
  history = [];
  currentNumbers = [];
  localStorage.removeItem(HISTORY_KEY);
  ballsEl.innerHTML = Array.from({ length: 6 }, () => '<div class="ball placeholder">?</div>').join('');
  renderHistory();
  drawCount.textContent = '# 001';
  statusText.textContent = '버튼을 누르면 번호를 뽑아드려요.';
  buttonText.textContent = '행운 번호 뽑기';
  copyButton.disabled = true;
}

drawButton.addEventListener('click', drawNumbers);
copyButton.addEventListener('click', copyResult);
clearButton.addEventListener('click', clearHistory);

if (currentNumbers.length) {
  renderMain(currentNumbers);
  renderHistory();
  copyButton.disabled = false;
  statusText.textContent = '마지막으로 뽑은 행운 번호예요.';
  buttonText.textContent = '한 번 더 뽑기';
  drawCount.textContent = `# ${String(history.length).padStart(3, '0')}`;
}
