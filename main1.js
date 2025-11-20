// main.js
// EvoVerse 2D — Realistic Earth Evolution Simulator

/* ----------------- CONFIG ----------------- */
const CONFIG = {
  WORLD_W: 160,
  WORLD_H: 120,
  OCEAN_H: 40,
  LAND_H: 80,
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
  CANVAS_SCALE: 5,
  MIN_SPEED: 0.1,
  MAX_SPEED: 10.0,
  DEFAULT_SPEED: 1.0,
  MAX_STEPS_PER_FRAME: 20,
  START_YEAR: -3800000000, // 3.8 billion years ago - first life
  YEARS_PER_STEP: 1000000, // Each step = 1 million years
  EXTINCTION_EVENTS: [
    { year: -445000000, name: "Ordovician-Silurian", severity: 0.85, description: "Global cooling and sea level drop" },
    { year: -372000000, name: "Late Devonian", severity: 0.75, description: "Ocean anoxia and climate change" },
    { year: -252000000, name: "Permian-Triassic", severity: 0.95, description: "The Great Dying - volcanic activity" },
    { year: -201000000, name: "Triassic-Jurassic", severity: 0.80, description: "Climate change and ocean acidification" },
    { year: -66000000, name: "Cretaceous-Paleogene", severity: 0.75, description: "Asteroid impact and volcanic activity" }
  ],
  ICE_AGES: [
    { year: -2400000000, duration: 300000000, name: "Huronian" },
    { year: -720000000, duration: 230000000, name: "Cryogenian" },
    { year: -460000000, duration: 30000000, name: "Andean-Saharan" },
    { year: -360000000, duration: 100000000, name: "Karoo" },
    { year: -2600000, duration: 2600000, name: "Quaternary" }
  ]
};

/* ----------------- EARTH HISTORY TIMELINE ----------------- */
const EARTH_EPOCHS = [
  { year: -3800000000, name: "Archaean", environment: "Hot, volcanic, no oxygen", challenges: ["High temperatures", "UV radiation", "Volcanic activity"], oxygen: 0.0 },
  { year: -2500000000, name: "Proterozoic", environment: "Great Oxygenation Event", challenges: ["Oxygen toxicity", "Ice ages", "Limited habitats"], oxygen: 0.1 },
  { year: -541000000, name: "Cambrian Explosion", environment: "Oxygen-rich oceans", challenges: ["Predation", "Competition", "New niches"], oxygen: 0.15 },
  { year: -485000000, name: "Ordovician", environment: "Warm, shallow seas", challenges: ["Marine adaptation", "Early predators"], oxygen: 0.18 },
  { year: -443000000, name: "Silurian", environment: "Stabilizing climate", challenges: ["Land colonization", "Ozone layer formation"], oxygen: 0.20 },
  { year: -419000000, name: "Devonian", environment: "Age of Fishes", challenges: ["Aquatic competition", "Early forests"], oxygen: 0.22 },
  { year: -359000000, name: "Carboniferous", environment: "Oxygen-rich atmosphere", challenges: ["Giant insects", "Forest fires", "Climate change"], oxygen: 0.35 },
  { year: -299000000, name: "Permian", environment: "Supercontinent formation", challenges: ["Desertification", "Temperature extremes"], oxygen: 0.23 },
  { year: -252000000, name: "Mesozoic", environment: "Age of Reptiles", challenges: ["Dinosaurs", "Climate shifts", "Continental drift"], oxygen: 0.26 },
  { year: -201000000, name: "Jurassic", environment: "Warm, humid", challenges: ["Large predators", "Competitive ecosystems"], oxygen: 0.26 },
  { year: -145000000, name: "Cretaceous", environment: "High sea levels", challenges: ["Flowering plants", "New predators"], oxygen: 0.30 },
  { year: -66000000, name: "Cenozoic", environment: "Age of Mammals", challenges: ["Mammal radiation", "Climate cooling"], oxygen: 0.21 },
  { year: -23000000, name: "Neogene", environment: "Modern ecosystems", challenges: ["Grasslands", "Climate oscillations"], oxygen: 0.21 },
  { year: -2600000, name: "Quaternary", environment: "Ice Ages", challenges: ["Glacial cycles", "Rapid climate change"], oxygen: 0.21 }
];

