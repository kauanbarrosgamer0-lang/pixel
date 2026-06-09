/* ===== SUPABASE (sem SDK) ===== */
const SUPA_URL = 'https://zrooqnnfbwyjojwngfoa.supabase.co';
const SUPA_KEY = 'sb_publishable_iy690zxIXqZ0r81_mjsVJw_k8CBswnN';
let _accessToken = null;
let currentUser  = null;
let afterLoginView = 'home';

async function supaFetch(path, opts={}) {
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + (_accessToken || SUPA_KEY),
    'Content-Type': 'application/json',
    ...(opts.headers||{})
  };
  const res = await fetch(SUPA_URL + path, {...opts, headers});
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  return { ok:res.ok, status:res.status, data:json };
}
async function authPost(ep, body) { return supaFetch('/auth/v1/'+ep, {method:'POST',body:JSON.stringify(body)}); }
async function authGet(ep) { return supaFetch('/auth/v1/'+ep); }
async function dbGet(table, filter) { return supaFetch('/rest/v1/'+table+'?'+new URLSearchParams(filter)+'&limit=1'); }
async function dbInsert(table, body) { return supaFetch('/rest/v1/'+table, {method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(body)}); }
async function dbRpc(fn, body) { return supaFetch('/rest/v1/rpc/'+fn, {method:'POST',body:JSON.stringify(body)}); }
function logAuthError(action, res) {
  console.warn('[auth]', action, {
    status: res.status,
    message: getAuthError(res.data)
  });
}

function saveSession(d)  { try{localStorage.setItem('lv_session',JSON.stringify(d));}catch(e){} }
function loadSession()   { try{return JSON.parse(localStorage.getItem('lv_session')||'null');}catch(e){return null;} }
function clearSession()  { try{localStorage.removeItem('lv_session');}catch(e){} }
function isSessionExpired(session) {
  if(!session?.expires_at)return false;
  return Date.now() >= session.expires_at * 1000;
}
function setSession(data) {
  _accessToken = data.access_token;
  currentUser = data.user;
  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user
  });
}
async function emailJaCadastrado(email) {
  const res = await dbRpc('email_exists', {check_email:email});

  if(res.ok)return res.data===true;

  console.warn('[auth] checagem de email falhou', {
    status: res.status,
    message: getAuthError(res.data)
  });

  return false;
}

/* ===== VIEWS ===== */
function showView(id) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  window.scrollTo(0,0);
}
function showHome()    { showView('home'); updateNavAuth(); }
function showAuth(tab='login') { switchTab(tab); showView('auth'); }
function showCatalog() { showView('catalogo'); updateNavAuth(); renderGrid(); }
function requireLogin() {
  if(currentUser) showCatalog();
  else { afterLoginView = 'catalogo'; showAuth('login'); }
  return false;
}

/* ===== AUTH TABS ===== */
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
  document.getElementById('form-login').classList.toggle('hidden',tab!=='login');
  document.getElementById('form-register').classList.toggle('hidden',tab!=='register');
  clearMsgs();
}
function clearMsgs() {
  ['login-msg','reg-msg'].forEach(id=>{const el=document.getElementById(id);el.className='auth-msg';el.textContent='';});
}
function showMsg(id,text,type='error') {
  const el=document.getElementById(id);el.className='auth-msg '+type+' show';el.textContent=text;
}

/* ===== LOGIN ===== */
async function doLogin() {
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pass=document.getElementById('login-password').value;
  if(!email||!pass){showMsg('login-msg','Preencha e-mail e senha.');return;}
  const btn=document.getElementById('btn-login');
  btn.disabled=true;btn.textContent='Entrando...';clearMsgs();
  try {
    const res=await authPost('token?grant_type=password',{email,password:pass});
    if(!res.ok){logAuthError('login',res);showMsg('login-msg',traduzErro(getAuthError(res.data)));return;}
    setSession(res.data);
    document.getElementById('login-password').value='';
    if(afterLoginView==='catalogo') showCatalog();
    else showHome();
    afterLoginView='home';
  } catch(e){showMsg('login-msg','Erro de conexão. Verifique sua internet.');console.error(e);}
  finally { btn.disabled=false;btn.textContent='Entrar'; }
}

