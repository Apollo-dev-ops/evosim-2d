// main.js - Enhanced Evolution Simulator with Extinction Events & Complex Organisms
// MOBILE COMPATIBILITY FIXES
console.log("Mobile GitHub Pages detected - applying fixes...");

// Fix 1: Wait for full page load
window.addEventListener('load', function() {
    console.log("Page fully loaded on mobile");
    setTimeout(initMobileSim, 100); // Small delay for mobile
});

// Fix 2: Mobile-specific initialization
function initMobileSim() {
    console.log("Initializing mobile simulation...");
    
    // Reduce complexity for mobile
    CONFIG.INITIAL_FOOD = 100;
    CONFIG.INITIAL_POP = 15;
    CONFIG.MAX_SPEED = 3.0;
    
    // Get canvas and ensure it's ready
    const canvas = document.getElementById('worldCanvas');
    if (!canvas) {
        console.error("Canvas not found on mobile!");
        return;
    }
    
    // Set smaller canvas size for mobile
    canvas.width = 800;
    canvas.height = 600;
    
    console.log("Mobile canvas size:", canvas.width, "x", canvas.height);
    
    // Initialize
    initUI();
    restartSim();
    
    // Start animation
    ANIM.running = true;
    ANIM.lastStepTime = performance.now();
    stepLoop();
    
    console.log("Mobile simulation started!");
}

// Fix 3: Replace all click events with touch events
function initUI() {
    console.log("Setting up mobile UI...");
    
    // Your existing UI code, but replace:
    // btnRestart.addEventListener('click', ...) 
    // WITH:
    btnRestart.addEventListener('touchstart', (e) => {
        e.preventDefault();
        restartSim();
    });
    
    btnPause.addEventListener('touchstart', (e) => {
        e.preventDefault();
        ANIM.running = !ANIM.running;
        btnPause.innerText = ANIM.running ? 'Pause' : 'Resume';
    });
    
    // Add touch events for all buttons...
}

// Fix 4: Add mobile viewport meta tag (add this to your HTML head)
// <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

// Fix 5: Add error reporting
window.addEventListener('error', function(e) {
    console.error('Mobile Error:', e.error);
});

// Your existing code continues below...
/* ----------------- ENHANCED CONFIG ----------------- */
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
  
  // Enhanced DNA complexity
  BASE_DNA_LENGTH: 10,
  COMPLEX_DNA_LENGTH: 20,
  
  // Extinction event triggers
  EXTINCTION_EVENTS: [
    { step: 2000, name: "Ordovician-Silurian", type: "ice_age", duration: 800, severity: 0.7 },
    { step: 4000, name: "Late Devonian", type: "anoxia", duration: 600, severity: 0.6 },
    { step: 6000, name: "Permian-Triassic", type: "volcanic", duration: 1000, severity: 0.9 },
    { step: 8000, name: "Triassic-Jurassic", type: "climate", duration: 500, severity: 0.5 },
    { step: 10000, name: "Cretaceous-Paleogene", type: "asteroid", duration: 300, severity: 0.8 }
  ]
};

/* ----------------- UTIL ----------------- */
function clamp(x,a=-2.5,b=2.5){return Math.max(a, Math.min(b, x));}
function nowIso(){ return (new Date()).toISOString(); }
function lerp(a, b, t) { return a + (b - a) * t; }

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

/* ----------------- ENHANCED ORGANISM CLASS ----------------- */
let nextAgentId = 1;
let nextSpeciesId = 1;

class Agent {
  constructor(x, y, dna = null, energy = 80, parent = null, dnaLength = CONFIG.BASE_DNA_LENGTH) {
    this.id = nextAgentId++;
    this.x = x; this.y = y;
    this.energy = energy;
    this.age = 0;
    this.maxAge = 100 + Math.random() * 200; // Natural lifespan
    this.alive = true;
    this.parent = parent;
    
    // Enhanced DNA system (grows more complex over time)
    this.dnaLength = dnaLength;
    if (!dna) {
      this.dna = new Float32Array(this.dnaLength);
      for (let i = 0; i < this.dnaLength; i++) {
        this.dna[i] = (Math.random() * 2 - 1) * 0.5;
      }
    } else {
      // If existing DNA is shorter, expand it
      if (dna.length < this.dnaLength) {
        const newDNA = new Float32Array(this.dnaLength);
        newDNA.set(dna);
        // Fill new genes with random values
        for (let i = dna.length; i < this.dnaLength; i++) {
          newDNA[i] = (Math.random() * 2 - 1) * 0.5;
        }
        this.dna = newDNA;
      } else {
        this.dna = new Float32Array(dna);
      }
    }
    
    this.species = null;
    this.offspringCount = 0;
    this.updateTraits();
    
    // Life characteristics
    this.growthStage = 0; // 0: juvenile, 1: adult
    this.waste = 0;
    this.oxygenNeed = 0.5;
    this.respirationRate = 0.01;
    this.irritability = 0.5; // Response to stimuli
    this.homeostasis = 0.5; // Internal regulation
  }

