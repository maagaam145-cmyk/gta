(function () {
  const SV = (window.SV = window.SV || {});

  const STORAGE_KEY = 'seoul_vice_gmaps_api_key';
  const ATTRIBUTION_ID = 'gmp_git_agentskills_v1';

  let enabled = false;
  let hideProceduralBuildings = true;
  let modalOpen = false;
  let mapEl = null;
  let loadedKey = null;
  let mapMode = 'hybrid';

  function getSavedKey() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function saveKey(key) {
    try {
      if (key) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function setStatus(msg, isError) {
    const el = document.getElementById('gmaps-status-text');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#ff3b5c' : '#2ee59d';
  }

  function loadMapsScript(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && loadedKey === apiKey) {
        resolve();
        return;
      }

      const existing = document.getElementById('gmaps-js-loader');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'gmaps-js-loader';
      script.async = true;
      script.defer = true;
      script.src =
        `https://maps.googleapis.com/maps/api/js` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&loading=async` +
        `&libraries=maps3d` +
        `&language=ko` +
        `&region=KR`;

      script.onload = () => {
        loadedKey = apiKey;
        resolve();
      };
      script.onerror = () => reject(new Error('Google Maps JS API ачаалахад алдаа гарлаа.'));
      document.head.appendChild(script);
    });
  }

  async function initMap3D(apiKey, city) {
    setStatus('Google Maps 3D ачаалж байна...', false);
    await loadMapsScript(apiKey);

    if (!window.google || !window.google.maps || !window.google.maps.importLibrary) {
      throw new Error('Maps JavaScript API буруу эсвэл API Key хүчингүй байна.');
    }

    const { Map3DElement, MapMode } = await window.google.maps.importLibrary('maps3d');
    const wrap = document.getElementById('gmaps-3d-wrap');
    wrap.innerHTML = '';

    const el = new Map3DElement({
      center: { lat: city.lat, lng: city.lng, altitude: 28 },
      range: 180,
      tilt: 67.5,
      heading: 0,
      mode: mapMode === 'satellite' ? MapMode.SATELLITE : MapMode.HYBRID,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    el.id = 'gmp-3d-map';
    wrap.appendChild(el);
    wrap.classList.remove('hidden');

    mapEl = el;
    enabled = true;
    setStatus(`Идэвхтэй: ${city.name} Google Maps 3D`, false);
    updateIndicator();
  }

  function disableMap3D() {
    enabled = false;
    mapEl = null;
    const wrap = document.getElementById('gmaps-3d-wrap');
    if (wrap) {
      wrap.innerHTML = '';
      wrap.classList.add('hidden');
    }
    setStatus('Идэвхгүй (Стандарт 3D хот)', false);
    updateIndicator();
  }

  function updateIndicator() {
    const badge = document.getElementById('gmaps-pill');
    if (!badge) return;
    badge.textContent = enabled
      ? `GMAPS 3D: ON (${hideProceduralBuildings ? 'Зөвхөн Google' : 'Хосолсон'}) [K/B]`
      : 'GMAPS 3D: OFF [K]';
    badge.classList.toggle('active', enabled);
  }

  function syncCamera(city, playerX, playerZ, camYaw, camPitch) {
    if (!enabled || !mapEl || !city) return;
    // Convert local meter coordinates (x: East, z: South) to WGS84 offsets
    const latOffset = -playerZ / 111320;
    const lngOffset = playerX / (111320 * Math.cos((city.lat * Math.PI) / 180));

    const headingDeg = (((-camYaw * 180) / Math.PI) % 360 + 360) % 360;
    const tiltDeg = Math.max(25, Math.min(80, 90 - (camPitch * 180) / Math.PI));

    mapEl.center = {
      lat: city.lat + latOffset,
      lng: city.lng + lngOffset,
      altitude: 16,
    };
    mapEl.heading = headingDeg;
    mapEl.tilt = tiltDeg;
    mapEl.range = 135;
  }

  // OGC 3D Tiles URL builder & attribution formatter (Map Tiles API specification)
  function buildTileUrl(relativeUri, apiKey) {
    const url = new URL(relativeUri, 'https://tile.googleapis.com');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('solution_id', ATTRIBUTION_ID);
    return url.toString();
  }

  function formatTileAttributions(copyrightStrings) {
    const counts = new Map();
    for (const raw of copyrightStrings) {
      if (!raw) continue;
      const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
      for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .join('; ');
  }

  function openModal(onStateChanged) {
    modalOpen = true;
    const modal = document.getElementById('gmaps-modal');
    const input = document.getElementById('gmaps-api-key-input');
    const hideCheck = document.getElementById('gmaps-hide-proc');
    const modeSel = document.getElementById('gmaps-mode-select');
    if (input) input.value = getSavedKey();
    if (hideCheck) hideCheck.checked = hideProceduralBuildings;
    if (modeSel) modeSel.value = mapMode;
    modal.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();

    const connectBtn = document.getElementById('gmaps-connect-btn');
    const offBtn = document.getElementById('gmaps-disable-btn');
    const closeBtn = document.getElementById('gmaps-close-btn');

    connectBtn.onclick = async () => {
      const key = (input.value || '').trim();
      if (!key) {
        setStatus('Google Maps API Key оруулна уу.', true);
        return;
      }
      hideProceduralBuildings = !!(hideCheck && hideCheck.checked);
      mapMode = (modeSel && modeSel.value) || 'hybrid';
      saveKey(key);
      try {
        const city = SV.CITIES[(SV.state && SV.state.cityId) || 'seoul'];
        await initMap3D(key, city);
        closeModal();
        if (onStateChanged) onStateChanged();
      } catch (err) {
        setStatus(err.message || 'Холболт амжилтгүй.', true);
      }
    };

    offBtn.onclick = () => {
      disableMap3D();
      closeModal();
      if (onStateChanged) onStateChanged();
    };

    closeBtn.onclick = () => closeModal();
  }

  function closeModal() {
    modalOpen = false;
    const modal = document.getElementById('gmaps-modal');
    if (modal) modal.classList.add('hidden');
  }

  function toggleProceduralBuildings() {
    hideProceduralBuildings = !hideProceduralBuildings;
    updateIndicator();
    return hideProceduralBuildings;
  }

  SV.GoogleMaps = {
    isEnabled: () => enabled,
    isModalOpen: () => modalOpen,
    shouldHideProceduralBuildings: () => enabled && hideProceduralBuildings,
    toggleProceduralBuildings,
    syncCamera,
    openModal,
    closeModal,
    disableMap3D,
    updateIndicator,
    buildTileUrl,
    formatTileAttributions,
  };
})();
