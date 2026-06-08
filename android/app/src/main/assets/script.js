const timeLeftEl = document.querySelector("#timeLeft");
const scoreEl = document.querySelector("#score");
const correctCountEl = document.querySelector("#correctCount");
const wrongCountEl = document.querySelector("#wrongCount");
const comboCountEl = document.querySelector("#comboCount");
const roundEl = document.querySelector("#round");
const choicesEl = document.querySelector("#choices");
const feedbackEl = document.querySelector("#feedback");
const newGameButton = document.querySelector("#newGameButton");
const nextQuestionButton = document.querySelector("#nextQuestionButton");
const mistakeCountEl = document.querySelector("#mistakeCount");
const mistakeGroupsEl = document.querySelector("#mistakeGroups");
const modeNameEl = document.querySelector("#modeName");
const roundLabelEl = document.querySelector("#roundLabel");
const gamePageEl = document.querySelector("#gamePage");
const practicePageEl = document.querySelector("#practicePage");
const mistakePageEl = document.querySelector("#mistakePage");
const leaderboardPageEl = document.querySelector("#leaderboardPage");
const practiceCatalogEl = document.querySelector("#practiceCatalog");
const leaderboardListEl = document.querySelector("#leaderboardList");
const leaderboardCountEl = document.querySelector("#leaderboardCount");
const comboFloatEl = document.querySelector("#comboFloat");
const gameTabButton = document.querySelector("#gameTabButton");
const practiceTabButton = document.querySelector("#practiceTabButton");
const mistakeTabButton = document.querySelector("#mistakeTabButton");
const leaderboardTabButton = document.querySelector("#leaderboardTabButton");
const bgmAudio = document.querySelector("#bgmAudio");
const clickAudio = document.querySelector("#clickAudio");
const correctAudio = document.querySelector("#correctAudio");
const wrongAudio = document.querySelector("#wrongAudio");
const comboAudioByCount = {
  3: document.querySelector("#comboWin3Audio"),
  5: document.querySelector("#comboWin5Audio"),
  7: document.querySelector("#comboWin7Audio"),
  9: document.querySelector("#comboWin9Audio"),
  11: document.querySelector("#comboWin11Audio"),
};

const QUESTION_SECONDS = 20;
const OPTION_COUNT = 4;
const GAME_TOTAL = 20;
const PRACTICE_TOTAL = 10;
const LEADERBOARD_KEY = "aiMathPracticeLeaderboard";

let score = 0;
let correctCount = 0;
let wrongCount = 0;
let comboCount = 0;
let bestCombo = 0;
let round = 1;
let timeLeft = QUESTION_SECONDS;
let timerId = null;
let nextQuestionTimeoutId = null;
let activeQuestion = null;
let acceptingAnswers = true;
let mistakeBook = [];
let practiceMode = null;
let audioUnlocked = false;
let leaderboard = loadLeaderboard();