/* ===== CADASTRO ===== */
async function doRegister() {
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim().toLowerCase();
  const pass=document.getElementById('reg-password').value;
  const conf=document.getElementById('reg-confirm').value;
  if(!name||!email||!pass){showMsg('reg-msg','Preencha todos os campos.');return;}
  if(pass.length<6){showMsg('reg-msg','Senha deve ter pelo menos 6 caracteres.');return;}
  if(pass!==conf){showMsg('reg-msg','As senhas não coincidem.');return;}
  const btn=document.getElementById('btn-register');
  btn.disabled=true;btn.textContent='Verificando...';clearMsgs();
  try {
    const exists=await emailJaCadastrado(email);
    if(exists){showMsg('reg-msg','Já existe uma conta cadastrada com este e-mail. Faça login.');return;}

    btn.textContent='Criando conta...';
    const res=await authPost('signup',{email,password:pass,data:{full_name:name}});
    if(!res.ok){logAuthError('signup',res);showMsg('reg-msg',traduzErro(getAuthError(res.data)));return;}

    if(res.data?.user?.identities&&res.data.user.identities.length===0){
      showMsg('reg-msg','Já existe uma conta cadastrada com este e-mail. Faça login.');
      return;
    }

    showMsg('reg-msg','✅ Conta criada! Verifique seu e-mail para confirmar e depois faça login.','success');
  } catch(e){showMsg('reg-msg','Erro de conexão.');console.error(e);}
  finally { btn.disabled=false;btn.textContent='Criar conta'; }
}

async function doGoogle() { showMsg('login-msg','Login com Google não disponível no momento.','info'); }

function logout() { _accessToken=null;currentUser=null;afterLoginView='home';clearSession();updateNavAuth();showHome(); }

function getAuthError(data) {
  if(!data)return '';
  return data.error_description||data.message||data.msg||data.error||String(data);
}

function traduzErro(msg) {
  if(!msg)return'Erro desconhecido.';
  if(msg.includes('No API key')||msg.includes('API key'))return'Erro na chave publica do Supabase. Verifique SUPA_KEY.';
  if(msg.includes('Invalid API key'))return'Chave publica do Supabase invalida ou revogada.';
  if(msg.includes('Invalid login')||msg.includes('invalid_grant')||msg.includes('Invalid email or password'))return'E-mail ou senha incorretos.';
  if(msg.includes('Email logins are disabled'))return'Login por e-mail e senha esta desativado no Supabase.';
  if(msg.includes('Email not confirmed'))return'Confirme seu e-mail antes de entrar.';
  if(msg.includes('email_already_registered'))return'Já existe uma conta cadastrada com este e-mail. Faça login.';
  if(msg.includes('already registered')||msg.includes('already been registered'))return'Este e-mail já está cadastrado.';
  if(msg.includes('User already registered'))return'Este e-mail já está cadastrado.';
  if(msg.includes('Password')||msg.includes('password'))return'Senha fraca. Use pelo menos 6 caracteres.';
  if(msg.includes('rate limit'))return'Muitas tentativas. Aguarde alguns minutos.';
  if(msg.includes('JWT')||msg.includes('expired'))return'Sua sessão expirou. Faça login novamente.';
  return msg;
}

/* ===== NAV AUTH ===== */
function updateNavAuth() {
  const area=document.getElementById('nav-auth-area');
  const mobBtn=document.getElementById('mob-auth-btn');
  area.textContent='';
  if(currentUser){
    const name=currentUser.user_metadata?.full_name||currentUser.email;
    const wrap=document.createElement('div');
    const userName=document.createElement('span');
    const logoutBtn=document.createElement('button');
    wrap.className='nav-user';
    userName.className='nav-user-name';
    userName.textContent=name;
    logoutBtn.className='nav-logout';
    logoutBtn.type='button';
    logoutBtn.textContent='Sair';
    logoutBtn.addEventListener('click',logout);
    wrap.append(userName,logoutBtn);
    area.appendChild(wrap);
    mobBtn.textContent='Sair';mobBtn.onclick=()=>{logout();closeMobile();};
  } else {
    const loginBtn=document.createElement('button');
    loginBtn.className='nav-cta';
    loginBtn.type='button';
    loginBtn.textContent='Entrar';
    loginBtn.addEventListener('click',()=>showAuth('login'));
    area.appendChild(loginBtn);
    mobBtn.textContent='Entrar';mobBtn.onclick=()=>{showAuth('login');closeMobile();};
  }
}