  updateTraits() {
    // Basic traits (genes 0-9)
    this.hue = (this.dna[0] * 0.5 + 0.5);
    this.size = Math.max(0.25, 0.4 + this.dna[1] * 0.3);
    this.metabolism = Math.max(0.01, 0.03 + this.dna[2] * 0.02);
    
    // Motilities
    this.motility_swim = 0.5 + this.dna[3] * 0.5;
    this.motility_land = 0.2 + this.dna[6] * 0.4;
    this.motility_fly = 0.1 + this.dna[7] * 0.4;
    
    // Normalize
    let s = Math.abs(this.motility_swim) + Math.abs(this.motility_land) + Math.abs(this.motility_fly);
    if (s <= 0) s = 1;
    this.motility_swim /= s; this.motility_land /= s; this.motility_fly /= s;
    
    this.sensor = Math.max(1.0, 3.0 + this.dna[4] * 3.0);
    this.adhesion = (this.dna[5] * 0.5 + 0.5);
    
    // Enhanced traits (genes 10-19)
    if (this.dnaLength > 10) {
      this.coldTolerance = 0.5 + this.dna[10] * 0.5;    // Gene 10
      this.heatTolerance = 0.5 + this.dna[11] * 0.5;    // Gene 11
      this.toxinResistance = 0.5 + this.dna[12] * 0.5;  // Gene 12
      this.oxygenEfficiency = 0.5 + this.dna[13] * 0.5; // Gene 13
      this.irritability = 0.5 + this.dna[14] * 0.5;     // Gene 14
      this.homeostasis = 0.5 + this.dna[15] * 0.5;      // Gene 15
      this.socialBehavior = 0.5 + this.dna[16] * 0.5;   // Gene 16
      this.camouflage = 0.5 + this.dna[17] * 0.5;       // Gene 17
      this.cooperation = 0.5 + this.dna[18] * 0.5;      // Gene 18
      this.aggression = 0.5 + this.dna[19] * 0.5;       // Gene 19
    } else {
      // Default values for basic organisms
      this.coldTolerance = 0.3;
      this.heatTolerance = 0.3;
      this.toxinResistance = 0.3;
      this.oxygenEfficiency = 0.5;
      this.irritability = 0.5;
      this.homeostasis = 0.5;
      this.socialBehavior = 0.2;
      this.camouflage = 0.2;
      this.cooperation = 0.2;
      this.aggression = 0.2;
    }
    
    // Growth stage based on age
    this.growthStage = this.age > this.maxAge * 0.3 ? 1 : 0;
  }

  region() {
    if (this.y < CONFIG.OCEAN_H) return 'ocean';
    if (this.y < CONFIG.LAND_H) return 'land';
    return 'air';
  }

  step(foodList, environment) {
    if (!this.alive) return;
    
    this.age++;
    this.updateTraits();
    
    // Aging and natural death
    if (this.age > this.maxAge) {
      const ageDeathChance = (this.age - this.maxAge) / 100;
      if (Math.random() < ageDeathChance) {
        this.alive = false;
        return;
      }
    }

    // Environmental stress based on current event
    let environmentalStress = 0;
    if (environment.currentEvent) {
      environmentalStress = this.calculateEnvironmentalStress(environment);
      this.energy -= environmentalStress * 0.1;
    }

    // Respiration cost
    const respirationCost = this.metabolism * this.respirationRate;
    this.energy -= respirationCost;

    // Waste production
    this.waste += this.metabolism * 0.01;
    if (this.waste > 1) {
      this.energy -= 0.05; // Toxicity from waste buildup
      this.waste *= 0.9; // Some waste removal
    }

    // Enhanced sensing with irritability
    let fx = 0, fy = 0, nearest = null, nd = 1e9;
    const effectiveSensor = this.sensor * (1 + this.irritability * 0.5);
    
    for (let i = 0; i < foodList.length; i++) {
      const f = foodList[i];
      const dx = f.x - this.x, dy = f.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < nd) { nd = d; nearest = { i, d }; }
      if (d <= effectiveSensor) {
        const attraction = 1 - (d / effectiveSensor);
        fx += (dx / Math.max(d, 1e-6)) * attraction;
        fy += (dy / Math.max(d, 1e-6)) * attraction;
      }
    }

    let target = [fx, fy];
    
    // Social behavior and cooperation
    if (this.socialBehavior > 0.6) {
      for (let other of sim.agents) {
        if (other.id !== this.id && other.alive) {
          const dx = other.x - this.x, dy = other.y - this.y;
          const d = Math.hypot(dx, dy);
          if (d < this.sensor * 2) {
            const socialAttraction = this.cooperation * (1 - d / (this.sensor * 2));
            target[0] += (dx / Math.max(d, 1e-6)) * socialAttraction * 0.3;
            target[1] += (dy / Math.max(d, 1e-6)) * socialAttraction * 0.3;
          }
        }
      }
    }

    // Random movement if no strong stimuli (but influenced by irritability)
    if (Math.hypot(target[0], target[1]) < 0.1 + this.irritability * 0.3) {
      const ang = Math.random() * Math.PI * 2;
      target = [Math.cos(ang) * 0.2, Math.sin(ang) * 0.2];
    }

    // Region adaptation with environmental awareness
    const region = this.region();
    const pref = [this.motility_swim, this.motility_land, this.motility_fly];
    const env_pref = region === 'ocean' ? [1, 0, 0] : region === 'land' ? [0.2, 1, 0] : [0, 0.2, 1];
    
    // Environmental avoidance based on irritability
    if (environment.currentEvent && this.irritability > 0.4) {
      this.avoidEnvironmentalHazards(environment, target);
    }
    
    const mismatch = 1 - (pref[0] * env_pref[0] + pref[1] * env_pref[1] + pref[2] * env_pref[2]);
    let speed = 0.8 * (1.0 / this.size) * (0.5 + Math.hypot(target[0], target[1]) * 0.2);
    speed *= (1 - 0.5 * mismatch);
    
    // Apply movement
    this.x += target[0] * 0.12 * speed + (Math.random() * 2 - 1) * 0.3;
    this.y += target[1] * 0.12 * speed + (Math.random() * 2 - 1) * 0.3;
    
    // Boundary checking
    if (this.x < 0) this.x = 0; if (this.x > CONFIG.WORLD_W) this.x = CONFIG.WORLD_W;
    if (this.y < 0) this.y = 0; if (this.y > CONFIG.WORLD_H) this.y = CONFIG.WORLD_H;

    // Movement cost with homeostasis efficiency
    const moveCost = CONFIG.MOVE_COST_BASE * speed * (1 + this.metabolism) * (2 - this.homeostasis);
    this.energy -= moveCost;