/* ----------------- UTIL ----------------- */
function clamp(x,a=-2.5,b=2.5){return Math.max(a, Math.min(b, x));}
function nowIso(){ return (new Date()).toISOString(); }

// Calculate current year based on simulation step
function calculateCurrentYear(step) {
  return CONFIG.START_YEAR + (step * CONFIG.YEARS_PER_STEP);
}

// Format year for display (negative = years ago)
function formatYear(year) {
  if (year < 0) {
    const yearsAgo = Math.abs(year);
    if (yearsAgo >= 1000000) {
      return (yearsAgo / 1000000).toFixed(1) + ' million years ago';
    } else if (yearsAgo >= 1000) {
      return (yearsAgo / 1000).toFixed(0) + ' thousand years ago';
    } else {
      return yearsAgo + ' years ago';
    }
  } else {
    return year.toString();
  }
}

// Get current epoch based on year
function getCurrentEpoch(year) {
  for (let i = EARTH_EPOCHS.length - 1; i >= 0; i--) {
    if (year >= EARTH_EPOCHS[i].year) {
      return EARTH_EPOCHS[i];
    }
  }
  return EARTH_EPOCHS[0];
}

// Check if we're in an extinction event
function getCurrentExtinctionEvent(year) {
  for (let event of CONFIG.EXTINCTION_EVENTS) {
    if (Math.abs(year - event.year) < CONFIG.YEARS_PER_STEP * 5) { // 5 million year window
      return event;
    }
  }
  return null;
}

// Check if we're in an ice age
function isIceAge(year) {
  for (let iceAge of CONFIG.ICE_AGES) {
    if (year >= iceAge.year && year <= iceAge.year + iceAge.duration) {
      return iceAge;
    }
  }
  return null;
}

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
    this.parent = parent;
    if(!dna){
      this.dna = new Float32Array(12); // Added oxygen tolerance and cold resistance
      for(let i=0;i<12;i++) this.dna[i] = (Math.random()*2-1)*0.5;
      // Start as simple bacteria
      this.dna[3] = 0.8; // High swim bias for ocean life
      this.dna[5] = -0.8; // Low adhesion
      this.dna[10] = -0.9; // Low oxygen tolerance (anaerobic)
    } else {
      this.dna = new Float32Array(dna);
    }
    this.species = null;
    this.updateTraits();
  }
  
  updateTraits(){
    this.hue = (this.dna[0]*0.5 + 0.5);
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
    this.oxygen_tolerance = (this.dna[10]*0.5 + 0.5); // 0-1 scale
    this.cold_resistance = (this.dna[11]*0.5 + 0.5); // 0-1 scale
  }
  
  region(){
    if(this.y < CONFIG.OCEAN_H) return 'ocean';
    if(this.y < CONFIG.LAND_H) return 'land';
    return 'air';
  }
  
  step(foodList, currentEpoch, extinctionEvent, iceAge){
    if(!this.alive) return;
    this.age++;
    
    // Environmental challenges based on epoch
    let environmentalStress = 0;
    
    // Oxygen toxicity for early anaerobic life
    if (currentEpoch.oxygen > 0.05 && this.oxygen_tolerance < 0.3) {
      environmentalStress += (currentEpoch.oxygen - 0.05) * 2;
    }
    
    // Cold stress during ice ages
    if (iceAge && this.cold_resistance < 0.5) {
      environmentalStress += 0.3;
    }
    
    // Extinction event stress
    if (extinctionEvent) {
      environmentalStress += extinctionEvent.severity * 0.5;
    }
    
    // Apply environmental stress
    if (environmentalStress > 0) {
      this.energy -= environmentalStress * 0.1;
      // Chance of immediate death under high stress
      if (Math.random() < environmentalStress * 0.01) {
        this.alive = false;
        return;
      }
    }
    
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
    if(Math.hypot(target[0],target[1]) < 1e-6){
      const ang = Math.random()*Math.PI*2;
      target = [Math.cos(ang)*0.2, Math.sin(ang)*0.2];
    }
    
    const region = this.region();
    const pref = [this.motility_swim, this.motility_land, this.motility_fly];
    const env_pref = region==='ocean' ? [1,0,0] : region==='land' ? [0.2,1,0] : [0,0.2,1];
    const mismatch = 1 - (pref[0]*env_pref[0] + pref[1]*env_pref[1] + pref[2]*env_pref[2]);
    
    let speed = 0.8 * (1.0/this.size) * (0.5 + Math.hypot(target[0],target[1])*0.2);
    speed *= (1 - 0.5*mismatch);
    
    // Apply environmental effects to movement
    if (iceAge) speed *= 0.7;
    if (extinctionEvent) speed *= 0.8;
    
    this.x += target[0]*0.12*speed + (Math.random()*2-1)*0.3;
    this.y += target[1]*0.12*speed + (Math.random()*2-1)*0.3;
    if(this.x < 0) this.x = 0; if(this.x > CONFIG.WORLD_W) this.x = CONFIG.WORLD_W;
    if(this.y < 0) this.y = 0; if(this.y > CONFIG.WORLD_H) this.y = CONFIG.WORLD_H;
    
    const moveCost = CONFIG.MOVE_COST_BASE * speed * (1 + this.metabolism);
    this.energy -= moveCost; 
    this.energy -= 0.005;
    
    if(nearest && nearest.d < (1.5*this.size + 1.0)){
      const f = foodList[nearest.i];
      this.energy += f.energy;
      foodList.splice(nearest.i,1);
    }
    
    if(this.energy <= 0 || isNaN(this.energy)){ this.alive=false; }
  }

  tryReproduce(sexual=false){
    if(this.energy <= CONFIG.REPRO_ENERGY || this.age <= 3) return null;
    
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
      return null;
    }
  }
}