/* ===== INIT SESSION ===== */
(async()=>{
  const saved=loadSession();
  if(saved?.access_token&&saved?.user){
    _accessToken=saved.access_token;currentUser=saved.user;
    if(isSessionExpired(saved)&&saved.refresh_token){
      _accessToken=null;
      const refreshRes=await authPost('token?grant_type=refresh_token',{refresh_token:saved.refresh_token});
      if(refreshRes.ok) setSession(refreshRes.data);
      else { _accessToken=null;currentUser=null;clearSession(); }
    }
    if(_accessToken){
      const userRes=await authGet('user');
      if(userRes.ok&&userRes.data?.id) currentUser=userRes.data;
      else { _accessToken=null;currentUser=null;clearSession(); }
    }
  }
  showHome();updateNavAuth();
})();

/* ===== NAVBAR SCROLL ===== */
window.addEventListener('scroll',()=>{
  document.getElementById('navbar').style.background=window.scrollY>40?'rgba(5,8,16,.97)':'rgba(5,8,16,.85)';
},{passive:true});
const burger=document.getElementById('nav-burger');
const mobileMenu=document.getElementById('mobile-menu');
burger.addEventListener('click',()=>{const open=mobileMenu.classList.toggle('open');burger.setAttribute('aria-expanded',open);});
function closeMobile(){mobileMenu.classList.remove('open');burger.setAttribute('aria-expanded',false);}
function navScrollTo(id){
  if(document.getElementById('view-home').classList.contains('active')){
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  } else {showHome();setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),300);}
}

/* ===== FOOTER YEAR ===== */
document.getElementById('footer-year').textContent=new Date().getFullYear();

/* ===== REVEAL ===== */
const revealObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObs.unobserve(e.target);}});
},{threshold:0.08});
document.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));

