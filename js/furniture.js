// Furniture definitions and factory
export const FURNITURE_TYPES = {
  'single-bed': {
    name: 'Single Bed',
    nameEn: 'Single Bed',
    width: 1.0,      // meters
    depth: 2.15,
    height: 0.7,
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
    width: 1.06,
    depth: 0.6,
    height: 0.78,
    color: 0x1f1f1f,
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
    width: 0.76,
    depth: 0.6,
    height: 1.1,
    color: 0x1f1f1f,
    icon: '🗄️',
    drawerCount: 5
  },
  'bed-drawer-2': {
    name: '2-Drawer Bedside Chest',
    nameEn: '2-Drawer Bedside Chest',
    width: 0.5,
    depth: 0.5,
    height: 0.62,
    color: 0x1f1f1f,
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
    case 'trash-bin':
      addTrashBinDetails(group, config, THREE);
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

  // Store original colors for collision reset
  group.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(mat => {
      if (!mat || !mat.color) return;
      child.userData = child.userData || {};
      if (!child.userData.originalColor) {
        child.userData.originalColor = mat.color.getHex();
      }
    });
  });

  return group;
}

function addBedDetails(group, config, THREE) {
  const railThickness = 0.04;
  const postThickness = 0.05;
  const mattressHeight = 0.15;
  const mattressTopY = 0.62; // roughly 2-drawer chest height
  const mattressBaseY = mattressTopY - mattressHeight;
  const frameY = mattressBaseY - 0.02;
  const headboardHeight = Math.max(config.height + 0.2, 0.9);
  const footboardHeight = Math.max(config.height * 0.9, 0.7);

  // Remove solid base and create metal frame
  const base = group.children[0];
  group.remove(base);

  const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });

  // Side rails
  const sideRailGeom = new THREE.BoxGeometry(railThickness, railThickness, config.depth - 0.02);
  const leftRail = new THREE.Mesh(sideRailGeom, metalMaterial);
  leftRail.position.set(-config.width / 2 + railThickness / 2, frameY, 0);
  leftRail.castShadow = true;
  group.add(leftRail);

  const rightRail = new THREE.Mesh(sideRailGeom, metalMaterial);
  rightRail.position.set(config.width / 2 - railThickness / 2, frameY, 0);
  rightRail.castShadow = true;
  group.add(rightRail);

  // End rails
  const endRailGeom = new THREE.BoxGeometry(config.width - 0.02, railThickness, railThickness);
  const headRail = new THREE.Mesh(endRailGeom, metalMaterial);
  headRail.position.set(0, frameY, -config.depth / 2 + railThickness / 2);
  headRail.castShadow = true;
  group.add(headRail);

  const footRail = new THREE.Mesh(endRailGeom, metalMaterial);
  footRail.position.set(0, frameY, config.depth / 2 - railThickness / 2);
  footRail.castShadow = true;
  group.add(footRail);

  // Posts
  const postGeom = new THREE.BoxGeometry(postThickness, headboardHeight, postThickness);
  const postPositions = [
    [-config.width / 2 + postThickness / 2, headboardHeight / 2, -config.depth / 2 + postThickness / 2],
    [config.width / 2 - postThickness / 2, headboardHeight / 2, -config.depth / 2 + postThickness / 2],
  ];
  postPositions.forEach((p) => {
    const post = new THREE.Mesh(postGeom, metalMaterial);
    post.position.set(...p);
    post.castShadow = true;
    group.add(post);
  });

  const footPostGeom = new THREE.BoxGeometry(postThickness, footboardHeight, postThickness);
  const footPostPositions = [
    [-config.width / 2 + postThickness / 2, footboardHeight / 2, config.depth / 2 - postThickness / 2],
    [config.width / 2 - postThickness / 2, footboardHeight / 2, config.depth / 2 - postThickness / 2],
  ];
  footPostPositions.forEach((p) => {
    const post = new THREE.Mesh(footPostGeom, metalMaterial);
    post.position.set(...p);
    post.castShadow = true;
    group.add(post);
  });

  // Head/foot horizontal top rails (no slats)
  const headTopRail = new THREE.Mesh(endRailGeom, metalMaterial);
  headTopRail.position.set(0, headboardHeight - railThickness / 2, -config.depth / 2 + railThickness / 2);
  headTopRail.castShadow = true;
  group.add(headTopRail);

  const footTopRail = new THREE.Mesh(endRailGeom, metalMaterial);
  footTopRail.position.set(0, footboardHeight - railThickness / 2, config.depth / 2 - railThickness / 2);
  footTopRail.castShadow = true;
  group.add(footTopRail);

  // Mattress
  const mattressGeometry = new THREE.BoxGeometry(config.width - 0.05, mattressHeight, config.depth - 0.1);
  const mattressMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
  const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  mattress.position.y = mattressBaseY + mattressHeight / 2;
  mattress.castShadow = true;
  group.add(mattress);

  // Pillow
  const pillowGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3);
  const pillowMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
  pillow.position.set(0, mattressBaseY + mattressHeight + 0.05, -config.depth / 2 + 0.25);
  pillow.castShadow = true;
  group.add(pillow);
}

