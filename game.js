const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const stage = document.querySelector(".stage");
const statusText = document.getElementById("statusText");
const bananaCount = document.getElementById("bananaCount");
const bambooCount = document.getElementById("bambooCount");
const leafCount = document.getElementById("leafCount");
const cokeCount = document.getElementById("cokeCount");
const seedCount = document.getElementById("seedCount");
const selectedName = document.getElementById("selectedName");
const selectedDetails = document.getElementById("selectedDetails");
const chewButton = document.getElementById("chewButton");
const sowButton = document.getElementById("sowButton");
const moveStructureButton = document.getElementById("moveStructureButton");
const buildButtons = Array.from(document.querySelectorAll("[data-build]"));
const travelButtons = Array.from(document.querySelectorAll("[data-scene]"));
const rpmValue = document.getElementById("rpmValue");
const rpmFill = document.getElementById("rpmFill");
const gearValue = document.getElementById("gearValue");
const speedValue = document.getElementById("speedValue");
const clutchValue = document.getElementById("clutchValue");

const WORLD = { width: 1800, height: 1100 };
const CITY = { width: 2800, height: 1900 };
const INTERACT_RANGE = 78;
const PLAYER_RADIUS = 25;
const CITY_BIKE_SCALE = 0.58;
const CITY_BIKE_COLLISION_RADIUS = 28;
const CITY_CAR_COLLISION_RADIUS = 34;
const CITY_COKE_CAR_CHANCE = 0.07;
const ESTEROS_SAVE_KEY = "carpincho-aldea-esteros-v1";
const SEED_DROP_LIFE = 18;
const SEED_DROP_RADIUS = 14;
const BEE_LIFE = 11;
const RESOURCE_SPAWNS = [
  { type: "banana", x: 360, y: 290 },
  { type: "banana", x: 520, y: 760 },
  { type: "banana", x: 1260, y: 360 },
  { type: "banana", x: 1485, y: 830 },
  { type: "bamboo", x: 690, y: 260 },
  { type: "bamboo", x: 1020, y: 720 },
  { type: "bamboo", x: 1370, y: 575 },
  { type: "bamboo", x: 330, y: 900 },
];
const RIVER_LANES = 3;
const RESOURCE_TYPES = {
  banana: {
    name: "Arbol de banano",
    materialText: "fibra de banano y hojas",
    radius: 38,
    maxHealth: 6,
    yield: { banana: 2, leaves: 1 },
  },
  bamboo: {
    name: "Tacuara",
    materialText: "varas de tacuara",
    radius: 34,
    maxHealth: 7,
    yield: { bamboo: 3 },
  },
};

const REFUGIO_LEVELS = {
  1: { name: "Casita", detail: "1 refugio movible" },
  2: { name: "Casa", detail: "2 refugios fusionados" },
  3: { name: "Rancho", detail: "3 refugios fusionados" },
  4: { name: "Palacio", detail: "Fortaleza de 4 casitas" },
};

const BUILDINGS = {
  refugio: {
    name: "Casita",
    size: { width: 126, height: 92 },
    cost: { banana: 8, bamboo: 6, leaves: 4 },
  },
  refugio_grande: {
    name: "Casa",
    size: { width: 226, height: 128 },
    cost: { banana: 0, bamboo: 0, leaves: 0 },
  },
  refugio_rancho: {
    name: "Rancho",
    size: { width: 270, height: 174 },
    cost: { banana: 0, bamboo: 0, leaves: 0 },
  },
  refugio_palacio: {
    name: "Palacio",
    size: { width: 286, height: 220 },
    cost: { banana: 0, bamboo: 0, leaves: 0 },
  },
  secadero: {
    name: "Secadero",
    size: { width: 116, height: 76 },
    cost: { banana: 5, bamboo: 8, leaves: 0 },
  },
  cerco: {
    name: "Cerco",
    size: { width: 104, height: 42 },
    cost: { banana: 2, bamboo: 3, leaves: 0 },
  },
  siembra: {
    name: "Siembra",
    size: { width: 54, height: 48 },
    cost: { seeds: 1 },
  },
};

const state = {
  scene: "land",
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  lastFrame: performance.now(),
  camera: { x: 0, y: 0 },
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0, inCanvas: false },
  player: {
    x: 850,
    y: 560,
    targetX: 850,
    targetY: 560,
    speed: 195,
    facing: 0,
    moving: false,
  },
  inventory: { banana: 0, bamboo: 0, leaves: 0, coke: 0 },
  selected: null,
  buildMode: null,
  movingStructureId: null,
  saveTimer: 0,
  resources: [],
  resourceRespawns: [],
  structures: [],
  groundMarks: [],
  flowers: [],
  particles: [],
  chewing: null,
  message: "Explorando",
  messageTimer: 0,
  clickPulse: null,
  transitionSign: null,
  keys: { up: false, down: false, left: false, right: false },
  city: {
    x: 1320,
    y: 980,
    speed: 230,
    facing: 0,
    moving: false,
    camera: { x: 0, y: 0 },
    cars: [],
    trafficLights: [],
    plazas: [],
    bike: {
      x: 1245,
      y: 955,
      angle: 0,
      mounted: false,
      speed: 0,
      rpm: 1100,
      gear: 1,
      clutch: false,
      interactPulse: 0,
    },
    cokeDrops: [],
  },
  river: {
    playerLane: 1,
    targetLane: 1,
    playerY: 0,
    obstacles: [],
    warnings: [],
    ripples: [],
    distance: 0,
    speed: 245,
    spawnTimer: 1.3,
    hitFlash: 0,
  },
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.floor(rect.width * state.dpr);
  canvas.height = Math.floor(rect.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  clampCamera();
  clampCityCamera();
  state.river.playerY = riverLaneCenter(state.river.playerLane);
}

function createWorld() {
  state.resources = RESOURCE_SPAWNS.map((spawn) => resource(spawn.type, spawn.x, spawn.y));

  state.groundMarks = Array.from({ length: 90 }, (_, index) => ({
    x: ((index * 157) % WORLD.width) + Math.random() * 60,
    y: ((index * 97) % WORLD.height) + Math.random() * 70,
    radius: 10 + Math.random() * 36,
    alpha: 0.05 + Math.random() * 0.08,
    tone: Math.random() > 0.56 ? "light" : "dark",
  }));

  state.flowers = Array.from({ length: 52 }, (_, index) => ({
    x: ((index * 211) % WORLD.width) + Math.random() * 32,
    y: ((index * 83) % WORLD.height) + Math.random() * 44,
    color: Math.random() > 0.55 ? "#f2c14e" : "#d86f45",
  }));

  createCity();
  loadEsterosProgress();
}

function createCity() {
  state.city.trafficLights = [
    { x: 700, y: 520, phase: 0 },
    { x: 1390, y: 520, phase: 1.4 },
    { x: 2070, y: 520, phase: 2.7 },
    { x: 700, y: 1030, phase: 3.6 },
    { x: 1390, y: 1030, phase: 0.9 },
    { x: 2070, y: 1030, phase: 2.2 },
    { x: 700, y: 1510, phase: 1.9 },
    { x: 1390, y: 1510, phase: 3.1 },
    { x: 2070, y: 1510, phase: 0.3 },
  ];

  state.city.cars = [
    cityCar({ road: "h", y: 520, x: 180, speed: 150, color: "#d84f3f", direction: 1, laneOffset: -22 }),
    cityCar({ road: "h", y: 520, x: 1780, speed: 120, color: "#f2c14e", direction: -1, laneOffset: 22 }),
    cityCar({ road: "h", y: 1030, x: 980, speed: 136, color: "#2f7f8f", direction: 1, laneOffset: -20 }),
    cityCar({ road: "h", y: 1510, x: 2300, speed: 112, color: "#ece0c6", direction: -1, laneOffset: 22 }),
    cityCar({ road: "v", x: 700, y: 320, speed: 118, color: "#c84b3f", direction: 1, laneOffset: -20 }),
    cityCar({ road: "v", x: 1390, y: 1400, speed: 142, color: "#79a85b", direction: -1, laneOffset: 21 }),
    cityCar({ road: "v", x: 2070, y: 820, speed: 128, color: "#f28f3b", direction: 1, laneOffset: -21 }),
  ];

  state.city.plazas = [
    { x: 360, y: 310, radius: 150 },
    { x: 2440, y: 330, radius: 135 },
    { x: 2240, y: 1650, radius: 180 },
    { x: 420, y: 1620, radius: 130 },
  ];
}

function cityCar(config) {
  const car = {
    ...config,
    baseColor: config.color,
    isCokeCar: false,
    cokeLootReady: false,
  };
  rollCityCarVariant(car, CITY_COKE_CAR_CHANCE * 0.35);
  return car;
}

function rollCityCarVariant(car, chance = CITY_COKE_CAR_CHANCE) {
  const isCokeCar = Math.random() < chance;
  car.isCokeCar = isCokeCar;
  car.cokeLootReady = isCokeCar;
  car.color = isCokeCar ? "#d71920" : car.baseColor;
}

