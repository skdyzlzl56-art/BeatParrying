// 설정: 소리와 입력·화면 박자 맞추기. 입력 보정(ms) = 누른 시점을 판정에 반영하는 시차 · 화면 보정(ms) = 몹 그림을 소리에 맞춰 늦추는 시차. 값은 이 기기에 저장됨
(() => {
  const $ = id => document.getElementById(id), KEY = 'bp.tune', menu = $('menu'), off = $('off'), voff = $('voff');
  const DEF = { off: 0, voff: 0 };
  let tune = { ...DEF };
  try { Object.assign(tune, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tune)); } catch (_) {} };
  const apply = () => { off.value = tune.off; voff.value = tune.voff; };
  apply();

  const css = document.createElement('style');
  css.textContent = `
    #set{display:none;flex-direction:column;gap:10px;width:min(300px,calc(100vw - 24px));padding:12px;background:var(--ink);border:2px solid var(--bone);box-shadow:3px 3px 0 #000a;max-height:80vh;overflow:auto;touch-action:pan-y;text-align:left}
    #set.open{display:flex}
    #set .row{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center}
    #set .row b{font-weight:normal;color:var(--amber)}
    #set input[type=range]{grid-column:1/3;width:100%;accent-color:var(--amber);margin:0;height:28px}
    #set p{margin:0;opacity:.75;line-height:1.5}
    #set .btns{display:flex;gap:8px}
    #set .btns button{flex:1}`;
  document.head.appendChild(css);

  const panel = document.createElement('div'); panel.id = 'set';
  panel.innerHTML = `
    <div class="row"><span>입력 보정</span><b id="v-off"></b><input id="s-off" type="range" min="-200" max="300" step="5"></div>
    <div class="row"><span>화면 보정</span><b id="v-voff"></b><input id="s-voff" type="range" min="-100" max="300" step="5"></div>
    <p id="msg">박자 소리가 12번 납니다. 소리에 맞춰 화면을 탭하거나 아무 키나 누르세요.</p>
    <div class="btns"><button type="button" id="cal">자동으로 맞추기</button><button type="button" id="rst">기본값</button></div>`;
  const list = $('list'), btn = document.createElement('button'); btn.type = 'button'; btn.id = 'setbtn'; btn.textContent = '설정';
  menu.insertBefore(btn, $('mbtn')); menu.appendChild(panel);
  btn.onclick = () => { list.classList.remove('open'); panel.classList.toggle('open'); };
  $('mbtn').addEventListener('click', () => panel.classList.remove('open'));

  const sOff = $('s-off'), sVoff = $('s-voff'), say = t => { $('msg').textContent = t; };
  const show = () => { sOff.value = tune.off; sVoff.value = tune.voff; $('v-off').textContent = tune.off + 'ms'; $('v-voff').textContent = tune.voff + 'ms'; };
  const set = (k, v) => { tune[k] = Math.round(v); apply(); show(); save(); };
  sOff.oninput = () => set('off', +sOff.value); sVoff.oninput = () => set('voff', +sVoff.value);
  for (const s of [sOff, sVoff]) s.onchange = () => s.blur(); // 슬라이더가 포커스를 잡으면 방향키가 값을 바꿔서 패링과 겹침
  $('rst').onclick = () => { tune = { ...DEF }; apply(); show(); save(); say('기본값으로 되돌렸습니다.'); };
  show();

  // ---- 자동 맞추기: 0.5초 간격 클릭 12번 → 처음 4번은 연습, 뒤 8번의 (누른 시각 - 클릭 시각) 중앙값 = 입력 보정. 화면 보정 = 기기가 알려주는 출력 지연 ----
  const N = 12, GAP = .5, WARM = 4;
  $('cal').onclick = () => {
    if (window.calibrating) return;
    ac = ac || new AudioContext(); ac.resume();
    running = false; over = ''; window.calibrating = true;
    for (const k of [-1, 1]) kd[k] = 0; down = 0;
    const t0 = ac.currentTime + 1.2, taps = [];
    for (let i = 0; i < N; i++) { const at = t0 + i * GAP; note(1200, at, .05, .3, 'square'); noise(at, 'highpass', 3000, .4, .03); }
    const stamp = e => { try { const o = ac.getOutputTimestamp(); return o.contextTime + (e.timeStamp - o.performanceTime) / 1000; } catch (_) { return ac.currentTime; } }; // 이벤트 발생 시각을 오디오 시계로 환산
    const tap = e => { if (e.type === 'pointerdown' && e.target.closest('#menu')) return; if (e.type === 'keydown' && e.repeat) return; taps.push(stamp(e)); };
    addEventListener('pointerdown', tap, true); addEventListener('keydown', tap, true);
    say('소리에 맞춰 탭하세요…');
    setTimeout(() => {
      removeEventListener('pointerdown', tap, true); removeEventListener('keydown', tap, true); window.calibrating = false;
      const d = taps.filter(t => t >= t0 + WARM * GAP - GAP / 2).map(t => { let x = (t - t0) % GAP; if (x < 0) x += GAP; return x > GAP / 2 ? x - GAP : x; }).sort((a, b) => a - b);
      if (d.length < 5) { say('탭이 너무 적어요. 다시 해 주세요.'); return; }
      const med = d[d.length >> 1], lat = (ac.outputLatency || 0) + (ac.baseLatency || 0);
      set('off', Math.max(-200, Math.min(300, med * 1000))); set('voff', Math.max(-100, Math.min(300, lat * 1000)));
      say('맞췄어요. 입력 ' + tune.off + 'ms · 화면 ' + tune.voff + 'ms. 게임에서 어긋나면 슬라이더로 조금씩 고치세요.');
    }, (t0 + N * GAP + .3 - ac.currentTime) * 1000);
  };
})();
