(() => {
  const $ = (id) => document.getElementById(id);
  if (!window.THREE) { $('lede').textContent = 'No se pudo cargar el motor 3D. Revisa tu conexión y recarga la página.'; return; }
  const V3 = THREE.Vector3;
  const rand = (a, b) => a + Math.random() * (b - a);
  const wrapAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // ================= Config =================
  const ARENA = 30;             // half size
  const WIN = 3;
  const MAG = 12;
  const PLAYER_R = 0.5;
  // Foe kinds. CENTINELA's forms: humanoid, giant octopus and spider.
  const KINDS = {
    human:  { name: 'CENTINELA', hp: 100, hitY: 1.45, hitR: 0.95, radius: 0.75, speedMul: 1,    dot: '#E0304A' },
    octo:   { name: 'PULPO',     hp: 150, hitY: 1.85, hitR: 1.3,  radius: 1.15, speedMul: 0.9,  dot: '#FF6FB0' },
    spider: { name: 'ARAÑA',     hp: 110, hitY: 1.25, hitR: 1.15, radius: 1.1,  speedMul: 1.15, dot: '#9CFF3A' },
  };
  // Level 3 fights two foes at once, so each one gets a little less armour.
  const LEVELS = {
    1: { foes: ['human'],          hpMul: 1,   label: 'CENTINELA', the: 'CENTINELA',           down: 'CENTINELA DERRIBADO' },
    2: { foes: ['octo'],           hpMul: 1,   label: 'PULPO',     the: 'EL PULPO',            down: 'PULPO DERRIBADO' },
    3: { foes: ['octo', 'spider'], hpMul: 0.8, label: 'PULPO · ARAÑA', the: 'EL PULPO Y LA ARAÑA', down: 'PULPO Y ARAÑA DERRIBADOS' },
  };
  const MAX_LEVEL = 3;
  let level = 1;
  const lvl = () => LEVELS[level];
  const OBST = [
    { x: 0,   z: 0,   w: 6,   d: 6,   h: 3.4 },
    { x: -14, z: -12, w: 4,   d: 8,   h: 2.6 },
    { x: 14,  z: 12,  w: 4,   d: 8,   h: 2.6 },
    { x: 14,  z: -14, w: 8,   d: 3,   h: 2.6 },
    { x: -14, z: 14,  w: 8,   d: 3,   h: 2.6 },
    { x: -21, z: 2,   w: 2,   d: 2,   h: 4.5 },
    { x: 21,  z: -2,  w: 2,   d: 2,   h: 4.5 },
    { x: 5,   z: -20, w: 2,   d: 2,   h: 4.5 },
    { x: -5,  z: 20,  w: 2,   d: 2,   h: 4.5 },
    { x: -8,  z: -4,  w: 1.2, d: 4,   h: 1.1 },
    { x: 8,   z: 4,   w: 1.2, d: 4,   h: 1.1 },
    { x: 0,   z: 13,  w: 5,   d: 1.2, h: 1.1 },
    { x: 0,   z: -13, w: 5,   d: 1.2, h: 1.1 },
  ];
  // Difficulty scales CENTINELA's speed first, then reaction, aim, fire rate and damage.
  const DIFFS = {
    facil:   { name: 'Fácil',   speed: 0.72, fire: 1.4,  spread: 1.5, react: 1.6, dmg: 9,
               note: 'CENTINELA se mueve y dispara más lento, y falla más.' },
    medio:   { name: 'Medio',   speed: 1,    fire: 1,    spread: 1,   react: 1,   dmg: 12,
               note: 'Velocidad y puntería normales.' },
    dificil: { name: 'Difícil', speed: 1.38, fire: 0.72, spread: 0.6, react: 0.6, dmg: 15, weapon: 'plasma',
               note: 'CENTINELA es mucho más rápido, reacciona antes, apunta mejor y lleva un fusil de plasma, mejor que tu arma: dispara ráfagas de 3 tiros más veloces que los normales.' },
  };
  // CENTINELA's weapons. dmg null = use the difficulty's damage per hit.
  const WEAPONS = {
    rifle:  { speed: 24, burst: 1, gap: 0,    cdMul: 1,   dmg: null, muzzleZ: -1.3,  core: 0xFFB27A, glow: 0xFF7A3A, size: 0.9, radar: '#FFB27A', sound: 'enemy' },
    plasma: { speed: 34, burst: 3, gap: 0.09, cdMul: 1.7, dmg: 15,   muzzleZ: -1.66, core: 0xF4D6FF, glow: 0xB040FF, size: 1.3, radar: '#D08CFF', sound: 'plasma' },
    // Octopus (level 2): two guns, either alternating ('alt') or firing together ('both')
    inkAlt:     { speed: 22, burst: 1, gap: 0,   cdMul: 0.55, dmg: 8,  dual: 'alt',  core: 0xC8FFF2, glow: 0x18C8A8, size: 1.1, radar: '#5FE3C8', sound: 'ink' },
    inkDual:    { speed: 26, burst: 1, gap: 0,   cdMul: 1.05, dmg: 10, dual: 'both', core: 0xC8FFF2, glow: 0x18C8A8, size: 1.1, radar: '#5FE3C8', sound: 'ink' },
    plasmaDual: { speed: 34, burst: 3, gap: 0.1, cdMul: 2.0,  dmg: 10, dual: 'both', core: 0xF4D6FF, glow: 0xB040FF, size: 1.3, radar: '#D08CFF', sound: 'plasma' },
    // Spider (level 3): venom cannon
    venom:      { speed: 24, burst: 1, gap: 0,    cdMul: 1.1, dmg: 8, core: 0xE8FFC8, glow: 0x6AD010, size: 1.0, radar: '#9CFF3A', sound: 'venom' },
    venomBurst: { speed: 32, burst: 2, gap: 0.12, cdMul: 1.5, dmg: 9, core: 0xE8FFC8, glow: 0x6AD010, size: 1.0, radar: '#9CFF3A', sound: 'venom' },
  };
  const SPIDER_WEAPON = { facil: 'venom', medio: 'venom', dificil: 'venomBurst' };
  // Spider web: seconds between throws and projectile speed; a hit freezes the player
  const WEB = { facil: { cd: 12, speed: 16 }, medio: { cd: 9, speed: 18 }, dificil: { cd: 7, speed: 21 } };
  const FREEZE_S = 5;
  const L3_NOTES = {
    facil: 'La araña dispara veneno despacio y lanza una telaraña cada 12 s aprox. El pulpo alterna sus dos armas de tinta.',
    medio: 'La araña lanza una telaraña cada 9 s aprox. El pulpo dispara tinta con sus dos armas a la vez.',
    dificil: 'La araña dispara ráfagas de veneno y lanza una telaraña cada 7 s aprox. El pulpo dispara ráfagas de plasma con sus dos armas.',
  };
  const OCTO_WEAPON = { facil: 'inkAlt', medio: 'inkDual', dificil: 'plasmaDual' };
  const OCTO_NOTES = {
    facil: 'El pulpo dispara tinta alternando sus dos armas, despacio.',
    medio: 'El pulpo dispara tinta con sus dos armas a la vez.',
    dificil: 'El pulpo es rápido, apunta mejor y dispara ráfagas de plasma con sus dos armas a la vez.',
  };
  const weaponKeyFor = (kind) => (kind === 'octo' ? OCTO_WEAPON[difficulty] : kind === 'spider' ? SPIDER_WEAPON[difficulty] : (DIFFS[difficulty].weapon || 'rifle'));
  const weaponKey = () => weaponKeyFor(lvl().foes[0]);
  const weapon = () => WEAPONS[weaponKey()];
  let difficulty = 'medio';
  const diffFor = (r) => {
    const P = DIFFS[difficulty];
    return {
      spread: Math.max(0.012, 0.07 - (r - 1) * 0.012) * P.spread,
      fire: Math.max(0.45, 1.05 - (r - 1) * 0.12) * P.fire,
      speed: (4.6 + r * 0.45) * P.speed,
      react: Math.max(0.15, 0.55 - (r - 1) * 0.08) * P.react,
      lead: Math.min(0.9, 0.3 + (r - 1) * 0.15),
      turn: 7 * P.speed,
    };
  };
  const fmtTime = (t) => Math.floor(t / 60) + ':' + String(Math.round(t % 60)).padStart(2, '0');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ================= Renderer / scene =================
  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const IS_TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xB86A4C, 38, 170);
  const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 700);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  // Sky dome
  const sunDir = new V3(0.55, 0.1, -0.83).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color('#191634') }, hor: { value: new THREE.Color('#E47B4C') },
      low: { value: new THREE.Color('#4E2C40') }, sunDir: { value: sunDir },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 low; uniform vec3 sunDir; varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.55)) : mix(hor, low, clamp(-h * 5.0, 0.0, 1.0));
        float s = max(dot(vP, sunDir), 0.0);
        c += vec3(1.0, 0.82, 0.55) * pow(s, 400.0) * 1.4 + vec3(1.0, 0.55, 0.3) * pow(s, 10.0) * 0.35;
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xFFC8A0, 0x3B2A3C, 0.65));
  const sun = new THREE.DirectionalLight(0xFFB27A, 0.95);
  sun.position.copy(sunDir).multiplyScalar(60).setY(28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 140 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // ---- Procedural textures
  function canvasTex(size, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function speckle(g, s, n, colors) {
    for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; const r = Math.random() * 2.2 + 0.4; g.fillRect(Math.random() * s, Math.random() * s, r, r); }
  }
  const floorTex = canvasTex(512, (g, s) => {
    g.fillStyle = '#A2805A'; g.fillRect(0, 0, s, s);
    speckle(g, s, 9000, ['rgba(90,60,35,.18)', 'rgba(255,230,190,.14)', 'rgba(60,40,30,.12)']);
    g.strokeStyle = 'rgba(70,45,30,.35)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s / 2, 0); g.lineTo(i * s / 2, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 2); g.lineTo(s, i * s / 2); g.stroke(); }
  }, 16, 16);
  const concreteTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#8C8277'; g.fillRect(0, 0, s, s);
    speckle(g, s, 3500, ['rgba(40,35,40,.16)', 'rgba(255,240,220,.12)']);
    g.fillStyle = 'rgba(40,30,35,.45)';
    for (let x = 1; x < 4; x++) for (let y = 1; y < 4; y++) { g.beginPath(); g.arc(x * s / 4, y * s / 4, 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(30,25,35,.35)'; g.fillRect(0, s * 0.9, s, s * 0.1);
  });
  const wallTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#6E6470'; g.fillRect(0, 0, s, s);
    speckle(g, s, 3000, ['rgba(30,25,40,.2)', 'rgba(255,230,210,.1)']);
    g.fillStyle = '#E47B4C'; g.fillRect(0, s * 0.78, s, s * 0.06);
    g.strokeStyle = 'rgba(20,15,25,.4)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
  }, 12, 1);

  // ---- Arena geometry
  const solids = [];      // blocks bullets & raycasts
  const coverMeshes = []; // used for line-of-sight
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2 + 2, ARENA * 2 + 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); solids.push(floor);

  const outer = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x8E6446, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);

  const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 });
  const lowMat = new THREE.MeshStandardMaterial({ color: 0x5B4A5C, roughness: 0.8 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xE47B4C, roughness: 0.6 });
  for (const o of OBST) {
    const low = o.h < 1.5;
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d), low ? lowMat : concreteMat);
    m.position.set(o.x, o.h / 2, o.z); m.castShadow = m.receiveShadow = true;
    scene.add(m); solids.push(m); coverMeshes.push(m);
    if (low) { const cap = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.04, 0.08, o.d + 0.04), stripeMat); cap.position.set(o.x, o.h, o.z); scene.add(cap); }
  }
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  [[0, -ARENA - 0.5, ARENA * 2 + 2, 1], [0, ARENA + 0.5, ARENA * 2 + 2, 1], [-ARENA - 0.5, 0, 1, ARENA * 2 + 2], [ARENA + 0.5, 0, 1, ARENA * 2 + 2]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), wallMat);
    m.position.set(x, 2.5, z); m.receiveShadow = m.castShadow = true; scene.add(m); solids.push(m);
  });
  // Floodlight masts at corners
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x2C2735, roughness: 0.6, metalness: 0.4 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xFFE3B8 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 12, 8), mastMat);
    pole.position.set(sx * (ARENA + 2), 6, sz * (ARENA + 2)); pole.castShadow = true; scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.3), lampMat);
    lamp.position.set(sx * (ARENA + 1.6), 12, sz * (ARENA + 1.6)); lamp.lookAt(0, 0, 0); scene.add(lamp);
  });
  // Distant mesas
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0x5C3448, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand(-0.1, 0.1), r = rand(170, 300), h = rand(12, 48), w = rand(14, 40);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.7, w, h, 6), mesaMat);
    m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); m.rotation.y = rand(0, 3); scene.add(m);
  }

  // ================= Glow sprite texture =================
  const glowTex = canvasTex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const glowSprite = (color, scale) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(scale); return s;
  };

  // ================= Bot =================
  const botMetal = new THREE.MeshStandardMaterial({ color: 0x2B2934, metalness: 0.55, roughness: 0.38, emissive: 0x000000 });
  const botRed = new THREE.MeshStandardMaterial({ color: 0xE0304A, emissive: 0xE0304A, emissiveIntensity: 0.9 });
  const botDark = new THREE.MeshStandardMaterial({ color: 0x121019, roughness: 0.3, metalness: 0.7 });
  const botGroup = new THREE.Group();
  const botParts = [];
  // Invented cartoon villain face, drawn on a canvas (not based on any real person).
  // Returns the colour map plus an emissive map so only the cybernetic eye glows.
  function villainFaceTex() {
    const W = 256, H = 288;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const sk = g.createRadialGradient(W / 2, H * 0.48, 20, W / 2, H * 0.5, W * 0.75);
    sk.addColorStop(0, '#CDB6A9'); sk.addColorStop(1, '#7E6A6A');
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    // stubble on the jaw
    g.fillStyle = 'rgba(40,30,35,.35)';
    for (let i = 0; i < 1400; i++) { const x = Math.random() * W, y = 185 + Math.random() * (H - 185); g.fillRect(x, y, 1.6, 1.6); }
    // forehead wrinkles
    g.strokeStyle = 'rgba(70,50,55,.45)'; g.lineWidth = 3; g.lineCap = 'round';
    for (const y of [48, 62]) { g.beginPath(); g.moveTo(80, y + 6); g.quadraticCurveTo(128, y - 6, 176, y + 6); g.stroke(); }
    // eyepatch + strap (viewer's left)
    g.strokeStyle = '#141015'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, 150); g.lineTo(256, 58); g.stroke();
    g.fillStyle = '#141015'; g.beginPath(); g.ellipse(80, 132, 32, 26, -0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(72, 124, 12, 7, -0.5, 0, Math.PI * 2); g.fill();
    // cybernetic eye (viewer's right)
    g.fillStyle = '#2A1F24'; g.beginPath(); g.ellipse(176, 132, 28, 17, 0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#F2E4C8'; g.beginPath(); g.ellipse(176, 132, 22, 11, 0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FF2A3A'; g.beginPath(); g.arc(178, 132, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#140008'; g.fillRect(176.5, 124, 3, 16);
    // furious eyebrows
    g.strokeStyle = '#1A1418'; g.lineWidth = 17;
    g.beginPath(); g.moveTo(38, 90); g.lineTo(116, 116); g.stroke();
    g.beginPath(); g.moveTo(140, 116); g.lineTo(220, 88); g.stroke();
    // scar across the right cheek
    g.strokeStyle = '#7A3A44'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(150, 72); g.lineTo(212, 186); g.stroke();
    g.lineWidth = 2.5;
    for (let t = 0.15; t < 1; t += 0.2) { const x = 150 + 62 * t, y = 72 + 114 * t; g.beginPath(); g.moveTo(x - 8, y + 4); g.lineTo(x + 8, y - 4); g.stroke(); }
    // nose shadow
    g.fillStyle = 'rgba(70,45,50,.45)';
    g.beginPath(); g.moveTo(122, 140); g.lineTo(112, 188); g.quadraticCurveTo(128, 198, 144, 188); g.lineTo(134, 140); g.closePath(); g.fill();
    // sneering mouth with a gold tooth
    g.fillStyle = '#3A0E16';
    g.beginPath(); g.moveTo(92, 226); g.quadraticCurveTo(130, 250, 172, 216); g.quadraticCurveTo(130, 232, 92, 226); g.fill();
    g.fillStyle = '#EFE6D2'; for (const x of [112, 124, 148]) g.fillRect(x, 226, 9, 7);
    g.fillStyle = '#E2B13C'; g.fillRect(136, 225, 9, 7);
    // handlebar mustache
    g.fillStyle = '#1A1418';
    g.beginPath();
    g.moveTo(128, 200);
    g.bezierCurveTo(100, 196, 70, 222, 44, 204);
    g.bezierCurveTo(34, 196, 36, 182, 46, 180);
    g.bezierCurveTo(44, 192, 60, 200, 80, 196);
    g.bezierCurveTo(100, 192, 116, 188, 128, 192);
    g.bezierCurveTo(140, 188, 156, 192, 176, 196);
    g.bezierCurveTo(196, 200, 212, 192, 210, 180);
    g.bezierCurveTo(220, 182, 222, 196, 212, 204);
    g.bezierCurveTo(186, 222, 156, 196, 128, 200);
    g.fill();
    // cleft chin
    g.strokeStyle = 'rgba(60,40,45,.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(128, 262); g.lineTo(128, 280); g.stroke();
    const map = new THREE.CanvasTexture(c);

    const e = document.createElement('canvas'); e.width = W; e.height = H;
    const eg = e.getContext('2d'); eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
    const rg = eg.createRadialGradient(178, 132, 2, 178, 132, 22);
    rg.addColorStop(0, '#FF6070'); rg.addColorStop(0.45, '#E0203A'); rg.addColorStop(1, '#000');
    eg.fillStyle = rg; eg.fillRect(150, 105, 56, 56);
    return { map, glow: new THREE.CanvasTexture(e) };
  }

  // Humanoid combat android, ~1.9 m tall, facing -z. Legs and arms hang from pivots so they can swing.
  (function buildBot() {
    const add = (parent, geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; m.userData.bot = true; parent.add(m); botParts.push(m); return m;
    };
    const pivot = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); botGroup.add(g); return g; };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

    // Legs
    const legs = [];
    for (const sx of [-1, 1]) {
      const hip = pivot(sx * 0.14, 0.98, 0);
      add(hip, box(0.19, 0.48, 0.22), botMetal, 0, -0.24, 0);          // thigh
      add(hip, box(0.16, 0.46, 0.18), botDark, 0, -0.7, 0.01);         // shin
      add(hip, box(0.2, 0.1, 0.32), botMetal, 0, -0.93, -0.05);        // boot
      add(hip, box(0.2, 0.05, 0.05), botRed, 0, -0.45, -0.12);         // knee light
      legs.push(hip);
    }
    // Pelvis and torso
    add(botGroup, box(0.46, 0.2, 0.26), botDark, 0, 1.0, 0);
    add(botGroup, box(0.4, 0.26, 0.24), botMetal, 0, 1.18, 0);
    add(botGroup, box(0.6, 0.4, 0.32), botMetal, 0, 1.46, 0);
    add(botGroup, box(0.3, 0.07, 0.02), botRed, 0, 1.5, -0.17);          // chest stripe
    add(botGroup, box(0.34, 0.3, 0.14), botDark, 0, 1.45, 0.22);          // backpack
    for (const sx of [-1, 1]) add(botGroup, box(0.2, 0.12, 0.3), botDark, sx * 0.36, 1.66, 0); // shoulder pads
    // Neck and head
    add(botGroup, new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), botDark, 0, 1.72, 0);
    // Head: the villain face is painted on the front (-z) side of the box
    const skin = new THREE.MeshStandardMaterial({ color: 0xB9A7A0, roughness: 0.8 });
    const face = villainFaceTex();
    const faceMat = new THREE.MeshStandardMaterial({ map: face.map, emissiveMap: face.glow, emissive: 0xFFFFFF, emissiveIntensity: 1.2, roughness: 0.75 });
    add(botGroup, box(0.32, 0.36, 0.3), [skin, skin, skin, skin, skin, faceMat], 0, 1.93, 0);
    // Peaked officer cap with a red badge
    add(botGroup, box(0.36, 0.1, 0.34), botDark, 0, 2.15, 0);
    add(botGroup, box(0.38, 0.06, 0.36), botDark, 0, 2.23, 0.01);
    add(botGroup, box(0.34, 0.025, 0.14), botDark, 0, 2.11, -0.21, 0.18); // brim
    add(botGroup, box(0.07, 0.07, 0.02), botRed, 0, 2.17, -0.18);          // badge
    // Arms raised, holding the rifle
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = pivot(sx * 0.37, 1.6, 0);
      sh.rotation.set(-1.15, 0, -sx * 0.25);
      add(sh, box(0.14, 0.34, 0.16), botMetal, 0, -0.17, 0);
      add(sh, box(0.12, 0.3, 0.14), botDark, 0, -0.48, 0);
      arms.push(sh);
    }
    // Standard rifle (Fácil, Medio)
    const rifle = new THREE.Group(); botGroup.add(rifle);
    add(rifle, box(0.09, 0.12, 0.8), botDark, 0.05, 1.4, -0.62);          // body
    add(rifle, new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), botDark, 0.05, 1.42, -1.15, Math.PI / 2);
    add(rifle, box(0.03, 0.03, 0.4), botRed, 0.1, 1.42, -0.6);           // light strip
    // Plasma rifle (Difícil): bulkier, longer barrel ringed with glowing coils
    const plasmaMat = new THREE.MeshStandardMaterial({ color: 0xC060FF, emissive: 0xB040FF, emissiveIntensity: 1.4 });
    const plasma = new THREE.Group(); botGroup.add(plasma);
    add(plasma, box(0.13, 0.17, 1.0), botDark, 0.05, 1.4, -0.7);          // body
    add(plasma, box(0.1, 0.06, 0.7), botMetal, 0.05, 1.51, -0.65);        // top housing
    add(plasma, box(0.08, 0.12, 0.18), plasmaMat, 0.05, 1.29, -0.45);     // energy cell
    add(plasma, new THREE.CylinderGeometry(0.045, 0.05, 0.45, 12), botDark, 0.05, 1.42, -1.4, Math.PI / 2);
    for (const z of [-1.25, -1.38, -1.51]) add(plasma, new THREE.TorusGeometry(0.07, 0.018, 8, 20), plasmaMat, 0.05, 1.42, z);
    const tip = glowSprite(0xB040FF, 0.35); tip.position.set(0.05, 1.42, -1.66); plasma.add(tip);
    const light = new THREE.PointLight(0xFF4A50, 0.9, 6, 2); light.position.set(0, 1.4, -0.6); botGroup.add(light);
    botGroup.userData.legs = legs; botGroup.userData.arms = arms;
    botGroup.userData.rifle = rifle; botGroup.userData.plasma = plasma; botGroup.userData.weaponLight = light;
  })();
  scene.add(botGroup);

  // ---- Level 2: CENTINELA as a giant octopus. Keeps the eyepatch, the red eye and the officer cap.
  const octoGroup = new THREE.Group();
  const octoSkin = new THREE.MeshStandardMaterial({
    roughness: 0.55, metalness: 0.05, emissive: 0x000000,
    map: canvasTex(256, (g, sz) => {
      g.fillStyle = '#6E2547'; g.fillRect(0, 0, sz, sz);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = Math.random() < 0.6 ? 'rgba(200,95,140,.5)' : 'rgba(35,8,28,.45)';
        g.beginPath(); g.arc(Math.random() * sz, Math.random() * sz, 3 + Math.random() * 13, 0, Math.PI * 2); g.fill();
      }
    }),
  });
  const octoGlow = new THREE.MeshStandardMaterial({ color: 0x18C8A8, emissive: 0x18C8A8, emissiveIntensity: 1.3 });
  (function buildOcto() {
    const UPV = new V3(0, 1, 0);
    const add = (parent, geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; parent.add(m); return m;
    };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const limb = (a, b, r1, r2) => {
      const dir = b.clone().sub(a), len = dir.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 10), octoSkin);
      m.position.copy(a).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(UPV, dir.normalize());
      m.castShadow = true; octoGroup.add(m);
    };
    // Mantle (head) and lower body
    const mantle = add(octoGroup, new THREE.SphereGeometry(0.95, 28, 20), octoSkin, 0, 2.15, 0.1);
    mantle.scale.set(1, 1.25, 1.05);
    add(octoGroup, new THREE.SphereGeometry(0.75, 24, 16), octoSkin, 0, 1.42, 0).scale.set(1.05, 0.6, 1.05);
    // Eyes: one glowing red eye, one under the eyepatch, furious brows
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xF2E6C8, roughness: 0.3 });
    const iris = new THREE.MeshStandardMaterial({ color: 0xFF3040, emissive: 0xFF2030, emissiveIntensity: 1.3 });
    add(octoGroup, new THREE.SphereGeometry(0.21, 16, 12), eyeWhite, 0.4, 1.8, -0.7);
    add(octoGroup, new THREE.SphereGeometry(0.11, 12, 10), iris, 0.42, 1.8, -0.88);
    add(octoGroup, box(0.15, 0.035, 0.02), botDark, 0.42, 1.8, -0.98);
    add(octoGroup, new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20), botDark, -0.4, 1.82, -0.78, Math.PI / 2);
    add(octoGroup, new THREE.TorusGeometry(0.99, 0.025, 6, 40), botDark, 0, 1.92, 0.1, Math.PI / 2 + 0.15, 0, 0);
    add(octoGroup, box(0.36, 0.08, 0.1), botDark, 0.42, 2.08, -0.8, 0, 0, 0.35);
    add(octoGroup, box(0.36, 0.08, 0.1), botDark, -0.42, 2.08, -0.82, 0, 0, -0.35);
    // Officer cap
    add(octoGroup, new THREE.CylinderGeometry(0.5, 0.56, 0.26, 24), botDark, 0, 3.3, 0.1);
    add(octoGroup, new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), botDark, 0, 3.45, 0.1);
    add(octoGroup, box(0.6, 0.03, 0.26), botDark, 0, 3.2, -0.48, 0.25);
    add(octoGroup, box(0.13, 0.13, 0.03), botRed, 0, 3.32, -0.45);
    // Six wavy tentacles around the body; joints are chained pivots so the whole limb curls
    const tentacles = [];
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) * Math.PI * 2 / 6;
      const root = new THREE.Group();
      root.position.set(Math.sin(a) * 0.55, 1.3, Math.cos(a) * 0.55);
      root.rotation.order = 'YXZ'; root.rotation.y = a;
      octoGroup.add(root);
      const joints = []; let parent = root;
      const SEG = 0.24, N = 7;
      for (let k = 0; k < N; k++) {
        const j = new THREE.Group(); j.position.y = k === 0 ? 0 : -SEG; parent.add(j);
        const r0 = 0.16 * (1 - k / (N + 1)), r1 = 0.16 * (1 - (k + 1) / (N + 1));
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, SEG, 8), octoSkin);
        seg.position.y = -SEG / 2; seg.castShadow = true; j.add(seg);
        joints.push(j); parent = j;
      }
      tentacles.push({ joints, phase: i * 1.1 });
    }
    // Two gun-holding tentacles with one gun each
    for (const sx of [-1, 1]) {
      const shoulder = new V3(sx * 0.55, 1.5, -0.35), elbow = new V3(sx * 1.05, 1.25, -0.55), hand = new V3(sx * 1.05, 1.36, -0.95);
      limb(shoulder, elbow, 0.15, 0.12); limb(elbow, hand, 0.12, 0.09);
      add(octoGroup, box(0.15, 0.17, 0.75), botDark, sx * 1.05, 1.38, -1.2);
      add(octoGroup, new THREE.CylinderGeometry(0.05, 0.05, 0.35, 10), botDark, sx * 1.05, 1.4, -1.72, Math.PI / 2);
      add(octoGroup, new THREE.TorusGeometry(0.075, 0.02, 8, 18), octoGlow, sx * 1.05, 1.4, -1.6);
      add(octoGroup, new THREE.TorusGeometry(0.075, 0.02, 8, 18), octoGlow, sx * 1.05, 1.4, -1.74);
      add(octoGroup, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 14), octoGlow, sx * 1.05, 1.26, -1.05, 0, 0, Math.PI / 2);
    }
    const light = new THREE.PointLight(0x18C8A8, 1.0, 7, 2); light.position.set(0, 1.4, -1.2); octoGroup.add(light);
    octoGroup.userData = { tentacles, mantle, light };
  })();
  octoGroup.visible = false;
  scene.add(octoGroup);
  // ---- Level 3: CENTINELA as a spider. Venom cannon on its back, cap and eyepatch kept.
  const LIMB_UP = new V3(0, 1, 0);
  function setLimb(m, a, b) {
    const dir = b.clone().sub(a), len = dir.length();
    m.position.copy(a).addScaledVector(dir, 0.5); m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(LIMB_UP, dir.divideScalar(len));
  }
  const spiderGroup = new THREE.Group();
  const spiderSkin = new THREE.MeshStandardMaterial({
    roughness: 0.45, metalness: 0.1, emissive: 0x000000,
    map: canvasTex(256, (g, sz) => {
      g.fillStyle = '#1C1420'; g.fillRect(0, 0, sz, sz);
      g.strokeStyle = 'rgba(120,200,40,.35)'; g.lineWidth = 6;
      for (let i = 0; i < 6; i++) { const y = i * sz / 6 + 20; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(sz * 0.3, y - 20, sz * 0.7, y + 20, sz, y); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.06)';
      for (let i = 0; i < 600; i++) g.fillRect(Math.random() * sz, Math.random() * sz, 2, 2);
    }),
  });
  const spiderGlow = new THREE.MeshStandardMaterial({ color: 0x6AD010, emissive: 0x6AD010, emissiveIntensity: 1.3 });
  (function buildSpider() {
    const add = (geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; spiderGroup.add(m); return m;
    };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    // Abdomen with the red hourglass, cephalothorax in front (front = -z)
    add(new THREE.SphereGeometry(0.72, 24, 18), spiderSkin, 0, 1.35, 0.75).scale.set(1, 0.85, 1.25);
    add(new THREE.ConeGeometry(0.16, 0.22, 4), botRed, 0, 1.97, 0.58, Math.PI / 2);
    add(new THREE.ConeGeometry(0.16, 0.22, 4), botRed, 0, 1.97, 0.82, -Math.PI / 2);
    add(new THREE.SphereGeometry(0.5, 22, 16), spiderSkin, 0, 1.15, -0.35).scale.set(1, 0.75, 1.1);
    // Eyes: one big glowing eye, the other under the eyepatch, four small ones above
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFF2030, emissive: 0xFF1020, emissiveIntensity: 1.5 });
    add(new THREE.SphereGeometry(0.085, 12, 10), eyeMat, 0.13, 1.27, -0.86);
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), botDark, -0.13, 1.27, -0.88, Math.PI / 2);
    for (const x of [-0.25, -0.09, 0.09, 0.25]) add(new THREE.SphereGeometry(0.045, 10, 8), eyeMat, x, 1.38, -0.76);
    for (const sx of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.22, 8), botDark, sx * 0.1, 0.86, -0.72, Math.PI);
    // Officer cap
    add(new THREE.CylinderGeometry(0.26, 0.3, 0.16, 20), botDark, 0, 1.58, -0.3);
    add(box(0.34, 0.025, 0.16), botDark, 0, 1.5, -0.6, 0.25);
    add(box(0.08, 0.08, 0.02), botRed, 0, 1.6, -0.57);
    // Venom cannon on the right shoulder
    add(box(0.1, 0.12, 0.1), botDark, 0.32, 1.45, -0.4);
    add(box(0.13, 0.15, 0.7), botDark, 0.32, 1.55, -0.6);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), botDark, 0.32, 1.56, -1.03, Math.PI / 2);
    add(new THREE.TorusGeometry(0.07, 0.018, 8, 18), spiderGlow, 0.32, 1.56, -0.95);
    add(new THREE.TorusGeometry(0.07, 0.018, 8, 18), spiderGlow, 0.32, 1.56, -1.08);
    // Eight legs: two segments each, re-posed every frame by poseSpider()
    const legs = [];
    const seg = (r1, r2) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, 1, 8), spiderSkin); m.castShadow = true; spiderGroup.add(m); return m; };
    [-0.5, -0.2, 0.1, 0.4].forEach((z, i) => {
      for (const sx of [-1, 1]) legs.push({ sx, z, upper: seg(0.07, 0.055), lower: seg(0.055, 0.025), phase: i * 1.3 + (sx > 0 ? Math.PI : 0) });
    });
    const light = new THREE.PointLight(0x6AD010, 0.9, 6, 2); light.position.set(0.3, 1.5, -1.0); spiderGroup.add(light);
    spiderGroup.userData = { legs };
  })();
  function poseSpider(walk, amp) {
    for (const L of spiderGroup.userData.legs) {
      const ph = walk + L.phase, lift = Math.max(0, Math.cos(ph));
      const hip = new V3(L.sx * 0.35, 1.1, L.z - 0.1);
      const knee = new V3(L.sx * 1.0, 1.65 + lift * 0.15 * amp, L.z * 1.4 + Math.sin(ph) * 0.14 * amp);
      const foot = new V3(L.sx * 1.55, lift * 0.18 * amp, L.z * 1.9 + Math.sin(ph) * 0.28 * amp);
      setLimb(L.upper, hip, knee); setLimb(L.lower, knee, foot);
    }
  }
  poseSpider(0, 0);
  spiderGroup.visible = false;
  scene.add(spiderGroup);
  const GROUPS = { human: botGroup, octo: octoGroup, spider: spiderGroup };
  const webTex = canvasTex(128, (g, sz) => {
    const c = sz / 2;
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.95, c + Math.sin(a) * c * 0.95); g.stroke(); }
    for (let r = 10; r < c; r += 11) {
      g.beginPath();
      for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
  });

  // ================= Player gun =================
  const gun = new THREE.Group();
  (function buildGun() {
    const m1 = new THREE.MeshStandardMaterial({ color: 0x3A3645, roughness: 0.75, metalness: 0.15 });
    const m2 = new THREE.MeshStandardMaterial({ color: 0x1B1922, roughness: 0.7, metalness: 0.2 });
    const acc = new THREE.MeshStandardMaterial({ color: 0x8FE3F0, emissive: 0x8FE3F0, emissiveIntensity: 0.7 });
    const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); gun.add(m); return m; };
    box(0.12, 0.13, 0.5, m1, 0, 0, 0);
    box(0.09, 0.05, 0.34, m2, 0, 0.09, -0.02);
    box(0.02, 0.02, 0.3, acc, 0.062, 0.02, -0.02);
    box(0.08, 0.18, 0.09, m2, 0, -0.14, 0.14).rotation.x = -0.25;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.34, 10), m2);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.015, -0.4); gun.add(barrel);
  })();
  const muzzle = glowSprite(0xFFD49A, 0.5); muzzle.position.set(0, 0.015, -0.6); muzzle.visible = false; gun.add(muzzle);
  const muzzleLight = new THREE.PointLight(0xFFB070, 0, 8, 2); muzzleLight.position.set(0, 0.02, -0.7); gun.add(muzzleLight);
  const GUN_BASE = new V3(0.2, -0.2, -0.45);
  gun.scale.setScalar(0.6);
  gun.position.copy(GUN_BASE);
  gun.visible = false;
  camera.add(gun);

  // ================= State =================
  const player = { pos: new V3(0, 0, 24), vel: new V3(), yaw: 0, hp: 100, alive: true, fireCd: 0, ammo: MAG, reload: 0, turnHold: 0, bob: 0, recoil: 0 };
  function makeFoe(kind) {
    return { kind, pos: new V3(), vel: new V3(), yaw: Math.PI, faceYaw: Math.PI, hp: 100, maxHp: 100, alive: true, fireCd: 1.5, sees: false, losT: 0,
             hunting: false, lastSeen: new V3(), wander: new V3(), strafeDir: 1, strafeT: 1, stuck: 0, reaction: 0, flash: 0, gunSide: 1,
             burstLeft: 0, burstT: 0, webCd: 4, walk: 0 };
  }
  let foes = [makeFoe('human')];
  let state = 'menu';           // menu | playing | roundEnd | matchEnd
  let round = 1, score = { p: 0, b: 0 }, roundTimer = 0, shake = 0, hurt = 0, hitT = 0, time = 0, matchTime = 0;

  // ================= Collision helpers =================
  function resolve(p, r) {
    for (const o of OBST) {
      const hx = o.w / 2, hz = o.d / 2;
      const cx = Math.max(o.x - hx, Math.min(p.x, o.x + hx));
      const cz = Math.max(o.z - hz, Math.min(p.z, o.z + hz));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else {
          const px = hx - Math.abs(p.x - o.x), pz = hz - Math.abs(p.z - o.z);
          if (px < pz) p.x = o.x + (Math.sign(p.x - o.x) || 1) * (hx + r); else p.z = o.z + (Math.sign(p.z - o.z) || 1) * (hz + r);
        }
      }
    }
    const lim = ARENA - r;
    p.x = Math.max(-lim, Math.min(lim, p.x)); p.z = Math.max(-lim, Math.min(lim, p.z));
  }
  function insideSolid(p) {
    if (p.y <= 0 || Math.abs(p.x) > ARENA || Math.abs(p.z) > ARENA) return true;
    for (const o of OBST) if (p.y < o.h && Math.abs(p.x - o.x) < o.w / 2 && Math.abs(p.z - o.z) < o.d / 2) return true;
    return false;
  }
  const losRay = new THREE.Raycaster();
  function hasLOS(f) {
    const a = new V3(f.pos.x, 1.6, f.pos.z), b = new V3(player.pos.x, 1.5, player.pos.z);
    const dir = b.clone().sub(a); const len = dir.length(); dir.divideScalar(len);
    losRay.set(a, dir); losRay.far = len;
    return losRay.intersectObjects(coverMeshes, false).length === 0;
  }
  function pickWander(f) {
    for (let i = 0; i < 20; i++) {
      const p = new V3(rand(-26, 26), 0, rand(-26, 26)); const q = p.clone(); resolve(q, 1.2);
      if (q.distanceTo(p) < 0.01 && p.distanceTo(f.pos) > 8) { f.wander.copy(p); return; }
    }
    f.wander.set(rand(-20, 20), 0, rand(-20, 20)); resolve(f.wander, 1.2);
  }
  // Builds this level's foes, either for a round or patrolling behind the menu
  const SPAWNS = { 1: [[0, -24]], 2: [[0, -24]], 3: [[-9, -24], [9, -24]] };
  function setupFoes(menu) {
    foes = lvl().foes.map((k, i) => {
      const f = makeFoe(k);
      const [x, z] = menu ? [-6 + i * 10, 9] : SPAWNS[level][i];
      f.pos.set(x, 0, z);
      f.maxHp = f.hp = Math.round(KINDS[k].hp * lvl().hpMul);
      f.fireCd = 1.6 + i * 0.6;
      f.webCd = WEB[difficulty].cd * 0.5;
      pickWander(f);
      return f;
    });
    applyLoadout();
  }

  // ================= Effects =================
  const particles = [];
  const partGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  function burst(pos, color, n, speed, life) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.position.copy(pos);
      const v = new V3(rand(-1, 1), rand(-0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      scene.add(m); particles.push({ m, v, life: life * rand(0.6, 1), max: life });
    }
  }
  const tracers = [];
  const tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  const UP = new V3(0, 1, 0);
  function tracer(a, b, color) {
    const dir = b.clone().sub(a); const len = dir.length();
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    m.position.copy(a).addScaledVector(dir, 0.5); m.scale.y = len;
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    scene.add(m); tracers.push({ m, life: 0.08 });
  }
  const bullets = [];
  const bulletGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const bulletMats = {};
  for (const k in WEAPONS) bulletMats[k] = new THREE.MeshBasicMaterial({ color: WEAPONS[k].core });
  function clearFx() {
    for (const p of particles) scene.remove(p.m); particles.length = 0;
    for (const t of tracers) scene.remove(t.m); tracers.length = 0;
    for (const b of bullets) scene.remove(b.g); bullets.length = 0;
  }

  // ================= Audio =================
  let actx = null, master = null, noiseBuf = null, muted = false;
  function initAudio() {
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(actx.destination);
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }
  function env(g, t, peak, dur) { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(dur, freq, peak) {
    if (!actx) return; const t = actx.currentTime;
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.15), t + dur);
    const g = actx.createGain(); env(g, t, peak, dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function tone(f0, f1, dur, type, peak) {
    if (!actx) return; const t = actx.currentTime;
    const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = actx.createGain(); env(g, t, peak, dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    shot: () => { noise(0.14, 3200, 0.55); tone(190, 55, 0.12, 'triangle', 0.35); },
    enemy: (vol) => { tone(1100, 180, 0.16, 'square', 0.1 * vol); noise(0.08, 1800, 0.15 * vol); },
    ink: (vol) => { tone(340, 90, 0.2, 'sine', 0.24 * vol); noise(0.12, 700, 0.18 * vol); },
    venom: (vol) => { tone(950, 280, 0.12, 'triangle', 0.14 * vol); noise(0.1, 2600, 0.12 * vol); },
    webShot: (vol) => { noise(0.35, 900, 0.3 * vol); tone(220, 110, 0.3, 'sine', 0.12 * vol); },
    webHit: () => { noise(0.5, 1400, 0.5); tone(160, 60, 0.45, 'triangle', 0.35); },
    plasma: (vol) => { tone(1800, 320, 0.14, 'sawtooth', 0.07 * vol); tone(520, 140, 0.12, 'square', 0.05 * vol); },
    hit: () => tone(1500, 2100, 0.06, 'sine', 0.22),
    hurt: () => { noise(0.22, 600, 0.6); tone(130, 45, 0.22, 'sine', 0.5); },
    boom: () => { noise(0.9, 1100, 0.9); tone(95, 28, 0.8, 'sine', 0.6); },
    click: () => tone(700, 500, 0.04, 'square', 0.08),
    ding: () => { tone(660, 660, 0.18, 'triangle', 0.18); setTimeout(() => tone(990, 990, 0.3, 'triangle', 0.18), 140); },
  };
  function setMuted(m) {
    muted = m; $('muteBtn').textContent = muted ? 'MUDO' : 'SONIDO'; $('muteBtn').setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
    if (master) master.gain.value = muted ? 0 : 0.45;
  }

  // ================= Input =================
  const keys = {};
  let firePressed = false;
  const KEYMAP = { ArrowUp: 'fwd', KeyW: 'fwd', ArrowDown: 'back', KeyS: 'back', ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'sl', KeyD: 'sr', Space: 'fire' };
  const inMenu = () => state === 'menu' || state === 'matchEnd';
  // Text fields and radios in the menu keep their native keys (typing a name, arrowing between difficulties).
  const isFormField = (t) => !!(t && t.closest && t.closest('input, textarea, select'));
  window.addEventListener('keydown', (e) => {
    if (isFormField(e.target)) return;
    const a = KEYMAP[e.code];
    if (inMenu() && (e.code === 'Enter' || e.code === 'Space')) {
      if (e.target && e.target.closest && e.target.closest('button, a')) return; // let the focused control activate
      e.preventDefault(); if (!e.repeat) startMatch(); return;
    }
    if (a) { e.preventDefault(); keys[a] = true; if (a === 'fire') firePressed = true; }
    if (e.code === 'KeyM' && !e.repeat) setMuted(!muted);
  });
  window.addEventListener('keyup', (e) => { if (isFormField(e.target)) return; const a = KEYMAP[e.code]; if (a) { e.preventDefault(); keys[a] = false; } });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  $('goBtn').addEventListener('click', startMatch);
  $('muteBtn').addEventListener('click', (e) => { setMuted(!muted); e.currentTarget.blur(); });

  // ---- Touch controls
  const touch = $('touch');
  const enableTouchMode = () => document.body.classList.add('touch-mode');
  if (IS_TOUCH) enableTouchMode();
  window.addEventListener('touchstart', enableTouchMode, { once: true, passive: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  $('portraitBtn').addEventListener('click', () => document.body.classList.add('allow-portrait'));

  // Arrow pad: each finger maps to whichever arrow is under it, so a thumb can slide between arrows.
  const pad = touch.querySelector('.pad');
  const padButtons = pad.querySelectorAll('[data-k]');
  const padPointers = new Map();
  const padKeyAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest('.pad [data-k]'); return b ? b.dataset.k : null; };
  function syncPad() {
    const held = new Set(padPointers.values());
    padButtons.forEach((b) => { const on = held.has(b.dataset.k); keys[b.dataset.k] = on; b.classList.toggle('active', on); });
  }
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    padPointers.set(e.pointerId, padKeyAt(e.clientX, e.clientY)); syncPad();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!padPointers.has(e.pointerId)) return;
    padPointers.set(e.pointerId, padKeyAt(e.clientX, e.clientY)); syncPad();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => pad.addEventListener(ev, (e) => {
    if (padPointers.delete(e.pointerId)) syncPad();
  }));

  const fireBtn = touch.querySelector('.fire');
  fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    try { fireBtn.setPointerCapture(e.pointerId); } catch (err) {}
    keys.fire = true; firePressed = true; fireBtn.classList.add('active');
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => fireBtn.addEventListener(ev, () => {
    keys.fire = false; fireBtn.classList.remove('active');
  }));

  // Fullscreen + landscape lock on phones (only works from a tap; ignored where unsupported)
  function goFullscreen() {
    if (!document.body.classList.contains('touch-mode')) return;
    if (matchMedia('(display-mode: fullscreen)').matches || document.fullscreenElement) return;
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null))
        .catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      try { el.webkitRequestFullscreen(); } catch (err) {} // iPad Safari; iPhone has no fullscreen API
    }
  }

  // ---- Gamepad (PC, tablets): standard mapping — left stick moves, right stick turns, RT/RB/A fire, Start plays
  const gpad = { connected: false, name: '', move: 0, strafe: 0, turn: 0, fire: false, prev: {}, ref: null };
  const padStatus = $('padStatus');
  function setPadStatus() {
    padStatus.classList.toggle('on', gpad.connected);
    padStatus.textContent = gpad.connected
      ? 'Mando conectado: stick izquierdo para moverte, stick derecho para girar, gatillo derecho o A para disparar, Start para empezar.'
      : 'Mando: conéctalo por USB o Bluetooth y pulsa cualquier botón.';
  }
  window.addEventListener('gamepadconnected', (e) => {
    gpad.connected = true; gpad.name = e.gamepad.id; setPadStatus();
    if (state === 'playing') showBanner('MANDO CONECTADO', 1200);
  });
  window.addEventListener('gamepaddisconnected', () => {
    const any = navigator.getGamepads && [...navigator.getGamepads()].some((g) => g && g.connected);
    if (!any) { gpad.connected = false; gpad.move = gpad.strafe = gpad.turn = 0; gpad.fire = false; gpad.ref = null; setPadStatus(); }
  });
  function pollGamepad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const g of list) if (g && g.connected) { gp = g; break; }
    gpad.ref = gp;
    if (!gp) { gpad.move = gpad.strafe = gpad.turn = 0; gpad.fire = false; return; }
    const DZ = 0.18;
    const ax = (i) => { const v = gp.axes[i] || 0; return Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ); };
    const btn = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const edge = (i) => { const now = btn(i), was = !!gpad.prev[i]; gpad.prev[i] = now; return now && !was; };
    gpad.move = -ax(1) + (btn(12) ? 1 : 0) - (btn(13) ? 1 : 0);
    gpad.strafe = ax(0);
    gpad.turn = -ax(2) + (btn(14) ? 1 : 0) - (btn(15) ? 1 : 0);
    gpad.fire = btn(7) || btn(5) || btn(0);
    const startPressed = edge(9), aPressed = edge(0), selectPressed = edge(8);
    if (inMenu() && (startPressed || aPressed)) startMatch();
    if (selectPressed) setMuted(!muted);
  }
  function rumble(strength, ms) {
    // Phones only allow vibration after the player has touched the page
    const touched = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    try { if (navigator.vibrate && touched) navigator.vibrate(ms); } catch (e) {}
    const act = gpad.ref && gpad.ref.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch(() => {});
  }

  // ---- Difficulty selector
  const diffRadios = [...document.querySelectorAll('input[name="diff"]')];
  // Shows the models and weapon looks for the current level + difficulty
  function applyLoadout() {
    for (const k in GROUPS) GROUPS[k].visible = foes.some((f) => f.kind === k && f.alive);
    const hk = weaponKeyFor('human');
    botGroup.userData.rifle.visible = hk !== 'plasma';
    botGroup.userData.plasma.visible = hk === 'plasma';
    botGroup.userData.weaponLight.color.setHex(hk === 'plasma' ? 0xB040FF : 0xFF4A50);
    const og = WEAPONS[weaponKeyFor('octo')].glow;
    octoGlow.color.setHex(og); octoGlow.emissive.setHex(og); octoGroup.userData.light.color.setHex(og);
    const alive = foes.filter((f) => f.alive).map((f) => KINDS[f.kind].name);
    $('foeName').textContent = alive.length ? alive.join(' · ') : lvl().label;
  }
  function setDifficulty(d) {
    if (!DIFFS[d]) d = 'medio';
    difficulty = d;
    diffRadios.forEach((r) => { r.checked = r.value === d; });
    $('diffNote').textContent = level === 3 ? L3_NOTES[d] : level === 2 ? OCTO_NOTES[d] : DIFFS[d].note;
    applyLoadout();
  }

  // ---- Level selector: each level unlocks only after winning every round of the previous one (3–0)
  const levelRadios = [...document.querySelectorAll('input[name="level"]')];
  const unlockedUpTo = () => (store.get('arena-l3') === '1' ? 3 : store.get('arena-l2') === '1' ? 2 : 1);
  const savedLevel = () => Math.min(unlockedUpTo(), Math.max(1, +store.get('arena-level') || 1));
  function syncLevelLock() {
    levelRadios.forEach((r) => { r.disabled = !!challenge || +r.value > unlockedUpTo(); });
  }
  const LEVEL_NOTES = {
    1: 'CENTINELA en su forma humana.',
    2: 'CENTINELA se transforma en un pulpo gigante con 150 de blindaje que dispara con dos armas.',
    3: 'Dos enemigos a la vez: el pulpo y una araña con cañón de veneno que además lanza telarañas que te congelan 5 segundos.',
  };
  function setLevel(l) {
    level = l >= 1 && l <= MAX_LEVEL ? l : 1;
    levelRadios.forEach((r) => { r.checked = +r.value === level; });
    const next = unlockedUpTo() + 1;
    $('levelNote').textContent = LEVEL_NOTES[level] + (next <= MAX_LEVEL
      ? ' Para desbloquear el nivel ' + next + ' gana el nivel ' + (next - 1) + ' sin perder ninguna ronda: 3–0.' : '');
    if (state === 'menu' || state === 'matchEnd') setupFoes(true);
    setDifficulty(difficulty);
  }
  levelRadios.forEach((r) => r.addEventListener('change', () => { if (r.checked) { setLevel(+r.value); store.set('arena-level', r.value); } }));
  diffRadios.forEach((r) => r.addEventListener('change', () => { if (r.checked) { setDifficulty(r.value); store.set('arena-diff', r.value); } }));

  // ---- Challenge links: ?reto=1&d=<dificultad>&p=<rondas tuyas>&b=<rondas CENTINELA>&t=<segundos>&n=<nombre>
  function parseChallenge() {
    try {
      const q = new URLSearchParams(location.search);
      if (!q.has('reto')) return null;
      const d = q.get('d'), p = +q.get('p'), b = +q.get('b'), t = +q.get('t'), l = +(q.get('l') || 1);
      if (!(l === 1 || l === 2 || l === 3) || !DIFFS[d] || !(p >= 0 && p <= WIN) || !(b >= 0 && b <= WIN) || (p !== WIN && b !== WIN) || p === b || !(t > 0 && t < 36000)) return null;
      const n = (q.get('n') || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 16);
      return { d, l, p, b, t: Math.round(t), n: n || 'Tu amigo' };
    } catch (e) { return null; }
  }
  const FOE_A = { 1: 'a CENTINELA', 2: 'al pulpo', 3: 'al pulpo y la araña' };
  const FOE_VS = { 1: 'contra CENTINELA', 2: 'contra el pulpo', 3: 'contra el pulpo y la araña' };
  const describe = (r) => (r.p > r.b ? 'Le ganó ' + r.p + '–' + r.b + ' ' + FOE_A[r.l] : 'Perdió ' + r.p + '–' + r.b + ' ' + FOE_VS[r.l])
    + ' en ' + DIFFS[r.d].name + (r.l > 1 ? ' (nivel ' + r.l + ')' : '') + ', en ' + fmtTime(r.t) + '.';
  // Higher is better: a win beats a loss, then round margin, then a faster time.
  const compareResults = (a, b) => ((a.p > a.b) - (b.p > b.b)) || ((a.p - a.b) - (b.p - b.b)) || (b.t - a.t);
  let challenge = parseChallenge();
  function renderChallenge() {
    const box = $('challenge');
    box.hidden = !challenge;
    diffRadios.forEach((r) => { r.disabled = !!challenge; });
    syncLevelLock();
    if (!challenge) return;
    setLevel(challenge.l);
    setDifficulty(challenge.d);
    $('challengeWho').textContent = 'Reto de ' + challenge.n;
    $('challengeText').textContent = describe(challenge) + ' ¿Puedes superarlo? Juegas en el mismo nivel y dificultad.';
  }
  $('noChallengeBtn').addEventListener('click', () => {
    challenge = null;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    setLevel(savedLevel());
    setDifficulty(store.get('arena-diff') || 'medio');
    renderChallenge(); $('verdict').hidden = true;
  });

  // ---- Share a challenge with the result of the last match
  let lastResult = null;
  const nick = $('nick'), shareStatus = $('shareStatus'), shareUrl = $('shareUrl');
  nick.value = store.get('arena-nick') || '';
  function challengeLink() {
    const u = new URL(location.href);
    u.hash = '';
    const q = new URLSearchParams({ reto: '1', l: lastResult.l, d: lastResult.d, p: lastResult.p, b: lastResult.b, t: lastResult.t });
    const n = nick.value.trim();
    if (n) q.set('n', n);
    u.search = q.toString();
    return u.toString();
  }
  function challengeText() {
    const r = lastResult, where = DIFFS[r.d].name + (r.l > 1 ? ', nivel ' + r.l : '');
    return r.p > r.b
      ? 'Le gané ' + r.p + '–' + r.b + ' ' + FOE_A[r.l] + ' en Arena Ocaso (' + where + ', ' + fmtTime(r.t) + '). ¿Me superas?'
      : { 1: 'CENTINELA me ganó', 2: 'El pulpo me ganó', 3: 'El pulpo y la araña me ganaron' }[r.l] + ' ' + r.p + '–' + r.b + ' en Arena Ocaso (' + where + '). ¿Tú puedes hacerlo mejor?';
  }
  function refreshShare() {
    if (!lastResult) return;
    $('waLink').href = 'https://wa.me/?text=' + encodeURIComponent(challengeText() + ' ' + challengeLink());
  }
  nick.addEventListener('input', () => { store.set('arena-nick', nick.value.trim()); refreshShare(); shareStatus.textContent = ''; });
  $('shareBtn').addEventListener('click', async () => {
    if (!lastResult) return;
    const url = challengeLink(), text = challengeText();
    if (navigator.share) {
      try { await navigator.share({ title: 'Arena Ocaso', text, url }); shareStatus.textContent = 'Reto listo para enviar.'; return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    shareUrl.value = url; shareUrl.hidden = false;
    try { await navigator.clipboard.writeText(text + ' ' + url); shareStatus.textContent = 'Enlace copiado. Pégalo en un mensaje a tu amigo.'; }
    catch (err) { shareUrl.focus(); shareUrl.select(); shareStatus.textContent = 'Copia este enlace y envíaselo a tu amigo.'; }
  });

  // ---- iPhone / iPad: no install prompt in Safari, so explain the manual step
  const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  $('iosHint').hidden = !(IS_IOS && !IS_STANDALONE);

  difficulty = DIFFS[store.get('arena-diff')] ? store.get('arena-diff') : 'medio';
  setLevel(savedLevel());
  renderChallenge();
  $('nextLevelBtn').addEventListener('click', () => { setLevel(Math.min(MAX_LEVEL, level + 1)); store.set('arena-level', String(level)); startMatch(); });

  // ---- Install as an app (Android Chrome offers this once the PWA criteria are met)
  let installPrompt = null;
  const installBtn = $('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (err) {}
    installPrompt = null; installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ================= HUD =================
  const hpFill = $('hpFill'), hpNum = $('hpNum'), foeFill = $('foeFill'), ammoNum = $('ammoNum'), ammoState = $('ammoState');
  const banner = $('banner'), hitmark = $('hitmark'), vignette = $('vignette');
  const webbed = $('webbed'), webTime = $('webTime');
  // Full-screen spider web drawn as SVG, shown while the player is frozen
  (function drawWebOverlay() {
    const cx = 500, cy = 300, n = 14; let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; d += 'M' + cx + ' ' + cy + 'L' + (cx + Math.cos(a) * 900).toFixed(1) + ' ' + (cy + Math.sin(a) * 900).toFixed(1); }
    for (let r = 40; r < 700; r *= 1.32) {
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r * (0.92 + 0.08 * Math.sin(i * 2.3)); d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); }
    }
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 600' preserveAspectRatio='xMidYMid slice'>"
      + "<rect width='1000' height='600' fill='rgb(230,240,255)' fill-opacity='0.16'/>"
      + "<path d='" + d + "' fill='none' stroke='white' stroke-opacity='0.75' stroke-width='2.2'/></svg>";
    webbed.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  })();
  function pips() {
    const mk = (n) => Array.from({ length: WIN }, (_, i) => `<span class="pip${i < n ? ' on' : ''}"></span>`).join('');
    $('pips-p').innerHTML = mk(score.p); $('pips-b').innerHTML = mk(score.b);
    const compact = window.innerWidth < 900;
    $('roundLbl').textContent = (level > 1 ? 'N' + level + ' · ' : '') + (compact ? 'R' : 'RONDA ') + round + ' · ' + DIFFS[difficulty].name.toUpperCase();
  }
  let bannerTimer = null;
  function showBanner(html, ms) {
    banner.innerHTML = html; banner.classList.add('show');
    clearTimeout(bannerTimer); if (ms) bannerTimer = setTimeout(() => banner.classList.remove('show'), ms);
  }
  function updateHud() {
    const hp = Math.max(0, Math.ceil(player.hp));
    hpNum.textContent = hp; hpFill.style.width = hp + '%'; hpFill.classList.toggle('low', hp <= 30);
    let hpSum = 0, maxSum = 0;
    for (const f of foes) { hpSum += Math.max(0, f.hp); maxSum += f.maxHp; }
    foeFill.style.width = (maxSum ? hpSum / maxSum * 100 : 0) + '%';
    webbed.hidden = !(player.frozen > 0);
    if (player.frozen > 0) webTime.textContent = player.frozen.toFixed(1).replace('.', ',') + ' s';
    ammoNum.innerHTML = (player.reload > 0 ? 0 : player.ammo) + '<small> / ' + MAG + '</small>';
    ammoState.textContent = player.reload > 0 ? 'RECARGANDO…' : '';
    hitmark.classList.toggle('show', hitT > 0);
    vignette.style.opacity = Math.min(1, hurt).toFixed(3);
  }

  // Radar
  const radar = $('radar'), rg = radar.getContext('2d');
  function drawRadar() {
    const S = radar.width, c = S / 2, R = S / 2 - 6, sc = R / 30;
    rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, S, S);
    rg.save();
    rg.beginPath(); rg.arc(c, c, R, 0, Math.PI * 2); rg.fillStyle = 'rgba(19,17,31,.62)'; rg.fill();
    rg.lineWidth = 3; rg.strokeStyle = 'rgba(243,234,215,.35)'; rg.stroke(); rg.clip();
    rg.strokeStyle = 'rgba(243,234,215,.12)'; rg.lineWidth = 2;
    rg.beginPath(); rg.arc(c, c, R * 0.5, 0, Math.PI * 2); rg.stroke();
    const y = player.yaw, cs = Math.cos(y), sn = Math.sin(y);
    const a = sc * cs, cc = -sc * sn, b = sc * sn, d = sc * cs;
    rg.setTransform(a, b, cc, d, c - (a * player.pos.x + cc * player.pos.z), c - (b * player.pos.x + d * player.pos.z));
    rg.fillStyle = 'rgba(243,234,215,.4)';
    for (const o of OBST) rg.fillRect(o.x - o.w / 2, o.z - o.d / 2, o.w, o.d);
    rg.strokeStyle = 'rgba(228,123,76,.8)'; rg.lineWidth = 0.35; rg.strokeRect(-ARENA, -ARENA, ARENA * 2, ARENA * 2);
    for (const f of foes) {
      if (!f.alive) continue;
      rg.fillStyle = KINDS[f.kind].dot + (f.sees ? '' : '99');
      rg.beginPath(); rg.arc(f.pos.x, f.pos.z, 1.3, 0, Math.PI * 2); rg.fill();
    }
    for (const bl of bullets) { rg.fillStyle = bl.radar; rg.fillRect(bl.g.position.x - 0.35, bl.g.position.z - 0.35, 0.7, 0.7); }
    rg.setTransform(1, 0, 0, 1, 0, 0);
    rg.fillStyle = '#8FE3F0'; rg.beginPath(); rg.moveTo(c, c - 11); rg.lineTo(c + 8, c + 8); rg.lineTo(c, c + 3); rg.lineTo(c - 8, c + 8); rg.closePath(); rg.fill();
    rg.restore();
  }

  // ================= Match flow =================
  function resetRound() {
    clearFx();
    Object.assign(player, { hp: 100, alive: true, fireCd: 0.3, ammo: MAG, reload: 0, yaw: 0, turnHold: 0, recoil: 0, frozen: 0 });
    player.pos.set(0, 0, 24); player.vel.set(0, 0, 0);
    setupFoes(false);
    hurt = 0; shake = 0;
    pips(); updateHud();
    const sub = round === 1
      ? (level === 3 ? 'El pulpo y la araña · cuidado con la telaraña'
        : level === 2 ? 'CENTINELA se transforma en pulpo · dispara con dos armas'
        : weapon() === WEAPONS.plasma ? 'CENTINELA lleva un fusil de plasma' : 'Encuentra a CENTINELA')
      : (level === 3 ? 'Disparan con más precisión' : lvl().the + ' dispara con más precisión');
    showBanner('RONDA ' + round + '<small>' + sub + '</small>', round === 1 && (level > 1 || weapon() === WEAPONS.plasma) ? 2400 : 1600);
  }
  function startMatch() {
    initAudio(); goFullscreen();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    score = { p: 0, b: 0 }; round = 1; matchTime = 0;
    $('shareBox').hidden = true; $('verdict').hidden = true; $('nextLevelBtn').hidden = true; shareStatus.textContent = ''; shareUrl.hidden = true;
    $('overlay').hidden = true; $('hud').hidden = false; gun.visible = true;
    for (const k in keys) keys[k] = false;
    resetRound(); state = 'playing';
  }
  function endRound(winner) {
    if (state !== 'playing') return;
    score[winner]++; state = 'roundEnd'; roundTimer = 2.6; pips();
    player.frozen = 0;
    if (score[winner] >= WIN) {
      roundTimer = 2.2;
      showBanner(winner === 'p' ? lvl().down + '<small>Última ronda ganada</small>' : 'HAS CAÍDO<small>Última ronda perdida</small>', 2100);
    } else {
      showBanner(winner === 'p' ? 'RONDA PARA TI<small>' + score.p + ' — ' + score.b + '</small>' : 'RONDA PARA ' + lvl().the + '<small>' + score.p + ' — ' + score.b + '</small>', 2300);
    }
    if (winner === 'p') sfx.ding();
  }
  const END_TEXT = {
    1: { win: 'Has derribado a CENTINELA.', lose: 'CENTINELA se queda con la arena. Muévete entre coberturas y no te quedes quieto en campo abierto.' },
    2: { win: 'Has derrotado al pulpo. CENTINELA no se esperaba esto.', lose: 'El pulpo se queda con la arena. Sus dos armas cubren mucho espacio: muévete de lado y usa los bloques altos.' },
    3: { win: 'Has derrotado al pulpo y a la araña. La arena es tuya.', lose: 'El pulpo y la araña se quedan con la arena. Esquiva la telaraña blanca: si te atrapa, quedas inmóvil 5 segundos.' },
  };
  const NEXT_NAME = { 2: 'Nivel 2: el pulpo', 3: 'Nivel 3: pulpo y araña' };
  function finishMatch() {
    state = 'matchEnd';
    const won = score.p > score.b;
    $('hud').hidden = true; gun.visible = false; webbed.hidden = true;
    lastResult = { d: difficulty, l: level, p: score.p, b: score.b, t: Math.max(1, Math.round(matchTime)) };
    $('kicker').textContent = (won ? 'Duelo terminado · has ganado' : 'Duelo terminado · has perdido') + ' · Nivel ' + level + ' · ' + DIFFS[difficulty].name;
    $('title').innerHTML = won ? '<span>Victoria</span>' : '<span>Derrota</span>';
    // The next level unlocks only with a perfect 3–0
    const perfect = won && score.b === 0;
    const next = level + 1, hasNext = next <= MAX_LEVEL;
    const wasUnlocked = hasNext && unlockedUpTo() >= next;
    if (perfect && hasNext) store.set('arena-l' + next, '1');
    let text = won ? END_TEXT[level].win : END_TEXT[level].lose;
    if (won && hasNext) {
      text += perfect
        ? (wasUnlocked ? ' Ganaste 3–0: puedes pasar al nivel ' + next + '.' : ' Ganaste las 3 rondas sin perder ninguna: nivel ' + next + ' desbloqueado.')
        : (wasUnlocked ? ' El nivel ' + next + ' ya está disponible en el menú.' : ' Perdiste alguna ronda: para desbloquear el nivel ' + next + ' tienes que ganar 3–0.');
    }
    $('lede').textContent = text;
    const nb = $('nextLevelBtn');
    nb.hidden = !(perfect && hasNext && !challenge);
    if (hasNext) nb.textContent = NEXT_NAME[next] + ' ↵';
    syncLevelLock(); setLevel(level);
    const res = $('result'); res.hidden = false;
    res.innerHTML = 'Marcador final &nbsp;<b>' + score.p + ' — ' + score.b + '</b> &nbsp;·&nbsp; Tiempo <b>' + fmtTime(lastResult.t) + '</b>';
    const verdict = $('verdict');
    if (challenge) {
      const c = compareResults(lastResult, challenge);
      verdict.textContent = c > 0 ? 'Superaste el reto de ' + challenge.n + '.'
        : c < 0 ? challenge.n + ' sigue adelante. Inténtalo otra vez.'
        : 'Empate exacto con ' + challenge.n + '.';
      verdict.hidden = false;
      $('shareBtn').textContent = 'Devolver el desafío';
    } else {
      verdict.hidden = true;
      $('shareBtn').textContent = 'Desafiar a un amigo';
    }
    $('shareBox').hidden = false; refreshShare();
    $('keys').hidden = true; $('extra').hidden = true;
    $('goBtn').textContent = 'Revancha ↵';
    $('overlay').hidden = false;
    $('goBtn').focus({ preventScroll: true });
  }

  // ================= Combat =================
  const aimRay = new THREE.Raycaster();
  const CENTER = new THREE.Vector2(0, 0);
  // Turning only with the arrow keys makes pixel-exact aim unfair, so each foe's
  // hit zone is a generous sphere that widens slightly with distance.
  const HIT_R_PER_M = 0.03;
  function startReload() { if (player.reload <= 0) { player.reload = 1.3; sfx.click(); } }
  // Nearest live foe whose hit zone the ray crosses before maxDist
  function foeHitAlongRay(ray, maxDist) {
    let best = null;
    for (const f of foes) {
      if (!f.alive) continue;
      const K = KINDS[f.kind];
      const c = new V3(f.pos.x, K.hitY + GROUPS[f.kind].position.y, f.pos.z);
      const t = c.clone().sub(ray.origin).dot(ray.direction);
      if (!(t > 0 && t < maxDist) || (best && t >= best.t)) continue;
      const off = ray.origin.clone().addScaledVector(ray.direction, t).sub(c);
      if (!(off.length() <= K.hitR + t * HIT_R_PER_M)) continue;
      best = { f, t, point: c.add(off.clampLength(0, K.hitR * 0.6)) };
    }
    return best;
  }
  function playerShoot() {
    if (player.reload > 0 || player.fireCd > 0) return;
    if (player.ammo <= 0) { startReload(); return; }
    player.ammo--; player.fireCd = 0.2; player.recoil = 1;
    muzzle.visible = true; muzzle.material.rotation = Math.random() * 6; muzzleLight.intensity = 2.5;
    sfx.shot(); shake = Math.max(shake, 0.04);
    aimRay.setFromCamera(CENTER, camera); aimRay.far = 200;
    const hits = aimRay.intersectObjects(solids, false);
    const wallDist = hits.length ? hits[0].distance : Infinity;
    const start = muzzle.getWorldPosition(new V3());
    let end;
    const hit = foeHitAlongRay(aimRay.ray, wallDist);
    if (hit) {
      end = hit.point; damageFoe(hit.f, 20, end);
    } else if (hits.length) {
      end = hits[0].point; burst(end, 0xD9B98A, 6, 3, 0.35);
    } else end = aimRay.ray.origin.clone().addScaledVector(aimRay.ray.direction, 150);
    tracer(start, end, 0x8FE3F0);
    if (player.ammo === 0) startReload();
  }
  const DEATH_COLORS = { human: [0xE0304A, 0xFFB27A, 0x2B2934], octo: [0x6E2547, 0x18C8A8, 0x101018], spider: [0x1C1420, 0x9CFF3A, 0xE8FFC8] };
  function damageFoe(f, dmg, at) {
    f.hp -= dmg; f.flash = 0.15; hitT = 0.2; sfx.hit();
    burst(at, 0xFF5A5A, 14, 5, 0.45); burst(at, 0xFFFFFF, 5, 3, 0.2);
    if (!f.sees) { f.hunting = true; f.lastSeen.copy(player.pos); }
    if (f.hp > 0) return;
    f.alive = false; f.hp = 0; sfx.boom();
    const c = f.pos.clone().setY(KINDS[f.kind].hitY);
    const [c1, c2, c3] = DEATH_COLORS[f.kind];
    burst(c, c1, 34, 9, 1.1); burst(c, c2, 24, 8, 0.9); burst(c, c3, 22, 6, 1.2);
    shake = 0.25;
    applyLoadout();
    const left = foes.filter((o) => o.alive);
    if (!left.length) endRound('p');
    else if (state === 'playing') {
      showBanner(KINDS[f.kind].name + (f.kind === 'spider' ? ' DERRIBADA' : ' DERRIBADO') + '<small>Queda ' + left.map((o) => KINDS[o.kind].name).join(' y ') + '</small>', 1500);
    }
  }
  // Muzzles in each foe's local space (x right, forward = -z)
  const MUZZLES = {
    human: (f, W) => [[0.05, 1.42, W.muzzleZ]],
    octo: (f, W) => (W.dual === 'both' ? [[-1.05, 1.4, -1.9], [1.05, 1.4, -1.9]] : [[1.05 * f.gunSide, 1.4, -1.9]]),
    spider: () => [[0.32, 1.56, -1.18]],
  };
  function toWorld(f, lx, ly, lz) {
    const s = Math.sin(f.yaw), c = Math.cos(f.yaw);
    return new V3(f.pos.x + lx * c + lz * s, ly + GROUPS[f.kind].position.y, f.pos.z - lx * s + lz * c);
  }
  function aimAt(origin, speed, d, spreadMul) {
    const target = player.pos.clone().setY(1.2);
    target.addScaledVector(player.vel, origin.distanceTo(target) / speed * d.lead);
    const dir = target.sub(origin).normalize(), sp = d.spread * (spreadMul || 1);
    dir.x += rand(-1, 1) * sp; dir.y += rand(-0.5, 0.5) * sp; dir.z += rand(-1, 1) * sp;
    return dir.normalize();
  }
  function botShoot(f, d) {
    f.gunSide *= -1;
    const key = weaponKeyFor(f.kind), W = WEAPONS[key];
    for (const [lx, ly, lz] of MUZZLES[f.kind](f, W)) {
      const origin = toWorld(f, lx, ly, lz);
      const dir = aimAt(origin, W.speed, d);
      const g = new THREE.Group();
      const core = new THREE.Mesh(bulletGeo, bulletMats[key]);
      core.scale.setScalar(W.size / 0.9);
      g.add(core); g.add(glowSprite(W.glow, W.size));
      g.position.copy(origin); scene.add(g);
      bullets.push({ g, v: dir.multiplyScalar(W.speed), life: 4, dmg: W.dmg || DIFFS[difficulty].dmg, radar: W.radar });
    }
    sfx[W.sound](Math.max(0.25, 1 - f.pos.distanceTo(player.pos) / 60));
  }
  // Spider web: slow and dodgeable, stopped by cover; a hit freezes the player for FREEZE_S seconds
  function throwWeb(f, d) {
    const W = WEB[difficulty];
    const origin = toWorld(f, 0, 1.15, -1.0);
    const dir = aimAt(origin, W.speed, d, 0.5);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: webTex, transparent: true, depthWrite: false }));
    g.scale.setScalar(1.6); g.position.copy(origin); scene.add(g);
    bullets.push({ g, v: dir.multiplyScalar(W.speed), life: 5, web: true, radar: '#FFFFFF' });
    sfx.webShot(Math.max(0.3, 1 - f.pos.distanceTo(player.pos) / 50));
  }
  function freezePlayer() {
    if (!player.alive || state !== 'playing') return;
    player.frozen = FREEZE_S; player.vel.set(0, 0, 0);
    sfx.webHit(); rumble(1, 300); shake = Math.max(shake, 0.1);
  }
  function damagePlayer(dmg, from) {
    if (!player.alive || state !== 'playing') return;
    player.hp -= dmg; hurt = Math.min(1.2, hurt + 0.7); shake = Math.max(shake, 0.12); sfx.hurt(); rumble(0.7, 120);
    if (player.hp <= 0) { player.hp = 0; player.alive = false; endRound('b'); }
  }

  // ================= Update =================
  function updatePlayer(dt) {
    // Caught in a web: no moving or turning (you can still shoot what is in front of you)
    const frozen = player.frozen > 0;
    if (frozen) player.frozen = Math.max(0, player.frozen - dt);
    const turn = frozen ? 0 : (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    player.turnHold = turn ? Math.min(player.turnHold + dt, 0.35) : 0;
    const turnSpeed = 0.8 + 1.7 * (player.turnHold / 0.35);
    const padTurn = frozen ? 0 : Math.sign(gpad.turn) * Math.pow(Math.min(1, Math.abs(gpad.turn)), 1.6) * 2.8; // finer aim near centre
    player.yaw = wrapAngle(player.yaw + (turn * turnSpeed + padTurn) * dt);

    const clamp1 = (v) => Math.max(-1, Math.min(1, v));
    const f = frozen ? 0 : clamp1((keys.fwd ? 1 : 0) - (keys.back ? 1 : 0) + gpad.move);
    const st = frozen ? 0 : clamp1((keys.sr ? 1 : 0) - (keys.sl ? 1 : 0) + gpad.strafe);
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    const wish = new V3(-sy * f + cy * st, 0, -cy * f - sy * st);
    const amount = Math.min(1, Math.hypot(f, st));
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar((f < 0 && Math.abs(st) < 0.3 ? 5 : 7) * amount);
    player.vel.lerp(wish, Math.min(1, dt * 10));
    player.pos.addScaledVector(player.vel, dt);
    // keep away from foes
    for (const o of foes) {
      if (!o.alive) continue;
      const dx = player.pos.x - o.pos.x, dz = player.pos.z - o.pos.z, dd = Math.hypot(dx, dz), min = PLAYER_R + KINDS[o.kind].radius;
      if (dd < min && dd > 1e-4) { player.pos.x = o.pos.x + dx / dd * min; player.pos.z = o.pos.z + dz / dd * min; }
    }
    resolve(player.pos, PLAYER_R);
    player.bob += player.vel.length() * dt * 1.7;

    player.fireCd -= dt;
    if (player.reload > 0) { player.reload -= dt; if (player.reload <= 0) { player.ammo = MAG; sfx.click(); } }
    if (keys.fire || firePressed || gpad.fire) playerShoot();
    firePressed = false;
  }

  function updateFoe(f, dt) {
    if (!f.alive) return;
    const d = diffFor(round), K = KINDS[f.kind];
    f.losT -= dt;
    if (f.losT <= 0) {
      f.losT = 0.1;
      const was = f.sees;
      f.sees = player.alive && hasLOS(f);
      if (f.sees) { if (!was) f.reaction = d.react; f.lastSeen.copy(player.pos); f.hunting = true; }
    }
    f.reaction -= dt;
    const toP = new V3(player.pos.x - f.pos.x, 0, player.pos.z - f.pos.z);
    const dist = toP.length();
    const mv = new V3();
    if (f.sees) {
      const dirP = toP.clone().divideScalar(dist || 1);
      f.strafeT -= dt;
      if (f.strafeT <= 0) { f.strafeT = rand(0.7, 2.2); if (Math.random() < 0.7) f.strafeDir *= -1; }
      if (dist > 16) mv.add(dirP); else if (dist < 7) mv.addScaledVector(dirP, -1);
      mv.addScaledVector(new V3(-dirP.z, 0, dirP.x), f.strafeDir * 0.9);
      f.faceYaw = Math.atan2(-toP.x, -toP.z);
      f.fireCd -= dt;
      const aimed = Math.abs(wrapAngle(f.faceYaw - f.yaw)) < 0.3;
      if (f.fireCd <= 0 && f.reaction <= 0 && aimed && state === 'playing') {
        const W = WEAPONS[weaponKeyFor(f.kind)];
        f.burstLeft = W.burst; f.burstT = 0;
        f.fireCd = d.fire * W.cdMul * rand(0.75, 1.25);
      }
      if (f.burstLeft > 0 && state === 'playing') {
        f.burstT -= dt;
        if (f.burstT <= 0) { botShoot(f, d); f.burstLeft--; f.burstT = WEAPONS[weaponKeyFor(f.kind)].gap; }
      }
      if (f.kind === 'spider' && state === 'playing') {
        f.webCd -= dt;
        if (f.webCd <= 0 && f.reaction <= 0 && aimed && dist < 26 && !(player.frozen > 0)) {
          throwWeb(f, d); f.webCd = WEB[difficulty].cd * rand(0.85, 1.2);
        }
      }
    } else {
      f.fireCd = Math.max(f.fireCd, 0.35);
      f.burstLeft = 0;
      const tgt = f.hunting ? f.lastSeen : f.wander;
      const to = new V3(tgt.x - f.pos.x, 0, tgt.z - f.pos.z);
      if (to.length() < 1.6) { if (f.hunting) f.hunting = false; pickWander(f); }
      else mv.copy(to.normalize());
      if (f.vel.lengthSq() > 0.3) f.faceYaw = Math.atan2(-f.vel.x, -f.vel.z);
    }
    if (mv.lengthSq() > 0) mv.normalize().multiplyScalar(d.speed * K.speedMul * (f.sees ? 1 : 0.85));
    f.vel.lerp(mv, Math.min(1, dt * 5));
    const prev = f.pos.clone();
    f.pos.addScaledVector(f.vel, dt);
    resolve(f.pos, K.radius);
    const moved = prev.distanceTo(f.pos), want = f.vel.length() * dt;
    if (want > 0.02 && moved < want * 0.35) f.stuck += dt; else f.stuck = Math.max(0, f.stuck - dt);
    if (f.stuck > 0.45) { f.stuck = 0; f.strafeDir *= -1; if (!f.sees) { f.hunting = false; pickWander(f); } }
    f.yaw = wrapAngle(f.yaw + wrapAngle(f.faceYaw - f.yaw) * Math.min(1, dt * d.turn));
  }
  function updateFoes(dt) {
    for (const f of foes) updateFoe(f, dt);
    // Foes don't walk through each other
    for (let i = 0; i < foes.length; i++) for (let j = i + 1; j < foes.length; j++) {
      const a = foes[i], b = foes[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dd = Math.hypot(dx, dz), min = KINDS[a.kind].radius + KINDS[b.kind].radius;
      if (dd < min && dd > 1e-4) {
        const push = (min - dd) / 2, nx = dx / dd, nz = dz / dd;
        a.pos.x -= nx * push; a.pos.z -= nz * push; b.pos.x += nx * push; b.pos.z += nz * push;
        resolve(a.pos, KINDS[a.kind].radius); resolve(b.pos, KINDS[b.kind].radius);
      }
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const step = b.v.clone().multiplyScalar(dt);
      let dead = false;
      if (b.web) b.g.material.rotation += dt * 4;
      // sub-step to avoid tunnelling
      for (let s = 0; s < 3 && !dead; s++) {
        b.g.position.addScaledVector(step, 1 / 3);
        const p = b.g.position;
        const dx = p.x - player.pos.x, dz = p.z - player.pos.z, r = b.web ? 0.7 : 0.5;
        if (player.alive && dx * dx + dz * dz < r * r && p.y > 0.1 && p.y < 1.85) {
          if (b.web) freezePlayer(); else damagePlayer(b.dmg);
          dead = true;
        } else if (insideSolid(p)) { burst(p, b.web ? 0xFFFFFF : 0xFFB27A, b.web ? 10 : 5, 3, 0.4); dead = true; }
      }
      b.life -= dt;
      if (dead || b.life <= 0) { scene.remove(b.g); bullets.splice(i, 1); }
    }
  }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.v.y -= 14 * dt; p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.set(p.v.x * 0.4, -p.v.y * 0.3, p.v.z * 0.4); }
      p.life -= dt; p.m.material.opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); }
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.08);
      if (t.life <= 0) { scene.remove(t.m); t.m.material.dispose(); tracers.splice(i, 1); }
    }
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 30);
    if (muzzleLight.intensity < 0.5) muzzle.visible = false;
    hitT -= dt; hurt = Math.max(0, hurt - dt * 1.4); shake = Math.max(0, shake - dt * 0.6);
  }

  const setFlash = (mat, on, k) => { mat.emissive.setHex(on ? 0xFF5A6A : 0x000000); mat.emissiveIntensity = on ? k : 0; };
  function applyFoeVisual(f, dt) {
    const g = GROUPS[f.kind], spd = f.vel.length();
    f.flash -= dt;
    if (f.kind === 'octo') {
      // Hovers, breathes and ripples its tentacles faster when moving
      const amp = 0.12 + 0.18 * Math.min(1, spd / 4);
      g.position.set(f.pos.x, 0.14 + Math.sin(time * 1.8) * 0.08, f.pos.z);
      g.rotation.y = f.yaw;
      g.userData.mantle.scale.y = 1.25 + Math.sin(time * 2.2) * 0.03;
      for (const tn of g.userData.tentacles) {
        tn.joints.forEach((j, k) => { j.rotation.x = (k === 0 ? -1.0 : 0.22) + Math.sin(time * (2.2 + spd * 0.5) + k * 0.7 + tn.phase) * amp; });
      }
      setFlash(octoSkin, f.flash > 0, 0.9);
    } else if (f.kind === 'spider') {
      f.walk += spd * dt * 3.2;
      g.position.set(f.pos.x, Math.abs(Math.sin(f.walk * 2)) * 0.03 * Math.min(1, spd / 3), f.pos.z);
      g.rotation.y = f.yaw;
      poseSpider(f.walk, Math.min(1, spd / 3));
      setFlash(spiderSkin, f.flash > 0, 0.9);
    } else {
      f.walk += spd * dt * 2.2;
      const swing = Math.sin(f.walk) * Math.min(1, spd / 4) * 0.6;
      const [lLeg, rLeg] = g.userData.legs, [lArm, rArm] = g.userData.arms;
      lLeg.rotation.x = swing; rLeg.rotation.x = -swing;
      lArm.rotation.x = -1.15 + swing * 0.08; rArm.rotation.x = -1.15 - swing * 0.08;
      g.position.set(f.pos.x, Math.abs(Math.cos(f.walk)) * 0.05 * Math.min(1, spd / 4), f.pos.z);
      g.rotation.y = f.yaw;
      setFlash(botMetal, f.flash > 0, 1.1);
    }
  }
  function applyFoesVisual(dt) { for (const f of foes) if (f.alive) applyFoeVisual(f, dt); }

  function applyCamera(dt) {
    if (state === 'menu') {
      const a = time * 0.08;
      camera.position.set(Math.sin(a) * 34, 9 + Math.sin(time * 0.3) * 1.5, Math.cos(a) * 34);
      camera.lookAt(0, 1.5, 0);
      return;
    }
    const bobY = Math.sin(player.bob) * 0.05 * Math.min(1, player.vel.length() / 5);
    let h = 1.6 + bobY, roll = 0;
    if (!player.alive) { player.deathT = Math.min(1, (player.deathT || 0) + dt * 1.5); h = 1.6 - 1.2 * player.deathT; roll = 0.5 * player.deathT; }
    else player.deathT = 0;
    const sh = shake;
    camera.position.set(player.pos.x + rand(-sh, sh), h + rand(-sh, sh), player.pos.z + rand(-sh, sh));
    camera.rotation.set(0, player.yaw, roll);
    player.recoil = Math.max(0, player.recoil - dt * 9);
    const sway = Math.sin(player.bob * 0.5) * 0.012 * Math.min(1, player.vel.length() / 5);
    const reloadDip = player.reload > 0 ? Math.sin(Math.min(1, (1.3 - player.reload) / 1.3) * Math.PI) * 0.18 : 0;
    gun.position.set(GUN_BASE.x + sway, GUN_BASE.y + Math.abs(bobY) * 0.4 - reloadDip, GUN_BASE.z + player.recoil * 0.07);
    gun.rotation.set(player.recoil * 0.12 - reloadDip * 1.5, 0, 0);
  }

  // ================= Loop =================
  // The frame can load at 0x0 (hidden tab, thumbnail); a NaN aspect would break both
  // rendering and aiming, so size is re-checked every frame and ignored until non-zero.
  let lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (w < 1 || h < 1 || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();


  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    resize();
    pollGamepad();
    if (state === 'playing') { matchTime += dt; updatePlayer(dt); updateFoes(dt); }
    else if (state === 'menu' || state === 'matchEnd') { updateFoes(dt); }
    else if (state === 'roundEnd') {
      updateFoes(dt);
      roundTimer -= dt;
      if (roundTimer <= 0) {
        if (score.p >= WIN || score.b >= WIN) finishMatch();
        else { round++; resetRound(); state = 'playing'; }
      }
    }
    updateBullets(dt); updateFx(dt);
    applyFoesVisual(dt); applyCamera(dt);
    if (state !== 'menu' && state !== 'matchEnd') { updateHud(); drawRadar(); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  pips();
  requestAnimationFrame(frame);
})();