function resource(type, x, y) {
  const config = RESOURCE_TYPES[type];
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${type}-${x}-${y}`,
    type,
    x,
    y,
    spawnX: x,
    spawnY: y,
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    radius: config.radius,
    sway: Math.random() * Math.PI * 2,
  };
}

function loadEsterosProgress() {
  try {
    const raw = localStorage.getItem(ESTEROS_SAVE_KEY);
    if (!raw) {
      return;
    }

    const save = JSON.parse(raw);
    if (!save || save.version !== 1) {
      return;
    }

    state.inventory = sanitizeInventory(save.inventory);
    state.structures = Array.isArray(save.structures) ? save.structures.map(sanitizeStructure).filter(Boolean) : [];
    state.resources = Array.isArray(save.resources)
      ? save.resources.map(sanitizeResource).filter(Boolean)
      : RESOURCE_SPAWNS.map((spawn) => resource(spawn.type, spawn.x, spawn.y));
    state.resourceRespawns = Array.isArray(save.resourceRespawns)
      ? save.resourceRespawns.map(sanitizeRespawn).filter(Boolean)
      : [];

    if (save.player) {
      state.player.x = clamp(Number(save.player.x) || state.player.x, PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
      state.player.y = clamp(Number(save.player.y) || state.player.y, PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
      state.player.targetX = state.player.x;
      state.player.targetY = state.player.y;
    }

    setMessage("Esteros cargados", 1.1);
  } catch (error) {
    console.warn("No se pudo cargar el progreso de Esteros", error);
  }
}

function saveEsterosProgress() {
  const save = {
    version: 1,
    inventory: { ...state.inventory },
    player: {
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
    },
    structures: state.structures.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      detail: item.detail,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    })),
    resources: state.resources.map((item) => ({
      id: item.id,
      type: item.type,
      x: item.x,
      y: item.y,
      spawnX: item.spawnX,
      spawnY: item.spawnY,
      health: item.health,
      maxHealth: item.maxHealth,
      radius: item.radius,
      sway: item.sway,
    })),
    resourceRespawns: state.resourceRespawns.map((item) => ({
      type: item.type,
      x: item.x,
      y: item.y,
      timer: item.timer,
    })),
  };

  try {
    localStorage.setItem(ESTEROS_SAVE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn("No se pudo guardar el progreso de Esteros", error);
  }
}

function scheduleEsterosSave(delay = 0.25) {
  state.saveTimer = Math.max(state.saveTimer, delay);
}

function flushSaveTimer(dt) {
  if (state.saveTimer <= 0) {
    return;
  }

  state.saveTimer -= dt;
  if (state.saveTimer <= 0) {
    saveEsterosProgress();
  }
}

function sanitizeInventory(inventory) {
  return {
    banana: Math.max(0, Number(inventory?.banana) || 0),
    bamboo: Math.max(0, Number(inventory?.bamboo) || 0),
    leaves: Math.max(0, Number(inventory?.leaves) || 0),
    coke: Math.max(0, Number(inventory?.coke) || 0),
  };
}

function sanitizeStructure(item) {
  if (!item || !BUILDINGS[item.type]) {
    return null;
  }

  const size = BUILDINGS[item.type].size;
  return {
    id: item.id || `${item.type}-${Date.now()}-${Math.random()}`,
    type: item.type,
    name: item.name || BUILDINGS[item.type].name,
    detail: item.detail || "Estructura colocada",
    x: clamp(Number(item.x) || WORLD.width / 2, size.width / 2 + 8, WORLD.width - size.width / 2 - 8),
    y: clamp(Number(item.y) || WORLD.height / 2, size.height / 2 + 8, WORLD.height - size.height / 2 - 8),
    width: Number(item.width) || size.width,
    height: Number(item.height) || size.height,
  };
}

function sanitizeResource(item) {
  if (!item || !RESOURCE_TYPES[item.type]) {
    return null;
  }

  const config = RESOURCE_TYPES[item.type];
  return {
    id: item.id || `${item.type}-${Date.now()}-${Math.random()}`,
    type: item.type,
    x: clamp(Number(item.x) || 80, 70, WORLD.width - 70),
    y: clamp(Number(item.y) || 90, 90, WORLD.height - 90),
    spawnX: clamp(Number(item.spawnX) || Number(item.x) || 80, 70, WORLD.width - 70),
    spawnY: clamp(Number(item.spawnY) || Number(item.y) || 90, 90, WORLD.height - 90),
    health: clamp(Number(item.health) || config.maxHealth, 1, config.maxHealth),
    maxHealth: config.maxHealth,
    radius: config.radius,
    sway: Number(item.sway) || Math.random() * Math.PI * 2,
  };
}

function sanitizeRespawn(item) {
  if (!item || !RESOURCE_TYPES[item.type]) {
    return null;
  }

  return {
    type: item.type,
    x: clamp(Number(item.x) || 80, 70, WORLD.width - 70),
    y: clamp(Number(item.y) || 90, 90, WORLD.height - 90),
    timer: Math.max(0.1, Number(item.timer) || 5),
  };
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastFrame) / 1000 || 0);
  state.lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  state.time += dt;
  updateResourceRespawns(dt);

  if (state.scene === "land") {
    movePlayer(dt);
    updateCamera(dt);
    updateChewing(dt);
  } else if (state.scene === "city") {
    updateCity(dt);
  } else if (state.scene === "river") {
    updateRiver(dt);
  }

  updateParticles(dt);
  updateTransitionSign(dt);

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
  }

  flushSaveTimer(dt);
  updateHud();
}

function movePlayer(dt) {
  const player = state.player;
  const dx = player.targetX - player.x;
  const dy = player.targetY - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 2) {
    player.moving = false;
    return;
  }

  const step = Math.min(distance, player.speed * dt);
  player.x += (dx / distance) * step;
  player.y += (dy / distance) * step;
  player.facing = Math.atan2(dy, dx);
  player.moving = true;
  scheduleEsterosSave(1.2);
}

function updateCamera(dt) {
  const targetX = state.player.x - state.width / 2;
  const targetY = state.player.y - state.height / 2;
  state.camera.x += (targetX - state.camera.x) * Math.min(1, dt * 7.5);
  state.camera.y += (targetY - state.camera.y) * Math.min(1, dt * 7.5);
  clampCamera();
}

function clampCamera() {
  state.camera.x = clamp(state.camera.x, 0, Math.max(0, WORLD.width - state.width));
  state.camera.y = clamp(state.camera.y, 0, Math.max(0, WORLD.height - state.height));
}

function updateCity(dt) {
  if (state.city.bike.mounted) {
    updateCityBike(dt);
  } else {
    moveCityPlayer(dt);
  }

  updateCityCars(dt);
  updateCityCokeDrops(dt);
  updateCityVehicleCollisions();
  updateCityCamera(dt);
  state.city.bike.interactPulse = Math.max(0, state.city.bike.interactPulse - dt);
}

function moveCityPlayer(dt) {
  const city = state.city;
  const dx = Number(state.keys.right) - Number(state.keys.left);
  const dy = Number(state.keys.down) - Number(state.keys.up);
  const distance = Math.hypot(dx, dy);

  if (!distance) {
    city.moving = false;
    return;
  }

  const step = city.speed * dt;
  city.x = clamp(city.x + (dx / distance) * step, PLAYER_RADIUS + 18, CITY.width - PLAYER_RADIUS - 18);
  city.y = clamp(city.y + (dy / distance) * step, PLAYER_RADIUS + 18, CITY.height - PLAYER_RADIUS - 18);
  city.facing = Math.atan2(dy, dx);
  city.moving = true;
}

function updateCityCamera(dt) {
  const target = state.city.bike.mounted ? state.city.bike : state.city;
  const targetX = target.x - state.width / 2;
  const targetY = target.y - state.height / 2;
  state.city.camera.x += (targetX - state.city.camera.x) * Math.min(1, dt * 7.5);
  state.city.camera.y += (targetY - state.city.camera.y) * Math.min(1, dt * 7.5);
  clampCityCamera();
}

function updateCityBike(dt) {
  const bike = state.city.bike;
  const steer = Number(state.keys.right) - Number(state.keys.left);
  const braking = state.keys.down && !bike.clutch;
  const throttle = state.keys.up && !bike.clutch && bike.gear > 0;
  const maxForwardSpeed = bike.gear === 2 ? 330 : 205;
  const acceleration = bike.gear === 2 ? 96 : 66;
  const brakeForce = 290;
  const reverseSpeed = 34;
  const reverseAcceleration = 42;
  const drag = bike.clutch ? 14 : 22;

  if (Math.abs(bike.speed) > 1 && steer) {
    const steerStrength = (0.95 + Math.min(Math.abs(bike.speed) / 170, 1.4)) * (bike.speed < 0 ? -1 : 1);
    bike.angle += steer * steerStrength * dt;
  }

  if (throttle) {
    bike.speed = Math.min(maxForwardSpeed, bike.speed + acceleration * dt);
  } else if (braking) {
    if (bike.speed > 0) {
      bike.speed = Math.max(0, bike.speed - brakeForce * dt);
    } else {
      bike.speed = Math.max(-reverseSpeed, bike.speed - reverseAcceleration * dt);
    }
  } else {
    bike.speed = approach(bike.speed, 0, drag * dt);
  }

  bike.x += Math.cos(bike.angle) * bike.speed * dt;
  bike.y += Math.sin(bike.angle) * bike.speed * dt;

  const clampedX = clamp(bike.x, PLAYER_RADIUS + 24, CITY.width - PLAYER_RADIUS - 24);
  const clampedY = clamp(bike.y, PLAYER_RADIUS + 24, CITY.height - PLAYER_RADIUS - 24);
  if (clampedX !== bike.x || clampedY !== bike.y) {
    bike.speed = 0;
  }
  bike.x = clampedX;
  bike.y = clampedY;

  const speedRatio = clamp(Math.abs(bike.speed) / maxForwardSpeed, 0, 1);
  let targetRpm = 1050 + speedRatio * 7200 + (bike.gear === 2 ? 950 : 420);
  if (throttle) {
    targetRpm += 1800;
  }
  if (bike.clutch) {
    targetRpm = state.keys.up ? 3800 : 1250;
  }
  if (braking && bike.speed <= 0) {
    targetRpm = 1200;
  }
  bike.rpm += (clamp(targetRpm, 900, 10000) - bike.rpm) * Math.min(1, dt * 7.5);

  state.city.x = bike.x;
  state.city.y = bike.y;
  state.city.facing = bike.angle;
  state.city.moving = Math.abs(bike.speed) > 3;
}

function clampCityCamera() {
  state.city.camera.x = clamp(state.city.camera.x, 0, Math.max(0, CITY.width - state.width));
  state.city.camera.y = clamp(state.city.camera.y, 0, Math.max(0, CITY.height - state.height));
}

function updateCityCars(dt) {
  for (const car of state.city.cars) {
    car.pause = shouldCityCarPause(car);
    car.bumpTimer = Math.max(0, (car.bumpTimer || 0) - dt);
    const speed = car.pause ? car.speed * 0.18 : car.speed;

    if (car.road === "h") {
      car.x += car.direction * speed * dt;
      if (car.direction > 0 && car.x > CITY.width + 90) {
        car.x = -90;
        rollCityCarVariant(car);
      } else if (car.direction < 0 && car.x < -90) {
        car.x = CITY.width + 90;
        rollCityCarVariant(car);
      }
    } else {
      car.y += car.direction * speed * dt;
      if (car.direction > 0 && car.y > CITY.height + 90) {
        car.y = -90;
        rollCityCarVariant(car);
      } else if (car.direction < 0 && car.y < -90) {
        car.y = CITY.height + 90;
        rollCityCarVariant(car);
      }
    }
  }
}

function updateCityCokeDrops(dt) {
  for (const drop of state.city.cokeDrops) {
    drop.age += dt;
    drop.life -= dt;
  }

  state.city.cokeDrops = state.city.cokeDrops.filter((drop) => drop.life > 0);
}

function updateCityVehicleCollisions() {
  const bike = state.city.bike;
  if (!bike.mounted) {
    return;
  }

  for (const car of state.city.cars) {
    const carCenter = getCityCarCenter(car);
    const dx = bike.x - carCenter.x;
    const dy = bike.y - carCenter.y;
    const distance = Math.hypot(dx, dy) || 1;
    const minDistance = CITY_BIKE_COLLISION_RADIUS + CITY_CAR_COLLISION_RADIUS;

    if (distance >= minDistance) {
      continue;
    }

    const overlap = minDistance - distance;
    const nx = dx / distance;
    const ny = dy / distance;
    const bikeBack = Math.max(10, overlap * 0.55);
    const carBack = Math.max(8, overlap * 0.45);

    bike.x = clamp(bike.x + nx * bikeBack - Math.cos(bike.angle) * 10, PLAYER_RADIUS + 24, CITY.width - PLAYER_RADIUS - 24);
    bike.y = clamp(bike.y + ny * bikeBack - Math.sin(bike.angle) * 10, PLAYER_RADIUS + 24, CITY.height - PLAYER_RADIUS - 24);
    bike.speed *= -0.18;
    bike.rpm = Math.max(1000, bike.rpm * 0.72);

    moveCityCarBackward(car, carBack + 12);
    car.bumpTimer = 0.2;
    const bumpX = (bike.x + carCenter.x) / 2;
    const bumpY = (bike.y + carCenter.y) / 2;
    burstCityBump(bumpX, bumpY);
    if (car.isCokeCar && car.cokeLootReady) {
      collectCokeCanFromCar(car, bumpX, bumpY);
    } else {
      setMessage("Choque suave", 0.8);
    }
    break;
  }

  state.city.x = bike.x;
  state.city.y = bike.y;
}

function getCityCarCenter(car) {
  return {
    x: car.road === "h" ? car.x : car.x + car.laneOffset,
    y: car.road === "h" ? car.y + car.laneOffset : car.y,
  };
}

function moveCityCarBackward(car, distance) {
  if (car.road === "h") {
    car.x = clamp(car.x - car.direction * distance, -90, CITY.width + 90);
    return;
  }

  car.y = clamp(car.y - car.direction * distance, -90, CITY.height + 90);
}

function burstCityBump(x, y) {
  for (let index = 0; index < 10; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 55;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: index % 2 ? "#f2c14e" : "#f7f3e8",
      life: 0.28 + Math.random() * 0.22,
    });
  }
}

function collectCokeCanFromCar(car, x, y) {
  car.cokeLootReady = false;
  state.inventory.coke += 1;
  state.city.cokeDrops.push({
    x,
    y,
    age: 0,
    life: 2.1,
  });
  for (let index = 0; index < 12; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 28 + Math.random() * 74;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: index % 2 ? "#ffffff" : "#d71920",
      life: 0.42 + Math.random() * 0.28,
    });
  }
  scheduleEsterosSave();
  setMessage("Lata de Coca-Cola +1", 1.3);
}

function shouldCityCarPause(car) {
  return state.city.trafficLights.some((light) => {
    const red = cityLightState(light) === "red";
    if (!red) {
      return false;
    }

    if (car.road === "h") {
      return Math.abs(car.y - light.y) < 32 && Math.abs(car.x - light.x) < 85;
    }

    return Math.abs(car.x - light.x) < 32 && Math.abs(car.y - light.y) < 85;
  });
}

function cityLightState(light) {
  const cycle = (state.time + light.phase) % 5.4;
  if (cycle < 2.4) {
    return "green";
  }

  if (cycle < 3.2) {
    return "yellow";
  }

  return "red";
}

function isNearCityBike() {
  const bike = state.city.bike;
  return Math.hypot(state.city.x - bike.x, state.city.y - bike.y) <= 82;
}

function mountCityBike() {
  const bike = state.city.bike;
  bike.mounted = true;
  bike.clutch = false;
  bike.gear = 1;
  bike.speed = 0;
  bike.rpm = Math.max(1100, bike.rpm);
  bike.angle = state.city.facing || 0;
  state.city.x = bike.x;
  state.city.y = bike.y;
  state.city.moving = false;
  state.keys.up = false;
  state.keys.down = false;
  state.keys.left = false;
  state.keys.right = false;
  setMessage("Subiste a la moto", 1.3);
}

function dismountCityBike() {
  const bike = state.city.bike;
  bike.mounted = false;
  bike.clutch = false;
  bike.speed = 0;
  bike.rpm = 1100;
  state.city.x = clamp(bike.x - 44, PLAYER_RADIUS + 18, CITY.width - PLAYER_RADIUS - 18);
  state.city.y = clamp(bike.y + 22, PLAYER_RADIUS + 18, CITY.height - PLAYER_RADIUS - 18);
  state.city.moving = false;
  state.keys.up = false;
  state.keys.down = false;
  state.keys.left = false;
  state.keys.right = false;
}

function shiftBikeGear(gear) {
  const bike = state.city.bike;
  bike.gear = gear;
  bike.interactPulse = 0.45;
  setMessage(gear === 2 ? "Segunda" : "Primera", 0.7);
}

function updateChewing(dt) {
  if (!state.chewing) {
    return;
  }

  const resourceTarget = state.resources.find((item) => item.id === state.chewing.resourceId);
  if (!resourceTarget || !isInRange(resourceTarget)) {
    state.chewing = null;
    setMessage("Fuera de alcance", 1.2);
    return;
  }

  state.chewing.progress += dt / state.chewing.duration;
  if (state.chewing.progress < 1) {
    return;
  }

  harvest(resourceTarget);
  state.chewing = null;
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }

  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.clickPulse) {
    state.clickPulse.life -= dt;
    if (state.clickPulse.life <= 0) {
      state.clickPulse = null;
    }
  }
}

function updateHud() {
  stage.dataset.scene = state.scene;
  stage.classList.toggle("is-mounted", state.scene === "city" && state.city.bike.mounted);
  bananaCount.textContent = state.inventory.banana;
  bambooCount.textContent = state.inventory.bamboo;
  leafCount.textContent = state.inventory.leaves;
  cokeCount.textContent = state.inventory.coke;
  statusText.textContent = state.messageTimer > 0 ? state.message : defaultStatus();
  updateMotoDashboard();

  for (const button of travelButtons) {
    button.classList.toggle("is-active", button.dataset.scene === state.scene);
  }

  if (state.scene === "city") {
    if (state.city.bike.mounted) {
      selectedName.textContent = "Moto cross";
      selectedDetails.textContent = `${gearLabel(state.city.bike.gear)} · ${Math.round(state.city.bike.rpm).toLocaleString("es-AR")} rpm`;
    } else if (isNearCityBike()) {
      selectedName.textContent = "Moto cross";
      selectedDetails.textContent = "Espacio para subir";
    } else {
      selectedName.textContent = "Ciudad";
      selectedDetails.textContent = "Calles y semaforos";
    }
    chewButton.disabled = true;
    chewButton.textContent = "Roer";
    moveStructureButton.disabled = true;
    moveStructureButton.classList.remove("is-active");
    return;
  }

  if (state.scene === "river") {
    selectedName.textContent = "Rio";
    selectedDetails.textContent = `${Math.floor(state.river.distance).toLocaleString("es-AR")} m · carril ${
      state.river.playerLane + 1
    }/${RIVER_LANES}`;
    chewButton.disabled = true;
    chewButton.textContent = "Roer";
    moveStructureButton.disabled = true;
    moveStructureButton.classList.remove("is-active");
    return;
  }

  const selected = getSelectedEntity();
  if (state.movingStructureId) {
    const moving = state.structures.find((item) => item.id === state.movingStructureId);
    selectedName.textContent = moving ? moving.name : "Mover";
    selectedDetails.textContent = "Elegí nuevo lugar";
    chewButton.disabled = true;
  } else if (!selected) {
    selectedName.textContent = state.buildMode ? BUILDINGS[state.buildMode].name : "Nada";
    selectedDetails.textContent = state.buildMode ? "Ubicando estructura" : "Esteros";
    chewButton.disabled = true;
  } else if (selected.kind === "resource") {
    const config = RESOURCE_TYPES[selected.entity.type];
    selectedName.textContent = config.name;
    selectedDetails.textContent = `${selected.entity.health}/${selected.entity.maxHealth} · ${config.materialText}`;
    chewButton.disabled = !isInRange(selected.entity) || Boolean(state.chewing);
  } else {
    selectedName.textContent = selected.entity.name;
    selectedDetails.textContent = selected.entity.detail;
    chewButton.disabled = true;
  }

  chewButton.textContent = state.chewing ? "Royendo..." : "Roer";
  const canMoveStructure = selected?.kind === "structure" || Boolean(state.movingStructureId);
  moveStructureButton.disabled = !canMoveStructure;
  moveStructureButton.classList.toggle("is-active", Boolean(state.movingStructureId));
  moveStructureButton.textContent = state.movingStructureId ? "Colocar" : "Mover";

  for (const button of buildButtons) {
    const buildId = button.dataset.build;
    button.classList.toggle("is-active", state.buildMode === buildId);
    button.classList.toggle("is-locked", !canPay(BUILDINGS[buildId].cost));
  }
}

function defaultStatus() {
  if (state.scene === "city") {
    if (state.city.bike.mounted) {
      return state.city.bike.clutch ? "Embrague apretado" : `Moto ${gearLabel(state.city.bike.gear)}`;
    }

    if (isNearCityBike()) {
      return "Espacio para subir";
    }

    return state.city.moving ? "Caminando en ciudad" : "En la ciudad";
  }

  if (state.scene === "river") {
    return `${Math.floor(state.river.distance).toLocaleString("es-AR")} m en el rio`;
  }

  if (state.chewing) {
    return "Royendo";
  }

  if (state.buildMode) {
    return "Construyendo";
  }

  return state.player.moving ? "Caminando" : "Explorando";
}

function updateMotoDashboard() {
  const bike = state.city.bike;
  const mounted = state.scene === "city" && bike.mounted;
  const rpm = mounted ? Math.round(bike.rpm) : 0;
  rpmValue.textContent = rpm.toLocaleString("es-AR");
  rpmFill.style.width = `${clamp((rpm / 10000) * 100, 0, 100)}%`;
  gearValue.textContent = mounted ? gearLabel(bike.gear) : "1";
  speedValue.textContent = mounted ? Math.round(Math.abs(bike.speed) * 0.16).toString() : "0";
  clutchValue.textContent = mounted && bike.clutch ? "apretado" : "suelto";
}

function gearLabel(gear) {
  if (gear === 2) {
    return "2";
  }

  return "1";
}

function getSelectedEntity() {
  if (!state.selected) {
    return null;
  }

  if (state.selected.kind === "resource") {
    const found = state.resources.find((item) => item.id === state.selected.id);
    return found ? { kind: "resource", entity: found } : null;
  }

  const found = state.structures.find((item) => item.id === state.selected.id);
  return found ? { kind: "structure", entity: found } : null;
}

function setMessage(message, seconds = 1.6) {
  state.message = message;
  state.messageTimer = seconds;
}

function setScene(scene) {
  if (state.scene === scene) {
    return;
  }

  if (state.scene === "city" && scene !== "city" && state.city.bike.mounted) {
    dismountCityBike();
  }

  state.scene = scene;
  state.buildMode = null;
  state.chewing = null;
  state.selected = null;
  state.clickPulse = null;
  state.particles = [];

  if (scene === "land") {
    state.lastFrame = performance.now();
    showTransitionSign("esteros");
    setMessage("Esteros", 1.2);
  } else if (scene === "city") {
    state.lastFrame = performance.now();
    state.keys.up = false;
    state.keys.down = false;
    state.keys.left = false;
    state.keys.right = false;
    state.city.camera.x = state.city.x - state.width / 2;
    state.city.camera.y = state.city.y - state.height / 2;
    clampCityCamera();
    showTransitionSign("ciudad");
    setMessage("Ciudad", 1.2);
  } else if (scene === "river") {
    resetRiver();
    showTransitionSign("rio");
    setMessage("Rio", 1.2);
  }

  updateHud();
}

function showTransitionSign(label) {
  state.transitionSign = {
    label,
    life: 1.45,
    duration: 1.45,
  };
}

function updateTransitionSign(dt) {
  if (!state.transitionSign) {
    return;
  }

  state.transitionSign.life -= dt;
  if (state.transitionSign.life <= 0) {
    state.transitionSign = null;
  }
}

function canvasToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left + state.camera.x,
    y: event.clientY - rect.top + state.camera.y,
  };
}

function handlePointerDown(event) {
  if (state.scene === "river") {
    handleRiverPointerDown(event);
    return;
  }

  if (state.scene === "city") {
    setMessage("Ciudad", 1);
    return;
  }

  const point = canvasToWorld(event);
  updateMouse(event);

  if (state.movingStructureId) {
    placeMovingStructure(point.x, point.y);
    return;
  }

  if (state.buildMode) {
    tryBuild(point.x, point.y);
    return;
  }

  const resourceTarget = findResourceAt(point.x, point.y);
  if (resourceTarget) {
    state.selected = { kind: "resource", id: resourceTarget.id };
    moveNear(resourceTarget);
    setMessage("Recurso marcado");
    return;
  }

  const structureTarget = findStructureAt(point.x, point.y);
  if (structureTarget) {
    state.selected = { kind: "structure", id: structureTarget.id };
    setTarget(point.x, point.y);
    setMessage(structureTarget.name);
    return;
  }

  state.selected = null;
  setTarget(point.x, point.y);
  setMessage("Destino marcado", 0.9);
}

function updateMouse(event) {
  const point = canvasToWorld(event);
  state.mouse.x = event.clientX - canvas.getBoundingClientRect().left;
  state.mouse.y = event.clientY - canvas.getBoundingClientRect().top;
  state.mouse.worldX = point.x;
  state.mouse.worldY = point.y;
}

function setTarget(x, y) {
  state.chewing = null;
  state.movingStructureId = null;
  state.player.targetX = clamp(x, PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
  state.player.targetY = clamp(y, PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
  state.clickPulse = { x: state.player.targetX, y: state.player.targetY, life: 0.5 };
}

function moveNear(entity) {
  const dx = state.player.x - entity.x;
  const dy = state.player.y - entity.y;
  const distance = Math.hypot(dx, dy) || 1;
  const stopDistance = entity.radius + PLAYER_RADIUS + 16;
  const targetX = entity.x + (dx / distance) * stopDistance;
  const targetY = entity.y + (dy / distance) * stopDistance;
  setTarget(targetX, targetY);
}

function findResourceAt(x, y) {
  return [...state.resources]
    .sort((a, b) => b.y - a.y)
    .find((item) => Math.hypot(item.x - x, item.y - y) <= item.radius + 16);
}

function findStructureAt(x, y) {
  return state.structures.find((item) => {
    const halfW = item.width / 2;
    const halfH = item.height / 2;
    return x >= item.x - halfW && x <= item.x + halfW && y >= item.y - halfH && y <= item.y + halfH;
  });
}

function startChewing() {
  const selected = getSelectedEntity();
  if (!selected || selected.kind !== "resource") {
    setMessage("Sin recurso", 1.1);
    return;
  }

  if (!isInRange(selected.entity)) {
    moveNear(selected.entity);
    setMessage("Acercandose", 1.1);
    return;
  }

  if (state.chewing) {
    return;
  }

  state.chewing = {
    resourceId: selected.entity.id,
    progress: 0,
    duration: 0.82,
  };
  setMessage("Royendo", 0.82);
}

function harvest(resourceTarget) {
  const config = RESOURCE_TYPES[resourceTarget.type];
  resourceTarget.health -= 1;

  for (const [material, amount] of Object.entries(config.yield)) {
    state.inventory[material] += amount;
  }

  burst(resourceTarget.x, resourceTarget.y, resourceTarget.type === "banana" ? "#f2c14e" : "#7cc18d");
  scheduleEsterosSave();

  if (resourceTarget.health <= 0) {
    state.resources = state.resources.filter((item) => item.id !== resourceTarget.id);
    state.resourceRespawns.push({
      type: resourceTarget.type,
      x: resourceTarget.spawnX,
      y: resourceTarget.spawnY,
      timer: 10 + Math.random() * 8,
    });
    state.selected = null;
    scheduleEsterosSave();
    setMessage("Material agotado", 1.4);
    return;
  }

  setMessage("Material recolectado", 1.1);
}

function updateResourceRespawns(dt) {
  for (const respawn of state.resourceRespawns) {
    respawn.timer -= dt;
  }

  const readyRespawns = state.resourceRespawns.filter((respawn) => respawn.timer <= 0);
  state.resourceRespawns = state.resourceRespawns.filter((respawn) => respawn.timer > 0);

  for (const respawn of readyRespawns) {
    const point = findResourceRespawnPoint(respawn);
    if (!point) {
      respawn.timer = 5;
      state.resourceRespawns.push(respawn);
      continue;
    }

    state.resources.push(resource(respawn.type, point.x, point.y));
    scheduleEsterosSave();
  }
}

function findResourceRespawnPoint(respawn) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const distance = attempt === 0 ? 0 : 35 + Math.random() * 150;
    const angle = Math.random() * Math.PI * 2;
    const point = {
      x: clamp(respawn.x + Math.cos(angle) * distance, 70, WORLD.width - 70),
      y: clamp(respawn.y + Math.sin(angle) * distance, 90, WORLD.height - 90),
    };

    if (isResourceSpawnFree(point.x, point.y, RESOURCE_TYPES[respawn.type].radius)) {
      return point;
    }
  }

  return null;
}

function isResourceSpawnFree(x, y, radius) {
  const nearResource = state.resources.some((item) => Math.hypot(item.x - x, item.y - y) < item.radius + radius + 32);
  if (nearResource) {
    return false;
  }

  return !state.structures.some((item) => {
    const nearestX = clamp(x, item.x - item.width / 2, item.x + item.width / 2);
    const nearestY = clamp(y, item.y - item.height / 2, item.y + item.height / 2);
    return Math.hypot(x - nearestX, y - nearestY) < radius + 18;
  });
}

function isInRange(entity) {
  return Math.hypot(state.player.x - entity.x, state.player.y - entity.y) <= entity.radius + INTERACT_RANGE;
}

function setBuildMode(buildId) {
  state.selected = null;
  state.chewing = null;
  state.movingStructureId = null;
  state.buildMode = state.buildMode === buildId ? null : buildId;
  setMessage(state.buildMode ? BUILDINGS[state.buildMode].name : "Construccion cancelada");
}

function toggleMoveSelectedStructure() {
  if (state.movingStructureId) {
    state.movingStructureId = null;
    setMessage("Movimiento cancelado", 1);
    return;
  }

  const selected = getSelectedEntity();
  if (!selected || selected.kind !== "structure") {
    setMessage("Sin estructura", 1);
    return;
  }

  state.buildMode = null;
  state.chewing = null;
  state.movingStructureId = selected.entity.id;
  setMessage("Mover estructura", 1.2);
}

function placeMovingStructure(x, y) {
  const structure = state.structures.find((item) => item.id === state.movingStructureId);
  if (!structure) {
    state.movingStructureId = null;
    return;
  }

  const placement = {
    x: clamp(x, structure.width / 2 + 8, WORLD.width - structure.width / 2 - 8),
    y: clamp(y, structure.height / 2 + 8, WORLD.height - structure.height / 2 - 8),
    width: structure.width,
    height: structure.height,
  };

  if (!isStructureMoveSpotFree(placement, structure.id)) {
    setMessage("Lugar ocupado", 1.2);
    return;
  }

  structure.x = placement.x;
  structure.y = placement.y;
  structure.width = placement.width;
  structure.height = placement.height;
  state.selected = { kind: "structure", id: structure.id };
  state.movingStructureId = null;
  burst(structure.x, structure.y, "#f2c14e");
  scheduleEsterosSave();
  setMessage("Estructura movida", 1.3);
}

function isStructureMoveSpotFree(placement, ignoredStructureId) {
  const tooCloseToPlayer = Math.hypot(state.player.x - placement.x, state.player.y - placement.y) < 58;
  if (tooCloseToPlayer) {
    return false;
  }

  const resourceCollision = state.resources.some((item) => {
    const nearestX = clamp(item.x, placement.x - placement.width / 2, placement.x + placement.width / 2);
    const nearestY = clamp(item.y, placement.y - placement.height / 2, placement.y + placement.height / 2);
    return Math.hypot(item.x - nearestX, item.y - nearestY) < item.radius + 10;
  });

  if (resourceCollision) {
    return false;
  }

  return !state.structures.some((item) => {
    if (item.id === ignoredStructureId) {
      return false;
    }

    return (
      Math.abs(item.x - placement.x) < item.width / 2 + placement.width / 2 + 10 &&
      Math.abs(item.y - placement.y) < item.height / 2 + placement.height / 2 + 10
    );
  });
}

function tryBuild(x, y) {
  const blueprint = BUILDINGS[state.buildMode];
  if (!blueprint) {
    return;
  }

  if (!canPay(blueprint.cost)) {
    setMessage("Material insuficiente", 1.5);
    return;
  }

  const placement = {
    x: clamp(x, blueprint.size.width / 2 + 8, WORLD.width - blueprint.size.width / 2 - 8),
    y: clamp(y, blueprint.size.height / 2 + 8, WORLD.height - blueprint.size.height / 2 - 8),
    width: blueprint.size.width,
    height: blueprint.size.height,
  };

  if (state.buildMode === "refugio") {
    const mergeTarget = findRefugioMergeTarget(placement);
    if (mergeTarget) {
      const mergedPlacement = createMergedRefugioPlacement(mergeTarget, placement);
      if (!isMergedRefugioSpotFree(mergedPlacement, mergeTarget.id)) {
        setMessage("Mejora bloqueada", 1.3);
        return;
      }

      pay(blueprint.cost);
      state.structures = state.structures.filter((item) => item.id !== mergeTarget.id);
      state.structures.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `refugio-grande-${Date.now()}`,
        type: "refugio_grande",
        name: BUILDINGS.refugio_grande.name,
        detail: "Mejora creada al unir dos refugios",
        ...mergedPlacement,
      });
      burst(mergedPlacement.x, mergedPlacement.y, "#f2c14e");
      state.buildMode = null;
      state.selected = null;
      scheduleEsterosSave();
      setMessage("Refugio mejorado", 1.6);
      return;
    }
  }

  if (!isBuildSpotFree(placement)) {
    setMessage("Lugar ocupado", 1.3);
    return;
  }

  pay(blueprint.cost);
  state.structures.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${state.buildMode}-${Date.now()}`,
    type: state.buildMode,
    name: blueprint.name,
    detail: "Estructura colocada",
    ...placement,
  });
  burst(placement.x, placement.y, "#f2c14e");
  state.buildMode = null;
  scheduleEsterosSave();
  setMessage("Estructura lista", 1.5);
}

