// MAUI — THE POSTERS (the home page's one script).
//
// The page's sections are complete without this file (index.html). This turns them into the posters: one black
// shape hangs from the top of the page and becomes each thing Maui does. On the first and the last-but-one poster it
// is Maui's head, with eyes; on a feature it is the top of a Mac's display, and the screen plays a recording of the
// real app at actual size (1 pt = 1 CSS px, so the 2× recording lands pixel for pixel on a Retina screen); on the
// last it lets go of the top of the page and comes home to the app's icon.
//
// The shape moves the way the app's notch does: SwiftUI's springs (response, damping) integrated per frame, and one
// outline (the notch's path: flared top corners, rounded bottom). Nothing draws while nothing moves — a recording
// plays by itself, and the frame loop sleeps until a scroll, the pointer or a blink wakes it.

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, parent) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };

/* ---------------------------------------------------------------- springs and the notch's outline */

// A SwiftUI spring: response r (seconds), damping fraction d. Under Reduce Motion it arrives at once.
class Spring {
  constructor(v, r = .42, d = .8) { this.v = v; this.target = v; this.vel = 0; this.tune(r, d); }
  tune(r, d) { this.k = (2 * Math.PI / r) ** 2; this.c = 4 * Math.PI * d / r; return this; }
  to(t, r, d) { this.target = t; if (r) this.tune(r, d); if (RM) this.snap(t); return this; }
  snap(v) { this.v = this.target = v; this.vel = 0; }
  step(dt) { const a = -this.k * (this.v - this.target) - this.c * this.vel; this.vel += a * dt; this.v += this.vel * dt; }
  get settled() { return Math.abs(this.v - this.target) < 1e-3 && Math.abs(this.vel) < 1e-3; }
}
// An eased value that can turn back from wherever it is (a sine ease: gentle at both ends).
class Ease {
  constructor(v) { this.from = this.to = v; this.t0 = 0; this.dur = 0; }
  go(to, dur) { const now = performance.now(); this.from = this.at(now); this.to = to; this.t0 = now; this.dur = RM ? 0 : dur; }
  at(now) { const t = this.dur ? clamp((now - this.t0) / (this.dur * 1000), 0, 1) : 1; return this.from + (this.to - this.from) * (1 - Math.cos(Math.PI * t)) / 2; }
  moving(now) { return this.dur > 0 && now - this.t0 < this.dur * 1000; }
}
const OPEN = [.42, .8], CLOSE = [.5, 1];

// The notch's outline, W × H points, top flare t, bottom radius b. sag: how far the middle of the bottom edge sits
// below the corners, for a shape that moves like liquid.
function notchPath(W, H, t, b, ox = 0, sag = 0) {
  b = clamp(b, 0, Math.min(H - t, (W - 2 * t) / 2)); t = Math.max(0, t);
  const L = ox, R = ox + W, f = n => n.toFixed(2), a = L + t + b, z = R - t - b, k = (z - a) * .36;
  const bottom = Math.abs(sag) < .05 ? `L${f(z)},${f(H)}` : `C${f(a + k)},${f(H + sag)} ${f(z - k)},${f(H + sag)} ${f(z)},${f(H)}`;
  return `M${f(L)},0Q${f(L + t)},0 ${f(L + t)},${f(t)}L${f(L + t)},${f(H - b)}Q${f(L + t)},${f(H)} ${f(a)},${f(H)}`
    + `${bottom}Q${f(R - t)},${f(H)} ${f(R - t)},${f(H - b)}L${f(R - t)},${f(t)}Q${f(R - t)},0 ${f(R)},0Z`;
}

