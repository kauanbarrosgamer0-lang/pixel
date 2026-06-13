import * as THREE from 'three';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOADER_TIMEOUT_MS = 7000;

/* ===== LOADER ===== */
const pixelGrid = document.getElementById('pixelGrid');
const totalPixels = 100;
for(let i=0;i<totalPixels;i++){const p=document.createElement('div');p.className='pixel';pixelGrid.appendChild(p);}
const pixels = document.querySelectorAll('.pixel');
let activeCount = 0;
function animatePixels(){
  if(activeCount<totalPixels){
    const rand=Math.floor(Math.random()*totalPixels);
    if(!pixels[rand].classList.contains('active')){pixels[rand].classList.add('active');activeCount++;}
    setTimeout(animatePixels,8+Math.random()*25);
  } else { hideLoader(); }
}
function hideLoader(){
  if(window.__loaderHidden)return;
  window.__loaderHidden=true;
  const loader=document.getElementById('loader');
  if(!loader)return;
  if(window.gsap){
    window.gsap.to(loader,{opacity:0,duration:1.2,ease:'power2.inOut',onComplete:()=>{
      loader.style.display='none';
      if(typeof window.startParticleIntro==='function') window.startParticleIntro();
      initHeroAnimations();
    }});
  } else {
    loader.style.transition='opacity 1.2s';loader.style.opacity='0';
    setTimeout(()=>{
      loader.style.display='none';
      if(typeof window.startParticleIntro==='function') window.startParticleIntro();
      initHeroAnimations();
    },1200);
  }
}
animatePixels();
setTimeout(hideLoader,LOADER_TIMEOUT_MS);

/* ===== THREE.JS PARTICLE SYSTEM ===== */
const canvasHolder = document.getElementById('canvas-holder');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
canvasHolder.appendChild(renderer.domElement);

/* ----- PARTICLE CONFIG ----- */
const PARTICLE_COUNT = prefersReducedMotion ? 800 : 3000;
const SPREAD = 60;
const LOGO_SCALE = 8;

/* Build "PIXEL" text as target positions using a dot-matrix approach */
function getLogoPositions(count) {
  // Simplified dot-matrix for "P I X E L" — just a grid cluster
  const targets = [];
  const letters = [
    // P
    [[0,4],[0,3],[0,2],[0,1],[0,0],[1,4],[2,4],[1,2],[2,2],[1,0]],
    // I (gap)
    [[4,4],[4,3],[4,2],[4,1],[4,0]],
    // X
    [[6,4],[10,4],[7,3],[9,3],[8,2],[7,1],[9,1],[6,0],[10,0]],
    // E
    [[12,4],[13,4],[14,4],[12,3],[12,2],[13,2],[12,1],[12,0],[13,0],[14,0]],
    // L
    [[16,4],[16,3],[16,2],[16,1],[16,0],[17,0],[18,0]],
  ];
  const allDots = [];
  letters.forEach(letter => letter.forEach(([x,y]) => allDots.push([x - 9, y - 2])));
  for(let i=0;i<count;i++){
    const dot = allDots[i % allDots.length];
    const jx = (Math.random()-.5)*.3;
    const jy = (Math.random()-.5)*.3;
    targets.push([(dot[0]+jx)*LOGO_SCALE*.55, (dot[1]+jy)*LOGO_SCALE*.9, (Math.random()-.5)*.5]);
  }
  return targets;
}

/* Positions: random scattered → logo → drift */
const positions    = new Float32Array(PARTICLE_COUNT * 3);
const targetPos    = new Float32Array(PARTICLE_COUNT * 3);
const scatterPos   = new Float32Array(PARTICLE_COUNT * 3);
const velocities   = new Float32Array(PARTICLE_COUNT * 3);
const colors       = new Float32Array(PARTICLE_COUNT * 3);
const sizes        = new Float32Array(PARTICLE_COUNT);

const logoTargets = getLogoPositions(PARTICLE_COUNT);

/* Palette: deep blue → cyan → violet */
const colA = new THREE.Color(0x00d4ff);
const colB = new THREE.Color(0x7c3aed);
const colC = new THREE.Color(0x06b6d4);
const tmpCol = new THREE.Color();

