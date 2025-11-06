"use strict";

/* ===== STATE ===== */
const S = {
  canvas: null, ctx: null, W: 0, H: 0,
  cam: { tx: 0, ty: 0, tz: 0, rx: 0.6, ry: 0.9, rz: 0, zoom: 1.7 },
  home: null,
  ui: {},
  mouse: { down: false, btn: 0, x: 0, y: 0, px: 0, py: 0, hover: null, pan: false },
  colors: {
    branch: { positive: "#9ecbff", negative: "#ff9e86", harmonic: "#86ffb6" },
    shell: ["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69"],
    band: {
      "Sub-ELF":"#bdbdbd","ELF/VLF":"#a6cee3","Radio":"#1f78b4","Microwave":"#33a02c","Infrared":"#fb9a99",
      "Visible":"#fdbf6f","Ultraviolet":"#cab2d6","X-Ray":"#6a3d9a","Gamma":"#b15928","Ultra-Gamma":"#ff7f00",
      "Hyper":"#e31a1c","Unknown":"#999999"
    }
  },
  t0: 0,
  time: { t: 0, scaleExp: 0, playing: true, manual: false },
  cfg: null,
  elements: [], harmonics: [],
  forceClear: true
};

/* ===== CONFIG ===== */
function initConfig() {
  const cfg = {
    Zmax: 118,
    b: 0.22,
    alpha: 1.0,
    r0: 0.7,
    R: 3.0,
    decouple_r_growth: false,
    r_growth_override: 0.06,
    branch_mode: "reverse_poloidal",
    freq_mode: "amplitude_coupled",
    f_ref: 2.466070e15,
    kappa_override: 1.0,
    omega: 2.0 * Math.PI * 1.0,
    shells_use_quantum_capacities: true,
    harm_max: 24,
    samples_per_branch: 2048
  };
  cfg.k_phase = 2.0 * Math.PI / Math.log(cfg.Zmax);
  cfg.r_growth = cfg.decouple_r_growth ? cfg.r_growth_override : cfg.b * cfg.k_phase;
  if (cfg.freq_mode === "amplitude_coupled") cfg.kappa = cfg.b * cfg.k_phase;
  else if (cfg.freq_mode === "phase_coupled") cfg.kappa = cfg.k_phase;
  else cfg.kappa = cfg.kappa_override;
  S.cfg = cfg;
}

/* ===== BOOT ===== */
document.addEventListener("DOMContentLoaded", () => {
  bindUI();
  initCanvas();
  initConfig();
  syncUIFromState();
  generateAllPoints();
  renderParams();
  S.home = JSON.parse(JSON.stringify(S.cam));
  S.t0 = performance.now();
  requestAnimationFrame(loop);
});