// Shapes, in points.
const SH = {
  head: { W: 376, H: 241, t: 38, b: 109 },   // the icon's head: 612 × 392 on its 1024 grid, flare 62, bottom 178
};
// A recording is shown as a screen: the shape becomes the top of a display — a 12-pt edge round the screen's sides
// and foot, and the notch's own 14-pt flare at the top (outside the body, so the screen is inset by both).
const EDGE = 12, FLARE = 14, R_IN = 22, INSET = EDGE + FLARE, TAKE = { W: 900, H: 440 };
// On a phone the screen keeps only the middle of each recording: its widest moment and 30 pt either side.
const PHONE_W = { home: 740, files: 560, agent: 560, sessions: 560, focus: 560, note: 560, macs: 600, read: 460, usage: 560, pr: 560 };

// One shape: springs for its size, and layers (the screens) clipped by its outline.
class Notch {
  constructor(path, host, name) {
    const s = SH[name];
    Object.assign(this, { path, host, layers: {}, sag: 0, drawn: '', W: new Spring(s.W), H: new Spring(s.H), t: new Spring(s.t), b: new Spring(s.b) });
  }
  get v() { return { W: this.W.v, H: this.H.v, t: this.t.v, b: this.b.v }; }
  shape(name, feel = OPEN) { const s = SH[name]; for (const k of ['W', 'H', 't', 'b']) this[k].to(s[k], ...feel); }
  snap(name) { const s = SH[name]; for (const k of ['W', 'H', 't', 'b']) this[k].snap(s[k]); }
  add(name, html) {
    const S = SH[name], el = document.createElement('div');
    el.className = 'layer'; el.style.cssText = `width:${S.W}px;height:${S.H}px;left:${-S.W / 2}px`;
    el.innerHTML = `<div class="in">${html}</div>`; el.S = S;
    this.host.appendChild(el); this.layers[name] = el; return el;
  }
  show(name) { const l = this.layers[name]; clearTimeout(l.t); l.classList.add('vis'); void l.offsetWidth; l.classList.add('on'); this.drawn = ''; }
  hide(name, ms = 140) { const l = this.layers[name]; if (!l) return; l.classList.remove('on'); clearTimeout(l.t); l.t = setTimeout(() => l.classList.remove('vis'), ms); }
  step(dt) { const n = Math.max(1, Math.ceil(dt * 240)); for (let i = 0; i < n; i++) for (const k of ['W', 'H', 't', 'b']) this[k].step(dt / n); }
  get settled() { return ['W', 'H', 't', 'b'].every(k => this[k].settled); }
  render() {
    const { W, H, t, b } = this.v, d = notchPath(W, H, t, b, -W / 2, this.sag);
    if (d === this.drawn) return;
    this.drawn = d; this.path.setAttribute('d', d);
    for (const k in this.layers) { const l = this.layers[k]; if (l.classList.contains('vis')) l.style.clipPath = `path('${notchPath(W, H, t, b, (l.S.W - W) / 2, this.sag)}')`; }
  }
}

/* ---------------------------------------------------------------- the page's sections, as posters */

const story = $('#story'), root = document.documentElement;
const posters = $$('.poster', story).map((el, i) => ({
  el, i, id: el.id, kind: el.dataset.kind, clip: el.dataset.clip, loop: 'loop' in el.dataset,
  steps: $$('.steps li', el).map(li => [parseFloat(li.dataset.t) || 0, li.classList.contains('quiet') ? '' : li.textContent]),
}));
const N = posters.length, LAST = N - 1;
const NARROW = (innerWidth || screen.width) < 760;

// The stage: one sticky screen-high frame holding the shape, the end's icon, and the sections laid over each other.
const stage = document.createElement('div');
stage.className = 'stage';
stage.innerHTML = `<div class="icon" aria-hidden="true"><img alt="" src="media/icon.png" width="640" height="640" draggable="false"></div>
  <div class="sw" aria-hidden="true"><svg><path fill="#000"/><g class="eyes"></g></svg><div class="host"></div><div class="hit"></div></div>`;
