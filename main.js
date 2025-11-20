// main.js - Optimized Earth Evolution Simulator
// Performance-optimized for high speeds and large populations

/* ----------------- PERFORMANCE CONFIG ----------------- */
const CONFIG = {
  // World settings
  WORLD_W: 160,
  WORLD_H: 120,
  OCEAN_H: 40,
  LAND_H: 80,
  
  // Population controls
  INITIAL_FOOD: 200,
  INITIAL_POP: 20,
  MAX_AGENTS: 800,
  MAX_FOOD: 400,
  FOOD_ENERGY: 35,
  
  // Evolution settings
  MOVE_COST_BASE: 0.02,
  REPRO_ENERGY: 120,
  MUTATION_RATE: 0.12,
  MUTATION_STD: 0.12,
  SPECIES_DIST_THRESH: 0.95,
  MIN_SPECIES_SIZE: 3,
  
  // Adaptation thresholds
  MULTICELLULARITY_ADHESION: 0.6,
  LAND_MOTILITY: 0.6,
  FLIGHT_MOTILITY: 0.6,
  
  // Performance settings
  MAX_STEPS_PER_FRAME: 15,
  MIN_SPEED: 0.1,
  MAX_SPEED: 10.0,
  DEFAULT_SPEED: 1.0,
  
  // Temporal settings
  START_YEAR: -3800000000, // 3.8 billion years ago
  YEARS_PER_STEP: 1000000, // 1 million years per step
  
  // Environmental events
  EXTINCTION_EVENTS: [
    { year: -445000000, name: "Ordovician-Silurian", severity: 0.85 },
    { year: -372000000, name: "Late Devonian", severity: 0.75 },
    { year: -252000000, name: "Permian-Triassic", severity: 0.95 },
    { year: -201000000, name: "Triassic-Jurassic", severity: 0.80 },
    { year: -66000000, name: "Cretaceous-Paleogene", severity: 0.75 }
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

/* ----------------- PERFORMANCE UTILITIES ----------------- */
class PerformanceOptimizer {
  constructor() {
    this.lastCleanup = 0;
    this.cleanupInterval = 300; // steps between cleanups
  }
  
  // Efficient random sampling for large arrays
  sampleArray(array, count) {
    if (array.length <= count) return array.slice();
    const result = [];
    const taken = new Set();
    while (result.length < count) {
      const index = Math.floor(Math.random() * array.length);
      if (!taken.has(index)) {
        taken.add(index);
        result.push(array[index]);
      }
    }
    return result;
  }
  
  // Batch process arrays to prevent blocking
  batchProcess(array, batchSize, processor) {
    const results = [];
    for (let i = 0; i < array.length; i += batchSize) {
      if (i > 0 && i % (batchSize * 10) === 0) {
        // Yield to main thread periodically
        return new Promise(resolve => {
          setTimeout(() => {
            const remaining = this.batchProcess(array.slice(i), batchSize, processor);
            resolve(results.concat(remaining));
          }, 0);
        });
      }
      const batch = array.slice(i, i + batchSize);
      results.push(...batch.map(processor));
    }
    return results;
  }
}

/* ----------------- SPATIAL GRID FOR PERFORMANCE ----------------- */
class SpatialGrid {
  constructor(width, height, cellSize) {
    this.cellSize = cellSize;
    this.width = Math.ceil(width / cellSize);
    this.height = Math.ceil(height / cellSize);
    this.grid = new Array(this.width * this.height);
    this.clear();
  }
  
  clear() {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = [];
    }
  }
  
  getCellIndex(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return cellY * this.width + cellX;
  }
  
  addObject(x, y, obj) {
    const index = this.getCellIndex(x, y);
    if (index >= 0 && index < this.grid.length) {
      this.grid[index].push(obj);
    }
  }
  
  getNearbyObjects(x, y, radius) {
    const centerX = Math.floor(x / this.cellSize);
    const centerY = Math.floor(y / this.cellSize);
    const radiusCells = Math.ceil(radius / this.cellSize);
    const objects = [];
    
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const cellX = centerX + dx;
        const cellY = centerY + dy;
        if (cellX >= 0 && cellX < this.width && cellY >= 0 && cellY < this.height) {
          const index = cellY * this.width + cellX;
          objects.push(...this.grid[index]);
        }
      }
    }
    return objects;
  }
}

/* ----------------- UTILITY FUNCTIONS ----------------- */
const perfOptimizer = new PerformanceOptimizer();

function clamp(x, a = -2.5, b = 2.5) { 
  return Math.max(a, Math.min(b, x)); 
}

function calculateCurrentYear(step) {
  return CONFIG.START_YEAR + (step * CONFIG.YEARS_PER_STEP);
}