const mistakeTemplates = [
  {
    name: "加法进位漏算",
    tag: "加法",
    skill: "练习两位数加法的进位，看到个位满10时记得向十位加1。",
    make() {
      const onesA = rand(6, 9);
      const onesB = rand(5, 9);
      const tensA = rand(2, 7);
      const tensB = rand(1, 8);
      const a = tensA * 10 + onesA;
      const b = tensB * 10 + onesB;
      const correct = a + b;
      const wrong = correct - 10;
      return {
        expression: `${a} + ${b}`,
        correct,
        wrong,
        reason: "个位相加超过10，需要向十位进1。这个错题少加了进位的1。",
      };
    },
  },
  {
    name: "减法退位忘记",
    tag: "减法",
    skill: "练习两位数减法的退位，个位不够减时先向十位借1。",
    make() {
      const tensA = rand(4, 9);
      const onesA = rand(0, 4);
      const tensB = rand(1, tensA - 1);
      const onesB = rand(onesA + 1, 9);
      const a = tensA * 10 + onesA;
      const b = tensB * 10 + onesB;
      const correct = a - b;
      const wrong = Math.abs(onesA - onesB) + (tensA - tensB) * 10;
      return {
        expression: `${a} - ${b}`,
        correct,
        wrong,
        reason: "个位不够减时要从十位借1。错题把个位直接相减，没有处理退位。",
      };
    },
  },
  {
    name: "乘法口诀记错",
    tag: "乘法",
    skill: "练习常见乘法口诀，用熟悉的口诀快速检查结果。",
    make() {
      const a = rand(3, 9);
      const b = rand(3, 9);
      const correct = a * b;
      const wrong = correct + pick([-2, -1, 1, 2, 3].filter((n) => correct + n > 0));
      return {
        expression: `${a} × ${b}`,
        correct,
        wrong,
        reason: `这道题要用乘法口诀，${a} × ${b} 的正确结果是 ${correct}。`,
      };
    },
  },
  {
    name: "除法商算错",
    tag: "除法",
    skill: "练习整除算式，用乘法反向检查商是否正确。",
    make() {
      const b = rand(3, 9);
      const correct = rand(3, 9);
      const a = b * correct;
      const wrong = correct + pick([-2, -1, 1, 2].filter((n) => correct + n > 0));
      return {
        expression: `${a} ÷ ${b}`,
        correct,
        wrong,
        reason: `除法可以反过来检查：${b} × ${correct} = ${a}，所以商是 ${correct}。`,
      };
    },
  },
  {
    name: "先加后乘",
    tag: "混合运算",
    skill: "练习没有括号时的计算顺序，先算乘除再算加减。",
    make() {
      const a = rand(2, 9);
      const b = rand(2, 8);
      const c = rand(2, 9);
      const correct = a + b * c;
      const wrong = (a + b) * c;
      return {
        expression: `${a} + ${b} × ${c}`,
        correct,
        wrong,
        reason: "没有括号时要先算乘除，再算加减。错题先算了加法。",
      };
    },
  },
  {
    name: "多数字加减漏算",
    tag: "多数字",
    skill: "练习三个数字以上的连加连减，逐步计算时不要漏掉中间数。",
    make() {
      const a = rand(18, 58);
      const b = rand(12, 49);
      const c = rand(6, 38);
      const correct = a + b - c;
      return {
        expression: `${a} + ${b} - ${c}`,
        correct,
        wrong: correct + pick([-10, -5, 5, 10]),
        reason: "多个数字连续计算时要按顺序一步一步算，错题漏算或多算了其中一步。",
      };
    },
  },
  {
    name: "多数字乘加顺序错",
    tag: "多数字",
    skill: "练习三个数字以上的混合运算，先算乘除，再算加减。",
    make() {
      const a = rand(2, 9);
      const b = rand(2, 8);
      const c = rand(2, 9);
      const d = rand(3, 18);
      const correct = a * b + c - d;
      return {
        expression: `${a} × ${b} + ${c} - ${d}`,
        correct,
        wrong: a * (b + c) - d,
        reason: "多个数字混合运算时，乘法要先算。错题把加法提前和乘法混在一起了。",
      };
    },
  },
];

function startGame() {
  showGamePage();
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  comboCount = 0;
  bestCombo = 0;
  round = 1;
  practiceMode = null;
  clearTimers();
  nextQuestion();
  updateMistakeBook();
}

function showGamePage() {
  gamePageEl.classList.remove("hidden");
  practicePageEl.classList.add("hidden");
  mistakePageEl.classList.add("hidden");
  leaderboardPageEl.classList.add("hidden");
  gameTabButton.classList.add("active");
  practiceTabButton.classList.remove("active");
  mistakeTabButton.classList.remove("active");
  leaderboardTabButton.classList.remove("active");
}

function showPracticePage() {
  clearTimers();
  acceptingAnswers = false;
  practiceMode = null;
  timeLeft = QUESTION_SECONDS;
  updateStats();
  gamePageEl.classList.add("hidden");
  practicePageEl.classList.remove("hidden");
  mistakePageEl.classList.add("hidden");
  leaderboardPageEl.classList.add("hidden");
  gameTabButton.classList.remove("active");
  practiceTabButton.classList.add("active");
  mistakeTabButton.classList.remove("active");
  leaderboardTabButton.classList.remove("active");
  renderPracticeCatalog();
}

function showMistakePage() {
  clearTimers();
  acceptingAnswers = false;
  practiceMode = null;
  timeLeft = QUESTION_SECONDS;
  updateStats();
  updateMistakeBook();
  gamePageEl.classList.add("hidden");
  practicePageEl.classList.add("hidden");
  mistakePageEl.classList.remove("hidden");
  leaderboardPageEl.classList.add("hidden");
  gameTabButton.classList.remove("active");
  practiceTabButton.classList.remove("active");
  mistakeTabButton.classList.add("active");
  leaderboardTabButton.classList.remove("active");
}

