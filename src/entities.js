(function () {
  const SV = (window.SV = window.SV || {});

  let pedGroup = null;
  let peds = [];
  let beepCooldown = 0;

  const SKIN_TONES = [0xf5cba7, 0xe8be94, 0xdca97d, 0xf2d1b3];
  const HAIR_COLORS = [0x111827, 0x1e1b18, 0x3b2f2f, 0x5a3825];

  function createHumanoidMesh(outfit, isPlayer, isPolice, isStaff) {
    const g = new THREE.Group();
    const skinTone = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const hairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];

    const skinMat = new THREE.MeshLambertMaterial({ color: skinTone });
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    const shirtColor = isPlayer
      ? 0xff2e93
      : isPolice
      ? 0x1e3a8a
      : isStaff
      ? 0x10b981
      : (outfit && outfit.shirt) || 0x3b82f6;
    const pantsColor = isPlayer
      ? 0x111827
      : isPolice
      ? 0x0f172a
      : (outfit && outfit.pants) || 0x1e293b;

    const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });

    // Neck & Rounded Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 8), skinMat);
    neck.position.y = 1.44;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), skinMat);
    head.position.y = 1.62;
    head.scale.set(0.94, 1.05, 0.96);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    eyeL.position.set(-0.06, 1.63, 0.155);
    eyeR.position.set(0.06, 1.63, 0.155);

    // Hair or Cap
    if (isPolice) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.175, 0.11, 12), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
      cap.position.y = 1.74;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.14), shoeMat);
      visor.position.set(0, 1.7, 0.15);
      g.add(cap, visor);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
      hair.position.set(0, 1.65, -0.02);
      g.add(hair);
    }

    // Shaped Torso & Hips
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.56, 10), shirtMat);
    torso.position.y = 1.12;
    torso.scale.set(1.12, 1, 0.72);

    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.18, 10), pantsMat);
    hips.position.y = 0.78;
    hips.scale.set(1.06, 1, 0.74);

    if (isPolice) {
      const vest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.19, 0.34, 10),
        new THREE.MeshLambertMaterial({ color: 0xfacc15 })
      );
      vest.position.y = 1.14;
      vest.scale.set(1.13, 1, 0.75);
      g.add(vest);
    }

    // Articulated Arm Pivots (at shoulder height)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.27, 1.34, 0);
    const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.44, 8), shirtMat);
    lSleeve.position.y = -0.22;
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
    lHand.position.y = -0.47;
    leftArm.add(lSleeve, lHand);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.27, 1.34, 0);
    const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.44, 8), shirtMat);
    rSleeve.position.y = -0.22;
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
    rHand.position.y = -0.47;
    rightArm.add(rSleeve, rHand);

    // Everyday handheld props (smartphone or coffee cup)
    if (!isPlayer && !isPolice && !isStaff) {
      if (Math.random() < 0.25) {
        const phone = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.13, 0.015),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        phone.position.set(0, -0.46, 0.09);
        rightArm.add(phone);
      } else if (Math.random() < 0.2) {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.032, 0.11, 8),
          new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
        );
        cup.position.set(0, -0.47, 0.06);
        rightArm.add(cup);
      }
    }

    // Articulated Leg Pivots (at hip height)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.1, 0.72, 0);
    const lPant = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.06, 0.62, 8), pantsMat);
    lPant.position.y = -0.32;
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.21), shoeMat);
    lShoe.position.set(0, -0.66, 0.04);
    leftLeg.add(lPant, lShoe);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.1, 0.72, 0);
    const rPant = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.06, 0.62, 8), pantsMat);
    rPant.position.y = -0.32;
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.21), shoeMat);
    rShoe.position.set(0, -0.66, 0.04);
    rightLeg.add(rPant, rShoe);

    g.add(neck, head, eyeL, eyeR, torso, hips, leftArm, rightArm, leftLeg, rightLeg);

    if (outfit && outfit.hasBackpack && !isPlayer && !isPolice) {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.42, 0.16),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      );
      pack.position.set(0, 1.12, -0.2);
      g.add(pack);
    }

    return { mesh: g, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  function animateLimbs(rig, phase, speedRatio) {
    const amp = 0.56 * Math.min(1.25, speedRatio);
    rig.leftLeg.rotation.x = Math.sin(phase) * amp;
    rig.rightLeg.rotation.x = -Math.sin(phase) * amp;
    rig.leftArm.rotation.x = -Math.sin(phase) * amp * 0.85;
    rig.rightArm.rotation.x = Math.sin(phase) * amp * 0.85;
  }

  function lerpAngle(current, target, t) {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * Math.min(1, t);
  }

  function randomSidewalkSpawn(city) {
    const r = SV.ROAD_COORDS[Math.floor(Math.random() * SV.ROAD_COORDS.length)];
    const side = Math.random() > 0.5 ? 1 : -1;
    const swOffset = SV.ROAD_WIDTH / 2 + 1.9;
    const along = -100 + Math.random() * 200;
    const axis = Math.random() > 0.5 ? 'ew' : 'ns';
    let x = axis === 'ew' ? along : r + side * swOffset;
    let z = axis === 'ew' ? r + side * swOffset : along;
    if (city.waterSide === 'south' && z > 110) z = 95;
    if (city.waterSide === 'west' && x < -110) x = -95;
    const dir = Math.random() > 0.5 ? 1 : -1;
    return { x, z, axis, dir };
  }

  function spawnCityCitizens(scene, city) {
    if (pedGroup) scene.remove(pedGroup);
    pedGroup = new THREE.Group();
    peds = [];
    scene.add(pedGroup);

    const spots = SV.World.getHangoutSpots();

    for (let i = 0; i < city.pedCount; i++) {
      const isPolice = i < 4;
      const outfit = SV.PED_OUTFITS[i % SV.PED_OUTFITS.length];
      const rig = createHumanoidMesh(outfit, false, isPolice, false);

      let spawn;
      let state = 'walk';
      let waitTimer = 0;
      if (!isPolice && spots.length > 0 && i % 4 === 0) {
        const sp = spots[i % spots.length];
        spawn = { x: sp.x + (Math.random() - 0.5) * 2.2, z: sp.z + (Math.random() - 0.5) * 1.4, axis: 'ew', dir: 1 };
        state = 'hangout';
        waitTimer = 4 + Math.random() * 6;
      } else {
        spawn = randomSidewalkSpawn(city);
      }

      const initRot = spawn.axis === 'ew' ? (spawn.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : spawn.dir > 0 ? 0 : Math.PI;
      rig.mesh.position.set(spawn.x, 0, spawn.z);
      rig.mesh.rotation.y = initRot;
      pedGroup.add(rig.mesh);

      peds.push({
        rig,
        mesh: rig.mesh,
        x: spawn.x,
        z: spawn.z,
        rot: initRot,
        axis: spawn.axis,
        dir: spawn.dir,
        speed: 2.0 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        state,
        waitTimer,
        fleeTimer: 0,
        fleeAngle: 0,
        hp: isPolice ? 120 : 60,
        dead: false,
        respawnTimer: 0,
        isPolice,
      });
    }
  }

  function scareNearby(x, z, radius) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (p.dead || p.isPolice) continue;
      if (Math.hypot(p.x - x, p.z - z) < radius) {
        p.state = 'flee';
        p.fleeTimer = 5.5;
        p.fleeAngle = Math.atan2(p.x - x, p.z - z) + (Math.random() - 0.5) * 0.6;
      }
    }
  }

  function damagePed(ped, amount, player) {
    if (ped.dead) return;
    ped.hp -= amount;
    if (ped.hp <= 0) {
      ped.dead = true;
      ped.respawnTimer = 14;
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.22;
      player.cash += ped.isPolice ? 8000 : 3500;
      SV.Audio.playCashChime();
    } else if (!ped.isPolice) {
      ped.state = 'flee';
      ped.fleeTimer = 6;
      ped.fleeAngle = Math.atan2(ped.x - player.x, ped.z - player.z);
    }
  }

  function updateCitizens(dt, player, city, clockSec, wantedLevel) {
    if (beepCooldown > 0) beepCooldown -= dt;

    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];

      if (p.dead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          const sp = randomSidewalkSpawn(city);
          p.x = sp.x;
          p.z = sp.z;
          p.axis = sp.axis;
          p.dir = sp.dir;
          p.hp = p.isPolice ? 120 : 60;
          p.dead = false;
          p.state = 'walk';
          p.mesh.rotation.x = 0;
          p.mesh.position.set(p.x, 0, p.z);
        }
        continue;
      }

      if (p.isPolice && wantedLevel > 0 && !player.dead && !SV.World.isInsideBuilding()) {
        const dx = player.x - p.x;
        const dz = player.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 85 && dist > 1.8) {
          const angle = Math.atan2(dx, dz);
          const col = SV.World.resolveCircleCollision(
            p.x + Math.sin(angle) * 4.6 * dt,
            p.z + Math.cos(angle) * 4.6 * dt,
            0.4
          );
          p.x = col.x;
          p.z = col.z;
          p.rot = lerpAngle(p.rot, angle, dt * 8);
          p.mesh.position.set(p.x, 0, p.z);
          p.mesh.rotation.y = p.rot;
          p.phase += dt * 11;
          animateLimbs(p.rig, p.phase, 1.15);
          if (dist < 2.5 && !player.vehicle) {
            player.takeDamage(12 * dt);
          }
          continue;
        }
      }

      if (p.state === 'flee') {
        p.fleeTimer -= dt;
        const col = SV.World.resolveCircleCollision(
          p.x + Math.sin(p.fleeAngle) * 5.6 * dt,
          p.z + Math.cos(p.fleeAngle) * 5.6 * dt,
          0.4
        );
        p.x = col.x;
        p.z = col.z;
        p.rot = lerpAngle(p.rot, p.fleeAngle, dt * 10);
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = p.rot;
        p.phase += dt * 13;
        animateLimbs(p.rig, p.phase, 1.3);
        if (p.fleeTimer <= 0) p.state = 'walk';
        continue;
      }

      if (p.state === 'hangout') {
        p.waitTimer -= dt;
        animateLimbs(p.rig, p.phase, 0);
        p.mesh.rotation.y += Math.sin(clockSec * 1.5 + i) * 0.3 * dt;
        if (p.waitTimer <= 0) {
          p.state = 'walk';
          const sp = randomSidewalkSpawn(city);
          p.axis = sp.axis;
          p.dir = sp.dir;
        }
        continue;
      }

      const along = p.axis === 'ew' ? p.x : p.z;
      let waitingAtLight = false;
      for (let r = 0; r < SV.ROAD_COORDS.length; r++) {
        const rc = SV.ROAD_COORDS[r];
        const distToEdge = (rc - along) * p.dir;
        if (distToEdge > 7.2 && distToEdge < 9.4) {
          const light = SV.World.getTrafficState(clockSec, p.axis);
          if (light !== 'green') {
            waitingAtLight = true;
          } else if (beepCooldown <= 0 && !SV.World.isInsideBuilding() && Math.hypot(player.x - p.x, player.z - p.z) < 22) {
            SV.Audio.playCrosswalkBeep();
            beepCooldown = 1.8;
          }
          break;
        }
      }

      if (waitingAtLight) {
        animateLimbs(p.rig, p.phase, 0);
        continue;
      }

      let nx = p.x + (p.axis === 'ew' ? p.dir * p.speed * dt : 0);
      let nz = p.z + (p.axis === 'ns' ? p.dir * p.speed * dt : 0);
      if (nx > 125 || nx < -125 || nz > 112 || nz < -125) {
        p.dir *= -1;
        nx = Math.max(-124, Math.min(124, nx));
        nz = Math.max(-124, Math.min(111, nz));
      }

      const col = SV.World.resolveCircleCollision(nx, nz, 0.35);
      if (col.hit) {
        p.dir *= -1;
      } else {
        p.x = col.x;
        p.z = col.z;
      }

      const targetRot = p.axis === 'ew' ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : p.dir > 0 ? 0 : Math.PI;
      p.rot = lerpAngle(p.rot, targetRot, dt * 9);
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.rot;
      p.phase += dt * 7.5;
      animateLimbs(p.rig, p.phase, 0.92);
    }
  }

  SV.Entities = {
    createHumanoidMesh,
    animateLimbs,
    spawnCityCitizens,
    updateCitizens,
    scareNearby,
    damagePed,
    setVisible: (vis) => {
      if (pedGroup) pedGroup.visible = vis;
    },
    getAll: () => peds,
  };
})();
