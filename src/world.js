(function () {
  const SV = (window.SV = window.SV || {});

  let cityGroup = null;
  let interiorGroup = null;
  let colliders = [];
  let indoorColliders = [];
  let indoorNpcs = [];
  let activeInterior = null;
  let trafficLights = [];
  let streetLampMats = [];
  let travelHubs = [];
  let buildingDoors = [];
  let busStops = [];
  let hangoutSpots = [];
  let ambientLight = null;
  let sunLight = null;
  let hemiLight = null;
  let indoorLight = null;

  const INTERIOR_CATALOG = [
    { type: 'store', title: 'GS24 편의점 (Дэлгүүр)', sign: 'GS24 편의점', cost: 3000, action: 'Ус, зууш авах (₩ 3,000 • +40 HP)' },
    { type: 'cafe', title: 'SEOUL CAFE & 치맥', sign: '서울 카페 & 치맥', cost: 5000, action: 'Кофе, хоол авах (₩ 5,000 • +60 HP, +25 AR)' },
    { type: 'club', title: 'NORAEBANG & CLUB', sign: '노래방 LIVE CLUB', cost: 4000, action: 'Энержи ундаа авах (₩ 4,000 • +30 HP, +40 AR)' },
    { type: 'hotel', title: 'SEOUL GRAND HOTEL', sign: '그랜드 호텔 LOBBY', cost: 8000, action: 'Амарч сэргээх (₩ 8,000 • 100% HP & AR)' },
  ];

  function ensureLights(scene) {
    if (ambientLight) return;
    hemiLight = new THREE.HemisphereLight(0xbbe0ff, 0x1e2538, 0.72);
    scene.add(hemiLight);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfff4dc, 1.25);
    sunLight.position.set(90, 145, 75);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 360;
    sunLight.shadow.camera.left = -155;
    sunLight.shadow.camera.right = 155;
    sunLight.shadow.camera.top = 155;
    sunLight.shadow.camera.bottom = -155;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    indoorLight = new THREE.PointLight(0xfff1d6, 0, 28);
    indoorLight.position.set(0, 4.6, 0);
    scene.add(indoorLight);
  }

  function addBox(parent, w, h, d, x, y, z, mat, colliderList, castShadow, receiveShadow) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (castShadow) mesh.castShadow = true;
    if (receiveShadow) mesh.receiveShadow = true;
    parent.add(mesh);
    if (colliderList) {
      colliderList.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
    }
    return mesh;
  }

  function buildRoadNetwork(parent, city) {
    const roadTex = SV.Textures.roadTexture();
    const swTex = SV.Textures.sidewalkTexture(city.id === 'jeju');
    const cwTex = SV.Textures.crosswalkTexture();

    const groundMat = new THREE.MeshLambertMaterial({ color: city.groundColor });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    parent.add(ground);

    const swMat = new THREE.MeshLambertMaterial({ map: swTex });
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const cwMat = new THREE.MeshBasicMaterial({ map: cwTex, transparent: true });

    const blockStarts = [-162, -108, -54, 0, 54, 108];
    for (let ix = 0; ix < blockStarts.length; ix++) {
      for (let iz = 0; iz < blockStarts.length; iz++) {
        const x0 = blockStarts[ix] + SV.ROAD_WIDTH / 2;
        const z0 = blockStarts[iz] + SV.ROAD_WIDTH / 2;
        const size = SV.CELL_SIZE - SV.ROAD_WIDTH;
        const cx = x0 + size / 2;
        const cz = z0 + size / 2;
        if (city.waterSide === 'south' && cz > 125) continue;
        if (city.waterSide === 'west' && cx < -125) continue;

        const curb = new THREE.Mesh(new THREE.BoxGeometry(size + 0.4, 0.14, size + 0.4), curbMat);
        curb.position.set(cx, 0.02, cz);
        curb.receiveShadow = true;
        const sw = new THREE.Mesh(new THREE.BoxGeometry(size - 0.3, 0.18, size - 0.3), swMat);
        sw.position.set(cx, 0.04, cz);
        sw.receiveShadow = true;
        parent.add(curb, sw);
      }
    }

    const roadLen = 300;
    SV.ROAD_COORDS.forEach((coord) => {
      const rNS = new THREE.Mesh(new THREE.PlaneGeometry(SV.ROAD_WIDTH, roadLen), roadMat);
      rNS.rotation.x = -Math.PI / 2;
      rNS.position.set(coord, 0.01, -10);
      rNS.receiveShadow = true;
      parent.add(rNS);

      const rEW = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, SV.ROAD_WIDTH), roadMat);
      rEW.rotation.x = -Math.PI / 2;
      rEW.position.set(0, 0.012, coord);
      rEW.receiveShadow = true;
      parent.add(rEW);

      for (let p = -140; p <= 120; p += 12) {
        const dashNS = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 5.2), lineMat);
        dashNS.rotation.x = -Math.PI / 2;
        dashNS.position.set(coord, 0.02, p);
        parent.add(dashNS);

        const dashEW = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.28), lineMat);
        dashEW.rotation.x = -Math.PI / 2;
        dashEW.position.set(p, 0.022, coord);
        parent.add(dashEW);
      }
    });

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const housingMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    SV.ROAD_COORDS.forEach((ix) => {
      SV.ROAD_COORDS.forEach((iz) => {
        if (city.waterSide === 'south' && iz > 110) return;
        if (city.waterSide === 'west' && ix < -110) return;

        const cwOffsets = [
          { x: ix, z: iz - 8.8, rot: 0 },
          { x: ix, z: iz + 8.8, rot: 0 },
          { x: ix - 8.8, z: iz, rot: Math.PI / 2 },
          { x: ix + 8.8, z: iz, rot: Math.PI / 2 },
        ];
        cwOffsets.forEach((cw) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 3.2), cwMat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = cw.rot;
          m.position.set(cw.x, 0.026, cw.z);
          parent.add(m);
        });

        const px = ix + 8.2;
        const pz = iz + 8.2;
        addBox(parent, 0.26, 5.2, 0.26, px, 2.6, pz, poleMat, null, true, false);
        addBox(parent, 0.85, 1.5, 0.85, px, 4.9, pz, housingMat, null, false, false);

        const nsRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const nsGreen = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const ewRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const ewGreen = new THREE.MeshBasicMaterial({ color: 0x22c55e });

        const bNsR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), nsRed);
        bNsR.position.set(px, 5.25, pz + 0.45);
        const bNsG = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), nsGreen);
        bNsG.position.set(px, 4.65, pz + 0.45);
        const bEwR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), ewRed);
        bEwR.position.set(px + 0.45, 5.25, pz);
        const bEwG = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), ewGreen);
        bEwG.position.set(px + 0.45, 4.65, pz);

        parent.add(bNsR, bNsG, bEwR, bEwG);
        trafficLights.push({ x: ix, z: iz, nsRed, nsGreen, ewRed, ewGreen });
      });
    });
  }

  function addTree(parent, x, z, isPalm) {
    if (isPalm) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.34, 5.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x6b4f3a })
      );
      trunk.position.set(x, 2.6, z);
      trunk.castShadow = true;
      parent.add(trunk);
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.58), leafMat);
        frond.position.set(x, 5.2, z);
        frond.rotation.y = (i / 6) * Math.PI * 2;
        frond.rotation.z = -0.28;
        frond.castShadow = true;
        parent.add(frond);
      }
    } else {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 2.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x5c4033 })
      );
      trunk.position.set(x, 1.25, z);
      trunk.castShadow = true;
      const crown1 = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0x15803d })
      );
      crown1.position.set(x, 3.3, z);
      crown1.castShadow = true;
      const crown2 = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x16a34a })
      );
      crown2.position.set(x + 0.45, 3.85, z - 0.3);
      parent.add(trunk, crown1, crown2);
    }
  }

  function addStreetLamp(parent, x, z) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    addBox(parent, 0.16, 4.7, 0.16, x, 2.35, z, poleMat, null, true, false);
    addBox(parent, 0.7, 0.12, 0.16, x + 0.25, 4.65, z, poleMat, null, false, false);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
    bulb.position.set(x + 0.5, 4.58, z);
    parent.add(bulb);
    streetLampMats.push(bulbMat);
  }

  function addStreetStall(parent, x, z, signText, isChinatown) {
    const tentColor = isChinatown ? 0xdc2626 : 0xea580c;
    const tentMat = new THREE.MeshLambertMaterial({ color: tentColor });
    const counterMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    addBox(parent, 4.2, 1.05, 2.2, x, 0.52, z, counterMat, colliders, true, true);
    addBox(parent, 4.6, 0.32, 2.6, x, 2.45, z, tentMat, null, true, false);
    [-1.9, 1.9].forEach((dx) => addBox(parent, 0.12, 2.4, 0.12, x + dx, 1.2, z + 1.1, counterMat, null, false, false));

    const lanternMat = new THREE.MeshBasicMaterial({ color: isChinatown ? 0xff3b30 : 0xffbe0b });
    for (let dx = -1.5; dx <= 1.5; dx += 1.5) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), lanternMat);
      l.position.set(x + dx, 2.1, z + 1.25);
      parent.add(l);
    }

    const sTex = SV.Textures.signTexture(signText, '#1a0b1c', '#ffd166', false);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), new THREE.MeshBasicMaterial({ map: sTex }));
    sign.position.set(x, 2.95, z + 1.32);
    parent.add(sign);

    hangoutSpots.push({ x, z: z + 2.0 });
  }

  function addBusStop(parent, x, z) {
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 });
    addBox(parent, 3.8, 2.35, 0.14, x, 1.18, z - 0.8, glassMat, null, false, false);
    addBox(parent, 4.0, 0.14, 1.65, x, 2.4, z - 0.1, frameMat, null, true, false);
    addBox(parent, 2.8, 0.45, 0.55, x, 0.25, z - 0.35, new THREE.MeshLambertMaterial({ color: 0x94a3b8 }), null, true, false);
    busStops.push({ x, z: z + 3.2 });
    hangoutSpots.push({ x, z: z + 0.45 });
  }

  function buildRealisticBuilding(parent, x, z, w, d, h, styleIdx, nColor, signTxt, enterableInfo, archetype) {
    const tex = SV.Textures.buildingTexture(archetype, styleIdx, nColor, true);
    const towerMat = new THREE.MeshLambertMaterial({ map: tex });
    const podiumMat = new THREE.MeshLambertMaterial({ color: archetype === 'brick' ? 0x3b2724 : 0x202838 });
    const graniteMat = new THREE.MeshLambertMaterial({ color: 0x2b3344 });
    const pillarMat = new THREE.MeshLambertMaterial({ color: archetype === 'brick' ? 0x523732 : 0x3b475e });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const shopTex = SV.Textures.storefrontTexture(nColor);
    const shopMat = new THREE.MeshBasicMaterial({ map: shopTex });

    // 1. Granite Foundation Plinth
    const pw = w + 0.7;
    const pd = d + 0.7;
    addBox(parent, pw, 0.42, pd, x, 0.21, z, graniteMat, null, false, true);

    // 2. Ground-Floor Commercial Podium (with collision)
    const podiumH = 4.4;
    addBox(parent, w + 0.4, podiumH, d + 0.4, x, 0.4 + podiumH / 2, z, podiumMat, colliders, true, true);

    // Architectural Corner Pilasters & Center Columns
    const colOffsets = [
      [-w / 2 - 0.18, -d / 2 - 0.18],
      [w / 2 + 0.18, -d / 2 - 0.18],
      [-w / 2 - 0.18, d / 2 + 0.18],
      [w / 2 + 0.18, d / 2 + 0.18],
    ];
    colOffsets.forEach(([ox, oz]) => {
      addBox(parent, 0.55, podiumH + 0.3, 0.55, x + ox, 0.4 + podiumH / 2, z + oz, pillarMat, null, true, false);
    });

    // Storefront Glass Display Windows on Front (+Z), Back (-Z), and Sides
    const frontW = Math.max(2.6, w - 1.6);
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(frontW, 3.1), shopMat);
    frontGlass.position.set(x, 2.05, z + d / 2 + 0.24);
    parent.add(frontGlass);

    const sideW = Math.max(2.4, d - 2.0);
    const sideGlassR = new THREE.Mesh(new THREE.PlaneGeometry(sideW, 2.9), shopMat);
    sideGlassR.rotation.y = Math.PI / 2;
    sideGlassR.position.set(x + w / 2 + 0.24, 2.05, z);
    const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(sideW, 2.9), shopMat);
    sideGlassL.rotation.y = -Math.PI / 2;
    sideGlassL.position.set(x - w / 2 - 0.24, 2.05, z);
    parent.add(sideGlassR, sideGlassL);

    // Podium Cornice Ledge
    addBox(parent, w + 0.85, 0.34, d + 0.85, x, 4.9, z, pillarMat, null, true, true);

    // Striped Fabric Awning above storefront
    const awningColor = enterableInfo ? '#0284c7' : styleIdx % 2 === 0 ? '#be185d' : '#1d4ed8';
    const awningMat = new THREE.MeshLambertMaterial({ map: SV.Textures.awningTexture(awningColor) });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 0.18, 1.45), awningMat);
    awning.position.set(x, 3.85, z + d / 2 + 0.85);
    awning.rotation.x = 0.22;
    awning.castShadow = true;
    parent.add(awning);

    // 3. Main Tower Shaft
    const upperH = Math.max(5, h - 4.9);
    const towerY = 5.05 + upperH / 2;
    addBox(parent, w, upperH, d, x, towerY, z, towerMat, null, true, true);

    // 4. Archetype-specific 3D Architectural Facade Details
    if (archetype === 'skyscraper') {
      // Protruding vertical aluminum curtain-wall fins
      for (let fx = -w / 2 + 1.8; fx < w / 2 - 1.2; fx += 2.6) {
        addBox(parent, 0.18, upperH, 0.24, x + fx, towerY, z + d / 2 + 0.08, metalMat, null, false, false);
        addBox(parent, 0.18, upperH, 0.24, x + fx, towerY, z - d / 2 - 0.08, metalMat, null, false, false);
      }
      // Stepped glass crown + LED rim + Helipad/Spire
      const crownH = Math.min(8.5, upperH * 0.32);
      const crownY = 5.05 + upperH + crownH / 2;
      addBox(parent, w * 0.72, crownH, d * 0.72, x, crownY, z, towerMat, null, true, true);
      const topY = 5.05 + upperH + crownH;
      addBox(parent, w * 0.74, 0.28, d * 0.74, x, topY + 0.14, z, new THREE.MeshBasicMaterial({ color: nColor }), null, false, false);
      addBox(parent, 2.4, 1.5, 2.2, x - 1.5, topY + 0.9, z, metalMat, null, true, false);
      addBox(parent, 0.22, 6.2, 0.22, x + 1.6, topY + 3.1, z, new THREE.MeshBasicMaterial({ color: nColor }), null, false, false);
    } else if (archetype === 'apartment' || archetype === 'stone') {
      // 3D Balconies & Railings on alternating floors + Outdoor AC units
      const floorStep = 4.2;
      for (let fy = 7.4; fy < 5.05 + upperH - 1.8; fy += floorStep) {
        addBox(parent, w * 0.56, 0.18, 0.95, x, fy, z + d / 2 + 0.46, graniteMat, null, true, true);
        addBox(parent, w * 0.56, 0.65, 0.08, x, fy + 0.36, z + d / 2 + 0.9, metalMat, null, false, false);
        // Side AC outdoor unit (실외기)
        addBox(parent, 0.45, 0.58, 0.75, x + w / 2 + 0.22, fy + 0.4, z + 1.2, metalMat, null, true, false);
      }
      // Rooftop parapet + Stairwell Penthouse (옥탑) + Water Tank
      const roofY = 5.05 + upperH;
      addBox(parent, w + 0.3, 0.65, d + 0.3, x, roofY + 0.32, z, graniteMat, null, true, true);
      addBox(parent, w * 0.36, 2.6, d * 0.36, x - 1.2, roofY + 1.3, z - 0.8, podiumMat, null, true, true);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.9, 12), metalMat);
      tank.position.set(x + w * 0.22, roofY + 1.25, z + 1.0);
      tank.castShadow = true;
      parent.add(tank);
    } else {
      // Brick commercial building with parapet cornice & rooftop HVAC
      const roofY = 5.05 + upperH;
      addBox(parent, w + 0.55, 0.55, d + 0.55, x, roofY + 0.27, z, pillarMat, null, true, true);
      addBox(parent, 2.2, 1.2, 1.8, x, roofY + 0.9, z, metalMat, null, true, false);
    }

    // 5. Korean Horizontal Signboard + Hanging Vertical Blade Sign (돌출간판)
    if (signTxt) {
      const sTex = SV.Textures.signTexture(signTxt, '#091124', nColor, false);
      const sMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w - 1.2, 8.2), 1.65),
        new THREE.MeshBasicMaterial({ map: sTex })
      );
      sMesh.position.set(x, 5.15, z + d / 2 + 0.48);
      parent.add(sMesh);

      // Vertical neon blade sign jutting out on the right side
      const vTex = SV.Textures.signTexture(signTxt, '#0b1224', nColor, true);
      const bladeMat = new THREE.MeshBasicMaterial({ map: vTex, side: THREE.DoubleSide });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 1.1), bladeMat);
      blade.position.set(x + w / 2 + 0.85, 6.8, z + d / 2 - 0.5);
      addBox(parent, 0.85, 0.12, 0.12, x + w / 2 + 0.4, 6.8, z + d / 2 - 0.5, metalMat, null, false, false);
      parent.add(blade);
    }

    // 6. Recessed Glass Double Door & Glowing Entry Portal for Enterable Buildings
    if (enterableInfo) {
      const doorX = x;
      const doorZ = z + d / 2 + 0.25;

      // Aluminum vestibule frame
      addBox(parent, 3.0, 3.1, 0.32, doorX, 1.95, doorZ, new THREE.MeshLambertMaterial({ color: 0x0f172a }), null, false, false);
      const doorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(2.35, 2.65),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 })
      );
      doorGlass.position.set(doorX, 1.75, doorZ + 0.18);
      parent.add(doorGlass);

      // Silver push-bar door handles
      [-0.25, 0.25].forEach((hx) => {
        addBox(parent, 0.06, 0.75, 0.08, doorX + hx, 1.5, doorZ + 0.22, metalMat, null, false, false);
      });

      // Glowing sidewalk entry marker
      const portalZ = doorZ + 1.65;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.15, 24),
        new THREE.MeshBasicMaterial({ color: 0x2ee59d, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(doorX, 0.16, portalZ);
      parent.add(ring);

      buildingDoors.push({
        x: doorX,
        z: portalZ,
        exitX: doorX,
        exitZ: portalZ + 1.2,
        interiorType: enterableInfo.type,
        title: enterableInfo.title,
        cost: enterableInfo.cost,
        action: enterableInfo.action,
      });
    }
  }

  function buildCityBlocks(parent, city) {
    const neonColors = ['#ff2e93', '#00f0ff', '#ffd166', '#a855f7', '#2ee59d'];
    const archetypes = ['skyscraper', 'apartment', 'brick', 'stone'];
    const blockCoords = [-81, -27, 27, 81];
    let idx = 0;
    let enterableIdx = 0;

    const enterableBlocks = [
      { bx: -27, bz: -27 },
      { bx: 27, bz: 27 },
      { bx: -27, bz: 27 },
      { bx: 81, bz: 27 },
    ];

    for (let bx of blockCoords) {
      for (let bz of blockCoords) {
        idx++;
        if (city.waterSide === 'south' && bz > 90) continue;
        if (city.waterSide === 'west' && bx < -90) continue;

        const isHubBlock = city.hubs.some((h) => Math.abs(h.x - bx) < 12 && Math.abs(h.z - bz) < 12);
        if (isHubBlock) {
          addTree(parent, bx - 13, bz - 13, city.palmTrees);
          addTree(parent, bx + 13, bz + 13, city.palmTrees);
          continue;
        }

        addStreetLamp(parent, bx - 17, bz - 17);
        addStreetLamp(parent, bx + 17, bz + 17);

        if ((bx === 27 && bz === -27) || (city.id === 'jeju' && idx % 4 === 0)) {
          for (let t = -10; t <= 10; t += 10) {
            addTree(parent, bx + t, bz - 10, city.palmTrees);
            addTree(parent, bx - t, bz + 10, city.palmTrees);
          }
          addStreetStall(parent, bx, bz, city.signs[idx % city.signs.length], city.id === 'incheon');
          continue;
        }

        const isEnterableBlock = enterableBlocks.some((eb) => eb.bx === bx && eb.bz === bz);
        const offsets =
          city.id === 'jeju'
            ? [
                { dx: -7.5, dz: 0, w: 12, d: 22 },
                { dx: 7.5, dz: 0, w: 12, d: 22 },
              ]
            : [
                { dx: -7.5, dz: -7.5, w: 13, d: 13 },
                { dx: 7.5, dz: -6.5, w: 13, d: 14 },
                { dx: 0, dz: 7.5, w: 22, d: 11 },
              ];

        offsets.forEach((b, bi) => {
          const baseH =
            city.id === 'seoul'
              ? 18 + ((idx * 7 + bi * 11) % 34)
              : city.id === 'incheon'
              ? 20 + ((idx * 9 + bi * 13) % 38)
              : city.id === 'busan'
              ? 14 + ((idx * 5 + bi * 9) % 28)
              : 9 + ((idx * 3 + bi * 5) % 9);

          let enterInfo = null;
          if (isEnterableBlock && bi === offsets.length - 1) {
            enterInfo = INTERIOR_CATALOG[enterableIdx % INTERIOR_CATALOG.length];
            enterableIdx++;
          }

          let arch = archetypes[(idx + bi) % archetypes.length];
          if (city.id === 'jeju') arch = bi % 2 === 0 ? 'stone' : 'brick';
          else if (enterInfo) arch = bi % 2 === 0 ? 'brick' : 'stone';
          else if (baseH > 32) arch = 'skyscraper';

          const nColor = enterInfo ? '#2ee59d' : neonColors[(idx + bi) % neonColors.length];
          const signTxt = enterInfo
            ? enterInfo.sign
            : Math.random() < city.neonDensity
            ? city.signs[(idx + bi) % city.signs.length]
            : null;

          buildRealisticBuilding(
            parent,
            bx + b.dx,
            bz + b.dz,
            b.w,
            b.d,
            baseH,
            idx + bi,
            nColor,
            signTxt,
            enterInfo,
            arch
          );
        });

        if (idx % 4 === 1) addBusStop(parent, bx, bz + 17.6);
        if (idx % 5 === 2) addStreetStall(parent, bx - 12, bz + 16.0, city.signs[idx % city.signs.length], city.id === 'incheon');
      }
    }
  }

  function buildTravelHubs(parent, city) {
    city.hubs.forEach((hub) => {
      const padMat = new THREE.MeshLambertMaterial({ color: 0x162038 });
      addBox(parent, 18, 0.3, 18, hub.x, 0.15, hub.z, padMat, null, false, true);
      addBox(parent, 10, 4.2, 5, hub.x, 2.1, hub.z - 5.5, new THREE.MeshLambertMaterial({ color: 0x2563eb }), colliders, true, true);

      const sTex = SV.Textures.signTexture(hub.label, '#091126', '#00f0ff', false);
      const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 2.2), new THREE.MeshBasicMaterial({ map: sTex }));
      sMesh.position.set(hub.x, 3.3, hub.z - 2.9);
      parent.add(sMesh);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.22, 10, 32),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(hub.x, 0.55, hub.z + 2.5);
      parent.add(ring);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, 18, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff2e93, transparent: true, opacity: 0.26 })
      );
      beacon.position.set(hub.x, 9, hub.z + 2.5);
      parent.add(beacon);

      travelHubs.push({
        x: hub.x,
        z: hub.z + 2.5,
        label: hub.label,
        target: hub.target,
        mode: hub.mode,
        ring,
      });
    });
  }

  function buildCityLandmarks(parent, city) {
    const waterMat = new THREE.MeshLambertMaterial({ color: city.waterColor, transparent: true, opacity: 0.9 });

    if (city.waterSide === 'south') {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(460, 120), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, -0.02, 185);
      water.receiveShadow = true;
      parent.add(water);
      if (city.hasBeach) {
        const beach = new THREE.Mesh(new THREE.PlaneGeometry(460, 26), new THREE.MeshLambertMaterial({ color: 0xe6c88a }));
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(0, 0.02, 124);
        beach.receiveShadow = true;
        parent.add(beach);
        for (let px = -120; px <= 120; px += 24) addTree(parent, px, 117, true);
      }
    } else if (city.waterSide === 'west') {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 460), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(-188, -0.02, 0);
      water.receiveShadow = true;
      parent.add(water);
    }

    if (city.id === 'seoul') {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(34, 14, 14), new THREE.MeshLambertMaterial({ color: 0x1b4332 }));
      hill.position.set(0, 7, -148);
      parent.add(hill);
      addBox(parent, 4.5, 42, 4.5, 0, 32, -148, new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }), colliders, true, true);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 5.5, 5.5, 16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
      pod.position.set(0, 54, -148);
      const neonRing = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.4, 8, 24), new THREE.MeshBasicMaterial({ color: 0xff2e93 }));
      neonRing.rotation.x = Math.PI / 2;
      neonRing.position.set(0, 54, -148);
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.9, 18, 8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      spire.position.set(0, 65, -148);
      parent.add(pod, neonRing, spire);

      addBox(parent, 16, 1.2, 85, 0, 1.5, 165, new THREE.MeshLambertMaterial({ color: 0x475569 }), null, true, true);
      addBox(parent, 1.2, 14, 1.2, -7.5, 8, 150, new THREE.MeshBasicMaterial({ color: 0x00f0ff }), null, false, false);
      addBox(parent, 1.2, 14, 1.2, 7.5, 8, 150, new THREE.MeshBasicMaterial({ color: 0x00f0ff }), null, false, false);
    } else if (city.id === 'busan') {
      addBox(parent, 260, 1.6, 10, 0, 10, 165, new THREE.MeshLambertMaterial({ color: 0x334155 }), null, true, true);
      const towerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      [-60, 60].forEach((tx) => {
        addBox(parent, 2.2, 26, 2.2, tx, 13, 160, towerMat, null, false, false);
        addBox(parent, 2.2, 26, 2.2, tx, 13, 170, towerMat, null, false, false);
      });
      addBox(parent, 24, 5, 9, -85, 2.5, 152, new THREE.MeshLambertMaterial({ color: 0xb91c1c }), null, true, true);
      addBox(parent, 6, 6, 7, -91, 7, 152, new THREE.MeshLambertMaterial({ color: 0xf8fafc }), null, true, false);
    } else if (city.id === 'incheon') {
      const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
      const goldMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });
      addBox(parent, 1.6, 9, 1.6, -34, 4.5, -81, redMat, colliders, true, false);
      addBox(parent, 1.6, 9, 1.6, -20, 4.5, -81, redMat, colliders, true, false);
      addBox(parent, 18, 2.2, 2.8, -27, 9.6, -81, goldMat, null, true, false);
      addBox(parent, 18, 0.2, 160, -138, 0.1, 0, new THREE.MeshLambertMaterial({ color: 0x1e293b }), null, false, true);
      addBox(parent, 4, 24, 4, -124, 12, 27, new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }), colliders, true, true);
      addBox(parent, 7, 3, 7, -124, 25, 27, new THREE.MeshBasicMaterial({ color: 0x00f0ff }), null, false, false);
    } else if (city.id === 'jeju') {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(46, 34, 12), new THREE.MeshLambertMaterial({ color: 0x3f4f44 }));
      peak.position.set(0, 17, -154);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(15, 10, 12), new THREE.MeshLambertMaterial({ color: 0x6b7280 }));
      cap.position.set(0, 30, -154);
      parent.add(peak, cap);
      const lh = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.6, 16, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      lh.position.set(95, 8, 126);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(95, 17, 126);
      parent.add(lh, beacon);
    }
  }

  function buildCity(scene, cityId) {
    ensureLights(scene);
    if (cityGroup) scene.remove(cityGroup);
    if (interiorGroup) {
      scene.remove(interiorGroup);
      interiorGroup = null;
      activeInterior = null;
    }

    cityGroup = new THREE.Group();
    colliders = [];
    trafficLights = [];
    streetLampMats = [];
    travelHubs = [];
    buildingDoors = [];
    busStops = [];
    hangoutSpots = [];

    const city = SV.CITIES[cityId] || SV.CITIES.seoul;
    buildRoadNetwork(cityGroup, city);
    buildCityBlocks(cityGroup, city);
    buildTravelHubs(cityGroup, city);
    buildCityLandmarks(cityGroup, city);

    scene.add(cityGroup);
    return city;
  }

  function spawnIndoorNpc(parent, x, z, rot, outfit, isStaff) {
    const rig = SV.Entities.createHumanoidMesh(outfit, false, false, isStaff);
    rig.mesh.position.set(x, 0, z);
    rig.mesh.rotation.y = rot;
    parent.add(rig.mesh);
    indoorNpcs.push({ rig, baseRot: rot, phase: Math.random() * 6 });
  }

  function enterBuilding(scene, door) {
    ensureLights(scene);
    if (cityGroup) cityGroup.visible = false;
    if (interiorGroup) scene.remove(interiorGroup);

    interiorGroup = new THREE.Group();
    indoorColliders = [];
    indoorNpcs = [];
    activeInterior = door;

    const roomW = 16;
    const roomD = 14;
    const wallH = 5.4;
    const type = door.interiorType;

    const floorKind = type === 'cafe' ? 'wood' : type === 'club' ? 'club' : 'tile';
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      new THREE.MeshLambertMaterial({ map: SV.Textures.floorTileTexture(floorKind) })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    interiorGroup.add(floor);

    const wallColor = type === 'club' ? 0x16122b : type === 'cafe' ? 0x42332a : type === 'hotel' ? 0x2b3346 : 0xe2e8f0;
    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });

    addBox(interiorGroup, roomW, wallH, 0.4, 0, wallH / 2, -roomD / 2, wallMat, null, false, true);
    addBox(interiorGroup, 0.4, wallH, roomD, -roomW / 2, wallH / 2, 0, wallMat, null, false, true);
    addBox(interiorGroup, 0.4, wallH, roomD, roomW / 2, wallH / 2, 0, wallMat, null, false, true);
    addBox(interiorGroup, 6.2, wallH, 0.4, -4.9, wallH / 2, roomD / 2, wallMat, null, false, true);
    addBox(interiorGroup, 6.2, wallH, 0.4, 4.9, wallH / 2, roomD / 2, wallMat, null, false, true);

    const exitDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    exitDoor.position.set(0, 1.6, roomD / 2 - 0.1);
    interiorGroup.add(exitDoor);

    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.75),
      new THREE.MeshBasicMaterial({ map: SV.Textures.signTexture('EXIT ГАРАХ [E]', '#091124', '#00f0ff', false) })
    );
    exitSign.position.set(0, 3.6, roomD / 2 - 0.25);
    exitSign.rotation.y = Math.PI;
    interiorGroup.add(exitSign);

    const counterMat = new THREE.MeshLambertMaterial({ color: type === 'cafe' ? 0x7c4a2d : 0x1e293b });
    const topMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    if (type === 'store') {
      addBox(interiorGroup, 6.5, 1.1, 1.3, -3.2, 0.55, -4.8, counterMat, indoorColliders, true, true);
      addBox(interiorGroup, 6.6, 0.12, 1.4, -3.2, 1.12, -4.8, topMat, null, false, false);
      [-3.5, 2.5].forEach((sx) => {
        addBox(interiorGroup, 1.1, 1.9, 5.2, sx, 0.95, 0.2, new THREE.MeshLambertMaterial({ color: 0x334155 }), indoorColliders, true, true);
        addBox(interiorGroup, 1.16, 0.4, 5.0, sx, 1.4, 0.2, new THREE.MeshBasicMaterial({ color: 0xffd166 }), null, false, false);
      });
      addBox(interiorGroup, 0.7, 3.0, 8.5, 7.3, 1.5, -1.0, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), indoorColliders, false, false);
      spawnIndoorNpc(interiorGroup, -3.2, -5.8, 0, SV.PED_OUTFITS[4], true);
      spawnIndoorNpc(interiorGroup, 4.5, 1.0, -Math.PI / 2, SV.PED_OUTFITS[1], false);
    } else if (type === 'cafe') {
      addBox(interiorGroup, 6.8, 1.15, 1.4, 0, 0.57, -5.0, counterMat, indoorColliders, true, true);
      addBox(interiorGroup, 2.2, 0.75, 1.1, 1.8, 1.5, -5.0, new THREE.MeshBasicMaterial({ color: 0xffecb3 }), null, false, false);
      [[-4.5, -0.8], [4.5, -0.8], [-4.5, 2.8], [4.5, 2.8]].forEach(([tx, tz]) => {
        addBox(interiorGroup, 1.6, 0.82, 1.6, tx, 0.41, tz, counterMat, indoorColliders, true, true);
        addBox(interiorGroup, 0.28, 0.3, 0.28, tx - 0.3, 0.98, tz, topMat, null, false, false);
      });
      spawnIndoorNpc(interiorGroup, 0, -6.0, 0, SV.PED_OUTFITS[0], true);
      spawnIndoorNpc(interiorGroup, -4.5, -1.9, 0, SV.PED_OUTFITS[2], false);
      spawnIndoorNpc(interiorGroup, 4.5, 1.7, 0, SV.PED_OUTFITS[3], false);
    } else if (type === 'club') {
      addBox(interiorGroup, 8.0, 0.5, 2.8, 0, 0.25, -5.2, new THREE.MeshLambertMaterial({ color: 0x2e1065 }), indoorColliders, true, true);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(7.2, 2.8),
        new THREE.MeshBasicMaterial({ map: SV.Textures.signTexture('SEOUL LIVE KARAOKE', '#1e0b36', '#ff2e93', false) })
      );
      screen.position.set(0, 2.8, -6.6);
      interiorGroup.add(screen);
      addBox(interiorGroup, 5.2, 1.1, 1.2, -4.8, 0.55, 0.5, counterMat, indoorColliders, true, true);
      addBox(interiorGroup, 1.4, 0.85, 5.2, 6.2, 0.42, 0.5, new THREE.MeshLambertMaterial({ color: 0xbe185d }), indoorColliders, true, true);
      spawnIndoorNpc(interiorGroup, 0, -4.5, 0, SV.PED_OUTFITS[3], false);
      spawnIndoorNpc(interiorGroup, -4.8, -0.5, 0, SV.PED_OUTFITS[0], true);
      spawnIndoorNpc(interiorGroup, 2.2, -1.2, -0.4, SV.PED_OUTFITS[5], false);
    } else {
      addBox(interiorGroup, 7.2, 1.15, 1.4, 0, 0.57, -5.0, counterMat, indoorColliders, true, true);
      addBox(interiorGroup, 7.4, 0.14, 1.5, 0, 1.2, -5.0, topMat, null, false, false);
      addBox(interiorGroup, 3.6, 0.85, 1.5, -4.6, 0.42, 0.5, new THREE.MeshLambertMaterial({ color: 0x3b82f6 }), indoorColliders, true, true);
      addBox(interiorGroup, 3.6, 0.85, 1.5, 4.6, 0.42, 0.5, new THREE.MeshLambertMaterial({ color: 0x3b82f6 }), indoorColliders, true, true);
      spawnIndoorNpc(interiorGroup, 0, -6.0, 0, SV.PED_OUTFITS[0], true);
      spawnIndoorNpc(interiorGroup, 4.2, -0.6, Math.PI, SV.PED_OUTFITS[2], false);
    }

    indoorLight.intensity = type === 'club' ? 1.35 : 1.75;
    indoorLight.color.setHex(type === 'club' ? 0xff77cc : 0xfff5e4);
    scene.add(interiorGroup);
  }

  function exitBuilding(scene) {
    if (!activeInterior) return null;
    const prevDoor = activeInterior;
    if (interiorGroup) {
      scene.remove(interiorGroup);
      interiorGroup = null;
    }
    indoorNpcs = [];
    indoorColliders = [];
    activeInterior = null;
    indoorLight.intensity = 0;
    if (cityGroup) cityGroup.visible = true;
    return prevDoor;
  }

  function resolveIndoorCollision(x, z, radius) {
    let nx = Math.max(-7.2, Math.min(7.2, x));
    let nz = Math.max(-6.2, Math.min(6.3, z));
    for (let i = 0; i < indoorColliders.length; i++) {
      const c = indoorColliders[i];
      const cx = Math.max(c.minX, Math.min(nx, c.maxX));
      const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const dx = nx - cx;
      const dz = nz - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq < radius * radius) {
        const d = Math.sqrt(dSq) || 0.001;
        nx += (dx / d) * (radius - d);
        nz += (dz / d) * (radius - d);
      }
    }
    return { x: nx, z: nz };
  }

  function updateIndoorNpcs(clockSec) {
    for (let i = 0; i < indoorNpcs.length; i++) {
      const npc = indoorNpcs[i];
      const sway = activeInterior && activeInterior.interiorType === 'club' ? 0.35 : 0.08;
      npc.rig.mesh.rotation.y = npc.baseRot + Math.sin(clockSec * 2.2 + npc.phase) * sway;
      SV.Entities.animateLimbs(npc.rig, clockSec * 3.5 + npc.phase, activeInterior && activeInterior.interiorType === 'club' ? 0.45 : 0);
    }
  }

  function getTrafficState(clockSec, axis) {
    const cycle = (SV.TRAFFIC_GREEN_DURATION + SV.TRAFFIC_YELLOW_DURATION) * 2;
    const t = clockSec % cycle;
    const half = SV.TRAFFIC_GREEN_DURATION + SV.TRAFFIC_YELLOW_DURATION;
    if (axis === 'ns') {
      if (t < SV.TRAFFIC_GREEN_DURATION) return 'green';
      if (t < half) return 'yellow';
      return 'red';
    }
    if (t < half) return 'red';
    if (t < half + SV.TRAFFIC_GREEN_DURATION) return 'green';
    return 'yellow';
  }

  function updateEnvironment(scene, timeHours, cityId, clockSec, dt) {
    if (activeInterior) {
      scene.background = new THREE.Color(0x0b0e19);
      if (scene.fog) scene.fog.color.setHex(0x0b0e19);
      updateIndoorNpcs(clockSec);
      return;
    }

    if (SV.GoogleMaps && SV.GoogleMaps.isEnabled()) {
      if (cityGroup) {
        cityGroup.visible = !SV.GoogleMaps.shouldHideProceduralBuildings();
      }
      if (SV.GoogleMaps.shouldHideProceduralBuildings()) {
        scene.background = null;
        scene.fog = null;
        if (sunLight && ambientLight && hemiLight) {
          sunLight.intensity = 1.1;
          ambientLight.intensity = 0.55;
          hemiLight.intensity = 0.7;
        }
        return;
      }
    } else if (cityGroup) {
      cityGroup.visible = true;
    }

    const city = SV.CITIES[cityId] || SV.CITIES.seoul;
    const dayFactor = Math.max(0, Math.sin(((timeHours - 6) / 12) * Math.PI));
    const isNight = timeHours < 6.5 || timeHours > 18.5;

    const skyDay = new THREE.Color(city.skyDay);
    const skyNight = new THREE.Color(city.skyNight);
    const skyDusk = new THREE.Color(city.skyDusk);

    let sky = skyNight.clone();
    if (dayFactor > 0.35) {
      sky = skyDusk.clone().lerp(skyDay, (dayFactor - 0.35) / 0.65);
    } else if (dayFactor > 0) {
      sky = skyNight.clone().lerp(skyDusk, dayFactor / 0.35);
    }

    scene.background = sky;
    if (!scene.fog) scene.fog = new THREE.FogExp2(sky.getHex(), 0.0028);
    scene.fog.color.copy(sky);

    if (sunLight && ambientLight && hemiLight) {
      sunLight.intensity = 0.25 + dayFactor * 1.05;
      ambientLight.intensity = 0.24 + dayFactor * 0.28;
      hemiLight.intensity = 0.32 + dayFactor * 0.55;
      const sunAngle = ((timeHours - 6) / 24) * Math.PI * 2;
      sunLight.position.set(Math.cos(sunAngle) * 140, Math.max(35, Math.sin(sunAngle) * 155), 70);
    }

    const lampColor = isNight ? 0xffd166 : 0x64748b;
    for (let i = 0; i < streetLampMats.length; i++) {
      streetLampMats[i].color.setHex(lampColor);
    }

    const nsState = getTrafficState(clockSec, 'ns');
    const ewState = getTrafficState(clockSec, 'ew');
    for (let i = 0; i < trafficLights.length; i++) {
      const tl = trafficLights[i];
      tl.nsRed.color.setHex(nsState === 'red' ? 0xff3b5c : 0x331118);
      tl.nsGreen.color.setHex(nsState === 'green' ? 0x22c55e : nsState === 'yellow' ? 0xfacc15 : 0x0d2b18);
      tl.ewRed.color.setHex(ewState === 'red' ? 0xff3b5c : 0x331118);
      tl.ewGreen.color.setHex(ewState === 'green' ? 0x22c55e : ewState === 'yellow' ? 0xfacc15 : 0x0d2b18);
    }

    for (let i = 0; i < travelHubs.length; i++) {
      const h = travelHubs[i];
      h.ring.rotation.z += dt * 1.8;
      const pulse = 1 + Math.sin(clockSec * 3.2 + i) * 0.08;
      h.ring.scale.set(pulse, pulse, 1);
    }
  }

  function resolveCircleCollision(x, z, radius) {
    let nx = Math.max(-SV.HALF_WORLD, Math.min(SV.HALF_WORLD, x));
    let nz = Math.max(-SV.HALF_WORLD, Math.min(SV.HALF_WORLD, z));
    let hit = false;

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const closestX = Math.max(c.minX, Math.min(nx, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else {
          nx += radius;
        }
      }
    }
    return { x: nx, z: nz, hit };
  }

  function getDistrictAt(x, z, cityId) {
    if (activeInterior) return activeInterior.title;
    const city = SV.CITIES[cityId] || SV.CITIES.seoul;
    let best = city.districts[0].name;
    let bestD = Infinity;
    for (let i = 0; i < city.districts.length; i++) {
      const d = city.districts[i];
      const dist = (d.x - x) ** 2 + (d.z - z) ** 2;
      if (dist < bestD) {
        bestD = dist;
        best = d.name;
      }
    }
    return best;
  }

  SV.World = {
    buildCity,
    enterBuilding,
    exitBuilding,
    resolveIndoorCollision,
    isInsideBuilding: () => !!activeInterior,
    getActiveInterior: () => activeInterior,
    updateEnvironment,
    resolveCircleCollision,
    getTrafficState,
    getDistrictAt,
    getColliders: () => colliders,
    getTravelHubs: () => travelHubs,
    getBuildingDoors: () => buildingDoors,
    getBusStops: () => busStops,
    getHangoutSpots: () => hangoutSpots,
  };
})();