function addDeskDetails(group, config, THREE) {
  const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0xD7C3A1 });

  // Metal body: right pedestal + panels (left space open for legs)
  const pedestalWidth = config.width * 0.35;
  const pedestalX = config.width / 2 - pedestalWidth / 2;

  group.children[0].geometry.dispose();
  group.children[0].geometry = new THREE.BoxGeometry(pedestalWidth, config.height, config.depth);
  group.children[0].position.set(pedestalX, config.height / 2, 0);
  group.children[0].material = metalMaterial;

  // Left side panel
  const sideThickness = 0.04;
  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(sideThickness, config.height, config.depth),
    metalMaterial
  );
  leftPanel.position.set(-config.width / 2 + sideThickness / 2, config.height / 2, 0);
  leftPanel.castShadow = true;
  group.add(leftPanel);

  // Back panel (thin)
  const backThickness = 0.03;
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(config.width, config.height * 0.9, backThickness),
    metalMaterial
  );
  backPanel.position.set(0, (config.height * 0.9) / 2, -config.depth / 2 + backThickness / 2);
  backPanel.castShadow = true;
  group.add(backPanel);

  // Wood top
  const topThickness = 0.03;
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(config.width + 0.01, topThickness, config.depth + 0.01),
    woodMaterial
  );
  top.position.y = config.height + topThickness / 2;
  top.castShadow = true;
  group.add(top);

  // Right-side 3-drawer stack (fronts)
  const drawerStackWidth = pedestalWidth;
  const drawerStackX = pedestalX;
  const drawerFrontThickness = 0.02;
  const drawerGap = 0.02;
  const drawerAreaHeight = config.height - 0.06;
  const drawerHeight = (drawerAreaHeight - drawerGap * 2) / 3;

  for (let i = 0; i < 3; i++) {
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(drawerStackWidth - 0.02, drawerHeight - 0.02, drawerFrontThickness),
      metalMaterial
    );
    const y = 0.04 + drawerHeight / 2 + i * (drawerHeight + drawerGap);
    drawer.position.set(drawerStackX, y, config.depth / 2 + drawerFrontThickness / 2 + 0.005);
    group.add(drawer);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(drawerStackWidth * 0.4, 0.015, 0.02),
      new THREE.MeshLambertMaterial({ color: 0xBDBDBD })
    );
    handle.position.set(drawerStackX, y, config.depth / 2 + drawerFrontThickness + 0.02);
    group.add(handle);
  }
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
  const isMetalStyle = group.userData?.type === 'dresser-5' || group.userData?.type === 'bed-drawer-2';
  const drawerMaterial = new THREE.MeshLambertMaterial({ color: isMetalStyle ? 0x1f1f1f : 0x5D4037 });
  const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });

  // Metal body + light wood top for 2-drawer and 5-drawer
  if (isMetalStyle && group.children[0]) {
    group.children[0].material.color.setHex(0x1f1f1f);
    const topThickness = 0.03;
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0xD7C3A1 });
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(config.width + 0.01, topThickness, config.depth + 0.01),
      topMaterial
    );
    top.position.set(0, config.height + topThickness / 2, 0);
    top.castShadow = true;
    group.add(top);
  }

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