for(let i=0;i<PARTICLE_COUNT;i++){
  const t = i/PARTICLE_COUNT;
  // scatter: random sphere
  const theta = Math.random()*Math.PI*2;
  const phi   = Math.acos(2*Math.random()-1);
  const r     = SPREAD * (0.3 + Math.random() * 0.7);
  scatterPos[i*3]   = r*Math.sin(phi)*Math.cos(theta);
  scatterPos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
  scatterPos[i*3+2] = r*Math.cos(phi) - 20;

  // target: logo
  targetPos[i*3]   = logoTargets[i][0];
  targetPos[i*3+1] = logoTargets[i][1];
  targetPos[i*3+2] = logoTargets[i][2];

  // start at scatter
  positions[i*3]   = scatterPos[i*3];
  positions[i*3+1] = scatterPos[i*3+1];
  positions[i*3+2] = scatterPos[i*3+2];

  // color gradient
  if(t < 0.5) tmpCol.copy(colA).lerp(colC, t*2);
  else tmpCol.copy(colC).lerp(colB, (t-.5)*2);
  colors[i*3]   = tmpCol.r;
  colors[i*3+1] = tmpCol.g;
  colors[i*3+2] = tmpCol.b;

  sizes[i] = 0.8 + Math.random() * 1.2;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

const material = new THREE.ShaderMaterial({
  uniforms: { uTime: {value:0}, uPixelRatio: {value: Math.min(window.devicePixelRatio,2)} },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    uniform float uPixelRatio;
    void main(){
      vColor = color;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      float dist = length(mvPos.xyz);
      vAlpha = smoothstep(60.0, 5.0, dist);
      gl_PointSize = size * uPixelRatio * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if(d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
      // soft glow core
      float glow = exp(-d * 6.0) * 0.6;
      vec3 col = vColor + glow * vec3(0.4, 0.8, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

/* ----- AMBIENT BACKGROUND PARTICLES (tiny, always drifting) ----- */
const BG_COUNT = prefersReducedMotion ? 0 : 1000;
const bgPos    = new Float32Array(BG_COUNT * 3);
const bgCol    = new Float32Array(BG_COUNT * 3);
const bgSizes  = new Float32Array(BG_COUNT);
for(let i=0;i<BG_COUNT;i++){
  bgPos[i*3]   = (Math.random()-.5)*80;
  bgPos[i*3+1] = (Math.random()-.5)*80;
  bgPos[i*3+2] = (Math.random()-.5)*40 - 15;
  const br = 0.05 + Math.random()*.15;
  bgCol[i*3]=br*0.3; bgCol[i*3+1]=br*0.8; bgCol[i*3+2]=br;
  bgSizes[i] = 0.3 + Math.random()*.5;
}
const bgGeo = new THREE.BufferGeometry();
bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos,3));
bgGeo.setAttribute('color',    new THREE.BufferAttribute(bgCol,3));
bgGeo.setAttribute('size',     new THREE.BufferAttribute(bgSizes,1));
const bgMat = new THREE.ShaderMaterial({
  uniforms:{ uTime:{value:0} },
  vertexShader:`
    attribute float size; attribute vec3 color; varying vec3 vColor;
    uniform float uTime;
    void main(){
      vColor=color;
      vec3 p=position;
      p.y+=mod(uTime*0.4+position.x*0.1,80.0)-40.0;
      p.x+=sin(uTime*0.3+position.z*0.05)*0.5;
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=size*(150.0/-mv.z);
      gl_Position=projectionMatrix*mv;
    }
  `,
  fragmentShader:`
    varying vec3 vColor;
    void main(){
      vec2 uv=gl_PointCoord-.5; float d=length(uv);
      if(d>.5)discard;
      float a=smoothstep(.5,.0,d)*.6;
      gl_FragColor=vec4(vColor,a);
    }
  `,
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true,
});
const bgParticles = new THREE.Points(bgGeo, bgMat);
scene.add(bgParticles);

/* ----- ANIMATION STATE ----- */
// Phase 0: waiting for intro start
// Phase 1: particles converge to logo (2.5s)
// Phase 2: logo hold (1.0s)
// Phase 3: particles explode outward and drift
let phase = 0;
let phaseStart = 0;
const PHASE1_DUR = 2.5;
const PHASE2_DUR = 1.0;

window.startParticleIntro = function(){
  if(prefersReducedMotion){ phase=3; return; }
  phase = 1;
  phaseStart = performance.now();
};

/* drift velocities for phase 3 */
const driftV = new Float32Array(PARTICLE_COUNT * 3);
for(let i=0;i<PARTICLE_COUNT;i++){
  driftV[i*3]   = (Math.random()-.5)*.012;
  driftV[i*3+1] = (Math.random()-.5)*.012;
  driftV[i*3+2] = (Math.random()-.5)*.006;
}

/* mouse interaction */
const mouse = {tx:0, ty:0, x:0, y:0};
let lastMouse = 0;
window.addEventListener('mousemove', e=>{
  const now = performance.now();
  if(now-lastMouse<50)return;
  lastMouse=now;
  mouse.tx=(e.clientX/window.innerWidth-.5)*8;
  mouse.ty=-(e.clientY/window.innerHeight-.5)*6;
});

let resizeT;
window.addEventListener('resize',()=>{
  clearTimeout(resizeT);
  resizeT=setTimeout(()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
    material.uniforms.uPixelRatio.value=Math.min(window.devicePixelRatio,2);
  },100);
});

function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
function easeInOutQuart(t){ return t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2; }

const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  material.uniforms.uTime.value = t;
  bgMat.uniforms.uTime.value = t;

  /* smooth camera mouse follow */
  mouse.x += (mouse.tx - mouse.x) * 0.04;
  mouse.y += (mouse.ty - mouse.y) * 0.04;
  camera.position.x += (mouse.x - camera.position.x) * 0.05;
  camera.position.y += (mouse.y - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  const pos = geometry.attributes.position.array;
  const elapsed = (performance.now() - phaseStart) / 1000;

  if(phase === 1){
    // converge to logo
    const progress = Math.min(elapsed / PHASE1_DUR, 1);
    const ep = easeOutCubic(progress);
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3]   = scatterPos[i*3]   + (targetPos[i*3]   - scatterPos[i*3])   * ep;
      pos[i*3+1] = scatterPos[i*3+1] + (targetPos[i*3+1] - scatterPos[i*3+1]) * ep;
      pos[i*3+2] = scatterPos[i*3+2] + (targetPos[i*3+2] - scatterPos[i*3+2]) * ep;
    }
    if(progress >= 1){ phase = 2; phaseStart = performance.now(); }

  } else if(phase === 2){
    // hold logo — gentle pulse
    const wave = Math.sin(elapsed * 3) * 0.04;
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3]   = targetPos[i*3]   + Math.sin(i*.7+t)*wave*.5;
      pos[i*3+1] = targetPos[i*3+1] + Math.cos(i*.5+t)*wave*.5;
      pos[i*3+2] = targetPos[i*3+2];
    }
    if(elapsed >= PHASE2_DUR){ phase = 3; phaseStart = performance.now();
      // init drift from logo
      for(let i=0;i<PARTICLE_COUNT;i++){
        pos[i*3]   = targetPos[i*3];
        pos[i*3+1] = targetPos[i*3+1];
        pos[i*3+2] = targetPos[i*3+2];
      }
    }

  } else if(phase === 3){
    // drift + wave
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3]   += driftV[i*3];
      pos[i*3+1] += driftV[i*3+1];
      pos[i*3+2] += driftV[i*3+2];
      // wrap bounds
      if(Math.abs(pos[i*3])   > 35){ pos[i*3]   = targetPos[i*3];   driftV[i*3]   *= -1; }
      if(Math.abs(pos[i*3+1]) > 25){ pos[i*3+1] = targetPos[i*3+1]; driftV[i*3+1] *= -1; }
      // add subtle wave
      pos[i*3]   += Math.sin(t*.4 + i*.01) * .002;
      pos[i*3+1] += Math.cos(t*.3 + i*.01) * .002;
    }
  } else {
    // phase 0: idle scatter drift while loading
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3]   += Math.sin(t*.2+i*.05)*.005;
      pos[i*3+1] += Math.cos(t*.15+i*.04)*.005;
    }
  }

  geometry.attributes.position.needsUpdate = true;
  particles.rotation.y = mouse.x * 0.015;

  renderer.render(scene, camera);
}
animate();