/* ===== UI ===== */
function bindUI() {
  S.canvas = document.getElementById("canvas");
  S.ctx = S.canvas.getContext("2d", { alpha: false });
  S.ui.colorMode = qs("#colorMode");
  S.ui.size = qs("#size");
  S.ui.opacity = qs("#opacity");
  S.ui.showPos = qs("#showPos");
  S.ui.showNeg = qs("#showNeg");
  S.ui.showHar = qs("#showHar");
  S.ui.auto = qs("#auto");
  S.ui.speed = qs("#speed");
  S.ui.home = qs("#home");
  S.ui.status = qs("#status");
  S.ui.params = qs("#params");
  S.ui.trailLength = qs("#trailLength");
  S.ui.trailOpacity = qs("#trailOpacity");
  S.ui.tt = { box: qs("#tooltip"), sym: qs("#tt-sym"), Z: qs("#tt-Z"), shell: qs("#tt-shell"), band: qs("#tt-band"), branch: qs("#tt-branch"), f: qs("#tt-f") };

  S.ui.camPitch = qs("#camPitch");
  S.ui.camYaw = qs("#camYaw");
  S.ui.camRoll = qs("#camRoll");
  S.ui.camZoom = qs("#camZoom");
  S.ui.camPitchN = qs("#camPitchN");
  S.ui.camYawN = qs("#camYawN");
  S.ui.camRollN = qs("#camRollN");
  S.ui.camZoomN = qs("#camZoomN");
  S.ui.viewFront = qs("#viewFront");
  S.ui.viewTop = qs("#viewTop");
  S.ui.viewSide = qs("#viewSide");
  S.ui.viewIso = qs("#viewIso");

  S.ui.play = qs("#play");
  S.ui.timeScale = qs("#timeScale");
  S.ui.manualTime = qs("#manualTime");
  S.ui.timeScrub = qs("#timeScrub");
  S.ui.timeReset = qs("#timeReset");
  S.ui.omega = qs("#omega");
  S.ui.omegaN = qs("#omegaN");

  S.ui.home.addEventListener("click", () => { Object.assign(S.cam, S.home); syncCamUI(); S.forceClear = true; });

  linkDual(S.ui.camPitch, S.ui.camPitchN, v => { S.cam.rx = deg2rad(clamp(v,-90,90)); });
  linkDual(S.ui.camYaw, S.ui.camYawN, v => { S.cam.ry = deg2rad(clamp(v,-180,180)); });
  linkDual(S.ui.camRoll, S.ui.camRollN, v => { S.cam.rz = deg2rad(clamp(v,-180,180)); });
  linkDual(S.ui.camZoom, S.ui.camZoomN, v => { S.cam.zoom = clamp(v,0.25,6); S.forceClear = true; }, true);

  S.ui.viewFront.addEventListener("click", ()=>setView(0,0,0,1.7));
  S.ui.viewTop.addEventListener("click", ()=>setView(90,0,0,1.7));
  S.ui.viewSide.addEventListener("click", ()=>setView(0,90,0,1.7));
  S.ui.viewIso.addEventListener("click", ()=>setView(35.264,45,0,1.9));

  S.ui.play.addEventListener("change", ()=>{ S.time.playing = S.ui.play.checked; });
  S.ui.timeScale.addEventListener("input", ()=>{ S.time.scaleExp = parseFloat(S.ui.timeScale.value); });
  S.ui.manualTime.addEventListener("change", ()=>{ S.time.manual = S.ui.manualTime.checked; });
  S.ui.timeScrub.addEventListener("input", ()=>{ if (S.time.manual) S.time.t = parseFloat(S.ui.timeScrub.value); });
  S.ui.timeReset.addEventListener("click", ()=>{ S.time.t = 0; S.ui.timeScrub.value = "0"; });
  linkDual(S.ui.omega, S.ui.omegaN, v => { S.cfg.omega = clamp(v,0,20); });

  window.addEventListener("keydown", onKey);
}

/* ===== CANVAS ===== */
function initCanvas() {
  onResize();
  window.addEventListener("resize", onResize);
  S.canvas.addEventListener("mousedown", onDown);
  S.canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  S.canvas.addEventListener("wheel", onWheel, { passive: false });
}
function onResize() {
  S.W = S.canvas.width = window.innerWidth;
  S.H = S.canvas.height = window.innerHeight;
  S.forceClear = true;
}

/* ===== MATH ===== */
const PI2 = Math.PI * 2;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rotX(p,a){const s=Math.sin(a),c=Math.cos(a);return [p[0],c*p[1]-s*p[2],s*p[1]+c*p[2]];}
function rotY(p,a){const s=Math.sin(a),c=Math.cos(a);return [c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]];}
function rotZ(p,a){const s=Math.sin(a),c=Math.cos(a);return [c*p[0]-s*p[1],s*p[0]+c*p[1],p[2]];}
function rad2deg(r){return r*180/Math.PI;}
function deg2rad(d){return d*Math.PI/180;}

