const ballsEl = document.querySelector('#balls');
const drawButton = document.querySelector('#drawButton');
const buttonText = document.querySelector('#buttonText');
const copyButton = document.querySelector('#copyButton');
const shareButton = document.querySelector('#shareButton');
const saveImageButton = document.querySelector('#saveImageButton');
const clearButton = document.querySelector('#clearButton');
const refreshHistoryButton = document.querySelector('#refreshHistoryButton');
const loadMoreHistoryButton = document.querySelector('#loadMoreHistoryButton');
const historyList = document.querySelector('#historyList');
const historyStatus = document.querySelector('#historyStatus');
const statusText = document.querySelector('#statusText');
const drawCount = document.querySelector('#drawCount');
const today = document.querySelector('#today');
const roundInput = document.querySelector('#roundInput');
const lookupButton = document.querySelector('#lookupButton');
const lookupStatus = document.querySelector('#lookupStatus');
const winningResult = document.querySelector('#winningResult');
const officialRound = document.querySelector('#officialRound');
const officialDate = document.querySelector('#officialDate');
const officialNumbers = document.querySelector('#officialNumbers');
const comparisonResult = document.querySelector('#comparisonResult');
const databaseStatus = document.querySelector('#databaseStatus');
const recommendationBalls = document.querySelector('#recommendationBalls');
const recommendButton = document.querySelector('#recommendButton');
const useRecommendationButton = document.querySelector('#useRecommendationButton');
const recommendationStatus = document.querySelector('#recommendationStatus');
const analysisSummary = document.querySelector('#analysisSummary');
const numberAnalysis = document.querySelector('#numberAnalysis');
const numberAnalysisList = document.querySelector('#numberAnalysisList');

const HISTORY_KEY = 'lucky-number-history';
const OFFICIAL_API = 'https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do';
const LOCAL_HISTORY_LIMIT = 50;
const DATABASE_HISTORY_LIMIT = 50;
const HISTORY_PAGE_SIZE = 10;
const ANALYSIS_DRAW_COUNT = 100;
const TREND_DRAW_COUNT = 20;
let history = loadHistory();
let currentNumbers = history[0]?.numbers || [];
let currentOfficialDraw = null;
let isDrawing = false;
let recentDrawsPromise = null;
let recommendedNumbers = [];
let databaseHistoryLoading = false;
let displayedHistoryItems = [];
let visibleHistoryCount = HISTORY_PAGE_SIZE;

today.textContent = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
}).format(new Date());

roundInput.value = estimateLatestRound();
roundInput.max = estimateLatestRound();

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(data) ? data.slice(0, LOCAL_HISTORY_LIMIT) : [];
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

function estimateLatestRound() {
  const firstDraw = new Date('2002-12-07T20:45:00+09:00');
  const now = new Date();
  const week = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((now.getTime() - firstDraw.getTime()) / week) + 1);
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

function renderHistory(items = history) {
  if (!items.length) {
    historyList.innerHTML = '<div class="empty-history"><span>아직 추첨 기록이 없어요.</span><span class="empty-line"></span></div>';
    return;
  }

  historyList.innerHTML = items.map((item, index) => `
    <div class="history-item">
      <span class="history-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="mini-balls">
        ${item.numbers.map(number => `<span class="mini-ball ${getColor(number)}">${number}</span>`).join('')}
      </div>
      <time class="history-time">${item.time || formatDatabaseTime(item.created_at)}</time>
    </div>
  `).join('');
}

function setHistoryItems(items, reset = true) {
  displayedHistoryItems = [...items];
  if (reset) visibleHistoryCount = HISTORY_PAGE_SIZE;
  renderHistory(displayedHistoryItems.slice(0, visibleHistoryCount));

  if (displayedHistoryItems.length <= HISTORY_PAGE_SIZE) {
    loadMoreHistoryButton.hidden = true;
    return;
  }

  loadMoreHistoryButton.hidden = false;
  loadMoreHistoryButton.textContent = visibleHistoryCount >= displayedHistoryItems.length
    ? `접기 · 전체 ${displayedHistoryItems.length}개`
    : `더보기 · ${Math.min(visibleHistoryCount, displayedHistoryItems.length)} / ${displayedHistoryItems.length}개`;
}

