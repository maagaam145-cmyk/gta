(function () {
  const SV = (window.SV = window.SV || {});

  SV.ROAD_COORDS = [-108, -54, 0, 54, 108];
  SV.CELL_SIZE = 54;
  SV.ROAD_WIDTH = 14;
  SV.SIDEWALK_WIDTH = 4;
  SV.LANE_OFFSET = 3.35;
  SV.HALF_WORLD = 178;
  SV.TRAFFIC_GREEN_DURATION = 9.0;
  SV.TRAFFIC_YELLOW_DURATION = 2.0;

  SV.WEAPONS = [
    { id: 'fist', name: 'FIST', damage: 28, range: 2.8, cooldown: 0.36, magSize: Infinity, auto: false, color: 0xffffff },
    { id: 'pistol', name: 'K5 PISTOL', damage: 45, range: 65, cooldown: 0.3, magSize: 12, auto: false, color: 0xffd166 },
    { id: 'smg', name: 'K1A SMG', damage: 24, range: 55, cooldown: 0.1, magSize: 30, auto: true, color: 0x00f0ff },
  ];

  SV.VEHICLE_SPECS = {
    taxi: {
      label: 'SEOUL TAXI',
      maxSpeed: 31,
      accel: 22,
      turnSpeed: 2.5,
      color: 0xff7b00,
      roofSign: 'TAXI',
      size: [2.1, 1.45, 4.4],
    },
    sedan: {
      label: 'K-SEDAN',
      maxSpeed: 30,
      accel: 21,
      turnSpeed: 2.45,
      color: 0x3b82f6,
      size: [2.05, 1.42, 4.35],
    },
    sports: {
      label: 'SONATA GT',
      maxSpeed: 40,
      accel: 29,
      turnSpeed: 2.8,
      color: 0xff2e93,
      size: [2.1, 1.26, 4.45],
    },
    bus: {
      label: 'CITY BUS',
      maxSpeed: 21,
      accel: 12,
      turnSpeed: 1.75,
      color: 0x2563eb,
      size: [2.45, 2.75, 7.6],
      isBus: true,
    },
    scooter: {
      label: '배달 SCOOTER',
      maxSpeed: 27,
      accel: 25,
      turnSpeed: 3.2,
      color: 0x10b981,
      size: [0.95, 1.2, 2.1],
      isScooter: true,
    },
    police: {
      label: 'K-POLICE',
      maxSpeed: 36,
      accel: 26,
      turnSpeed: 2.7,
      color: 0xf8fafc,
      size: [2.15, 1.5, 4.5],
      isPolice: true,
    },
  };

  SV.CITIES = {
    seoul: {
      id: 'seoul',
      name: 'SEOUL',
      kr: '서울특별시 • 강남 • 명동',
      badge: '서울 SEOUL',
      radio: 'SEOUL FM',
      travelMode: 'KTX EXPRESS',
      lat: 37.5600,
      lng: 126.9858,
      fare: 0,
      desc: 'Намсан цамхаг, Ганнам өндөр барилгууд, Мёндун гудамж, Хан мөрөн ба шөнийн неон амьдрал.',
      pedCount: 34,
      trafficCount: 15,
      waterSide: 'south', // z > 124
      waterColor: 0x0b3954,
      groundColor: 0x1a2030,
      skyDay: 0x62a8e5,
      skyDusk: 0xd96b70,
      skyNight: 0x070b18,
      neonDensity: 1.0,
      palmTrees: false,
      districts: [
        { name: '남산 NAMSAN', x: 0, z: -81 },
        { name: '명동 MYEONGDONG', x: 0, z: 0 },
        { name: '홍대 HONGDAE', x: -81, z: 0 },
        { name: '강남 GANGNAM', x: 81, z: 27 },
        { name: '한강 HAN RIVER', x: 0, z: 118 },
      ],
      signs: ['명동 24시', '치킨 & 맥주', '노래방 LIVE', 'KTX 서울역', '포장마차', '강남 클럽', '편의점 GS'],
      hubs: [
        { x: -81, z: -81, label: 'KTX SEOUL STATION', target: 'busan', mode: 'KTX EXPRESS' },
        { x: 81, z: -81, label: 'INCHEON EXPRESSWAY', target: 'incheon', mode: 'EXPRESSWAY' },
      ],
    },
    busan: {
      id: 'busan',
      name: 'BUSAN',
      kr: '부산 해운대 • 광안리 • 자갈치',
      badge: '부산 BUSAN',
      radio: 'BUSAN SEA FM',
      travelMode: 'KTX • 2h 15m',
      lat: 35.1587,
      lng: 129.1604,
      fare: 15000,
      desc: 'Хэундэ элсэн эрэг, Гванган гүүр, Жагалчи далайн зах, боомтын усан онгоц ба далайн сэвшээ салхи.',
      pedCount: 30,
      trafficCount: 13,
      waterSide: 'south',
      hasBeach: true,
      waterColor: 0x0c6b94,
      groundColor: 0x222938,
      skyDay: 0x4fb4f2,
      skyDusk: 0xf4845f,
      skyNight: 0x081326,
      neonDensity: 0.85,
      palmTrees: true,
      districts: [
        { name: '서면 SEOMYEON', x: 0, z: -54 },
        { name: '센텀 CENTUM CITY', x: 81, z: -27 },
        { name: '자갈치 JAGALCHI', x: -81, z: 54 },
        { name: '해운대 HAEUNDAE', x: 54, z: 108 },
        { name: '광안리 GWANGALLI', x: -27, z: 108 },
      ],
      signs: ['해운대 횟집', '부산 어묵', '밀면 맛집', '광안대교', '자갈치 시장', '마린시티', '서면 카페'],
      hubs: [
        { x: -81, z: -81, label: 'KTX BUSAN STATION', target: 'seoul', mode: 'KTX EXPRESS' },
        { x: 81, z: 81, label: 'BUSAN PORT FERRY', target: 'jeju', mode: 'CAR FERRY' },
      ],
    },
    incheon: {
      id: 'incheon',
      name: 'INCHEON',
      kr: '인천 송도 • 차이나타운 • 공항',
      badge: '인천 INCHEON',
      radio: 'INCHEON AIR FM',
      travelMode: 'EXPRESSWAY • 50m',
      lat: 37.3925,
      lng: 126.6388,
      fare: 8000,
      desc: 'Сондуугийн футуристик шилэн цамхгууд, Чайнатаун улаан дэнлүү ба Инчеон нисэх онгоцны буудал.',
      pedCount: 28,
      trafficCount: 14,
      waterSide: 'west', // x < -124
      waterColor: 0x124e66,
      groundColor: 0x1d2533,
      skyDay: 0x6ec1e4,
      skyDusk: 0xe07a5f,
      skyNight: 0x060d1a,
      neonDensity: 0.9,
      palmTrees: false,
      districts: [
        { name: '차이나타운 CHINATOWN', x: -27, z: -81 },
        { name: '송도 SONGDO', x: 54, z: 0 },
        { name: '인천공항 AIRPORT', x: -108, z: 27 },
        { name: '월미도 WOLMIDO', x: -81, z: 81 },
        { name: '부평 BUPYEONG', x: 81, z: 81 },
      ],
      signs: ['짜장면 원조', '송도 센트럴', '면세점 DUTY FREE', '인천국제공항', '월미도 테마', '24시 카페', '치맥'],
      hubs: [
        { x: 81, z: -81, label: 'SEOUL TOLLGATE', target: 'seoul', mode: 'EXPRESSWAY' },
        { x: -81, z: 54, label: 'INCHEON TERMINAL', target: 'jeju', mode: 'KOREAN AIR' },
      ],
    },
    jeju: {
      id: 'jeju',
      name: 'JEJU',
      kr: '제주 한라산 • 애월 • 서귀포',
      badge: '제주 JEJU',
      radio: 'JEJU ISLAND FM',
      travelMode: 'FLIGHT • 1h 05m',
      lat: 33.5102,
      lng: 126.5219,
      fare: 25000,
      desc: 'Халласан уул, чулуун ханатай гудамж, далдуу мод, жүржийн төгөл ба далайн эргийн амралтын хот.',
      pedCount: 24,
      trafficCount: 10,
      waterSide: 'south',
      hasBeach: true,
      waterColor: 0x008b99,
      groundColor: 0x263529,
      skyDay: 0x5cc8ff,
      skyDusk: 0xff8c61,
      skyNight: 0x071624,
      neonDensity: 0.65,
      palmTrees: true,
      districts: [
        { name: '한라산 HALLASAN', x: 0, z: -90 },
        { name: '제주시 JEJU CITY', x: 0, z: 0 },
        { name: '애월 AEWOL CAFE', x: -81, z: 27 },
        { name: '서귀포 SEOGWIPO', x: 54, z: 81 },
        { name: '성산 SEONGSAN', x: 81, z: -27 },
      ],
      signs: ['제주 흑돼지', '한라봉 주스', '애월 오션뷰', '서귀포 포구', '돌하르방', '감귤 농장', '게스트하우스'],
      hubs: [
        { x: -81, z: -54, label: 'JEJU AIRPORT', target: 'seoul', mode: 'KOREAN AIR' },
        { x: 81, z: 81, label: 'JEJU HARBOR', target: 'busan', mode: 'CAR FERRY' },
      ],
    },
  };

  SV.CITY_ORDER = ['seoul', 'busan', 'incheon', 'jeju'];

  SV.PED_OUTFITS = [
    { name: 'Office Worker', shirt: 0xe2e8f0, pants: 0x1e293b, hasBag: true },
    { name: 'Student', shirt: 0x3b82f6, pants: 0x1f2937, hasBackpack: true },
    { name: 'Tourist', shirt: 0xf59e0b, pants: 0x78350f, hasBackpack: true },
    { name: 'Street Style', shirt: 0xff2e93, pants: 0x111827, hasBag: false },
    { name: 'Courier', shirt: 0x10b981, pants: 0x064e3b, hasBackpack: true },
    { name: 'Local', shirt: 0xa855f7, pants: 0x334155, hasBag: true },
  ];
})();