    // Eat if food is nearby
    if (nearest && nearest.d < (1.5 * this.size + 1.0)) {
      const f = foodList[nearest.i];
      this.energy += f.energy;
      foodList.splice(nearest.i, 1);
      this.waste += 0.1; // Eating produces waste
    }

    // Death conditions
    if (this.energy <= 0 || isNaN(this.energy)) {
      this.alive = false;
    }
  }

  calculateEnvironmentalStress(environment) {
    const event = environment.currentEvent;
    let stress = 0;
    
    switch (event.type) {
      case 'ice_age':
        stress = (1 - this.coldTolerance) * event.severity * event.progress;
        break;
      case 'volcanic':
        stress = (1 - this.heatTolerance) * event.severity * event.progress;
        stress += (1 - this.toxinResistance) * event.severity * 0.5;
        break;
      case 'anoxia':
        stress = (1 - this.oxygenEfficiency) * event.severity * event.progress;
        break;
      case 'asteroid':
        stress = event.severity * (0.3 + 0.7 * Math.random()) * event.progress;
        // All traits help somewhat with asteroid survival
        stress *= (1 - (this.coldTolerance + this.heatTolerance + this.toxinResistance) / 3);
        break;
      case 'climate':
        stress = event.severity * event.progress * 0.5;
        stress *= (1 - (this.homeostasis + this.oxygenEfficiency) / 2);
        break;
    }
    
    return Math.max(0, stress);
  }

  avoidEnvironmentalHazards(environment, target) {
    const event = environment.currentEvent;
    const hazardX = CONFIG.WORLD_W / 2; // Center hazards for simplicity
    
    switch (event.type) {
      case 'volcanic':
        // Avoid center where volcanic activity is strongest
        const dxVolcanic = this.x - hazardX;
        const avoidanceVolcanic = (1 / (Math.abs(dxVolcanic) + 10)) * event.progress;
        target[0] += Math.sign(dxVolcanic) * avoidanceVolcanic * 0.5;
        break;
        
      case 'asteroid':
        // Avoid impact zone
        const dxAsteroid = this.x - hazardX;
        const dyAsteroid = this.y - (CONFIG.WORLD_H * 0.3);
        const distAsteroid = Math.hypot(dxAsteroid, dyAsteroid);
        const avoidanceAsteroid = (1 / (distAsteroid + 5)) * event.progress;
        target[0] += (dxAsteroid / distAsteroid) * avoidanceAsteroid * 0.8;
        target[1] += (dyAsteroid / distAsteroid) * avoidanceAsteroid * 0.8;
        break;
    }
  }

  tryReproduce(sexual = false) {
    if (this.energy <= CONFIG.REPRO_ENERGY || this.age <= 3 || this.growthStage === 0) return null;

    if (!sexual) {
      const childDNA = new Float32Array(this.dna);
      for (let i = 0; i < childDNA.length; i++) {
        if (Math.random() < CONFIG.MUTATION_RATE) {
          childDNA[i] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STD;
          childDNA[i] = clamp(childDNA[i]);
        }
      }
      
      // Chance to increase DNA complexity
      let childDnaLength = this.dnaLength;
      if (Math.random() < 0.001 && childDnaLength < CONFIG.COMPLEX_DNA_LENGTH) {
        childDnaLength++;
      }
      
      const dx = (Math.random() * 2 - 1) * (0.8 + this.size * 0.6);
      const dy = (Math.random() * 2 - 1) * (0.8 + this.size * 0.6);
      const child = new Agent(
        Math.max(0, Math.min(CONFIG.WORLD_W, this.x + dx)),
        Math.max(0, Math.min(CONFIG.WORLD_H, this.y + dy)),
        childDNA, this.energy * 0.45, this.id, childDnaLength
      );
      this.energy *= 0.45;
      this.offspringCount++;
      return child;
    }
    return null;
  }
}

/* ----------------- ENHANCED SIMULATION MANAGER ----------------- */
class EvoSim {
  constructor() {
    this.agents = [];
    this.foods = [];
    this.step = 0;
    this.speciesPrototypes = [];
    this.speciesCounts = {};
    this.nextSpeciesID = 1;
    this.epoch = "Bacteria Epoch";
    this.events = [];
    this.metrics = [];
    this.lineage = {};
    
    // Enhanced environment system
    this.environment = {
      currentEvent: null,
      eventProgress: 0,
      temperature: 0.5, // 0=cold, 1=hot
      oxygenLevel: 1.0, // 0=anoxic, 1=normal
      toxicity: 0.0,    // 0=clean, 1=toxic
      iceCover: 0.0     // 0=no ice, 1=fully iced
    };
    
    this.dnaComplexityLevel = CONFIG.BASE_DNA_LENGTH;
  }

  seed(initialPop) {
    this.agents = []; this.foods = []; this.step = 0;
    nextAgentId = 1; nextSpeciesId = 1;
    
    // Enhanced environment reset
    this.environment = {
      currentEvent: null,
      eventProgress: 0,
      temperature: 0.5,
      oxygenLevel: 1.0,
      toxicity: 0.0,
      iceCover: 0.0
    };

    // Seed bacteria in ocean with basic DNA
    for (let i = 0; i < initialPop; i++) {
      const x = Math.random() * CONFIG.WORLD_W;
      const y = Math.random() * (CONFIG.OCEAN_H * 0.8);
      const dna = new Float32Array(CONFIG.BASE_DNA_LENGTH);
      // Initialize with ocean-adapted traits
      dna[0] = (Math.random() * 0.2 - 0.1);
      dna[1] = (Math.random() * 0.2 - 0.2);
      dna[2] = (Math.random() * 0.3 - 0.1);
      dna[3] = (0.4 + Math.random() * 0.4); // Strong swim bias
      dna[4] = (Math.random() * 0.6 - 0.2);
      dna[5] = (Math.random() * 0.4 - 0.6);
      dna[6] = (Math.random() * 0.4 - 0.2);
      dna[7] = (Math.random() * 0.4 - 0.2);
      dna[8] = 0; dna[9] = 0;
      
      const a = new Agent(x, y, dna, 80, null, CONFIG.BASE_DNA_LENGTH);
      this.agents.push(a);
      this.lineage[a.id] = { parent: a.parent || null };
    }

    // Enhanced food distribution - food everywhere from start
    this.distributeFood(CONFIG.INITIAL_FOOD);
    
    this.speciesPrototypes = []; this.speciesCounts = {};
    this.events = []; this.metrics = [];
  }

