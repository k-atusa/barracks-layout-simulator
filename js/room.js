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

    // Bathroom floor (bottom-left)
    const bathWidth = this.partitionX - (-this.width / 2);
    const bathFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(bathWidth, this.partitionDepth),
      new THREE.MeshLambertMaterial({ color: 0x9E9E8A, side: THREE.DoubleSide })
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
    const tileSize = 0.5;
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
    // with dressing room door opening near partitionX
    const dressDoorX = this.partitionX + 0.05 + this.dressDoorWidth / 2;

    // Left of dressing door
    const hSegL = dressDoorX - this.dressDoorWidth / 2 - this.partitionX;
    if (hSegL > 0.01) {
      const w = this._box(hSegL, this.height, t, wm);
      w.position.set(this.partitionX + hSegL / 2, this.height / 2, partZ);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Right of dressing door to right wall
    const hSegR = this.width / 2 - (dressDoorX + this.dressDoorWidth / 2);
    if (hSegR > 0) {
      const w = this._box(hSegR, this.height, t, wm);
      w.position.set(this.width / 2 - hSegR / 2, this.height / 2, partZ);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Above dressing door
    if (aboveDoor > 0) {
      const w = this._box(this.dressDoorWidth, aboveDoor, t, wm);
      w.position.set(dressDoorX, doorH + aboveDoor / 2, partZ);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // ===== VERTICAL PARTITION (from partZ down to front wall, at partitionX) =====
    // with bathroom door opening
    const bathDoorStart = partZ + 0.215; // 215mm below partition line
    const bathDoorEnd = bathDoorStart + this.bathDoorWidth;

    // Above bathroom door (partZ to door start)
    const vSegTop = bathDoorStart - partZ;
    if (vSegTop > 0.01) {
      const w = this._box(t, this.height, vSegTop, wm);
      w.position.set(this.partitionX, this.height / 2, partZ + vSegTop / 2);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Below bathroom door (door end to front wall)
    const vSegBot = (this.depth / 2) - bathDoorEnd;
    if (vSegBot > 0) {
      const w = this._box(t, this.height, vSegBot, wm);
      w.position.set(this.partitionX, this.height / 2, bathDoorEnd + vSegBot / 2);
      this.group.add(w); this.walls.push(w); this.interiorWalls.push(w);
    }

    // Above bathroom door opening
    if (aboveDoor > 0) {
      const w = this._box(t, aboveDoor, this.bathDoorWidth, wm);
      w.position.set(this.partitionX, doorH + aboveDoor / 2, bathDoorStart + this.bathDoorWidth / 2);
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
}

// 2D room drawing matching the Humphreys floor plan
export function draw2DRoom(ctx, width, depth, scale, offsetX, offsetY) {
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

  // Bathroom floor (bottom-left)
  const bathW = partX - (-W / 2);
  ctx.fillStyle = '#9E9E8A';
  ctx.fillRect(-W / 2, -D / 2 + mainD, bathW, partitionDepth);

  // Dressing room floor (bottom-right)
  const dressRoomW = W / 2 - partX;
  ctx.fillStyle = '#7A7A6A';
  ctx.fillRect(partX, -D / 2 + mainD, dressRoomW, partitionDepth);

  // --- Grid (main room only) ---
  ctx.strokeStyle = '#6B6B5A';
  ctx.lineWidth = 0.5;
  const gridSize = 0.5 * scale;

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

  // --- Outer walls ---
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 8;
  const wo = ctx.lineWidth / 2;

  // Full outer rectangle
  ctx.beginPath();
  ctx.rect(-W / 2 - wo, -D / 2 - wo, W + wo * 2, D + wo * 2);
  ctx.stroke();

  // --- Interior partition walls ---
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 6;

  const partLineZ = -D / 2 + mainD;

  // Horizontal partition: from partX to right wall, with dressing room door
  const dressDoorW = 0.8 * scale;
  const dressDoorXpos = partX + 0.05 * scale + dressDoorW / 2;

  // Left of dressing door
  ctx.beginPath();
  ctx.moveTo(partX, partLineZ);
  ctx.lineTo(dressDoorXpos - dressDoorW / 2, partLineZ);
  ctx.stroke();

  // Right of dressing door
  ctx.beginPath();
  ctx.moveTo(dressDoorXpos + dressDoorW / 2, partLineZ);
  ctx.lineTo(W / 2, partLineZ);
  ctx.stroke();

  // Vertical partition: from partLine down to front wall, with bathroom door
  const bathDoorW = 0.79 * scale;
  const bathDoorTop = partLineZ + 0.215 * scale;
  const bathDoorBottom = bathDoorTop + bathDoorW;

  // Above bathroom door
  ctx.beginPath();
  ctx.moveTo(partX, partLineZ);
  ctx.lineTo(partX, bathDoorTop);
  ctx.stroke();

  // Below bathroom door
  ctx.beginPath();
  ctx.moveTo(partX, bathDoorBottom);
  ctx.lineTo(partX, D / 2);
  ctx.stroke();

  // --- Entry door (front/bottom wall) ---
  const entryDoorW = 1.0 * scale;
  const entryDoorXpos = (-width / 2 + 0.08 + 0.5) * scale;
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(entryDoorXpos - entryDoorW / 2, D / 2 - 4, entryDoorW, 12);

  // Door swing arc
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(entryDoorXpos + entryDoorW / 2, D / 2, entryDoorW, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Window (back wall, top) ---
  const winW = 1.17 * scale;
  const winXpos = (-width / 2 + 0.63 + 1.17 / 2) * scale;
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(winXpos - winW / 2, -D / 2 - 4, winW, 8);

  // --- Bathroom door swing arc ---
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(partX, bathDoorTop, bathDoorW, 0, Math.PI / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Dressing room door swing arc ---
  ctx.beginPath();
  ctx.arc(dressDoorXpos - dressDoorW / 2, partLineZ, dressDoorW, Math.PI / 2, 0, true);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Labels ---
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';

  // Main room
  ctx.fillText('Main Room', 0, -D / 2 + mainD / 2);
  ctx.fillText(width.toFixed(1) + 'm × ' + (depth - 1.5).toFixed(2) + 'm', 0, -D / 2 + mainD / 2 + 15);

  // Dressing room
  const dressCX = (partX + W / 2) / 2;
  ctx.fillText('Dressing Room', dressCX, -D / 2 + mainD + partitionDepth / 2);

  // Bathroom
  const bathCX = (-W / 2 + partX) / 2;
  ctx.fillText('Bathroom', bathCX, -D / 2 + mainD + partitionDepth / 2);

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
