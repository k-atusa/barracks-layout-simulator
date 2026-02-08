// Furniture definitions and factory
export const FURNITURE_TYPES = {
  'single-bed': {
    name: 'Single Bed',
    nameEn: 'Single Bed',
    width: 0.9,      // meters
    depth: 2.0,
    height: 0.5,
    color: 0x8B4513,
    icon: '🛏️'
  },
  'bunk-bed': {
    name: 'Bunk Bed',
    nameEn: 'Bunk Bed',
    width: 0.9,
    depth: 2.0,
    height: 1.8,
    color: 0x5D4037,
    icon: '🛏️'
  },
  'desk': {
    name: 'Desk',
    nameEn: 'Desk',
    width: 1.2,
    depth: 0.6,
    height: 0.75,
    color: 0x795548,
    icon: '🪑'
  },
  'chair': {
    name: 'Chair',
    nameEn: 'Chair',
    width: 0.45,
    depth: 0.45,
    height: 0.9,
    color: 0x424242,
    icon: '🪑'
  },
  'dresser': {
    name: 'Dresser',
    nameEn: 'Dresser',
    width: 0.8,
    depth: 0.45,
    height: 1.0,
    color: 0x6D4C41,
    icon: '🗄️',
    drawerCount: 4
  },
  'dresser-5': {
    name: '5-Drawer Dresser',
    nameEn: '5-Drawer Dresser',
    width: 0.8,
    depth: 0.45,
    height: 1.2,
    color: 0x6D4C41,
    icon: '🗄️',
    drawerCount: 5
  },
  'bed-drawer-2': {
    name: '2-Drawer Bedside Chest',
    nameEn: '2-Drawer Bedside Chest',
    width: 0.9,
    depth: 0.45,
    height: 0.5,
    color: 0x5D4037,
    icon: '🗄️',
    drawerCount: 2
  },
  'locker': {
    name: 'Locker',
    nameEn: 'Locker',
    width: 0.6,
    depth: 0.6,
    height: 1.8,
    color: 0x455A64,
    icon: '🚪'
  },
  'footlocker': {
    name: 'Footlocker',
    nameEn: 'Footlocker',
    width: 0.9,
    depth: 0.45,
    height: 0.4,
    color: 0x3E2723,
    icon: '📦'
  },
  'nightstand': {
    name: 'Nightstand',
    nameEn: 'Nightstand',
    width: 0.4,
    depth: 0.4,
    height: 0.5,
    color: 0x5D4037,
    icon: '🪟'
  },
  'trash-bin': {
    name: 'Trash Bin',
    nameEn: 'Trash Bin',
    width: 0.3,
    depth: 0.3,
    height: 0.4,
    color: 0x37474F,
    icon: '🗑️'
  }
};

// Create 3D furniture mesh
export function createFurnitureMesh(type, THREE) {
  const config = FURNITURE_TYPES[type];
  if (!config) return null;

  const group = new THREE.Group();
  group.userData = {
    type: type,
    config: config,
    isColliding: false
  };

  // Main body
  const geometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
  const material = new THREE.MeshLambertMaterial({
    color: config.color,
    transparent: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = config.height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add specific details based on type
  switch (type) {
    case 'single-bed':
      addBedDetails(group, config, THREE);
      break;
    case 'bunk-bed':
      addBunkBedDetails(group, config, THREE);
      break;
    case 'desk':
      addDeskDetails(group, config, THREE);
      break;
    case 'chair':
      addChairDetails(group, config, THREE);
      break;
    case 'locker':
      addLockerDetails(group, config, THREE);
      break;
    case 'dresser':
    case 'dresser-5':
    case 'bed-drawer-2':
      addDresserDetails(group, config, THREE);
      break;
  }

  // Add outline for selection
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0
  });
  const outlineGeometry = new THREE.BoxGeometry(
    config.width + 0.05,
    config.height + 0.05,
    config.depth + 0.05
  );
  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outlineMesh.position.y = config.height / 2;
  outlineMesh.name = 'outline';
  group.add(outlineMesh);

  return group;
}

function addBedDetails(group, config, THREE) {
  // Mattress
  const mattressGeometry = new THREE.BoxGeometry(config.width - 0.05, 0.15, config.depth - 0.1);
  const mattressMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
  const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  mattress.position.y = config.height + 0.075;
  mattress.castShadow = true;
  group.add(mattress);

  // Pillow
  const pillowGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3);
  const pillowMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
  pillow.position.set(0, config.height + 0.2, -config.depth / 2 + 0.25);
  pillow.castShadow = true;
  group.add(pillow);
}

function addBunkBedDetails(group, config, THREE) {
  // Lower mattress
  const mattressGeometry = new THREE.BoxGeometry(config.width - 0.05, 0.1, config.depth - 0.1);
  const mattressMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });

  const lowerMattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  lowerMattress.position.y = 0.4;
  lowerMattress.castShadow = true;
  group.add(lowerMattress);

  // Upper mattress
  const upperMattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  upperMattress.position.y = 1.2;
  upperMattress.castShadow = true;
  group.add(upperMattress);

  // Upper bed frame
  const frameGeometry = new THREE.BoxGeometry(config.width, 0.05, config.depth);
  const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
  const upperFrame = new THREE.Mesh(frameGeometry, frameMaterial);
  upperFrame.position.y = 1.1;
  group.add(upperFrame);

  // Ladder
  const ladderMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
  for (let i = 0; i < 4; i++) {
    const rung = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 0.3),
      ladderMaterial
    );
    rung.position.set(config.width / 2 - 0.1, 0.3 + i * 0.25, config.depth / 2 - 0.15);
    group.add(rung);
  }
}

