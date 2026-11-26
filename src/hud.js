(function () {
  const SV = (window.SV = window.SV || {});

  const els = {};
  let travelOpen = false;

  function cacheElements() {
    if (els.ready) return;
    els.ready = true;
    els.time = document.getElementById('hud-time');
    els.wanted = document.getElementById('hud-wanted');
    els.cash = document.getElementById('hud-cash');
    els.hpFill = document.getElementById('hp-fill');
    els.armorFill = document.getElementById('armor-fill');
    els.weaponName = document.getElementById('weapon-name');
    els.weaponAmmo = document.getElementById('weapon-ammo');
    els.missionBox = document.getElementById('hud-mission-box');
    els.missionTitle = document.getElementById('mission-title');
    els.missionObj = document.getElementById('mission-objective');
    els.missionTimer = document.getElementById('mission-timer');
    els.prompt = document.getElementById('interaction-prompt');
    els.minimap = document.getElementById('minimap');
    els.cityBadge = document.getElementById('city-badge');
    els.district = document.getElementById('district-label');
    els.speedoBox = document.getElementById('speedo-box');
    els.speedVal = document.getElementById('speed-val');
    els.vehicleLabel = document.getElementById('vehicle-label');
    els.radioStatus = document.getElementById('radio-status');
    els.travelModal = document.getElementById('travel-modal');
    els.travelGrid = document.getElementById('travel-city-grid');
    els.travelClose = document.getElementById('travel-close-btn');
  }

  function formatClock(hoursFloat) {
    const totalMins = Math.floor(((hoursFloat % 24) + 24) % 24 * 60);
    const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
    const mm = String(totalMins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function formatTimer(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const r = String(s % 60).padStart(2, '0');
    return `${m}:${r}`;
  }

  function drawMinimap(player, city) {
    const canvas = els.minimap;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.56;

    ctx.fillStyle = '#0d1324';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Water area
    ctx.fillStyle = '#0c3b5e';
    if (city.waterSide === 'south') {
      ctx.fillRect(-w, (124 - player.z) * scale, w * 2, 160);
    } else if (city.waterSide === 'west') {
      ctx.fillRect(-160 - (player.x + 124) * scale, -h, 160, h * 2);
    }

    // Roads
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    SV.ROAD_COORDS.forEach((c) => {
      const rx = (c - player.x) * scale;
      const rz = (c - player.z) * scale;
      ctx.beginPath();
      ctx.moveTo(rx, -h);
      ctx.lineTo(rx, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-w, rz);
      ctx.lineTo(w, rz);
      ctx.stroke();
    });

    // Travel Hubs (cyan squares)
    const hubs = SV.World.getTravelHubs();
    ctx.fillStyle = '#00f0ff';
    for (let i = 0; i < hubs.length; i++) {
      const hx = (hubs[i].x - player.x) * scale;
      const hz = (hubs[i].z - player.z) * scale;
      ctx.fillRect(hx - 4, hz - 4, 8, 8);
    }

    // Enterable Building Doors (green squares)
    const doors = SV.World.getBuildingDoors ? SV.World.getBuildingDoors() : [];
    ctx.fillStyle = '#2ee59d';
    for (let i = 0; i < doors.length; i++) {
      const dx = (doors[i].x - player.x) * scale;
      const dz = (doors[i].z - player.z) * scale;
      ctx.fillRect(dx - 3, dz - 3, 6, 6);
    }

    // Vehicles
    const vehicles = SV.Vehicles.getAll();
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v === player.vehicle) continue;
      const vx = (v.x - player.x) * scale;
      const vz = (v.z - player.z) * scale;
      ctx.fillStyle = v.spec.isPolice ? '#38bdf8' : '#94a3b8';
      ctx.fillRect(vx - 1.5, vz - 1.5, 3, 3);
    }

    // Mission Waypoint (gold dot)
    const mission = SV.Missions.getActive();
    if (mission) {
      const mx = (mission.x - player.x) * scale;
      const mz = (mission.z - player.z) * scale;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(mx, mz, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Arrow
    ctx.rotate(-player.rot + Math.PI);
    ctx.fillStyle = '#ff2e93';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function update(player, city, timeHours, wantedLevel, promptText) {
    cacheElements();
    els.time.textContent = formatClock(timeHours);

    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < wantedLevel ? '★' : '☆';
    els.wanted.textContent = stars;

    els.cash.textContent = `₩ ${Math.max(0, Math.floor(player.cash)).toLocaleString()}`;
    els.hpFill.style.width = `${Math.max(0, Math.min(100, player.hp))}%`;
    els.armorFill.style.width = `${Math.max(0, Math.min(100, player.armor))}%`;

    const wep = SV.WEAPONS[player.weaponIndex];
    els.weaponName.textContent = wep.name;
    els.weaponAmmo.textContent = wep.magSize === Infinity ? '∞' : `${player.ammo[wep.id]} / ${wep.magSize}`;

    const mission = SV.Missions.getActive();
    if (mission) {
      els.missionBox.classList.remove('hidden');
      els.missionTitle.textContent = mission.title;
      els.missionObj.textContent = mission.obj;
      els.missionTimer.classList.remove('hidden');
      els.missionTimer.textContent = formatTimer(SV.Missions.getTimer());
    } else {
      els.missionBox.classList.add('hidden');
    }

    if (promptText) {
      els.prompt.textContent = promptText;
      els.prompt.classList.remove('hidden');
    } else {
      els.prompt.classList.add('hidden');
    }

    if (player.vehicle) {
      els.speedoBox.classList.remove('hidden');
      els.speedVal.textContent = Math.round(Math.abs(player.vehicle.speed) * 3.6);
      els.vehicleLabel.textContent = player.vehicle.spec.label;
    } else {
      els.speedoBox.classList.add('hidden');
    }

    els.cityBadge.textContent = city.badge;
    els.district.textContent = SV.World.getDistrictAt(player.x, player.z, city.id);
    els.radioStatus.textContent = `${city.radio} • ${SV.Audio.isRadioOn() ? 'ON' : 'OFF'} [M]`;

    drawMinimap(player, city);
  }

  function renderTravelModal(currentCityId, playerCash, onSelectCity) {
    cacheElements();
    els.travelGrid.innerHTML = '';

    SV.CITY_ORDER.forEach((cid) => {
      const c = SV.CITIES[cid];
      const isCurrent = cid === currentCityId;
      const btn = document.createElement('button');
      btn.className = `city-card${isCurrent ? ' active' : ''}`;
      btn.disabled = isCurrent;

      const fareLabel = isCurrent
        ? 'ОДОО БАЙГАА ХОТ'
        : c.fare === 0
        ? 'ҮНЭГҮЙ'
        : `₩ ${c.fare.toLocaleString()}`;

      btn.innerHTML = `
        <div class="city-card-head">
          <span class="city-card-name">${c.name}</span>
          <span class="city-card-tag">${isCurrent ? 'ИДЭВХТЭЙ' : c.travelMode}</span>
        </div>
        <div class="city-card-kr">${c.kr}</div>
        <div class="city-card-desc">${c.desc}</div>
        <div class="city-card-meta">
          <span>Хүн ам: ${c.pedCount}+ иргэн</span>
          <span>${fareLabel}</span>
        </div>
      `;

      if (!isCurrent) {
        btn.addEventListener('click', () => {
          closeTravelModal();
          onSelectCity(cid, c.travelMode);
        });
      }
      els.travelGrid.appendChild(btn);
    });
  }

  function openTravelModal(currentCityId, playerCash, onSelectCity) {
    cacheElements();
    travelOpen = true;
    renderTravelModal(currentCityId, playerCash, onSelectCity);
    els.travelModal.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function closeTravelModal() {
    cacheElements();
    travelOpen = false;
    els.travelModal.classList.add('hidden');
  }

  SV.HUD = {
    update,
    openTravelModal,
    closeTravelModal,
    isTravelOpen: () => travelOpen,
  };
})();
