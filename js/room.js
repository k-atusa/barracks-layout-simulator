// Room creation and management
// Based on USAG Humphreys Enlisted Barracks Floor Plan
// Total: 3500mm (W) x 5050mm (D)
// Main room: 3500mm x 3550mm (upper)
// Bottom-left: Bathroom ~1160mm x 1500mm
// Bottom-right: Dressing Room ~2340mm x 1500mm

export class Room {
  constructor(width, depth, height, THREE) {
    // Overall outer dimensions
    this.width = width;     // 3.5m
    this.depth = depth;     // 5.05m
    this.height = height;   // 2.8m
    this.THREE = THREE;
    this.group = new THREE.Group();
    this.grid = null;
    this.walls = [];
    this.interiorWalls = [];

    // Partition dimensions from floor plan
    this.partitionDepth = 1.5;                            // bottom 1500mm
    this.partitionX = -this.width / 2 + 1.16;            // vertical partition at 1160mm from left
    this.mainRoomDepth = this.depth - this.partitionDepth;// 3550mm

    // Window: 1170mm wide, 630mm from left edge on back wall
    this.windowWidth = 1.17;
    this.windowX = -this.width / 2 + 0.63 + this.windowWidth / 2;

    // Entry door: 1000mm wide, at bottom of bathroom area
    this.entryDoorWidth = 1.0;
    this.entryDoorX = -this.width / 2 + 0.08 + this.entryDoorWidth / 2;

    // Bathroom door: ~790mm opening in vertical partition
    this.bathDoorWidth = 0.79;

    // Dressing room door: ~800mm opening in horizontal partition
    this.dressDoorWidth = 0.8;

    this.create();
  }

  create() {
    this.createFloor();
    this.createOuterWalls();
    this.createInteriorWalls();
    this.createWindow();
    this.createEntryDoor();
  }