function addDeskDetails(group, config, THREE) {
  // Desk legs
  const legGeometry = new THREE.BoxGeometry(0.05, config.height - 0.05, 0.05);
  const legMaterial = new THREE.MeshLambertMaterial({ color: 0x4E342E });

  const positions = [
    [-config.width / 2 + 0.05, (config.height - 0.05) / 2, -config.depth / 2 + 0.05],
    [config.width / 2 - 0.05, (config.height - 0.05) / 2, -config.depth / 2 + 0.05],
    [-config.width / 2 + 0.05, (config.height - 0.05) / 2, config.depth / 2 - 0.05],
    [config.width / 2 - 0.05, (config.height - 0.05) / 2, config.depth / 2 - 0.05]
  ];

  // Remove default box, add table top and legs
  group.children[0].geometry.dispose();
  group.children[0].geometry = new THREE.BoxGeometry(config.width, 0.05, config.depth);
  group.children[0].position.y = config.height - 0.025;

  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
  });
}

function addChairDetails(group, config, THREE) {
  const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x424242 });

  // Seat
  group.children[0].geometry.dispose();
  group.children[0].geometry = new THREE.BoxGeometry(config.width, 0.05, config.depth);
  group.children[0].position.y = 0.45;

  // Back
  const backGeometry = new THREE.BoxGeometry(config.width, 0.45, 0.05);
  const back = new THREE.Mesh(backGeometry, chairMaterial);
  back.position.set(0, 0.7, -config.depth / 2 + 0.025);
  back.castShadow = true;
  group.add(back);

  // Legs
  const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
  const legPositions = [
    [-config.width / 2 + 0.05, 0.225, -config.depth / 2 + 0.05],
    [config.width / 2 - 0.05, 0.225, -config.depth / 2 + 0.05],
    [-config.width / 2 + 0.05, 0.225, config.depth / 2 - 0.05],
    [config.width / 2 - 0.05, 0.225, config.depth / 2 - 0.05]
  ];

  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry, chairMaterial);
    leg.position.set(...pos);
    group.add(leg);
  });
}

function addLockerDetails(group, config, THREE) {
  // Door line
  const lineGeometry = new THREE.BoxGeometry(0.01, config.height - 0.1, 0.01);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x263238 });
  const line = new THREE.Mesh(lineGeometry, lineMaterial);
  line.position.set(0, config.height / 2, config.depth / 2 + 0.01);
  group.add(line);

  // Vents
  const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x37474F });
  for (let i = 0; i < 3; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(config.width - 0.1, 0.02, 0.01),
      ventMaterial
    );
    vent.position.set(0, 0.2 + i * 0.1, config.depth / 2 + 0.01);
    group.add(vent);
  }

  // Handle
  const handleGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.02);
  const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x212121 });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(config.width / 4, config.height / 2, config.depth / 2 + 0.02);
  group.add(handle);
}

function addDresserDetails(group, config, THREE) {
  const drawerMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
  const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });

  const drawerCount = config.drawerCount || 4;
  const drawerHeight = (config.height - 0.05) / drawerCount;

  for (let i = 0; i < drawerCount; i++) {
    // Drawer front
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(config.width - 0.02, drawerHeight - 0.02, 0.02),
      drawerMaterial
    );
    drawer.position.set(0, drawerHeight / 2 + i * drawerHeight, config.depth / 2 + 0.01);
    group.add(drawer);

    // Handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.02, 0.02),
      handleMaterial
    );
    handle.position.set(0, drawerHeight / 2 + i * drawerHeight, config.depth / 2 + 0.03);
    group.add(handle);
  }
}

// Create 2D representation of furniture
export function create2DFurniture(type, ctx, x, y, rotation, scale, isSelected, isColliding) {
  const config = FURNITURE_TYPES[type];
  if (!config) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const width = config.width * scale;
  const depth = config.depth * scale;

  // Draw furniture rectangle
  ctx.fillStyle = isColliding ? '#c0392b' : (isSelected ? '#f39c12' : `#${config.color.toString(16).padStart(6, '0')}`);
  ctx.strokeStyle = isSelected ? '#f1c40f' : '#333';
  ctx.lineWidth = isSelected ? 3 : 1;

  ctx.fillRect(-width / 2, -depth / 2, width, depth);
  ctx.strokeRect(-width / 2, -depth / 2, width, depth);

  // Draw label
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(10, scale * 0.1)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.name, 0, 0);

  // Draw dimensions
  ctx.font = `${Math.max(8, scale * 0.08)}px Arial`;
  ctx.fillStyle = '#ccc';
  ctx.fillText(`${config.width}x${config.depth}m`, 0, depth / 4);

  ctx.restore();
}