function formatYear(year) {
  if (year < 0) {
    const yearsAgo = Math.abs(year);
    if (yearsAgo >= 1000000) {
      return (yearsAgo / 1000000).toFixed(1) + ' billion years ago';
    } else if (yearsAgo >= 1000) {
      return (yearsAgo / 1000).toFixed(0) + ' thousand years ago';
    } else {
      return yearsAgo + ' years ago';
    }
  }
  return year.toString();
}

function getCurrentEpoch(year) {
  for (let i = EARTH_EPOCHS.length - 1; i >= 0; i--) {
    if (year >= EARTH_EPOCHS[i].year) {
      return EARTH_EPOCHS[i];
    }
  }
  return EARTH_EPOCHS[0];
}

function getCurrentExtinctionEvent(year) {
  for (let event of CONFIG.EXTINCTION_EVENTS) {
    if (Math.abs(year - event.year) < CONFIG.YEARS_PER_STEP * 5) {
      return event;
    }
  }
  return null;
}

function isIceAge(year) {
  for (let iceAge of CONFIG.ICE_AGES) {
    if (year >= iceAge.year && year <= iceAge.year + iceAge.duration) {
      return iceAge;
    }
  }
  return null;
}

function average(arr) { 
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; 
}

function arrayToCSV(rows) {
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ----------------- AGENT CLASS (OPTIMIZED) ----------------- */
let nextAgentId = 1;
let nextSpeciesId = 1;

class Agent {
  constructor(x, y, dna = null, energy = 80, parent = null) {
    this.id = nextAgentId++;
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.age = 0;
    this.alive = true;
    this.parent = parent;
    
    if (!dna) {
      this.dna = new Float32Array(12);
      for (let i = 0; i < 12; i++) this.dna[i] = (Math.random() * 2 - 1) * 0.5;
      // Start as simple bacteria
      this.dna[3] = 0.8; // High swim bias
      this.dna[5] = -0.8; // Low adhesion  
      this.dna[10] = -0.9; // Anaerobic
    } else {
      this.dna = new Float32Array(dna);
    }
    
    this.species = null;
    this.updateTraits();
  }
  
  updateTraits() {
    this.hue = (this.dna[0] * 0.5 + 0.5);
    this.size = Math.max(0.25, 0.4 + this.dna[1] * 0.3);
    this.metabolism = Math.max(0.01, 0.03 + this.dna[2] * 0.02);
    
    // Motilities with normalization
    this.motility_swim = 0.5 + this.dna[3] * 0.5;
    this.motility_land = 0.2 + this.dna[6] * 0.4;
    this.motility_fly = 0.1 + this.dna[7] * 0.4;
    
    const s = Math.abs(this.motility_swim) + Math.abs(this.motility_land) + Math.abs(this.motility_fly) || 1;
    this.motility_swim /= s;
    this.motility_land /= s;
    this.motility_fly /= s;
    
    this.sensor = Math.max(1.0, 3.0 + this.dna[4] * 3.0);
    this.adhesion = (this.dna[5] * 0.5 + 0.5);
    this.oxygen_tolerance = (this.dna[10] * 0.5 + 0.5);
    this.cold_resistance = (this.dna[11] * 0.5 + 0.5);
  }
  
  region() {
    if (this.y < CONFIG.OCEAN_H) return 'ocean';
    if (this.y < CONFIG.LAND_H) return 'land';
    return 'air';
  }
  
  // Optimized step function using spatial grid
  step(foodList, foodGrid, currentEpoch, extinctionEvent, iceAge) {
    if (!this.alive) return;
    this.age++;
    
    // Environmental stress calculation
    let environmentalStress = 0;
    
    if (currentEpoch.oxygen > 0.05 && this.oxygen_tolerance < 0.3) {
      environmentalStress += (currentEpoch.oxygen - 0.05) * 2;
    }
    
    if (iceAge && this.cold_resistance < 0.5) {
      environmentalStress += 0.3;
    }
    
    if (extinctionEvent) {
      environmentalStress += extinctionEvent.severity * 0.5;
    }
    
    // Apply environmental stress
    if (environmentalStress > 0) {
      this.energy -= environmentalStress * 0.1;
      if (Math.random() < environmentalStress * 0.01) {
        this.alive = false;
        return;
      }
    }
    
    // Use spatial grid for efficient food finding
    const nearbyFood = foodGrid.getNearbyObjects(this.x, this.y, this.sensor);
    let fx = 0, fy = 0, nearestFood = null;
    let nearestDist = Infinity;
    
    for (let food of nearbyFood) {
      const dx = food.x - this.x;
      const dy = food.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestFood = food;
      }
      
      if (dist <= this.sensor) {
        const invDist = 1 / Math.max(dist, 1e-6);
        fx += dx * invDist;
        fy += dy * invDist;
      }
    }
    
    // Movement logic
    let target = [fx, fy];
    if (Math.hypot(target[0], target[1]) < 1e-6) {
      const ang = Math.random() * Math.PI * 2;
      target = [Math.cos(ang) * 0.2, Math.sin(ang) * 0.2];
    }
    
    const region = this.region();
    const pref = [this.motility_swim, this.motility_land, this.motility_fly];
    const env_pref = region === 'ocean' ? [1, 0, 0] : region === 'land' ? [0.2, 1, 0] : [0, 0.2, 1];
    const mismatch = 1 - (pref[0] * env_pref[0] + pref[1] * env_pref[1] + pref[2] * env_pref[2]);
    
    let speed = 0.8 * (1.0 / this.size) * (0.5 + Math.hypot(target[0], target[1]) * 0.2);
    speed *= (1 - 0.5 * mismatch);
    
    // Environmental effects
    if (iceAge) speed *= 0.7;
    if (extinctionEvent) speed *= 0.8;
    
    this.x += target[0] * 0.12 * speed + (Math.random() * 2 - 1) * 0.3;
    this.y += target[1] * 0.12 * speed + (Math.random() * 2 - 1) * 0.3;
    
    // Boundary checks
    this.x = Math.max(0, Math.min(CONFIG.WORLD_W, this.x));
    this.y = Math.max(0, Math.min(CONFIG.WORLD_H, this.y));
    
    // Energy costs
    const moveCost = CONFIG.MOVE_COST_BASE * speed * (1 + this.metabolism);
    this.energy -= moveCost + 0.005;
    
    // Eating
    if (nearestFood && nearestDist < (1.5 * this.size + 1.0)) {
      this.energy += nearestFood.energy;
      const foodIndex = foodList.indexOf(nearestFood);
      if (foodIndex > -1) {
        foodList.splice(foodIndex, 1);
      }
    }
    
    if (this.energy <= 0 || isNaN(this.energy)) {
      this.alive = false;
    }
  }
  
  tryReproduce(sexual = false) {
    if (this.energy <= CONFIG.REPRO_ENERGY || this.age <= 3) return null;
    
    if (!sexual) {
      const childDNA = new Float32Array(this.dna);
      for (let i = 0; i < childDNA.length; i++) {
        if (Math.random() < CONFIG.MUTATION_RATE) {
          childDNA[i] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STD;
          childDNA[i] = clamp(childDNA[i]);
        }
      }
      
      const dx = (Math.random() * 2 - 1) * (0.8 + this.size * 0.6);
      const dy = (Math.random() * 2 - 1) * (0.8 + this.size * 0.6);
      const child = new Agent(
        Math.max(0, Math.min(CONFIG.WORLD_W, this.x + dx)),
        Math.max(0, Math.min(CONFIG.WORLD_H, this.y + dy)),
        childDNA,
        this.energy * 0.45,
        this.id
      );
      
      this.energy *= 0.45;
      return child;
    }
    return null;
  }
}