function findRefugioMergeTarget(placement) {
  return state.structures.find((item) => {
    if (item.type !== "refugio") {
      return false;
    }

    return areRefugiosSideBySide(item, placement);
  });
}

function areRefugiosSideBySide(existing, placement) {
  const dx = Math.abs(existing.x - placement.x);
  const dy = Math.abs(existing.y - placement.y);
  const horizontalTouch = dx <= existing.width / 2 + placement.width / 2 + 42 && dy <= Math.max(existing.height, placement.height) * 0.72;
  const verticalTouch = dy <= existing.height / 2 + placement.height / 2 + 34 && dx <= Math.max(existing.width, placement.width) * 0.72;
  const tooOverlapped = dx < (existing.width + placement.width) * 0.24 && dy < (existing.height + placement.height) * 0.24;

  return (horizontalTouch || verticalTouch) && !tooOverlapped;
}

function createMergedRefugioPlacement(existing, placement) {
  const horizontal = Math.abs(existing.x - placement.x) >= Math.abs(existing.y - placement.y);
  const width = horizontal ? BUILDINGS.refugio_grande.size.width : 164;
  const height = horizontal ? BUILDINGS.refugio_grande.size.height : 184;

  return {
    x: clamp((existing.x + placement.x) / 2, width / 2 + 8, WORLD.width - width / 2 - 8),
    y: clamp((existing.y + placement.y) / 2, height / 2 + 8, WORLD.height - height / 2 - 8),
    width,
    height,
  };
}

