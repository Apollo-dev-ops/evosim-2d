// main.js
// EvoVerse 2D — Browser JS simulation with lineage, species events, epochs, CSV export.
// Requires Chart.js (included in index.html).

/* ----------------- CONFIG ----------------- */
const CONFIG = {
  WORLD_W: 160,
  WORLD_H: 120,
  OCEAN_H: 40,   // 0..OCEAN_H = ocean
  LAND_H: 80,    // OCEAN_H..LAND_H = land
  INITIAL_FOOD: 300,
  INITIAL_POP: 30,
  MAX_STEPS: 20000,
  FOOD_ENERGY: 35,
  MOVE_COST_BASE: 0.02,
  REPRO_ENERGY: 120,
  MUTATION_RATE: 0.12,
  MUTATION_STD: 0.12,
  SPECIES_DIST_THRESH: 0.95,
  MIN_SPECIES_SIZE: 3,
  MULTICELLULARITY_ADHESION: 0.6,
  LAND_MOTILITY: 0.6,
  FLIGHT_MOTILITY: 0.6,
  CANVAS_SCALE: 5, // scale simulation coords to pixels (kept internal)
  MIN_SPEED: 0.1,
  MAX_SPEED: 10.0,
  DEFAULT_SPEED: 1.0
};

/* ----------------- UTIL ----------------- */
function clamp(x,a=-2.5,b=2.5){return Math.max(a, Math.min(b, x));}
function nowIso(){ return (new Date()).toISOString(); }