/* ----------------- SIMULATION MANAGER ----------------- */
class EvoSim {
  constructor(){
    this.agents = [];
    this.foods = [];
    this.step = 0;
    this.speciesPrototypes = [];
    this.speciesCounts = {};
    this.nextSpeciesID = 1;
    this.epoch = "Archaean";
    this.currentEpoch = EARTH_EPOCHS[0];
    this.events = [];
    this.metrics = [];
    this.lineage = {};
    this.currentYear = CONFIG.START_YEAR;
    this.extinctionEvent = null;
    this.iceAge = null;
    this.oxygenLevel = 0.0;
  }

  seed(initialPop){
    this.agents = []; this.foods = []; this.step=0;
    this.currentYear = CONFIG.START_YEAR;
    this.currentEpoch = EARTH_EPOCHS[0];
    this.oxygenLevel = 0.0;
    nextAgentId = 1; nextSpeciesId = 1;
    
    // Seed primitive anaerobic bacteria in ocean
    for(let i=0;i<initialPop;i++){
      const x = Math.random()*CONFIG.WORLD_W;
      const y = Math.random()*(CONFIG.OCEAN_H*0.8);
      const dna = new Float32Array(12);
      // Simple bacterial traits
      dna[0]= (Math.random()*0.2-0.1);
      dna[1]= (Math.random()*0.2-0.3); // Very small
      dna[2]= (Math.random()*0.2-0.1); // Low metabolism
      dna[3]= (0.8 + Math.random()*0.3); // Ocean adapted
      dna[4]= (Math.random()*0.4-0.3); // Poor sensors
      dna[5]= (Math.random()*0.4-0.8); // No adhesion
      dna[6]= -0.8; // No land adaptation
      dna[7]= -0.9; // No flight
      dna[8]=0; dna[9]=0;
      dna[10]= -0.9; // Anaerobic
      dna[11]= -0.5; // Moderate cold sensitivity
      
      const a = new Agent(x,y,dna,80,null);
      this.agents.push(a);
      this.lineage[a.id] = {parent: a.parent || null};
    }
    
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
    this.currentYear = calculateCurrentYear(this.step);
    this.currentEpoch = getCurrentEpoch(this.currentYear);
    this.extinctionEvent = getCurrentExtinctionEvent(this.currentYear);
    this.iceAge = isIceAge(this.currentYear);
    this.oxygenLevel = this.currentEpoch.oxygen;
    this.epoch = this.currentEpoch.name;
    
    // Apply extinction event if active
    if (this.extinctionEvent && Math.random() < 0.1) { // 10% chance each step during event
      this.applyExtinctionEvent();
    }
    
    // Apply ice age effects
    if (this.iceAge) {
      this.applyIceAgeEffects();
    }
    
    const newAgents = [];
    for(let a of this.agents){
      if(!a.alive) continue;
      a.step(this.foods, this.currentEpoch, this.extinctionEvent, this.iceAge);
      if(!sexual) {
        const child = a.tryReproduce(false);
        if(child){ 
          newAgents.push(child); 
          this.lineage[child.id] = {parent: a.id}; 
        }
      }
    }
    
    if(sexual){
      const elig = this.agents.filter(a => a.alive && a.energy > CONFIG.REPRO_ENERGY && a.age>3);
      for(let i=elig.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [elig[i],elig[j]]=[elig[j],elig[i]];}
      for(let i=0;i+1<elig.length;i+=2){
        const p1=elig[i], p2=elig[i+1];
        const childDNA = new Float32Array(12);
        for(let g=0;g<12;g++){
          childDNA[g] = Math.random()<0.5 ? p1.dna[g] : p2.dna[g];
          if(Math.random()<CONFIG.MUTATION_RATE){ 
            childDNA[g]+= (Math.random()*2-1)*CONFIG.MUTATION_STD; 
            childDNA[g]=clamp(childDNA[g]); 
          }
        }
        const dx = (Math.random()*2-1)*1.5;
        const dy=(Math.random()*2-1)*1.5;
        const child = new Agent(
          Math.max(0,Math.min(CONFIG.WORLD_W,p1.x+dx)), 
          Math.max(0,Math.min(CONFIG.WORLD_H,p1.y+dy)), 
          childDNA, 
          (p1.energy+p2.energy)*0.22, 
          p1.id
        );
        newAgents.push(child);
        this.lineage[child.id] = {parent1:p1.id, parent2:p2.id};
        p1.energy *= 0.55; p2.energy *= 0.55;
      }
    }
    
    for(let c of newAgents){ this.agents.push(c); }

    if(this.foods.length < CONFIG.INITIAL_FOOD * 0.4 && this.step % 5 === 0){
      this.spawnFood(Math.min(100, Math.round(CONFIG.INITIAL_FOOD * 0.3)));
    }
    
    this.agents = this.agents.filter(a => a.alive);
    this.updateSpecies();
    this.logMetrics();
  }