function isMergedRefugioSpotFree(placement, ignoredStructureId) {
  const resourceCollision = state.resources.some((item) => {
    const nearestX = clamp(item.x, placement.x - placement.width / 2, placement.x + placement.width / 2);
    const nearestY = clamp(item.y, placement.y - placement.height / 2, placement.y + placement.height / 2);
    return Math.hypot(item.x - nearestX, item.y - nearestY) < item.radius + 10;
  });

  if (resourceCollision) {
    return false;
  }

  return !state.structures.some((item) => {
    if (item.id === ignoredStructureId) {
      return false;
    }

    return (
      Math.abs(item.x - placement.x) < item.width / 2 + placement.width / 2 + 10 &&
      Math.abs(item.y - placement.y) < item.height / 2 + placement.height / 2 + 10
    );
  });
}

function isBuildSpotFree(placement) {
  const tooCloseToPlayer = Math.hypot(state.player.x - placement.x, state.player.y - placement.y) < 58;
  if (tooCloseToPlayer) {
    return false;
  }

  const resourceCollision = state.resources.some((item) => {
    const nearestX = clamp(item.x, placement.x - placement.width / 2, placement.x + placement.width / 2);
    const nearestY = clamp(item.y, placement.y - placement.height / 2, placement.y + placement.height / 2);
    return Math.hypot(item.x - nearestX, item.y - nearestY) < item.radius + 10;
  });

  const structureCollision = state.structures.some((item) => {
    return (
      Math.abs(item.x - placement.x) < item.width / 2 + placement.width / 2 + 10 &&
      Math.abs(item.y - placement.y) < item.height / 2 + placement.height / 2 + 10
    );
  });

  return !resourceCollision && !structureCollision;
}

