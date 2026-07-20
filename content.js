/**
 * Guider - 콘텐츠 스크립트
 * 시연영상용 기본 틀. 실제 AI 추론은 하지 않고, 시나리오 기반으로
 * 채팅 응답과 클릭 위치 하이라이트를 보여준다.
 */
(() => {
  // 중복 주입 방지
  if (window.__GUIDER_LOADED__) return;
  window.__GUIDER_LOADED__ = true;

  const LOGO_URL = chrome.runtime.getURL("icons/logo.svg");

  // ---------------------------------------------------------------------------
  // 시연 시나리오: 질문 키워드 -> 응답 문구 + 하이라이트할 요소 선택자 후보
  // 실제 페이지 구조에 맞춰 selectors 를 자유롭게 추가/수정하면 된다.
  // ---------------------------------------------------------------------------
  const SCENARIOS = [
    {
      keywords: ["로그인", "login", "회원"],
      answer:
        "로그인은 상단 메뉴에서 진행할 수 있어요.\n표시된 위치를 클릭해 주세요.",
      label: "여기를 클릭하세요",
      selectors: [
        'a[href*="login"]',
        'a[href*="Login"]',
        'button[class*="login"]',
        "header a",
      ],
    },
    {
      keywords: ["검색", "찾", "데이터", "search"],
      answer:
        "찾으시는 공공데이터는 검색창에서 바로 조회할 수 있어요.\n표시된 검색창에 키워드를 입력해 보세요.",
      label: "여기에 입력하세요",
      selectors: [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="검색"]',
        'input[type="text"]',
      ],
    },
    {
      keywords: ["신청", "다운", "받", "요청"],
      answer:
        "데이터 신청은 상단 '데이터 신청' 메뉴에서 할 수 있어요.\n표시된 메뉴를 클릭해 주세요.",
      label: "여기를 클릭하세요",
      selectors: ['a[href*="apply"]', 'a[href*="request"]', "nav a", "header a"],
    },
    {
      keywords: ["공지", "알림", "notice"],
      answer: "공지사항은 우측 상단에 있어요.\n표시된 위치를 클릭해 주세요.",
      label: "여기를 클릭하세요",
      selectors: ['a[href*="notice"]', 'a[href*="board"]', "header a"],
    },
  ];

  const FALLBACK = {
    answer:
      "요청하신 작업의 위치를 찾았어요.\n화면에 표시된 곳을 클릭해 주세요.",
    label: "여기를 클릭하세요",
    selectors: [
      'input[type="search"]',
      'input[type="text"]',
      "nav a",
      "header a",
      "main a",
      "a",
    ],
  };

  // ---------------------------------------------------------------------------
  // 패널 DOM 생성
  // ---------------------------------------------------------------------------
  const root = document.createElement("div");
  root.id = "guider-root";
  root.setAttribute("data-guider", "");
  root.innerHTML = `
    <div class="guider-panel" role="dialog" aria-label="Guider">
      <header class="guider-header">
        <img class="guider-header__logo" src="${LOGO_URL}" alt="" />
        <span class="guider-header__title">Guider</span>
        <button class="guider-header__btn guider-pin" title="고정" aria-label="고정">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 3l7 7-2.5 1-1.8 5.2-2.6-2.6-5.6 5.6-1-1 5.6-5.6-2.6-2.6L15 8 14 3z" fill="currentColor"/></svg>
        </button>
        <button class="guider-header__btn guider-close" title="닫기" aria-label="닫기">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </header>

      <div class="guider-card">
        <div class="guider-card__brand">
          <img class="guider-card__logo-sm" src="${LOGO_URL}" alt="" />
          <div class="guider-card__brand-text">
            <div class="guider-card__name">Guider</div>
            <div class="guider-card__site"></div>
          </div>
        </div>

        <div class="guider-messages" aria-live="polite">
          <div class="guider-intro">
            <img class="guider-intro__logo" src="${LOGO_URL}" alt="Guider" />
            <h2 class="guider-intro__title">무엇을 도와드릴까요?</h2>
            <p class="guider-intro__desc">
              현재 페이지에서 찾고 싶은 것이나<br />
              하고 싶은 작업을 자유롭게 물어보세요.
            </p>
            <div class="guider-examples">
              <button class="guider-example" data-q="로그인하려면 어떻게 해?">
                <span class="guider-example__tag">예시</span>
                <span class="guider-example__text">"로그인하려면 어떻게 해?"</span>
              </button>
              <button class="guider-example" data-q="교통 데이터 찾아줘">
                <span class="guider-example__tag">예시</span>
                <span class="guider-example__text">"교통 데이터 찾아줘"</span>
              </button>
            </div>
          </div>
        </div>

        <form class="guider-input">
          <textarea
            class="guider-input__field"
            rows="1"
            placeholder="어떤 것을 찾고 계신가요?"
          ></textarea>
          <button type="submit" class="guider-input__send" aria-label="보내기">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 20l18-8L3 4v6l12 2-12 2v6z" fill="currentColor"/></svg>
          </button>
          <div class="guider-input__hint">Enter로 전송 · Shift+Enter로 줄바꿈</div>
        </form>
      </div>
    </div>

    <button class="guider-fab" aria-label="Guider 열기">
      <img src="${LOGO_URL}" alt="" />
    </button>
  `;
  document.documentElement.appendChild(root);

  const panel = root.querySelector(".guider-panel");
  const fab = root.querySelector(".guider-fab");
  const messages = root.querySelector(".guider-messages");
  const form = root.querySelector(".guider-input");
  const field = root.querySelector(".guider-input__field");
  const siteEl = root.querySelector(".guider-card__site");

  siteEl.textContent = document.title || location.hostname;

  // ---------------------------------------------------------------------------
  // 열기 / 닫기
  // ---------------------------------------------------------------------------
  function open() {
    root.classList.add("guider-open");
    setTimeout(() => field.focus(), 250);
  }
  function close() {
    root.classList.remove("guider-open");
    clearHighlight();
  }
  function toggle() {
    root.classList.contains("guider-open") ? close() : open();
  }

  root.querySelector(".guider-close").addEventListener("click", close);
  fab.addEventListener("click", open);
  root.querySelector(".guider-pin").addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("is-active");
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "GUIDER_TOGGLE") toggle();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("guider-open")) close();
  });

  // ---------------------------------------------------------------------------
  // 메시지 렌더링
  // ---------------------------------------------------------------------------
  function clearIntro() {
    const intro = messages.querySelector(".guider-intro");
    if (intro) intro.remove();
  }

  function addMessage(role, text) {
    clearIntro();
    const el = document.createElement("div");
    el.className = `guider-msg guider-msg--${role}`;
    el.innerHTML = `<div class="guider-bubble"></div>`;
    el.querySelector(".guider-bubble").textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function addTyping() {
    clearIntro();
    const el = document.createElement("div");
    el.className = "guider-msg guider-msg--bot guider-typing";
    el.innerHTML = `<div class="guider-bubble"><span></span><span></span><span></span></div>`;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  // ---------------------------------------------------------------------------
  // 클릭 위치 하이라이트
  // ---------------------------------------------------------------------------
  let highlightEl = null;
  let highlightTarget = null;

  function clearHighlight() {
    if (highlightEl) highlightEl.remove();
    highlightEl = null;
    highlightTarget = null;
    window.removeEventListener("scroll", positionHighlight, true);
    window.removeEventListener("resize", positionHighlight);
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  }

  function findTarget(selectors) {
    for (const sel of selectors) {
      const list = document.querySelectorAll(sel);
      for (const el of list) {
        if (el.closest("#guider-root")) continue;
        if (isVisible(el)) return el;
      }
    }
    return null;
  }

  function positionHighlight() {
    if (!highlightEl || !highlightTarget) return;
    const r = highlightTarget.getBoundingClientRect();
    const pad = 8;
    highlightEl.style.top = `${r.top - pad}px`;
    highlightEl.style.left = `${r.left - pad}px`;
    highlightEl.style.width = `${r.width + pad * 2}px`;
    highlightEl.style.height = `${r.height + pad * 2}px`;
  }

  function highlight(target, label) {
    clearHighlight();
    if (!target) return;

    highlightTarget = target;
    highlightEl = document.createElement("div");
    highlightEl.className = "guider-highlight";
    highlightEl.innerHTML = `
      <div class="guider-highlight__ring"></div>
      <div class="guider-highlight__pulse"></div>
      <div class="guider-highlight__label"></div>
    `;
    highlightEl.querySelector(".guider-highlight__label").textContent = label;
    document.documentElement.appendChild(highlightEl);

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(positionHighlight, 400);
    positionHighlight();

    window.addEventListener("scroll", positionHighlight, true);
    window.addEventListener("resize", positionHighlight);
  }

  // ---------------------------------------------------------------------------
  // 질문 처리 (시연용 - 실제 추론 없음)
  // ---------------------------------------------------------------------------
  function pickScenario(question) {
    const q = question.toLowerCase();
    return (
      SCENARIOS.find((s) => s.keywords.some((k) => q.includes(k.toLowerCase()))) ||
      FALLBACK
    );
  }

  function ask(question) {
    if (!question.trim()) return;
    addMessage("user", question);

    const typing = addTyping();
    const scenario = pickScenario(question);

    // 시연 연출용 지연
    setTimeout(() => {
      typing.remove();
      addMessage("bot", scenario.answer);

      const target = findTarget(scenario.selectors);
      if (target) {
        highlight(target, scenario.label);
      } else {
        addMessage("bot", "이 페이지에서는 해당 위치를 찾지 못했어요.");
      }
    }, 1100);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = field.value;
    field.value = "";
    field.style.height = "auto";
    ask(v);
  });

  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // 입력창 자동 높이
  field.addEventListener("input", () => {
    field.style.height = "auto";
    field.style.height = Math.min(field.scrollHeight, 120) + "px";
  });

  messages.addEventListener("click", (e) => {
    const btn = e.target.closest(".guider-example");
    if (btn) ask(btn.dataset.q);
  });
})();