function showLeaderboardPage() {
  clearTimers();
  acceptingAnswers = false;
  practiceMode = null;
  timeLeft = QUESTION_SECONDS;
  updateStats();
  renderLeaderboard();
  gamePageEl.classList.add("hidden");
  practicePageEl.classList.add("hidden");
  mistakePageEl.classList.add("hidden");
  leaderboardPageEl.classList.remove("hidden");
  gameTabButton.classList.remove("active");
  practiceTabButton.classList.remove("active");
  mistakeTabButton.classList.remove("active");
  leaderboardTabButton.classList.add("active");
}

function tick() {
  timeLeft -= 1;
  timeLeftEl.textContent = timeLeft;

  if (timeLeft <= 0) {
    clearInterval(timerId);
    endRound(false, "时间到");
  }
}

function nextQuestion() {
  clearTimers();
  timeLeft = QUESTION_SECONDS;
  acceptingAnswers = true;
  nextQuestionButton.classList.add("hidden");
  feedbackEl.className = "feedback hidden";
  activeQuestion = buildQuestion(practiceMode?.templateName);
  updateStats();
  renderChoices(activeQuestion);
  timerId = setInterval(tick, 1000);
}

function buildQuestion(templateName = null) {
  const template = templateName
    ? mistakeTemplates.find((item) => item.name === templateName) ?? pick(mistakeTemplates)
    : pick(mistakeTemplates);
  const mistake = template.make();
  const formulas = [
    {
      expression: mistake.expression,
      result: mistake.wrong,
      isWrong: true,
      reason: mistake.reason,
      templateName: template.name,
      tag: template.tag,
      correctFormula: `${mistake.expression} = ${mistake.correct}`,
    },
  ];

  while (formulas.length < OPTION_COUNT) {
    const candidate = makeCorrectFormula();
    const text = `${candidate.expression} = ${candidate.result}`;
    const duplicate = formulas.some((item) => `${item.expression} = ${item.result}` === text);
    if (!duplicate) {
      formulas.push({ ...candidate, isWrong: false });
    }
  }

  return {
    tag: template.tag,
    templateName: template.name,
    formulas: shuffle(formulas),
    mistake,
  };
}

function makeCorrectFormula() {
  const type = rand(1, 5);

  if (type === 1) {
    const a = rand(12, 89);
    const b = rand(8, 69);
    return { expression: `${a} + ${b}`, result: a + b };
  }

  if (type === 2) {
    const a = rand(30, 99);
    const b = rand(8, a - 1);
    return { expression: `${a} - ${b}`, result: a - b };
  }

  if (type === 3) {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return { expression: `${a} × ${b}`, result: a * b };
  }

  if (type === 4) {
    const b = rand(2, 9);
    const result = rand(2, 9);
    return { expression: `${b * result} ÷ ${b}`, result };
  }

  const a = rand(2, 9);
  const b = rand(2, 8);
  const c = rand(2, 9);
  return { expression: `${a} + ${b} × ${c}`, result: a + b * c };
}

function renderChoices(question) {
  choicesEl.innerHTML = "";
  document.querySelector("#difficultyTag").textContent = question.tag;

  question.formulas.forEach((formula, index) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.dataset.index = String(index);
    button.innerHTML = `
      <span class="formula">${formula.expression} = ${formula.result}</span>
      <span class="hint">第 ${index + 1} 个算式</span>
      <span class="choice-feedback"></span>
    `;
    button.addEventListener("click", () => chooseFormula(index));
    choicesEl.appendChild(button);
  });
}

function chooseFormula(index) {
  if (!acceptingAnswers || timeLeft <= 0) {
    return;
  }

  playClick();
  const selected = activeQuestion.formulas[index];
  endRound(selected.isWrong, selected.isWrong ? "找对了" : "选错了", index);
}