/* ===== CAMERA ===== */
function applyCam(p){
  const off = (S.cfg.R) + (S.cfg.r0);
  let q = [p[0]-S.cam.tx, p[1]-S.cam.ty, p[2]-S.cam.tz-off*1.35];
  q = rotX(q,S.cam.rx); q = rotY(q,S.cam.ry); q = rotZ(q,S.cam.rz);
  return q;
}
function proj(p){
  const z = p[2]*0.6 + 3.0;
  const f = 380*S.cam.zoom/z;
  return [S.W*0.5 + p[0]*f, S.H*0.5 - p[1]*f, z, f];
}
function setView(pitchDeg,yawDeg,rollDeg,zoom){
  S.cam.rx = deg2rad(pitchDeg);
  S.cam.ry = deg2rad(yawDeg);
  S.cam.rz = deg2rad(rollDeg);
  S.cam.zoom = zoom;
  syncCamUI();
  S.forceClear = true;
}
function syncCamUI(){
  const pd = +rad2deg(S.cam.rx).toFixed(1);
  const yd = +rad2deg(S.cam.ry).toFixed(1);
  const rd = +rad2deg(S.cam.rz).toFixed(1);
  const zm = +S.cam.zoom.toFixed(2);
  setDual(S.ui.camPitch, S.ui.camPitchN, pd);
  setDual(S.ui.camYaw, S.ui.camYawN, yd);
  setDual(S.ui.camRoll, S.ui.camRollN, rd);
  setDual(S.ui.camZoom, S.ui.camZoomN, zm);
}

/* ===== TOROID ===== */
function thetaOfZ(Z){ return S.cfg.k_phase * Math.log(Math.max(Z,1e-12)); }
function rMinorOfTheta(theta){ return S.cfg.r0 * Math.exp(S.cfg.r_growth * theta); }
function torusXYZ(R,r,u,v){
  const cu=Math.cos(u), su=Math.sin(u);
  const cv=Math.cos(v), sv=Math.sin(v);
  return [(R+r*cv)*cu, (R+r*cv)*su, r*sv];
}
function mapZtoXYZ(Z,branch,t){
  const theta = thetaOfZ(Z);
  const u = theta;
  const r_minor = rMinorOfTheta(theta);
  const baseV = S.cfg.alpha * theta;
  const timeOff = S.cfg.omega * t;
  let v;
  if (S.cfg.branch_mode === "reverse_poloidal"){
    v = branch==="positive" ? (baseV - timeOff) % PI2 : (-baseV + Math.PI - timeOff) % PI2;
  }else{
    v = (baseV + (branch==="negative"?Math.PI:0) - timeOff) % PI2;
  }
  return torusXYZ(S.cfg.R, r_minor, u, v);
}

/* ===== SPECTRUM ===== */
function fOfZ(Z){ return S.cfg.f_ref * Math.pow(Math.max(Z,1e-12), S.cfg.kappa); }
function bandOfF(f){
  const bands = [
    ["Sub-ELF",0,3e1],["ELF/VLF",3e1,3e5],["Radio",3e5,3e8],["Microwave",3e8,3e11],
    ["Infrared",3e11,4.3e14],["Visible",4.3e14,7.9e14],["Ultraviolet",7.9e14,3e16],
    ["X-Ray",3e16,3e19],["Gamma",3e19,3e24],["Ultra-Gamma",3e24,3e30],["Hyper",3e30,Infinity]
  ];
  for(const [name,min,max] of bands) if(f>=min && f<max) return name;
  return "Unknown";
}
function shellIndex(Z){
  if(!S.cfg.shells_use_quantum_capacities) return 1;
  const pattern = [2,8,8,18,18,32,32];
  let s=0;
  for(let i=0;i<pattern.length;i++){
    const cap = pattern[i];
    const a = s+1, b = Math.min(s+cap, S.cfg.Zmax);
    if(Z>=a && Z<=b) return i+1;
    s+=cap;
  }
  return pattern.length;
}