  distributeFood(amount) {
    for (let i = 0; i < amount; i++) {
      const region = Math.random();
      let x, y;
      
      if (region < 0.6) { // 60% ocean (richest early on)
        x = Math.random() * CONFIG.WORLD_W;
        y = Math.random() * (CONFIG.OCEAN_H * 0.95);
      } else if (region < 0.9) { // 30% land
        x = Math.random() * CONFIG.WORLD_W;
        y = CONFIG.OCEAN_H + Math.random() * (CONFIG.LAND_H - CONFIG.OCEAN_H) * 0.8;
      } else { // 10% air
        x = Math.random() * CONFIG.WORLD_W;
        y = CONFIG.LAND_H + Math.random() * (CONFIG.WORLD_H - CONFIG.LAND_H) * 0.5;
      }
      
      this.foods.push({
        x: x,
        y: y,
        energy: CONFIG.FOOD_ENERGY * (0.8 + Math.random() * 0.8)
      });
    }
  }

  stepSim(sexual = false) {
    this.step++;
    
    // Check for extinction events
    this.checkExtinctionEvents();
    
    // Update environment based on current event
    this.updateEnvironment();

    // Process agents
    const newAgents = [];
    for (let a of this.agents) {
      if (!a.alive) continue;
      a.step(this.foods, this.environment);
      
      if (sexual) {
        // Sexual reproduction handled in batch
      } else {
        const child = a.tryReproduce(false);
        if (child) {
          newAgents.push(child);
          this.lineage[child.id] = { parent: a.id };
        }
      }
    }

    // Sexual reproduction
    if (sexual) {
      const elig = this.agents.filter(a => a.alive && a.energy > CONFIG.REPRO_ENERGY && a.age > 3 && a.growthStage === 1);
      for (let i = elig.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [elig[i], elig[j]] = [elig[j], elig[i]];
      }
      for (let i = 0; i + 1 < elig.length; i += 2) {
        const p1 = elig[i], p2 = elig[i + 1];
        const childDNA = new Float32Array(Math.max(p1.dnaLength, p2.dnaLength));
        for (let g = 0; g < childDNA.length; g++) {
          childDNA[g] = Math.random() < 0.5 ? 
            (p1.dna[g] || 0) : (p2.dna[g] || 0);
          if (Math.random() < CONFIG.MUTATION_RATE) {
            childDNA[g] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STD;
            childDNA[g] = clamp(childDNA[g]);
          }
        }
        
        // Chance for DNA complexity increase
        let childDnaLength = Math.max(p1.dnaLength, p2.dnaLength);
        if (Math.random() < 0.002 && childDnaLength < CONFIG.COMPLEX_DNA_LENGTH) {
          childDnaLength++;
        }
        
        const dx = (Math.random() * 2 - 1) * 1.5;
        const dy = (Math.random() * 2 - 1) * 1.5;
        const child = new Agent(
          Math.max(0, Math.min(CONFIG.WORLD_W, p1.x + dx)),
          Math.max(0, Math.min(CONFIG.WORLD_H, p1.y + dy)),
          childDNA, (p1.energy + p2.energy) * 0.22, p1.id, childDnaLength
        );
        newAgents.push(child);
        this.lineage[child.id] = { parent1: p1.id, parent2: p2.id };
        p1.energy *= 0.55; p2.energy *= 0.55;
        p1.offspringCount++; p2.offspringCount++;
      }
    }

    // Add children
    for (let c of newAgents) { this.agents.push(c); }

    // Enhanced food management
    if (this.foods.length < CONFIG.INITIAL_FOOD * 0.3) {
      this.distributeFood(Math.min(100, Math.round(CONFIG.INITIAL_FOOD * 0.4)));
    }

    // Remove dead agents
    this.agents = this.agents.filter(a => a.alive);

    // Update DNA complexity level
    this.updateDNAComplexity();

    // Species detection
    this.updateSpecies();

    // Epoch progression
    this.updateEpoch();

    // Metrics
    this.logMetrics();
    
    // Population control
    if (this.agents.length > 700) {
      this.agents.sort((a, b) => a.energy - b.energy);
      while (this.agents.length > 400) {
        const rem = sim.agents.shift();
        if (rem) rem.alive = false;
      }
    }
  }

  checkExtinctionEvents() {
    for (let event of CONFIG.EXTINCTION_EVENTS) {
      if (this.step >= event.step && this.step <= event.step + event.duration && !this.environment.currentEvent) {
        this.triggerExtinctionEvent(event);
        break;
      }
    }
    
    // Update current event progress
    if (this.environment.currentEvent) {
      const event = this.environment.currentEvent;
      this.environment.eventProgress = (this.step - event.step) / event.duration;
      
      // End event if duration passed
      if (this.step > event.step + event.duration) {
        this.endExtinctionEvent();
      }
    }
  }

  triggerExtinctionEvent(eventConfig) {
    this.environment.currentEvent = {
      ...eventConfig,
      progress: 0
    };
    
    this.environment.eventProgress = 0;
    
    // Event-specific environmental setup
    switch (eventConfig.type) {
      case 'ice_age':
        this.environment.temperature = 0.1;
        break;
      case 'volcanic':
        this.environment.temperature = 0.9;
        this.environment.toxicity = 0.7;
        break;
      case 'anoxia':
        this.environment.oxygenLevel = 0.2;
        break;
      case 'asteroid':
        this.environment.toxicity = 0.8;
        this.environment.temperature = 0.7;
        break;
      case 'climate':
        this.environment.temperature = 0.8;
        this.environment.oxygenLevel = 0.6;
        break;
    }
    
    this.announceEvent(`EXTINCTION EVENT: ${eventConfig.name} started!`, 'critical');
  }

