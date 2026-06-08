const timeLeftEl = document.querySelector("#timeLeft");
const scoreEl = document.querySelector("#score");
const roundEl = document.querySelector("#round");
const choicesEl = document.querySelector("#choices");
const feedbackEl = document.querySelector("#feedback");
const newGameButton = document.querySelector("#newGameButton");
const mistakeCountEl = document.querySelector("#mistakeCount");
const mistakeGroupsEl = document.querySelector("#mistakeGroups");
const modeNameEl = document.querySelector("#modeName");
const roundLabelEl = document.querySelector("#roundLabel");
const clockHandEl = document.querySelector("#clockHand");
const timerEl = document.querySelector(".timer");
const gamePageEl = document.querySelector("#gamePage");
const practicePageEl = document.querySelector("#practicePage");
const practiceCatalogEl = document.querySelector("#practiceCatalog");
const gameTabButton = document.querySelector("#gameTabButton");
const practiceTabButton = document.querySelector("#practiceTabButton");

const QUESTION_SECONDS = 20;
const OPTION_COUNT = 4;
const PRACTICE_TOTAL = 10;

let score = 0;
let round = 1;
let timeLeft = QUESTION_SECONDS;
let timerId = null;
let nextQuestionTimeoutId = null;
let activeQuestion = null;
let acceptingAnswers = true;
let mistakeBook = [];
let practiceMode = null;

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
];

function startGame() {
  showGamePage();
  score = 0;
  round = 1;
  practiceMode = null;
  clearTimers();
  nextQuestion();
  updateMistakeBook();
}

function showGamePage() {
  gamePageEl.classList.remove("hidden");
  practicePageEl.classList.add("hidden");
  timerEl.classList.remove("hidden");
  gameTabButton.classList.add("active");
  practiceTabButton.classList.remove("active");
}

function showPracticePage() {
  clearTimers();
  acceptingAnswers = false;
  practiceMode = null;
  timeLeft = QUESTION_SECONDS;
  updateStats();
  gamePageEl.classList.add("hidden");
  practicePageEl.classList.remove("hidden");
  timerEl.classList.add("hidden");
  gameTabButton.classList.remove("active");
  practiceTabButton.classList.add("active");
  renderPracticeCatalog();
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
    `;
    button.addEventListener("click", () => chooseFormula(index));
    choicesEl.appendChild(button);
  });
}

function chooseFormula(index) {
  if (!acceptingAnswers || timeLeft <= 0) {
    return;
  }

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
      button.classList.add(success ? "correct-pick" : "answer");
    }
    if (!success && selectedIndex === index) {
      button.classList.add("wrong-pick");
    }
  });

  if (success) {
    score += 1;
  } else {
    recordMistake(activeQuestion.formulas[answerIndex], title);
  }
  updateStats();
  updateMistakeBook();

  const wrongFormula = activeQuestion.formulas[answerIndex];
  feedbackEl.className = `feedback ${success ? "success" : "fail"}`;
  feedbackEl.innerHTML = `
    <h2>${success ? "答对了！" : title}</h2>
    <p>错误算式是：${wrongFormula.expression} = ${wrongFormula.result}</p>
    <p>正确答案是：${wrongFormula.correctFormula}</p>
    <p>错误原因：${wrongFormula.reason}</p>
  `;

  if (practiceMode && round >= PRACTICE_TOTAL) {
    finishPractice();
    return;
  }

  nextQuestionTimeoutId = window.setTimeout(() => {
    round += 1;
    nextQuestion();
  }, success ? 1300 : 5000);
}

function updateStats() {
  scoreEl.textContent = score;
  roundEl.textContent = round;
  timeLeftEl.textContent = timeLeft;
  modeNameEl.textContent = practiceMode ? practiceMode.shortName : "随机";
  roundLabelEl.textContent = practiceMode ? `专项 ${PRACTICE_TOTAL} 题` : "本题";
  updateClockHand();
}

function updateClockHand() {
  const elapsed = QUESTION_SECONDS - timeLeft;
  const degrees = (elapsed / QUESTION_SECONDS) * 360;
  clockHandEl.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
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
    const latestMistakes = mistakes.slice(0, 3);
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
              `<li>${item.expression} = ${item.wrongResult}，正确：${item.correctFormula}</li>`,
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
  round = 1;
  practiceMode = {
    templateName,
    shortName: template.name,
  };
  clearTimers();
  nextQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finishPractice() {
  clearTimers();
  acceptingAnswers = false;
  feedbackEl.className = "feedback success";
  feedbackEl.innerHTML += `
    <p>专项练习完成：${practiceMode.templateName}，本轮答对 ${score} / ${PRACTICE_TOTAL} 题。</p>
  `;
}

function clearTimers() {
  clearInterval(timerId);
  clearTimeout(nextQuestionTimeoutId);
  timerId = null;
  nextQuestionTimeoutId = null;
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
gameTabButton.addEventListener("click", startGame);
practiceTabButton.addEventListener("click", showPracticePage);
mistakeGroupsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".practice-button");
  if (!button) {
    return;
  }
  startPractice(button.dataset.template);
});
practiceCatalogEl.addEventListener("click", (event) => {
  const button = event.target.closest(".practice-button");
  if (!button) {
    return;
  }
  startPractice(button.dataset.template);
});

startGame();