/* ===== POINTS ===== */
const ELEMENTS = [
  [1,"H"],[2,"He"],[3,"Li"],[4,"Be"],[5,"B"],[6,"C"],[7,"N"],[8,"O"],[9,"F"],[10,"Ne"],
  [11,"Na"],[12,"Mg"],[13,"Al"],[14,"Si"],[15,"P"],[16,"S"],[17,"Cl"],[18,"Ar"],
  [19,"K"],[20,"Ca"],[21,"Sc"],[22,"Ti"],[23,"V"],[24,"Cr"],[25,"Mn"],[26,"Fe"],
  [27,"Co"],[28,"Ni"],[29,"Cu"],[30,"Zn"],[31,"Ga"],[32,"Ge"],[33,"As"],[34,"Se"],
  [35,"Br"],[36,"Kr"],[37,"Rb"],[38,"Sr"],[39,"Y"],[40,"Zr"],[41,"Nb"],[42,"Mo"],
  [43,"Tc"],[44,"Ru"],[45,"Rh"],[46,"Pd"],[47,"Ag"],[48,"Cd"],[49,"In"],[50,"Sn"],
  [51,"Sb"],[52,"Te"],[53,"I"],[54,"Xe"],[55,"Cs"],[56,"Ba"],[57,"La"],[58,"Ce"],
  [59,"Pr"],[60,"Nd"],[61,"Pm"],[62,"Sm"],[63,"Eu"],[64,"Gd"],[65,"Tb"],[66,"Dy"],
  [67,"Ho"],[68,"Er"],[69,"Tm"],[70,"Yb"],[71,"Lu"],[72,"Hf"],[73,"Ta"],[74,"W"],
  [75,"Re"],[76,"Os"],[77,"Ir"],[78,"Pt"],[79,"Au"],[80,"Hg"],[81,"Tl"],[82,"Pb"],
  [83,"Bi"],[84,"Po"],[85,"At"],[86,"Rn"],[87,"Fr"],[88,"Ra"],[89,"Ac"],[90,"Th"],
  [91,"Pa"],[92,"U"],[93,"Np"],[94,"Pu"],[95,"Am"],[96,"Cm"],[97,"Bk"],[98,"Cf"],
  [99,"Es"],[100,"Fm"],[101,"Md"],[102,"No"],[103,"Lr"],[104,"Rf"],[105,"Db"],
  [106,"Sg"],[107,"Bh"],[108,"Hs"],[109,"Mt"],[110,"Ds"],[111,"Rg"],[112,"Cn"],
  [113,"Nh"],[114,"Fl"],[115,"Mc"],[116,"Lv"],[117,"Ts"],[118,"Og"]
];
const NOBLE_Z = new Set([2,10,18,36,54,86,118]);

function generateAllPoints(){
  setStatus("Generating points…");
  const t = 0;
  S.elements = []; S.harmonics = [];
  for(const [Zint,sym] of ELEMENTS){
    const Z = Zint;
    for(const br of ["positive","negative"]){
      const [x,y,z] = mapZtoXYZ(Z,br,t);
      const f = fOfZ(Z);
      S.elements.push({ Z, label:sym, branch:br, x,y,z, f_hz:f, band:bandOfF(f), shell:shellIndex(Zint), noble:NOBLE_Z.has(Zint)?1:0 });
    }
  }
  for(let n=2;n<=S.cfg.harm_max;n++){
    const Z = 1.0/n;
    for(const br of ["positive","negative"]){
      const [x,y,z] = mapZtoXYZ(Z,br,t);
      const f = fOfZ(Z);
      S.harmonics.push({ Z, label:`H/${n}`, branch:br, x,y,z, f_hz:f, band:bandOfF(f), shell:0, noble:0 });
    }
  }
  setStatus(`Live: ${S.elements.length/2} elements × 2, ${S.harmonics.length/2} harmonics`);
}

/* ===== LOOP ===== */
let last = performance.now();
function loop(){
  const now = performance.now();
  const dt = (now-last)/1000; last = now;

  if (!S.time.manual) {
    if (S.time.playing) {
      const scale = Math.pow(2, S.time.scaleExp);
      S.time.t += dt * clamp(scale, -8, 8);
      S.time.t = (S.time.t % 600 + 600) % 600;
      S.ui.timeScrub.value = S.time.t.toFixed(3);
    }
  }

  if (S.ui.auto.checked) S.cam.ry += parseFloat(S.ui.speed.value)*dt*0.5;

  draw(S.time.manual ? parseFloat(S.ui.timeScrub.value) : S.time.t);
  requestAnimationFrame(loop);
}