function canPay(cost) {
  return Object.entries(cost).every(([material, amount]) => state.inventory[material] >= amount);
}

function pay(cost) {
  for (const [material, amount] of Object.entries(cost)) {
    state.inventory[material] -= amount;
  }
}

function burst(x, y, color) {
  for (let index = 0; index < 16; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 26 + Math.random() * 68;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.45 + Math.random() * 0.35,
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, state.width, state.height);

  if (state.scene === "city") {
    drawCityScene();
    drawVignette();
    drawTransitionSign();
    return;
  }

  if (state.scene === "river") {
    drawRiverScene();
    drawVignette();
    drawTransitionSign();
    return;
  }

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawTerrain();
  drawDestination();
  drawStructures();
  drawResources();
  drawBuildGhost();
  drawMoveStructureGhost();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawVignette();
  drawTransitionSign();
}

function drawTerrain() {
  const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  gradient.addColorStop(0, "#3f6b3f");
  gradient.addColorStop(0.46, "#657947");
  gradient.addColorStop(1, "#9b7548");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(47, 127, 143, 0.88)";
  ctx.beginPath();
  ctx.ellipse(1425, 180, 310, 125, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(244, 228, 174, 0.24)";
  ctx.beginPath();
  ctx.ellipse(1465, 195, 250, 80, -0.14, 0, Math.PI * 2);
  ctx.fill();

  for (const mark of state.groundMarks) {
    ctx.fillStyle =
      mark.tone === "light" ? `rgba(247, 243, 232, ${mark.alpha})` : `rgba(30, 25, 17, ${mark.alpha})`;
    ctx.beginPath();
    ctx.ellipse(mark.x, mark.y, mark.radius * 1.5, mark.radius, Math.sin(mark.x) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(93, 67, 43, 0.28)";
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(120, 1040);
  ctx.bezierCurveTo(450, 830, 540, 590, 900, 550);
  ctx.bezierCurveTo(1190, 520, 1300, 405, 1600, 255);
  ctx.stroke();

  ctx.fillStyle = "rgba(247, 243, 232, 0.65)";
  for (const flower of state.flowers) {
    ctx.fillStyle = flower.color;
    ctx.beginPath();
    ctx.arc(flower.x, flower.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(247, 243, 232, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, WORLD.width - 24, WORLD.height - 24);
}

function drawCityScene() {
  ctx.save();
  ctx.translate(-state.city.camera.x, -state.city.camera.y);

  const gradient = ctx.createLinearGradient(0, 0, CITY.width, CITY.height);
  gradient.addColorStop(0, "#7c704f");
  gradient.addColorStop(0.44, "#927b53");
  gradient.addColorStop(1, "#526e4a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CITY.width, CITY.height);

  for (const plaza of state.city.plazas) {
    ctx.fillStyle = "rgba(94, 142, 80, 0.72)";
    ctx.beginPath();
    ctx.ellipse(plaza.x, plaza.y, plaza.radius, plaza.radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(247, 243, 232, 0.18)";
    ctx.beginPath();
    ctx.ellipse(plaza.x + 14, plaza.y - 8, plaza.radius * 0.56, plaza.radius * 0.24, -0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCityRoads();
  drawCityBlocks();
  drawCityCars();
  drawCityCokeDrops();
  drawCityTrafficLights();
  drawCityBike();
  if (!state.city.bike.mounted) {
    drawCityPlayer();
  }
  drawParticles();

  ctx.restore();
}

function drawCityRoads() {
  const horizontalRoads = [520, 1030, 1510];
  const verticalRoads = [700, 1390, 2070];

  ctx.lineCap = "butt";
  for (const y of horizontalRoads) {
    ctx.strokeStyle = "#4a4945";
    ctx.lineWidth = 112;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CITY.width, y);
    ctx.stroke();

    ctx.strokeStyle = "#c7b985";
    ctx.lineWidth = 4;
    ctx.setLineDash([34, 34]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CITY.width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const x of verticalRoads) {
    ctx.strokeStyle = "#4a4945";
    ctx.lineWidth = 112;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CITY.height);
    ctx.stroke();

    ctx.strokeStyle = "#c7b985";
    ctx.lineWidth = 4;
    ctx.setLineDash([34, 34]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CITY.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "rgba(247, 243, 232, 0.7)";
  ctx.lineWidth = 5;
  for (const x of verticalRoads) {
    for (const y of horizontalRoads) {
      for (let stripe = -42; stripe <= 42; stripe += 14) {
        ctx.beginPath();
        ctx.moveTo(x - 52, y + stripe);
        ctx.lineTo(x + 52, y + stripe);
        ctx.stroke();
      }
    }
  }
}

function drawCityBlocks() {
  const buildings = [
    [260, 250, "#b77a48", "#d5a15b"],
    [1030, 265, "#8f633e", "#cf7d3e"],
    [1720, 250, "#a56e43", "#e3b15e"],
    [2410, 760, "#8d6344", "#c46f43"],
    [330, 840, "#9d6b43", "#d6a15c"],
    [1080, 795, "#7f6f52", "#d7b75f"],
    [1730, 820, "#b07a4d", "#e0a25c"],
    [360, 1280, "#926343", "#c84b3f"],
    [1090, 1335, "#a56e43", "#2f7f8f"],
    [1745, 1350, "#80694b", "#d5a15b"],
    [2470, 1340, "#a56e43", "#cf7d3e"],
  ];

  for (const [x, y, wall, roof] of buildings) {
    drawCityBuilding(x, y, wall, roof);
  }

  drawCityCanopy(1000, 1190, "#c84b3f");
  drawCityCanopy(1720, 1180, "#2f7f8f");
  drawCityCanopy(2380, 520, "#f2c14e");
}

function drawCityBuilding(x, y, wall, roof) {
  ctx.fillStyle = "rgba(20, 18, 12, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 54, 88, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = wall;
  roundRect(x - 62, y - 10, 124, 74, 8);
  ctx.fill();

  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 76, y - 8);
  ctx.lineTo(x, y - 58);
  ctx.lineTo(x + 76, y - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(36, 25, 15, 0.62)";
  roundRect(x - 12, y + 20, 24, 44, 5);
  ctx.fill();
}

function drawCityCanopy(x, y, color) {
  ctx.fillStyle = color;
  roundRect(x - 66, y - 18, 132, 34, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(247, 243, 232, 0.45)";
  ctx.lineWidth = 3;
  for (let stripe = -42; stripe <= 42; stripe += 28) {
    ctx.beginPath();
    ctx.moveTo(x + stripe, y - 16);
    ctx.lineTo(x + stripe + 8, y + 14);
    ctx.stroke();
  }

  ctx.strokeStyle = "#5d3d26";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 54, y + 16);
  ctx.lineTo(x - 54, y + 70);
  ctx.moveTo(x + 54, y + 16);
  ctx.lineTo(x + 54, y + 70);
  ctx.stroke();
}

function drawCityCars() {
  const sortedCars = [...state.city.cars].sort((a, b) => {
    const ay = a.road === "h" ? a.y + a.laneOffset : a.y;
    const by = b.road === "h" ? b.y + b.laneOffset : b.y;
    return ay - by;
  });

  for (const car of sortedCars) {
    drawCityCar(car);
  }
}

function drawCityCar(car) {
  const x = car.road === "h" ? car.x : car.x + car.laneOffset;
  const y = car.road === "h" ? car.y + car.laneOffset : car.y;
  const width = car.road === "h" ? 70 : 38;
  const height = car.road === "h" ? 38 : 70;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(20, 18, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(4, 15, width * 0.48, height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = car.bumpTimer > 0 ? "#f7f3e8" : car.color;
  roundRect(-width / 2, -height / 2, width, height, 8);
  ctx.fill();

  if (car.isCokeCar) {
    drawCokeCarMark(car, width, height);
  }

  ctx.fillStyle = "rgba(247, 243, 232, 0.52)";
  roundRect(-width * 0.18, -height * 0.26, width * 0.34, height * 0.2, 4);
  ctx.fill();

  ctx.fillStyle = car.pause ? "#ff6b5f" : "#f7f3e8";
  if (car.road === "h") {
    const nose = car.direction > 0 ? width / 2 - 6 : -width / 2 + 6;
    ctx.beginPath();
    ctx.arc(nose, -height * 0.22, 3, 0, Math.PI * 2);
    ctx.arc(nose, height * 0.22, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const nose = car.direction > 0 ? height / 2 - 6 : -height / 2 + 6;
    ctx.beginPath();
    ctx.arc(-width * 0.22, nose, 3, 0, Math.PI * 2);
    ctx.arc(width * 0.22, nose, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCokeCarMark(car, width, height) {
  ctx.save();
  if (car.road === "v") {
    ctx.rotate(-Math.PI / 2);
  }

  const markWidth = car.road === "v" ? height : width;
  const markHeight = car.road === "v" ? width : height;
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  roundRect(-markWidth * 0.42, -markHeight * 0.2, markWidth * 0.84, markHeight * 0.4, 7);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 900 11px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Coca-Cola", 0, 1);

  if (!car.cokeLootReady) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-markWidth * 0.22, markHeight * 0.16);
    ctx.lineTo(markWidth * 0.22, -markHeight * 0.16);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCityCokeDrops() {
  for (const drop of state.city.cokeDrops) {
    const progress = clamp(drop.age / 0.72, 0, 1);
    const y = drop.y - Math.sin(progress * Math.PI) * 34;
    const alpha = clamp(drop.life / 0.45, 0, 1);
    drawCokeCan(drop.x, y, alpha, state.time * 3 + drop.age * 9);
  }
}

function drawCokeCan(x, y, alpha = 1, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(rotation) * 0.18);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(20, 18, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(2, 12, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d71920";
  roundRect(-8, -14, 16, 27, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.ellipse(0, -14, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 13, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 900 7px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Coca", 0, 1);

  ctx.restore();
}

function drawCityTrafficLights() {
  for (const light of state.city.trafficLights) {
    const active = cityLightState(light);
    drawTrafficLight(light.x - 70, light.y - 70, active);
    drawTrafficLight(light.x + 70, light.y + 70, active);
  }
}

function drawTrafficLight(x, y, active) {
  ctx.fillStyle = "rgba(20, 18, 12, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 24, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#30271d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y + 44);
  ctx.stroke();

  ctx.fillStyle = "#1d1c18";
  roundRect(x - 11, y - 30, 22, 42, 5);
  ctx.fill();

  const lights = [
    ["red", "#ff5b53", -18],
    ["yellow", "#f2c14e", -5],
    ["green", "#7cc18d", 8],
  ];

  for (const [name, color, offset] of lights) {
    ctx.fillStyle = active === name ? color : "rgba(247, 243, 232, 0.18)";
    ctx.beginPath();
    ctx.arc(x, y + offset, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCityBike() {
  const bike = state.city.bike;
  const pulse = !bike.mounted && isNearCityBike() ? 0.45 + Math.sin(state.time * 8) * 0.16 : 0;

  if (pulse) {
    ctx.strokeStyle = `rgba(242, 193, 78, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(bike.x, bike.y + 12, 46, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.angle);
  ctx.scale(CITY_BIKE_SCALE, CITY_BIKE_SCALE);

  ctx.fillStyle = "rgba(20, 18, 12, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 24, 72, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  drawBikeWheel(-48, 14, 18);
  drawBikeWheel(52, 14, 20);

  ctx.strokeStyle = "#e07a2f";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-42, 5);
  ctx.lineTo(-6, -16);
  ctx.lineTo(24, 4);
  ctx.lineTo(-16, 8);
  ctx.lineTo(-42, 5);
  ctx.moveTo(24, 4);
  ctx.lineTo(52, 14);
  ctx.moveTo(-6, -16);
  ctx.lineTo(34, -20);
  ctx.stroke();

  ctx.strokeStyle = "#1f241f";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-18, -18);
  ctx.lineTo(18, -20);
  ctx.stroke();

  ctx.strokeStyle = "#e7e0c6";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(38, -18);
  ctx.lineTo(61, -30);
  ctx.moveTo(58, -31);
  ctx.lineTo(73, -25);
  ctx.stroke();

  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.ellipse(9, -10, 18, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7f3e8";
  ctx.beginPath();
  ctx.arc(72, -23, 5, 0, Math.PI * 2);
  ctx.fill();

  if (bike.mounted) {
    drawMountedCityRider();
  }

  ctx.restore();
}

function drawBikeWheel(x, y, radius) {
  ctx.fillStyle = "#171916";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d6d0be";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(247, 243, 232, 0.4)";
  ctx.lineWidth = 1.5;
  for (let spoke = 0; spoke < 6; spoke += 1) {
    const angle = state.time * 3 + spoke * (Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius - 6), y + Math.sin(angle) * (radius - 6));
    ctx.stroke();
  }
}

function drawMountedCityRider() {
  const lean = clamp(state.city.bike.speed / 260, -0.22, 0.22);

  ctx.save();
  ctx.translate(-6, -38);
  ctx.rotate(lean * 0.16);
  ctx.scale(0.82, 0.82);

  ctx.fillStyle = "#bf7f4a";
  ctx.beginPath();
  ctx.ellipse(-8, 0, 39, 22, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8f2f2b";
  ctx.beginPath();
  ctx.moveTo(3, -8);
  ctx.quadraticCurveTo(-12, -18, -29, -14);
  ctx.quadraticCurveTo(-20, -4, 2, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c84b3f";
  ctx.beginPath();
  ctx.ellipse(15, -6, 16, 7, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9c613d";
  ctx.beginPath();
  ctx.ellipse(30, -5, 31, 16, -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263f34";
  ctx.beginPath();
  ctx.ellipse(27, -27, 25, 9, -0.16, Math.PI * 0.06, Math.PI * 1.92);
  ctx.fill();

  ctx.fillStyle = "#1c120b";
  ctx.beginPath();
  ctx.arc(40, -10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b2d1d";
  ctx.beginPath();
  ctx.ellipse(59, 0, 6.5, 4.5, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCityPlayer() {
  const player = state.city;
  const bob = Math.sin(state.time * 8) * (player.moving ? 2 : 0.8);
  const direction = Math.cos(player.facing) < -0.15 ? -1 : 1;
  const walkCycle = player.moving ? state.time * 13 : 0;

  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.scale(direction, 1);
  ctx.rotate(Math.sin(player.facing) * 0.07);

  ctx.fillStyle = "rgba(20, 18, 12, 0.24)";
  ctx.beginPath();
  ctx.ellipse(4, 27, 44, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPlayerLegs(walkCycle, player.moving);

  ctx.fillStyle = "#bf7f4a";
  ctx.beginPath();
  ctx.ellipse(-9, 1, 42, 25, -0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 222, 166, 0.18)";
  ctx.beginPath();
  ctx.ellipse(-18, -7, 25, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8f2f2b";
  ctx.beginPath();
  ctx.moveTo(7, -10);
  ctx.quadraticCurveTo(-10, -22, -31, -18);
  ctx.quadraticCurveTo(-20, -7, 3, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c84b3f";
  ctx.beginPath();
  ctx.ellipse(18, -7, 18, 9, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9c613d";
  ctx.beginPath();
  ctx.ellipse(30, -5, 34, 18, -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b5333";
  ctx.beginPath();
  ctx.ellipse(48, 0, 22, 12, 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6f4229";
  ctx.beginPath();
  ctx.arc(13, -23, 7, 0, Math.PI * 2);
  ctx.arc(35, -23, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263f34";
  ctx.beginPath();
  ctx.ellipse(28, -28, 27, 10, -0.16, Math.PI * 0.06, Math.PI * 1.92);
  ctx.fill();

  ctx.fillStyle = "#1c120b";
  ctx.beginPath();
  ctx.arc(41, -10, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b2d1d";
  ctx.beginPath();
  ctx.ellipse(62, 1, 7, 5, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ad3b33";
  ctx.beginPath();
  ctx.ellipse(18, 7, 11, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCityCapybara(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.15, 1.15);

  ctx.fillStyle = "rgba(20, 18, 12, 0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 25, 46, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#bf7f4a";
  ctx.beginPath();
  ctx.ellipse(-8, 0, 42, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c84b3f";
  ctx.beginPath();
  ctx.ellipse(18, -6, 18, 8, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9c613d";
  ctx.beginPath();
  ctx.ellipse(31, -5, 33, 17, -0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263f34";
  ctx.beginPath();
  ctx.ellipse(29, -28, 27, 10, -0.16, Math.PI * 0.06, Math.PI * 1.92);
  ctx.fill();

  ctx.fillStyle = "#1c120b";
  ctx.beginPath();
  ctx.arc(41, -10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b2d1d";
  ctx.beginPath();
  ctx.ellipse(62, 1, 7, 5, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function resetRiver() {
  state.river.playerLane = 1;
  state.river.targetLane = 1;
  state.river.playerY = riverLaneCenter(1);
  state.river.obstacles = [];
  state.river.warnings = [];
  state.river.distance = 0;
  state.river.speed = 245;
  state.river.spawnTimer = 1.2;
  state.river.hitFlash = 0;
  state.river.ripples = Array.from({ length: 42 }, () => ({
    x: Math.random() * state.width,
    y: riverTop() + Math.random() * Math.max(80, riverHeight()),
    length: 24 + Math.random() * 70,
    speed: 70 + Math.random() * 120,
    alpha: 0.12 + Math.random() * 0.22,
  }));
}

function updateRiver(dt) {
  const river = state.river;
  river.distance += dt * river.speed * 0.1;
  river.speed = 245 + Math.min(130, river.distance * 0.035);
  river.hitFlash = Math.max(0, river.hitFlash - dt * 2.4);
  river.playerY += (riverLaneCenter(river.targetLane) - river.playerY) * Math.min(1, dt * 12);
  river.playerLane = river.targetLane;

  for (const ripple of river.ripples) {
    ripple.x -= ripple.speed * dt;
    if (ripple.x + ripple.length < 0) {
      ripple.x = state.width + Math.random() * 100;
      ripple.y = riverTop() + Math.random() * Math.max(80, riverHeight());
    }
  }

  river.spawnTimer -= dt;
  if (river.spawnTimer <= 0) {
    queueRiverWarning();
    const pressure = Math.min(0.44, river.distance / 1200);
    river.spawnTimer = 1.2 - pressure + Math.random() * 0.85;
  }

  for (const warning of river.warnings) {
    warning.timer -= dt;
  }

  const readyWarnings = river.warnings.filter((warning) => warning.timer <= 0);
  river.warnings = river.warnings.filter((warning) => warning.timer > 0);
  for (const warning of readyWarnings) {
    spawnRiverObstacle(warning.lane);
  }

  for (const obstacle of river.obstacles) {
    obstacle.x -= river.speed * dt;
    obstacle.bob += dt * 5;
  }

  for (const obstacle of river.obstacles) {
    if (riverObstacleCollides(obstacle)) {
      obstacle.hit = true;
      river.hitFlash = 1;
      river.distance = Math.max(0, river.distance - 18);
      burstRiverSplash(riverPlayerX() + 20, river.playerY);
      setMessage("Salpicadura", 0.8);
    }
  }

  river.obstacles = river.obstacles.filter((obstacle) => !obstacle.hit && obstacle.x + obstacle.width > -80);
}

function queueRiverWarning() {
  state.river.warnings.push({
    lane: Math.floor(Math.random() * RIVER_LANES),
    timer: 0.9,
  });
}

function spawnRiverObstacle(lane) {
  const kind = Math.random() > 0.42 ? "log" : "stone";
  const size = kind === "log" ? 1 + Math.random() * 0.28 : 0.85 + Math.random() * 0.24;
  state.river.obstacles.push({
    lane,
    kind,
    x: state.width + 86,
    width: kind === "log" ? 88 * size : 58 * size,
    height: kind === "log" ? 32 * size : 48 * size,
    bob: Math.random() * Math.PI * 2,
    hit: false,
  });
}

function riverObstacleCollides(obstacle) {
  if (obstacle.lane !== state.river.playerLane) {
    return false;
  }

  const player = {
    x: riverPlayerX() - 42,
    y: state.river.playerY - 22,
    width: 88,
    height: 42,
  };
  const object = {
    x: obstacle.x - obstacle.width / 2,
    y: riverLaneCenter(obstacle.lane) - obstacle.height / 2,
    width: obstacle.width,
    height: obstacle.height,
  };

  return (
    player.x < object.x + object.width &&
    player.x + player.width > object.x &&
    player.y < object.y + object.height &&
    player.y + player.height > object.y
  );
}

function moveRiverLane(direction) {
  state.river.targetLane = clamp(state.river.targetLane + direction, 0, RIVER_LANES - 1);
}

function handleRiverPointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const lane = clamp(Math.floor((y - riverTop()) / riverLaneHeight()), 0, RIVER_LANES - 1);
  state.river.targetLane = lane;
}

function riverTop() {
  return Math.max(170, state.height * 0.24);
}

function riverHeight() {
  return Math.max(180, state.height - riverTop() - 68);
}

function riverLaneHeight() {
  return riverHeight() / RIVER_LANES;
}

function riverLaneCenter(lane) {
  return riverTop() + riverLaneHeight() * lane + riverLaneHeight() / 2;
}

function riverPlayerX() {
  return state.width * 0.22;
}

function burstRiverSplash(x, y) {
  for (let index = 0; index < 22; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 120;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: index % 2 ? "#f7f3e8" : "#54c2b8",
      life: 0.38 + Math.random() * 0.32,
    });
  }
}

function drawRiverScene() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#0b3c49");
  gradient.addColorStop(0.46, "#15747e");
  gradient.addColorStop(1, "#123d36");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.fillStyle = "rgba(242, 193, 78, 0.22)";
  ctx.beginPath();
  ctx.ellipse(state.width * 0.84, 58, 190, 62, -0.16, 0, Math.PI * 2);
  ctx.fill();

  drawRiverLanes();
  drawRiverRipples();
  drawRiverWarnings();
  drawRiverObstacles();
  drawRiverCapybara();
  drawParticles();

  if (state.river.hitFlash > 0) {
    ctx.fillStyle = `rgba(247, 243, 232, ${state.river.hitFlash * 0.16})`;
    ctx.fillRect(0, 0, state.width, state.height);
  }
}

function drawRiverLanes() {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 20]);
  for (let lane = 0; lane <= RIVER_LANES; lane += 1) {
    const y = riverTop() + lane * riverLaneHeight();
    ctx.strokeStyle = "rgba(247, 243, 232, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y + Math.sin(state.time * 1.8 + lane) * 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRiverRipples() {
  ctx.save();
  ctx.lineCap = "round";
  for (const ripple of state.river.ripples) {
    ctx.strokeStyle = `rgba(247, 243, 232, ${ripple.alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ripple.x, ripple.y);
    ctx.quadraticCurveTo(ripple.x + ripple.length * 0.5, ripple.y + Math.sin(state.time * 2 + ripple.x) * 6, ripple.x + ripple.length, ripple.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRiverWarnings() {
  for (const warning of state.river.warnings) {
    const x = state.width * 0.82;
    const y = riverLaneCenter(warning.lane);
    const pulse = 1 + Math.sin(state.time * 14) * 0.12;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(36, 20, 10, 0.34)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2c14e";
    ctx.strokeStyle = "#7d251f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#7d251f";
    ctx.font = "900 42px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, 2);
    ctx.restore();
  }
}

function drawRiverObstacles() {
  for (const obstacle of state.river.obstacles) {
    const y = riverLaneCenter(obstacle.lane) + Math.sin(obstacle.bob) * 4;
    ctx.save();
    ctx.translate(obstacle.x, y);

    if (obstacle.kind === "log") {
      ctx.fillStyle = "#8a5a36";
      roundRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(42, 23, 7, 0.42)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-obstacle.width * 0.34, -obstacle.height * 0.2);
      ctx.lineTo(obstacle.width * 0.32, -obstacle.height * 0.2);
      ctx.moveTo(-obstacle.width * 0.36, obstacle.height * 0.15);
      ctx.lineTo(obstacle.width * 0.24, obstacle.height * 0.15);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#53645e";
      ctx.beginPath();
      ctx.ellipse(0, 0, obstacle.width / 2, obstacle.height / 2, -0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(247, 243, 232, 0.16)";
      ctx.beginPath();
      ctx.ellipse(-obstacle.width * 0.15, -obstacle.height * 0.18, obstacle.width * 0.18, obstacle.height * 0.11, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawRiverCapybara() {
  const x = riverPlayerX();
  const y = state.river.playerY;
  const bob = Math.sin(state.time * 8) * 2;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.strokeStyle = "rgba(247, 243, 232, 0.36)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-68, 18);
  ctx.quadraticCurveTo(-38, 29, -8, 17);
  ctx.moveTo(12, 20);
  ctx.quadraticCurveTo(39, 30, 70, 17);
  ctx.stroke();

  ctx.fillStyle = "#bf7f4a";
  ctx.beginPath();
  ctx.ellipse(-8, 0, 43, 24, -0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8f2f2b";
  ctx.beginPath();
  ctx.moveTo(6, -9);
  ctx.quadraticCurveTo(-15, -20, -35, -16);
  ctx.quadraticCurveTo(-22, -6, 4, 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c84b3f";
  ctx.beginPath();
  ctx.ellipse(18, -7, 18, 8, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9c613d";
  ctx.beginPath();
  ctx.ellipse(35, -7, 30, 18, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b5333";
  ctx.beginPath();
  ctx.ellipse(55, 0, 18, 10, 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263f34";
  ctx.beginPath();
  ctx.ellipse(31, -29, 26, 9, -0.16, Math.PI * 0.06, Math.PI * 1.92);
  ctx.fill();

  ctx.fillStyle = "#1c120b";
  ctx.beginPath();
  ctx.arc(44, -11, 3.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b2d1d";
  ctx.beginPath();
  ctx.ellipse(65, 0, 7, 5, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDestination() {
  const pulse = state.clickPulse;
  if (!pulse) {
    return;
  }

  const progress = 1 - pulse.life / 0.5;
  ctx.strokeStyle = `rgba(242, 193, 78, ${1 - progress})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pulse.x, pulse.y, 18 + progress * 24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawResources() {
  const selected = getSelectedEntity();
  const sortedResources = [...state.resources].sort((a, b) => a.y - b.y);

  for (const item of sortedResources) {
    if (item.type === "banana") {
      drawBananaTree(item);
    } else {
      drawBamboo(item);
    }

    if (selected?.kind === "resource" && selected.entity.id === item.id) {
      drawSelectionRing(item.x, item.y, item.radius + 12, isInRange(item));
      drawHealthBar(item.x, item.y - item.radius - 24, item.health / item.maxHealth);
    }
  }
}

function drawBananaTree(item) {
  const sway = Math.sin(state.time * 1.7 + item.sway) * 4;

  ctx.fillStyle = "rgba(20, 18, 12, 0.22)";
  ctx.beginPath();
  ctx.ellipse(item.x + 6, item.y + 34, 45, 18, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6e462b";
  roundRect(item.x - 9, item.y - 8, 18, 56, 8);
  ctx.fill();

  for (let index = 0; index < 7; index += 1) {
    const angle = -Math.PI / 2 + (index - 3) * 0.42;
    ctx.save();
    ctx.translate(item.x, item.y - 16);
    ctx.rotate(angle + sway * 0.006);
    ctx.fillStyle = index % 2 ? "#5f9e4e" : "#78b95e";
    ctx.beginPath();
    ctx.ellipse(32, 0, 42, 11, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(item.x + 13 + sway * 0.4, item.y + 6, 5, 0, Math.PI * 2);
  ctx.arc(item.x + 22 + sway * 0.3, item.y + 12, 4, 0, Math.PI * 2);
  ctx.arc(item.x + 9 + sway * 0.2, item.y + 16, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBamboo(item) {
  ctx.fillStyle = "rgba(20, 18, 12, 0.2)";
  ctx.beginPath();
  ctx.ellipse(item.x + 4, item.y + 26, 36, 14, -0.1, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 5; index += 1) {
    const offset = (index - 2) * 9;
    const height = 56 + (index % 2) * 18;
    const lean = Math.sin(state.time * 1.2 + item.sway + index) * 3;
    ctx.strokeStyle = index % 2 ? "#7cc18d" : "#a6d27b";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(item.x + offset, item.y + 28);
    ctx.quadraticCurveTo(item.x + offset + lean, item.y - height * 0.4, item.x + offset + lean * 1.6, item.y - height);
    ctx.stroke();

    ctx.strokeStyle = "rgba(27, 55, 32, 0.58)";
    ctx.lineWidth = 1.5;
    for (let node = 0; node < 4; node += 1) {
      const nodeY = item.y + 20 - node * 18;
      ctx.beginPath();
      ctx.moveTo(item.x + offset - 4, nodeY);
      ctx.lineTo(item.x + offset + 4, nodeY);
      ctx.stroke();
    }
  }
}

function drawStructures() {
  const sortedStructures = [...state.structures].sort((a, b) => a.y - b.y);

  for (const item of sortedStructures) {
    if (item.type === "refugio" || item.type === "refugio_grande") {
      drawRefugio(item);
    } else if (item.type === "secadero") {
      drawSecadero(item);
    } else {
      drawCerco(item);
    }

    const selected = getSelectedEntity();
    if (selected?.kind === "structure" && selected.entity.id === item.id) {
      drawSelectionRing(item.x, item.y, Math.max(item.width, item.height) * 0.54, true);
    }
  }
}

function drawRefugio(item) {
  if (item.type === "refugio_grande") {
    drawRefugioGrande(item);
    return;
  }

  ctx.fillStyle = "rgba(20, 18, 12, 0.22)";
  ctx.beginPath();
  ctx.ellipse(item.x + 10, item.y + 34, item.width * 0.44, item.height * 0.23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7c5734";
  roundRect(item.x - 48, item.y - 20, 96, 54, 8);
  ctx.fill();
  ctx.fillStyle = "#d08a42";
  ctx.beginPath();
  ctx.moveTo(item.x - 62, item.y - 18);
  ctx.lineTo(item.x, item.y - 62);
  ctx.lineTo(item.x + 62, item.y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(42, 25, 12, 0.42)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(item.x - 52, item.y - 13);
  ctx.lineTo(item.x + 52, item.y - 13);
  ctx.stroke();
}

function drawRefugioGrande(item) {
  ctx.fillStyle = "rgba(20, 18, 12, 0.24)";
  ctx.beginPath();
  ctx.ellipse(item.x + 12, item.y + item.height * 0.34, item.width * 0.45, item.height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7c5734";
  roundRect(item.x - item.width * 0.36, item.y - item.height * 0.18, item.width * 0.72, item.height * 0.52, 8);
  ctx.fill();

  ctx.fillStyle = "#8d6137";
  roundRect(item.x - item.width * 0.48, item.y - item.height * 0.08, item.width * 0.26, item.height * 0.38, 8);
  ctx.fill();
  roundRect(item.x + item.width * 0.22, item.y - item.height * 0.08, item.width * 0.26, item.height * 0.38, 8);
  ctx.fill();

  ctx.fillStyle = "#d08a42";
  ctx.beginPath();
  ctx.moveTo(item.x - item.width * 0.52, item.y - item.height * 0.14);
  ctx.lineTo(item.x - item.width * 0.24, item.y - item.height * 0.54);
  ctx.lineTo(item.x + item.width * 0.04, item.y - item.height * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e0a15b";
  ctx.beginPath();
  ctx.moveTo(item.x - item.width * 0.06, item.y - item.height * 0.14);
  ctx.lineTo(item.x + item.width * 0.24, item.y - item.height * 0.58);
  ctx.lineTo(item.x + item.width * 0.55, item.y - item.height * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(42, 25, 12, 0.44)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(item.x - item.width * 0.46, item.y - item.height * 0.08);
  ctx.lineTo(item.x + item.width * 0.48, item.y - item.height * 0.08);
  ctx.stroke();

  ctx.fillStyle = "rgba(36, 25, 15, 0.72)";
  roundRect(item.x - 14, item.y + item.height * 0.08, 28, item.height * 0.28, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(247, 243, 232, 0.2)";
  roundRect(item.x - item.width * 0.28, item.y + item.height * 0.04, 22, 18, 4);
  ctx.fill();
  roundRect(item.x + item.width * 0.2, item.y + item.height * 0.04, 22, 18, 4);
  ctx.fill();
}

function drawSecadero(item) {
  ctx.strokeStyle = "#7cc18d";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(item.x - 46, item.y - 26);
  ctx.lineTo(item.x - 46, item.y + 28);
  ctx.moveTo(item.x + 46, item.y - 26);
  ctx.lineTo(item.x + 46, item.y + 28);
  ctx.moveTo(item.x - 58, item.y - 18);
  ctx.lineTo(item.x + 58, item.y - 18);
  ctx.moveTo(item.x - 52, item.y + 6);
  ctx.lineTo(item.x + 52, item.y + 6);
  ctx.stroke();

  ctx.fillStyle = "#f2c14e";
  for (let index = 0; index < 4; index += 1) {
    ctx.beginPath();
    ctx.ellipse(item.x - 30 + index * 20, item.y - 4, 7, 12, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCerco(item) {
  ctx.strokeStyle = "#9d6a3b";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(item.x - 48, item.y - 10);
  ctx.lineTo(item.x + 48, item.y - 10);
  ctx.moveTo(item.x - 48, item.y + 10);
  ctx.lineTo(item.x + 48, item.y + 10);
  ctx.stroke();

  ctx.strokeStyle = "#d08a42";
  ctx.lineWidth = 6;
  for (let x = -42; x <= 42; x += 28) {
    ctx.beginPath();
    ctx.moveTo(item.x + x, item.y - 22);
    ctx.lineTo(item.x + x, item.y + 22);
    ctx.stroke();
  }
}

function drawBuildGhost() {
  if (!state.buildMode || !state.mouse.inCanvas) {
    return;
  }

  const blueprint = BUILDINGS[state.buildMode];
  const placement = {
    x: clamp(state.mouse.worldX, blueprint.size.width / 2 + 8, WORLD.width - blueprint.size.width / 2 - 8),
    y: clamp(state.mouse.worldY, blueprint.size.height / 2 + 8, WORLD.height - blueprint.size.height / 2 - 8),
    width: blueprint.size.width,
    height: blueprint.size.height,
  };
  const valid = canPay(blueprint.cost) && isBuildSpotFree(placement);

  ctx.save();
  ctx.globalAlpha = valid ? 0.72 : 0.42;
  ctx.fillStyle = valid ? "rgba(242, 193, 78, 0.32)" : "rgba(240, 92, 78, 0.32)";
  ctx.strokeStyle = valid ? "rgba(242, 193, 78, 0.9)" : "rgba(240, 92, 78, 0.9)";
  ctx.lineWidth = 3;
  roundRect(placement.x - placement.width / 2, placement.y - placement.height / 2, placement.width, placement.height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMoveStructureGhost() {
  if (!state.movingStructureId || !state.mouse.inCanvas) {
    return;
  }

  const structure = state.structures.find((item) => item.id === state.movingStructureId);
  if (!structure) {
    return;
  }

  const placement = {
    x: clamp(state.mouse.worldX, structure.width / 2 + 8, WORLD.width - structure.width / 2 - 8),
    y: clamp(state.mouse.worldY, structure.height / 2 + 8, WORLD.height - structure.height / 2 - 8),
    width: structure.width,
    height: structure.height,
  };
  const valid = isStructureMoveSpotFree(placement, structure.id);

  ctx.save();
  ctx.globalAlpha = valid ? 0.68 : 0.42;
  ctx.fillStyle = valid ? "rgba(242, 193, 78, 0.28)" : "rgba(240, 92, 78, 0.3)";
  ctx.strokeStyle = valid ? "rgba(242, 193, 78, 0.92)" : "rgba(240, 92, 78, 0.92)";
  ctx.lineWidth = 3;
  roundRect(placement.x - placement.width / 2, placement.y - placement.height / 2, placement.width, placement.height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  const bob = Math.sin(state.time * 8) * (player.moving ? 2 : 0.8);
  const selected = getSelectedEntity();
  const direction = Math.cos(player.facing) < -0.15 ? -1 : 1;
  const walkCycle = player.moving ? state.time * 13 : 0;

  if (selected?.kind === "resource" && isInRange(selected.entity)) {
    drawSelectionRing(player.x, player.y, 38, true);
  }

  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.scale(direction, 1);
  ctx.rotate(Math.sin(player.facing) * 0.07);

  ctx.fillStyle = "rgba(20, 18, 12, 0.22)";
  ctx.beginPath();
  ctx.ellipse(4, 27, 44, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPlayerLegs(walkCycle, player.moving);

  ctx.fillStyle = "#bf7f4a";
  ctx.beginPath();
  ctx.ellipse(-9, 1, 42, 25, -0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 222, 166, 0.18)";
  ctx.beginPath();
  ctx.ellipse(-18, -7, 25, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8f2f2b";
  ctx.beginPath();
  ctx.moveTo(7, -10);
  ctx.quadraticCurveTo(-10, -22, -31, -18);
  ctx.quadraticCurveTo(-20, -7, 3, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c84b3f";
  ctx.beginPath();
  ctx.ellipse(18, -7, 18, 9, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 218, 184, 0.24)";
  ctx.beginPath();
  ctx.ellipse(15, -11, 11, 3.4, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9c613d";
  ctx.beginPath();
  ctx.ellipse(30, -5, 34, 18, -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b5333";
  ctx.beginPath();
  ctx.ellipse(48, 0, 22, 12, 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 222, 166, 0.14)";
  ctx.beginPath();
  ctx.ellipse(35, -12, 19, 6, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6f4229";
  ctx.beginPath();
  ctx.arc(13, -23, 7, 0, Math.PI * 2);
  ctx.arc(35, -23, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263f34";
  ctx.beginPath();
  ctx.ellipse(28, -28, 27, 10, -0.16, Math.PI * 0.06, Math.PI * 1.92);
  ctx.fill();

  ctx.fillStyle = "#1b2f27";
  ctx.beginPath();
  ctx.ellipse(40, -25, 17, 5, -0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#13231d";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(27, -35);
  ctx.quadraticCurveTo(32, -42, 38, -36);
  ctx.stroke();

  ctx.fillStyle = "#1c120b";
  ctx.beginPath();
  ctx.arc(41, -10, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6dfb6";
  ctx.beginPath();
  ctx.arc(42, -11, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4b2d1d";
  ctx.beginPath();
  ctx.ellipse(62, 1, 7, 5, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(46, 25, 14, 0.38)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(49, 8);
  ctx.quadraticCurveTo(43, 12, 37, 8);
  ctx.moveTo(55, 8);
  ctx.quadraticCurveTo(60, 12, 65, 8);
  ctx.stroke();

  ctx.fillStyle = "rgba(242, 193, 78, 0.2)";
  ctx.beginPath();
  ctx.ellipse(30, 4, 9, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ad3b33";
  ctx.beginPath();
  ctx.ellipse(18, 7, 11, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#792723";
  ctx.beginPath();
  ctx.ellipse(26, 8, 5, 3, 0.1, 0, Math.PI * 2);
  ctx.fill();

  if (state.chewing) {
    ctx.strokeStyle = "rgba(242, 193, 78, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 43, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.chewing.progress);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayerLegs(walkCycle, moving) {
  const phase = moving ? 1 : 0;
  const frontLeft = Math.sin(walkCycle);
  const frontRight = Math.sin(walkCycle + Math.PI);
  const backLeft = Math.sin(walkCycle + Math.PI);
  const backRight = Math.sin(walkCycle);

  drawPlayerLeg(-31, 16, backLeft, phase, -0.24);
  drawPlayerLeg(-9, 21, backRight, phase, 0.18);
  drawPlayerLeg(12, 20, frontLeft, phase, -0.12);
  drawPlayerLeg(31, 13, frontRight, phase, 0.2);
}

function drawPlayerLeg(x, y, cycle, phase, baseRotation) {
  const swing = cycle * phase;
  const stretch = 1 + Math.abs(swing) * 0.18;

  ctx.save();
  ctx.translate(x + swing * 5, y + Math.abs(swing) * 2.5);
  ctx.rotate(baseRotation + swing * 0.28);

  ctx.fillStyle = "#7b482d";
  ctx.beginPath();
  ctx.ellipse(0, 0, 11 * stretch, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5f3624";
  ctx.beginPath();
  ctx.ellipse(7.5 * stretch, 1.5, 4.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSelectionRing(x, y, radius, active) {
  ctx.strokeStyle = active ? "rgba(242, 193, 78, 0.95)" : "rgba(247, 243, 232, 0.58)";
  ctx.lineWidth = active ? 3 : 2;
  ctx.setLineDash(active ? [] : [7, 7]);
  ctx.beginPath();
  ctx.ellipse(x, y + 16, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHealthBar(x, y, ratio) {
  ctx.fillStyle = "rgba(18, 21, 17, 0.8)";
  roundRect(x - 34, y, 68, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.35 ? "#7cc18d" : "#f28f3b";
  roundRect(x - 34, y, 68 * ratio, 8, 4);
  ctx.fill();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life / 0.7, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    state.width / 2,
    state.height / 2,
    state.height * 0.2,
    state.width / 2,
    state.height / 2,
    state.width * 0.74,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
}

function drawTransitionSign() {
  if (!state.transitionSign) {
    return;
  }

  const sign = state.transitionSign;
  const progress = 1 - sign.life / sign.duration;
  const alpha = progress < 0.22 ? progress / 0.22 : Math.min(1, sign.life / 0.3);
  const scale = 0.82 + Math.sin(Math.min(1, progress) * Math.PI) * 0.18;
  const position = transitionSignPosition();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(position.x, position.y - progress * 18);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(20, 18, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(8, 42, 82, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c14e";
  ctx.strokeStyle = "#7d4c22";
  ctx.lineWidth = 5;
  roundRect(-76, -34, 152, 58, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#7d4c22";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-48, 25);
  ctx.lineTo(-48, 58);
  ctx.moveTo(48, 25);
  ctx.lineTo(48, 58);
  ctx.stroke();

  ctx.fillStyle = "#251607";
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sign.label.toUpperCase(), 0, -5);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function transitionSignPosition() {
  if (state.scene === "city") {
    return {
      x: clamp(state.city.x - state.city.camera.x + 95, 95, state.width - 95),
      y: clamp(state.city.y - state.city.camera.y - 55, 95, state.height - 80),
    };
  }

  if (state.scene === "river") {
    return {
      x: clamp(riverPlayerX() + 116, 95, state.width - 95),
      y: clamp(state.river.playerY - 65, 95, state.height - 80),
    };
  }

  return {
    x: clamp(state.player.x - state.camera.x + 96, 95, state.width - 95),
    y: clamp(state.player.y - state.camera.y - 55, 95, state.height - 80),
  };
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function approach(value, target, amount) {
  if (value < target) {
    return Math.min(target, value + amount);
  }

  return Math.max(target, value - amount);
}

function handleKeyDown(event) {
  if (state.scene === "city") {
    if (isSpaceKey(event)) {
      event.preventDefault();
      if (state.city.bike.mounted) {
        state.city.bike.clutch = true;
      } else if (isNearCityBike()) {
        mountCityBike();
      } else {
        state.city.bike.interactPulse = 0.6;
        setMessage("Acercate a la moto", 1);
      }
      return;
    }

    if (state.city.bike.mounted && state.city.bike.clutch) {
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        state.keys.down = true;
        shiftBikeGear(1);
        return;
      }

      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        state.keys.up = true;
        shiftBikeGear(2);
        return;
      }
    }

    if (setDirectionKey(event.key, true)) {
      event.preventDefault();
      return;
    }

    return;
  }

  if (state.scene === "river") {
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
      event.preventDefault();
      moveRiverLane(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
      event.preventDefault();
      moveRiverLane(1);
      return;
    }
  }

  if (state.scene !== "land" && event.key === "Escape") {
    event.preventDefault();
    setScene("land");
    return;
  }

  if (state.scene !== "land") {
    return;
  }

  if (event.key.toLowerCase() === "e" || event.key === " ") {
    event.preventDefault();
    startChewing();
  }

  if (event.key === "Escape") {
    state.buildMode = null;
    state.chewing = null;
    setMessage("Cancelado", 1);
  }
}

function handleKeyUp(event) {
  if (state.scene === "city" && isSpaceKey(event)) {
    event.preventDefault();
    state.city.bike.clutch = false;
    return;
  }

  if (setDirectionKey(event.key, false)) {
    event.preventDefault();
  }
}

function isSpaceKey(event) {
  return event.key === " " || event.code === "Space";
}

function setDirectionKey(key, value) {
  const normalized = key.toLowerCase();

  if (key === "ArrowUp" || normalized === "w") {
    state.keys.up = value;
    return true;
  }

  if (key === "ArrowDown" || normalized === "s") {
    state.keys.down = value;
    return true;
  }

  if (key === "ArrowLeft" || normalized === "a") {
    state.keys.left = value;
    return true;
  }

  if (key === "ArrowRight" || normalized === "d") {
    state.keys.right = value;
    return true;
  }

  return false;
}

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", (event) => {
  state.mouse.inCanvas = true;
  updateMouse(event);
});
canvas.addEventListener("pointerleave", () => {
  state.mouse.inCanvas = false;
});
chewButton.addEventListener("click", startChewing);
moveStructureButton.addEventListener("click", toggleMoveSelectedStructure);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("pagehide", saveEsterosProgress);
window.addEventListener("beforeunload", saveEsterosProgress);

for (const button of buildButtons) {
  button.addEventListener("click", () => setBuildMode(button.dataset.build));
}

for (const button of travelButtons) {
  button.addEventListener("click", () => setScene(button.dataset.scene));
}

createWorld();
resizeCanvas();
updateHud();
requestAnimationFrame(loop);
