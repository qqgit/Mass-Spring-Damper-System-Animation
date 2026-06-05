// ==================== 标签状态 ====================
let tagText = 'm';
let tagStyle = 'default';
let massImg = null;

const STYLE_MAP = {
  default: { size: 18, family: 'Syne, sans-serif', weight: 700 },
  bold:    { size: 18, family: 'Syne, sans-serif', weight: 800 },
  serif:   { size: 20, family: 'Georgia, "Times New Roman", serif', weight: 700 },
  mono:    { size: 16, family: '"DM Mono", "Courier New", monospace', weight: 600 },
  emoji:   { size: 22, family: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', weight: 400 },
};

// ==================== 标签控件 ====================
const tagInput    = document.getElementById('tagInput');
const imgUpload   = document.getElementById('imgUpload');
const imgPreview  = document.getElementById('imgPreview');
const previewImg  = document.getElementById('previewImg');

tagInput.addEventListener('input', () => {
  tagText = tagInput.value || 'm';
  if (!running) drawAll();
});

document.querySelectorAll('.style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tagStyle = btn.dataset.style;
    if (!running) drawAll();
  });
});

imgUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      massImg = img;
      previewImg.src = ev.target.result;
      imgPreview.classList.add('show');
      if (!running) drawAll();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function clearMassImg() {
  massImg = null;
  imgPreview.classList.remove('show');
  previewImg.src = '';
  imgUpload.value = '';
  if (!running) drawAll();
}

document.getElementById('btnClearImg').addEventListener('click', clearMassImg);
document.getElementById('btnRemoveImg').addEventListener('click', clearMassImg);

// ==================== 物理引擎 ====================
let k = 20, m = 2, c = 2, x0 = 2, v0 = 0;
let x, v, t, running = false, paused = false, lastTs, animId;
const DT_CAP = 1 / 30, HIST_MAX = 5000;
let hist = [], energyDissipated = 0;
let dragOff = null, speedMul = 1;
const SPEEDS = [0.25, 0.5, 1, 2, 4];
let speedIdx = 2;

function wn()    { return Math.sqrt(k / m); }
function zeta()  { return c / (2 * Math.sqrt(k * m)); }
function wd()    { let z = zeta(); return z < 1 ? wn() * Math.sqrt(1 - z * z) : 0; }
function sigma() { return c / (2 * m); }
function accel(xv, xp) { return (-k * xp - c * xv) / m; }

function rk4Step(h) {
  let k1v = accel(v, x), k1x = v;
  let k2v = accel(v + .5 * h * k1v, x + .5 * h * k1x), k2x = v + .5 * h * k1v;
  let k3v = accel(v + .5 * h * k2v, x + .5 * h * k2x), k3x = v + .5 * h * k2v;
  let k4v = accel(v + h * k3v, x + h * k3x), k4x = v + h * k3v;
  x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
  v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
}

function resetSim() {
  x = x0; v = v0; t = 0; energyDissipated = 0;
  hist = [{ t: 0, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x }];
  running = false; paused = false;
  cancelAnimationFrame(animId);
  drawAll();
  updateHUD();
}

function startSim() {
  if (running && !paused) return;
  if (!running) resetSim();
  running = true; paused = false;
  lastTs = performance.now();
  animId = requestAnimationFrame(loop);
}

function pauseSim() {
  if (!running) return;
  paused = true;
  cancelAnimationFrame(animId);
}

// ★ 修复：保持 running=true, paused=true，允许连续单步
function stepSim() {
  if (running && !paused) pauseSim();
  running = true;
  paused = true;
  let h = 0.005;
  for (let i = 0; i < 10; i++) {
    energyDissipated += c * v * v * h;
    rk4Step(h);
  }
  t += 0.05;
  hist.push({ t, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x });
  if (hist.length > HIST_MAX) hist.shift();
  drawAll();
  updateHUD();
}

function loop(ts) {
  if (paused) return;
  let dt = Math.min((ts - lastTs) / 1000, DT_CAP) * speedMul;
  lastTs = ts;
  let steps = Math.ceil(dt / 0.0005), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    energyDissipated += c * v * v * h;
    rk4Step(h);
  }
  t += dt;
  hist.push({ t, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x });
  if (hist.length > HIST_MAX) hist.shift();
  drawAll();
  updateHUD();
  animId = requestAnimationFrame(loop);
}