/* ===== DRAW ===== */
function draw(t){
  const ctx = S.ctx;

  if (S.forceClear) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0,0,S.W,S.H);
    S.forceClear = false;
  } else {
    const tl = clamp(parseFloat(S.ui.trailLength.value)||0, 0, 0.99);
    const to = clamp(parseFloat(S.ui.trailOpacity.value)||0, 0, 1);
    const fade = (1 - tl) * to;
    if (fade > 0) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0,0,S.W,S.H);
      ctx.restore();
    }
  }

  drawBackgroundGrid();

  const size = parseInt(S.ui.size.value,10);
  const alpha = parseFloat(S.ui.opacity.value);
  const points = [];

  if (S.ui.showPos.checked || S.ui.showNeg.checked){
    for(const p of S.elements){
      if (p.branch==="positive" && !S.ui.showPos.checked) continue;
      if (p.branch==="negative" && !S.ui.showNeg.checked) continue;
      const [x,y,z] = mapZtoXYZ(p.Z, p.branch, t);
      const cam = applyCam([x,y,z]);
      const scr = proj(cam);
      points.push({ x:scr[0], y:scr[1], z:scr[2], f:scr[3], r:size, c:getColor(p,"elem"), meta:p });
    }
  }
  if (S.ui.showHar.checked){
    for(const h of S.harmonics){
      const [x,y,z] = mapZtoXYZ(h.Z, h.branch, t);
      const cam = applyCam([x,y,z]);
      const scr = proj(cam);
      points.push({ x:scr[0], y:scr[1], z:scr[2], f:scr[3], r:size+0.5, c:getColor(h,"harm"), meta:h });
    }
  }

  points.sort((a,b)=>b.z-a.z);

  ctx.globalAlpha = alpha;
  for(const pt of points){
    const r = Math.max(0.6, pt.r * pt.f * 0.02);
    ctx.fillStyle = pt.c;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,r,0,PI2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (S.mouse.hover) drawHoverMarker(S.mouse.hover);
  drawViewRose();
}

/* ===== COLOR ===== */
function getColor(entry, kind){
  const mode = S.ui.colorMode.value;
  if (mode==="branch") return kind==="harm"? S.colors.branch.harmonic : (entry.branch==="positive"?S.colors.branch.positive:S.colors.branch.negative);
  if (mode==="shell") return kind==="harm"? S.colors.branch.harmonic : S.colors.shell[Math.max(0,Math.min(S.colors.shell.length-1,(entry.shell||1)-1))];
  return S.colors.band[entry.band]||"#cccccc";
}

/* ===== GRID ===== */
function drawBackgroundGrid(){
  const ctx = S.ctx;
  const base = 48;
  const s = clamp(base/S.cam.zoom,24,96);
  ctx.save();
  ctx.globalAlpha = 0.12; ctx.strokeStyle = "#122030"; ctx.lineWidth = 1;
  const offX = (S.W*0.5)%s, offY = (S.H*0.5)%s;
  for(let x=offX;x<=S.W;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,S.H);ctx.stroke();}
  for(let y=offY;y<=S.H;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(S.W,y);ctx.stroke();}
  ctx.globalAlpha = 0.18; ctx.strokeStyle = "#1a2d42"; ctx.lineWidth = 1.5;
  ctx.beginPath();ctx.moveTo(S.W*0.5,0);ctx.lineTo(S.W*0.5,S.H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,S.H*0.5);ctx.lineTo(S.W,S.H*0.5);ctx.stroke();
  ctx.restore();
}