/* ----------------- OPTIMIZED SIMULATION MANAGER ----------------- */
class EvoSim {
  constructor() {
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
    
    // Performance structures
    this.foodGrid = new SpatialGrid(CONFIG.WORLD_W, CONFIG.WORLD_H, 10);
    this.agentGrid = new SpatialGrid(CONFIG.WORLD_W, CONFIG.WORLD_H, 15);
    this.performance = new PerformanceOptimizer();
    this.lastSpeciesUpdate = 0;
    this.speciesUpdateInterval = 50; // Update species less frequently
  }
  
  seed(initialPop) {
    this.agents = [];
    this.foods = [];
    this.step = 0;
    this.currentYear = CONFIG.START_YEAR;
    this.currentEpoch = EARTH_EPOCHS[0];
    this.oxygenLevel = 0.0;
    nextAgentId = 1;
    nextSpeciesId = 1;
    
    // Initialize spatial grids
    this.foodGrid.clear();
    this.agentGrid.clear();
    
    // Seed primitive anaerobic bacteria
    for (let i = 0; i < initialPop; i++) {
      const x = Math.random() * CONFIG.WORLD_W;
      const y = Math.random() * (CONFIG.OCEAN_H * 0.8);
      const dna = new Float32Array(12);
      
      // Simple bacterial traits
      dna[0] = (Math.random() * 0.2 - 0.1);
      dna[1] = (Math.random() * 0.2 - 0.3);
      dna[2] = (Math.random() * 0.2 - 0.1);
      dna[3] = (0.8 + Math.random() * 0.3);
      dna[4] = (Math.random() * 0.4 - 0.3);
      dna[5] = (Math.random() * 0.4 - 0.8);
      dna[6] = -0.8;
      dna[7] = -0.9;
      dna[8] = 0;
      dna[9] = 0;
      dna[10] = -0.9;
      dna[11] = -0.5;
      
      const agent = new Agent(x, y, dna, 80, null);
      this.agents.push(agent);
      this.agentGrid.addObject(x, y, agent);
      this.lineage[agent.id] = { parent: agent.parent || null };
    }
    
    // Initial food
    for (let i = 0; i < CONFIG.INITIAL_FOOD; i++) {
      this.addFood();
    }
    
    this.speciesPrototypes = [];
    this.speciesCounts = {};
    this.events = [];
    this.metrics = [];
  }
  