// CSV helpers
function arrayToCSV(rows){
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
}
function downloadText(filename, text){
  const blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ----------------- SIM CLASSES ----------------- */
let nextAgentId = 1;
let nextSpeciesId = 1;

class Agent {
  constructor(x,y, dna=null, energy=80, parent=null){
    this.id = nextAgentId++;
    this.x = x; this.y = y;
    this.energy = energy;
    this.age = 0;
    this.alive = true;
    this.parent = parent; // parent agent id
    // DNA: array length 10 (hue, size, metabolism, motility, sensor, adhesion, landBias, flyBias, bias, extra)
    if(!dna){
      this.dna = new Float32Array(10);
      for(let i=0;i<10;i++) this.dna[i] = (Math.random()*2-1)*0.5;
    } else {
      this.dna = new Float32Array(dna);
    }
    this.species = null;
    this.updateTraits();
  }
  updateTraits(){
    this.hue = (this.dna[0]*0.5 + 0.5); // 0..1
    this.size = Math.max(0.25, 0.4 + this.dna[1]*0.3);
    this.metabolism = Math.max(0.01, 0.03 + this.dna[2]*0.02);
    // motilities
    this.motility_swim = 0.5 + this.dna[3]*0.5;
    this.motility_land = 0.2 + this.dna[6]*0.4;
    this.motility_fly = 0.1 + this.dna[7]*0.4;
    // normalize
    let s = Math.abs(this.motility_swim)+Math.abs(this.motility_land)+Math.abs(this.motility_fly);
    if(s<=0) s=1;
    this.motility_swim/=s; this.motility_land/=s; this.motility_fly/=s;
    this.sensor = Math.max(1.0, 3.0 + this.dna[4]*3.0);
    this.adhesion = (this.dna[5]*0.5 + 0.5);
  }
  region(){
    if(this.y < CONFIG.OCEAN_H) return 'ocean';
    if(this.y < CONFIG.LAND_H) return 'land';
    return 'air';
  }
  step(foodList){
    if(!this.alive) return;
    this.age++;
    // sense nearest food
    let fx=0, fy=0, nearest=null, nd=1e9;
    for(let i=0;i<foodList.length;i++){
      const f = foodList[i];
      const dx = f.x - this.x, dy = f.y - this.y;
      const d = Math.hypot(dx,dy);
      if(d < nd){ nd=d; nearest={i,d}; }
      if(d <= this.sensor){
        fx += dx / Math.max(d, 1e-6);
        fy += dy / Math.max(d, 1e-6);
      }
    }
    let target = [fx, fy];
    // if no target, random drift
    if(Math.hypot(target[0],target[1]) < 1e-6){
      const ang = Math.random()*Math.PI*2;
      target = [Math.cos(ang)*0.2, Math.sin(ang)*0.2];
    }
    // region biases
    const region = this.region();
    const pref = [this.motility_swim, this.motility_land, this.motility_fly];
    const env_pref = region==='ocean' ? [1,0,0] : region==='land' ? [0.2,1,0] : [0,0.2,1];
    const mismatch = 1 - (pref[0]*env_pref[0] + pref[1]*env_pref[1] + pref[2]*env_pref[2]);
    let speed = 0.8 * (1.0/this.size) * (0.5 + Math.hypot(target[0],target[1])*0.2);
    speed *= (1 - 0.5*mismatch);
    // apply movement with jitter
    this.x += target[0]*0.12*speed + (Math.random()*2-1)*0.3;
    this.y += target[1]*0.12*speed + (Math.random()*2-1)*0.3;
    if(this.x < 0) this.x = 0; if(this.x > CONFIG.WORLD_W) this.x = CONFIG.WORLD_W;
    if(this.y < 0) this.y = 0; if(this.y > CONFIG.WORLD_H) this.y = CONFIG.WORLD_H;
    // cost
    const moveCost = CONFIG.MOVE_COST_BASE * speed * (1 + this.metabolism);
    this.energy -= moveCost; this.energy -= 0.005;
    // eat nearest
    if(nearest && nearest.d < (1.5*this.size + 1.0)){
      const f = foodList[nearest.i];
      this.energy += f.energy;
      foodList.splice(nearest.i,1);
    }
    if(this.energy <= 0 || isNaN(this.energy)){ this.alive=false; }
  }

  tryReproduce(sexual=false){
    if(this.energy <= CONFIG.REPRO_ENERGY || this.age <= 3) return null;
    // asexual by default: copy + mutation
    if(!sexual) {
      const childDNA = new Float32Array(this.dna);
      for(let i=0;i<childDNA.length;i++){
        if(Math.random() < CONFIG.MUTATION_RATE){
          childDNA[i] += (Math.random()*2-1) * CONFIG.MUTATION_STD;
          childDNA[i] = clamp(childDNA[i]);
        }
      }
      const dx = (Math.random()*2-1)*(0.8+this.size*0.6);
      const dy = (Math.random()*2-1)*(0.8+this.size*0.6);
      const child = new Agent(Math.max(0,Math.min(CONFIG.WORLD_W,this.x+dx)),
                              Math.max(0,Math.min(CONFIG.WORLD_H,this.y+dy)),
                              childDNA, this.energy*0.45, this.id);
      this.energy *= 0.45;
      return child;
    } else {
      // sexual: we will pick a partner externally (handled in sim loop) — here not used
      return null;
    }
  }
}

/* ----------------- SIMULATION MANAGER ----------------- */
class EvoSim {
  constructor(){
    this.agents = [];
    this.foods = []; // {x,y,energy}
    this.step = 0;
    this.speciesPrototypes = []; // [{proto:Float32Array, id, members:count}]
    this.speciesCounts = {};
    this.nextSpeciesID = 1;
    this.epoch = "Bacteria Epoch";
    this.events = []; // species & epoch events (for export)
    this.metrics = []; // per-step metrics rows for CSV
    this.lineage = {}; // id -> parent
  }

  seed(initialPop){
    this.agents = []; this.foods = []; this.step=0;
    nextAgentId = 1; nextSpeciesId = 1;
    // seed bacteria in ocean
    for(let i=0;i<initialPop;i++){
      const x = Math.random()*CONFIG.WORLD_W;
      const y = Math.random()*(CONFIG.OCEAN_H*0.8);
      const dna = new Float32Array(10);
      dna[0]= (Math.random()*0.2-0.1); // hue neutral
      dna[1]= (Math.random()*0.2-0.2); // small size
      dna[2]= (Math.random()*0.3-0.1); // metabolism
      dna[3]= (0.4 + Math.random()*0.4); // swim bias
      dna[4]= (Math.random()*0.6-0.2); // sensor
      dna[5]= (Math.random()*0.4-0.6); // adhesion low
      dna[6]= (Math.random()*0.4-0.1); // land bias
      dna[7]= (Math.random()*0.4-0.2); // fly bias
      dna[8]=0; dna[9]=0;
      const a = new Agent(x,y,dna,80,null);
      this.agents.push(a);
      this.lineage[a.id] = {parent: a.parent || null};
    }
    // food initially concentrated in ocean
    for(let i=0;i<CONFIG.INITIAL_FOOD;i++){
      const fx = Math.random()*CONFIG.WORLD_W;
      const fy = Math.random()*(CONFIG.OCEAN_H*0.95);
      this.foods.push({x:fx,y:fy,energy:CONFIG.FOOD_ENERGY*(0.8+Math.random()*0.8)});
    }
    this.speciesPrototypes = []; this.speciesCounts = {};
    this.events = []; this.metrics = [];
  }

  stepSim(sexual=false){
    this.step++;
    // actions
    const newAgents = [];
    for(let a of this.agents){
      if(!a.alive) continue;
      a.step(this.foods);
      if(sexual){
        // sexual reproduction handled later in batch
      } else {
        const child = a.tryReproduce(false);
        if(child){ newAgents.push(child); this.lineage[child.id] = {parent: a.id}; }
      }
    }
    // implement simple sexual recombination: randomly pick pairs eligible
    if(sexual){
      // collect eligible parents
      const elig = this.agents.filter(a => a.alive && a.energy > CONFIG.REPRO_ENERGY && a.age>3);
      // shuffle
      for(let i=elig.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [elig[i],elig[j]]=[elig[j],elig[i]];}
      for(let i=0;i+1<elig.length;i+=2){
        const p1=elig[i], p2=elig[i+1];
        // child dna is mix of parents + mutation
        const childDNA = new Float32Array(10);
        for(let g=0;g<10;g++){
          childDNA[g] = Math.random()<0.5 ? p1.dna[g] : p2.dna[g];
          if(Math.random()<CONFIG.MUTATION_RATE){ childDNA[g]+= (Math.random()*2-1)*CONFIG.MUTATION_STD; childDNA[g]=clamp(childDNA[g]); }
        }
        const dx = (Math.random()*2-1)*1.5; const dy=(Math.random()*2-1)*1.5;
        const child = new Agent(Math.max(0,Math.min(CONFIG.WORLD_W,p1.x+dx)), Math.max(0,Math.min(CONFIG.WORLD_H,p1.y+dy)), childDNA, (p1.energy+p2.energy)*0.22, p1.id);
        newAgents.push(child);
        this.lineage[child.id] = {parent1:p1.id, parent2:p2.id};
        // energy cost to parents
        p1.energy *= 0.55; p2.energy *= 0.55;
      }
    }
    // add children
    for(let c of newAgents){ this.agents.push(c); }

    // remove consumed food (already removed in step logic when eaten)
    if(this.foods.length < CONFIG.INITIAL_FOOD * 0.4 && this.step % 5 === 0){
      this.spawnFood(Math.min(100, Math.round(CONFIG.INITIAL_FOOD * 0.3)));
    }
    // remove dead agents
    this.agents = this.agents.filter(a => a.alive);

    // species detection
    this.updateSpecies();

    // epoch
    this.updateEpoch();

    // metrics
    this.logMetrics();
  }

  spawnFood(n){
    for(let i=0;i<n;i++){
      // distribute by epoch (early -> ocean; later -> whole world)
      let x = Math.random()*CONFIG.WORLD_W;
      let y = (this.epoch==='Bacteria Epoch') ? Math.random()*(CONFIG.OCEAN_H*0.95) : Math.random()*CONFIG.WORLD_H;
      this.foods.push({x,y,energy:CONFIG.FOOD_ENERGY*(0.8+Math.random()*0.8)});
    }
  }

  updateSpecies(){
    if(this.agents.length === 0) return;
    // build dna matrix (first 6 genes)
    const dnaMat = this.agents.map(a => a.dna.slice(0,6));
    // compute column mean/std
    const colMeans = [];
    const colStds = [];
    for(let col=0; col<6; col++){
      const vals = dnaMat.map(r => r[col]);
      const mean = vals.reduce((s,v)=>s+v,0)/vals.length;
      const std = Math.sqrt(vals.map(v=>Math.pow(v-mean,2)).reduce((s,v)=>s+v,0)/vals.length) + 1e-6;
      colMeans.push(mean); colStds.push(std);
    }
    // normalize rows
    const normRows = dnaMat.map(r => r.map((v,i)=> (v-colMeans[i])/colStds[i]));
    if(this.speciesPrototypes.length === 0){
      const proto = dnaMat[0].slice();
      const sid = this.nextSpeciesID++;
      this.speciesPrototypes.push({proto:sliceArray(proto), id:sid, count:this.agents.length});
      for(let a of this.agents) a.species = sid;
      this.speciesCounts[sid] = this.agents.length;
      this.announceSpecies(sid, proto, "Founding species: bacteria");
      return;
    }
    // assign agents
    for(let i=0;i<this.agents.length;i++){
      const r = normRows[i];
      let bestDist = 1e9, bestSid = null;
      for(let p of this.speciesPrototypes){
        const pnorm = p.proto.map((v,j)=> (v - colMeans[j])/colStds[j]);
        // distance
        let d=0; for(let j=0;j<r.length;j++) d += Math.pow(r[j]-pnorm[j],2);
        d = Math.sqrt(d);
        if(d < bestDist){ bestDist=d; bestSid=p.id; }
      }
      if(bestDist < CONFIG.SPECIES_DIST_THRESH){
        this.agents[i].species = bestSid;
        this.speciesCounts[bestSid] = (this.speciesCounts[bestSid] || 0) + 1;
      } else {
        // new species
        const proto = Array.from(dnaMat[i]);
        const sid = this.nextSpeciesID++;
        this.speciesPrototypes.push({proto:sliceArray(proto), id:sid, count:1});
        this.speciesCounts[sid] = 1;
        this.agents[i].species = sid;
        this.announceSpecies(sid, proto, `New species (dist ${bestDist.toFixed(2)})`);
      }
    }
  }

  announceSpecies(sid, proto, notes){
    const msg = `[SPECIES] step=${this.step} id=${sid} notes='${notes}' proto=${protoToJSON(proto)}`;
    console.log(msg);
    this.events.push({type:'species', step:this.step, id:sid, proto:protoToJSON(proto), notes:notes});
  }

  updateEpoch(){
    if(this.agents.length < 6) return;
    const adhesions = this.agents.map(a=>a.adhesion);
    const landBias = this.agents.map(a=>a.motility_land);
    const flyBias = this.agents.map(a=>a.motility_fly);
    const frac_adh = adhesions.filter(v=>v>CONFIG.MULTICELLULARITY_ADHESION).length / adhesions.length;
    const frac_land = landBias.filter(v=>v>CONFIG.LAND_MOTILITY).length / landBias.length;
    const frac_fly = flyBias.filter(v=>v>CONFIG.FLIGHT_MOTILITY).length / flyBias.length;

    if(this.epoch==='Bacteria Epoch' && frac_adh > 0.07 && average(this.agents.map(a=>a.size)) > 0.45){
      this.epoch = "Multicellularity";
      this.events.push({type:'epoch', step:this.step, epoch:this.epoch});
      this.announceEpoch(this.epoch, `adhesion_frac=${frac_adh.toFixed(3)}`);
    } else if(this.epoch==='Multicellularity' && frac_land > 0.08){
      this.epoch = "Land Colonization";
      this.events.push({type:'epoch', step:this.step, epoch:this.epoch});
      this.announceEpoch(this.epoch, `land_frac=${frac_land.toFixed(3)}`);
    } else if(this.epoch==='Land Colonization' && frac_fly > 0.06){
      this.epoch = "Flight Emergence";
      this.events.push({type:'epoch', step:this.step, epoch:this.epoch});
      this.announceEpoch(this.epoch, `fly_frac=${frac_fly.toFixed(3)}`);
    }
  }

  announceEpoch(name, notes){
    const msg = `[EPOCH] step=${this.step} epoch=${name} notes=${notes}`;
    console.log(msg);
    this.events.push({type:'epoch', step:this.step, epoch:name, notes:notes});
  }

  computeDiversity(){
    if(this.agents.length<2) return 0;
    const dnaMat = this.agents.map(a=>a.dna.slice(0,6));
    // mean pairwise euclidean
    let sum=0,count=0;
    for(let i=0;i<dnaMat.length;i++){
      for(let j=i+1;j<dnaMat.length;j++){
        let d=0; for(let k=0;k<6;k++){ d+=Math.pow(dnaMat[i][k]-dnaMat[j][k],2); }
        sum += Math.sqrt(d); count++;
      }
    }
    return count>0 ? sum/count : 0;
  }

  logMetrics(){
    const pop = this.agents.length;
    const food = this.foods.length;
    const avgSize = pop>0 ? average(this.agents.map(a=>a.size)) : 0;
    const avgEnergy = pop>0 ? average(this.agents.map(a=>a.energy)) : 0;
    const div = this.computeDiversity();
    this.metrics.push({step:this.step, population:pop, food:food, avgSize:avgSize, avgEnergy:avgEnergy, diversity:div, epoch:this.epoch});
  }
}

/* ----------------- SMALL HELPERS ----------------- */
function average(arr){ return arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0; }
function sliceArray(a){ return Array.from(a); }
function protoToJSON(proto){ return proto.map(v=>Number(v.toFixed(4))); }

/* ----------------- RENDERING & UI ----------------- */
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const epochEl = document.getElementById('epochName');
const annDiv = document.getElementById('announcements');

const mrEl = document.getElementById('mutationRate');
const mrVal = document.getElementById('mr_val');
const initPopEl = document.getElementById('initPop');
const initVal = document.getElementById('init_val');
const reproEl = document.getElementById('reproEnergy');
const reproVal = document.getElementById('repro_val');
const sexualToggle = document.getElementById('sexualToggle');
const btnRestart = document.getElementById('btnRestart');
const btnPause = document.getElementById('btnPause');
const btnSpawnFood = document.getElementById('btnSpawnFood');

// Time control elements
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const btnSlow = document.getElementById('btnSlow');
const btnNormal = document.getElementById('btnNormal');
const btnFast = document.getElementById('btnFast');

const stats = { step: document.getElementById('step'), pop:document.getElementById('pop'), food:document.getElementById('food'), speciesCount:document.getElementById('speciesCount'), avgSize:document.getElementById('avgSize'), diversity:document.getElementById('diversity') };

const chartCtx = document.getElementById('miniChart').getContext('2d');
const chart = new Chart(chartCtx, {
  type:'line',
  data:{ labels:[], datasets:[
    { label:'Population', data:[], borderColor:'#66b3ff', fill:false, tension:0.2 },
    { label:'Food', data:[], borderColor:'#ffd166', fill:false, tension:0.2 },
    { label:'Diversity', data:[], borderColor:'#d99cff', fill:false, tension:0.2, yAxisID:'y1' }
  ]},
  options:{ animation:false, scales:{ y:{ beginAtZero:true }, y1:{ beginAtZero:true, position:'right', grid:{drawOnChartArea:false}}}, plugins:{legend:{display:true}} }
});

let sim = new EvoSim();
let ANIM = { 
  running: true, 
  frame: null, 
  stepsPerFrame: 1,
  speed: CONFIG.DEFAULT_SPEED,
  lastStepTime: performance.now()
};
let lastTick = performance.now();

function initUI(){
  mrEl.value = CONFIG.MUTATION_RATE; mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2);
  initPopEl.value = CONFIG.INITIAL_POP; initVal.innerText = CONFIG.INITIAL_POP;
  reproEl.value = CONFIG.REPRO_ENERGY; reproVal.innerText = CONFIG.REPRO_ENERGY;

  // Initialize time control
  speedSlider.value = CONFIG.DEFAULT_SPEED;
  speedValue.innerText = CONFIG.DEFAULT_SPEED.toFixed(1) + 'x';
  ANIM.speed = CONFIG.DEFAULT_SPEED;

  mrEl.addEventListener('input', ()=>{ CONFIG.MUTATION_RATE = parseFloat(mrEl.value); mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2); });
  initPopEl.addEventListener('input', ()=>{ initVal.innerText = initPopEl.value; });
  reproEl.addEventListener('input', ()=>{ CONFIG.REPRO_ENERGY = parseInt(reproEl.value); reproVal.innerText = reproEl.value; });

  // Time control event listeners
  speedSlider.addEventListener('input', updateSpeed);
  btnSlow.addEventListener('click', () => setSpeed(0.5));
  btnNormal.addEventListener('click', () => setSpeed(1.0));
  btnFast.addEventListener('click', () => setSpeed(3.0));

  btnRestart.addEventListener('click', ()=>{ restartSim(); });
  btnPause.addEventListener('click', ()=>{ 
    ANIM.running = !ANIM.running; 
    btnPause.innerText = ANIM.running? 'Pause':'Resume'; 
  });
  btnSpawnFood.addEventListener('click', ()=>{ sim.spawnFood(50); });
  // exports
  document.getElementById('btnExportMetrics').addEventListener('click', ()=>{ exportMetricsCSV(); });
  document.getElementById('btnExportSpecies').addEventListener('click', ()=>{ exportSpeciesCSV(); });
  document.getElementById('btnExportLineage').addEventListener('click', ()=>{ exportLineageJSON(); });
}