story.prepend(stage);
const iconEl = $('.icon', stage), sw = $('.sw', stage), pathEl = $('path', sw), hit = $('.hit', sw);
const A = new Notch(pathEl, $('.host', sw), 'head');

for (const p of posters) {
  // Each section joins the stage; its place in the scroll (and its #link) becomes a screen-high slot.
  const slot = document.createElement('div');
  slot.className = 'slot'; slot.style.top = `calc(var(--vh, 100svh) * ${p.i})`;
  if (p.id) { slot.id = p.id; p.el.removeAttribute('id'); p.el.dataset.id = p.id; }
  story.append(slot); stage.append(p.el);
  // The word, letter by letter for its rise; a screen reader reads it whole.
  const word = $('.word', p.el), text = word.textContent.trim();
  word.innerHTML = `<span class="sr-only">${text}</span><span class="letters" aria-hidden="true">${[...text].map((c, i) => `<b style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</b>`).join('')}</span>`;
  p.word = word;
  // The caption's eyebrow: where it is in the story, and — on a feature — the step its recording is on, with a
  // control to pause it.
  const cap = $('.cap', p.el);
  if (cap) {
    cap.insertAdjacentHTML('afterbegin', `<div class="eye"><span class="no">${String(p.i + 1).padStart(2, '0')} / ${N}</span>`
      + (p.clip ? '<button type="button" class="pp"></button>' : '') + '<span class="step"></span></div>');
    p.step = $('.step', cap); p.pp = $('.pp', cap);
  }
  if (p.clip) {
    const W = NARROW ? Math.min(TAKE.W, PHONE_W[p.clip] || 600) : TAKE.W, name = 'm_' + p.clip;
    SH[name] = { W: W + 2 * INSET, H: TAKE.H + EDGE, t: FLARE, b: R_IN + EDGE };
    // Reduce Motion: the recording waits on its key moment, and plays when asked.
    const poster = RM ? `media/stills/${p.clip}.jpg` : `media/${p.clip}.jpg`;
    p.layer = A.add(name, `<div class="scr" style="left:${INSET}px;width:${W}px;height:${TAKE.H}px;border-radius:0 0 ${R_IN}px ${R_IN}px;--vw:${TAKE.W}px;--vx:${(W - TAKE.W) / 2}px">`
      + `<video muted playsinline preload="none"${p.loop ? ' loop' : ''} poster="${poster}" data-src="media/${p.clip}.mp4" aria-hidden="true"></video></div>`);
    p.video = $('video', p.layer);
  }
}
story.style.height = `calc(var(--vh, 100svh) * ${N})`;
// One screen's height, in the unit the scroll is measured in, for the stage and the slots alike.
const measure = () => root.style.setProperty('--vh', innerHeight + 'px');

/* ---------------------------------------------------------------- geometry */

const m = () => clamp(innerWidth * .024, 20, 40), phone = () => innerWidth < 760;
const shapeOf = p => p.clip ? 'm_' + p.clip : 'head';
const endEl = $('.end', posters[LAST].el), lastWord = posters[LAST].word;

