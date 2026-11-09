
const $=id=>document.getElementById(id), cv=$('c'), g=cv.getContext('2d');
let down=0, ac, running=false, over='', P, kills, enemies=[], gridT, ci, flash=0, msg='', fx=[], P_dir=0, pressT=-9;
let pendG=null, groupEnd=0; const MAX_ACTIVE=5, CELL=45, NEAR=50; let sc=0, nx=0; // MAX_ACTIVE = 동시 적 수
const beatLen=()=>60/(+$('bpm').value||120);
const now=()=>ac.currentTime;
const win=()=>(+$('win').value||120)/1000;
let stage=1;
function setStage(n){ stage=n; enemies=[]; kills=0; nx=sc+3; msg='STAGE '+n; flash=3; setBpm() }
function goStage(n,btn,mode){ btn.blur(); if(!running) start(); if(BOSSES[n]) enterBoss(n,mode); else setStage(n) } // 디버그
const POOL=()=>stage===24?HOLD_STAGE:stage>18?EXTRA[stage-19]:STAGE_POOLS[(stage-1)%6+1];
const goal=()=>stage>24?1/0:stage===24?10:stage>18?20:GOALS[(stage-1)%6+1];

let noiseBuf; const noiseB=()=>noiseBuf||(()=>{const b=ac.createBuffer(1,ac.sampleRate*.08,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return noiseBuf=b})();
// 마스터: 컴프레서 → 게인 → 스피커. 레이어가 겹쳐도 클리핑 안 나게 (audio-headroom)
let master; const OUT=()=>master||(master=(()=>{ const c=ac.createDynamicsCompressor(), m=ac.createGain(); c.threshold.value=-14; c.ratio.value=4; m.gain.value=.85; c.connect(m).connect(ac.destination); return c })());
const ATK=.003; // 3ms 어택: 첫 샘플부터 최대 볼륨이면 틱 노이즈 (audio-ramp-parameters)
function drum(f0,f1,dur,vol,at){ // 저음 북: 피치가 내려가는 사인파
  const o=ac.createOscillator(), v=ac.createGain();
  o.frequency.setValueAtTime(f0,at); o.frequency.exponentialRampToValueAtTime(f1,at+dur*.5);
  v.gain.setValueAtTime(.001,at); v.gain.linearRampToValueAtTime(vol,at+ATK); v.gain.exponentialRampToValueAtTime(.001,at+dur);
  o.connect(v).connect(OUT()); o.start(at); o.stop(at+dur+.01);
}
function thud(at,vol){ // 가죽 때리는 둔탁한 타격음 (저역 노이즈)
  const s=ac.createBufferSource(), f=ac.createBiquadFilter(), v=ac.createGain();
  s.buffer=noiseB(); f.type='lowpass'; f.frequency.value=350;
  v.gain.setValueAtTime(vol,at); v.gain.exponentialRampToValueAtTime(.001,at+.07);
  s.connect(f).connect(v).connect(OUT()); s.start(at);
}
// 모든 소리는 저음 타악기. hz(적마다 다름)를 70~200Hz 대로 눌러서 빠를수록 살짝 높게.
function tick(hz,strike,bell,at=ac.currentTime,vol=.85){
  const f=70+hz*.2;
  if(!strike) drum(f*1.6,f,.12,vol,at);                       // 준비: 작은 톰
  else if(bell) {drum(f*2.5,f*.6,.7,.9,at); thud(at,.5)}    // 헤비: 크고 긴 큰북 (땅~)
  else {drum(f*2.5,f*.8,.3,.8,at); thud(at,.4)}              // 패링 타이밍: 크고 묵직한 킥+타격
}
// ---- 배경 비트: 8분음표 단위 예약. 퍼펙트 연속(streak)에 따라 레이어가 하나씩 쌓임 (실패/비퍼펙트 시 리셋) ----
let bgT=0, bgI=0, streak=0; const LAYERS=[2,4,6,8,10,13]; // 연속 성공: 2 하이햇 · 4 스네어 · 6 베이스 · 8 아르페지오 · 10 멜로디 · 13 옥타브 겹침
function noise(at,type,f,vol,dur){
  const s=ac.createBufferSource(), fl=ac.createBiquadFilter(), v=ac.createGain();
  s.buffer=noiseB(); fl.type=type; fl.frequency.value=f; v.gain.setValueAtTime(vol,at); v.gain.exponentialRampToValueAtTime(.001,at+dur);
  s.connect(fl).connect(v).connect(OUT()); s.start(at);
}
function bg(at,i){ // i = 8분음표 번호 (짝수 = 박 머리)
  if(BOSSES[stage]) return stage===25?bossBg(at,i):bossBg2(at,i);
  // 스타일 st: 0 기본(1~3) · 1 댄스(4) · 2 하프타임(5) · 3 질주(6) · 4 스윙 재즈(13~15) · 5 칩튠(16~18)
  const bar=Math.floor(i/8)%4, s=i%8, S=SONGS[stage]||SONGS[1], st=S.st||0, beat=i%2===0, L=n=>streak>=LAYERS[n], root=S.root[bar], c=S.chord[bar], m=S.mel[bar*8+s];
  if(st===4&&!beat) at+=beatLen()*.17; // 스윙: 뒤 8분음표를 늦춰 셋잇단 느낌
  // 킥 (항상)
  if(st===0&&beat) drum(110,45,.15,.22,at);
  else if(st===1&&beat) drum(120,40,.18,.32,at);
  else if(st===2&&(s===0||s===3||s===5)) drum(100,38,.2,.32,at);
  else if(st===3&&(beat||s===7)) drum(125,42,.15,s===7?.18:.3,at);
  else if(st===4&&(s===0||s===4)) drum(90,40,.2,.22,at);
  else if(st===5&&beat) drum(160,60,.1,.26,at);
  // 하이햇 / 라이드
  if(L(0)){ if(st===0&&!beat) noise(at,'highpass',7000,.12,.04); else if(st===1&&!beat) noise(at,'highpass',5000,.16,.09);
    else if(st===4){ if(beat||s===3||s===7) noise(at,'highpass',6500,beat?.1:.08,.1) }
    else if(st===5) noise(at,'highpass',9000,.08,.03);
    else if(st>=2) noise(at,'highpass',7000,beat?.07:.14,.04) }
  // 스네어
  if(L(1)){ if(st===2){ if(s===4) noise(at,'bandpass',1500,.4,.18) } else if(st===4){ if(i%4===2) noise(at,'bandpass',1200,.14,.15) } else if(st===5){ if(i%4===2) noise(at,'bandpass',3000,.25,.08) } else if(i%4===2) noise(at,'bandpass',1800,.3,.12); if(st===3&&s===7) noise(at,'bandpass',2200,.1,.05) }
  // 베이스
  if(L(2)){ if(st===0){ if(beat) note(root,at,.2,.07,'square') }
    else if(st===1) note(beat?root:root*2,at,.12,.06,'sawtooth')
    else if(st===2){ if([0,3,4,6].includes(s)) note(s===3||s===6?root*1.5:root,at,.22,.08,'sawtooth') }
    else if(st===4){ if(beat){ const k=(i/2)%4; note([root,mf(c[1]-24),mf(c[2]-24),mf(c[1]-24)][k],at,.25,.13,'triangle') } } // 워킹 베이스
    else if(st===5) note(beat?root:root*2,at,.1,.1,'triangle')
    else note(beat?root:root*2,at,.1,.06,'square') }
  // 아르페지오 / 컴핑
  if(L(3)){ if(st===4){ if(s===0||s===3||s===6) for(const n of c) note(mf(n),at,.28,.03,'triangle') }   // 재즈 코드 스탭
    else if(st===5) note(mf(c[[0,1,2,1,2,1,0,1][s]]+24),at,.1,.03,'square')
    else note(mf(c[[[0,1,2,1,0,1,2,1],[2,1,0,1,2,1,0,1],[0,2,1,2,0,2,1,2],[0,1,2,1,2,1,2,1]][st][s]]+(st===3?24:12)),at,.14,st?.035:.05,st?'sawtooth':'triangle') }
  // 멜로디 + 옥타브 겹침
  const mt=['triangle','sawtooth','square','square','sine','square'][st], mv=[.09,.05,.05,.06,.11,.06][st];
  if(L(4)&&m) note(mf(m),at,st===5?.14:.3,mv,mt);
  if(L(5)&&m) note(mf(m+12),at,.3,.04,'sine');
}
function holdTone(at,dur){ // 꾹 누르기 = 기 모으기: 누르는 동안 음이 한 옥타브 올라가고, 필터가 열리고, 떨림이 빨라지고, 바람소리가 커지다가 뗄 타이밍에 정점
  const f=mf(chordNow()[0]), e=at+dur, pk=Math.max(at+.01,e-.03);
  const o=ac.createOscillator(), h=ac.createOscillator(), lf=ac.createOscillator(), lg=ac.createGain(), gn=ac.createGain(), fl=ac.createBiquadFilter(), ns=ac.createBufferSource(), nf=ac.createBiquadFilter(), ng=ac.createGain();
  o.type='sawtooth'; h.type='sine'; lf.type='sine'; fl.type='lowpass'; fl.Q.value=4;
  o.frequency.setValueAtTime(f,at); o.frequency.exponentialRampToValueAtTime(f*2,e);        // 음이 점점 올라감
  h.frequency.setValueAtTime(f*2.003,at); h.frequency.exponentialRampToValueAtTime(f*4,e); // 위 옥타브 사인
  fl.frequency.setValueAtTime(250,at); fl.frequency.exponentialRampToValueAtTime(5000,e);   // 필터가 열림
  lf.frequency.setValueAtTime(4,at); lf.frequency.linearRampToValueAtTime(16,e); lg.gain.value=.025; lf.connect(lg).connect(gn.gain); // 떨림이 빨라짐
  gn.gain.setValueAtTime(.001,at); gn.gain.linearRampToValueAtTime(.03,at+ATK*5); gn.gain.linearRampToValueAtTime(.11,pk); gn.gain.exponentialRampToValueAtTime(.001,e+.12);
  ns.buffer=noiseB(); ns.loop=true; nf.type='bandpass'; nf.Q.value=1.5; nf.frequency.setValueAtTime(300,at); nf.frequency.exponentialRampToValueAtTime(5000,e); // 바람 소리
  ng.gain.setValueAtTime(.001,at); ng.gain.linearRampToValueAtTime(.06,pk); ng.gain.exponentialRampToValueAtTime(.001,e+.12);
  o.connect(fl); h.connect(fl); fl.connect(gn).connect(OUT()); ns.connect(nf).connect(ng).connect(OUT());
  for(const x of [o,h,lf,ns]){ x.start(at); x.stop(e+.14) }
}
function chordNow(){ // 지금 울리는 마디의 3화음 (MIDI). bgI = 다음 예약 8분음표라 1 뺌
  const i=Math.max(0,bgI-1), bar=(i>>3)%4;
  if(BOSSES[stage]){ const b2=stage!==25, L=(b2?BOSS2_LVL:BOSS_LVL)[i>>4]??0; return (b2?BP2:BP)[L>=3?1:0].chord[bar] }
  return (SONGS[stage]||SONGS[1]).chord[bar];
}
function parrySfx(at,perfect){ // 패링 성공 "띵": 현재 화음음 + 콤보 따라 한 칸씩 상승(근음→3도→5도→옥타브 위…) + 마림바풍 둥근 음색. 퍼펙트는 옥타브 위 반짝임 추가
  const c=chordNow(), k=Math.max(0,streak-1)%6, m=Math.min(c[k%3]+12+12*(k/3|0),96), f=mf(m), d=perfect?.45:.25;
  noise(at,'highpass',5000,perfect?.12:.08,.015);          // 타격 클릭
  note(f,at,d,.16,'sine'); note(f*2,at,d*.5,.06,'sine');   // 몸통 + 2배음(따뜻함)
  if(perfect) note(f*2,at+.02,.6,.05,'triangle'), note(f*3,at+.02,.35,.03,'sine'); // 반짝임
}
function missSfx(at=now()){ drum(95,40,.22,.35,at); noise(at,'lowpass',500,.25,.08) } // 실패: 낮고 탁한 "툭"
function note(f,at,dur,vol,type){ const o=ac.createOscillator(),v=ac.createGain(); o.type=type; o.frequency.value=f; v.gain.setValueAtTime(.001,at); v.gain.linearRampToValueAtTime(vol,at+ATK); v.gain.exponentialRampToValueAtTime(.001,at+dur); o.connect(v).connect(OUT()); o.start(at); o.stop(at+dur+.01) }
const mf=m=>440*2**((m-69)/12); // MIDI → Hz
const setBpm=()=>{ $('bpm').value=BPMS[stage] };
let bossT0=0, bossTotal=0, bossQ=[], bossMode='normal';
function enterBoss(n=25,mode='normal'){
  stage=n; bossMode=mode; setBpm(); enemies=[]; kills=0; streak=0; sc=0; nx=0; pendG=null; groupEnd=0; over=''; msg='BOSS STAGE'; flash=3;
  gridT=now()+beatLen()*2; ci=0; bgT=gridT; bgI=0; bossT0=gridT; bossQ=[]; bossTotal=0; // 2박 카운트인 후 0박 = 곡 시작
  BOSSES[n].script[mode].forEach((row,c)=>row.split(' ').forEach(tok=>{ const [,ty,sd,off]=/^([a-z])([LR]?)(\d*)$/.exec(tok);
    bossQ.push({b:8*c+(+off||0),ty,side:sd==='L'?-1:sd==='R'?1:0}) }));
}
function bossBeat(t,b){
  for(const o of bossQ) if(o.b===b){ spawnForm(t,FORMS[BOSS_FORM[o.ty]],{boss:true,side:o.side}) }
  if(b===BOSSES[stage].beats+2){ over='BOSS CLEAR!  kills:'+kills+'/'+bossTotal; running=false } // 마지막 크래시가 울린 뒤 종료
}
function bossBg(at,i){ // i = 8분음표 번호, 384 = 곡 끝
  if(i>=384){ if(i===384){ drum(140,40,.5,.5,at); noise(at,'highpass',3000,.4,1.2); for(const n of [40,52,59,64,67,71]) note(mf(n),at,2,.06,'sawtooth') } return }
  const c=i>>4, ir=i%16, L=BOSS_LVL[c], s=i%8, beat=i%2===0, bar=(i>>3)%4, P=BP[L>=3?1:0], root=P.root[bar], ch=P.chord[bar], m=P.mel[bar*8+s], full=L>=4, drums=L!==3;
  if(drums&&(L<2?s%4===0:beat)) drum(full?125:110,42,.16,.3,at);                                   // 킥: 인트로·벌스 1·3박 → 빌드부터 4분음표
  if(drums&&L>=1&&(full?true:!beat)) noise(at,'highpass',7000,full&&beat?.07:.12,.04);              // 하이햇: 후렴은 8분음표 전부
  if(drums&&L>=1&&(s===2||s===6)) noise(at,'bandpass',1800,.3,.12);                                 // 스네어
  if(L===2&&(c===9||c===19)&&ir>=12) noise(at,'bandpass',1800,.1+.05*(ir-12),.08);                  // 후렴 직전 스네어 롤
  if((c===10||c===20)&&ir===0) noise(at,'highpass',3000,.35,1);                                     // 후렴 시작 크래시
  if(L===3){ if(s===0) note(root,at,1.8,.12,'sine'); if(s===0||s===4) for(const n of ch) note(mf(n),at,1.8,.03,'triangle') } // 브레이크: 드럼 빼고 서브 + 패드
  else if(L<2){ if(beat&&L===1||s%4===0) note(root,at,.2,.09,'square') }                            // 인트로·벌스 베이스
  else note(beat?root:root*2,at,.12,.08,'sawtooth');                                                // 빌드~: 8분음표 베이스
  if(L===0&&s===0) note(mf(ch[0]+24),at,.9,.03,'sine');                                             // 인트로: 높은 핑
  if(L>=2&&drums) note(mf(ch[[0,1,2,1,0,1,2,1][s]]+(L===5?24:12)),at,.14,.035,'sawtooth');           // 아르페지오
  if(m){ if(L===2) note(mf(m),at,.3,.08,'triangle'); else if(L===3) note(mf(m),at,.5,.06,'sine'); else if(full){ note(mf(m),at,.3,.06,'square'); if(L===5) note(mf(m+12),at,.3,.04,'sine') } }
}
// 보스2: 160BPM 전투 BGM. 8분음표 안에 16분음표를 한 번 더 쪼개서(at+beatLen()/4) 하이햇·베이스·아르페지오를 빽빽하게. 480 = 곡 끝
function bossBg2(at,i){
  if(i>=480){ if(i===480){ drum(150,38,.6,.55,at); noise(at,'highpass',3000,.45,1.4); for(const n of [38,50,57,62,65,69]) note(mf(n),at,2,.06,'sawtooth') } return }
  const bl=beatLen(), at2=at+bl/4, c=i>>4, ir=i%16, L=BOSS2_LVL[c], s=i%8, beat=i%2===0, bar=(i>>3)%4, P=BP2[L>=3?1:0], root=P.root[bar], ch=P.chord[bar], m=P.mel[bar*8+s], full=L>=4, drums=L!==3;
  if(drums&&(L===0?s%4===0:(beat||s===7))) drum(full?135:115,42,.15,.32,at);                          // 킥: 인트로 1·3박 → 4분음표 + 못갖춘 8분(s=7) 당김음
  if(drums&&L>=1){ noise(at,'highpass',8000,beat?.09:.13,.03); noise(at2,'highpass',8000,.06,.03) }     // 하이햇 16분음표
  if(drums&&L>=1&&(s===2||s===6)) noise(at,'bandpass',1800,.34,.12);                                  // 스네어 (2·4박)
  if(L===0&&c===1&&ir>=8){ const v=.06+.02*(ir-8); noise(at,'bandpass',1800,v,.06); noise(at2,'bandpass',1800,v,.06) } // 인트로 끝 스네어 롤
  if(L===1&&(c===19)&&ir>=8 || L===2&&c===9&&ir>=8 || c===23&&ir>=8){ const v=.1+.04*(ir-8); noise(at,'bandpass',1800,v,.06); noise(at2,'bandpass',1800,v,.06) } // 후렴 직전 롤
  if((c===10||c===20||c===24)&&ir===0) noise(at,'highpass',3000,.38,1);                               // 후렴 시작 크래시
  if(L===3){ if(s===0) note(root,at,1.4,.12,'sine'); if(s===0||s===4) for(const n of ch) note(mf(n),at,1.4,.03,'triangle') } // 브레이크: 서브 + 패드
  else if(L===0){ note(root,at,.07,.07,'square'); note(root,at2,.07,.05,'square') }                   // 인트로: 16분음표 펄스 베이스
  else if(L===1){ note(beat?root:root*2,at,.1,.08,'sawtooth'); if(beat) note(root,at2,.07,.05,'sawtooth') } // 벌스: 말달리는 베이스
  else { note(beat?root:root*2,at,.1,.08,'sawtooth'); if(L===5||beat) note(root,at2,.07,.05,'sawtooth') }  // 프리~: 옥타브 점프 (+ 피날레 16분 갤럽)
  if(L>=2&&drums){ const k=s*2, o=L===5?24:12; note(mf(ch[k%3]+o),at,.08,.03,'square'); note(mf(ch[(k+1)%3]+o),at2,.08,.03,'square') } // 16분음표 아르페지오
  if(full&&(s===0||s===3||s===6)){ note(root*2,at,.25,.06,'sawtooth'); note(root*3,at,.25,.05,'sawtooth') } // 파워코드 스탭 3+3+2
  if(m){ if(L===1) note(mf(m),at,.25,.06,'triangle'); else if(L===2) {note(mf(m),at,.25,.07,'square'); note(mf(m+12),at,.2,.03,'sine')} else if(L===3) note(mf(m),at,.5,.06,'sine'); else { note(mf(m),at,.25,.07,'square'); note(mf(m+12),at,.25,L===5?.05:.03,L===5?'sawtooth':'sine') } }
}
function start(){
  ac=ac||new AudioContext(); ac.resume();
  P=5; kills=0; enemies=[]; sc=0; nx=0; stage=1; over=''; fx=[]; msg='';
  setBpm(); gridT=now()+beatLen()*2; ci=0; running=true; bgT=gridT; bgI=0; streak=0; groupEnd=0; pendG=null; // 2박 카운트인, 이후 normal 한 박 간격 격자에서만 스폰
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function newCycle(e,cs){ e.cs=cs; e.sl=beatLen()/e.type.speed; e.slotDone=-1; e.N=e.type.pat.length; e.sI=e.type.pat.indexOf(2); let ai=0; e.atks=e.type.pat.flatMap((v,i)=>{ if(v!==2) return []; const n2=e.type.pat.indexOf(2,i+1), j=e.type.pat.indexOf(4,i+1); // 2 뒤에 4가 있으면 꾹 누르기: 2 = 누를 타이밍, 4 = 뗄 타이밍
    return [{dir:e.type.dirs?e.type.dirs[ai++]:e.side,time:cs+i*e.sl,done:false,rel:j>=0&&(n2<0||j<n2)?cs+j*e.sl:0}] }); } // dirs: 타격마다 막을 방향을 따로 지정 (에코 따당 = 좌→우)
function mk(t,type){
  const side=type.side||(Math.random()<.5?-1:1), e={side, type, hp:0, lane:[0,1,2,3,4,5,6].find(l=>!enemies.some(o=>o.lane===l&&o.side===side))};
  if(BOSSES[stage]) bossTotal++; // 보스 HUD 의 전체 마리 수 = 지금까지 나온 마리
  e.hp=type.hp||type.pat.filter(v=>v===2).length; newCycle(e,t); enemies.push(e);
}
function spawnForm(t,f,o={}){ // 편성(FORMS) 하나를 기본 몹(MOBS)으로 풀어서 내보냄. o.boss = 한 사이클만 공격 · o.side = 방향 지정(생략 = 랜덤)
  const m=MOBS[f.mob], shared=o.side||(Math.random()<.5?-1:1);
  for(const u of f.build?f.build():f.units) mk(t,{...m,...u,boss:o.boss,side:u.side||o.side||(f.same?shared:0)});
}
function trySpawn(t){
  if(BOSSES[stage]){ bossBeat(t,sc++); return }
  const b=sc++;
  if(b<nx) return;
  const pool=POOL(), f=(pendG&&pool.includes(pendG))?pendG:pool[Math.floor(Math.random()*pool.length)];
  if(f.group&&(enemies.length||t<groupEnd)){ pendG=f; nx=b+1; return } // 그룹 편성(4몹·에코·엇박3연타)은 화면이 비고 이전 그룹의 8박이 끝난 뒤에만 시작 → 다른 몹과 안 겹침
  if(!f.group&&t<groupEnd){ nx=b+1; return }                              // 그룹이 진행 중인 8박 동안은 다른 몹도 안 나옴
  pendG=null;
  if(!f.group&&enemies.length>=MAX_ACTIVE){nx+=2; return} // 꽉 찼으면 위상(짝/홀)을 유지한 채 2박 미룸
  if(f.lock){ spawnForm(t,f); nx=b+8; groupEnd=t+beatLen()*8; return } // 8박 주기 세트 (4몹: 이번 공격(4~7박)과 겹쳐서 다음 예고(8~11박)가 이어짐)
  nx=b+2+(Math.random()<.5?(stage>=2?2:1):0); // 2박 or 3박 (2몹은 2박 or 4박: 11.. 리듬이 2박 주기라 홀수 박이면 쉼 자리가 채워짐)
  spawnForm(t,f);
}
function step(){
  if(!running) return;
  const t=now();
  while(ci<2&&t>=gridT-(2-ci)*beatLen()){tick(220,false);ci++}
  while(bgT<t+.1){ bg(bgT,bgI++); bgT+=beatLen()/2 }
  while(t>=gridT){ trySpawn(gridT); gridT+=beatLen(); }
  for(const e of enemies.slice()){
    while(e.slotDone<e.N-1&&t>=e.cs+(e.slotDone+1)*e.sl){ e.slotDone++; const v=e.type.pat[e.slotDone]; if(v&&!(v===1&&e.type.quiet)&&(v===1||e.type.atkSound)) tick(e.type.hz,v>=2,e.type.bell||v===4);
    }
    for(const a of e.atks) if(!a.done&&t>(a.held?a.rel:a.time)+win()&&enemies.includes(e)) resolve(e,a,a.held?'HOLD TOO LONG':'MISS',false);
    if(enemies.includes(e)&&t>=e.cs+e.N*e.sl){ if(e.type.boss) enemies=enemies.filter(o=>o!==e); else newCycle(e,e.cs+e.N*e.sl) } // 보스전 몹은 한 사이클(8박)만 공격하고 퇴장
  }
  if(P<=0){over='YOU DIED  kills:'+kills;running=false}
}
const DMG=1; // 실패 시 내 HP -DMG, 성공 시 적 HP -DMG (적 HP 1 = 한 방)
function resolve(e,a,txt,ok){
  a.done=true; const ms=/-?d+ms$/.exec(txt)?.[0]||'', word=txt.replace(ms,'').trim();
  fx.push({w:word,ms,x:e.px??PX,y:e.py??GY,t0:now(),col:ok?(word==='PERFECT'?'#fc3':'#7df'):'#f55',sub:ok&&e.hp>DMG?'HP '+(e.hp-DMG):''});
  if(!ok&&e.type.once) enemies=enemies.filter(o=>o!==e); // 4몹은 실패해도 한 번 공격하면 사라짐 (남아서 다음 그룹과 겹치지 않게)
  if(ok) streak++; else { const lv=Math.max(0,LAYERS.filter(n=>streak>=n).length-2); streak=lv?LAYERS[lv-1]:0 } // 실패: 레이어 2단계 하락
  if(ok){ parrySfx(Math.max(now(),a.rel||a.time),txt[0]==='P'); e.hp-=DMG; if(e.hp<=0){enemies=enemies.filter(o=>o!==e);kills++; if(kills>=goal()){ if(stage<24) setStage(stage+1); else enterBoss(25) }
      e.type.pat.forEach((v,i)=>{ if(v===2&&i>e.slotDone&&e.type.atkSound) tick(e.type.hz,true,e.type.bell,e.cs+i*e.sl) }) } /* 일찍 죽여도 남은 공격 소리는 그대로 */ } else { P-=DMG; missSfx() }
}
const dirOf=k=>(k==='a'||k==='arrowleft')?-1:(k==='d'||k==='arrowright')?1:0;
addEventListener('keydown',e=>{
  if(e.repeat) return;
  const k=e.key.toLowerCase();
  if(k===' '||k==='enter'){ if(!running) start(); return }
  const dir=dirOf(k);
  if(!dir||!running) return;
  e.preventDefault();
  P_dir=dir; pressT=now(); down=dir;
  const t=now()-(+$('off').value||0)/1000;
  const c=enemies.flatMap(e=>e.atks.filter(a=>!a.done&&!a.held&&Math.abs(t-a.time)<=win()).map(a=>({e,a})));
  if(!c.length) return; // 이른 입력은 무시 (난타 페널티 없음)
  const byDt=(x,y)=>Math.abs(t-x.a.time)-Math.abs(t-y.a.time), pool=c.filter(o=>o.a.dir===dir).sort(byDt);
  if(!pool.length){ const {e:en,a}=c.sort(byDt)[0]; resolve(en,a,'WRONG SIDE',false); return } // 맞는 방향이 없으면 가장 가까운 하나만 실패
  const seen=new Set();
  for(const {e:en,a} of pool){ if(seen.has(en)) continue; seen.add(en); // 한 번의 패링으로 같은 방향 적 전부 (적당 1회)
    if(a.rel){ a.held=true; fx.push({w:'HOLD!',ms:'',x:en.px??PX,y:en.py??GY,t0:now(),col:'#ff0',sub:''}); holdTone(now(),Math.max(.05,a.rel-now())); continue } // 꾹 누르기: 누른 것만 인정, 판정은 뗄 때
    const dt=t-a.time, ms=Math.round(dt*1000)+'ms';
    if(Math.abs(dt)<=win()/2) resolve(en,a,'PERFECT '+ms,true);
    else resolve(en,a,(dt<0?'EARLY ':'LATE ')+ms,true); }
});

addEventListener('keyup',e=>{ // 꾹 누르기 판정: 뗄 타이밍(rel) ±win 이면 성공, 너무 일찍 떼면 실패 (너무 늦으면 step 에서 HOLD TOO LONG)
  const dir=dirOf(e.key.toLowerCase());
  if(!dir||!running) return;
  if(down===dir) down=0;
  const t=now()-(+$('off').value||0)/1000;
  for(const en of enemies.slice()) for(const a of en.atks) if(a.held&&!a.done&&a.dir===dir&&enemies.includes(en)){
    const dt=t-a.rel, ms=Math.round(dt*1000)+'ms';
    if(dt<-win()) resolve(en,a,'RELEASED EARLY '+ms,false);
    else if(Math.abs(dt)<=win()/2) resolve(en,a,'PERFECT '+ms,true);
    else resolve(en,a,(dt<0?'EARLY ':'LATE ')+ms,true) }
});

// ---- 그리기: 도형. 적 = 글리치 파편(shard), 주인공 = 삼각형 ----
function poly(pts,x,y,r,rot,sx,sy){
  g.beginPath();
  pts.forEach(([px,py],i)=>{const X=px*sx*r,Y=py*sy*r,c=Math.cos(rot),n=Math.sin(rot);
    const qx=x+X*c-Y*n,qy=y+X*n+Y*c; i?g.lineTo(qx,qy):g.moveTo(qx,qy)});
  g.closePath();
}
const PX=360, GY=262;
function drawEnemy(e,t){
  const el=t-e.cs; if(el<0) return;
  const ty=e.type, pat=ty.pat, N=e.N, sI=e.sI, k=clamp(Math.floor(el/e.sl),0,N-1), s=e.side, ph=el/e.sl-k;
  const warn=!e.atks[0].done&&el>=(sI-(ty.w||1))*e.sl&&el<sI*e.sl; // 공격 한 박 전: 빛남
  const sp=ty.speed, sB=Math.floor(sI/sp), num=ty.once?Math.max(0,sB-Math.floor(k/sp)):pat.slice(k+1,sI+1).filter(v=>v).length, /* 4몹(연두): 눈금 한 칸 다가올 때마다 1씩 감소 */ /* 소리 날 때마다 1씩 감소 */ dist=NEAR+CELL*(.5+Math.min(6,Math.max(0,sB-Math.floor(k/sp)))), /* 눈금 한 칸 = 1박, 칸 가운데에 위치 */ hop=(pat[k]&&k<=sI)?14*Math.max(0,1-ph*5):0; // 슬롯이 아니라 '박' 기준으로 한 칸씩 (눈금과 일치)
  const lane=e.lane, R=27*(ty.size||1), x=PX+s*dist, base=GY-lane*40, y=base-hop, gl=2; e.px=x; e.py=y; // 높이 일정 · gl = 3색 원 겹침 간격(고정)
  g.save();
  if(warn){g.shadowColor=ty.cols[0];g.shadowBlur=25}
  g.globalCompositeOperation='lighter';
  ty.cols.forEach((col,i)=>{g.strokeStyle=col; g.fillStyle=warn?col+'8':col+'4'; g.lineWidth=warn?4:3; g.beginPath(); g.arc(x+(i-1)*gl,y,R*.75,0,7); g.fill(); g.stroke()});
  g.restore();
  g.save(); g.textAlign='center'; g.textBaseline='middle'; g.font='bold 22px monospace'; g.fillStyle=num?'#fff':'#f55'; g.lineWidth=4; g.strokeStyle='#000'; g.lineJoin='round'; g.strokeText(num,x,y); g.fillText(num,x,y); g.restore(); // 공격까지 남은 박 (0 = 지금 패링)
  const ha=e.atks.find(a=>a.rel&&!a.done); if(ha){ const W=44, f=ha.held?clamp((ha.rel-t)/(ha.rel-ha.time),0,1):1; g.fillStyle='#000a'; g.fillRect(x-W/2,y+21,W,8); g.fillStyle=ha.held?(Math.abs(t-ha.rel)<=win()?'#4f4':'#ff0'):'#fa0'; g.fillRect(x-W/2,y+21,W*f,8); g.strokeStyle='#ff0'; g.lineWidth=1.5; g.strokeRect(x-W/2,y+21,W,8); if(ha.held){ g.save(); g.strokeStyle='#ff0'; g.lineWidth=5; g.beginPath(); g.moveTo(x,y); g.lineTo(PX,GY); g.stroke(); g.restore() } } // 꾹 누르기 몹: 몹 아래 게이지. 누르기 전엔 가득(주황) → 누르면 줄어듦(노랑), 0 = 뗄 타이밍, 뗄 수 있는 구간은 초록 + 누르는 중엔 빔
  g.fillStyle=ty.cols[1];g.font='11px monospace';g.textAlign='center';g.fillText(ty.name+(e.hp>1?' HP'+e.hp:''),x,base-26);g.textAlign='left';
}
function draw(){
  g.clearRect(0,0,720,360); g.lineJoin='round'; g.lineWidth=3;
  g.fillStyle='#333'; g.fillRect(0,300,720,60);
  g.strokeStyle='#999'; g.lineWidth=2; g.beginPath(); // 줄자: 칸 하나 = 1박, 0칸 = 공격 위치
  for(const s of [-1,1]){ g.moveTo(PX+s*NEAR,300); g.lineTo(PX+s*(NEAR+7*CELL),300);
    for(let i=0;i<=7;i++){const x=PX+s*(NEAR+i*CELL); g.moveTo(x,300); g.lineTo(x,i%2?316:324)} }
  g.stroke(); g.lineWidth=3; g.fillStyle='#888'; g.font='11px monospace'; g.textAlign='center';
  for(let i=0;i<7;i++) for(const s of [-1,1]) g.fillText(i,PX+s*(NEAR+(i+.5)*CELL),345);
  g.textAlign='left';
  if(running) [...enemies].sort((a,b)=>b.lane-a.lane).forEach(e=>drawEnemy(e,now()));
  g.strokeStyle='#9ad0ff'; g.fillStyle='#9ad0ff33'; g.lineWidth=3;
  poly([[0,-1],[.9,.8],[-.9,.8]],PX,GY,40,0,1,1); g.fill(); g.stroke();
  if(ac&&(now()-pressT<.2||down)){g.strokeStyle='#fff';g.lineWidth=7;g.beginPath();g.arc(PX,GY,62,P_dir>0?-1.1:Math.PI-1.1,P_dir>0?1.1:Math.PI+1.1);g.stroke();g.lineWidth=3}
  g.fillStyle='#eee';g.font='16px monospace';
  g.fillText('HP '+'♥'.repeat(Math.max(P||0,0)),20,40);
  g.fillStyle=streak>=LAYERS[0]?'#fc3':'#888'; g.fillText('COMBO x'+streak+'  ♪'+'■'.repeat(LAYERS.filter(n=>streak>=n).length)+'□'.repeat(LAYERS.filter(n=>streak<n).length),20,64); g.fillStyle='#eee';
  g.fillText(BOSSES[stage]?'BOSS '+bossMode.toUpperCase()+'  KILLS '+(kills||0)+'/'+bossTotal:'STAGE '+stage+'  KILLS '+(kills||0)+'/'+goal(),480,40);
  if(BOSSES[stage]&&running){ const B=BOSSES[stage], el=Math.max(0,(now()-bossT0)/beatLen()), c=Math.min(B.beats/8-1,el/8|0); // 보스 HP바 = 곡 남은 시간 (1:30 버티면 격파)
    g.fillStyle='#400'; g.fillRect(20,6,680,8); g.fillStyle='#f33'; g.fillRect(20,6,680*Math.max(0,1-el/B.beats),8);
    g.fillStyle='#eee'; g.font='11px monospace'; g.fillText('BOSS '+(stage-24)+' '+bossMode.toUpperCase()+'  '+B.sect(c),20,26); g.font='16px monospace' }
  fx=fx.filter(f=>now()-f.t0<.9);
  for(const f of fx){ const a=now()-f.t0, pop=a<.1?(1-a/.1)*8:0, y=f.y-40-a*40, sub=[f.ms,f.sub].filter(Boolean).join('  '); // 판정 이펙트: 위로 떠오르며 사라짐
    g.save(); g.globalAlpha=1-a/.9; g.textAlign='center'; g.lineJoin='round'; g.strokeStyle='#000'; g.lineWidth=4; g.fillStyle=f.col;
    g.font='bold '+(20+pop)+'px monospace'; g.strokeText(f.w,f.x,y); g.fillText(f.w,f.x,y);
    g.font='bold 14px monospace'; g.strokeText(sub,f.x,y+16); g.fillText(sub,f.x,y+16); g.restore() }
  if(flash>0){g.fillStyle='rgba(255,255,255,'+flash+')';g.font='24px monospace';g.fillText(msg,260,80);flash-=.015}
  if(!running){g.fillStyle='#fff';g.font='28px monospace';g.fillText(over||'Space / Enter 로 시작',220,200)}
}
(function loop(){ if(ac) step(); draw(); requestAnimationFrame(loop) })();