  applyExtinctionEvent() {
    if (!this.extinctionEvent) return;
    
    const mortalityRate = this.extinctionEvent.severity * 0.3;
    this.agents.forEach(agent => {
      if (Math.random() < mortalityRate) {
        agent.alive = false;
      }
    });
    
    // Also reduce food during extinction events
    if (this.foods.length > 50 && Math.random() < 0.2) {
      this.foods.splice(0, Math.floor(this.foods.length * 0.1));
    }
  }

  applyIceAgeEffects() {
    // Reduce food availability during ice ages
    if (Math.random() < 0.1 && this.foods.length > 30) {
      this.foods.splice(0, Math.floor(this.foods.length * 0.05));
    }
  }

  spawnFood(n){
    for(let i=0;i<n;i++){
      let x = Math.random()*CONFIG.WORLD_W;
      let y;
      
      // Food distribution changes with epochs
      if (this.currentEpoch.name === "Archaean" || this.currentEpoch.name === "Proterozoic") {
        y = Math.random()*(CONFIG.OCEAN_H*0.95); // Mostly ocean
      } else if (this.currentEpoch.name.includes("Cambrian") || this.currentEpoch.name.includes("Ordovician")) {
        y = Math.random()*(CONFIG.WORLD_H*0.7); // More varied
      } else {
        y = Math.random()*CONFIG.WORLD_H; // Global distribution
      }
      
      this.foods.push({x,y,energy:CONFIG.FOOD_ENERGY*(0.8+Math.random()*0.8)});
    }
  }