function addTrashBinDetails(group, config, THREE) {
  const bodyColor = 0x8fa3a6;
  const lidColor = 0xdcdcdc;
  const trimColor = 0x9aa1a3;
  const pedalColor = 0xb0b0b0;
  const darkTrim = 0x1f1f1f;

  const bodyRadius = Math.min(config.width, config.depth) / 2 - 0.01;
  const bodyHeight = config.height * 0.78;
  const lidHeight = config.height * 0.12;
  const topRimHeight = config.height * 0.04;
  const baseRimHeight = config.height * 0.03;

  // Replace main body with cylinder
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 32);
  group.children[0].geometry.dispose();
  group.children[0].geometry = bodyGeo;
  group.children[0].material = bodyMat;
  group.children[0].position.set(0, bodyHeight / 2, 0);

  // Top rim (metal ring)
  const rimGeo = new THREE.CylinderGeometry(bodyRadius + 0.01, bodyRadius + 0.01, topRimHeight, 32, 1, true);
  const rimMat = new THREE.MeshLambertMaterial({ color: trimColor });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(0, bodyHeight + topRimHeight / 2, 0);
  group.add(rim);

  // Lid
  const lidGeo = new THREE.CylinderGeometry(bodyRadius + 0.02, bodyRadius + 0.02, lidHeight, 32);
  const lidMat = new THREE.MeshLambertMaterial({ color: lidColor });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.set(0, bodyHeight + topRimHeight + lidHeight / 2, 0);
  group.add(lid);

  // Lid edge trim
  const lidEdgeGeo = new THREE.CylinderGeometry(bodyRadius + 0.025, bodyRadius + 0.025, 0.01, 32);
  const lidEdge = new THREE.Mesh(lidEdgeGeo, new THREE.MeshLambertMaterial({ color: darkTrim }));
  lidEdge.position.set(0, bodyHeight + topRimHeight + lidHeight + 0.005, 0);
  group.add(lidEdge);

  // Base rim
  const baseGeo = new THREE.CylinderGeometry(bodyRadius + 0.015, bodyRadius + 0.015, baseRimHeight, 32);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({ color: darkTrim }));
  base.position.set(0, baseRimHeight / 2, 0);
  group.add(base);

  // Pedal
  const pedalBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
    new THREE.MeshLambertMaterial({ color: darkTrim })
  );
  pedalBase.position.set(0, 0.01, bodyRadius + 0.07);
  pedalBase.rotation.x = Math.PI / 2;
  group.add(pedalBase);

  const pedal = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.02, 0.14),
    new THREE.MeshLambertMaterial({ color: pedalColor })
  );
  pedal.position.set(0, 0.03, bodyRadius + 0.11);
  pedal.rotation.x = -Math.PI / 8;
  group.add(pedal);

  // Hinge/handle on back
  const hinge = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.08, 0.04),
    new THREE.MeshLambertMaterial({ color: darkTrim })
  );
  hinge.position.set(bodyRadius + 0.02, bodyHeight + topRimHeight + lidHeight / 2, 0);
  group.add(hinge);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.12, 0.08),
    new THREE.MeshLambertMaterial({ color: darkTrim })
  );
  handle.position.set(bodyRadius + 0.05, bodyHeight + topRimHeight + lidHeight / 2, 0);
  group.add(handle);
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