/* ===== COUNTER ===== */
function animCounter(el){
  const target=+el.dataset.target,suffix=el.dataset.suffix||'',t0=performance.now();
  const tick=now=>{const p=Math.min((now-t0)/1400,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(e*target)+suffix;if(p<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
document.querySelectorAll('[data-counter]').forEach(el=>{
  const io=new IntersectionObserver(en=>{if(en[0].isIntersecting){animCounter(el);io.disconnect();}},{threshold:.3});
  io.observe(el.closest('.metric-item')||el);
});

/* ===== DATA ===== */
const typeMap={
  indoor:    {label:'Indoor',  badge:'badge-indoor',  glow:'rgba(0,112,255,.22)'},
  outdoor:   {label:'Outdoor', badge:'badge-outdoor', glow:'rgba(0,242,255,.18)'},
  rental:    {label:'Aluguel', badge:'badge-rental',  glow:'rgba(255,60,110,.18)'},
  scoreboard:{label:'Placar',  badge:'badge-score',   glow:'rgba(112,0,255,.18)'},
};
const products=[
  {id:1, name:'Painel Indoor P2',      type:'indoor',    pitch:2,   nits:800,  priceRaw:1400,price:'R$ 1.400/m²',desc:'Ideal para salas de conferência e estúdios.',      specs:{Módulo:'320×160mm',Cabinete:'640×480mm',Peso:'8 kg/m²',  Consumo:'300 W/m²',IP:'IP31'}},
  {id:2, name:'Painel Indoor P3',      type:'indoor',    pitch:3,   nits:1200, priceRaw:850, price:'R$ 850/m²',  desc:'Perfeito para shopping, lobbies e eventos internos.',specs:{Módulo:'192×192mm',Cabinete:'576×576mm',Peso:'9 kg/m²',  Consumo:'280 W/m²',IP:'IP41'}},
  {id:3, name:'Painel Indoor P4',      type:'indoor',    pitch:4,   nits:1500, priceRaw:620, price:'R$ 620/m²',  desc:'Ótimo custo-benefício para aplicações internas.',  specs:{Módulo:'256×128mm',Cabinete:'512×512mm',Peso:'10 kg/m²', Consumo:'260 W/m²',IP:'IP41'}},
  {id:4, name:'Painel Outdoor P5',     type:'outdoor',   pitch:5,   nits:5500, priceRaw:980, price:'R$ 980/m²',  desc:'Alto brilho para outdoors e fachadas.',            specs:{Módulo:'320×160mm',Cabinete:'960×960mm',Peso:'32 kg/m²', Consumo:'600 W/m²',IP:'IP65'}},
  {id:5, name:'Painel Outdoor P6',     type:'outdoor',   pitch:6,   nits:6500, priceRaw:1200,price:'R$ 1.200/m²',desc:'Padrão ouro outdoor. Visibilidade em qualquer condição.',specs:{Módulo:'192×192mm',Cabinete:'960×960mm',Peso:'34 kg/m²', Consumo:'650 W/m²',IP:'IP65'}},
  {id:6, name:'Painel Outdoor P8',     type:'outdoor',   pitch:8,   nits:7000, priceRaw:890, price:'R$ 890/m²',  desc:'Para grandes instalações ao ar livre.',            specs:{Módulo:'256×256mm',Cabinete:'1024×512mm',Peso:'30 kg/m²',Consumo:'550 W/m²',IP:'IP65'}},
  {id:7, name:'Painel Outdoor P10',    type:'outdoor',   pitch:10,  nits:8000, priceRaw:750, price:'R$ 750/m²',  desc:'Painéis gigantes para rodovias e totens.',         specs:{Módulo:'320×320mm',Cabinete:'960×960mm',Peso:'28 kg/m²', Consumo:'500 W/m²',IP:'IP65'}},
  {id:8, name:'Painel Aluguel P3.9',   type:'rental',    pitch:3.9, nits:2000, priceRaw:200, price:'R$ 200/dia', desc:'Cabinetes leves para montagem rápida em eventos.',  specs:{Módulo:'250×250mm',Cabinete:'500×1000mm',Peso:'11 kg',   Consumo:'300 W/m²',IP:'IP43'}},
  {id:9, name:'Painel Aluguel P4.8',   type:'rental',    pitch:4.8, nits:1800, priceRaw:160, price:'R$ 160/dia', desc:'Solução econômica para shows e congressos.',        specs:{Módulo:'240×240mm',Cabinete:'480×960mm',Peso:'9 kg',    Consumo:'270 W/m²',IP:'IP43'}},
  {id:10,name:'Placar LED P10',        type:'scoreboard',pitch:10,  nits:9000, priceRaw:1800,price:'R$ 1.800/m²',desc:'Placares para estádios e ginásios.',                specs:{Módulo:'320×160mm',Cabinete:'960×960mm',Peso:'35 kg/m²', Consumo:'700 W/m²',IP:'IP65'}},
  {id:11,name:'Painel Indoor P2.5',    type:'indoor',    pitch:2.5, nits:1000, priceRaw:1100,price:'R$ 1.100/m²',desc:'Ótima nitidez para estúdios de TV.',               specs:{Módulo:'160×160mm',Cabinete:'640×480mm',Peso:'8.5 kg/m²',Consumo:'320 W/m²',IP:'IP41'}},
  {id:12,name:'Painel Outdoor P6 Flex',type:'outdoor',   pitch:6,   nits:5500, priceRaw:1350,price:'R$ 1.350/m²',desc:'Modelo flexível para fachadas curvas.',             specs:{Módulo:'Flexível',  Cabinete:'500×1000mm',Peso:'22 kg/m²', Consumo:'580 W/m²',IP:'IP65'}},
];

/* FEATURED */
(function renderFeatured(){
  const featured=[
    {name:'Painel Indoor P3', spec:'Pitch P3 · 576×576mm · 1200 nits', price:'R$ 850/m²',  type:'indoor',  glow:'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(0,112,255,.28),transparent 75%)'},
    {name:'Painel Outdoor P6',spec:'Pitch P6 · 960×960mm · 6500 nits', price:'R$ 1.200/m²',type:'outdoor', glow:'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(0,242,255,.22),transparent 75%)'},
    {name:'Painel Aluguel P4',spec:'Pitch P4 · 500×1000mm · 2000 nits',price:'R$ 180/dia', type:'rental',  glow:'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,60,110,.22),transparent 75%)'},
  ];
  const tL={indoor:'Indoor',outdoor:'Outdoor',rental:'Aluguel'};
  const tB={indoor:'badge-indoor',outdoor:'badge-outdoor',rental:'badge-rental'};
  const g=document.getElementById('featured-grid');
  g.innerHTML=featured.map((p,i)=>`
    <div class="product-card reveal reveal-d${i}" onclick="requireLogin()" role="button" tabindex="0" aria-label="Ver ${p.name}">
      <div class="product-thumb">
        <div class="product-thumb-glow" style="background:${p.glow}"></div>
        <div class="scanlines"></div>
        <span class="product-thumb-label">${tL[p.type]}</span>
      </div>
      <div class="product-body">
        <span class="badge ${tB[p.type]}" style="margin-bottom:10px">${tL[p.type]}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-spec">${p.spec}</div>
        <div class="product-footer">
          <span class="product-price">${p.price}</span>
          <button class="btn btn-outline" style="padding:7px 16px;font-size:11px;width:auto" tabindex="-1">Ver detalhes</button>
        </div>
      </div>
    </div>`).join('');
  g.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));
})();

/* PORTFOLIO */
(function renderPortfolio(){
  const portfolio=[
    {title:'Festa de Aniversário',    meta:'Aluguel · 20m² · Tangará da Serra',        color:'rgba(0,112,255,.18)',strip:'linear-gradient(90deg,#0066ff,#00f2ff)'},
    {title:'Show de Música',   meta:'Aluguel · 30m² · Tangará da Serra',         color:'rgba(0,242,255,.14)',strip:'var(--cyan)'},
    {title:'Casamento', meta:'Aluguel · 15m² · Tangará da Serra', color:'rgba(255,60,110,.14)',strip:'#ff3c6e'},
  ];
  const g=document.getElementById('port-home-grid');
  g.innerHTML=portfolio.map((p,i)=>`
    <div class="port-item reveal reveal-d${i}">
      <div class="inner" style="background:linear-gradient(135deg,${p.color},var(--bg))">
        <div class="port-strip" style="background:${p.strip}"></div>
        <div class="scanlines"></div>
        <div class="port-overlay"><div class="port-info"><h4>${p.title}</h4><p>${p.meta}</p></div></div>
      </div>
    </div>`).join('');
  g.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));
})();