function endRound(success, title, selectedIndex = null) {
  if (!acceptingAnswers) {
    return;
  }

  clearInterval(timerId);
  acceptingAnswers = false;
  const buttons = [...document.querySelectorAll(".choice")];
  const answerIndex = activeQuestion.formulas.findIndex((item) => item.isWrong);

  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === answerIndex) {
      button.classList.add("answer");
    }
    if (selectedIndex === index && !activeQuestion.formulas[index].isWrong) {
      button.classList.add("correct-formula");
    }
  });

  if (success) {
    correctCount += 1;
    comboCount += 1;
    bestCombo = Math.max(bestCombo, comboCount);
    score += comboCount >= 3 ? 2 : 1;
    showComboFloat();
    playCorrectVoice();
  } else {
    wrongCount += 1;
    comboCount = 0;
    score -= 2;
    playSound(wrongAudio);
    recordMistake(activeQuestion.formulas[answerIndex], title);
  }
  updateStats();
  updateMistakeBook();

  const wrongFormula = activeQuestion.formulas[answerIndex];
  const answerButton = buttons[answerIndex];
  const selectedButton = selectedIndex === null ? null : buttons[selectedIndex];
  const answerFeedback = answerButton.querySelector(".choice-feedback");
  answerFeedback.innerHTML = `
    <strong>${success ? "找对了！" : "这题错在这里"}</strong>
    <span>正确：${wrongFormula.correctFormula}</span>
    <span>原因：${wrongFormula.reason}</span>
  `;

  if (!success && selectedButton && selectedButton !== answerButton) {
    selectedButton.querySelector(".choice-feedback").innerHTML = "<strong>这个算式是正确的</strong>";
  }

  feedbackEl.className = "feedback hidden";
  feedbackEl.textContent = "";

  if (round >= getRoundTotal()) {
    finishRoundSet();
    return;
  }

  nextQuestionButton.classList.remove("hidden");
}

function updateStats() {
  scoreEl.textContent = score;
  correctCountEl.textContent = correctCount;
  wrongCountEl.textContent = wrongCount;
  comboCountEl.textContent = comboCount;
  roundEl.textContent = `${round}/${getRoundTotal()}`;
  timeLeftEl.textContent = timeLeft;
  modeNameEl.textContent = practiceMode ? practiceMode.shortName : "随机";
  roundLabelEl.textContent = "进度";
}

function recordMistake(wrongFormula, outcome) {
  mistakeBook.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    expression: wrongFormula.expression,
    wrongResult: wrongFormula.result,
    correctFormula: wrongFormula.correctFormula,
    reason: wrongFormula.reason,
    templateName: wrongFormula.templateName,
    tag: wrongFormula.tag,
    outcome,
  });
}

function updateMistakeBook() {
  mistakeCountEl.textContent = `${mistakeBook.length} 题`;
  mistakeGroupsEl.innerHTML = "";

  if (mistakeBook.length === 0) {
    mistakeGroupsEl.innerHTML = '<p class="empty-state">暂时没有错题。答错或超时后，这里会按错误原因自动整理。</p>';
    return;
  }

  const groups = mistakeTemplates
    .map((template) => ({
      template,
      mistakes: mistakeBook.filter((item) => item.templateName === template.name),
    }))
    .filter((group) => group.mistakes.length > 0);

  groups.forEach(({ template, mistakes }) => {
    const latestMistakes = mistakes.slice(0, 2);
    const card = document.createElement("article");
    card.className = "mistake-group";
    card.innerHTML = `
      <div>
        <h3>${template.name}</h3>
        <p>${template.tag} · 已记录 ${mistakes.length} 题</p>
      </div>
      <button class="practice-button" type="button" data-template="${template.name}">
        专项练习
      </button>
      <ul class="mistake-list">
        ${latestMistakes
          .map(
            (item) =>
              `<li>
                <strong class="mistake-formula">${item.expression} = ${item.wrongResult}</strong>
                <span>正确：${item.correctFormula}</span>
                <small>${item.reason}</small>
              </li>`,
          )
          .join("")}
      </ul>
    `;
    mistakeGroupsEl.appendChild(card);
  });
}

function renderPracticeCatalog() {
  practiceCatalogEl.innerHTML = "";

  mistakeTemplates.forEach((template) => {
    const mistakeCount = mistakeBook.filter((item) => item.templateName === template.name).length;
    const card = document.createElement("article");
    card.className = "practice-card";
    card.innerHTML = `
      <div>
        <h3>${template.name}</h3>
        <p>${template.skill}</p>
      </div>
      <div class="practice-meta">
        <span>${template.tag}</span>
        <span>10 题</span>
        <span>错题 ${mistakeCount} 题</span>
      </div>
      <button class="practice-button" type="button" data-template="${template.name}">
        开始练习
      </button>
    `;
    practiceCatalogEl.appendChild(card);
  });
}