// ==================== 导出 CSV ====================
function exportCSV() {
  if (hist.length < 1) { alert('暂无数据，请先运行模拟'); return; }

  const header = 'time_s,displacement_m,velocity_m_s,acceleration_m_s2,spring_force_N,damping_force_N,net_force_N,kinetic_energy_J,potential_energy_J,total_energy_J\n';

  const rows = hist.map(p => {
    const a = accel(p.v, p.x);
    const fk = -k * p.x;
    const fc = -c * p.v;
    return [p.t, p.x, p.v, a, fk, fc, fk + fc, p.ek, p.ep, p.ek + p.ep]
      .map(val => val.toFixed(6))
      .join(',');
  }).join('\n');

  const meta = [
    '# 弹簧-质量-阻尼系统模拟数据',
    `# k=${k} N/m, m=${m} kg, c=${c} Ns/m`,
    `# x0=${x0} m, v0=${v0} m/s`,
    `# 数据点数: ${hist.length}`,
    `# zeta=${zeta().toFixed(4)}, wn=${wn().toFixed(4)} rad/s`,
  ].join('\n');

  const csv = meta + '\n' + header + rows;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spring_damper_k${k}_m${m}_c${c}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== 绘图工具 ====================
function fitCanvas(c) {
  const r = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(r.width), h = Math.round(r.height);
  if (c.width !== w * dpr || c.height !== h * dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { w, h };
}

function roundRect(c2, x, y, w, h, r) {
  c2.beginPath();
  c2.moveTo(x + r, y);
  c2.lineTo(x + w - r, y);
  c2.quadraticCurveTo(x + w, y, x + w, y + r);
  c2.lineTo(x + w, y + h - r);
  c2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c2.lineTo(x + r, y + h);
  c2.quadraticCurveTo(x, y + h, x, y + h - r);
  c2.lineTo(x, y + r);
  c2.quadraticCurveTo(x, y, x + r, y);
  c2.closePath();
}

function drawGrid(c2, pad, w, h, cols, rows) {
  c2.strokeStyle = 'rgba(255,255,255,.045)';
  c2.lineWidth = 1;
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  for (let i = 0; i <= rows; i++) {
    let yy = pad.t + ph * i / rows;
    c2.beginPath(); c2.moveTo(pad.l, yy); c2.lineTo(w - pad.r, yy); c2.stroke();
  }
  for (let i = 0; i <= cols; i++) {
    let xx = pad.l + pw * i / cols;
    c2.beginPath(); c2.moveTo(xx, pad.t); c2.lineTo(xx, h - pad.b); c2.stroke();
  }
}

// ==================== 系统示意 ====================
const sysCanvas = document.getElementById('sysCanvas');
const ctxS = sysCanvas.getContext('2d');

function drawSystem() {
  const { w, h } = fitCanvas(sysCanvas);
  const c2 = ctxS;
  const massW = 72, massH = 64;
  const restX = w / 2, dispPx = x * 55;
  const massX = restX + dispPx, massY = h / 2;
  const springY = massY - 18, damperY = massY + 18;

  // 平衡线
  c2.setLineDash([3, 4]);
  c2.strokeStyle = 'rgba(255,255,255,.08)';
  c2.lineWidth = 1;
  c2.beginPath();
  c2.moveTo(restX, massY - massH / 2 - 40);
  c2.lineTo(restX, massY + massH / 2 + 40);
  c2.stroke();
  c2.setLineDash([]);

  // 地面
  const groundY = massY + massH / 2 + 16;
  c2.strokeStyle = '#1c2740'; c2.lineWidth = 1.5;
  c2.beginPath(); c2.moveTo(18, groundY); c2.lineTo(w - 18, groundY); c2.stroke();
  for (let gx = 18; gx < w - 18; gx += 12) {
    c2.beginPath(); c2.moveTo(gx, groundY); c2.lineTo(gx - 5, groundY + 6);
    c2.strokeStyle = '#1c2740'; c2.lineWidth = 1; c2.stroke();
  }

  // 墙
  c2.fillStyle = '#1c2740';
  c2.fillRect(28, springY - 12, 5, damperY - springY + 24);

  // 弹簧
  const sStart = 33, sEnd = massX - massW / 2, sLen = sEnd - sStart;
  if (sLen > 16) {
    const coils = 14, amp = Math.min(13, sLen / 8);
    c2.strokeStyle = '#00e5a0'; c2.lineWidth = 2;
    c2.beginPath(); c2.moveTo(sStart, springY);
    for (let i = 0; i <= coils * 2; i++) {
      let sx = sStart + sLen * i / (coils * 2);
      let sy = springY + ((i % 2 === 0) ? -amp : amp);
      if (i === 0 || i === coils * 2) sy = springY;
      c2.lineTo(sx, sy);
    }
    c2.stroke();
    c2.beginPath(); c2.moveTo(sEnd, springY); c2.lineTo(massX - massW / 2, springY);
    c2.strokeStyle = '#00e5a0'; c2.lineWidth = 2; c2.stroke();
  }

  // 阻尼器
  const ds = sStart, de = sEnd, dm = (ds + de) / 2;
  c2.strokeStyle = '#818cf8'; c2.lineWidth = 1.8;
  c2.beginPath(); c2.moveTo(ds, damperY); c2.lineTo(dm - 16, damperY); c2.stroke();
  c2.strokeRect(dm - 16, damperY - 9, 32, 18);
  c2.beginPath(); c2.moveTo(dm + 16, damperY); c2.lineTo(de, damperY); c2.stroke();
  const pistonX = dm - 13 + Math.max(0, Math.min(1, (dispPx + restX - ds) / (de - ds))) * 26;
  c2.fillStyle = '#818cf8'; c2.fillRect(pistonX, damperY - 5, 3, 10);

  // 质量块
  const mLeft = massX - massW / 2, mTop = massY - massH / 2;
  const grd = c2.createLinearGradient(mLeft, mTop, massX + massW / 2, massY + massH / 2);
  grd.addColorStop(0, '#fbbf24'); grd.addColorStop(1, '#d97706');
  c2.fillStyle = grd; roundRect(c2, mLeft, mTop, massW, massH, 6); c2.fill();
  c2.strokeStyle = '#92400e'; c2.lineWidth = 1.2; c2.stroke();

  // 内容：图片优先，否则文字
  if (massImg) {
    const pad = 6;
    const availW = massW - pad * 2, availH = massH - pad * 2;
    const imgRatio = massImg.width / massImg.height;
    const boxRatio = availW / availH;
    let drawW, drawH;
    if (imgRatio > boxRatio) { drawW = availW; drawH = availW / imgRatio; }
    else { drawH = availH; drawW = availH * imgRatio; }
    c2.save();
    roundRect(c2, mLeft + 1, mTop + 1, massW - 2, massH - 2, 5);
    c2.clip();
    c2.drawImage(massImg, massX - drawW / 2, massY - drawH / 2, drawW, drawH);
    c2.restore();
    c2.strokeStyle = '#92400e'; c2.lineWidth = 1.2;
    roundRect(c2, mLeft, mTop, massW, massH, 6); c2.stroke();
  } else {
    const st = STYLE_MAP[tagStyle] || STYLE_MAP.default;
    let fontSize = st.size;
    c2.fillStyle = '#080c14';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.font = st.weight + ' ' + fontSize + 'px ' + st.family;
    while (c2.measureText(tagText).width > massW - 12 && fontSize > 8) {
      fontSize -= 1;
      c2.font = st.weight + ' ' + fontSize + 'px ' + st.family;
    }
    c2.fillText(tagText, massX, massY);
  }

  // 连接点
  c2.fillStyle = '#00e5a0'; c2.beginPath(); c2.arc(mLeft, springY, 3, 0, Math.PI * 2); c2.fill();
  c2.fillStyle = '#818cf8'; c2.beginPath(); c2.arc(mLeft, damperY, 3, 0, Math.PI * 2); c2.fill();

  // 位移箭头
  if (Math.abs(dispPx) > 4) {
    const ay = mTop - 24;
    c2.strokeStyle = '#f43f5e'; c2.fillStyle = '#f43f5e'; c2.lineWidth = 1.8;
    c2.beginPath(); c2.moveTo(restX, ay); c2.lineTo(massX, ay); c2.stroke();
    const dir = dispPx > 0 ? 1 : -1;
    c2.beginPath(); c2.moveTo(massX, ay);
    c2.lineTo(massX - dir * 7, ay - 4); c2.lineTo(massX - dir * 7, ay + 4);
    c2.closePath(); c2.fill();
    c2.font = '400 9px "DM Mono"'; c2.textAlign = 'center';
    c2.fillText('x=' + x.toFixed(2) + 'm', (restX + massX) / 2, ay - 8);
  }

  // 弹簧力箭头
  if (Math.abs(k * x) > 0.1) {
    const fPx = -k * x * 2.5, fy = mTop - 42;
    const fLen = Math.min(Math.abs(fPx), 70) * (fPx > 0 ? 1 : -1);
    if (Math.abs(fLen) > 4) {
      c2.strokeStyle = '#00e5a0'; c2.fillStyle = '#00e5a0'; c2.lineWidth = 2;
      c2.beginPath(); c2.moveTo(massX, fy); c2.lineTo(massX + fLen, fy); c2.stroke();
      const fd = fLen > 0 ? 1 : -1;
      c2.beginPath(); c2.moveTo(massX + fLen, fy);
      c2.lineTo(massX + fLen - fd * 6, fy - 4); c2.lineTo(massX + fLen - fd * 6, fy + 4);
      c2.closePath(); c2.fill();
      c2.font = '400 8px "DM Mono"'; c2.textAlign = 'center';
      c2.fillText('Fk', massX + fLen / 2, fy - 6);
    }
  }

  // 图例
  c2.font = '400 9px "DM Mono"'; c2.textAlign = 'left';
  const lg = w - 110;
  c2.strokeStyle = '#00e5a0'; c2.lineWidth = 2;
  c2.beginPath(); c2.moveTo(lg, 16); c2.lineTo(lg + 10, 16); c2.stroke();
  c2.fillStyle = '#00e5a0'; c2.fillText('k 弹簧', lg + 14, 19);
  c2.strokeStyle = '#818cf8'; c2.lineWidth = 2;
  c2.beginPath(); c2.moveTo(lg, 30); c2.lineTo(lg + 10, 30); c2.stroke();
  c2.fillStyle = '#818cf8'; c2.fillText('c 阻尼器', lg + 14, 33);
  c2.fillStyle = '#fbbf24'; c2.fillRect(lg, 42, 10, 8);
  c2.fillStyle = '#fbbf24'; c2.fillText('m 质量块', lg + 14, 50);
  c2.fillStyle = '#f43f5e'; c2.fillRect(lg, 60, 10, 2);
  c2.fillText('位移箭头', lg + 14, 63);
}

// ==================== x(t) 图 ====================
const gxtCanvas = document.getElementById('gxt');
const ctxT = gxtCanvas.getContext('2d');

function drawXt() {
  const { w, h } = fitCanvas(gxtCanvas);
  const c2 = ctxT;
  const pad = { l: 36, r: 8, t: 8, b: 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (hist.length < 2) return;
  drawGrid(c2, pad, w, h, 4, 4);

  let tMin = hist[0].t, tMax = hist[hist.length - 1].t;
  if (tMax - tMin < 0.5) tMax = tMin + 0.5;
  let xAbs = 0;
  for (let p of hist) xAbs = Math.max(xAbs, Math.abs(p.x));
  xAbs = Math.max(xAbs, 0.5) * 1.2;

  // 包络线
  let z = zeta();
  if (z < 1 && z > 0.001) {
    c2.strokeStyle = 'rgba(0,229,160,.1)'; c2.lineWidth = 1;
    let sig = sigma(), wd0 = wd();
    let env0 = Math.sqrt(x0 * x0 + ((v0 + sig * x0) / wd0) * ((v0 + sig * x0) / wd0));
    for (let s = 1; s >= -1; s -= 2) {
      c2.beginPath();
      for (let i = 0; i <= 120; i++) {
        let tt = tMin + (tMax - tMin) * i / 120;
        let env = s * env0 * Math.exp(-sig * tt);
        let px = pad.l + pw * (tt - tMin) / (tMax - tMin);
        let py = pad.t + ph * (.5 - env / (2 * xAbs));
        i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
      }
      c2.stroke();
    }
  }

  // 零线
  c2.strokeStyle = 'rgba(255,255,255,.12)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(pad.l, pad.t + ph / 2); c2.lineTo(w - pad.r, pad.t + ph / 2); c2.stroke();

  // 曲线
  c2.strokeStyle = '#00e5a0'; c2.lineWidth = 2; c2.beginPath();
  for (let i = 0; i < hist.length; i++) {
    let px = pad.l + pw * (hist[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (.5 - hist[i].x / (2 * xAbs));
    py = Math.max(pad.t, Math.min(h - pad.b, py));
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke();

  // 标签
  c2.fillStyle = '#3d4a5c'; c2.font = '400 8px "DM Mono"'; c2.textAlign = 'right';
  c2.fillText('+' + xAbs.toFixed(1), pad.l - 3, pad.t + 9);
  c2.fillText('-' + xAbs.toFixed(1), pad.l - 3, h - pad.b);
  c2.textAlign = 'center';
  c2.fillText(tMin.toFixed(1) + 's', pad.l, h - pad.b + 10);
  c2.fillText(tMax.toFixed(1) + 's', pad.l + pw, h - pad.b + 10);
}

// ==================== 相图 ====================
const gxvCanvas = document.getElementById('gxv');
const ctxP = gxvCanvas.getContext('2d');

function drawPhase() {
  const { w, h } = fitCanvas(gxvCanvas);
  const c2 = ctxP;
  const pad = { l: 36, r: 8, t: 8, b: 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (hist.length < 2) return;
  drawGrid(c2, pad, w, h, 4, 4);

  let xAbs = 0, vAbs = 0;
  for (let p of hist) { xAbs = Math.max(xAbs, Math.abs(p.x)); vAbs = Math.max(vAbs, Math.abs(p.v)); }
  xAbs = Math.max(xAbs, .3) * 1.2;
  vAbs = Math.max(vAbs, .3) * 1.2;

  c2.strokeStyle = 'rgba(255,255,255,.1)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(pad.l, pad.t + ph / 2); c2.lineTo(w - pad.r, pad.t + ph / 2); c2.stroke();
  c2.beginPath(); c2.moveTo(pad.l + pw / 2, pad.t); c2.lineTo(pad.l + pw / 2, h - pad.b); c2.stroke();

  const n = hist.length;
  for (let i = 1; i < n; i++) {
    let ratio = i / n;
    let r = Math.round(244 * ratio), g = Math.round(229 - 166 * ratio), b = Math.round(160 - 89 * ratio);
    c2.strokeStyle = `rgba(${r},${g},${b},${.25 + .75 * ratio})`;
    c2.lineWidth = 1.4; c2.beginPath();
    c2.moveTo(pad.l + pw * (.5 + hist[i - 1].x / (2 * xAbs)), pad.t + ph * (.5 - hist[i - 1].v / (2 * vAbs)));
    c2.lineTo(pad.l + pw * (.5 + hist[i].x / (2 * xAbs)), pad.t + ph * (.5 - hist[i].v / (2 * vAbs)));
    c2.stroke();
  }

  let last = hist[n - 1];
  let cpx = pad.l + pw * (.5 + last.x / (2 * xAbs));
  let cpy = pad.t + ph * (.5 - last.v / (2 * vAbs));
  c2.fillStyle = 'rgba(244,63,94,.2)'; c2.beginPath(); c2.arc(cpx, cpy, 8, 0, Math.PI * 2); c2.fill();
  c2.fillStyle = '#f43f5e'; c2.beginPath(); c2.arc(cpx, cpy, 3.5, 0, Math.PI * 2); c2.fill();

  c2.fillStyle = '#3d4a5c'; c2.font = '400 8px "DM Mono"'; c2.textAlign = 'center';
  c2.fillText('x', pad.l + pw / 2, h - pad.b + 10);
  c2.save(); c2.translate(10, pad.t + ph / 2); c2.rotate(-Math.PI / 2); c2.fillText('v', 0, 0); c2.restore();
}

// ==================== 能量图 ====================
const getCanvas = document.getElementById('get');
const ctxE = getCanvas.getContext('2d');

function drawEnergy() {
  const { w, h } = fitCanvas(getCanvas);
  const c2 = ctxE;
  const pad = { l: 36, r: 8, t: 8, b: 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (hist.length < 2) return;
  drawGrid(c2, pad, w, h, 4, 4);

  let tMin = hist[0].t, tMax = hist[hist.length - 1].t;
  if (tMax - tMin < 0.5) tMax = tMin + 0.5;
  let eMax = 0;
  for (let p of hist) eMax = Math.max(eMax, p.ek + p.ep);
  eMax = Math.max(eMax, 0.5) * 1.15;

  c2.strokeStyle = '#fbbf24'; c2.lineWidth = 1.5; c2.globalAlpha = .85; c2.beginPath();
  for (let i = 0; i < hist.length; i++) {
    let px = pad.l + pw * (hist[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (1 - hist[i].ek / eMax);
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.globalAlpha = 1;

  c2.strokeStyle = '#818cf8'; c2.lineWidth = 1.5; c2.globalAlpha = .85; c2.beginPath();
  for (let i = 0; i < hist.length; i++) {
    let px = pad.l + pw * (hist[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (1 - hist[i].ep / eMax);
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.globalAlpha = 1;

  c2.setLineDash([4, 3]); c2.strokeStyle = 'rgba(255,255,255,.25)'; c2.lineWidth = 1; c2.beginPath();
  for (let i = 0; i < hist.length; i++) {
    let px = pad.l + pw * (hist[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (1 - (hist[i].ek + hist[i].ep) / eMax);
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.setLineDash([]);

  c2.fillStyle = '#3d4a5c'; c2.font = '400 8px "DM Mono"'; c2.textAlign = 'right';
  c2.fillText(eMax.toFixed(1) + 'J', pad.l - 3, pad.t + 9);
  c2.textAlign = 'center';
  c2.fillText(tMin.toFixed(1) + 's', pad.l, h - pad.b + 10);
  c2.fillText(tMax.toFixed(1) + 's', pad.l + pw, h - pad.b + 10);
  c2.font = '400 8px "DM Mono"'; c2.textAlign = 'left';
  c2.fillStyle = '#fbbf24'; c2.fillText('Ek', w - 45, pad.t + 14);
  c2.fillStyle = '#818cf8'; c2.fillText('Ep', w - 28, pad.t + 14);
}

// ==================== 受力图 ====================
const forceCanvas = document.getElementById('forceCanvas');
const ctxF = forceCanvas.getContext('2d');

function drawForce() {
  const { w, h } = fitCanvas(forceCanvas);
  const c2 = ctxF;
  const pad = { l: 36, r: 8, t: 8, b: 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (hist.length < 2) return;
  drawGrid(c2, pad, w, h, 4, 4);

  let tMin = hist[0].t, tMax = hist[hist.length - 1].t;
  if (tMax - tMin < 0.5) tMax = tMin + 0.5;

  let fMax = 0;
  const forces = hist.map(p => {
    let fs = -k * p.x, fD = -c * p.v, fT = fs + fD;
    fMax = Math.max(fMax, Math.abs(fs), Math.abs(fD), Math.abs(fT));
    return { t: p.t, fs, fD, fT };
  });
  fMax = Math.max(fMax, 1) * 1.15;

  c2.strokeStyle = 'rgba(255,255,255,.1)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(pad.l, pad.t + ph / 2); c2.lineTo(w - pad.r, pad.t + ph / 2); c2.stroke();

  // 弹簧力
  c2.strokeStyle = '#00e5a0'; c2.lineWidth = 1.3; c2.globalAlpha = .7; c2.beginPath();
  for (let i = 0; i < forces.length; i++) {
    let px = pad.l + pw * (forces[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (.5 - forces[i].fs / (2 * fMax));
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.globalAlpha = 1;

  // 阻尼力
  c2.strokeStyle = '#818cf8'; c2.lineWidth = 1.3; c2.globalAlpha = .7; c2.beginPath();
  for (let i = 0; i < forces.length; i++) {
    let px = pad.l + pw * (forces[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (.5 - forces[i].fD / (2 * fMax));
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.globalAlpha = 1;

  // 合力
  c2.setLineDash([4, 3]); c2.strokeStyle = '#f43f5e'; c2.lineWidth = 1.3; c2.globalAlpha = .7; c2.beginPath();
  for (let i = 0; i < forces.length; i++) {
    let px = pad.l + pw * (forces[i].t - tMin) / (tMax - tMin);
    let py = pad.t + ph * (.5 - forces[i].fT / (2 * fMax));
    i === 0 ? c2.moveTo(px, py) : c2.lineTo(px, py);
  }
  c2.stroke(); c2.setLineDash([]); c2.globalAlpha = 1;

  c2.fillStyle = '#3d4a5c'; c2.font = '400 8px "DM Mono"'; c2.textAlign = 'right';
  c2.fillText('+' + fMax.toFixed(1) + 'N', pad.l - 3, pad.t + 9);
  c2.fillText('-' + fMax.toFixed(1) + 'N', pad.l - 3, h - pad.b);
  c2.textAlign = 'center';
  c2.fillText(tMin.toFixed(1) + 's', pad.l, h - pad.b + 10);
  c2.fillText(tMax.toFixed(1) + 's', pad.l + pw, h - pad.b + 10);

  c2.font = '400 8px "DM Mono"'; c2.textAlign = 'left';
  const lx = pad.l + 6;
  c2.fillStyle = '#00e5a0'; c2.fillText('Fk', lx, pad.t + 14);
  c2.fillStyle = '#818cf8'; c2.fillText('Fc', lx + 30, pad.t + 14);
  c2.fillStyle = '#f43f5e'; c2.fillText('F合', lx + 56, pad.t + 14);
}

// ==================== 总绘制 ====================
function drawAll() {
  drawSystem();
  drawXt();
  drawPhase();
  drawEnergy();
  drawForce();
}

// ==================== HUD ====================
function updateHUD() {
  let a = accel(v, x);
  document.getElementById('dPos').innerHTML = x.toFixed(3) + '<span class="un">m</span>';
  document.getElementById('dVel').innerHTML = v.toFixed(3) + '<span class="un">m/s</span>';
  document.getElementById('dAcc').innerHTML = a.toFixed(3) + '<span class="un">m/s²</span>';
  document.getElementById('dTim').innerHTML = t.toFixed(2) + '<span class="un">s</span>';
  let ek = .5 * m * v * v, ep = .5 * k * x * x;
  document.getElementById('dEng').innerHTML = (ek + ep).toFixed(3) + '<span class="un">J</span>';

  document.getElementById('iWn').innerHTML = wn().toFixed(2) + '<span class="u"> rad/s</span>';
  let z = zeta();
  document.getElementById('iZeta').textContent = z.toFixed(4);
  document.getElementById('iWd').innerHTML = wd().toFixed(2) + '<span class="u"> rad/s</span>';
  document.getElementById('iPer').innerHTML = z < 1
    ? (2 * Math.PI / wd()).toFixed(3) + '<span class="u"> s</span>'
    : '∞';
  document.getElementById('iSig').innerHTML = sigma().toFixed(3) + '<span class="u"> /s</span>';
  document.getElementById('iFreq').innerHTML = z < 1
    ? (wd() / (2 * Math.PI)).toFixed(2) + '<span class="u"> Hz</span>'
    : '—';

  let badge = document.getElementById('statusBadge');
  if (z < 1e-6)       { badge.className = 'badge bu'; badge.textContent = '无阻尼'; }
  else if (z < .99)    { badge.className = 'badge bu'; badge.textContent = '欠阻尼'; }
  else if (Math.abs(z - 1) < .02) { badge.className = 'badge bc'; badge.textContent = '临界阻尼'; }
  else                 { badge.className = 'badge bo'; badge.textContent = '过阻尼'; }

  let eTotal = ek + ep + energyDissipated;
  if (eTotal < 1e-12) eTotal = 1;
  document.getElementById('barEk').style.width = Math.max(0, Math.min(100, ek / eTotal * 100)) + '%';
  document.getElementById('barEp').style.width = Math.max(0, Math.min(100, ep / eTotal * 100)) + '%';
  document.getElementById('barEd').style.width = Math.max(0, 100 - ek / eTotal * 100 - ep / eTotal * 100) + '%';
  document.getElementById('energyText').textContent =
    'Ek: ' + ek.toFixed(2) + ' J · Ep: ' + ep.toFixed(2) + ' J · 已耗散: ' + energyDissipated.toFixed(2) + ' J';
}

// ==================== 控件绑定 ====================
const sliders = [
  { id: 'sK',  val: 'vK',  fmt: v => v.toFixed(1) + ' N/m',  set: v => k = v },
  { id: 'sM',  val: 'vM',  fmt: v => v.toFixed(1) + ' kg',   set: v => m = v },
  { id: 'sC',  val: 'vC',  fmt: v => v.toFixed(1) + ' Ns/m', set: v => c = v },
  { id: 'sX0', val: 'vX0', fmt: v => v.toFixed(2) + ' m',     set: v => x0 = v },
  { id: 'sV0', val: 'vV0', fmt: v => v.toFixed(1) + ' m/s',   set: v => v0 = v },
];

function syncSliders() {
  document.getElementById('sK').value = k;  document.getElementById('vK').textContent = k.toFixed(1) + ' N/m';
  document.getElementById('sM').value = m;  document.getElementById('vM').textContent = m.toFixed(1) + ' kg';
  document.getElementById('sC').value = c;  document.getElementById('vC').textContent = c.toFixed(1) + ' Ns/m';
  document.getElementById('sX0').value = x0; document.getElementById('vX0').textContent = x0.toFixed(2) + ' m';
  document.getElementById('sV0').value = v0; document.getElementById('vV0').textContent = v0.toFixed(1) + ' m/s';
}

sliders.forEach(s => {
  const el = document.getElementById(s.id);
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    s.set(v);
    document.getElementById(s.val).textContent = s.fmt(v);
    if (!running) {
      x = x0; v = v0; t = 0; energyDissipated = 0;
      hist = [{ t: 0, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x }];
      drawAll(); updateHUD();
    }
  });
});

document.getElementById('btnStart').addEventListener('click', startSim);
document.getElementById('btnPause').addEventListener('click', pauseSim);
document.getElementById('btnReset').addEventListener('click', resetSim);
document.getElementById('btnStep').addEventListener('click', stepSim);
document.getElementById('btnSpeed').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  speedMul = SPEEDS[speedIdx];
  document.getElementById('btnSpeed').textContent = '速度 ' + speedMul + '×';
});
document.getElementById('btnExport').addEventListener('click', exportCSV);

// 预设
const presets = {
  under: { k: 20, m: 2, c: 2,    x0: 2,   v0: 0 },
  crit:  { k: 20, m: 2, c: 8.94, x0: 2,   v0: 0 },
  over:  { k: 20, m: 2, c: 20,   x0: 2,   v0: 0 },
  none:  { k: 20, m: 2, c: 0,    x0: 2,   v0: 0 },
  fast:  { k: 80, m: .5, c: 1,   x0: 1.5, v0: 0 },
  slow:  { k: 5, m: 15, c: 3,    x0: 3,   v0: 0 },
};

document.getElementById('presets').addEventListener('click', e => {
  const btn = e.target.closest('.pre');
  if (!btn) return;
  const p = presets[btn.dataset.p];
  if (!p) return;
  k = p.k; m = p.m; c = p.c; x0 = p.x0; v0 = p.v0;
  syncSliders();
  resetSim();
});

// ==================== 拖拽 ====================
sysCanvas.addEventListener('mousedown', e => {
  const rect = sysCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (Math.abs(mx - rect.width / 2 - x * 55) < 50 && Math.abs(my - rect.height / 2) < 45) {
    dragOff = mx - rect.width / 2 - x * 55;
    if (running) pauseSim();
  }
});

sysCanvas.addEventListener('mousemove', e => {
  if (dragOff === null) return;
  const rect = sysCanvas.getBoundingClientRect();
  x = Math.max(-3, Math.min(3, (e.clientX - rect.left - dragOff - rect.width / 2) / 55));
  v = 0; t = 0; energyDissipated = 0;
  hist = [{ t: 0, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x }];
  x0 = x;
  document.getElementById('sX0').value = x;
  document.getElementById('vX0').textContent = x.toFixed(2) + ' m';
  drawAll(); updateHUD();
});

function endDrag() { dragOff = null; }
sysCanvas.addEventListener('mouseup', endDrag);
sysCanvas.addEventListener('mouseleave', endDrag);

sysCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0], rect = sysCanvas.getBoundingClientRect();
  if (Math.abs(touch.clientX - rect.left - rect.width / 2 - x * 55) < 60 &&
      Math.abs(touch.clientY - rect.top - rect.height / 2) < 55) {
    dragOff = touch.clientX - rect.left - rect.width / 2 - x * 55;
    if (running) pauseSim();
  }
}, { passive: false });

sysCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (dragOff === null) return;
  const touch = e.touches[0], rect = sysCanvas.getBoundingClientRect();
  x = Math.max(-3, Math.min(3, (touch.clientX - rect.left - dragOff - rect.width / 2) / 55));
  v = 0; t = 0; energyDissipated = 0;
  hist = [{ t: 0, x, v, ek: .5 * m * v * v, ep: .5 * k * x * x }];
  x0 = x;
  document.getElementById('sX0').value = x;
  document.getElementById('vX0').textContent = x.toFixed(2) + ' m';
  drawAll(); updateHUD();
}, { passive: false });

sysCanvas.addEventListener('touchend', endDrag);

// ==================== 初始化 ====================
resetSim();
window.addEventListener('resize', () => { if (!running) drawAll(); });