  endExtinctionEvent() {
    if (this.environment.currentEvent) {
      this.announceEvent(`Extinction event ended. ${Math.round(this.agents.length)} survivors.`, 'info');
    }
    
    // Gradually return to normal environment
    this.environment.currentEvent = null;
    this.environment.eventProgress = 0;
    this.environment.temperature = 0.5;
    this.environment.oxygenLevel = 1.0;
    this.environment.toxicity = 0.0;
    this.environment.iceCover = 0.0;
  }

  updateEnvironment() {
    if (!this.environment.currentEvent) return;
    
    const event = this.environment.currentEvent;
    const progress = this.environment.eventProgress;
    
    switch (event.type) {
      case 'ice_age':
        this.environment.iceCover = progress * event.severity;
        this.environment.temperature = 0.5 - progress * 0.4;
        break;
      case 'volcanic':
        this.environment.toxicity = progress * event.severity * 0.7;
        this.environment.temperature = 0.5 + progress * 0.4;
        break;
      case 'anoxia':
        this.environment.oxygenLevel = 1.0 - progress * 0.8 * event.severity;
        break;
      case 'asteroid':
        // Immediate impact then gradual recovery
        this.environment.toxicity = event.severity * (1 - progress * 0.5);
        this.environment.temperature = 0.5 + (event.severity * 0.3) * (1 - progress);
        break;
      case 'climate':
        this.environment.temperature = 0.5 + progress * 0.3 * event.severity;
        this.environment.oxygenLevel = 1.0 - progress * 0.2 * event.severity;
        break;
    }
  }

  updateDNAComplexity() {
    // Calculate average DNA length
    if (this.agents.length > 0) {
      const avgLength = this.agents.reduce((sum, a) => sum + a.dnaLength, 0) / this.agents.length;
      this.dnaComplexityLevel = Math.round(avgLength);
    }
    
    // Force DNA complexity increase at certain epochs
    if (this.epoch === "Multicellularity" && this.dnaComplexityLevel < 15) {
      this.dnaComplexityLevel = 15;
      // Update existing agents
      for (let agent of this.agents) {
        if (agent.dnaLength < 15) {
          agent.dnaLength = 15;
          const newDNA = new Float32Array(15);
          newDNA.set(agent.dna);
          for (let i = agent.dna.length; i < 15; i++) {
            newDNA[i] = (Math.random() * 2 - 1) * 0.5;
          }
          agent.dna = newDNA;
          agent.updateTraits();
        }
      }
    } else if (this.epoch === "Land Colonization" && this.dnaComplexityLevel < 20) {
      this.dnaComplexityLevel = 20;
      for (let agent of this.agents) {
        if (agent.dnaLength < 20) {
          agent.dnaLength = 20;
          const newDNA = new Float32Array(20);
          newDNA.set(agent.dna);
          for (let i = agent.dna.length; i < 20; i++) {
            newDNA[i] = (Math.random() * 2 - 1) * 0.5;
          }
          agent.dna = newDNA;
          agent.updateTraits();
        }
      }
    }
  }

  spawnFood(n) {
    this.distributeFood(n);
  }

  updateSpecies() {
    if (this.agents.length === 0) return;
    
    // Use first 8 genes for species classification (more stable with complex DNA)
    const dnaMat = this.agents.map(a => a.dna.slice(0, 8));
    const colMeans = [], colStds = [];
    
    for (let col = 0; col < 8; col++) {
      const vals = dnaMat.map(r => r[col]);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const std = Math.sqrt(vals.map(v => Math.pow(v - mean, 2)).reduce((s, v) => s + v, 0) / vals.length) + 1e-6;
      colMeans.push(mean); colStds.push(std);
    }
    
    const normRows = dnaMat.map(r => r.map((v, i) => (v - colMeans[i]) / colStds[i]));
    
    if (this.speciesPrototypes.length === 0) {
      const proto = dnaMat[0].slice();
      const sid = this.nextSpeciesID++;
      this.speciesPrototypes.push({ proto: sliceArray(proto), id: sid, count: this.agents.length });
      for (let a of this.agents) a.species = sid;
      this.speciesCounts[sid] = this.agents.length;
      this.announceSpecies(sid, proto, "Founding species: bacteria");
      return;
    }
    
    for (let i = 0; i < this.agents.length; i++) {
      const r = normRows[i];
      let bestDist = 1e9, bestSid = null;
      
      for (let p of this.speciesPrototypes) {
        const pnorm = p.proto.map((v, j) => (v - colMeans[j]) / colStds[j]);
        let d = 0;
        for (let j = 0; j < r.length; j++) d += Math.pow(r[j] - pnorm[j], 2);
        d = Math.sqrt(d);
        if (d < bestDist) { bestDist = d; bestSid = p.id; }
      }
      
      if (bestDist < CONFIG.SPECIES_DIST_THRESH) {
        this.agents[i].species = bestSid;
        this.speciesCounts[bestSid] = (this.speciesCounts[bestSid] || 0) + 1;
      } else {
        const proto = Array.from(dnaMat[i]);
        const sid = this.nextSpeciesID++;
        this.speciesPrototypes.push({ proto: sliceArray(proto), id: sid, count: 1 });
        this.speciesCounts[sid] = 1;
        this.agents[i].species = sid;
        this.announceSpecies(sid, proto, `New species (dist ${bestDist.toFixed(2)})`);
      }
    }
  }

  announceSpecies(sid, proto, notes) {
    const msg = `[SPECIES] step=${this.step} id=${sid} notes='${notes}' proto=${protoToJSON(proto)}`;
    console.log(msg);
    this.events.push({ type: 'species', step: this.step, id: sid, proto: protoToJSON(proto), notes: notes });
  }

