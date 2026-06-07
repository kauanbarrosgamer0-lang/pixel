import * as THREE from 'three';

const PHONE = '5565999134921';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOADER_TIMEOUT_MS = 6000;

/* ===== LOADER pixel grid ===== */
const pixelGrid = document.getElementById('pixelGrid');
const totalPixels = 100;
for(let i=0;i<totalPixels;i++){const p=document.createElement('div');p.className='pixel';pixelGrid.appendChild(p);}
const pixels = document.querySelectorAll('.pixel');
let activeCount = 0;

function animatePixels(){
  if(activeCount<totalPixels){
    const rand=Math.floor(Math.random()*totalPixels);
    if(!pixels[rand].classList.contains('active')){pixels[rand].classList.add('active');activeCount++;}
    setTimeout(animatePixels,10+Math.random()*30);
  } else { hideLoader(); }
}
function hideLoader(){
  if(window.__loaderHidden)return;
  window.__loaderHidden=true;
  const loader=document.getElementById('loader');
  if(!loader)return;
  if(window.gsap){
    window.gsap.to(loader,{opacity:0,duration:1,onComplete:()=>{
      loader.style.display='none';
      if(typeof startPanelIntro==='function')startPanelIntro();
      if(typeof initHeroAnimations==='function')initHeroAnimations();
    }});
  } else {
    loader.style.transition='opacity 1s';loader.style.opacity='0';
    setTimeout(()=>{
      loader.style.display='none';
      if(typeof startPanelIntro==='function')startPanelIntro();
      if(typeof initHeroAnimations==='function')initHeroAnimations();
    },1000);
  }
}
animatePixels();
setTimeout(hideLoader,LOADER_TIMEOUT_MS);

/* ===== THREE.JS PANEL ===== */
const canvasHolder = document.getElementById('canvas-holder');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setClearColor(0x000000,0);
canvasHolder.appendChild(renderer.domElement);

const GRID_W=50, GRID_H=30, TOTAL=GRID_W*GRID_H;
const PIXEL_SIZE=0.18, PIXEL_GAP=0.02, STEP=PIXEL_SIZE+PIXEL_GAP;

const geometry = new THREE.BoxGeometry(PIXEL_SIZE,PIXEL_SIZE,PIXEL_SIZE*0.4);
const material = new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,toneMapped:false,transparent:true,opacity:1});
const panel = new THREE.InstancedMesh(geometry,material,TOTAL);
panel.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

const NEON_BOOST=1.8;
const instanceColors=new Float32Array(TOTAL*3);
panel.instanceColor=new THREE.InstancedBufferAttribute(instanceColors,3);

const dummy=new THREE.Object3D();
const colorA=new THREE.Color(0x00f2ff);
const colorB=new THREE.Color(0x7000ff);
const tmpColor=new THREE.Color();
const pixelData=new Float32Array(TOTAL*2);
const positions=new Float32Array(TOTAL*3);
const basePositions=new Float32Array(TOTAL*3);

const cx=(GRID_W-1)/2, cy=(GRID_H-1)/2;
const maxDist=Math.sqrt(cx*cx+cy*cy);

for(let j=0;j<GRID_H;j++){
  for(let i=0;i<GRID_W;i++){
    const idx=j*GRID_W+i;
    const x=(i-cx)*STEP, y=(j-cy)*STEP;
    const initialZ=prefersReducedMotion?0:(Math.random()-.5)*8;
    positions[idx*3]=x; positions[idx*3+1]=y; positions[idx*3+2]=initialZ;
    basePositions[idx*3]=x; basePositions[idx*3+1]=y;
    const dist=Math.sqrt((i-cx)**2+(j-cy)**2)/maxDist;
    tmpColor.copy(colorA).lerp(colorB,dist).multiplyScalar(NEON_BOOST);
    instanceColors[idx*3]=tmpColor.r; instanceColors[idx*3+1]=tmpColor.g; instanceColors[idx*3+2]=tmpColor.b;
    pixelData[idx*2]=0; pixelData[idx*2+1]=dist*1.5;
  }
}
panel.instanceColor.needsUpdate=true;
for(let i=0;i<TOTAL;i++){
  dummy.position.set(positions[i*3],positions[i*3+1],positions[i*3+2]);
  dummy.scale.set(0,0,0); dummy.updateMatrix(); panel.setMatrixAt(i,dummy.matrix);
}
panel.instanceMatrix.needsUpdate=true;

