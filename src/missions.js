(function () {
  const SV = (window.SV = window.SV || {});

  const CITY_MISSIONS = {
    seoul: [
      { title: 'Gangnam Express', obj: 'Ганнам дахь шар цэг рүү хүргэлт хий', x: 81, z: 27, time: 75, reward: 35000 },
      { title: 'Myeongdong Courier', obj: 'Мёндун гудамж руу яаралтай илгээмж хүргэ', x: 0, z: 0, time: 65, reward: 28000 },
      { title: 'Han River Sprint', obj: 'Хан мөрний эрэг рүү давхиарай', x: 0, z: 108, time: 70, reward: 32000 },
      { title: 'KTX Station Run', obj: 'KTX Сөүл өртөө рүү зорчигч хүргэ', x: -81, z: -81, time: 75, reward: 40000 },
    ],
    busan: [
      { title: 'Haeundae Delivery', obj: 'Хэундэ далайн эрэг рүү хоол хүргэ', x: 54, z: 108, time: 75, reward: 36000 },
      { title: 'Jagalchi Cargo', obj: 'Жагалчи зах руу ачаа хүргэ', x: -81, z: 54, time: 70, reward: 32000 },
      { title: 'Centum VIP Ride', obj: 'Сентум Сити рүү VIP зочин хүргэ', x: 81, z: -27, time: 70, reward: 38000 },
    ],
    incheon: [
      { title: 'Chinatown Express', obj: 'Чайнатаун улаан хаалга руу оч', x: -27, z: -81, time: 70, reward: 34000 },
      { title: 'Songdo Tech Drop', obj: 'Сондуу цамхаг руу илгээмж хүргэ', x: 54, z: 0, time: 65, reward: 32000 },
      { title: 'Airport Rush', obj: 'Инчеон нисэх буудлын цэгт хүр', x: -81, z: 54, time: 75, reward: 42000 },
    ],
    jeju: [
      { title: 'Aewol Coffee Run', obj: 'Эволь далайн эргийн кафе руу оч', x: -81, z: 27, time: 75, reward: 35000 },
      { title: 'Seogwipo Harbor', obj: 'Согвипо боомтын шар цэгт хүр', x: 54, z: 81, time: 75, reward: 38000 },
      { title: 'Hallasan Trail', obj: 'Халласан уулын бэл рүү оч', x: 0, z: -81, time: 75, reward: 36000 },
    ],
  };

  let markerMesh = null;
  let activeMission = null;
  let timer = 0;
  let missionIndex = 0;
  let nextDelay = 0;
  let bannerTimer = 0;

  function ensureMarker(scene) {
    if (markerMesh) return;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.2, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 24, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.28 })
    );
    beam.position.y = 12;

    g.add(ring, beam);
    markerMesh = g;
    scene.add(markerMesh);
  }

  function startNextMission(scene, cityId) {
    ensureMarker(scene);
    const list = CITY_MISSIONS[cityId] || CITY_MISSIONS.seoul;
    const m = list[missionIndex % list.length];
    missionIndex++;
    activeMission = Object.assign({}, m);
    timer = m.time;
    markerMesh.visible = true;
    markerMesh.position.set(m.x, 0, m.z);
  }

  function showBanner(title, sub) {
    const banner = document.getElementById('center-banner');
    document.getElementById('banner-title').textContent = title;
    document.getElementById('banner-sub').textContent = sub;
    banner.classList.remove('hidden');
    bannerTimer = 3.2;
  }

  function update(dt, scene, player, cityId, clockSec) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) {
        document.getElementById('center-banner').classList.add('hidden');
      }
    }

    if (!activeMission) {
      nextDelay -= dt;
      if (nextDelay <= 0) {
        startNextMission(scene, cityId);
      }
      return;
    }

    if (markerMesh) {
      markerMesh.rotation.y = clockSec * 1.5;
    }

    timer -= dt;
    if (timer <= 0) {
      activeMission = null;
      if (markerMesh) markerMesh.visible = false;
      nextDelay = 3.5;
      showBanner('ХУГАЦАА ДУУСЛАА', 'Шинэ даалгавар удахгүй гарна');
      return;
    }

    const dist = Math.hypot(player.x - activeMission.x, player.z - activeMission.z);
    if (dist < 5.5) {
      const reward = activeMission.reward;
      player.cash += reward;
      SV.Audio.playCashChime();
      showBanner('ДААЛГАВАР БИЕЛЛЭЭ!', `+ ₩ ${reward.toLocaleString()}`);
      activeMission = null;
      if (markerMesh) markerMesh.visible = false;
      nextDelay = 4.0;
    }
  }

  function resetForCity(scene, cityId) {
    if (markerMesh) {
      scene.remove(markerMesh);
      markerMesh = null;
    }
    activeMission = null;
    missionIndex = 0;
    startNextMission(scene, cityId);
  }

  SV.Missions = {
    resetForCity,
    update,
    showBanner,
    getActive: () => activeMission,
    getTimer: () => timer,
  };
})();