  addFood() {
    const x = Math.random() * CONFIG.WORLD_W;
    const y = Math.random() * (CONFIG.OCEAN_H * 0.95);
    const food = {
      x: x,
      y: y,
      energy: CONFIG.FOOD_ENERGY * (0.8 + Math.random() * 0.8)
    };
    this.foods.push(food);
    this.foodGrid.addObject(x, y, food);
    return food;
  }
  
  // Optimized step simulation with workload distribution
  stepSim(sexual = false) {
    this.step++;
    this.currentYear = calculateCurrentYear(this.step);
    this.currentEpoch = getCurrentEpoch(this.currentYear);
    this.extinctionEvent = getCurrentExtinctionEvent(this.currentYear);
    this.iceAge = isIceAge(this.currentYear);
    this.oxygenLevel = this.currentEpoch.oxygen;
    this.epoch = this.currentEpoch.name;
    
    // Update spatial grids
    this.updateSpatialGrids();
    
    // Apply environmental events
    this.applyEnvironmentalEvents();
    
    // Process agents in batches for performance
    this.processAgents(sexual);
    
    // Population management
    this.managePopulation();
    
    // Update species classification (less frequently for performance)
    if (this.step - this.lastSpeciesUpdate >= this.speciesUpdateInterval) {
      this.updateSpecies();
      this.lastSpeciesUpdate = this.step;
    }
    
    // Log metrics
    this.logMetrics();
  }
  
  updateSpatialGrids() {
    // Clear and rebuild spatial grids
    this.foodGrid.clear();
    this.agentGrid.clear();
    
    // Batch process foods
    for (let food of this.foods) {
      this.foodGrid.addObject(food.x, food.y, food);
    }
    
    // Batch process agents
    for (let agent of this.agents) {
      if (agent.alive) {
        this.agentGrid.addObject(agent.x, agent.y, agent);
      }
    }
  }
  
  applyEnvironmentalEvents() {
    // Extinction events
    if (this.extinctionEvent && Math.random() < 0.1) {
      const mortalityRate = this.extinctionEvent.severity * 0.3;
      
      // Sample agents for extinction to avoid processing all
      const sampleSize = Math.min(50, this.agents.length);
      const sample = perfOptimizer.sampleArray(this.agents, sampleSize);
      
      for (let agent of sample) {
        if (Math.random() < mortalityRate) {
          agent.alive = false;
        }
      }
      
      // Reduce food during extinction
      if (this.foods.length > 50 && Math.random() < 0.2) {
        const removeCount = Math.floor(this.foods.length * 0.1);
        this.foods.splice(0, removeCount);
      }
    }
    
    // Ice age effects
    if (this.iceAge && Math.random() < 0.1 && this.foods.length > 30) {
      const removeCount = Math.floor(this.foods.length * 0.05);
      this.foods.splice(0, removeCount);
    }
  }
  