// The end's column, fitted between the top bar and the last word: the icon, then the button and its lines.
// The icon's head (Maui.icon, head.svg) is the page's head — a 488-pt body on its 1024 grid hanging from the tile's
// top edge — so the head lands on it at 488·S/1024 wide.
function iconBox() {
  const vh = innerHeight, M = m(), base = parseFloat(root.style.getPropertyValue('--base')) || M;
  const fs = parseFloat(lastWord.style.getPropertyValue('--fs')) || 160;
  const wordTop = vh - base - fs * .76, bar = M + 44, endH = endEl.offsetHeight || 120, GAP = phone() ? 26 : 34;
  const room = wordTop - (phone() ? 36 : 56) - bar;
  const S = clamp(room - endH - GAP, phone() ? 120 : 150, phone() ? 230 : 290);
  const top = bar + Math.max(0, room - (S + GAP + endH)) * (phone() ? .5 : .42);
  root.style.setProperty('--et', top + S + GAP + 'px');
  return { S, top };
}
function zoomFor(p) {
  const vw = innerWidth, vh = innerHeight, maxW = phone() ? vw - 2 * m() : vw - 2 * (m() + 120), maxH = phone() ? vh * .4 : vh * .52;
  if (p.kind === 'head') return Math.min(2.5, (phone() ? vw - 2 * (m() + 78) : maxW) / SH.head.W, maxH / SH.head.H);   // clear of the top links on a phone
  if (p.kind === 'icon') return iconBox().S * 488 / 1024 / (SH.head.W - 2 * SH.head.t);
  const S = SH[shapeOf(p)];
  return Math.min(1, maxW / S.W, maxH / S.H);   // the real app at actual size, so a 2× recording stays sharp
}
// Every word fills the room the caption leaves it, and sits on one shared baseline: high enough that the deepest
// tail of the biggest word (g, j, p, q, y) rests on the bottom margin.
function fitWords() {
  const vw = innerWidth, vh = innerHeight, M = m();
  const max = phone() ? vw * .25 : Math.min(vw * .17, vh * .27, 300);
  const room = phone() ? vw - 2 * M : vw - 2 * M - Math.min(320, vw * .26) - vw * .05;
  let biggest = 0;
  for (const p of posters) {
    const w = p.word, R = p.kind === 'icon' ? vw - 2 * M : room;
    w.style.setProperty('--fs', max + 'px');
    const width = $('.letters', w).scrollWidth, fs = width > R ? max * R / width : max;
    w.style.setProperty('--fs', fs + 'px'); biggest = Math.max(biggest, fs);
  }
  const ctx = fitWords.ctx || (fitWords.ctx = document.createElement('canvas').getContext('2d'));
  ctx.font = `800 ${biggest}px ${getComputedStyle(posters[0].word).fontFamily}`;
  const base = M + ctx.measureText('gjpqy').actualBoundingBoxDescent;
  root.style.setProperty('--base', base + 'px');
  const mark = document.createElement('i'); mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  for (const { word } of posters) { word.style.bottom = '0px'; $('.letters', word).appendChild(mark); word.style.bottom = base - (word.getBoundingClientRect().bottom - mark.getBoundingClientRect().top) + 'px'; }
  mark.remove();
  setWordHeight();
}
const setWordHeight = () => root.style.setProperty('--wh', parseFloat(getComputedStyle(posters[Math.max(cur, 0)].word).fontSize) * .78 + 'px');

/* ---------------------------------------------------------------- the material, and the frame loop */

// zoom, the end's drop and lift, swell toward the pointer, a press, the bottom edge that lags and settles; the eyes
const Z = new Spring(1, .62, .86), TY = new Spring(0, .9, .9), LIFT = new Spring(0, .35, .7);
const SWELL = new Spring(0, .3, .8), LEAN = new Spring(0, .35, .85), SQ = new Spring(1, .3, .7), SAG = new Spring(0, .3, .42);
const EYE = new Spring(1, .45, 1), WINK = new Spring(0, .28, .9), LX = new Spring(-.21, .35, .9), LY = new Spring(.41, .35, .9);
const SPRINGS = [Z, TY, LIFT, SWELL, LEAN, SQ, SAG, EYE, WINK, LX, LY];
const FORM = new Ease(0);   // how far the silver tile has formed round the head
const EYES = [-1, 1].map(side => {
  const g = $('.eyes', sw);
  return { side, white: svg('ellipse', { fill: '#fff' }, g), pupil: svg('circle', { fill: '#000' }, g), arc: svg('path', { fill: 'none', stroke: '#fff', 'stroke-linecap': 'round' }, g) };
});
let cur = -1, pointer = null, scrolledAt = -1e9, blinkAt = -1e9, lastH = A.H.v, raf = 0, lastFrame = 0;
// Writes only what changed: a frame that moves nothing touches nothing ('@name' is an attribute, else a style).
const written = new WeakMap();
function write(el, key, value) {
  let seen = written.get(el); if (!seen) written.set(el, seen = {});
  if (seen[key] === value) return; seen[key] = value;
  if (key[0] === '@') el.setAttribute(key.slice(1), value); else el.style.setProperty(key, value);
}