  updateSpecies(){
    if(this.agents.length === 0) return;
    
    const dnaMat = this.agents.map(a => a.dna.slice(0,8)); // Use first 8 genes for species
    const colMeans = [];
    const colStds = [];
    for(let col=0; col<8; col++){
      const vals = dnaMat.map(r => r[col]);
      const mean = vals.reduce((s,v)=>s+v,0)/vals.length;
      const std = Math.sqrt(vals.map(v=>Math.pow(v-mean,2)).reduce((s,v)=>s+v,0)/vals.length) + 1e-6;
      colMeans.push(mean); colStds.push(std);
    }
    
    const normRows = dnaMat.map(r => r.map((v,i)=> (v-colMeans[i])/colStds[i]));
    if(this.speciesPrototypes.length === 0){
      const proto = dnaMat[0].slice();
      const sid = this.nextSpeciesID++;
      this.speciesPrototypes.push({proto:sliceArray(proto), id:sid, count:this.agents.length});
      for(let a of this.agents) a.species = sid;
      this.speciesCounts[sid] = this.agents.length;
      this.announceSpecies(sid, proto, "Primitive anaerobic bacteria");
      return;
    }
    
    for(let i=0;i<this.agents.length;i++){
      const r = normRows[i];
      let bestDist = 1e9, bestSid = null;
      for(let p of this.speciesPrototypes){
        const pnorm = p.proto.map((v,j)=> (v - colMeans[j])/colStds[j]);
        let d=0; for(let j=0;j<r.length;j++) d += Math.pow(r[j]-pnorm[j],2);
        d = Math.sqrt(d);
        if(d < bestDist){ bestDist=d; bestSid=p.id; }
      }
      if(bestDist < CONFIG.SPECIES_DIST_THRESH){
        this.agents[i].species = bestSid;
        this.speciesCounts[bestSid] = (this.speciesCounts[bestSid] || 0) + 1;
      } else {
        const proto = Array.from(dnaMat[i]);
        const sid = this.nextSpeciesID++;
        this.speciesPrototypes.push({proto:sliceArray(proto), id:sid, count:1});
        this.speciesCounts[sid] = 1;
        this.agents[i].species = sid;
        this.announceSpecies(sid, proto, `Evolutionary divergence (dist ${bestDist.toFixed(2)})`);
      }
    }
  }

  announceSpecies(sid, proto, notes){
    const msg = `[SPECIES] ${formatYear(this.currentYear)} - ${this.currentEpoch.name} - id=${sid}: ${notes}`;
    console.log(msg);
    this.events.push({
      type:'species', 
      step:this.step, 
      year:this.currentYear,
      epoch:this.currentEpoch.name,
      id:sid, 
      proto:protoToJSON(proto), 
      notes:notes
    });
    
    // Add to announcements UI for major evolutionary transitions
    if (notes.includes("multicellular") || notes.includes("land") || notes.includes("flight") || 
        notes.includes("oxygen") || sid % 20 === 0) {
      this.addAnnouncement(`New species: ${notes}`);
    }
  }

  addAnnouncement(message) {
    const annDiv = document.getElementById('announcements');
    const div = document.createElement('div');
    div.className = 'announcement';
    div.innerHTML = `<strong>${formatYear(this.currentYear)}:</strong> ${message}`;
    annDiv.appendChild(div);
    
    // Keep only last 5 announcements
    while (annDiv.children.length > 5) {
      annDiv.removeChild(annDiv.firstChild);
    }
  }

