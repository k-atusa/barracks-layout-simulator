// Room creation and management
export class Room {
  constructor(width, depth, height, THREE) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.THREE = THREE;
    this.group = new THREE.Group();
    this.grid = null;
    this.walls = [];

    this.create();
  }

  create() {
    this.createFloor();
    this.createWalls();
    this.createGrid();
    this.createDoor();
    this.createWindow();
  }

  createFloor() {
    const THREE = this.THREE;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(this.width, this.depth);
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B8B7A,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.group.add(floor);

    // Floor pattern (tiles) - used as the grid inside the room bounds
    const tileSize = 0.5;
    const tilesX = Math.floor(this.width / tileSize);
    const tilesZ = Math.floor(this.depth / tileSize);

    const linesMaterial = new THREE.LineBasicMaterial({ color: 0x6B6B5A, transparent: true, opacity: 0.3 });
    const gridGroup = new THREE.Group();
    gridGroup.name = 'grid';

    for (let i = 0; i <= tilesX; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-this.width / 2 + i * tileSize, 0.001, -this.depth / 2),
        new THREE.Vector3(-this.width / 2 + i * tileSize, 0.001, this.depth / 2)
      ]);
      const line = new THREE.Line(geometry, linesMaterial);
      gridGroup.add(line);
    }

    for (let i = 0; i <= tilesZ; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-this.width / 2, 0.001, -this.depth / 2 + i * tileSize),
        new THREE.Vector3(this.width / 2, 0.001, -this.depth / 2 + i * tileSize)
      ]);
      const line = new THREE.Line(geometry, linesMaterial);
      gridGroup.add(line);
    }

    this.grid = gridGroup;
    this.group.add(gridGroup);
  }

  createWalls() {
    const THREE = this.THREE;
    const wallMaterial = new THREE.MeshLambertMaterial({
      color: 0xE8E4D9,
      side: THREE.DoubleSide
    });
    const wallThickness = 0.1;
    const wallOffset = wallThickness;

    // Back wall (negative Z)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.width, this.height, wallThickness),
      wallMaterial
    );
    backWall.position.set(0, this.height / 2, -this.depth / 2 - wallOffset);
    backWall.receiveShadow = true;
      backWall.name = 'wall';
    this.group.add(backWall);
    this.walls.push(backWall);

    // Left wall (negative X)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, this.height, this.depth),
      wallMaterial
    );
    leftWall.position.set(-this.width / 2 - wallOffset, this.height / 2, 0);
    leftWall.receiveShadow = true;
      leftWall.name = 'wall';
    this.group.add(leftWall);
    this.walls.push(leftWall);

    // Right wall (positive X)
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, this.height, this.depth),
      wallMaterial
    );
    rightWall.position.set(this.width / 2 + wallOffset, this.height / 2, 0);
    rightWall.receiveShadow = true;
      rightWall.name = 'wall';
    this.group.add(rightWall);
    this.walls.push(rightWall);

    // Front wall with door opening (positive Z)
    this.createFrontWallWithDoor(wallMaterial, wallThickness);

    // Ceiling intentionally omitted to keep top open in 3D view
  }

  createFrontWallWithDoor(wallMaterial, wallThickness) {
    const THREE = this.THREE;
    const doorWidth = 0.9;
    const doorHeight = 2.1;
    const doorX = -this.width / 4;
    const wallOffset = wallThickness;

    // Left part of front wall
    const leftPartWidth = this.width / 2 + doorX - doorWidth / 2;
    if (leftPartWidth > 0) {
      const leftPart = new THREE.Mesh(
        new THREE.BoxGeometry(leftPartWidth, this.height, wallThickness),
        wallMaterial
      );
            leftPart.position.set(-this.width / 2 + leftPartWidth / 2, this.height / 2, this.depth / 2 + wallOffset);
        leftPart.name = 'wall';
      this.group.add(leftPart);
        this.walls.push(leftPart);
    }

    // Right part of front wall
    const rightPartWidth = this.width / 2 - doorX - doorWidth / 2;
    if (rightPartWidth > 0) {
      const rightPart = new THREE.Mesh(
        new THREE.BoxGeometry(rightPartWidth, this.height, wallThickness),
        wallMaterial
      );
            rightPart.position.set(this.width / 2 - rightPartWidth / 2, this.height / 2, this.depth / 2 + wallOffset);
        rightPart.name = 'wall';
      this.group.add(rightPart);
        this.walls.push(rightPart);
    }

    // Top part above door
    const topPart = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, this.height - doorHeight, wallThickness),
      wallMaterial
    );
    topPart.position.set(doorX, doorHeight + (this.height - doorHeight) / 2, this.depth / 2 + wallOffset);
      topPart.name = 'wall';
    this.group.add(topPart);
      this.walls.push(topPart);
  }

  createDoor() {
    const THREE = this.THREE;
    const doorWidth = 0.9;
    const doorHeight = 2.1;
    const doorX = -this.width / 4;

    // Door frame
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });

    // Door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.05, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x6D4C41 })
    );
    door.position.set(doorX, doorHeight / 2, this.depth / 2 + 0.05);
    this.group.add(door);

    // Door handle
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xBDBDBD })
    );
    handle.position.set(doorX + doorWidth / 2 - 0.15, doorHeight / 2, this.depth / 2 + 0.1);
    this.group.add(handle);
  }

  createWindow() {
    const THREE = this.THREE;
    const windowWidth = 1.2;
    const windowHeight = 1.0;
    const windowY = 1.2;

    // Window frame on back wall
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x5D4037 });

    // Window glass
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      new THREE.MeshLambertMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );
    glass.position.set(this.width / 4, windowY + windowHeight / 2, -this.depth / 2 + 0.01);
    this.group.add(glass);

    // Window frame
    const frameThickness = 0.05;
    const frameGeometry = new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameThickness);

    const topFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    topFrame.position.set(this.width / 4, windowY + windowHeight, -this.depth / 2 + 0.02);
    this.group.add(topFrame);

    const bottomFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    bottomFrame.position.set(this.width / 4, windowY, -this.depth / 2 + 0.02);
    this.group.add(bottomFrame);

    const sideFrameGeometry = new THREE.BoxGeometry(frameThickness, windowHeight, frameThickness);
    const leftFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
    leftFrame.position.set(this.width / 4 - windowWidth / 2 - frameThickness / 2, windowY + windowHeight / 2, -this.depth / 2 + 0.02);
    this.group.add(leftFrame);

    const rightFrame = new THREE.Mesh(sideFrameGeometry, frameMaterial);
    rightFrame.position.set(this.width / 4 + windowWidth / 2 + frameThickness / 2, windowY + windowHeight / 2, -this.depth / 2 + 0.02);
    this.group.add(rightFrame);
  }

  createGrid() {
    // Grid is created in createFloor to ensure it stays inside the walls.
    // This method is kept for compatibility.
  }

  showGrid(show) {
    if (this.grid) {
      this.grid.visible = show;
    }
  }

  showWalls(show) {
    this.walls.forEach((wall) => {
      wall.visible = show;
    });
  }

  resize(width, depth, height) {
    // Remove old group children
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

    this.create();
  }

  getFloorBounds() {
    return {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minZ: -this.depth / 2,
      maxZ: this.depth / 2
    };
  }
}