  announceEvent(message, type = 'info') {
    const msg = `[EVENT] step=${this.step} ${message}`;
    console.log(msg);
    this.events.push({ type: 'event', step: this.step, message: message, eventType: type });
    
    // Add to announcements UI
    const annDiv = document.getElementById('announcements');
    const eventEl = document.createElement('div');
    eventEl.className = `announcement ${type}`;
    eventEl.textContent = `Step ${this.step}: ${message}`;
    annDiv.appendChild(eventEl);
    
    // Keep only last 5 announcements
    while (annDiv.children.length > 5) {
      annDiv.removeChild(annDiv.firstChild);
    }
  }

  updateEpoch() {
    if (this.agents.length < 6) return;
    
    const adhesions = this.agents.map(a => a.adhesion);
    const landBias = this.agents.map(a => a.motility_land);
    const flyBias = this.agents.map(a => a.motility_fly);
    const frac_adh = adhesions.filter(v => v > CONFIG.MULTICELLULARITY_ADHESION).length / adhesions.length;
    const frac_land = landBias.filter(v => v > CONFIG.LAND_MOTILITY).length / landBias.length;
    const frac_fly = flyBias.filter(v => v > CONFIG.FLIGHT_MOTILITY).length / flyBias.length;

    if (this.epoch === 'Bacteria Epoch' && frac_adh > 0.07 && average(this.agents.map(a => a.size)) > 0.45) {
      this.epoch = "Multicellularity";
      this.events.push({ type: 'epoch', step: this.step, epoch: this.epoch });
      this.announceEpoch(this.epoch, `adhesion_frac=${frac_adh.toFixed(3)}`);
    } else if (this.epoch === 'Multicellularity' && frac_land > 0.08) {
      this.epoch = "Land Colonization";
      this.events.push({ type: 'epoch', step: this.step, epoch: this.epoch });
      this.announceEpoch(this.epoch, `land_frac=${frac_land.toFixed(3)}`);
    } else if (this.epoch === 'Land Colonization' && frac_fly > 0.06) {
      this.epoch = "Flight Emergence";
      this.events.push({ type: 'epoch', step: this.step, epoch: this.epoch });
      this.announceEpoch(this.epoch, `fly_frac=${frac_fly.toFixed(3)}`);
    }
  }

  announceEpoch(name, notes) {
    const msg = `[EPOCH] step=${this.step} epoch=${name} notes=${notes}`;
    console.log(msg);
    this.events.push({ type: 'epoch', step: this.step, epoch: name, notes: notes });
    this.announceEvent(`New Epoch: ${name}`, 'epoch');
  }

  computeDiversity() {
    if (this.agents.length < 2) return 0;
    const dnaMat = this.agents.map(a => a.dna.slice(0, 8));
    let sum = 0, count = 0;
    for (let i = 0; i < dnaMat.length; i++) {
      for (let j = i + 1; j < dnaMat.length; j++) {
        let d = 0;
        for (let k = 0; k < 8; k++) { d += Math.pow(dnaMat[i][k] - dnaMat[j][k], 2); }
        sum += Math.sqrt(d);
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  logMetrics() {
    const pop = this.agents.length;
    const food = this.foods.length;
    const avgSize = pop > 0 ? average(this.agents.map(a => a.size)) : 0;
    const avgEnergy = pop > 0 ? average(this.agents.map(a => a.energy)) : 0;
    const div = this.computeDiversity();
    const eventProgress = this.environment.currentEvent ? Math.round(this.environment.eventProgress * 100) : 0;
    
    this.metrics.push({
      step: this.step,
      population: pop,
      food: food,
      avgSize: avgSize,
      avgEnergy: avgEnergy,
      diversity: div,
      epoch: this.epoch,
      dnaComplexity: this.dnaComplexityLevel,
      eventProgress: eventProgress,
      environment: { ...this.environment }
    });
  }
}

/* ----------------- SMALL HELPERS ----------------- */
function average(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function sliceArray(a) { return Array.from(a); }
function protoToJSON(proto) { return proto.map(v => Number(v.toFixed(4))); }

/* ----------------- RENDERING & UI ----------------- */
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const epochEl = document.getElementById('epochName');
const environmentEl = document.getElementById('environmentName');
const annDiv = document.getElementById('announcements');

// Control elements
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
const btnTriggerEvent = document.getElementById('btnTriggerEvent');

// Time control elements
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const btnSlow = document.getElementById('btnSlow');
const btnNormal = document.getElementById('btnNormal');
const btnFast = document.getElementById('btnFast');

// Stats elements
const stats = {
  step: document.getElementById('step'),
  pop: document.getElementById('pop'),
  food: document.getElementById('food'),
  speciesCount: document.getElementById('speciesCount'),
  dnaComplexity: document.getElementById('dnaComplexity'),
  diversity: document.getElementById('diversity'),
  eventProgress: document.getElementById('eventProgress')
};

// Chart
const chartCtx = document.getElementById('miniChart').getContext('2d');
const chart = new Chart(chartCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Population', data: [], borderColor: '#66b3ff', fill: false, tension: 0.2 },
      { label: 'Food', data: [], borderColor: '#ffd166', fill: false, tension: 0.2 },
      { label: 'Diversity', data: [], borderColor: '#d99cff', fill: false, tension: 0.2, yAxisID: 'y1' }
    ]
  },
  options: {
    animation: false,
    scales: {
      y: { beginAtZero: true },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
    },
    plugins: { legend: { display: true } }
  }
});

let sim = new EvoSim();
let ANIM = {
  running: true,
  frame: null,
  speed: CONFIG.DEFAULT_SPEED,
  lastStepTime: performance.now()
};

function initUI() {
  mrEl.value = CONFIG.MUTATION_RATE; mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2);
  initPopEl.value = CONFIG.INITIAL_POP; initVal.innerText = CONFIG.INITIAL_POP;
  reproEl.value = CONFIG.REPRO_ENERGY; reproVal.innerText = CONFIG.REPRO_ENERGY;

