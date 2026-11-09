// 모바일·태블릿 전용 설정: 터치 입력(화면 좌우 절반) · 전체화면 버튼 · iPad/iPhone Safari 오동작 예방. 엔진(main.js)의 press/release/start 를 호출만 함
(() => {
  // ---- 1) CSS: 확대·선택·드래그·길게 눌러 나오는 메뉴를 막음 ----
  const css = document.createElement('style');
  css.textContent = `
    html,body{touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
    canvas,button,img{-webkit-user-drag:none;user-drag:none}
    button{touch-action:manipulation;-webkit-appearance:none;appearance:none}
    #list{touch-action:pan-y;overscroll-behavior:contain}`;
  document.head.appendChild(css);

  // ---- 2) 터치·마우스 입력: 화면 왼쪽 절반 = 왼쪽 패링, 오른쪽 절반 = 오른쪽 패링 (멀티터치 가능). 멈춰 있을 땐 탭하면 시작 ----
  const ptr = new Map(), inMenu = e => e.target.closest && e.target.closest('#menu');
  addEventListener('pointerdown', e => {
    if (inMenu(e) || window.calibrating) return;
    e.preventDefault();
    if (!running) { start(); return; }
    const dir = e.clientX < innerWidth / 2 ? -1 : 1;
    ptr.set(e.pointerId, dir); press(dir);
  });
  const up = e => { const dir = ptr.get(e.pointerId); if (dir) { ptr.delete(e.pointerId); if (running) release(dir); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  const releaseAll = () => { ptr.clear(); kd[-1] = kd[1] = 0; down = 0; }; // 화면을 벗어나거나 앱을 바꾸면 눌린 상태가 남지 않게
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  // ---- 3) 확대·선택·드래그 예방 (특히 iPad Safari) ----
  const stop = e => e.preventDefault();
  for (const t of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart', 'dragstart']) document.addEventListener(t, stop, { passive: false }); // 핀치 확대 · 더블탭 확대 · 길게 눌러 메뉴 · 글자 선택 · 끌기
  document.addEventListener('touchmove', e => { if (!(e.target.closest && e.target.closest('#list'))) e.preventDefault(); }, { passive: false }); // 화면 밀림·당겨서 새로고침 방지 (스테이지 목록 스크롤만 허용)
  let lastEnd = 0;
  document.addEventListener('touchend', e => { const t = Date.now(); if (t - lastEnd < 350) e.preventDefault(); lastEnd = t; }, { passive: false }); // iOS 가 무시하는 user-scalable=no 대신, 빠른 두 번 탭의 확대를 직접 차단

  // ---- 4) 전체화면 버튼: 지원하지 않는 기기(iPhone Safari)에서는 버튼을 숨김. 홈 화면에 추가하면 전체화면으로 열림 ----
  const root = document.documentElement, bar = document.getElementById('bar');
  const req = root.requestFullscreen || root.webkitRequestFullscreen, exit = document.exitFullscreen || document.webkitExitFullscreen;
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const sv = p => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="' + p + '"/></svg>';
  const EXPAND = sv('M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6'), SHRINK = sv('M9 3v6H3M21 9h-6V3M15 21v-6h6M3 15h6v6'); // 전체화면 아이콘: 모서리가 바깥으로 / 안쪽으로
  if (req && bar) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'fsbtn'; b.className = 'ic'; b.innerHTML = EXPAND; b.title = '전체화면'; b.setAttribute('aria-label', '전체화면');
    b.onclick = async () => {
      b.blur();
      try {
        if (isFs()) await exit.call(document);
        else { await req.call(root); try { await screen.orientation.lock('landscape'); } catch (_) {} } // 가로 고정은 지원되는 곳에서만
      } catch (_) {}
    };
    const sync = () => { b.innerHTML = isFs() ? SHRINK : EXPAND; b.title = isFs() ? '전체화면 끝내기' : '전체화면'; };
    document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
    bar.prepend(b);
  }
})();