/* ===== GSAP SCROLL ANIMATIONS ===== */
function initHeroAnimations(){
  if(!window.gsap) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  if(prefersReducedMotion) return;

  // hero stagger
  window.gsap.from('.hero-eyebrow', {opacity:0, y:30, duration:.8, delay:.1, ease:'power3.out'});
  window.gsap.from('.hero-h1', {opacity:0, y:40, duration:1, delay:.3, ease:'power3.out'});
  window.gsap.from('.hero-desc', {opacity:0, y:30, duration:.8, delay:.5, ease:'power3.out'});
  window.gsap.from('.hero-actions', {opacity:0, y:20, duration:.7, delay:.7, ease:'power3.out'});

  // scroll triggered
  document.querySelectorAll('.why-card, .feature-card').forEach((el, i) => {
    window.gsap.from(el, {
      scrollTrigger:{ trigger:el, start:'top 88%', toggleActions:'play none none none' },
      opacity:0, y:50, duration:.7, delay:i*.1, ease:'power3.out'
    });
  });

  document.querySelectorAll('.metric-item').forEach((el, i) => {
    window.gsap.from(el, {
      scrollTrigger:{ trigger:el, start:'top 90%' },
      opacity:0, scale:.9, duration:.6, delay:i*.08, ease:'back.out(1.5)'
    });
  });
}
