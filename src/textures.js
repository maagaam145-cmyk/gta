(function () {
  const SV = (window.SV = window.SV || {});
  const cache = {};

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  }

  function sharpTex(canvas, rx, ry) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    if (rx && ry) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
    }
    tex.needsUpdate = true;
    return tex;
  }

  function roadTexture() {
    if (cache.road) return cache.road;
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#202530';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(x, y, 2, 2);
    }
    cache.road = sharpTex(c, 8, 8);
    return cache.road;
  }

  function sidewalkTexture(isJeju) {
    const key = isJeju ? 'sw_jeju' : 'sw_city';
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = isJeju ? '#555c66' : '#4a5263';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      for (let y = 0; y < 512; y += 64) {
        ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(x + 2, y + 2, 60, 60);
      }
    }
    ctx.strokeStyle = 'rgba(15,23,42,0.32)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    cache[key] = sharpTex(c, 6, 6);
    return cache[key];
  }

  function buildingTexture(archetype, styleIndex, neonColor, isNight) {
    const mode = isNight ? 'n' : 'd';
    const key = `bld4_${archetype}_${styleIndex}_${neonColor}_${mode}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(512, 1024);

    const palettes = {
      skyscraper: { wall: '#1b283b', trim: '#324866', frame: '#0c1524', glassTop: '#5ca0d3', glassBot: '#1d3654' },
      apartment: { wall: '#464d5c', trim: '#5f687a', frame: '#1e2430', glassTop: '#4e6f8c', glassBot: '#213142' },
      brick: { wall: '#4d312c', trim: '#63413b', frame: '#241614', glassTop: '#56758f', glassBot: '#263647' },
      stone: { wall: '#3c4048', trim: '#535863', frame: '#1b1e24', glassTop: '#5c84a6', glassBot: '#24374a' },
    };
    const pal = palettes[archetype] || palettes.skyscraper;

    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, 512, 1024);

    if (archetype === 'brick') {
      for (let y = 0; y < 1024; y += 16) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, y, 512, 2);
        const offset = (y / 16) % 2 === 0 ? 0 : 24;
        for (let x = offset; x < 512; x += 48) ctx.fillRect(x, y, 2, 16);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 2, 1024);
      for (let y = 0; y < 1024; y += 56) ctx.fillRect(0, y, 512, 3);
    }

    const cols = archetype === 'skyscraper' ? 8 : 6;
    const rows = archetype === 'skyscraper' ? 20 : 16;
    const padX = 20;
    const padY = 22;
    const cellW = (512 - padX * 2) / cols;
    const cellH = (1024 - padY * 2) / rows;

    ctx.fillStyle = pal.trim;
    for (let r = 0; r <= rows; r++) {
      ctx.fillRect(0, padY + r * cellH - 5, 512, 9);
    }

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const wx = padX + col * cellW + (archetype === 'skyscraper' ? 4 : 7);
        const wy = padY + r * cellH + 8;
        const ww = cellW - (archetype === 'skyscraper' ? 8 : 14);
        const wh = cellH - 16;

        ctx.fillStyle = pal.frame;
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

        const litProb = isNight ? 0.56 : 0.16;
        const lit = ((r * 13 + col * 7 + styleIndex * 5) % 10) / 10 < litProb;

        if (lit) {
          const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          const warm = (r + col + styleIndex) % 3 !== 0;
          if ((r * 3 + col) % 11 === 0) {
            grad.addColorStop(0, neonColor);
            grad.addColorStop(1, '#1e293b');
          } else if (warm) {
            grad.addColorStop(0, '#fff5cc');
            grad.addColorStop(0.55, '#ffd782');
            grad.addColorStop(1, '#8c6632');
          } else {
            grad.addColorStop(0, '#dff4ff');
            grad.addColorStop(0.6, '#87c5eb');
            grad.addColorStop(1, '#2f536e');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(20, 26, 40, 0.28)';
          ctx.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28);
        } else {
          const skyGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
          skyGrad.addColorStop(0, isNight ? '#1c2d47' : pal.glassTop);
          skyGrad.addColorStop(0.5, isNight ? '#111c2e' : pal.glassBot);
          skyGrad.addColorStop(1, '#09101c');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + ww * 0.45, wy);
          ctx.lineTo(wx, wy + wh * 0.55);
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(10, 15, 28, 0.55)';
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      }
    }

    cache[key] = sharpTex(c, 1, 1);
    return cache[key];
  }

  function storefrontTexture(accentColor) {
    const key = `shop2_${accentColor}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(512, 192);
    ctx.fillStyle = '#182030';
    ctx.fillRect(0, 0, 512, 192);

    const g = ctx.createLinearGradient(0, 14, 0, 178);
    g.addColorStop(0, '#ffe8b8');
    g.addColorStop(0.65, '#cfa05d');
    g.addColorStop(1, '#3b2e23');
    ctx.fillStyle = g;
    ctx.fillRect(14, 16, 484, 160);

    ctx.fillStyle = 'rgba(24, 28, 42, 0.45)';
    for (let x = 36; x < 480; x += 90) ctx.fillRect(x, 70, 56, 106);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(28, 26, 456, 8);

    ctx.fillStyle = '#111827';
    for (let x = 14; x <= 498; x += 121) ctx.fillRect(x - 4, 12, 8, 168);
    ctx.fillRect(14, 12, 484, 8);
    ctx.fillRect(14, 172, 484, 10);

    ctx.fillStyle = accentColor;
    ctx.fillRect(46, 54, 48, 66);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(52, 60, 36, 54);

    cache[key] = sharpTex(c);
    return cache[key];
  }

  function awningTexture(colorHex) {
    const key = `awning_${colorHex}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(256, 64);
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 14, 64);
    cache[key] = sharpTex(c);
    return cache[key];
  }

  function floorTileTexture(kind) {
    const key = `floor2_${kind}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(512, 512);

    if (kind === 'wood') {
      ctx.fillStyle = '#63412b';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 32) {
        const shade = ((y / 32) % 3 === 0) ? '#724c34' : ((y / 32) % 2 === 0) ? '#5a3a25' : '#66432c';
        ctx.fillStyle = shade;
        ctx.fillRect(0, y, 512, 30);
        // Wood grain streaks
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let g = 0; g < 6; g++) {
          ctx.fillRect((y * 17 + g * 83) % 512, y + 6 + g * 3, 90, 2);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(0, y + 30, 512, 2);
      }
    } else if (kind === 'club') {
      ctx.fillStyle = '#0d0f21';
      ctx.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 64) {
          ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? 'rgba(255,46,147,0.08)' : 'rgba(0,240,255,0.08)';
          ctx.fillRect(x + 3, y + 3, 58, 58);
          ctx.strokeStyle = ((x + y) / 64) % 2 === 0 ? 'rgba(255,46,147,0.45)' : 'rgba(0,240,255,0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, 60, 60);
        }
      }
    } else if (kind === 'marble') {
      ctx.fillStyle = '#e5e9f0';
      ctx.fillRect(0, 0, 512, 512);
      // Marble veins
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo((i * 73) % 512, 0);
        ctx.bezierCurveTo(150, i * 40, 350, 512 - i * 35, (i * 137) % 512, 512);
        ctx.stroke();
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 512; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 64) {
          ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? '#eef2f7' : '#d5dde8';
          ctx.fillRect(x + 1, y + 1, 62, 62);
        }
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
    }

    cache[key] = sharpTex(c, 4, 4);
    return cache[key];
  }

  function interiorWallTexture(kind) {
    const key = `wall_${kind}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(512, 256);

    if (kind === 'cafe') {
      ctx.fillStyle = '#4f322a';
      ctx.fillRect(0, 0, 512, 256);
      for (let y = 0; y < 180; y += 18) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, y, 512, 2);
        const off = (y / 18) % 2 === 0 ? 0 : 24;
        for (let x = off; x < 512; x += 48) ctx.fillRect(x, y, 2, 18);
      }
      ctx.fillStyle = '#2d1e18';
      ctx.fillRect(0, 180, 512, 76);
    } else if (kind === 'club') {
      ctx.fillStyle = '#131026';
      ctx.fillRect(0, 0, 512, 256);
      for (let x = 0; x < 512; x += 32) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x, 0, 14, 256);
      }
      ctx.fillStyle = '#ff2e93';
      ctx.fillRect(0, 210, 512, 4);
    } else if (kind === 'hotel') {
      ctx.fillStyle = '#2a3244';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#c4a459';
      ctx.lineWidth = 3;
      for (let x = 16; x < 512; x += 128) ctx.strokeRect(x, 22, 96, 150);
      ctx.fillStyle = '#1e2533';
      ctx.fillRect(0, 190, 512, 66);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 196, 512, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 206, 512, 50);
    }

    cache[key] = sharpTex(c, 2, 1);
    return cache[key];
  }

  function signTexture(text, bg, fg, vertical) {
    const key = `sign2_${text}_${bg}_${fg}_${vertical ? 'v' : 'h'}`;
    if (cache[key]) return cache[key];
    const [c, ctx] = makeCanvas(vertical ? 128 : 512, vertical ? 384 : 128);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (vertical) {
      ctx.font = 'bold 34px "Noto Sans KR", sans-serif';
      const chars = text.replace(/\s+/g, '').slice(0, 6).split('');
      const step = (c.height - 40) / Math.max(1, chars.length);
      chars.forEach((ch, idx) => ctx.fillText(ch, c.width / 2, 26 + step * idx + step / 2));
    } else {
      ctx.font = 'bold 42px "Noto Sans KR", "Orbitron", sans-serif';
      ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    }

    cache[key] = sharpTex(c);
    return cache[key];
  }

  function crosswalkTexture() {
    if (cache.crosswalk) return cache.crosswalk;
    const [c, ctx] = makeCanvas(256, 256);
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(245, 248, 255, 0.92)';
    for (let i = 16; i < 240; i += 48) ctx.fillRect(i, 20, 26, 216);
    cache.crosswalk = sharpTex(c);
    return cache.crosswalk;
  }

  SV.Textures = {
    roadTexture,
    sidewalkTexture,
    buildingTexture,
    storefrontTexture,
    awningTexture,
    floorTileTexture,
    interiorWallTexture,
    signTexture,
    crosswalkTexture,
  };
})();