// Create 2D room representation
export function draw2DRoom(ctx, width, depth, scale, offsetX, offsetY) {
  const roomWidth = width * scale;
  const roomDepth = depth * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Floor
  ctx.fillStyle = '#8B8B7A';
  ctx.fillRect(-roomWidth / 2, -roomDepth / 2, roomWidth, roomDepth);

  // Grid
  ctx.strokeStyle = '#6B6B5A';
  ctx.lineWidth = 0.5;
  const gridSize = 0.5 * scale;

  for (let x = -roomWidth / 2; x <= roomWidth / 2; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -roomDepth / 2);
    ctx.lineTo(x, roomDepth / 2);
    ctx.stroke();
  }

  for (let y = -roomDepth / 2; y <= roomDepth / 2; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-roomWidth / 2, y);
    ctx.lineTo(roomWidth / 2, y);
    ctx.stroke();
  }

    // Walls (draw outside the grid boundary)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    const wallOffset = ctx.lineWidth / 2;
    ctx.strokeRect(
        -roomWidth / 2 - wallOffset,
        -roomDepth / 2 - wallOffset,
        roomWidth + wallOffset * 2,
        roomDepth + wallOffset * 2
    );

  // Door (front wall, bottom)
  const doorWidth = 0.9 * scale;
  const doorX = -width / 4 * scale;
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(doorX - doorWidth / 2, roomDepth / 2 - 4, doorWidth, 8);

  // Door swing arc
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(doorX - doorWidth / 2, roomDepth / 2, doorWidth, -Math.PI / 2, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Window (back wall)
  const windowWidth = 1.2 * scale;
  const windowX = width / 4 * scale;
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(windowX - windowWidth / 2, -roomDepth / 2 - 4, windowWidth, 8);

  // Dimension labels
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  // Width label
  ctx.fillText(`${width}m`, 0, roomDepth / 2 + 25);

  // Depth label
  ctx.save();
  ctx.translate(-roomWidth / 2 - 25, 0);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${depth}m`, 0, 0);
  ctx.restore();

  ctx.restore();
}