  // Initialize time control
  speedSlider.value = CONFIG.DEFAULT_SPEED;
  speedValue.innerText = CONFIG.DEFAULT_SPEED.toFixed(1) + 'x';
  ANIM.speed = CONFIG.DEFAULT_SPEED;

  mrEl.addEventListener('input', () => {
    CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
    mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2);
  });
  initPopEl.addEventListener('input', () => { initVal.innerText = initPopEl.value; });
  reproEl.addEventListener('input', () => {
    CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
    reproVal.innerText = reproEl.value;
  });

  // Time control event listeners
  speedSlider.addEventListener('input', updateSpeed);
  btnSlow.addEventListener('click', () => setSpeed(0.5));
  btnNormal.addEventListener('click', () => setSpeed(1.0));
  btnFast.addEventListener('click', () => setSpeed(3.0));

  // Event triggers
  btnTriggerEvent.addEventListener('click', () => {
    // Trigger a test extinction event
    const testEvent = CONFIG.EXTINCTION_EVENTS[Math.floor(Math.random() * CONFIG.EXTINCTION_EVENTS.length)];
    sim.triggerExtinctionEvent({ ...testEvent, step: sim.step });
  });

  // Event list click handlers
  document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', () => {
      const eventType = item.getAttribute('data-event');
      const eventMap = {
        ordovician: CONFIG.EXTINCTION_EVENTS[0],
        devonian: CONFIG.EXTINCTION_EVENTS[1],
        permian: CONFIG.EXTINCTION_EVENTS[2],
        triassic: CONFIG.EXTINCTION_EVENTS[3],
        cretaceous: CONFIG.EXTINCTION_EVENTS[4]
      };
      if (eventMap[eventType]) {
        sim.triggerExtinctionEvent({ ...eventMap[eventType], step: sim.step });
      }
    });
  });

  btnRestart.addEventListener('click', () => { restartSim(); });
  btnPause.addEventListener('click', () => {
    ANIM.running = !ANIM.running;
    btnPause.innerText = ANIM.running ? 'Pause' : 'Resume';
  });
  btnSpawnFood.addEventListener('click', () => { sim.spawnFood(50); });

  // exports
  document.getElementById('btnExportMetrics').addEventListener('click', () => { exportMetricsCSV(); });
  document.getElementById('btnExportSpecies').addEventListener('click', () => { exportSpeciesCSV(); });
  document.getElementById('btnExportLineage').addEventListener('click', () => { exportLineageJSON(); });
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

function restartSim() {
  CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
  CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
  CONFIG.INITIAL_POP = parseInt(initPopEl.value);
  sim = new EvoSim();
  sim.seed(CONFIG.INITIAL_POP);
  updateStatsUI();
  annDiv.innerHTML = '';
  epochEl.innerText = sim.epoch;
  environmentEl.innerText = 'Normal';
}

/* ----------------- EXPORTS ----------------- */
function exportMetricsCSV() {
  const rows = [['step', 'population', 'food', 'avgSize', 'avgEnergy', 'diversity', 'epoch', 'dnaComplexity', 'eventProgress']];
  for (let r of sim.metrics) rows.push([r.step, r.population, r.food, r.avgSize.toFixed(4), r.avgEnergy.toFixed(4), r.diversity.toFixed(6), r.epoch, r.dnaComplexity, r.eventProgress]);
  downloadText('evo_metrics.csv', arrayToCSV(rows));
}

function exportSpeciesCSV() {
  const rows = [['time', 'type', 'id', 'prototype', 'notes']];
  for (let e of sim.events) {
    if (e.type === 'species') rows.push([e.step, e.type, e.id, JSON.stringify(e.proto), e.notes]);
    else if (e.type === 'epoch') rows.push([e.step, e.type, '', e.epoch, e.notes || '']);
    else if (e.type === 'event') rows.push([e.step, e.type, '', e.eventType, e.message]);
  }
  downloadText('evo_species_events.csv', arrayToCSV(rows));
}

function exportLineageJSON() {
  const out = {
    lineage: sim.lineage,
    events: sim.events,
    metricsSummary: {
      lastStep: sim.step,
      population: sim.agents.length,
      dnaComplexity: sim.dnaComplexityLevel
    }
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'evo_lineage.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ----------------- ENHANCED RENDERING ----------------- */
function drawBackground() {
  // Base environment
  ctx.fillStyle = '#1f4f8b';
  ctx.fillRect(0, 0, canvas.width, Math.round(canvas.height * (CONFIG.OCEAN_H / CONFIG.WORLD_H)));
  
  const landTop = Math.round(canvas.height * (CONFIG.OCEAN_H / CONFIG.WORLD_H));
  const landBottom = Math.round(canvas.height * (CONFIG.LAND_H / CONFIG.WORLD_H));
  ctx.fillStyle = '#7db36f';
  ctx.fillRect(0, landTop, canvas.width, landBottom - landTop);
  
  ctx.fillStyle = '#d6e9ff';
  ctx.fillRect(0, landBottom, canvas.width, canvas.height - landBottom);
}

function drawEnvironmentOverlay() {
  if (!sim.environment.currentEvent) return;
  
  const event = sim.environment.currentEvent;
  const progress = sim.environment.eventProgress;
  
  ctx.save();
  ctx.globalAlpha = progress * 0.7;
  
  switch (event.type) {
    case 'ice_age':
      ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + progress * 0.4})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'volcanic':
      ctx.fillStyle = `rgba(255, 50, 0, ${0.2 + progress * 0.5})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'anoxia':
      ctx.fillStyle = `rgba(0, 50, 100, ${0.3 + progress * 0.4})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'asteroid':
      // Impact effect with radial gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.3,
        0,
        canvas.width / 2, canvas.height * 0.3,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, `rgba(255, 100, 0, ${0.8})`);
      gradient.addColorStop(1, `rgba(100, 0, 0, ${0.3})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'climate':
      ctx.fillStyle = `rgba(255, 150, 0, ${0.2 + progress * 0.3})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
  }
  
  ctx.restore();
}