  createFloor() {
    const THREE = this.THREE;

    // Main room floor (upper area)
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.mainRoomDepth),
      new THREE.MeshLambertMaterial({ color: 0x8B8B7A, side: THREE.DoubleSide })
    );
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.set(0, 0, -this.depth / 2 + this.mainRoomDepth / 2);
    mainFloor.receiveShadow = true;
    mainFloor.name = 'floor';
    this.group.add(mainFloor);

    // Bottom-left floor (same as main room)
    const bathWidth = this.partitionX - (-this.width / 2);
    const bathFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(bathWidth, this.partitionDepth),
      new THREE.MeshLambertMaterial({ color: 0x8B8B7A, side: THREE.DoubleSide })
    );
    bathFloor.rotation.x = -Math.PI / 2;
    bathFloor.position.set(
      -this.width / 2 + bathWidth / 2,
      0.001,
      this.depth / 2 - this.partitionDepth / 2
    );
    bathFloor.receiveShadow = true;
    this.group.add(bathFloor);

    // Dressing room floor (bottom-right)
    const dressWidth = this.width / 2 - this.partitionX;
    const dressFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(dressWidth, this.partitionDepth),
      new THREE.MeshLambertMaterial({ color: 0x7A7A6A, side: THREE.DoubleSide })
    );
    dressFloor.rotation.x = -Math.PI / 2;
    dressFloor.position.set(
      this.partitionX + dressWidth / 2,
      0.001,
      this.depth / 2 - this.partitionDepth / 2
    );
    dressFloor.receiveShadow = true;
    this.group.add(dressFloor);

    // Grid — main room area only
    const tileSize = 0.1;
    const linesMat = new THREE.LineBasicMaterial({ color: 0x6B6B5A, transparent: true, opacity: 0.3 });
    const gridGroup = new THREE.Group();
    gridGroup.name = 'grid';

    const gL = -this.width / 2;
    const gR = this.width / 2;
    const gT = -this.depth / 2;
    const gB = -this.depth / 2 + this.mainRoomDepth;

    const tilesX = Math.floor(this.width / tileSize);
    const tilesZ = Math.floor(this.mainRoomDepth / tileSize);

    for (let i = 0; i <= tilesX; i++) {
      const x = gL + i * tileSize;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.002, gT),
        new THREE.Vector3(x, 0.002, gB)
      ]);
      gridGroup.add(new THREE.Line(geo, linesMat));
    }
    for (let i = 0; i <= tilesZ; i++) {
      const z = gT + i * tileSize;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(gL, 0.002, z),
        new THREE.Vector3(gR, 0.002, z)
      ]);
      gridGroup.add(new THREE.Line(geo, linesMat));
    }

    this.grid = gridGroup;
    this.group.add(gridGroup);
  }

  createOuterWalls() {
    const THREE = this.THREE;
    const wm = new THREE.MeshLambertMaterial({ color: 0xE8E4D9, side: THREE.DoubleSide });
    const t = 0.1;  // wall thickness
    const o = t;     // offset outside grid

    // ===== BACK WALL (top, -Z) — with window opening =====
    const winLeft = this.windowX - this.windowWidth / 2;
    const winRight = this.windowX + this.windowWidth / 2;
    const winH = 1.0;
    const winY = 1.2;

    // Left segment of back wall (left edge to window)
    const blw = winLeft - (-this.width / 2);
    if (blw > 0) {
      const w = this._box(blw, this.height, t, wm);
      w.position.set(-this.width / 2 + blw / 2, this.height / 2, -this.depth / 2 - o);
      this.group.add(w); this.walls.push(w);
    }
    // Right segment of back wall (window to right edge)
    const brw = this.width / 2 - winRight;
    if (brw > 0) {
      const w = this._box(brw, this.height, t, wm);
      w.position.set(this.width / 2 - brw / 2, this.height / 2, -this.depth / 2 - o);
      this.group.add(w); this.walls.push(w);
    }
    // Above window
    const aboveWinH = this.height - winY - winH;
    if (aboveWinH > 0) {
      const w = this._box(this.windowWidth, aboveWinH, t, wm);
      w.position.set(this.windowX, winY + winH + aboveWinH / 2, -this.depth / 2 - o);
      this.group.add(w); this.walls.push(w);
    }
    // Below window
    if (winY > 0) {
      const w = this._box(this.windowWidth, winY, t, wm);
      w.position.set(this.windowX, winY / 2, -this.depth / 2 - o);
      this.group.add(w); this.walls.push(w);
    }

    // ===== LEFT WALL (-X) — full depth =====
    const lw = this._box(t, this.height, this.depth, wm);
    lw.position.set(-this.width / 2 - o, this.height / 2, 0);
    this.group.add(lw); this.walls.push(lw);

    // ===== RIGHT WALL (+X) — full depth =====
    const rw = this._box(t, this.height, this.depth, wm);
    rw.position.set(this.width / 2 + o, this.height / 2, 0);
    this.group.add(rw); this.walls.push(rw);

    // ===== FRONT WALL (bottom, +Z) — with entry door opening =====
    const frontZ = this.depth / 2 + o;
    const doorLeft = this.entryDoorX - this.entryDoorWidth / 2;
    const doorRight = this.entryDoorX + this.entryDoorWidth / 2;
    const doorH = 2.1;

    // Left of door
    const flw = doorLeft - (-this.width / 2);
    if (flw > 0) {
      const w = this._box(flw, this.height, t, wm);
      w.position.set(-this.width / 2 + flw / 2, this.height / 2, frontZ);
      this.group.add(w); this.walls.push(w);
    }
    // Right of door
    const frw = this.width / 2 - doorRight;
    if (frw > 0) {
      const w = this._box(frw, this.height, t, wm);
      w.position.set(this.width / 2 - frw / 2, this.height / 2, frontZ);
      this.group.add(w); this.walls.push(w);
    }
    // Above door
    const aboveDoorH = this.height - doorH;
    if (aboveDoorH > 0) {
      const w = this._box(this.entryDoorWidth, aboveDoorH, t, wm);
      w.position.set(this.entryDoorX, doorH + aboveDoorH / 2, frontZ);
      this.group.add(w); this.walls.push(w);
    }
  }

  createInteriorWalls() {
    const THREE = this.THREE;
    const wm = new THREE.MeshLambertMaterial({ color: 0xD5D0C5, side: THREE.DoubleSide });
    const t = 0.08; // interior wall thickness

    const partZ = this.depth / 2 - this.partitionDepth; // Z where main room meets bottom rooms
    const doorH = 2.1;
    const aboveDoor = this.height - doorH;

    // ===== HORIZONTAL PARTITION (from partitionX to right wall, at partZ) =====
    // solid wall (no top door opening)
    const hSeg = this.width / 2 - this.partitionX;
    if (hSeg > 0) {
      const w = this._box(hSeg, this.height, t, wm);
      w.position.set(this.partitionX + hSeg / 2, this.height / 2, partZ);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // ===== VERTICAL PARTITION (from partZ down to front wall, at partitionX) =====
    // with dressing room door opening on the left side
    const sideDoorWidth = this.dressDoorWidth;
    const sideDoorStart = partZ + 0.215; // 215mm below partition line
    const sideDoorEnd = sideDoorStart + sideDoorWidth;

    // Above bathroom door (partZ to door start)
    const vSegTop = sideDoorStart - partZ;
    if (vSegTop > 0.01) {
      const w = this._box(t, this.height, vSegTop, wm);
      w.position.set(this.partitionX, this.height / 2, partZ + vSegTop / 2);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Below bathroom door (door end to front wall)
    const vSegBot = (this.depth / 2) - sideDoorEnd;
    if (vSegBot > 0) {
      const w = this._box(t, this.height, vSegBot, wm);
      w.position.set(this.partitionX, this.height / 2, sideDoorEnd + vSegBot / 2);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Above door opening
    if (aboveDoor > 0) {
      const w = this._box(t, aboveDoor, sideDoorWidth, wm);
      w.position.set(this.partitionX, doorH + aboveDoor / 2, sideDoorStart + sideDoorWidth / 2);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }
  }

  createWindow() {
    const THREE = this.THREE;
    const winW = this.windowWidth;
    const winH = 1.0;
    const winY = 1.2;

    // Glass
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    glass.position.set(this.windowX, winY + winH / 2, -this.depth / 2 + 0.01);
    this.group.add(glass);

    // Frame
    const fm = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const ft = 0.05;

    const topF = new THREE.Mesh(new THREE.BoxGeometry(winW + ft * 2, ft, ft), fm);
    topF.position.set(this.windowX, winY + winH, -this.depth / 2 + 0.02);
    this.group.add(topF);

    const botF = new THREE.Mesh(new THREE.BoxGeometry(winW + ft * 2, ft, ft), fm);
    botF.position.set(this.windowX, winY, -this.depth / 2 + 0.02);
    this.group.add(botF);

    const lF = new THREE.Mesh(new THREE.BoxGeometry(ft, winH, ft), fm);
    lF.position.set(this.windowX - winW / 2 - ft / 2, winY + winH / 2, -this.depth / 2 + 0.02);
    this.group.add(lF);

    const rF = new THREE.Mesh(new THREE.BoxGeometry(ft, winH, ft), fm);
    rF.position.set(this.windowX + winW / 2 + ft / 2, winY + winH / 2, -this.depth / 2 + 0.02);
    this.group.add(rF);
  }

  createEntryDoor() {
    const THREE = this.THREE;
    const dw = this.entryDoorWidth;
    const dh = 2.1;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(dw - 0.1, dh - 0.05, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x6D4C41 })
    );
    door.position.set(this.entryDoorX, dh / 2, this.depth / 2 + 0.05);
    this.group.add(door);

    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xBDBDBD })
    );
    handle.position.set(this.entryDoorX + dw / 2 - 0.15, dh / 2, this.depth / 2 + 0.1);
    this.group.add(handle);
  }

  createGrid() {
    // Grid is created in createFloor
  }

  _box(w, h, d, material) {
    const mesh = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.receiveShadow = true;
    mesh.name = 'wall';
    return mesh;
  }

  showGrid(show) {
    if (this.grid) this.grid.visible = show;
  }

  showWalls(show) {
    this.walls.forEach(w => { w.visible = show; });
  }

  resize(width, depth, height) {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.group.remove(child);
    }
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.walls = [];
    this.interiorWalls = [];
    this.mainRoomDepth = this.depth - this.partitionDepth;
    this.create();
  }

  getFloorBounds() {
    // Return main room bounds (upper area) for furniture placement
    return {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minZ: -this.depth / 2,
      maxZ: -this.depth / 2 + this.mainRoomDepth
    };
  }

  constrainToUsableArea(x, z, config) {
    const halfW = config.width / 2;
    const halfD = config.depth / 2;

    const bounds = {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minZ: -this.depth / 2,
      maxZ: this.depth / 2
    };

    let clampedX = Math.max(bounds.minX + halfW, Math.min(bounds.maxX - halfW, x));
    let clampedZ = Math.max(bounds.minZ + halfD, Math.min(bounds.maxZ - halfD, z));

    // Exclude dressing room (bottom-right). Keep main room + bottom-left.
    const partZ = this.depth / 2 - this.partitionDepth;
    const maxLeftX = this.partitionX - halfW;
    const maxTopZ = partZ - halfD;

    if (clampedX > maxLeftX && clampedZ > maxTopZ) {
      const dx = clampedX - maxLeftX;
      const dz = clampedZ - maxTopZ;
      if (dx < dz) {
        clampedX = maxLeftX;
      } else {
        clampedZ = maxTopZ;
      }
    }

    return { x: clampedX, z: clampedZ };
  }
}