function updateSpeed() {
  ANIM.speed = parseFloat(speedSlider.value);
  speedValue.innerText = ANIM.speed.toFixed(1) + 'x';
}

function setSpeed(speed) {
  ANIM.speed = speed;
  speedSlider.value = speed;
  speedValue.innerText = speed.toFixed(1) + 'x';
}

function restartSim(){
  CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
  CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
  CONFIG.INITIAL_POP = parseInt(initPopEl.value);
  sim = new EvoSim();
  sim.seed(CONFIG.INITIAL_POP);
  updateStatsUI();
  annDiv.innerHTML = '';
  epochEl.innerText = sim.epoch;
}

/* ----------------- EXPORTS ----------------- */
function exportMetricsCSV(){
  const rows = [['step','population','food','avgSize','avgEnergy','diversity','epoch']];
  for(let r of sim.metrics) rows.push([r.step, r.population, r.food, r.avgSize.toFixed(4), r.avgEnergy.toFixed(4), r.diversity.toFixed(6), r.epoch]);
  downloadText('evo_metrics.csv', arrayToCSV(rows));
}
function exportSpeciesCSV(){
  const rows = [['time','type','id','prototype','notes']];
  for(let e of sim.events){
    if(e.type==='species') rows.push([e.step, e.type, e.id, JSON.stringify(e.proto), e.notes]);
    else if(e.type==='epoch') rows.push([e.step, e.type, '', e.epoch, e.notes || '']);
  }
  downloadText('evo_species_events.csv', arrayToCSV(rows));
}
function exportLineageJSON(){
  const out = {lineage: sim.lineage, events: sim.events, metricsSummary: { lastStep: sim.step, population: sim.agents.length }};
  const blob = new Blob([JSON.stringify(out, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='evo_lineage.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ----------------- RENDERING WORLD ----------------- */
function drawBackground(){
  // ocean band
  ctx.fillStyle = '#1f4f8b'; ctx.fillRect(0,0,canvas.width, Math.round(canvas.height*(CONFIG.OCEAN_H/CONFIG.WORLD_H)));
  // land band
  const landTop = Math.round(canvas.height*(CONFIG.OCEAN_H/CONFIG.WORLD_H));
  const landBottom = Math.round(canvas.height*(CONFIG.LAND_H/CONFIG.WORLD_H));
  ctx.fillStyle = '#7db36f'; ctx.fillRect(0,landTop,canvas.width, landBottom-landTop);
  // air band
  ctx.fillStyle = '#d6e9ff'; ctx.fillRect(0,landBottom,canvas.width, canvas.height-landBottom);
}

// convert world coords to canvas coords
function wx(x){ return (x/CONFIG.WORLD_W) * canvas.width; }
function wy(y){ return canvas.height - (y/CONFIG.WORLD_H) * canvas.height; }

function draw(){
  drawBackground();
  // draw food
  for(let f of sim.foods){
    const px = wx(f.x), py = wy(f.y);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(px-3,py-3,6,6);
  }
  // draw agents
  for(let a of sim.agents){
    const px = wx(a.x), py = wy(a.y);
    const hue = ( (a.species && a.species>0) ? ((a.species * 137.5) % 360)/360 : a.hue);
    ctx.beginPath();
    const r = Math.max(2, a.size*8 + Math.min(12, a.energy/20));
    ctx.fillStyle = `hsl(${Math.floor(hue*360)}, 70%, ${50}%)`;
    ctx.strokeStyle = '#111'; ctx.lineWidth=0.5;
    ctx.ellipse(px,py,r,r,0,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
    // small energy glow ring
    const e = Math.max(0, Math.min(1, a.energy/220));
    if(e>0.15){
      ctx.beginPath(); ctx.strokeStyle = `rgba(255,255,255,${0.06+0.12*e})`; ctx.lineWidth=1; ctx.ellipse(px,py,r+4,r+4,0,0,Math.PI*2); ctx.stroke();
    }
  }
  // overlays: UI text handled elsewhere
}

/* ----------------- MAIN LOOP ----------------- */
function stepLoop(){
  const now = performance.now();
  const deltaTime = now - ANIM.lastStepTime;
  
  // Calculate how many steps to run based on speed and elapsed time
  const targetStepInterval = 1000 / (60 * ANIM.speed); // 60 FPS base rate
  const stepsToRun = Math.floor(deltaTime / targetStepInterval);
  
  if(ANIM.running && stepsToRun > 0){
    // Run simulation steps
    for(let i = 0; i < stepsToRun; i++){
      sim.stepSim(sexualToggle.checked);
    }
    
    ANIM.lastStepTime = now;
    
    // Periodic food cleanup
    if(sim.foods.length < Math.max(30, Math.round(CONFIG.INITIAL_FOOD*0.5))){
      sim.spawnFood(Math.round(CONFIG.INITIAL_FOOD*0.3));
    }
    
    // Safety cap
    if(sim.agents.length > 700){
      sim.agents.sort((a,b)=> a.energy - b.energy);
      while(sim.agents.length > 400){
        const rem = sim.agents.shift();
        if(rem) rem.alive=false;
      }
    }
    
    updateStatsUI();
    updateChart();
    draw();
  }
  
  ANIM.frame = requestAnimationFrame(stepLoop);
}

function updateStatsUI(){
  document.getElementById('step').innerText = sim.step;
  document.getElementById('pop').innerText = sim.agents.length;
  document.getElementById('food').innerText = sim.foods.length;
  document.getElementById('speciesCount').innerText = sim.speciesPrototypes.length;
  document.getElementById('avgSize').innerText = (sim.agents.length? average(sim.agents.map(a=>a.size)).toFixed(2): '0.00');
  document.getElementById('diversity').innerText = (sim.computeDiversity().toFixed(3));
  epochEl.innerText = sim.epoch;
}

function updateChart(){
  const L = sim.metrics.length;
  if(L>200){
    sim.metrics.shift();
    // also trim chart arrays
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds=>ds.data.shift());
  }
  chart.data.labels.push(sim.step);
  chart.data.datasets[0].data.push(sim.agents.length);
  chart.data.datasets[1].data.push(sim.foods.length);
  chart.data.datasets[2].data.push(sim.metrics.length? sim.metrics[sim.metrics.length-1].diversity : 0);
  chart.update('none');
}

/* ----------------- BOOT ----------------- */
function boot(){
  canvas.width = 960; canvas.height = 720;
  initUI();
  restartSim();
  ANIM.running = true;
  ANIM.lastStepTime = performance.now();
  stepLoop();
}
function restartSim(){
  CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
  CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
  CONFIG.INITIAL_POP = parseInt(initPopEl.value);
  sim = new EvoSim();
  sim.seed(CONFIG.INITIAL_POP);
  // populate chart empty
  chart.data.labels = []; chart.data.datasets.forEach(ds=>ds.data = []);
  sim.logMetrics();
  updateStatsUI();
  draw();
}

// start
boot();