  computeDiversity(){
    if(this.agents.length<2) return 0;
    const dnaMat = this.agents.map(a=>a.dna.slice(0,8));
    let sum=0,count=0;
    for(let i=0;i<dnaMat.length;i++){
      for(let j=i+1;j<dnaMat.length;j++){
        let d=0; for(let k=0;k<8;k++){ d+=Math.pow(dnaMat[i][k]-dnaMat[j][k],2); }
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
    
    // Calculate evolutionary progress
    const avgOxygenTolerance = pop>0 ? average(this.agents.map(a=>a.oxygen_tolerance)) : 0;
    const avgLandAdaptation = pop>0 ? average(this.agents.map(a=>a.motility_land)) : 0;
    
    this.metrics.push({
      step:this.step, 
      year:this.currentYear,
      epoch:this.currentEpoch.name,
      population:pop, 
      food:food, 
      avgSize:avgSize, 
      avgEnergy:avgEnergy, 
      diversity:div,
      oxygenTolerance: avgOxygenTolerance,
      landAdaptation: avgLandAdaptation,
      extinctionEvent: this.extinctionEvent ? this.extinctionEvent.name : 'None',
      iceAge: this.iceAge ? this.iceAge.name : 'None'
    });
  }
}

// [Rest of the code remains the same as previous implementation for UI, rendering, etc.]
// Note: I've kept the same UI structure but you'll need to ensure the year display is updated

/* ----------------- SMALL HELPERS ----------------- */
function average(arr){ return arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0; }
function sliceArray(a){ return Array.from(a); }
function protoToJSON(proto){ return proto.map(v=>Number(v.toFixed(4))); }

// [The rest of your existing UI, rendering, and control code goes here...]
// Make sure to update the draw function to show current epoch and environmental conditions

// In your draw function, add:
function draw(){
  // ... existing draw code ...
  
  // Draw environmental info
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(10, canvas.height - 80, 300, 70);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText(`Epoch: ${sim.currentEpoch.name}`, 20, canvas.height - 60);
  ctx.fillText(`Environment: ${sim.currentEpoch.environment}`, 20, canvas.height - 45);
  ctx.fillText(`Oxygen: ${(sim.oxygenLevel * 100).toFixed(1)}%`, 20, canvas.height - 30);
  
  if (sim.extinctionEvent) {
    ctx.fillStyle = 'rgba(255,50,50,0.8)';
    ctx.fillRect(canvas.width - 250, 10, 240, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`EXTINCTION EVENT!`, canvas.width - 240, 30);
    ctx.font = '12px Arial';
    ctx.fillText(sim.extinctionEvent.name, canvas.width - 240, 45);
  }
  
  if (sim.iceAge) {
    ctx.fillStyle = 'rgba(200,230,255,0.8)';
    ctx.fillRect(canvas.width - 250, 60, 240, 30);
    ctx.fillStyle = '#0066cc';
    ctx.font = '12px Arial';
    ctx.fillText(`Ice Age: ${sim.iceAge.name}`, canvas.width - 240, 80);
  }
}

// Update your updateStatsUI function to show evolutionary progress:
function updateStatsUI(){
  document.getElementById('step').innerText = sim.step;
  document.getElementById('pop').innerText = sim.agents.length;
  document.getElementById('food').innerText = sim.foods.length;
  document.getElementById('speciesCount').innerText = sim.speciesPrototypes.length;
  document.getElementById('avgSize').innerText = (sim.agents.length? average(sim.agents.map(a=>a.size)).toFixed(2): '0.00');
  document.getElementById('diversity').innerText = (sim.computeDiversity().toFixed(3));
  
  const epochBadge = document.getElementById('epochBadge');
  epochBadge.innerHTML = `Epoch: <span id="epochName">${sim.epoch}</span><br>
                         Year: <span id="yearDisplay">${formatYear(sim.currentYear)}</span><br>
                         Oxygen: <span>${(sim.oxygenLevel * 100).toFixed(1)}%</span>`;
}

// [Rest of your existing code...]