function toggleMoreHistory() {
  visibleHistoryCount = visibleHistoryCount >= displayedHistoryItems.length
    ? HISTORY_PAGE_SIZE
    : Math.min(visibleHistoryCount + HISTORY_PAGE_SIZE, displayedHistoryItems.length);
  setHistoryItems(displayedHistoryItems, false);
}

function formatDatabaseTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
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
  shareButton.disabled = true;
  saveImageButton.disabled = true;
  buttonText.textContent = '번호를 고르는 중...';
  statusText.textContent = '행운의 숫자들이 섞이고 있어요.';

  const shuffleTimer = setInterval(showShuffle, 110);
  await new Promise(resolve => setTimeout(resolve, 900));
  clearInterval(shuffleTimer);

  recordNumbers(generateNumbers(), '오늘의 행운 번호가 도착했어요!');
  buttonText.textContent = '한 번 더 뽑기';
  drawButton.disabled = false;
  isDrawing = false;
}

function recordNumbers(numbers, message) {
  currentNumbers = [...numbers];
  const now = new Date();
  history.unshift({
    numbers: currentNumbers,
    time: new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(now)
  });
  history = history.slice(0, LOCAL_HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  renderMain(currentNumbers, true);
  setHistoryItems(history);
  drawCount.textContent = `# ${String(history.length).padStart(3, '0')}`;
  statusText.textContent = message;
  buttonText.textContent = '한 번 더 뽑기';
  copyButton.disabled = false;
  shareButton.disabled = false;
  saveImageButton.disabled = false;
  if (currentOfficialDraw) renderOfficialDraw(currentOfficialDraw);
  saveDrawToDatabase(currentNumbers);
}

async function saveDrawToDatabase(numbers) {
  databaseStatus.textContent = 'DB 저장 중...';
  databaseStatus.className = 'db-status saving';

  try {
    const response = await fetch('/api/draws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers })
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('API_NOT_FOUND');
      if (response.status === 503) throw new Error('SETUP_REQUIRED');
      throw new Error('SAVE_FAILED');
    }
    databaseStatus.textContent = 'SUPABASE 저장됨';
    databaseStatus.className = 'db-status saved';
    loadDatabaseHistory();
  } catch (error) {
    databaseStatus.textContent = {
      API_NOT_FOUND: 'VERCEL 배포 시 DB 저장',
      SETUP_REQUIRED: 'DB 환경변수 설정 필요'
    }[error.message] || 'DB 저장 실패';
    databaseStatus.className = 'db-status error';
  }
}

async function loadDatabaseHistory() {
  if (databaseHistoryLoading) return;
  databaseHistoryLoading = true;
  refreshHistoryButton.disabled = true;
  historyStatus.textContent = `Supabase에서 최근 ${DATABASE_HISTORY_LIMIT}개 기록을 불러오고 있어요.`;

  try {
    const response = await fetch(`/api/draws?limit=${DATABASE_HISTORY_LIMIT}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 503 ? 'SETUP_REQUIRED' : 'LOAD_FAILED');
    const payload = await response.json();
    const draws = Array.isArray(payload?.draws) ? payload.draws : [];
    setHistoryItems(draws);

    const totalText = Number.isInteger(payload?.total) ? `총 ${payload.total}개 중 ` : '';
    historyStatus.textContent = `${totalText}최근 ${draws.length}개 저장 기록이에요. 새 번호는 삭제 없이 계속 누적돼요.`;
    historyStatus.classList.remove('error');
  } catch (error) {
    setHistoryItems(history);
    historyStatus.textContent = error.message === 'SETUP_REQUIRED'
      ? `Supabase 설정 전이라 이 기기의 최근 ${history.length}개 기록을 보여드려요.`
      : `DB에 연결하지 못해 이 기기의 최근 ${history.length}개 기록을 보여드려요.`;
    historyStatus.classList.add('error');
  } finally {
    databaseHistoryLoading = false;
    refreshHistoryButton.disabled = false;
  }
}

async function copyText(text) {
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
}

async function copyResult() {
  if (!currentNumbers.length) return;
  await copyText(buildShareText());
  statusText.textContent = '행운 번호를 복사했어요.';
  setTimeout(() => { statusText.textContent = '오늘의 행운 번호가 도착했어요!'; }, 1600);
}

function buildShareText() {
  const lines = [
    '행운 번호 연구소에서 뽑은 나의 번호 🍀',
    currentNumbers.join(', ')
  ];

  if (currentOfficialDraw) {
    const result = getPrizeResult(currentNumbers, currentOfficialDraw);
    lines.push('', `${currentOfficialDraw.round}회 당첨번호와 비교: ${result.label}`);
  }

  if (location.protocol.startsWith('http')) lines.push('', location.href);
  return lines.join('\n');
}

async function shareResult() {
  if (!currentNumbers.length) return;
  const shareData = { title: '행운 번호 연구소', text: buildShareText() };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      statusText.textContent = '행운 번호를 공유했어요.';
      setTimeout(() => { statusText.textContent = '오늘의 행운 번호가 도착했어요!'; }, 1600);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  await copyText(buildShareText());
  statusText.textContent = '공유할 내용을 복사했어요.';
  setTimeout(() => { statusText.textContent = '오늘의 행운 번호가 도착했어요!'; }, 1600);
}

function formatOfficialDate(value) {
  if (!/^\d{8}$/.test(String(value))) return '';
  const text = String(value);
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function normalizeOfficialDraw(item) {
  return {
    round: Number(item.ltEpsd),
    date: formatOfficialDate(item.ltRflYmd),
    numbers: [1, 2, 3, 4, 5, 6].map(index => Number(item[`tm${index}WnNo`])),
    bonus: Number(item.bnsWnNo)
  };
}

async function fetchOfficialDrawBatch(direction, round) {
  const url = new URL(OFFICIAL_API);
  url.searchParams.set('srchDir', direction);
  url.searchParams.set(direction === 'center' ? 'srchLtEpsd' : 'srchCursorLtEpsd', round);
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return (payload?.data?.list || []).map(normalizeOfficialDraw);
}

async function loadRecentOfficialDraws() {
  if (recentDrawsPromise) return recentDrawsPromise;
  recentDrawsPromise = (async () => {
    const drawsByRound = new Map();

    try {
      const response = await fetch('./data/official-draws.json', { cache: 'no-cache' });
      if (response.ok) {
        const payload = await response.json();
        (payload?.draws || []).forEach(draw => drawsByRound.set(draw.round, {
          ...draw,
          date: formatOfficialDate(draw.date)
        }));
      }
    } catch {
      // 정적 파일을 직접 연 환경에서는 공식 API 데이터만 사용합니다.
    }

    if (drawsByRound.size) {
      try {
        let cursor = Math.max(...drawsByRound.keys());
        for (let page = 0; page < 25; page += 1) {
          const newerDraws = (await fetchOfficialDrawBatch('latest', cursor))
            .filter(draw => draw.round > cursor);
          if (!newerDraws.length) break;
          newerDraws.forEach(draw => drawsByRound.set(draw.round, draw));
          cursor = Math.max(...newerDraws.map(draw => draw.round));
          if (newerDraws.length < 10) break;
        }
      } catch {
        // 공식 사이트가 일시적으로 응답하지 않아도 배포 시점 데이터로 분석합니다.
      }
    } else {
      const firstBatch = await fetchOfficialDrawBatch('center', estimateLatestRound());
      firstBatch.forEach(draw => drawsByRound.set(draw.round, draw));

      while (drawsByRound.size < ANALYSIS_DRAW_COUNT) {
        const oldestRound = Math.min(...drawsByRound.keys());
        const olderDraws = await fetchOfficialDrawBatch('older', oldestRound);
        if (!olderDraws.length) break;
        olderDraws.forEach(draw => drawsByRound.set(draw.round, draw));
      }
    }

    return [...drawsByRound.values()]
      .sort((a, b) => b.round - a.round)
      .slice(0, ANALYSIS_DRAW_COUNT);
  })();
  return recentDrawsPromise;
}

function analyzeRecentDraws(draws) {
  const frequency = Array(46).fill(0);
  const recentFrequency = Array(46).fill(0);
  const lastSeen = Array(46).fill(draws.length);

  draws.forEach((draw, drawIndex) => {
    draw.numbers.forEach(number => {
      frequency[number] += 1;
      if (drawIndex < TREND_DRAW_COUNT) recentFrequency[number] += 1;
      if (lastSeen[number] === draws.length) lastSeen[number] = drawIndex;
    });
  });

  const maxFrequency = Math.max(...frequency);
  const maxRecentFrequency = Math.max(...recentFrequency);
  const scores = Array(46).fill(0);
  const components = Array(46).fill(null);
  for (let number = 1; number <= 45; number += 1) {
    const frequencyPoints = frequency[number] / maxFrequency * 45;
    const trendPoints = recentFrequency[number] / maxRecentFrequency * 25;
    const overduePoints = lastSeen[number] / draws.length * 30;
    scores[number] = (frequencyPoints + trendPoints + overduePoints) / 100;
    components[number] = {
      frequency: Math.round(frequencyPoints),
      trend: Math.round(trendPoints),
      overdue: Math.round(overduePoints)
    };
  }

  const numbers = Array.from({ length: 45 }, (_, index) => index + 1);
  const hot = [...numbers].sort((a, b) => frequency[b] - frequency[a] || recentFrequency[b] - recentFrequency[a]).slice(0, 5);
  const overdue = [...numbers].sort((a, b) => lastSeen[b] - lastSeen[a] || frequency[a] - frequency[b]).slice(0, 5);
  return { frequency, recentFrequency, lastSeen, scores, components, hot, overdue };
}

function weightedSample(scores) {
  const available = Array.from({ length: 45 }, (_, index) => index + 1);
  const selected = [];
  while (selected.length < 6) {
    const total = available.reduce((sum, number) => sum + scores[number], 0);
    let point = Math.random() * total;
    const index = available.findIndex(number => {
      point -= scores[number];
      return point <= 0;
    });
    selected.push(available.splice(index < 0 ? available.length - 1 : index, 1)[0]);
  }
  return selected.sort((a, b) => a - b);
}

function isBalancedCombination(numbers) {
  const oddCount = numbers.filter(number => number % 2).length;
  const lowCount = numbers.filter(number => number <= 22).length;
  const sum = numbers.reduce((total, number) => total + number, 0);
  const consecutivePairs = numbers.slice(1).filter((number, index) => number === numbers[index] + 1).length;
  return oddCount >= 2 && oddCount <= 4
    && lowCount >= 2 && lowCount <= 4
    && sum >= 100 && sum <= 180
    && consecutivePairs <= 2;
}

function buildRecommendation(scores) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const numbers = weightedSample(scores);
    if (isBalancedCombination(numbers)) return numbers;
  }
  return weightedSample(scores);
}

function renderRecommendation(numbers) {
  recommendationBalls.innerHTML = numbers.map((number, index) => `
    <span class="recommendation-ball ${getColor(number)}" style="animation-delay:${index * 55}ms">${number}</span>
  `).join('');
}

function renderNumberAnalysis(numbers, analysis, drawCount) {
  numberAnalysis.hidden = false;
  numberAnalysisList.innerHTML = numbers.map(number => {
    const index = Math.round(analysis.scores[number] * 100);
    const appearanceRate = (analysis.frequency[number] / drawCount * 100).toFixed(1);
    const gap = analysis.lastSeen[number] === 0
      ? '최신 회차에 출현'
      : `${analysis.lastSeen[number]}회째 미출현`;
    const points = analysis.components[number];

    return `
      <div class="number-analysis-item">
        <span class="analysis-number ${getColor(number)}">${number}</span>
        <div>
          <div class="score-heading">
            <strong>통계 추천지수 ${index}점</strong>
            <span>과거 출현율 ${appearanceRate}%</span>
          </div>
          <div class="score-bar" aria-label="추천지수 ${index}점"><i style="width:${index}%"></i></div>
          <p class="score-detail">${drawCount}회 중 ${analysis.frequency[number]}번 · 최근 ${TREND_DRAW_COUNT}회 ${analysis.recentFrequency[number]}번 · ${gap}</p>
          <div class="score-parts">
            <span>빈도 ${points.frequency}/45</span>
            <span>흐름 ${points.trend}/25</span>
            <span>휴식 ${points.overdue}/30</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function recommendNumbers() {
  recommendButton.disabled = true;
  recommendButton.textContent = `최근 ${ANALYSIS_DRAW_COUNT}회 분석 중...`;
  recommendationStatus.textContent = '동행복권 공식 당첨번호를 불러오고 있어요.';
  recommendationStatus.classList.remove('error');

  try {
    const draws = await loadRecentOfficialDraws();
    if (draws.length < ANALYSIS_DRAW_COUNT) throw new Error('NOT_ENOUGH_DRAWS');
    const analysis = analyzeRecentDraws(draws);
    recommendedNumbers = buildRecommendation(analysis.scores);
    renderRecommendation(recommendedNumbers);
    renderNumberAnalysis(recommendedNumbers, analysis, draws.length);
    useRecommendationButton.hidden = false;
    recommendationStatus.textContent = `${draws.at(-1).round}회~${draws[0].round}회 분석을 반영한 추천 조합이에요.`;
    analysisSummary.hidden = false;
    analysisSummary.innerHTML = `
      <span>자주 나온 번호 <b>${analysis.hot.join(' · ')}</b></span>
      <span>오래 쉬어간 번호 <b>${analysis.overdue.join(' · ')}</b></span>
      <span>추천 조합 합계 <b>${recommendedNumbers.reduce((sum, number) => sum + number, 0)}</b></span>
    `;
  } catch {
    recommendationStatus.textContent = '최근 당첨번호를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    recommendationStatus.classList.add('error');
    recentDrawsPromise = null;
  } finally {
    recommendButton.disabled = false;
    recommendButton.textContent = '다른 추천번호 만들기';
  }
}

function useRecommendedNumbers() {
  if (!recommendedNumbers.length) return;
  recordNumbers(recommendedNumbers, '통계 추천번호를 선택했어요!');
  window.scrollTo({ top: document.querySelector('.draw-card').offsetTop - 24, behavior: 'smooth' });
}

function getPrizeResult(numbers, draw) {
  if (!numbers.length) {
    return { label: '번호를 먼저 뽑아주세요', detail: '행운 번호를 뽑으면 이 회차와 바로 비교해 드려요.', tone: '' };
  }

  const matches = numbers.filter(number => draw.numbers.includes(number));
  const hasBonus = numbers.includes(draw.bonus);
  let rank = '낙첨';
  let tone = matches.length >= 2 ? 'near' : '';

  if (matches.length === 6) rank = '1등';
  else if (matches.length === 5 && hasBonus) rank = '2등';
  else if (matches.length === 5) rank = '3등';
  else if (matches.length === 4) rank = '4등';
  else if (matches.length === 3) rank = '5등';

  if (rank !== '낙첨') tone = 'win';
  const bonusText = hasBonus ? ' · 보너스 번호 일치' : '';
  return {
    label: rank,
    detail: `당첨번호 ${matches.length}개 일치${bonusText}`,
    tone
  };
}

function renderOfficialDraw(draw) {
  const prize = getPrizeResult(currentNumbers, draw);
  officialRound.textContent = `제 ${draw.round}회`;
  officialDate.textContent = `${draw.date} 추첨`;
  officialNumbers.innerHTML = `
    ${draw.numbers.map(number => `<span class="official-ball ${getColor(number)}${currentNumbers.includes(number) ? ' matched' : ''}">${number}</span>`).join('')}
    <span class="plus-mark" aria-hidden="true">+</span>
    <span class="bonus-group"><span class="bonus-label">보너스</span><span class="official-ball ${getColor(draw.bonus)}${currentNumbers.includes(draw.bonus) ? ' matched' : ''}">${draw.bonus}</span></span>
  `;
  comparisonResult.className = `comparison${prize.tone ? ` ${prize.tone}` : ''}`;
  comparisonResult.innerHTML = `<strong>${prize.label}</strong><span>${prize.detail}</span>`;
  winningResult.hidden = false;
}

async function lookupOfficialDraw() {
  const round = Number.parseInt(roundInput.value, 10);
  if (!Number.isInteger(round) || round < 1) {
    lookupStatus.textContent = '1 이상의 올바른 회차를 입력해 주세요.';
    lookupStatus.classList.add('error');
    return;
  }

  lookupButton.disabled = true;
  lookupButton.textContent = '조회 중...';
  lookupStatus.textContent = `${round}회 공식 결과를 불러오고 있어요.`;
  lookupStatus.classList.remove('error');

  try {
    const url = new URL(OFFICIAL_API);
    url.searchParams.set('srchDir', 'center');
    url.searchParams.set('srchLtEpsd', round);
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const item = payload?.data?.list?.find(draw => Number(draw.ltEpsd) === round);
    if (!item) throw new Error('RESULT_NOT_FOUND');

    currentOfficialDraw = normalizeOfficialDraw(item);
    renderOfficialDraw(currentOfficialDraw);
    lookupStatus.textContent = currentNumbers.length
      ? `${round}회 당첨번호와 내 번호를 비교했어요.`
      : `${round}회 결과를 불러왔어요. 이제 행운 번호를 뽑아보세요.`;
  } catch (error) {
    lookupStatus.textContent = error.message === 'RESULT_NOT_FOUND'
      ? '아직 발표되지 않았거나 존재하지 않는 회차예요.'
      : '공식 결과를 불러오지 못했어요. 인터넷 연결 후 다시 시도해 주세요.';
    lookupStatus.classList.add('error');
  } finally {
    lookupButton.disabled = false;
    lookupButton.textContent = '조회하고 비교';
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawCanvasBall(ctx, number, x, y, radius, matched = false) {
  const colors = { yellow: '#f1b83a', blue: '#4e8db4', red: '#e9654b', gray: '#8e9895', green: '#55a878' };
  if (matched) {
    ctx.fillStyle = '#173c34';
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = colors[getColor(number)];
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(radius * .72)}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, x, y + 1);
}

async function saveResultImage() {
  if (!currentNumbers.length) return;
  saveImageButton.disabled = true;
  statusText.textContent = '공유 이미지를 만들고 있어요.';
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f1e9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(232, 93, 53, .08)';
  ctx.beginPath();
  ctx.arc(1090, 70, 210, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#173c34';
  ctx.font = '700 28px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✣  행운 번호 연구소', 72, 78);
  ctx.fillStyle = '#e85d35';
  ctx.font = '700 15px "DM Sans", sans-serif';
  ctx.fillText('MY LUCKY NUMBERS', 74, 148);
  ctx.fillStyle = '#173c34';
  ctx.font = '700 52px "Noto Sans KR", sans-serif';
  ctx.fillText('오늘의 행운을 담은 여섯 숫자', 72, 215);

  currentNumbers.forEach((number, index) => drawCanvasBall(ctx, number, 132 + (index * 128), 330, 48));

  if (currentOfficialDraw) {
    const prize = getPrizeResult(currentNumbers, currentOfficialDraw);
    ctx.fillStyle = '#fffefa';
    roundedRect(ctx, 72, 426, 1056, 108, 10);
    ctx.fillStyle = '#173c34';
    ctx.font = '700 22px "Noto Sans KR", sans-serif';
    ctx.fillText(`${currentOfficialDraw.round}회 비교 결과 · ${prize.label}`, 104, 469);
    ctx.fillStyle = '#7f8b84';
    ctx.font = '500 16px "Noto Sans KR", sans-serif';
    ctx.fillText(prize.detail, 104, 505);
  } else {
    ctx.fillStyle = '#7f8b84';
    ctx.font = '500 18px "Noto Sans KR", sans-serif';
    ctx.fillText('작은 설렘이 필요한 순간을 위해.', 74, 464);
  }

  ctx.fillStyle = '#8c9691';
  ctx.font = '500 14px "Noto Sans KR", sans-serif';
  ctx.fillText('무작위로 생성된 번호이며 당첨을 보장하지 않아요.', 72, 588);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#173c34';
  ctx.font = '700 13px "DM Sans", sans-serif';
  ctx.fillText('GOOD LUCK ✦', 1128, 588);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    statusText.textContent = '이미지를 만들지 못했어요. 다시 시도해 주세요.';
    saveImageButton.disabled = false;
    return;
  }

  const link = document.createElement('a');
  const imageUrl = URL.createObjectURL(blob);
  link.href = imageUrl;
  link.download = `행운번호-${currentNumbers.join('-')}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
  statusText.textContent = '행운 번호 이미지를 저장했어요.';
  saveImageButton.disabled = false;
  setTimeout(() => { statusText.textContent = '오늘의 행운 번호가 도착했어요!'; }, 1600);
}

function clearHistory() {
  history = [];
  currentNumbers = [];
  localStorage.removeItem(HISTORY_KEY);
  ballsEl.innerHTML = Array.from({ length: 6 }, () => '<div class="ball placeholder">?</div>').join('');
  setHistoryItems(history);
  drawCount.textContent = '# 001';
  statusText.textContent = '버튼을 누르면 번호를 뽑아드려요.';
  buttonText.textContent = '행운 번호 뽑기';
  copyButton.disabled = true;
  shareButton.disabled = true;
  saveImageButton.disabled = true;
  if (currentOfficialDraw) renderOfficialDraw(currentOfficialDraw);
  loadDatabaseHistory();
}

drawButton.addEventListener('click', drawNumbers);
copyButton.addEventListener('click', copyResult);
shareButton.addEventListener('click', shareResult);
saveImageButton.addEventListener('click', saveResultImage);
clearButton.addEventListener('click', clearHistory);
refreshHistoryButton.addEventListener('click', loadDatabaseHistory);
loadMoreHistoryButton.addEventListener('click', toggleMoreHistory);
lookupButton.addEventListener('click', lookupOfficialDraw);
recommendButton.addEventListener('click', recommendNumbers);
useRecommendationButton.addEventListener('click', useRecommendedNumbers);
roundInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') lookupOfficialDraw();
});

if (currentNumbers.length) {
  renderMain(currentNumbers);
  setHistoryItems(history);
  copyButton.disabled = false;
  shareButton.disabled = false;
  saveImageButton.disabled = false;
  statusText.textContent = '마지막으로 뽑은 행운 번호예요.';
  buttonText.textContent = '한 번 더 뽑기';
  drawCount.textContent = `# ${String(history.length).padStart(3, '0')}`;
}

loadDatabaseHistory();
