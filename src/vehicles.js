(function () {
  const SV = (window.SV = window.SV || {});

  const DIR_VECTORS = [
    { dx: 1, dz: 0, rot: Math.PI / 2, axis: 'ew' },   // 0: +X East
    { dx: 0, dz: 1, rot: 0, axis: 'ns' },             // 1: +Z South
    { dx: -1, dz: 0, rot: -Math.PI / 2, axis: 'ew' }, // 2: -X West
    { dx: 0, dz: -1, rot: Math.PI, axis: 'ns' },      // 3: -Z North
  ];

  let vehicles = [];
  let vehicleGroup = null;

  function createVehicleMesh(type) {
    const spec = SV.VEHICLE_SPECS[type] || SV.VEHICLE_SPECS.sedan;
    const [w, h, l] = spec.size;
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: spec.color });
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111827 });

    if (spec.isScooter) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 1.75), bodyMat);
      frame.position.y = 0.55;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.52, 0.65),
        new THREE.MeshLambertMaterial({ color: 0xfef08a })
      );
      box.position.set(0, 1.05, -0.55);
      g.add(frame, box);
    } else if (spec.isBus) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyMat);
      body.position.y = h / 2 + 0.35;
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.05, 0.9, l - 0.6),
        new THREE.MeshLambertMaterial({ color: 0x38bdf8 })
      );
      glass.position.y = h * 0.68 + 0.35;
      g.add(body, glass);
    } else {
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.52, l), bodyMat);
      chassis.position.y = h * 0.26 + 0.32;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, h * 0.45, l * 0.52), cabinMat);
      cabin.position.set(0, h * 0.72 + 0.28, -0.15);
      g.add(chassis, cabin);
    }

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wx = spec.isScooter ? 0 : w * 0.48;
    const wz = l * 0.32;
    const wheelCoords = spec.isScooter
      ? [
          [0, 0.36, wz],
          [0, 0.36, -wz],
        ]
      : [
          [-wx, 0.36, wz],
          [wx, 0.36, wz],
          [-wx, 0.36, -wz],
          [wx, 0.36, -wz],
        ];
    wheelCoords.forEach(([px, py, pz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(px, py, pz);
      g.add(wheel);
    });

    // Headlights & Taillights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2e54 });
    const lightX = spec.isScooter ? 0 : w * 0.32;
    [-lightX, lightX].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), headMat);
      hl.position.set(lx, 0.68, l / 2 + 0.03);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), tailMat);
      tl.position.set(lx, 0.68, -l / 2 - 0.03);
      g.add(hl, tl);
    });

    let sirenRed = null;
    let sirenBlue = null;
    if (spec.isPolice) {
      sirenRed = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0xff2e54 }));
      sirenBlue = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0x00d4ff }));
      sirenRed.position.set(-0.35, h + 0.38, -0.15);
      sirenBlue.position.set(0.35, h + 0.38, -0.15);
      g.add(sirenRed, sirenBlue);
    } else if (spec.roofSign) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.24, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      sign.position.set(0, h + 0.4, -0.1);
      g.add(sign);
    }

    return { mesh: g, sirenRed, sirenBlue };
  }

  function laneCoordForDir(roadCoord, dir) {
    // Right-hand driving lanes
    if (dir === 0) return roadCoord + SV.LANE_OFFSET; // +X
    if (dir === 1) return roadCoord - SV.LANE_OFFSET; // +Z
    if (dir === 2) return roadCoord - SV.LANE_OFFSET; // -X
    return roadCoord + SV.LANE_OFFSET;                // -Z
  }

  function spawnVehicle(type, x, z, dir, isAI) {
    const spec = SV.VEHICLE_SPECS[type] || SV.VEHICLE_SPECS.sedan;
    const { mesh, sirenRed, sirenBlue } = createVehicleMesh(type);
    const vInfo = DIR_VECTORS[dir];
    mesh.position.set(x, 0, z);
    mesh.rotation.y = vInfo.rot;
    vehicleGroup.add(mesh);

    const v = {
      type,
      spec,
      mesh,
      sirenRed,
      sirenBlue,
      x,
      z,
      rot: vInfo.rot,
      speed: isAI ? 9 + Math.random() * 5 : 0,
      dir,
      isAI,
      driver: null,
      stopTimer: 0,
      turnCooldown: 0,
      radius: spec.isBus ? 2.8 : 1.9,
      hp: 160,
    };
    vehicles.push(v);
    return v;
  }

  function spawnCityTraffic(scene, city) {
    if (vehicleGroup) scene.remove(vehicleGroup);
    vehicleGroup = new THREE.Group();
    vehicles = [];
    scene.add(vehicleGroup);

    // Always place 2 nice rides near player spawn (around x=7, z=10)
    spawnVehicle('taxi', 3.4, 16, 1, false);
    spawnVehicle('sports', -3.4, -14, 3, false);

    const aiTypes = ['taxi', 'sedan', 'sedan', 'sports', 'bus', 'scooter', 'police'];
    for (let i = 0; i < city.trafficCount; i++) {
      const type = aiTypes[i % aiTypes.length];
      const dir = i % 4;
      const road = SV.ROAD_COORDS[(i * 2 + 1) % SV.ROAD_COORDS.length];
      if (city.waterSide === 'west' && road < -90) continue;
      if (city.waterSide === 'south' && road > 90) continue;

      const along = -95 + ((i * 37) % 190);
      let x, z;
      if (dir === 0 || dir === 2) {
        x = along;
        z = laneCoordForDir(road, dir);
      } else {
        x = laneCoordForDir(road, dir);
        z = along;
      }
      spawnVehicle(type, x, z, dir, true);
    }
  }

  function nearestRoadCoord(val) {
    let best = SV.ROAD_COORDS[0];
    let bestD = Infinity;
    for (let i = 0; i < SV.ROAD_COORDS.length; i++) {
      const d = Math.abs(SV.ROAD_COORDS[i] - val);
      if (d < bestD) {
        bestD = d;
        best = SV.ROAD_COORDS[i];
      }
    }
    return { coord: best, dist: bestD };
  }

  function updateVehicles(dt, player, clockSec, wantedLevel, peds) {
    const busStops = SV.World.getBusStops();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      // Police flashing lights
      if (v.spec.isPolice && v.sirenRed && v.sirenBlue) {
        const active = wantedLevel > 0 || v.driver === player;
        const blink = active && Math.floor(clockSec * 8) % 2 === 0;
        v.sirenRed.material.color.setHex(blink ? 0xff2e54 : 0x450a0a);
        v.sirenBlue.material.color.setHex(!blink && active ? 0x00d4ff : 0x082f49);
      }

      if (v.driver === player) {
        continue; // Controlled in main.js
      }

      if (!v.isAI) {
        v.speed *= 0.92;
        continue;
      }

      // Police pursuit mode when wanted > 0
      if (v.spec.isPolice && wantedLevel > 0 && !player.dead) {
        const dx = player.x - v.x;
        const dz = player.z - v.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 5 && dist < 150) {
          const targetAngle = Math.atan2(dx, dz);
          let diff = targetAngle - v.rot;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.rot += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
          v.speed += (22 - v.speed) * dt * 2.5;
          const nx = v.x + Math.sin(v.rot) * v.speed * dt;
          const nz = v.z + Math.cos(v.rot) * v.speed * dt;
          const col = SV.World.resolveCircleCollision(nx, nz, v.radius);
          v.x = col.x;
          v.z = col.z;
          v.mesh.position.set(v.x, 0, v.z);
          v.mesh.rotation.y = v.rot;
          continue;
        }
      }

      // Realistic city traffic AI
      if (v.turnCooldown > 0) v.turnCooldown -= dt;
      if (v.stopTimer > 0) {
        v.stopTimer -= dt;
        v.speed = Math.max(0, v.speed - 25 * dt);
        v.mesh.position.set(v.x, 0, v.z);
        continue;
      }

      const dv = DIR_VECTORS[v.dir];
      let targetSpeed = v.spec.isBus ? 11 : v.spec.isScooter ? 15 : 13.5;

      // Bus stops briefly at bus stops
      if (v.spec.isBus && v.turnCooldown <= 0) {
        for (let b = 0; b < busStops.length; b++) {
          const bs = busStops[b];
          if (Math.hypot(bs.x - v.x, bs.z - v.z) < 4.5) {
            v.stopTimer = 2.4;
            v.turnCooldown = 8.0;
            break;
          }
        }
      }

      // Check upcoming intersection & traffic light
      const along = dv.dx !== 0 ? v.x : v.z;
      const forwardSign = dv.dx !== 0 ? dv.dx : dv.dz;
      for (let r = 0; r < SV.ROAD_COORDS.length; r++) {
        const rc = SV.ROAD_COORDS[r];
        const distToCenter = (rc - along) * forwardSign;
        if (distToCenter > 8.2 && distToCenter < 16.5) {
          const light = SV.World.getTrafficState(clockSec, dv.axis);
          if (light !== 'green') {
            targetSpeed = 0;
          }
        } else if (distToCenter >= -1.2 && distToCenter <= 1.2 && v.turnCooldown <= 0) {
          // Turn or go straight at intersection
          const roll = Math.random();
          if (roll < 0.28) {
            v.dir = (v.dir + 1) % 4;
            v.turnCooldown = 2.2;
          } else if (roll < 0.52) {
            v.dir = (v.dir + 3) % 4;
            v.turnCooldown = 2.2;
          } else {
            v.turnCooldown = 1.6;
          }
          const ndv = DIR_VECTORS[v.dir];
          v.rot = ndv.rot;
          if (ndv.dx !== 0) {
            v.z = laneCoordForDir(nearestRoadCoord(v.z).coord, v.dir);
          } else {
            v.x = laneCoordForDir(nearestRoadCoord(v.x).coord, v.dir);
          }
          break;
        }
      }

      // Check vehicle or pedestrian ahead in lane
      const fx = Math.sin(v.rot);
      const fz = Math.cos(v.rot);
      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const other = vehicles[j];
        const dx = other.x - v.x;
        const dz = other.z - v.z;
        const forwardDist = dx * fx + dz * fz;
        const sideDist = Math.abs(dx * -fz + dz * fx);
        if (forwardDist > 0 && forwardDist < 10.5 && sideDist < 2.3) {
          targetSpeed = 0;
          break;
        }
      }

      if (targetSpeed > 0 && peds) {
        for (let p = 0; p < peds.length; p++) {
          const ped = peds[p];
          if (ped.dead) continue;
          const dx = ped.x - v.x;
          const dz = ped.z - v.z;
          const forwardDist = dx * fx + dz * fz;
          const sideDist = Math.abs(dx * -fz + dz * fx);
          if (forwardDist > 0 && forwardDist < 7.5 && sideDist < 2.0) {
            targetSpeed = 0;
            break;
          }
        }
      }

      // Wrap around city perimeter cleanly
      if (v.x > 135 || v.x < -135 || v.z > 125 || v.z < -135) {
        v.dir = (v.dir + 2) % 4;
        const ndv = DIR_VECTORS[v.dir];
        v.rot = ndv.rot;
        if (ndv.dx !== 0) {
          v.z = laneCoordForDir(nearestRoadCoord(v.z).coord, v.dir);
          v.x = Math.max(-128, Math.min(128, v.x));
        } else {
          v.x = laneCoordForDir(nearestRoadCoord(v.x).coord, v.dir);
          v.z = Math.max(-128, Math.min(118, v.z));
        }
      }

      v.speed += (targetSpeed - v.speed) * Math.min(1, dt * 4.5);
      v.x += Math.sin(v.rot) * v.speed * dt;
      v.z += Math.cos(v.rot) * v.speed * dt;
      v.mesh.position.set(v.x, 0, v.z);
      v.mesh.rotation.y = v.rot;
    }
  }

  function findNearestVehicle(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  SV.Vehicles = {
    spawnCityTraffic,
    spawnVehicle,
    updateVehicles,
    findNearestVehicle,
    setVisible: (vis) => {
      if (vehicleGroup) vehicleGroup.visible = vis;
    },
    getAll: () => vehicles,
  };
})();