/* ===== CATALOG ===== */
const state={search:'',sort:'name',cats:new Set(['indoor','outdoor','rental','scoreboard']),pitchMin:1,pitchMax:10,nitsMin:0,page:1,perPage:8};
function getFiltered(){
  const pMin=Math.min(state.pitchMin,state.pitchMax),pMax=Math.max(state.pitchMin,state.pitchMax);
  return products.filter(p=>state.cats.has(p.type)&&p.pitch>=pMin&&p.pitch<=pMax&&p.nits>=state.nitsMin&&(!state.search||p.name.toLowerCase().includes(state.search.toLowerCase())))
    .sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):state.sort==='price-asc'?a.priceRaw-b.priceRaw:state.sort==='price-desc'?b.priceRaw-a.priceRaw:a.pitch-b.pitch);
}
function renderGrid(){
  const f=getFiltered(),total=f.length,pages=Math.max(1,Math.ceil(total/state.perPage));
  state.page=Math.min(state.page,pages);
  const slice=f.slice((state.page-1)*state.perPage,state.page*state.perPage);
  document.getElementById('results-count').textContent=`${total} produto${total!==1?'s':''}`;
  const grid=document.getElementById('products-grid');
  if(!slice.length){grid.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><p>Nenhum produto encontrado.<br>Ajuste os filtros.</p></div>`;}
  else {
    grid.innerHTML=slice.map(p=>{
      const t=typeMap[p.type];
      return `<div class="prod-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${p.name}">
        <div class="prod-img">
          <div class="prod-img-glow" style="background:radial-gradient(ellipse 70% 60% at 50% 50%,${t.glow},transparent 80%)"></div>
          <div class="prod-img-scan"></div>
          <span class="prod-img-label">${t.label}</span>
          <div class="prod-badge-wrap"><span class="badge ${t.badge}">${t.label}</span></div>
        </div>
        <div class="prod-body">
          <div class="prod-name">${p.name}</div>
          <div class="prod-specs">Pitch P${p.pitch} · ${p.nits.toLocaleString('pt-BR')} nits</div>
          <div class="prod-footer"><span class="prod-price">${p.price}</span><button class="prod-btn" tabindex="-1">Ver mais</button></div>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.prod-card').forEach(c=>{
      const fn=()=>openModal(+c.dataset.id);
      c.addEventListener('click',fn);
      c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
    });
  }
  renderPag(pages);
}
function renderPag(pages){
  const pag=document.getElementById('pagination');
  if(pages<=1){pag.innerHTML='';return;}
  pag.innerHTML='';
  const mk=(l,p,dis,act)=>{const b=document.createElement('button');b.className='pag-btn'+(act?' active':'');b.textContent=l;b.disabled=dis;if(!dis)b.addEventListener('click',()=>{state.page=p;renderGrid();document.getElementById('catalog-main').scrollIntoView({behavior:'smooth',block:'start'});});return b;};
  pag.appendChild(mk('‹',state.page-1,state.page===1,false));
  for(let i=1;i<=pages;i++)pag.appendChild(mk(i,i,false,i===state.page));
  pag.appendChild(mk('›',state.page+1,state.page===pages,false));
}
function openModal(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  const t=typeMap[p.type];
  document.getElementById('modal-body').innerHTML=`
    <div style="margin-bottom:10px"><span class="badge ${t.badge}">${t.label}</span></div>
    <div class="modal-title" id="modal-title-text">${p.name}</div>
    <div class="modal-desc">${p.desc}</div>
    <div class="modal-specs-grid">${Object.entries(p.specs).map(([k,v])=>`<div class="spec-row"><div class="spec-key">${k}</div><div class="spec-val">${v}</div></div>`).join('')}</div>
    <div class="modal-actions">
      <a class="btn btn-wa" href="https://wa.me/5565999134921?text=${encodeURIComponent('Olá! Tenho interesse no '+p.name)}" target="_blank" rel="noopener">💬 Pedir orçamento</a>
      <a class="btn btn-outline" href="mailto:contato@djbruno.com.br?subject=${encodeURIComponent('Orçamento: '+p.name)}">Enviar e-mail</a>
    </div>`;
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('modal-close').focus(),50);
}
function closeModal(){document.getElementById('modal').classList.remove('open');document.body.style.overflow='';}
document.getElementById('modal-close').addEventListener('click',closeModal);
document.getElementById('modal').addEventListener('click',e=>{if(e.target===document.getElementById('modal'))closeModal();});
document.addEventListener('keydown',e=>e.key==='Escape'&&closeModal());

