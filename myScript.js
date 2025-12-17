(() => {
  const root = document.getElementById("snapRoot");
  const sections = Array.from(document.querySelectorAll(".section"));
  if (!root || sections.length === 0) return;

  /* =========================
     Root 기준 좌표
  ========================= */
  function getTopInRoot(el) {
    const elRect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return root.scrollTop + (elRect.top - rootRect.top);
  }

  function pinToY(y, ms = 220) {
    const t0 = performance.now();
    function tick(now) {
      if (Math.abs(root.scrollTop - y) > 1) root.scrollTop = y;
      if (now - t0 < ms) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* =========================
     NEXT BUTTON
  ========================= */
  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-next");
      const el = document.querySelector(next);
      if (!el) return;
      root.scrollTo({ top: getTopInRoot(el), behavior: "smooth" });
    });
  });

  /* =========================
     ✅ SECTION SNAP (sec-1~sec-2만)
  ========================= */
  let wheelLocked = false;
  const LOCK_MS = 260;
  const THRESHOLD = 22;

  function getSectionTopById(id) {
    const el = document.getElementById(id);
    return el ? getTopInRoot(el) : null;
  }

  function getCurrentSectionIndex() {
    const y = root.scrollTop;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < sections.length; i++) {
      const top = getTopInRoot(sections[i]);
      const dist = Math.abs(top - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  root.addEventListener(
    "wheel",
    (evt) => {
      const sec3Top = getSectionTopById("sec-3");
      if (sec3Top != null && root.scrollTop >= sec3Top - 2) return;

      if (Math.abs(evt.deltaY) < THRESHOLD) return;

      if (wheelLocked) {
        evt.preventDefault();
        return;
      }

      evt.preventDefault();
      wheelLocked = true;

      const idx = getCurrentSectionIndex();
      const dir = evt.deltaY > 0 ? 1 : -1;
      const nextIdx =
        dir > 0 ? Math.min(idx + 1, sections.length - 1) : Math.max(idx - 1, 0);

      const target = sections[nextIdx];
      root.scrollTo({ top: getTopInRoot(target), behavior: "smooth" });

      setTimeout(() => (wheelLocked = false), LOCK_MS);
    },
    { passive: false }
  );

  /* =========================
     TOC / DETAIL
  ========================= */
  const items = Array.from(document.querySelectorAll(".toc-item"));
  const details = Array.from(document.querySelectorAll(".inline-detail"));

  // ✅ 핵심: 닫을 때 애니메이션 없이 "즉시" 닫아버리기
  function instantClose(detailEl) {
    // transition 잠깐 제거
    const prevTransition = detailEl.style.transition;
    detailEl.style.transition = "none";

    // 닫기
    detailEl.classList.remove("is-open");
    detailEl.setAttribute("aria-hidden", "true");

    // reflow로 적용 확정
    void detailEl.offsetHeight;

    // transition 원복
    detailEl.style.transition = prevTransition;
  }

  function instantCloseAll() {
    details.forEach((d) => {
      if (d.classList.contains("is-open")) instantClose(d);
      else {
        d.classList.remove("is-open");
        d.setAttribute("aria-hidden", "true");
      }
    });
  }

  function toggleDetail(key, itemEl) {
    const detailEl = document.querySelector(
      `.inline-detail[data-detail-for="${key}"]`
    );
    if (!detailEl) return;

    const alreadyOpen = detailEl.classList.contains("is-open");

    // ✅ 같은 항목이면 닫고 row를 맨 위로
    if (alreadyOpen) {
      instantClose(detailEl);

      requestAnimationFrame(() => {
        const y = getTopInRoot(itemEl);
        root.scrollTop = y;
        pinToY(y, 180);
      });
      return;
    }

    // ✅ 다른 항목 클릭 시: 기존 열린 것들을 "즉시" 닫아서 레이아웃 흔들림 제거
    instantCloseAll();

    // ✅ 닫힌 뒤에 좌표 계산 → 클릭한 row를 맨 위로 정확히 올림
    requestAnimationFrame(() => {
      const y = getTopInRoot(itemEl);

      root.scrollTop = y;     // 즉시 이동
      pinToY(y, 220);         // 레이아웃 변화에도 row를 위에 고정

      // 다음 프레임에 열기
      requestAnimationFrame(() => {
        detailEl.classList.add("is-open");
        detailEl.setAttribute("aria-hidden", "false");

        // 열림 직후에도 한 번 더 고정
        pinToY(y, 240);
      });
    });
  }

  items.forEach((item) => {
    const key = item.dataset.probe;
    item.addEventListener("click", () => toggleDetail(key, item));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDetail(key, item);
      }
    });
  });

  /* =========================
     CLOSE BUTTON
  ========================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-close]");
    if (!btn) return;

    const detailEl = btn.closest(".inline-detail");
    if (!detailEl) return;

    instantClose(detailEl);

    const key = detailEl.getAttribute("data-detail-for");
    const item = document.querySelector(`.toc-item[data-probe="${key}"]`);
    if (!item) return;

    requestAnimationFrame(() => {
      const y = getTopInRoot(item);
      root.scrollTop = y;
      pinToY(y, 200);
    });
  });
})();