  processAgents(sexual) {
    const newAgents = [];
    
    // Process agents with early termination for performance
    const maxAgentsToProcess = Math.min(this.agents.length, 500);
    const agentsToProcess = this.agents.slice(0, maxAgentsToProcess);
    
    for (let agent of agentsToProcess) {
      if (!agent.alive) continue;
      
      agent.step(this.foods, this.foodGrid, this.currentEpoch, this.extinctionEvent, this.iceAge);
      
      if (!sexual) {
        const child = agent.tryReproduce(false);
        if (child) {
          newAgents.push(child);
          this.lineage[child.id] = { parent: agent.id };
        }
      }
    }
    
    // Sexual reproduction (limited for performance)
    if (sexual && this.agents.length < 300) {
      const elig = this.agents.filter(a => a.alive && a.energy > CONFIG.REPRO_ENERGY && a.age > 3);
      if (elig.length >= 2) {
        const pairs = Math.min(10, Math.floor(elig.length / 2));
        
        for (let i = 0; i < pairs; i++) {
          const p1 = elig[i * 2];
          const p2 = elig[i * 2 + 1];
          
          const childDNA = new Float32Array(12);
          for (let g = 0; g < 12; g++) {
            childDNA[g] = Math.random() < 0.5 ? p1.dna[g] : p2.dna[g];
            if (Math.random() < CONFIG.MUTATION_RATE) {
              childDNA[g] += (Math.random() * 2 - 1) * CONFIG.MUTATION_STD;
              childDNA[g] = clamp(childDNA[g]);
            }
          }
          
          const dx = (Math.random() * 2 - 1) * 1.5;
          const dy = (Math.random() * 2 - 1) * 1.5;
          const child = new Agent(
            Math.max(0, Math.min(CONFIG.WORLD_W, p1.x + dx)),
            Math.max(0, Math.min(CONFIG.WORLD_H, p1.y + dy)),
            childDNA,
            (p1.energy + p2.energy) * 0.22,
            p1.id
          );
          
          newAgents.push(child);
          this.lineage[child.id] = { parent1: p1.id, parent2: p2.id };
          p1.energy *= 0.55;
          p2.energy *= 0.55;
        }
      }
    }
    
    // Add new agents
    for (let child of newAgents) {
      if (this.agents.length < CONFIG.MAX_AGENTS) {
        this.agents.push(child);
        this.agentGrid.addObject(child.x, child.y, child);
      }
    }
    
    // Remove dead agents
    this.agents = this.agents.filter(a => a.alive);
    
    // Spawn food if needed
    if (this.foods.length < CONFIG.INITIAL_FOOD * 0.4 && this.step % 5 === 0) {
      const foodToAdd = Math.min(30, Math.round(CONFIG.INITIAL_FOOD * 0.3));
      for (let i = 0; i < foodToAdd; i++) {
        if (this.foods.length < CONFIG.MAX_FOOD) {
          this.addFood();
        }
      }
    }
  }
  
  managePopulation() {
    // Enforce population limits
    if (this.agents.length > CONFIG.MAX_AGENTS) {
      // Remove weakest agents
      this.agents.sort((a, b) => a.energy - b.energy);
      const excess = this.agents.length - CONFIG.MAX_AGENTS;
      this.agents.splice(0, excess);
    }
    
    if (this.foods.length > CONFIG.MAX_FOOD) {
      this.foods.splice(CONFIG.MAX_FOOD);
    }
  }
  
  updateSpecies() {
    if (this.agents.length === 0) return;
    
    // Use sampling for large populations
    const sampleSize = Math.min(100, this.agents.length);
    const agentSample = perfOptimizer.sampleArray(this.agents, sampleSize);
    const dnaMat = agentSample.map(a => a.dna.slice(0, 6));
    
    // Compute statistics on sample
    const colMeans = [];
    const colStds = [];
    
    for (let col = 0; col < 6; col++) {
      const vals = dnaMat.map(r => r[col]);
      const mean = average(vals);
      const std = Math.sqrt(vals.map(v => Math.pow(v - mean, 2)).reduce((s, v) => s + v, 0) / vals.length) + 1e-6;
      colMeans.push(mean);
      colStds.push(std);
    }
    
    const normRows = dnaMat.map(r => r.map((v, i) => (v - colMeans[i]) / colStds[i]));
    
    if (this.speciesPrototypes.length === 0) {
      const proto = dnaMat[0].slice();
      const sid = this.nextSpeciesID++;
      this.speciesPrototypes.push({ proto: Array.from(proto), id: sid, count: this.agents.length });
      for (let a of this.agents) a.species = sid;
      this.speciesCounts[sid] = this.agents.length;
      this.announceSpecies(sid, proto, "Primitive anaerobic bacteria");
      return;
    }
    
    // Update species assignments
    const speciesAssignments = new Map();
    
    for (let i = 0; i < agentSample.length; i++) {
      const agent = agentSample[i];
      const r = normRows[i];
      let bestDist = Infinity;
      let bestSid = null;
      
      for (let p of this.speciesPrototypes) {
        const pnorm = p.proto.map((v, j) => (v - colMeans[j]) / colStds[j]);
        let d = 0;
        for (let j = 0; j < r.length; j++) d += Math.pow(r[j] - pnorm[j], 2);
        d = Math.sqrt(d);
        
        if (d < bestDist) {
          bestDist = d;
          bestSid = p.id;
        }
      }
      
      if (bestDist < CONFIG.SPECIES_DIST_THRESH) {
        agent.species = bestSid;
        speciesAssignments.set(bestSid, (speciesAssignments.get(bestSid) || 0) + 1);
      } else {
        const proto = Array.from(dnaMat[i]);
        const sid = this.nextSpeciesID++;
        this.speciesPrototypes.push({ proto: Array.from(proto), id: sid, count: 1 });
        agent.species = sid;
        speciesAssignments.set(sid, 1);
        this.announceSpecies(sid, proto, `Evolutionary divergence (dist ${bestDist.toFixed(2)})`);
      }
    }
    
    // Update species counts
    this.speciesCounts = Object.fromEntries(speciesAssignments);
  }
  