// 2D room drawing matching the Humphreys floor plan
export function draw2DRoom(ctx, width, depth, scale, offsetX, offsetY, highlightLines = null) {
  const W = width * scale;
  const D = depth * scale;
  const partitionDepth = 1.5 * scale;
  const mainD = D - partitionDepth;
  const partX = (-width / 2 + 1.16) * scale; // partition X in local coords

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // --- Floors ---
  // Main room floor
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(-W / 2, -D / 2, W, mainD);

  // Bottom-left floor (same as main room)
  const bathW = partX - (-W / 2);
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(-W / 2, -D / 2 + mainD, bathW, partitionDepth);

  // Dressing room floor (bottom-right)
  const dressRoomW = W / 2 - partX;
  ctx.fillStyle = '#7A7A6A';
  ctx.fillRect(partX, -D / 2 + mainD, dressRoomW, partitionDepth);

  // --- Grid (main room + bottom-left area) ---
  ctx.strokeStyle = '#6B6B5A';
  ctx.lineWidth = 0.5;
  const gridSize = 0.1 * scale;

  for (let x = -W / 2; x <= W / 2; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -D / 2);
    ctx.lineTo(x, -D / 2 + mainD);
    ctx.stroke();
  }
  for (let y = -D / 2; y <= -D / 2 + mainD; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-W / 2, y);
    ctx.lineTo(W / 2, y);
    ctx.stroke();
  }

  // Bottom-left area grid (same as main room)
  for (let x = -W / 2; x <= partX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -D / 2 + mainD);
    ctx.lineTo(x, D / 2);
    ctx.stroke();
  }
  for (let y = -D / 2 + mainD; y <= D / 2; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-W / 2, y);
    ctx.lineTo(partX, y);
    ctx.stroke();
  }

  // --- Highlight grid lines when corners touch ---
  if (highlightLines && (highlightLines.xLines?.size || highlightLines.zLines?.size)) {
    const gL = -W / 2;
    const gR = W / 2;
    const gT = -D / 2;
    const gB = -D / 2 + mainD;
    const xLines = highlightLines.xLines || new Set();
    const zLines = highlightLines.zLines || new Set();

    ctx.save();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1.5;

    xLines.forEach((i) => {
      const x = gL + i * gridSize;
      if (x < gL - 1 || x > gR + 1) return;

      // Main room segment
      ctx.beginPath();
      ctx.moveTo(x, gT);
      ctx.lineTo(x, gB);
      ctx.stroke();

      // Bottom-left segment only
      if (x <= partX + 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, gB);
        ctx.lineTo(x, D / 2);
        ctx.stroke();
      }
    });

    zLines.forEach((i) => {
      const z = gT + i * gridSize;
      if (z < gT - 1 || z > D / 2 + 1) return;

      // Main room rows
      if (z <= gB + 0.5) {
        ctx.beginPath();
        ctx.moveTo(gL, z);
        ctx.lineTo(gR, z);
        ctx.stroke();
      }

      // Bottom-left rows only
      if (z >= gB - 0.5) {
        ctx.beginPath();
        ctx.moveTo(gL, z);
        ctx.lineTo(partX, z);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // --- Outer walls (L-shaped perimeter, no line across left-bottom boundary) ---
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 8;
  const wo = ctx.lineWidth / 2;

  const partLineZ = -D / 2 + mainD;

  // Draw L-shaped outer perimeter as a single path
  ctx.beginPath();
  ctx.moveTo(-W / 2 - wo, -D / 2 - wo);       // top-left
  ctx.lineTo(W / 2 + wo, -D / 2 - wo);         // top-right
  ctx.lineTo(W / 2 + wo, D / 2 + wo);           // bottom-right
  ctx.lineTo(-W / 2 - wo, D / 2 + wo);           // bottom-left
  ctx.lineTo(-W / 2 - wo, -D / 2 - wo);         // back to top-left
  ctx.stroke();

  // --- Interior partition walls ---
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 6;

  // Horizontal partition: from partX to right wall (solid wall, dressing room top)
  ctx.beginPath();
  ctx.moveTo(partX, partLineZ);
  ctx.lineTo(W / 2, partLineZ);
  ctx.stroke();

  // Vertical partition: from partLine down to front wall, with dressing room door
  const sideDoorW = 0.8 * scale;
  const sideDoorTop = partLineZ + 0.215 * scale;
  const sideDoorBottom = sideDoorTop + sideDoorW;

  // Above door
  ctx.beginPath();
  ctx.moveTo(partX, partLineZ);
  ctx.lineTo(partX, sideDoorTop);
  ctx.stroke();

  // Below door
  ctx.beginPath();
  ctx.moveTo(partX, sideDoorBottom);
  ctx.lineTo(partX, D / 2);
  ctx.stroke();

  // --- Entry door (front/bottom wall) ---
  const entryDoorW = 1.0 * scale;
  const entryDoorXpos = (-width / 2 + 0.08 + 0.5) * scale;
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(entryDoorXpos - entryDoorW / 2, D / 2 - 4, entryDoorW, 12);

  // --- Window (back wall, top) ---
  const winW = 1.17 * scale;
  const winXpos = (-width / 2 + 0.63 + 1.17 / 2) * scale;
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(winXpos - winW / 2, -D / 2 - 4, winW, 8);

  // --- Dressing room door (left side opening) ---
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(partX - 4, sideDoorTop, 8, sideDoorW);

  // --- Dimension labels ---
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';

  // Width
  ctx.fillText(width + 'm', 0, D / 2 + 25);

  // Depth
  ctx.save();
  ctx.translate(-W / 2 - 25, 0);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(depth + 'm', 0, 0);
  ctx.restore();

  ctx.restore();
}