function startPractice(templateName) {
  const template = mistakeTemplates.find((item) => item.name === templateName);
  if (!template) {
    return;
  }

  showGamePage();
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  comboCount = 0;
  bestCombo = 0;
  round = 1;
  practiceMode = {
    templateName,
    shortName: template.name,
  };
  clearTimers();
  nextQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finishRoundSet() {
  clearTimers();
  acceptingAnswers = false;
  const perfectBonus = wrongCount === 0 ? 10 : 0;
  if (perfectBonus > 0) {
    score += perfectBonus;
    updateStats();
  }
  saveLeaderboardEntry(perfectBonus);
  feedbackEl.className = "feedback success";
  feedbackEl.innerHTML = `
    <h2>${practiceMode ? "专项练习完成" : "找茬训练完成"}</h2>
    <p>本轮 ${getRoundTotal()} 题，正确 ${correctCount} 题，错误 ${wrongCount} 题，积分 ${score}。</p>
    ${perfectBonus ? "<p>全对奖励 +10 分！</p>" : ""}
  `;
  nextQuestionButton.classList.add("hidden");
}

function clearTimers() {
  clearInterval(timerId);
  clearTimeout(nextQuestionTimeoutId);
  timerId = null;
  nextQuestionTimeoutId = null;
}

function getRoundTotal() {
  return practiceMode ? PRACTICE_TOTAL : GAME_TOTAL;
}

function showComboFloat() {
  if (comboCount < 3) {
    return;
  }
  comboFloatEl.textContent = `x${comboCount}连胜`;
  comboFloatEl.classList.remove("hidden", "pop");
  void comboFloatEl.offsetWidth;
  comboFloatEl.classList.add("pop");
  window.setTimeout(() => comboFloatEl.classList.add("hidden"), 900);
}

function saveLeaderboardEntry(perfectBonus) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    score,
    correct: correctCount,
    wrong: wrongCount,
    bestCombo,
    total: getRoundTotal(),
    mode: practiceMode ? practiceMode.shortName : "随机找茬",
    perfectBonus,
    createdAt: new Date().toISOString(),
  };
  leaderboard.unshift(entry);
  leaderboard = leaderboard.sort((a, b) => b.score - a.score || b.correct - a.correct).slice(0, 30);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch {}
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderLeaderboard() {
  leaderboardCountEl.textContent = `${leaderboard.length} 次`;
  if (leaderboard.length === 0) {
    leaderboardListEl.innerHTML = '<p class="empty-state">完成一次挑战后，这里会记录历史得分。</p>';
    return;
  }
  leaderboardListEl.innerHTML = leaderboard
    .map(
      (item, index) => `
        <article class="leaderboard-item">
          <strong class="rank">#${index + 1}</strong>
          <div>
            <h3>${item.score} 分</h3>
            <p>${item.mode} · ${item.correct}/${item.total} 正确 · 错误 ${item.wrong}</p>
          </div>
          <span>${formatDate(item.createdAt)}</span>
        </article>
      `,
    )
    .join("");
}

function formatDate(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[rand(0, items.length - 1)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

newGameButton.addEventListener("click", startGame);
nextQuestionButton.addEventListener("click", () => {
  playClick();
  if (acceptingAnswers) {
    return;
  }
  round += 1;
  nextQuestion();
});
gameTabButton.addEventListener("click", () => {
  playClick();
  startGame();
});
practiceTabButton.addEventListener("click", () => {
  playClick();
  showPracticePage();
});
mistakeTabButton.addEventListener("click", () => {
  playClick();
  showMistakePage();
});
leaderboardTabButton.addEventListener("click", () => {
  playClick();
  showLeaderboardPage();
});
mistakeGroupsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".practice-button");
  if (!button) {
    return;
  }
  playClick();
  startPractice(button.dataset.template);
});
practiceCatalogEl.addEventListener("click", (event) => {
  const button = event.target.closest(".practice-button");
  if (!button) {
    return;
  }
  playClick();
  startPractice(button.dataset.template);
});

document.addEventListener(
  "pointerdown",
  () => {
    unlockAudio();
  },
  { once: true },
);

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }
  audioUnlocked = true;
  bgmAudio.volume = 0.22;
  clickAudio.volume = 0.35;
  correctAudio.volume = 0.45;
  wrongAudio.volume = 0.4;
  Object.values(comboAudioByCount).forEach((audio) => {
    if (audio) {
      audio.volume = 0.75;
    }
  });
  bgmAudio.play().catch(() => {});
}

function playClick() {
  unlockAudio();
  playSound(clickAudio);
}

function playSound(audio) {
  if (!audio) {
    return;
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playCorrectVoice() {
  const comboAudio = comboAudioByCount[comboCount];
  if (comboAudio) {
    playSound(comboAudio);
    return;
  }
  playSound(correctAudio);
}

startGame();