  announceSpecies(sid, proto, notes) {
    const event = {
      type: 'species',
      step: this.step,
      year: this.currentYear,
      epoch: this.currentEpoch.name,
      id: sid,
      proto: proto.map(v => Number(v.toFixed(4))),
      notes: notes
    };
    
    this.events.push(event);
    
    // Only show major evolutionary events in UI
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
  
  computeDiversity() {
    if (this.agents.length < 2) return 0;
    
    // Use sampling for performance
    const sampleSize = Math.min(50, this.agents.length);
    const sample = perfOptimizer.sampleArray(this.agents, sampleSize);
    const dnaMat = sample.map(a => a.dna.slice(0, 6));
    
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < dnaMat.length; i++) {
      for (let j = i + 1; j < dnaMat.length; j++) {
        let d = 0;
        for (let k = 0; k < 6; k++) {
          d += Math.pow(dnaMat[i][k] - dnaMat[j][k], 2);
        }
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
    
    // Evolutionary progress metrics
    const avgOxygenTolerance = pop > 0 ? average(this.agents.map(a => a.oxygen_tolerance)) : 0;
    const avgLandAdaptation = pop > 0 ? average(this.agents.map(a => a.motility_land)) : 0;
    
    this.metrics.push({
      step: this.step,
      year: this.currentYear,
      epoch: this.currentEpoch.name,
      population: pop,
      food: food,
      avgSize: avgSize,
      avgEnergy: avgEnergy,
      diversity: div,
      oxygenTolerance: avgOxygenTolerance,
      landAdaptation: avgLandAdaptation,
      extinctionEvent: this.extinctionEvent ? this.extinctionEvent.name : 'None',
      iceAge: this.iceAge ? this.iceAge.name : 'None'
    });
  }
}

/* ----------------- RENDERING & UI SETUP ----------------- */
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const epochEl = document.getElementById('epochName');
const yearEl = document.getElementById('yearDisplay');
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
  avgSize: document.getElementById('avgSize'),
  diversity: document.getElementById('diversity'),
  oxygenTolerance: document.getElementById('oxygenTolerance'),
  landAdaptation: document.getElementById('landAdaptation')
};

// Chart setup
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
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
    },
    plugins: { legend: { display: true } }
  }
});

/* ----------------- SIMULATION STATE ----------------- */
let sim = new EvoSim();
let ANIM = {
  running: true,
  frame: null,
  speed: CONFIG.DEFAULT_SPEED,
  lastStepTime: performance.now(),
  accumulatedTime: 0,
  renderSkip: 0
};

/* ----------------- UI INITIALIZATION ----------------- */
function initUI() {
  // Set initial values
  mrEl.value = CONFIG.MUTATION_RATE;
  mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2);
  initPopEl.value = CONFIG.INITIAL_POP;
  initVal.innerText = CONFIG.INITIAL_POP;
  reproEl.value = CONFIG.REPRO_ENERGY;
  reproVal.innerText = CONFIG.REPRO_ENERGY;

  // Initialize time control
  speedSlider.value = CONFIG.DEFAULT_SPEED;
  speedValue.innerText = CONFIG.DEFAULT_SPEED.toFixed(1) + 'x';
  ANIM.speed = CONFIG.DEFAULT_SPEED;

  // Event listeners
  mrEl.addEventListener('input', () => {
    CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
    mrVal.innerText = CONFIG.MUTATION_RATE.toFixed(2);
  });
  
  initPopEl.addEventListener('input', () => {
    initVal.innerText = initPopEl.value;
  });
  
  reproEl.addEventListener('input', () => {
    CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
    reproVal.innerText = reproEl.value;
  });

  // Time control event listeners
  speedSlider.addEventListener('input', updateSpeed);
  btnSlow.addEventListener('click', () => setSpeed(0.5));
  btnNormal.addEventListener('click', () => setSpeed(1.0));
  btnFast.addEventListener('click', () => setSpeed(3.0));

  // Control buttons
  btnRestart.addEventListener('click', restartSim);
  btnPause.addEventListener('click', togglePause);
  btnSpawnFood.addEventListener('click', () => {
    for (let i = 0; i < 20; i++) {
      if (sim.foods.length < CONFIG.MAX_FOOD) {
        sim.addFood();
      }
    }
  });

  // Export buttons
  document.getElementById('btnExportMetrics').addEventListener('click', exportMetricsCSV);
  document.getElementById('btnExportSpecies').addEventListener('click', exportSpeciesCSV);
  document.getElementById('btnExportLineage').addEventListener('click', exportLineageJSON);
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

function togglePause() {
  ANIM.running = !ANIM.running;
  btnPause.innerText = ANIM.running ? 'Pause' : 'Resume';
}