const panelGroup=new THREE.Group();
panelGroup.add(panel);
scene.add(panelGroup);
camera.position.set(0,0,12);

let introStart=null;
const INTRO_DURATION=prefersReducedMotion?0:2.0;
let panelIntroDone=!prefersReducedMotion;

window.startPanelIntro=function(){
  if(prefersReducedMotion){for(let i=0;i<TOTAL;i++)pixelData[i*2]=1;panelIntroDone=true;return;}
  introStart=performance.now();panelIntroDone=false;
};

const mouse={x:0,y:0,targetX:0,targetY:0};
let lastMouseUpdate=0;
window.addEventListener('mousemove',e=>{
  const now=performance.now();
  if(now-lastMouseUpdate<60)return;
  lastMouseUpdate=now;
  mouse.targetX=(e.clientX/window.innerWidth-.5)*.6;
  mouse.targetY=(e.clientY/window.innerHeight-.5)*.6;
});

let resizeTimeout;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimeout);
  resizeTimeout=setTimeout(()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  },100);
});

const clock=new THREE.Clock();
const targetRot={x:0,y:0};
let currentRot={x:0,y:0};

function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  targetRot.x=mouse.targetY*.3; targetRot.y=mouse.targetX*.3;
  currentRot.x+=(targetRot.x-currentRot.x)*.05;
  currentRot.y+=(targetRot.y-currentRot.y)*.05;
  panelGroup.rotation.x=currentRot.x; panelGroup.rotation.y=currentRot.y;

  if(!panelIntroDone){
    const elapsed=(performance.now()-introStart)/1000;
    let allDone=true;
    for(let i=0;i<TOTAL;i++){
      const activated=pixelData[i*2+1];
      if(elapsed>=activated){const prog=Math.min(1,(elapsed-activated)/.4);pixelData[i*2]=prog;if(prog<1)allDone=false;}
      else allDone=false;
    }
    if(elapsed>INTRO_DURATION+2)panelIntroDone=true;
  }

  for(let i=0;i<TOTAL;i++){
    const idx=i*3;
    const baseX=basePositions[idx],baseY=basePositions[idx+1];
    const initialX=positions[idx],initialY=positions[idx+1],initialZ=positions[idx+2];
    const progress=pixelData[i*2];
    const x=initialX+(baseX-initialX)*progress;
    const y=initialY+(baseY-initialY)*progress;
    const wave=panelIntroDone&&!prefersReducedMotion
      ?Math.sin(baseX*.5+t*1.5)*.05+Math.cos(baseY*.5+t*1.2)*.05:0;
    const z=panelIntroDone?wave:initialZ*(1-progress)+wave;
    const scale=panelIntroDone?1:progress;
    dummy.position.set(x,y,z); dummy.scale.set(scale,scale,scale);
    dummy.updateMatrix(); panel.setMatrixAt(i,dummy.matrix);
  }
  panel.instanceMatrix.needsUpdate=true;
  renderer.render(scene,camera);
}
animate();

/* ===== GSAP hero ===== */
window.initHeroAnimations=function(){
  if(!window.gsap)return;
  // Hero elements já animam via CSS keyframes; GSAP anima feature cards no scroll
};

window.addEventListener('load',()=>{
  if(!window.gsap)return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  if(!prefersReducedMotion){
    document.querySelectorAll('.feature-card').forEach((card,index)=>{
      window.gsap.from(card,{
        scrollTrigger:{trigger:card,start:'top 85%',toggleActions:'play none none none'},
        opacity:0,y:50,duration:.8,delay:Math.min(index*.15,.3),ease:'power3.out'
      });
    });
  }
});