/* ===== VIEW ROSE ===== */
function drawViewRose(){
  const ctx = S.ctx;
  const r = 48, cx = S.W-r-16, cy = r+16;
  const ex = rotZ(rotY(rotX([1,0,0],S.cam.rx),S.cam.ry),S.cam.rz);
  const ey = rotZ(rotY(rotX([0,1,0],S.cam.rx),S.cam.ry),S.cam.rz);
  const ez = rotZ(rotY(rotX([0,0,1],S.cam.rx),S.cam.ry),S.cam.rz);
  const to2D = v=>[cx+r*v[0],cy-r*v[1]];
  ctx.save();
  ctx.globalAlpha = 0.9; ctx.fillStyle = "#0e1520"; ctx.strokeStyle = "#223044"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx,cy,r+8,0,PI2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineCap = "round"; ctx.lineWidth = 3.5;
  lineAxis(ex,"#ff6161"); lineAxis(ey,"#76e27e"); lineAxis(ez,"#6aa8ff");
  ctx.fillStyle = "#ffffff";
  labelAxis(ex,"X"); labelAxis(ey,"Y"); labelAxis(ez,"Z");
  ctx.restore();
  function lineAxis(v,c){const [x,y]=to2D(v);ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();}
  function labelAxis(v,t){const [x,y]=to2D(v);const lx=cx+(x-cx)*1.08,ly=cy+(y-cy)*1.08;
    ctx.font="11px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(t,lx,ly);}
}

/* ===== HOVER ===== */
function drawHoverMarker(hit){
  const ctx = S.ctx;
  const r1 = Math.max(6, hit.r*hit.f*0.03);
  const r2 = r1*1.8;
  ctx.save();
  ctx.globalAlpha = 0.95; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(hit.x,hit.y,r1,0,PI2); ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(hit.x,hit.y,r2,0,PI2); ctx.stroke();
  ctx.restore();
}

/* ===== INTERACTION ===== */
function onDown(e){S.mouse.down=true;S.mouse.btn=e.button;S.mouse.px=e.clientX;S.mouse.py=e.clientY;S.mouse.pan=e.shiftKey;}
function onUp(){S.mouse.down=false;S.mouse.pan=false;}
function onMove(e){
  const dx=e.clientX-S.mouse.px, dy=e.clientY-S.mouse.py;
  if (S.mouse.down){
    if (S.mouse.pan){
      const s=1/(220*S.cam.zoom);
      S.cam.tx-=dx*s; S.cam.ty+=dy*s;
    }else{
      S.cam.ry+=dx/S.W*2*Math.PI;
      S.cam.rx+=dy/S.H*2*Math.PI;
      syncCamUI();
    }
    S.mouse.px=e.clientX; S.mouse.py=e.clientY;
  }
  S.mouse.x=e.clientX; S.mouse.y=e.clientY;
  hitTest(e.clientX,e.clientY);
}
function onWheel(e){
  e.preventDefault();
  const s=Math.exp(-e.deltaY*0.001);
  S.cam.zoom = clamp(S.cam.zoom*s,0.25,6.0);
  syncCamUI();
  S.forceClear = true;
}
function onKey(e){
  const k = e.key.toLowerCase();
  const stepR = deg2rad(2);
  const stepP = 18/(220*S.cam.zoom);
  if (k==='arrowleft'){ S.cam.ry-=stepR; syncCamUI(); }
  else if (k==='arrowright'){ S.cam.ry+=stepR; syncCamUI(); }
  else if (k==='arrowup'){ S.cam.rx-=stepR; syncCamUI(); }
  else if (k==='arrowdown'){ S.cam.rx+=stepR; syncCamUI(); }
  else if (k==='a'){ S.cam.tx+=stepP; }
  else if (k==='d'){ S.cam.tx-=stepP; }
  else if (k==='w'){ S.cam.ty+=stepP; }
  else if (k==='s'){ S.cam.ty-=stepP; }
  else if (k==='q'){ S.cam.rz-=stepR; syncCamUI(); }
  else if (k==='e'){ S.cam.rz+=stepR; syncCamUI(); }
  else if (k==='+' || k==='='){ S.cam.zoom = clamp(S.cam.zoom*1.05,0.25,6); syncCamUI(); S.forceClear=true; }
  else if (k==='-' || k==='_'){ S.cam.zoom = clamp(S.cam.zoom/1.05,0.25,6); syncCamUI(); S.forceClear=true; }
}

/* ===== HIT TEST ===== */
function hitTest(mx,my){
  const t = S.time.manual ? parseFloat(S.ui.timeScrub.value) : S.time.t;
  const size = parseInt(S.ui.size.value,10);
  const candidates = [];
  const gather = [];
  if (S.ui.showPos.checked) gather.push(...S.elements.filter(p=>p.branch==="positive"));
  if (S.ui.showNeg.checked) gather.push(...S.elements.filter(p=>p.branch==="negative"));
  if (S.ui.showHar.checked) gather.push(...S.harmonics);
  for(const p of gather){
    const [x,y,z] = mapZtoXYZ(p.Z, p.branch, t);
    const cam = applyCam([x,y,z]);
    const scr = proj(cam);
    const r = Math.max(0.6, (p.branch?size:size+0.5)*scr[3]*0.02);
    const dx=scr[0]-mx, dy=scr[1]-my;
    if (dx*dx+dy*dy<=(r+12)*(r+12)){
      candidates.push({d2:dx*dx+dy*dy, x:scr[0], y:scr[1], f:scr[3], r:size, meta:p});
    }
  }
  candidates.sort((a,b)=>a.d2-b.d2);
  const hit = candidates[0];
  if (hit){ S.mouse.hover=hit; showTooltip(hit,mx,my); }
  else { S.mouse.hover=null; hideTooltip(); }
}

/* ===== TOOLTIP ===== */
function showTooltip(hit,mx,my){
  const p = hit.meta;
  S.ui.tt.sym.textContent = p.label || "H/n";
  S.ui.tt.Z.textContent = p.Z>=1 ? `Z=${p.Z|0}` : `Z=${p.Z.toFixed(4)}`;
  S.ui.tt.shell.textContent = p.shell>0 ? ["K","L","M","N","O","P","Q"][p.shell-1] : "—";
  S.ui.tt.band.textContent = p.band||"—";
  S.ui.tt.branch.textContent = p.branch ? (p.branch==="positive"?"+":"−") : "—";
  S.ui.tt.f.textContent = p.f_hz ? fmtHz(p.f_hz) : "—";
  const box = S.ui.tt.box;
  box.style.display = "block";
  const rect = box.getBoundingClientRect();
  let bx = mx+14, by = my+14;
  if (bx+rect.width>S.W-8) bx = mx-rect.width-14;
  if (by+rect.height>S.H-8) by = my-rect.height-14;
  box.style.left = `${bx}px`;
  box.style.top = `${by}px`;
}
function hideTooltip(){ S.ui.tt.box.style.display="none"; }
function fmtHz(f){
  const units = [["Hz",1],["kHz",1e3],["MHz",1e6],["GHz",1e9],["THz",1e12],["PHz",1e15],["EHz",1e18]];
  let u="Hz", v=f;
  for (let i=units.length-1;i>=0;i--) if (f>=units[i][1]){u=units[i][0];v=f/units[i][1];break;}
  return v<10 ? `${v.toFixed(3)} ${u}` : `${v.toFixed(1)} ${u}`;
}

/* ===== PARAMS ===== */
function renderParams(){
  const c = S.cfg;
  const k = (2*Math.PI/Math.log(c.Zmax)).toFixed(6);
  const rg = (c.b * c.k_phase).toFixed(6);
  qs("#params").innerHTML = `
    Φ∞=<span class="value">${c.r0.toFixed(3)}</span>,
    b=<span class="value">${c.b.toFixed(3)}</span>,
    Z<sub>max</sub>=<span class="value">${c.Zmax}</span><br>
    k=2π/ln(Z<sub>max</sub>)=<span class="value">${k}</span>,
    r_growth=<span class="value">${rg}</span><br>
    R=<span class="value">${c.R.toFixed(2)}</span>,
    ω=<span class="value">${c.omega.toFixed(3)}</span>
  `;
}

/* ===== UTILS ===== */
function qs(s,r=document){return r.querySelector(s);}
function setStatus(t){S.ui.status.textContent=t;}
function setDual(rng,num,val){rng.value=String(val); num.value=String(val);}
function linkDual(rng,num,apply,isFloat=false){
  const parse = v=>isFloat?parseFloat(v):parseFloat(v);
  const sync = v=>{ setDual(rng,num,v); apply(v); };
  rng.addEventListener("input", ()=>sync(parse(rng.value)));
  num.addEventListener("input", ()=>sync(parse(num.value)));
}
function syncUIFromState(){
  syncCamUI();
  S.ui.play.checked = S.time.playing;
  S.ui.timeScale.value = String(S.time.scaleExp);
  S.ui.manualTime.checked = S.time.manual;
  S.ui.timeScrub.value = String(S.time.t.toFixed(3));
  const w = S.cfg.omega;
  setDual(S.ui.omega, S.ui.omegaN, +w.toFixed(3));
}