function wake() { if (!raf) { lastFrame = performance.now(); raf = requestAnimationFrame(frame); } }
function frame(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  raf = step(now, dt) ? requestAnimationFrame(frame) : 0;
}
// One frame: moves everything, draws what changed, and says whether anything is still moving.
function step(now, dt) {
  const p = posters[cur], eyed = p && (p.kind === 'head' || p.kind === 'icon');
  const { W, H, t } = A.v, z = Z.v, r = sw.getBoundingClientRect(), cx = r.left;
  // the head swells toward your pointer and leans to it
  let near = 0, lean = 0;
  if (pointer && !RM && eyed) {
    const bottom = r.top + (H + A.sag) * z * SQ.v, dx = Math.max(0, Math.abs(pointer.x - cx) - (W * z) / 2), dy = Math.max(0, pointer.y - bottom), d = Math.hypot(dx, dy);
    near = clamp(1 - d / 150, 0, 1); lean = clamp((pointer.x - cx) / (W * z / 2 + 150), -1, 1) * near;
  }
  SWELL.to(near); LEAN.to(lean);
  // the liquid edge: as the shape grows the middle of its bottom edge trails the corners, then settles past them
  const vH = (A.H.v - lastH) / Math.max(dt, 1 / 240); lastH = A.H.v;
  SAG.to(clamp(-vH * .022, -9, 9));
  // at the end the icon lifts a little under your pointer
  const ib = iconEl.getBoundingClientRect();
  LIFT.to(pointer && p?.kind === 'icon' && FORM.to === 1 && pointer.x > ib.left && pointer.x < ib.right && pointer.y > ib.top && pointer.y < ib.bottom ? -7 : 0);
  // the eyes: they follow your pointer, look down at what you scroll, rest on Download at the end, blink now and then
  const e = clamp(EYE.v, 0, 1), eyeY = r.top + H * .638 * z;
  if (now - scrolledAt < 700) { LX.to(0); LY.to(.95); }
  else if (pointer && e > .5) { const dx = pointer.x - cx, dy = pointer.y - eyeY, d = Math.hypot(dx, dy) || 1, mm = clamp(.3 + d / 360, 0, 1); LX.to(dx / d * mm * .9); LY.to(dy / d * mm * .9); }
  else if (p?.kind === 'icon' && e > .5) { const b = $('.pill', endEl).getBoundingClientRect(), dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - eyeY, d = Math.hypot(dx, dy) || 1; LX.to(dx / d * .85); LY.to(dy / d * .85); }
  else { LX.to(-.21); LY.to(.41); }

  A.step(dt); for (const s of SPRINGS) s.step(dt);
  A.sag = SAG.v; A.render();
  const give = (1 + .014 * SWELL.v) * SQ.v, move = `translate(${(LEAN.v * 5).toFixed(2)}px,${(TY.v + LIFT.v).toFixed(2)}px)`, form = FORM.at(now);
  write(sw, 'transform', `${move} scale(${(z * give).toFixed(4)})`);
  // the tile forms round the head as it arrives, and the head it drew gives way to the icon's own (its eyes stay)
  write(iconEl, 'transform', `${move} scale(${(give * (.9 + .1 * form)).toFixed(4)})`);
  write(iconEl, 'opacity', form.toFixed(3));
  write(pathEl, 'fill-opacity', (1 - smooth(.6, 1, form)).toFixed(3));
  write(hit, 'left', -W / 2 + 'px'); write(hit, 'width', W + 'px'); write(hit, 'height', H + 'px');
  write(hit, 'cursor', p?.kind === 'head' ? 'pointer' : 'default'); write(hit, 'pointer-events', p?.kind === 'head' ? 'auto' : 'none');

  const k = (W - 2 * t) / 488, since = (now - blinkAt) / 1000, blink = since < .2 ? Math.sin(since / .2 * Math.PI) : 0;
  for (const { side, white, pupil, arc } of EYES) {
    // a wink in two beats: the eye shuts, then the smile-arc comes up; leaving the head the eyes close
    const ecx = side * 72 * k, ecy = H * .638, rx = 56 * k, ry = 64 * k, wink = side > 0 ? clamp(WINK.v, 0, 1) : 0;
    const open = (1 - blink) * (1 - smooth(0, .55, wink)) * smooth(.15, .85, e), up = smooth(.5, 1, wink) * smooth(.5, 1, e);
    write(white, '@cx', ecx.toFixed(2)); write(white, '@cy', (ecy + ry * (1 - open) * .3).toFixed(2)); write(white, '@rx', rx.toFixed(2)); write(white, '@ry', Math.max(.01, ry * open).toFixed(2));
    write(pupil, '@cx', (ecx + LX.v * rx * .38).toFixed(2)); write(pupil, '@cy', (ecy + LY.v * ry * .4).toFixed(2)); write(pupil, '@r', (27 * k * Math.min(1, open * 1.4)).toFixed(2));
    write(arc, '@d', `M${(ecx - 46 * k).toFixed(2)},${(ecy + 12 * k).toFixed(2)}Q${ecx.toFixed(2)},${(ecy - 40 * k).toFixed(2)} ${(ecx + 46 * k).toFixed(2)},${(ecy + 12 * k).toFixed(2)}`);
    write(arc, '@stroke-width', (34 * k).toFixed(2));
    write(white, 'opacity', open > .03 ? '1' : '0'); write(pupil, 'opacity', open > .03 ? '1' : '0'); write(arc, 'opacity', up.toFixed(3));
  }
  return !A.settled || SPRINGS.some(s => !s.settled) || FORM.moving(now) || since < .25 || now - scrolledAt < 900;
}