function restartSim() {
  CONFIG.MUTATION_RATE = parseFloat(mrEl.value);
  CONFIG.REPRO_ENERGY = parseInt(reproEl.value);
  CONFIG.INITIAL_POP = parseInt(initPopEl.value);
  
  sim = new EvoSim();
  sim.seed(CONFIG.INITIAL_POP);
  
  // Reset chart
  chart.data.labels = [];
  chart.data.datasets.forEach(ds => ds.data = []);
  chart.update('none');
  
  // Clear announcements
  annDiv.innerHTML = '';
  
  updateStatsUI();
  draw();
}

/* ----------------- EXPORT FUNCTIONS ----------------- */
function exportMetricsCSV() {
  const rows = [['step', 'year', 'epoch', 'population', 'food', 'avgSize', 'avgEnergy', 'diversity', 'oxygenTolerance', 'landAdaptation', 'extinctionEvent', 'iceAge']];
  for (let r of sim.metrics) {
    rows.push([
      r.step,
      r.year,
      r.epoch,
      r.population,
      r.food,
      r.avgSize.toFixed(4),
      r.avgEnergy.toFixed(4),
      r.diversity.toFixed(6),
      r.oxygenTolerance.toFixed(4),
      r.landAdaptation.toFixed(4),
      r.extinctionEvent,
      r.iceAge
    ]);
  }
  downloadText('earth_evolution_metrics.csv', arrayToCSV(rows));
}

function exportSpeciesCSV() {
  const rows = [['step', 'year', 'epoch', 'type', 'id', 'prototype', 'notes']];
  for (let e of sim.events) {
    if (e.type === 'species') {
      rows.push([
        e.step,
        e.year,
        e.epoch,
        e.type,
        e.id,
        JSON.stringify(e.proto),
        e.notes
      ]);
    } else if (e.type === 'epoch') {
      rows.push([
        e.step,
        e.year,
        e.epoch,
        e.type,
        '',
        e.epoch,
        e.notes || ''
      ]);
    }
  }
  downloadText('earth_evolution_species.csv', arrayToCSV(rows));
}

