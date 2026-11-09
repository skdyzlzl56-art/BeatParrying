// 설정: 소리·입력·화면 박자 맞추기. 입력 보정(ms) = 누른 시점을 판정에 반영하는 시차 · 화면 보정(ms) = 몹 그림을 소리에 맞춰 늦추는 시차. 값은 이 기기에 저장됨
// 튜닝 화면: 박자 소리가 계속 나고, 점이 칸에 닿는 순간이 소리 나는 순간. 탭할 때마다 어긋난 시간(ms)이 보이고, 슬라이더를 움직이며 계속 맞춰 볼 수 있음
(() => {
  const $ = id => document.getElementById(id), KEY = 'bp.tune', menu = $('menu'), bar = $('bar'), off = $('off'), voff = $('voff');
  const DEF = { off: 0, voff: 0 };
  let tune = { ...DEF };
  try { Object.assign(tune, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tune)); } catch (_) {} };
  const apply = () => { off.value = tune.off; voff.value = tune.voff; };
  apply();

  const css = document.createElement('style');
  css.textContent = `
    #set{display:none;flex-direction:column;gap:10px;width:min(280px,calc(100vw - 24px));padding:12px;background:var(--ink);border:2px solid var(--bone);box-shadow:3px 3px 0 #000a;text-align:left}
    #set.open{display:flex}
    #set .row{display:flex;justify-content:space-between}
    #set .row b{font-weight:normal;color:var(--amber)}
    #tlog{display:flex;flex-direction:column;gap:2px;opacity:.75;font-size:11px}
    #tlog:empty{display:none}
    #set .btns{display:flex;gap:8px}
    #set .btns button{flex:1}
    #tune{position:fixed;inset:0;z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#0c1420f2;padding:16px;box-sizing:border-box;overflow:auto}
    #tune.open{display:flex}
    #tune canvas{position:static;transform:none;width:min(640px,100%);height:auto;background:#12202e;border:2px solid var(--bone)}
    #tune .ctl{width:min(640px,100%);display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
    #tune .ctl b{font-weight:normal;color:var(--amber)}
    #tune input[type=range]{grid-column:1/3;width:100%;accent-color:var(--amber);margin:0;height:30px}
    #tune p{margin:0;opacity:.85;line-height:1.5;text-align:center}
    #tune .btns{display:flex;gap:8px;width:min(640px,100%)}
    #tune .btns button{flex:1;background:var(--slate);color:var(--bone);border:2px solid var(--bone);border-radius:0;padding:8px 10px;box-shadow:3px 3px 0 #000a;cursor:pointer}
    #tune .btns button:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #000a}`;
  document.head.appendChild(css);

  // 설정 버튼(아이콘) + 패널
  const ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M3 6h18M3 12h18M3 18h18"/><rect x="14" y="3.5" width="4" height="5" fill="currentColor"/><rect x="6" y="9.5" width="4" height="5" fill="currentColor"/><rect x="12" y="15.5" width="4" height="5" fill="currentColor"/></svg>';
  const list = $('list'), btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'setbtn'; btn.className = 'ic'; btn.title = '설정'; btn.setAttribute('aria-label', '설정'); btn.innerHTML = ICON;
  bar.insertBefore(btn, $('mbtn'));
  const panel = document.createElement('div'); panel.id = 'set';
  panel.innerHTML = '<div class="row"><span>입력 보정</span><b id="p-off"></b></div><div class="row"><span>화면 보정</span><b id="p-voff"></b></div>'
    + '<div id="tlog"></div><div class="btns"><button type="button" id="open-tune">튜닝</button><button type="button" id="rst">기본값</button></div>';
  menu.appendChild(panel);
  btn.onclick = () => { list.classList.remove('open'); panel.classList.toggle('open'); };
  $('mbtn').addEventListener('click', () => panel.classList.remove('open'));

  // ---- 튜닝 화면 ----
  const HINT = '소리가 나는 순간 점이 칸에 닿습니다. 그때 화면을 탭하거나 아무 키나 누르세요. 3번 이상 탭하면 입력 보정이 최근 5번 기준으로 자동으로 맞춰집니다.';
  const T = document.createElement('div'); T.id = 'tune';
  T.innerHTML = '<canvas id="tc" width="640" height="220"></canvas><p id="tmsg">' + HINT + '</p>'
    + '<div class="ctl"><span>입력 보정 (자동)</span><b id="v-off"></b></div>'
    + '<div class="ctl"><span>화면 보정</span><b id="v-voff"></b><input id="s-voff" type="range" min="-100" max="300" step="5"></div>'
    + '<div class="btns"><button type="button" id="t-close">닫기</button></div>';
  document.body.appendChild(T);
  const sVoff = $('s-voff'), c = $('tc'), g = c.getContext('2d');
  let devs = [], raw5 = []; // devs = 보정 후 남은 어긋남(눈금 표시용) · raw5 = 보정 전 원래 어긋남 최근 5개 (이걸로 입력 보정을 계산해서 되먹임이 없음)
  const show = () => { sVoff.value = tune.voff; for (const [id, k] of [['v-off', 'off'], ['v-voff', 'voff'], ['p-off', 'off'], ['p-voff', 'voff']]) $(id).textContent = tune[k] + 'ms'; };
  const set = (k, v) => { tune[k] = Math.round(v); apply(); show(); save(); };
  sVoff.oninput = () => set('voff', +sVoff.value);
  for (const s of [sVoff]) s.onchange = () => s.blur(); // 슬라이더가 포커스를 잡으면 방향키가 값을 바꿔서 탭과 겹침
  $('rst').onclick = () => { tune = { ...DEF }; apply(); show(); save(); };
  // 튜닝 기록: 튜닝을 마칠 때마다 시각·입력 보정·화면 보정을 남김 (최근 30개 저장, 패널에는 5개 표시)
  const LOG = 'bp.tuneLog'; let hist = [];
  try { hist = JSON.parse(localStorage.getItem(LOG) || '[]'); } catch (_) {}
  const drawLog = () => { $('tlog').innerHTML = hist.length ? '<span>튜닝 기록</span>' + hist.slice(-5).reverse().map(h => '<span>' + new Date(h.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '  입력 ' + h.off + 'ms  화면 ' + h.voff + 'ms</span>').join('') : ''; };
  const log = () => { hist.push({ t: Date.now(), off: tune.off, voff: tune.voff }); hist = hist.slice(-30); try { localStorage.setItem(LOG, JSON.stringify(hist)); } catch (_) {} drawLog(); };
  show(); drawLog();

  const GAP = .6, CELL = 90, BX = 560; // 박 간격(초) · 점 사이 간격(px) · 칸 위치
  let t0 = 0, nextI = 0, timer = 0, raf = 0, flashAt = -9;
  const stamp = e => { try { const o = ac.getOutputTimestamp(); return o.contextTime + (e.timeStamp - o.performanceTime) / 1000; } catch (_) { return ac.currentTime; } }; // 이벤트 시각을 오디오 시계로
  const sched = () => { while (t0 + nextI * GAP < ac.currentTime + .25) { const at = t0 + nextI * GAP, acc = nextI % 4 === 0; note(acc ? 1800 : 1200, at, .05, .3, 'square'); noise(at, 'highpass', 3000, acc ? .5 : .35, .03); nextI++; } }; // 오디오 시계로 미리 예약 (타이머 오차 무관)
  const avg = () => devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
  const txt = ms => (ms < 0 ? '빠름 ' : '늦음 ') + Math.abs(Math.round(ms)) + 'ms';
  const onTap = e => {
    if (e.type === 'pointerdown' && e.target.closest('button,input')) return;
    if (e.type === 'keydown' && (e.repeat || e.key === 'Escape' || e.key === 'Tab')) return;
    const j = stamp(e), k = Math.round((j - t0) / GAP), raw = (j - (t0 + k * GAP)) * 1000; // 보정 전 소리와의 차이
    raw5.push(raw); if (raw5.length > 5) raw5.shift();
    if (raw5.length >= 3) { const m = [...raw5].sort((x, y) => x - y)[raw5.length >> 1]; set('off', Math.max(-200, Math.min(300, m))); } // 최근 5개의 중앙값 (한 번 잘못 눌러도 안 흔들림)
    const dev = raw - tune.off; devs.push(dev); if (devs.length > 8) devs.shift(); flashAt = ac.currentTime;
    $('tmsg').textContent = '이번 ' + txt(dev) + (raw5.length >= 3 ? '   입력 보정 ' + tune.off + 'ms' : '   (' + raw5.length + '/3)');
  };
  const draw = () => {
    raf = requestAnimationFrame(draw);
    const ta = ac.currentTime - tune.voff / 1000, b = (ta - t0) / GAP, u = 1 - (b - Math.floor(b)); // u = 다음 소리까지 남은 박
    g.fillStyle = '#12202e'; g.fillRect(0, 0, 640, 220);
    g.fillStyle = '#d8d0b855'; g.fillRect(0, 118, 640, 2); // 줄
    g.strokeStyle = ac.currentTime - flashAt < .15 ? '#ffc857' : '#d8d0b8'; g.lineWidth = 3; g.strokeRect(BX - 30, 78, 60, 80); // 누르는 칸
    for (let k = 0; k < 6; k++) { const x = BX - (u + k) * CELL; if (x < -20) break; g.fillStyle = k === 0 ? '#9ad0ff' : '#9ad0ff' + (k > 3 ? '33' : '88'); g.beginPath(); g.arc(x, 118, 16 - k, 0, 7); g.fill(); }
    g.font = '12px Galmuri11,monospace'; g.textAlign = 'center'; g.fillStyle = '#d8d0b8aa'; g.fillText('빠름', 90, 210); g.fillText('0', 320, 210); g.fillText('늦음', 550, 210); // 어긋남 눈금: 최근 8번 탭
    g.fillStyle = '#d8d0b855'; g.fillRect(40, 185, 560, 1); g.fillRect(319, 168, 2, 36);
    const X = ms => 320 + Math.max(-150, Math.min(150, ms)) / 150 * 280;
    devs.forEach((d, i) => { g.fillStyle = 'rgba(154,208,255,' + (.3 + .7 * (i + 1) / devs.length) + ')'; g.fillRect(X(d) - 3, 172, 6, 12); });
    if (devs.length) { g.fillStyle = '#ffc857'; g.fillRect(X(avg()) - 2, 164, 4, 28); }
  };
  const close = () => { if (raw5.length >= 3) log();  cancelAnimationFrame(raf); clearInterval(timer); removeEventListener('pointerdown', onTap, true); removeEventListener('keydown', onTap, true); T.classList.remove('open'); window.calibrating = false; };
  $('open-tune').onclick = () => {
    ac = ac || new AudioContext(); ac.resume();
    running = false; over = ''; window.calibrating = true; for (const k of [-1, 1]) kd[k] = 0; down = 0; // 게임을 멈추고 탭이 게임 입력으로 가지 않게
    panel.classList.remove('open'); devs = []; raw5 = []; t0 = ac.currentTime + .6; nextI = 0; $('tmsg').textContent = HINT;
    T.classList.add('open'); sched(); timer = setInterval(sched, 50); draw();
    addEventListener('pointerdown', onTap, true); addEventListener('keydown', onTap, true);
  };
  $('t-close').onclick = close;
})();