// a blink now and then, while there are eyes to blink
(function blinks() {
  setTimeout(() => { const p = posters[cur]; if (!document.hidden && p && (p.kind === 'head' || p.kind === 'icon')) { blinkAt = performance.now(); wake(); } blinks(); }, 3500 + Math.random() * 4500);
})();

/* ---------------------------------------------------------------- the recording on the screen */

const load = v => { if (v && !v.src) { v.src = v.dataset.src; v.preload = 'auto'; } };
const PAUSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1" width="2.5" height="8" rx=".6"/><rect x="6" y="1" width="2.5" height="8" rx=".6"/></svg>';
const PLAY = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 1.2v7.6a.5.5 0 0 0 .76.43l6.1-3.8a.5.5 0 0 0 0-.86l-6.1-3.8a.5.5 0 0 0-.76.43z"/></svg>';
const player = {
  p: null, i: 0, last: 0, autoplay: !RM,   // a pause is the visitor's choice for every recording after it
  start(p) {
    this.p = p; this.i = 0; this.last = 0; p.step.textContent = '';
    load(p.video); p.video.playbackRate = p.clip === 'read' || p.clip === 'sessions' ? 1 : .85;
    try { p.video.currentTime = 0; } catch {}
    if (this.autoplay) p.video.play().catch(() => this.show());
    this.show();
  },
  stop() { if (this.p) this.p.video.pause(); this.p = null; },
  toggle(p) {
    if (this.p !== p) return;
    const v = p.video; this.autoplay = v.paused;
    if (v.paused) { if (v.ended) try { v.currentTime = 0; } catch {} v.play().catch(() => {}); } else v.pause();
    this.show();
  },
  show() { const p = this.p; if (!p?.pp) return; const paused = p.video.paused && this.autoplay === false; p.pp.innerHTML = paused ? PLAY : PAUSE; p.pp.setAttribute('aria-label', paused ? 'Play the recording' : 'Pause the recording'); },
  // the step the recording is on, named as it plays
  tick() {
    const p = this.p; if (!p) return;
    const at = p.video.currentTime; if (at + .05 < this.last) this.i = 0; this.last = at;   // a looping recording came round again
    let text = null; while (p.steps[this.i] && at >= p.steps[this.i][0]) text = p.steps[this.i++][1];
    if (text !== null && p.step.textContent !== text) { const el = p.step; el.classList.add('swap'); void el.offsetWidth; el.textContent = text; el.classList.remove('swap'); }
  },
};
for (const p of posters) if (p.clip) {
  p.video.addEventListener('timeupdate', () => player.tick());
  p.video.addEventListener('play', () => player.show()); p.video.addEventListener('pause', () => player.show());
  p.pp.addEventListener('click', () => player.toggle(p));
}
const nearby = i => { for (const j of [i, i + 1]) load(posters[j]?.video); };