function exportLineageJSON() {
  const out = {
    lineage: sim.lineage,
    events: sim.events,
    metricsSummary: {
      lastStep: sim.step,
      currentYear: sim.currentYear,
      currentEpoch: sim.currentEpoch.name,
      population: sim.agents.length,
      speciesCount: sim.speciesPrototypes.length
    }
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earth_evolution_lineage.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ----------------- RENDERING FUNCTIONS ----------------- */
function drawBackground() {
  // Ocean
  ctx.fillStyle = '#1f4f8b';
  ctx.fillRect(0, 0, canvas.width, Math.round(canvas.height * (CONFIG.OCEAN_H / CONFIG.WORLD_H)));
  
  // Land
  const landTop = Math.round(canvas.height * (CONFIG.OCEAN_H / CONFIG.WORLD_H));
  const landBottom = Math.round(canvas.height * (CONFIG.LAND_H / CONFIG.WORLD_H));
  ctx.fillStyle = '#7db36f';
  ctx.fillRect(0, landTop, canvas.width, landBottom - landTop);
  
  // Air
  ctx.fillStyle = '#d6e9ff';
  ctx.fillRect(0, landBottom, canvas.width, canvas.height - landBottom);
}

function wx(x) { return (x / CONFIG.WORLD_W) * canvas.width; }
function wy(y) { return canvas.height - (y / CONFIG.WORLD_H) * canvas.height; }

function draw() {
  drawBackground();
  
  // Draw food (optimized - only draw visible food)
  const visibleFood = sim.foods.length > 500 ? 
    perfOptimizer.sampleArray(sim.foods, 200) : sim.foods;
  
  for (let f of visibleFood) {
    const px = wx(f.x), py = wy(f.y);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
  
  // Draw agents (optimized - sample if too many)
  const visibleAgents = sim.agents.length > 400 ? 
    perfOptimizer.sampleArray(sim.agents, 200) : sim.agents;
  
  for (let a of visibleAgents) {
    if (!a.alive) continue;
    
    const px = wx(a.x), py = wy(a.y);
    const hue = a.species ? ((a.species * 137.5) % 360) / 360 : a.hue;
    const r = Math.max(2, a.size * 6 + Math.min(10, a.energy / 25));
    
    ctx.beginPath();
    ctx.fillStyle = `hsl(${Math.floor(hue * 360)}, 70%, 50%)`;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.5;
    ctx.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Energy indicator
    const e = Math.max(0, Math.min(1, a.energy / 200));
    if (e > 0.2) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + 0.1 * e})`;
      ctx.lineWidth = 1;
      ctx.ellipse(px, py, r + 3, r + 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  // Draw environmental info
  drawEnvironmentalOverlay();
}

function drawEnvironmentalOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(10, canvas.height - 90, 320, 80);
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText(`Epoch: ${sim.currentEpoch.name}`, 20, canvas.height - 70);
  ctx.fillText(`Environment: ${sim.currentEpoch.environment}`, 20, canvas.height - 55);
  ctx.fillText(`Oxygen: ${(sim.oxygenLevel * 100).toFixed(1)}%`, 20, canvas.height - 40);
  ctx.fillText(`Year: ${formatYear(sim.currentYear)}`, 20, canvas.height - 25);
  
  // Extinction event warning
  if (sim.extinctionEvent) {
    ctx.fillStyle = 'rgba(255,50,50,0.8)';
    ctx.fillRect(canvas.width - 260, 10, 250, 35);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`MASS EXTINCTION!`, canvas.width - 250, 30);
    ctx.font = '11px Arial';
    ctx.fillText(sim.extinctionEvent.name, canvas.width - 250, 45);
  }
  
  // Ice age indicator
  if (sim.iceAge) {
    ctx.fillStyle = 'rgba(200,230,255,0.8)';
    ctx.fillRect(canvas.width - 260, 55, 250, 25);
    ctx.fillStyle = '#0066cc';
    ctx.font = '11px Arial';
    ctx.fillText(`Ice Age: ${sim.iceAge.name}`, canvas.width - 250, 73);
  }
}

/* ----------------- MAIN LOOP (PERFORMANCE OPTIMIZED) ----------------- */
function stepLoop() {
  const now = performance.now();
  const deltaTime = Math.min(100, now - ANIM.lastStepTime); // Cap delta time
  ANIM.lastStepTime = now;

  if (ANIM.running) {
    // Accumulate time based on speed
    ANIM.accumulatedTime += deltaTime * ANIM.speed;
    
    // Calculate steps to run (capped for performance)
    const targetStepInterval = 1000 / 60;
    const maxStepsThisFrame = Math.min(CONFIG.MAX_STEPS_PER_FRAME, Math.ceil(ANIM.accumulatedTime / targetStepInterval));
    
    let stepsRun = 0;
    while (ANIM.accumulatedTime >= targetStepInterval && stepsRun < maxStepsThisFrame) {
      sim.stepSim(sexualToggle.checked);
      ANIM.accumulatedTime -= targetStepInterval;
      stepsRun++;
    }
    
    // Prevent time accumulation if simulation can't keep up
    if (ANIM.accumulatedTime > 1000) {
      ANIM.accumulatedTime = 1000;
    }
    
    // Update UI and render (skip some frames at high speeds for performance)
    ANIM.renderSkip++;
    const renderThisFrame = ANIM.renderSkip >= Math.max(1, Math.floor(ANIM.speed / 2));
    
    if (renderThisFrame || stepsRun > 0) {
      updateStatsUI();
      
      if (renderThisFrame) {
        updateChart();
        draw();
        ANIM.renderSkip = 0;
      }
    }
  } else {
    // When paused, still draw
    draw();
  }
  
  // Use requestAnimationFrame with error handling
  try {
    ANIM.frame = requestAnimationFrame(stepLoop);
  } catch (e) {
    console.error('Animation frame error:', e);
    // Fallback: restart animation after delay
    setTimeout(() => {
      ANIM.frame = requestAnimationFrame(stepLoop);
    }, 100);
  }
}

function updateStatsUI() {
  stats.step.innerText = sim.step;
  stats.pop.innerText = sim.agents.length;
  stats.food.innerText = sim.foods.length;
  stats.speciesCount.innerText = sim.speciesPrototypes.length;
  stats.avgSize.innerText = sim.agents.length ? average(sim.agents.map(a => a.size)).toFixed(2) : '0.00';
  stats.diversity.innerText = sim.computeDiversity().toFixed(3);
  stats.oxygenTolerance.innerText = (sim.agents.length ? average(sim.agents.map(a => a.oxygen_tolerance)) * 100 : 0).toFixed(1) + '%';
  stats.landAdaptation.innerText = (sim.agents.length ? average(sim.agents.map(a => a.motility_land)) * 100 : 0).toFixed(1) + '%';
  
  // Update epoch badge
  epochEl.innerText = sim.epoch;
  yearEl.innerText = formatYear(sim.currentYear);
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

/* ----------------- APPLICATION BOOTSTRAP ----------------- */
function boot() {
  canvas.width = 960;
  canvas.height = 720;
  
  initUI();
  restartSim();
  
  ANIM.running = true;
  ANIM.lastStepTime = performance.now();
  ANIM.accumulatedTime = 0;
  ANIM.renderSkip = 0;
  
  stepLoop();
}

// Start the application
boot();