/* Filtros */
document.querySelectorAll('.filter-cat').forEach(cb=>cb.addEventListener('change',()=>{cb.checked?state.cats.add(cb.value):state.cats.delete(cb.value);state.page=1;renderGrid();}));
const pmEl=document.getElementById('pitch-min'),pxEl=document.getElementById('pitch-max'),pwEl=document.getElementById('pitch-warning');
pmEl.addEventListener('input',()=>{state.pitchMin=+pmEl.value;document.getElementById('pitch-min-lbl').textContent=state.pitchMin;pwEl.classList.toggle('show',state.pitchMin>state.pitchMax);state.page=1;renderGrid();});
pxEl.addEventListener('input',()=>{state.pitchMax=+pxEl.value;document.getElementById('pitch-max-lbl').textContent=state.pitchMax;pwEl.classList.toggle('show',state.pitchMin>state.pitchMax);state.page=1;renderGrid();});
document.getElementById('nits-filter').addEventListener('input',function(){state.nitsMin=+this.value;document.getElementById('nits-lbl').textContent=state.nitsMin.toLocaleString('pt-BR')+' nits';state.page=1;renderGrid();});
document.getElementById('search-input').addEventListener('input',function(){state.search=this.value.trim();state.page=1;renderGrid();});
document.getElementById('sort-select').addEventListener('change',function(){state.sort=this.value;renderGrid();});
document.getElementById('clear-filters').addEventListener('click',()=>{
  state.search='';state.sort='name';state.pitchMin=1;state.pitchMax=10;state.nitsMin=0;state.page=1;
  state.cats.clear();['indoor','outdoor','rental','scoreboard'].forEach(v=>state.cats.add(v));
  document.getElementById('search-input').value='';document.getElementById('sort-select').value='name';
  document.querySelectorAll('.filter-cat').forEach(cb=>cb.checked=true);
  pmEl.value=1;pxEl.value=10;document.getElementById('pitch-min-lbl').textContent='1';document.getElementById('pitch-max-lbl').textContent='10';
  document.getElementById('nits-filter').value=0;document.getElementById('nits-lbl').textContent='0';
  pwEl.classList.remove('show');renderGrid();
});

/* Enter login */
document.getElementById('login-password').addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
document.getElementById('reg-confirm').addEventListener('keydown',e=>e.key==='Enter'&&doRegister());