/* ---------------------------------------------------------------- moving between posters */

let shown = null, zTop = 1;
function show(name, how) {   // one of the shape's screens: 'xfade' over what's there, or 'wake' from dark
  const l = A.layers[name], was = shown; shown = name;
  for (const k in A.layers) if (k !== name && k !== was) A.hide(k);
  l.classList.toggle('xfade', how === 'xfade'); l.style.zIndex = ++zTop; A.show(name);
  if (was && was !== name) setTimeout(() => { if (shown === name) A.hide(was); }, how === 'xfade' ? 380 : 0);
}
function hideScreens() { for (const k in A.layers) A.hide(k); shown = null; }
function place(p, snap) {
  const z = zoomFor(p), ty = p.kind === 'icon' ? iconBox().top : 0, slow = p.kind === 'icon' || posters[cur]?.kind === 'icon';
  Z.to(z, slow ? .95 : .62, slow ? .9 : .86); TY.to(ty, .95, .9);
  if (snap) { Z.snap(z); TY.snap(ty); }
  iconEl.style.setProperty('--is', iconBox().S + 'px');
}
let formTimer = 0, winkTimers = [];
function go(i) {
  if (i === cur) return;
  const prev = posters[cur], p = posters[i]; cur = i;
  player.stop(); nearby(i);
  winkTimers.forEach(clearTimeout); winkTimers = [];
  const shape = shapeOf(p), grows = !prev || SH[shape].W * zoomFor(p) >= SH[shapeOf(prev)].W * zoomFor(prev);
  A.shape(shape, grows ? [.62, .82] : [.58, 1]); place(p);
  // screen to screen, the new recording dissolves in over the old (the wallpaper is the same: only the app changes);
  // from the head, the screen wakes as the shape arrives
  if (p.clip) { const name = shapeOf(p); setTimeout(() => { if (cur !== i) return; show(name, shown ? 'xfade' : 'wake'); player.start(p); }, shown ? 0 : 380); }
  else hideScreens();
  clearTimeout(formTimer);
  if (p.kind === 'icon') formTimer = setTimeout(() => { if (cur === i) { FORM.go(1, 1.1); root.dataset.homecoming = ''; wake(); } }, 450);
  else { FORM.go(0, .5); delete root.dataset.homecoming; }
  const eyed = p.kind === 'head' || p.kind === 'icon'; EYE.to(eyed ? 1 : 0, eyed ? .7 : .22, 1); WINK.to(0);
  if (p.id === 'hi' && !RM) winkTimers = [setTimeout(() => { WINK.to(1); wake(); }, 1300), setTimeout(() => { WINK.to(0); wake(); }, 2150)];
  root.dataset.kind = p.kind;
  if (i === LAST) root.dataset.last = ''; else delete root.dataset.last;
  for (const q of posters) { q.el.classList.toggle('gone', q !== p && q.el.classList.contains('on')); q.el.classList.toggle('on', q === p); }
  setWordHeight();
  wake();
}