function wx(x) { return (x / CONFIG.WORLD_W) * canvas.width; }
function wy(y) { return canvas.height - (y / CONFIG.WORLD_H) * canvas.height; }

function draw() {
  drawBackground();
  drawEnvironmentOverlay();
  
  // Draw food
  for (let f of sim.foods) {
    const px = wx(f.x), py = wy(f.y);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }
  
  // Draw agents with enhanced visualization
  for (let a of sim.agents) {
    const px = wx(a.x), py = wy(a.y);
    const hue = ((a.species && a.species > 0) ? ((a.species * 137.5) % 360) / 360 : a.hue);
    
    ctx.beginPath();
    const baseSize = a.size * 8;
    const ageFactor = a.growthStage === 1 ? 1 : 0.6; // Juveniles are smaller
    const r = Math.max(2, baseSize * ageFactor + Math.min(12, a.energy / 20));
    
    // Color based on traits and environment
    let saturation = 70;
    let lightness = 50;
    
    if (sim.environment.currentEvent) {
      // Visual stress indicators
      const stress = a.calculateEnvironmentalStress(sim.environment);
      if (stress > 0.3) {
        lightness = 70 - stress * 40; // Pale when stressed
      }
    }
    
    ctx.fillStyle = `hsl(${Math.floor(hue * 360)}, ${saturation}%, ${lightness}%)`;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.5;
    ctx.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Energy glow ring
    const e = Math.max(0, Math.min(1, a.energy / 220));
    if (e > 0.15) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 + 0.12 * e})`;
      ctx.lineWidth = 1;
      ctx.ellipse(px, py, r + 4, r + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // DNA complexity indicator (small dot)
    if (a.dnaLength > CONFIG.BASE_DNA_LENGTH) {
      ctx.fillStyle = a.dnaLength >= CONFIG.COMPLEX_DNA_LENGTH ? '#4ade80' : '#fbbf24';
      ctx.fillRect(px - 1, py - r - 4, 2, 2);
    }
  }
}

/* ----------------- MAIN LOOP ----------------- */
function stepLoop() {
  const now = performance.now();
  const deltaTime = now - ANIM.lastStepTime;
  const targetStepInterval = 1000 / (60 * ANIM.speed);
  const stepsToRun = Math.floor(deltaTime / targetStepInterval);
  
  if (ANIM.running && stepsToRun > 0) {
    for (let i = 0; i < stepsToRun; i++) {
      sim.stepSim(sexualToggle.checked);
    }
    ANIM.lastStepTime = now;
    
    updateStatsUI();
    updateChart();
    draw();
  }
  
  ANIM.frame = requestAnimationFrame(stepLoop);
}

function updateStatsUI() {
  stats.step.innerText = sim.step;
  stats.pop.innerText = sim.agents.length;
  stats.food.innerText = sim.foods.length;
  stats.speciesCount.innerText = sim.speciesPrototypes.length;
  stats.dnaComplexity.innerText = sim.dnaComplexityLevel;
  stats.diversity.innerText = sim.computeDiversity().toFixed(3);
  stats.eventProgress.innerText = sim.environment.currentEvent ? 
    Math.round(sim.environment.eventProgress * 100) + '%' : '0%';
  
  epochEl.innerText = sim.epoch;
  
  // Update environment display
  if (sim.environment.currentEvent) {
    environmentEl.innerText = sim.environment.currentEvent.name;
    environmentEl.parentElement.style.background = 'rgba(200,0,0,0.7)';
  } else {
    environmentEl.innerText = 'Normal';
    environmentEl.parentElement.style.background = 'rgba(0,0,0,0.6)';
  }
}

function updateChart() {
  const L = sim.metrics.length;
  if (L > 200) {
    sim.metrics.shift();
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.data.labels.push(sim.step);
  chart.data.datasets[0].data.push(sim.agents.length);
  chart.data.datasets[1].data.push(sim.foods.length);
  chart.data.datasets[2].data.push(sim.metrics.length ? sim.metrics[sim.metrics.length - 1].diversity : 0);
  chart.update('none');
}

/* ----------------- BOOT ----------------- */
/* ----------------- BOOT & INITIALIZATION ----------------- */
function boot() {
  console.log("Booting EvoVerse...");
  
  // Ensure canvas exists and is properly sized
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  
  canvas.width = 960;
  canvas.height = 720;
  console.log("Canvas size:", canvas.width, "x", canvas.height);
  
  // Initialize UI first
  initUI();
  console.log("UI initialized");
  
  // Then restart simulation
  restartSim();
  console.log("Simulation restarted");
  
  // Start animation loop
  ANIM.running = true;
  ANIM.lastStepTime = performance.now();
  console.log("Starting animation loop...");
  
  // Draw initial frame immediately
  draw();
  
  // Start the main loop
  stepLoop();
}

// Fix the duplicate restartSim function issue
function restartSim() {
  console.log("Restarting simulation...");
  CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
  CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
  CONFIG.INITIAL_POP = parseInt(initPopEl.value);
  
  sim = new EvoSim();
  sim.seed(CONFIG.INITIAL_POP);
  
  // Clear and reset chart
  chart.data.labels = [];
  chart.data.datasets.forEach(ds => ds.data = []);
  
  // Log initial metrics
  sim.logMetrics();
  updateStatsUI();
  
  // Clear announcements
  annDiv.innerHTML = '';
  epochEl.innerText = sim.epoch;
  environmentEl.innerText = 'Normal';
  
  console.log("Initial population:", sim.agents.length);
  console.log("Initial food:", sim.foods.length);
  
  // Force initial draw
  draw();
}

// Start the simulation when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded, starting simulation...");
  boot();
});

// Fallback: if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
                        }
