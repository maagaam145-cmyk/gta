(function () {
  const SV = (window.SV = window.SV || {});

  const container = document.getElementById('game-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 420);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
  }
  container.appendChild(renderer.domElement);

  const keys = {};
  let started = false;
  let camYaw = Math.PI;
  let camPitch = 0.28;
  let camMode = 0;
  let timeHours = 21.5;
  let clockSec = 0;
  let wantedLevel = 0;
  let wantedDecay = 0;
  let mouseDown = false;
  let tracers = [];

  const playerRig = SV.Entities.createHumanoidMesh(null, true, false, false);
  scene.add(playerRig.mesh);

  const player = {
    x: 8,
    y: 0,
    z: 10,
    vy: 0,
    rot: Math.PI,
    hp: 100,
    armor: 50,
    cash: 50000,
    weaponIndex: 0,
    ammo: { pistol: 12, smg: 30 },
    fireCooldown: 0,
    phase: 0,
    vehicle: null,
    dead: false,
    takeDamage(amt) {
      if (this.dead) return;
      if (this.armor > 0) {
        const absorbed = Math.min(this.armor, amt * 0.7);
        this.armor -= absorbed;
        this.hp -= amt - absorbed;
      } else {
        this.hp -= amt;
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        onGameOver();
      }
    },
  };

  SV.state = { cityId: 'seoul' };

  function loadCity(cityId, spawnNearHub) {
    SV.state.cityId = cityId;
    const city = SV.World.buildCity(scene, cityId);
    SV.Vehicles.spawnCityTraffic(scene, city);
    SV.Entities.spawnCityCitizens(scene, city);
    SV.Vehicles.setVisible(true);
    SV.Entities.setVisible(true);
    SV.Missions.resetForCity(scene, cityId);

    player.vehicle = null;
    playerRig.mesh.visible = true;
    if (spawnNearHub && city.hubs[0]) {
      player.x = city.hubs[0].x;
      player.z = city.hubs[0].z + 10;
    } else {
      player.x = 8;
      player.z = 10;
    }
    player.y = 0;
    player.vy = 0;
    wantedLevel = 0;
  }

  function travelToCity(targetCityId, modeLabel) {
    const targetCity = SV.CITIES[targetCityId];
    if (!targetCity || targetCityId === SV.state.cityId) return;

    if (SV.World.isInsideBuilding()) {
      SV.World.exitBuilding(scene);
    }

    if (player.cash >= targetCity.fare) {
      player.cash -= targetCity.fare;
    }

    SV.Audio.playTravelChime();
    const trans = document.getElementById('travel-transition');
    document.getElementById('transition-mode').textContent = modeLabel || targetCity.travelMode;
    document.getElementById('transition-city').textContent = targetCity.name;
    document.getElementById('transition-sub').textContent = targetCity.kr;
    trans.classList.remove('hidden');

    setTimeout(() => {
      loadCity(targetCityId, true);
      trans.classList.add('hidden');
      SV.Missions.showBanner(`${targetCity.name} ХОТОД ТАВТАЙ МОРИЛ!`, targetCity.kr);
    }, 1100);
  }

  function onGameOver() {
    if (document.pointerLockElement) document.exitPointerLock();
    if (SV.World.isInsideBuilding()) {
      SV.World.exitBuilding(scene);
      SV.Vehicles.setVisible(true);
      SV.Entities.setVisible(true);
    }
    const fine = Math.min(player.cash, 15000);
    player.cash -= fine;
    document.getElementById('gameover-title').textContent = wantedLevel > 0 ? 'BUSTED' : 'WASTED';
    document.getElementById('gameover-desc').textContent = `Эмнэлгийн төлбөрт ₩ ${fine.toLocaleString()} хасагдлаа.`;
    document.getElementById('gameover-screen').classList.remove('hidden');
  }

  function respawn() {
    player.hp = 100;
    player.armor = 50;
    player.dead = false;
    player.vehicle = null;
    playerRig.mesh.visible = true;
    player.x = 8;
    player.z = 10;
    wantedLevel = 0;
    document.getElementById('gameover-screen').classList.add('hidden');
  }

  function spawnTracer(x1, y1, z1, x2, y2, z2, color) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    scene.add(line);
    tracers.push({ line, life: 0.08 });
  }

  function attack() {
    if (player.dead || player.vehicle || player.fireCooldown > 0 || SV.HUD.isTravelOpen() || SV.World.isInsideBuilding()) return;
    const wep = SV.WEAPONS[player.weaponIndex];
    player.fireCooldown = wep.cooldown;

    if (wep.id !== 'fist') {
      if (player.ammo[wep.id] <= 0) {
        player.ammo[wep.id] = wep.magSize;
        return;
      }
      player.ammo[wep.id]--;
      SV.Audio.playShot(wep.id === 'smg');
      SV.Entities.scareNearby(player.x, player.z, 32);
    } else {
      SV.Audio.playPunch();
    }

    const dirX = -Math.sin(camYaw);
    const dirZ = -Math.cos(camYaw);
    player.rot = Math.atan2(dirX, dirZ);

    const peds = SV.Entities.getAll();
    let hitPed = null;
    let bestD = wep.range;

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (p.dead) continue;
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const proj = dx * dirX + dz * dirZ;
      if (proj > 0 && proj < bestD) {
        const perp = Math.abs(dx * -dirZ + dz * dirX);
        if (perp < 1.1) {
          bestD = proj;
          hitPed = p;
        }
      }
    }

    if (wep.id !== 'fist') {
      spawnTracer(player.x, 1.35, player.z, player.x + dirX * bestD, 1.25, player.z + dirZ * bestD, wep.color);
    }

    if (hitPed) {
      SV.Entities.damagePed(hitPed, wep.damage, player);
      wantedLevel = Math.min(5, wantedLevel + (hitPed.isPolice ? 2 : 1));
      wantedDecay = 18;
    }
  }

  function nearestBuildingDoor() {
    const doors = SV.World.getBuildingDoors();
    for (let i = 0; i < doors.length; i++) {
      if (Math.hypot(doors[i].x - player.x, doors[i].z - player.z) < 3.4) {
        return doors[i];
      }
    }
    return null;
  }

  function toggleBuilding() {
    if (player.dead || player.vehicle) return;
    if (SV.World.isInsideBuilding()) {
      // Exit if near door (or anywhere inside for convenience)
      const prevDoor = SV.World.exitBuilding(scene);
      SV.Vehicles.setVisible(true);
      SV.Entities.setVisible(true);
      if (prevDoor) {
        player.x = prevDoor.exitX;
        player.z = prevDoor.exitZ;
      }
      SV.Audio.playTravelChime();
      return;
    }

    const door = nearestBuildingDoor();
    if (door) {
      SV.World.enterBuilding(scene, door);
      SV.Vehicles.setVisible(false);
      SV.Entities.setVisible(false);
      player.x = 0;
      player.z = 4.6;
      player.rot = Math.PI;
      camYaw = 0;
      SV.Audio.playTravelChime();
      SV.Missions.showBanner(door.title, 'Гарахдаа [E] товчийг дарна уу');
    }
  }

  function useIndoorService() {
    const interior = SV.World.getActiveInterior();
    if (!interior) return;
    if (player.z > -1.2) return; // Near service counter

    if (player.cash < interior.cost) {
      SV.Missions.showBanner('МӨНГӨ ХҮРЭХГҮЙ БАЙНА', `Шаардлагатай: ₩ ${interior.cost.toLocaleString()}`);
      return;
    }

    player.cash -= interior.cost;
    SV.Audio.playCashChime();
    if (interior.interiorType === 'store') {
      player.hp = Math.min(100, player.hp + 40);
      SV.Missions.showBanner('АМЖИЛТТАЙ ХУДАЛДАН АВЛАА', '+40 HP нэмэгдлээ');
    } else if (interior.interiorType === 'cafe') {
      player.hp = Math.min(100, player.hp + 60);
      player.armor = Math.min(100, player.armor + 25);
      SV.Missions.showBanner('АМТТАЙ КОФЕ & ХООЛ', '+60 HP • +25 AR');
    } else if (interior.interiorType === 'club') {
      player.hp = Math.min(100, player.hp + 30);
      player.armor = Math.min(100, player.armor + 40);
      SV.Missions.showBanner('VIP ЭНЕРЖИ УНДАА', '+30 HP • +40 AR');
    } else {
      player.hp = 100;
      player.armor = 100;
      SV.Missions.showBanner('БҮРЭН СЭРГЭЛЭЭ', '100% HP • 100% ARMOR');
    }
  }

  function toggleVehicle() {
    if (player.dead || SV.World.isInsideBuilding()) return;
    if (player.vehicle) {
      const v = player.vehicle;
      v.driver = null;
      player.vehicle = null;
      player.x = v.x + Math.cos(v.rot) * 2.4;
      player.z = v.z - Math.sin(v.rot) * 2.4;
      playerRig.mesh.visible = true;
      return;
    }
    const nearest = SV.Vehicles.findNearestVehicle(player.x, player.z, 4.5);
    if (nearest) {
      nearest.driver = player;
      nearest.isAI = false;
      player.vehicle = nearest;
      playerRig.mesh.visible = false;
    }
  }

  function nearestTravelHub() {
    if (SV.World.isInsideBuilding()) return null;
    const hubs = SV.World.getTravelHubs();
    for (let i = 0; i < hubs.length; i++) {
      if (Math.hypot(hubs[i].x - player.x, hubs[i].z - player.z) < 5.2) {
        return hubs[i];
      }
    }
    return null;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    keys[code] = true;
    if (!started) return;

    if (SV.GoogleMaps && SV.GoogleMaps.isModalOpen()) {
      if (code === 'Escape' || code === 'KeyK') SV.GoogleMaps.closeModal();
      return;
    }

    if (code === 'KeyK') {
      SV.GoogleMaps.openModal();
    } else if (code === 'KeyB' && SV.GoogleMaps && SV.GoogleMaps.isEnabled()) {
      SV.GoogleMaps.toggleProceduralBuildings();
    } else if (code === 'KeyT' && !SV.World.isInsideBuilding()) {
      const hub = nearestTravelHub();
      if (hub && !SV.HUD.isTravelOpen()) {
        travelToCity(hub.target, hub.mode);
      } else if (SV.HUD.isTravelOpen()) {
        SV.HUD.closeTravelModal();
      } else {
        SV.HUD.openTravelModal(SV.state.cityId, player.cash, travelToCity);
      }
    } else if (code === 'Escape' && SV.HUD.isTravelOpen()) {
      SV.HUD.closeTravelModal();
    } else if (code === 'KeyE') {
      toggleBuilding();
    } else if (code === 'KeyG') {
      useIndoorService();
    } else if (code === 'KeyF') {
      toggleVehicle();
    } else if (code === 'Digit1') {
      player.weaponIndex = 0;
    } else if (code === 'Digit2') {
      player.weaponIndex = 1;
    } else if (code === 'Digit3') {
      player.weaponIndex = 2;
    } else if (code === 'KeyR') {
      const wep = SV.WEAPONS[player.weaponIndex];
      if (wep.magSize !== Infinity) player.ammo[wep.id] = wep.magSize;
    } else if (code === 'KeyC') {
      camMode = (camMode + 1) % 3;
    } else if (code === 'KeyM') {
      SV.Audio.toggleRadio();
    } else if (code === 'KeyH') {
      document.getElementById('help-panel').classList.toggle('hidden');
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
      camYaw -= e.movementX * 0.0024;
      camPitch = Math.max(0.08, Math.min(0.85, camPitch + e.movementY * 0.002));
    }
  });

  renderer.domElement.addEventListener('mousedown', (e) => {
    if (!started || SV.HUD.isTravelOpen() || (SV.GoogleMaps && SV.GoogleMaps.isModalOpen()) || player.dead) return;
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
    if (e.button === 0) {
      mouseDown = true;
      attack();
    }
  });

  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    started = true;
    SV.Audio.ensureContext();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    renderer.domElement.requestPointerLock();
  });

  document.getElementById('respawn-btn').addEventListener('click', respawn);
  document.getElementById('travel-close-btn').addEventListener('click', () => SV.HUD.closeTravelModal());

  loadCity('seoul', false);

  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    clockSec += dt;

    if (started && !SV.HUD.isTravelOpen()) {
      timeHours = (timeHours + dt * 0.055) % 24;
    }

    const city = SV.CITIES[SV.state.cityId];
    SV.World.updateEnvironment(scene, timeHours, city.id, clockSec, dt);
    const inside = SV.World.isInsideBuilding();

    if (started && !player.dead && !SV.HUD.isTravelOpen() && !(SV.GoogleMaps && SV.GoogleMaps.isModalOpen())) {
      if (player.fireCooldown > 0) player.fireCooldown -= dt;
      if (mouseDown && SV.WEAPONS[player.weaponIndex].auto) attack();

      if (wantedLevel > 0 && !inside) {
        wantedDecay -= dt;
        if (wantedDecay <= 0) {
          wantedLevel = Math.max(0, wantedLevel - 1);
          wantedDecay = 16;
        }
      }

      if (player.vehicle) {
        const v = player.vehicle;
        const spec = v.spec;
        const throttle = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
        const steer = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
        const nitro = keys['ShiftLeft'] || keys['ShiftRight'] ? 1.38 : 1.0;

        if (throttle !== 0) {
          v.speed += throttle * spec.accel * nitro * dt;
        } else {
          v.speed *= Math.pow(0.28, dt);
        }
        if (keys['Space']) v.speed *= Math.pow(0.08, dt);

        v.speed = Math.max(-spec.maxSpeed * 0.4, Math.min(spec.maxSpeed * nitro, v.speed));
        if (Math.abs(v.speed) > 0.6) {
          const dirSign = v.speed >= 0 ? 1 : -1;
          v.rot += steer * spec.turnSpeed * dirSign * dt;
        }

        const nx = v.x + Math.sin(v.rot) * v.speed * dt;
        const nz = v.z + Math.cos(v.rot) * v.speed * dt;
        const col = SV.World.resolveCircleCollision(nx, nz, v.radius);
        if (col.hit) v.speed *= 0.45;
        v.x = col.x;
        v.z = col.z;
        v.mesh.position.set(v.x, 0, v.z);
        v.mesh.rotation.y = v.rot;

        player.x = v.x;
        player.z = v.z;
        player.rot = v.rot;

        if (Math.abs(v.speed) > 9) {
          const peds = SV.Entities.getAll();
          for (let i = 0; i < peds.length; i++) {
            const p = peds[i];
            if (!p.dead && Math.hypot(p.x - v.x, p.z - v.z) < 2.2) {
              SV.Entities.damagePed(p, 80, player);
              wantedLevel = Math.min(5, wantedLevel + 1);
              wantedDecay = 18;
            }
          }
        }
        SV.Audio.updateEngine(v.speed, true);
      } else {
        SV.Audio.updateEngine(0, false);
        const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
        const right = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
        if (fwd !== 0 || right !== 0) {
          const fx = -Math.sin(camYaw);
          const fz = -Math.cos(camYaw);
          const rx = Math.cos(camYaw);
          const rz = -Math.sin(camYaw);
          let mx = fx * fwd + rx * right;
          let mz = fz * fwd + rz * right;
          const len = Math.hypot(mx, mz) || 1;
          mx /= len;
          mz /= len;
          const speed = inside ? 4.4 : keys['ShiftLeft'] || keys['ShiftRight'] ? 10.2 : 6.0;
          const col = inside
            ? SV.World.resolveIndoorCollision(player.x + mx * speed * dt, player.z + mz * speed * dt, 0.42)
            : SV.World.resolveCircleCollision(player.x + mx * speed * dt, player.z + mz * speed * dt, 0.42);
          player.x = col.x;
          player.z = col.z;
          player.rot = Math.atan2(mx, mz);
          player.phase += dt * (speed > 8 ? 14 : 9);
          SV.Entities.animateLimbs(playerRig, player.phase, speed > 8 ? 1.25 : 0.95);
        } else {
          SV.Entities.animateLimbs(playerRig, player.phase, 0);
        }

        if (keys['Space'] && player.y <= 0.01 && !inside) {
          player.vy = 7.4;
        }
        player.vy -= 20 * dt;
        player.y += player.vy * dt;
        if (player.y < 0) {
          player.y = 0;
          player.vy = 0;
        }
        playerRig.mesh.position.set(player.x, player.y, player.z);
        playerRig.mesh.rotation.y = player.rot;
      }

      if (!inside) {
        const peds = SV.Entities.getAll();
        SV.Vehicles.updateVehicles(dt, player, clockSec, wantedLevel, peds);
        SV.Entities.updateCitizens(dt, player, city, clockSec, wantedLevel);
        SV.Missions.update(dt, scene, player, city.id, clockSec);
      }
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].line);
        tracers.splice(i, 1);
      }
    }

    // Camera follow (clamped inside walls when indoors)
    if (inside) {
      const dist = 3.9;
      let cx = player.x + Math.sin(camYaw) * Math.cos(camPitch) * dist;
      let cy = Math.min(4.7, Math.max(1.5, player.y + 2.1 + Math.sin(camPitch) * 1.4));
      let cz = player.z + Math.cos(camYaw) * Math.cos(camPitch) * dist;
      cx = Math.max(-7.3, Math.min(7.3, cx));
      cz = Math.max(-6.3, Math.min(6.3, cz));
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 12));
      camera.lookAt(player.x, player.y + 1.35, player.z);
    } else {
      const dist = camMode === 2 ? 26 : player.vehicle ? (camMode === 1 ? 15 : 10.5) : camMode === 1 ? 10.5 : 7.0;
      const height = camMode === 2 ? 28 : player.vehicle ? 4.2 : 2.8;
      const cx = player.x + Math.sin(camYaw) * Math.cos(camPitch) * dist;
      const cy = Math.max(1.2, player.y + height + Math.sin(camPitch) * dist * 0.65);
      const cz = player.z + Math.cos(camYaw) * Math.cos(camPitch) * dist;
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10));
      camera.lookAt(player.x, player.y + 1.4, player.z);
    }

    // Interaction prompt
    let promptText = '';
    if (inside) {
      const interior = SV.World.getActiveInterior();
      if (player.z > 3.8) {
        promptText = '[E] Гудамж руу гарах';
      } else if (player.z < -1.2 && interior) {
        promptText = `[G] ${interior.action}`;
      }
    } else {
      const hub = nearestTravelHub();
      const door = nearestBuildingDoor();
      if (hub) {
        promptText = `[T] ${SV.CITIES[hub.target].name} руу зорчих (${hub.mode})`;
      } else if (door && !player.vehicle) {
        promptText = `[E] ${door.title} руу орох`;
      } else if (!player.vehicle) {
        const nearCar = SV.Vehicles.findNearestVehicle(player.x, player.z, 4.5);
        if (nearCar) promptText = `[F] ${nearCar.spec.label} машинд суух`;
      }
    }

    if (started) {
      SV.HUD.update(player, city, timeHours, wantedLevel, promptText);
      if (SV.GoogleMaps && SV.GoogleMaps.isEnabled() && !inside) {
        SV.GoogleMaps.syncCamera(city, player.x, player.z, camYaw, camPitch);
      }
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