/* ---------------------------------------------------------------- hands */

// A press on the head, or the icon at the end: it gives a little and winks.
const press = () => { SQ.vel = -1.25; WINK.to(1); setTimeout(() => { WINK.to(0); wake(); }, 520); wake(); };
hit.addEventListener('pointerdown', () => { if (posters[cur]?.kind === 'head') press(); });
iconEl.addEventListener('pointerdown', () => { if (posters[cur]?.kind === 'icon') press(); });
// Download under the pointer: the head winks at you.
document.addEventListener('pointerover', e => { if (e.target.closest?.('.pill')) { WINK.to(1); wake(); } });
document.addEventListener('pointerout', e => { const w = e.target.closest?.('.pill'); if (w && !w.contains(e.relatedTarget)) { WINK.to(0); wake(); } });
addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; const p = posters[cur]; if (p && !p.clip) wake(); }, { passive: true });
document.addEventListener('mouseleave', () => { pointer = null; wake(); });

// The page's copy buttons copy the code beside them.
for (const b of $$('.copy')) b.addEventListener('click', () => {
  const code = b.parentElement.querySelector('code'), icon = b.innerHTML;
  const done = () => { b.classList.add('done'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; setTimeout(() => { b.classList.remove('done'); b.innerHTML = icon; }, 1400); };
  const select = () => getSelection().selectAllChildren(code);
  navigator.clipboard ? navigator.clipboard.writeText(code.textContent).then(done, select) : select();
});

/* ---------------------------------------------------------------- scroll and keys */

function pick() {
  const top = story.getBoundingClientRect().top;
  // before or past the story nothing plays unseen
  if (!innerHeight || top > innerHeight * .5 || -top > (N - .5) * innerHeight) { player.stop(); return; }
  go(clamp(Math.round(-top / innerHeight), 0, LAST));
}
addEventListener('scroll', () => { scrolledAt = performance.now(); requestAnimationFrame(pick); const p = posters[cur]; if (p && !p.clip) wake(); }, { passive: true });
addEventListener('resize', () => { if (!innerWidth || !innerHeight) return; measure(); fitWords(); if (cur >= 0) place(posters[cur]); else pick(); wake(); });
const toPoster = i => scrollTo({ top: story.offsetTop + clamp(i, 0, LAST) * innerHeight, behavior: RM ? 'auto' : 'smooth' });
// Inside the story, the arrow keys, Page Up and Down and the space bar move one poster.
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select') || (e.key === ' ' && e.target.closest?.('button'))) return;
  const top = story.getBoundingClientRect().top; if (top > 1 || -top > LAST * innerHeight + 1) return;
  const by = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
  if (by == null) return; const at = Math.round(-top / innerHeight); if (at + by > LAST && by > 0) return;
  e.preventDefault(); toPoster(at + by);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) player.stop(); else { cur = -1; pick(); } });

// The first layout waits until the page has a size (a viewer may start its frame at none). A sized-late frame left
// every snap point at 0 and the browser re-snapped to the last one, so it starts again from the top — or from the
// poster its link names.
function start() {
  measure(); fitWords(); A.snap('head'); place(posters[0], true);
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView(); else if (!innerWidth || scrollY > story.offsetTop + story.offsetHeight) scrollTo(0, 0);
  // Only now, with every poster's snap point in place, does the page snap (home.css html.js.snaps).
  document.documentElement.classList.add('snaps');
  pick(); wake();
}
if (innerWidth && innerHeight) start();
else addEventListener('resize', function first() { if (!innerWidth || !innerHeight) return; removeEventListener('resize', first); scrollTo(0, 0); start(); });
