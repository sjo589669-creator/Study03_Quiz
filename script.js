// 상식 퀴즈 게임 — PRD.md 5절 구조
// 브라우저: index.html이 questions.js 다음에 이 파일을 불러옵니다.
// 자체 점검: 주소 끝에 ?test 를 붙이거나, 터미널에서 node script.js --test

(function () {
  "use strict";

  var CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];
  var PER_GAME = 10;
  var SPEED_SECONDS = 15;
  var MODES = {
    practice: { name: "연습", rule: "시간 제한·힌트 없음, 맞히면 1점 · 순위표에 기록되지 않음" },
    speed: { name: "스피드", rule: "문항마다 15초, 시간이 지나면 오답 · 맞히면 1점" },
    hint: { name: "힌트", rule: "문항마다 힌트 1번(오답 2개 지우기) · 힌트를 쓰고 맞히면 0.5점" }
  };

  // ── 순수 함수 ─────────────────────────────────────────────
  function shuffle(arr, rnd) {
    rnd = rnd || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function validateQuestions(qs) {
    var errors = [];
    if (!Array.isArray(qs)) return ["문항 목록이 없습니다"];
    var ids = {};
    CATEGORIES.forEach(function (c) {
      var n = qs.filter(function (q) { return q.category === c; }).length;
      if (n !== PER_GAME) errors.push(c + " 문항이 " + n + "개입니다(10개여야 함)");
    });
    qs.forEach(function (q) {
      if (ids[q.id]) errors.push("id 중복: " + q.id);
      ids[q.id] = true;
      if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(q.id + ": 보기가 4개가 아님");
      else if (new Set(q.choices).size !== 4) errors.push(q.id + ": 보기가 겹침");
      if (!(q.answer >= 0 && q.answer <= 3) || Math.floor(q.answer) !== q.answer) errors.push(q.id + ": answer가 0~3이 아님");
      if (!q.explanation) errors.push(q.id + ": 해설 없음");
      if (!q.source || !/^https:\/\//.test(q.source.url || "")) errors.push(q.id + ": https 출처 없음");
    });
    return errors;
  }

  // 한 문항을 화면용으로 준비: 보기를 섞고 정답 위치를 다시 계산
  function prepareQuestion(q, rnd) {
    var choices = shuffle(q.choices, rnd);
    return {
      id: q.id, category: q.category, question: q.question,
      choices: choices,
      correctIndex: choices.indexOf(q.choices[q.answer]),
      answerText: q.choices[q.answer],
      explanation: q.explanation, source: q.source
    };
  }

  function buildGame(qs, category, rnd) {
    var pool = qs.filter(function (q) { return q.category === category; });
    return shuffle(pool, rnd).slice(0, PER_GAME).map(function (q) { return prepareQuestion(q, rnd); });
  }

  function scoreFor(mode, correct, hintUsed) {
    if (!correct) return 0;
    if (mode === "hint" && hintUsed) return 0.5;
    return 1;
  }

  // 힌트: 정답이 아닌 보기 번호 중 2개를 고름
  function pickHintRemovals(correctIndex, rnd) {
    var wrong = [0, 1, 2, 3].filter(function (i) { return i !== correctIndex; });
    return shuffle(wrong, rnd).slice(0, 2);
  }

  // 결과 목록에서 틀린(시간 초과 포함) 문항만
  function wrongOnes(results) {
    return results.filter(function (r) { return r.status !== "correct"; }).map(function (r) { return r.q; });
  }

  function formatScore(n) { return (Math.round(n * 10) / 10).toString(); }

  // ── 자체 점검 ─────────────────────────────────────────────
  function runSelfTest(qs, log) {
    log = log || console;
    var pass = 0, fail = 0;
    function check(name, ok) {
      if (ok) { pass++; log.log("통과: " + name); }
      else { fail++; log.error("실패: " + name); }
    }
    var seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    check("1. 카테고리 4개 × 10문항 = 40문항", qs.length === 40 && CATEGORIES.every(function (c) {
      return qs.filter(function (q) { return q.category === c; }).length === 10; }));
    check("2. 보기 4개가 서로 다름", qs.every(function (q) { return new Set(q.choices).size === 4; }));
    check("3. answer가 0~3", qs.every(function (q) { return [0, 1, 2, 3].indexOf(q.answer) >= 0; }));
    check("4. id가 겹치지 않음", new Set(qs.map(function (q) { return q.id; })).size === qs.length);
    check("5. 모든 문항에 해설과 https 출처", qs.every(function (q) {
      return q.explanation && q.source && /^https:\/\//.test(q.source.url); }));
    var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var sh = shuffle(arr, rnd);
    check("6. shuffle이 원소를 잃지 않음", sh.length === 10 && sh.slice().sort(function (a, b) { return a - b; }).join() === arr.join());
    var game = buildGame(qs, "과학", rnd);
    check("7. 한 판이 10문항", game.length === 10);
    check("8. 판 문항이 모두 고른 카테고리", game.every(function (q) { return q.category === "과학"; }));
    check("9. 보기 섞기 뒤에도 정답 유지", game.every(function (g) {
      var orig = qs.filter(function (q) { return q.id === g.id; })[0];
      return g.choices[g.correctIndex] === orig.choices[orig.answer]; }));
    check("10. 연습 정답 1점", scoreFor("practice", true, false) === 1 && scoreFor("speed", true, false) === 1);
    check("11. 오답·시간 초과 0점", scoreFor("practice", false, false) === 0 && scoreFor("speed", false, false) === 0 && scoreFor("hint", false, true) === 0);
    var results = game.map(function (q, i) {
      var ok = i % 3 !== 0;
      return { q: q, status: ok ? "correct" : "wrong", points: scoreFor("practice", ok, false) };
    });
    var total = results.reduce(function (s, r) { return s + r.points; }, 0);
    var right = results.filter(function (r) { return r.status === "correct"; }).length;
    check("12. 결과 점수 = 맞힌 개수", total === right);
    check("13. 힌트 쓰고 맞히면 0.5점, 안 쓰면 1점", scoreFor("hint", true, true) === 0.5 && scoreFor("hint", true, false) === 1);
    var hintOk = game.every(function (g) {
      var rm = pickHintRemovals(g.correctIndex, rnd);
      return rm.length === 2 && rm.indexOf(g.correctIndex) < 0 && rm[0] !== rm[1];
    });
    check("14. 힌트는 정답을 지우지 않고 오답 2개만 지움", hintOk);
    var retry = wrongOnes(results);
    var before = total;
    check("15. 다시 풀기 대상은 틀린 문항만이고 처음 점수 유지",
      retry.length === results.length - right && retry.every(function (q) {
        return results.some(function (r) { return r.q === q && r.status !== "correct"; }); }) && before === total);

    log.log("자체 점검 결과: 통과 " + pass + ", 실패 " + fail);
    return { pass: pass, fail: fail };
  }

  // ── Node에서 실행: node script.js --test ───────────────────
  if (typeof document === "undefined") {
    if (typeof module !== "undefined") {
      var api = { shuffle: shuffle, validateQuestions: validateQuestions, scoreFor: scoreFor,
        buildGame: buildGame, pickHintRemovals: pickHintRemovals, wrongOnes: wrongOnes, runSelfTest: runSelfTest };
      module.exports = api;
      if (require.main === module && process.argv.indexOf("--test") >= 0) {
        var r = runSelfTest(require("./questions.js"));
        process.exitCode = r.fail === 0 ? 0 : 1;
      }
    }
    return;
  }

  // ── 브라우저 화면 ─────────────────────────────────────────
  var app = document.getElementById("app");
  var DATA = typeof QUESTIONS !== "undefined" ? QUESTIONS : [];
  var state = {};

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "class") node.className = attrs[k];
      else if (k === "onclick") node.addEventListener("click", attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function render(nodes) {
    app.innerHTML = "";
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  function showStart() {
    stopTimer();
    var errors = validateQuestions(DATA);
    if (errors.length) {
      render([el("h1", { text: "상식 퀴즈" }), el("p", { class: "error", text: "문항 데이터 오류" }),
        el("p", { class: "sub", text: errors.join(" / ") })]);
      return;
    }
    var grid = el("div", { class: "grid" }, CATEGORIES.map(function (c) {
      return el("button", { class: "btn cat-btn", type: "button", text: c, onclick: function () { showModeSelect(c); } });
    }));
    render([
      el("h1", { text: "상식 퀴즈" }),
      el("p", { class: "sub", text: "카테고리를 고르면 10문제를 풉니다." }),
      grid
    ]);
  }

  function showModeSelect(category) {
    stopTimer();
    var list = el("div", { class: "mode-list" }, Object.keys(MODES).map(function (key) {
      return el("button", { class: "btn mode-btn", type: "button", "data-mode": key, onclick: function () { startGame(category, key); } }, [
        el("strong", { text: MODES[key].name }),
        el("span", { text: MODES[key].rule })
      ]);
    }));
    render([
      el("h2", { text: category + " · 모드를 고르세요" }),
      list,
      el("button", { class: "btn ghost", type: "button", text: "뒤로", onclick: showStart })
    ]);
  }

  function startGame(category, mode) {
    stopTimer();
    state = {
      category: category, mode: mode, list: buildGame(DATA, category),
      index: 0, score: 0, results: [], retry: false, timerId: null
    };
    renderQuestion();
  }

  function startRetry() {
    stopTimer();
    var wrong = wrongOnes(state.lastPass);
    state.list = shuffle(wrong).map(function (q) { return prepareQuestion(reorig(q)); });
    state.index = 0;
    state.retry = true;
    state.retryResults = [];
    renderQuestion();
  }

  // 화면용 문항에서 원래 문항(choices 원래 순서)을 다시 찾음
  function reorig(g) {
    return DATA.filter(function (q) { return q.id === g.id; })[0];
  }

  function renderQuestion() {
    stopTimer();
    var q = state.list[state.index];
    state.answered = false;
    state.hintUsed = false;
    state.removed = [];

    var modeLabel = MODES[state.mode].name + (state.retry ? " · 다시 풀기" : "");
    var status = el("div", { class: "status" }, [
      el("span", {}, [el("b", { text: state.category + " · " + modeLabel })]),
      el("span", { text: (state.index + 1) + " / " + state.list.length }),
      state.retry ? el("span", { text: "채점하지 않음" }) : el("span", { id: "score", text: "점수 " + formatScore(state.score) })
    ]);
    if (state.mode === "speed" && !state.retry) {
      status.appendChild(el("span", { id: "timer", class: "timer", text: "남은 시간 " + SPEED_SECONDS + "초" }));
    }

    var choiceBtns = q.choices.map(function (c, i) {
      return el("button", { class: "btn choice", type: "button", "data-index": String(i), text: c, onclick: function () { choose(i); } });
    });
    state.choiceBtns = choiceBtns;

    var nodes = [status, el("div", { class: "question", text: q.question }), el("div", { class: "choices" }, choiceBtns)];

    if (state.mode === "hint" && !state.retry) {
      state.hintBtn = el("button", { class: "btn", type: "button", id: "hint", text: "힌트 (오답 2개 지우기)", onclick: useHint });
      nodes.push(el("div", { class: "hint-row" }, [state.hintBtn]));
    }
    state.feedbackBox = el("div", { id: "feedback" });
    nodes.push(state.feedbackBox);
    render(nodes);

    if (state.mode === "speed" && !state.retry) startTimer();
  }

  function startTimer() {
    stopTimer();
    state.timeLeft = SPEED_SECONDS;
    updateTimer();
    state.timerId = setInterval(function () {
      state.timeLeft -= 1;
      updateTimer();
      if (state.timeLeft <= 0) { stopTimer(); timeUp(); }
    }, 1000);
  }

  function updateTimer() {
    var t = document.getElementById("timer");
    if (!t) return;
    t.textContent = "남은 시간 " + state.timeLeft + "초";
    t.classList.toggle("danger", state.timeLeft <= 5);
  }

  function useHint() {
    if (state.answered || state.hintUsed) return;
    var q = state.list[state.index];
    state.hintUsed = true;
    state.removed = pickHintRemovals(q.correctIndex);
    state.removed.forEach(function (i) {
      state.choiceBtns[i].classList.add("removed");
      state.choiceBtns[i].disabled = true;
    });
    state.hintBtn.textContent = "힌트 사용함";
    state.hintBtn.disabled = true;
  }

  function choose(i) {
    if (state.answered || state.removed.indexOf(i) >= 0) return;
    finishQuestion(i === state.list[state.index].correctIndex ? "correct" : "wrong", i);
  }

  function timeUp() {
    if (state.answered) return;
    finishQuestion("timeout", -1);
  }

  function finishQuestion(status, picked) {
    stopTimer();
    state.answered = true;
    var q = state.list[state.index];
    state.choiceBtns.forEach(function (b, i) {
      b.disabled = true;
      if (i === q.correctIndex) b.classList.add("correct");
      else if (i === picked) b.classList.add("wrong");
    });
    if (state.hintBtn) state.hintBtn.disabled = true;

    var correct = status === "correct";
    var points = state.retry ? 0 : scoreFor(state.mode, correct, state.hintUsed);
    var record = { q: q, status: status, hint: state.hintUsed, points: points };
    if (state.retry) state.retryResults.push(record);
    else {
      state.results.push(record);
      state.score += points;
      var s = document.getElementById("score");
      if (s) s.textContent = "점수 " + formatScore(state.score);
    }

    var verdictText = correct ? "정답!" + (state.hintUsed && !state.retry ? " (힌트 0.5점)" : "")
      : status === "timeout" ? "시간 초과 — 정답은 " + q.answerText
      : "오답 — 정답은 " + q.answerText;
    var link = el("a", { href: q.source.url, target: "_blank", rel: "noopener noreferrer", text: "출처: " + q.source.name });
    var last = state.index === state.list.length - 1;
    state.feedbackBox.className = "feedback";
    state.feedbackBox.appendChild(el("p", { class: "verdict " + (correct ? "ok" : "bad"), text: verdictText }));
    state.feedbackBox.appendChild(el("p", { text: q.explanation }));
    state.feedbackBox.appendChild(el("p", {}, [link]));
    state.feedbackBox.appendChild(el("div", { class: "actions" }, [
      el("button", { class: "btn primary", type: "button", id: "next", text: last ? "결과 보기" : "다음", onclick: next })
    ]));
  }

  function next() {
    if (state.index < state.list.length - 1) { state.index += 1; renderQuestion(); }
    else showResult();
  }

  function resultLabel(r) {
    if (r.status === "correct") return r.hint && state.mode === "hint" ? "정답 (힌트 0.5점)" : "정답";
    return r.status === "timeout" ? "시간 초과" : "오답";
  }

  function showResult() {
    stopTimer();
    var pass = state.retry ? state.retryResults : state.results;
    state.lastPass = pass;
    var nodes = [el("h2", { text: state.category + " · " + MODES[state.mode].name + " 결과" })];
    nodes.push(el("p", { class: "score", id: "final-score", text: "점수 " + formatScore(state.score) + " / " + PER_GAME }));
    if (state.mode === "practice") nodes.push(el("p", {}, [el("span", { class: "notice", text: "순위표에 기록되지 않음" })]));
    if (state.retry) {
      var ok = pass.filter(function (r) { return r.status === "correct"; }).length;
      nodes.push(el("p", { class: "sub", text: "다시 풀기: " + pass.length + "문항 중 " + ok + "문항 맞힘 (채점하지 않음, 처음 점수 그대로)" }));
    }
    var list = el("ul", { class: "result-list" }, pass.map(function (r, i) {
      return el("li", {}, [
        el("span", { class: "tag " + (r.status === "correct" ? "ok" : "bad"), text: (i + 1) + ". " + resultLabel(r) }),
        el("span", { text: r.q.question + " → " + r.q.answerText })
      ]);
    }));
    var actions = [];
    if (state.mode === "practice" && wrongOnes(pass).length > 0) {
      actions.push(el("button", { class: "btn primary", type: "button", id: "retry", text: "틀린 문제 다시 풀기", onclick: startRetry }));
    }
    actions.push(el("button", { class: "btn", type: "button", id: "again", text: "같은 모드 다시", onclick: function () { startGame(state.category, state.mode); } }));
    actions.push(el("button", { class: "btn ghost", type: "button", id: "home", text: "처음으로", onclick: showStart }));
    nodes.push(el("div", { class: "actions" }, actions));
    nodes.push(list);
    render(nodes);
  }

  window.QuizApp = { state: function () { return state; }, runSelfTest: function () { return runSelfTest(DATA); } };

  if (/[?&]test\b/.test(location.search)) runSelfTest(DATA);
  showStart();
})();
