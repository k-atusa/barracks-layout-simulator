import { FURNITURE_TYPES, createFurnitureMesh, create2DFurniture } from './furniture.js';
import { Room, draw2DRoom } from './room.js';
import { CollisionDetector, AutoArranger } from './collision.js';

class BarracksSimulator {
  constructor() {
    this.canvas2D = document.getElementById('canvas-2d');
    this.canvas3D = document.getElementById('canvas-3d');
    this.ctx = this.canvas2D.getContext('2d');

    // View mode
    this.viewMode = '2d'; // '2d' or '3d'

    // Room dimensions (meters)
    this.roomWidth = 6;
    this.roomDepth = 4;
    this.roomHeight = 2.8;

    // 2D view settings
    this.scale = 100; // pixels per meter
    this.panOffset = { x: 0, y: 0 };

    // Furniture management
    this.furniture = [];
    this.selectedFurniture = null;
    this.selectedIndex = -1;

    // Interaction state
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragFurnitureStart = { x: 0, z: 0 };

    // Options
    this.showGrid = true;
    this.showWalls = true;
    this.snapToGrid = true;
    this.showDimensions = false;
    this.collisionDetection = true;

    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.room3D = null;

    // Collision detector
    this.collisionDetector = new CollisionDetector();

    // Initialize
    this.init();
  }

  init() {
    this.setupCanvas();
    this.setup3D();
    this.setupEventListeners();
    this.setupUI();
    this.render();
  }

  setupCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    this.canvas2D.width = wrapper.clientWidth;
    this.canvas2D.height = wrapper.clientHeight;
    this.canvas3D.width = wrapper.clientWidth;
    this.canvas3D.height = wrapper.clientHeight;

    // Center the view
    this.panOffset.x = this.canvas2D.width / 2;
    this.panOffset.y = this.canvas2D.height / 2;
  }

  setup3D() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas3D.width / this.canvas3D.height,
      0.1,
      100
    );
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas3D,
      antialias: true
    });
    this.renderer.setSize(this.canvas3D.width, this.canvas3D.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.canvas3D);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.enabled = false;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    // Create room
    this.room3D = new Room(this.roomWidth, this.roomDepth, this.roomHeight, THREE);
    this.scene.add(this.room3D.group);

    // Raycaster for 3D interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onResize());

    // Canvas events
    this.canvas2D.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas2D.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas2D.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas2D.addEventListener('wheel', (e) => this.onWheel(e));
    this.canvas2D.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    this.canvas3D.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas3D.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas3D.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas3D.addEventListener('wheel', (e) => this.onWheel(e));
    this.canvas3D.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // Keyboard events
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Drag and drop from furniture panel
    this.setupDragDrop();
  }

  setupDragDrop() {
    const furnitureItems = document.querySelectorAll('.furniture-item');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    furnitureItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('furniture-type', item.dataset.type);
        canvasWrapper.classList.add('drag-over');
      });

      item.addEventListener('dragend', () => {
        canvasWrapper.classList.remove('drag-over');
      });
    });

    canvasWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    canvasWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      canvasWrapper.classList.remove('drag-over');

      const type = e.dataTransfer.getData('furniture-type');
      if (type) {
        const activeCanvas = this.viewMode === '2d' ? this.canvas2D : this.canvas3D;
        const rect = activeCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.addFurniture(type, x, y);
      }
    });
  }

  setupUI() {
    // View buttons
    document.getElementById('btn-2d').addEventListener('click', () => this.setViewMode('2d'));
    document.getElementById('btn-3d').addEventListener('click', () => this.setViewMode('3d'));

    // Room settings
    document.getElementById('apply-room-size').addEventListener('click', () => {
      this.roomWidth = parseFloat(document.getElementById('room-width').value);
      this.roomDepth = parseFloat(document.getElementById('room-depth').value);
      this.roomHeight = parseFloat(document.getElementById('room-height').value);
      this.updateRoom();
    });

    // Options
    document.getElementById('show-grid').addEventListener('change', (e) => {
      this.showGrid = e.target.checked;
      this.room3D.showGrid(this.showGrid);
      this.render();
    });

    document.getElementById('show-walls').addEventListener('change', (e) => {
      this.showWalls = e.target.checked;
      this.room3D.showWalls(this.showWalls);
      this.render();
    });

    document.getElementById('snap-to-grid').addEventListener('change', (e) => {
      this.snapToGrid = e.target.checked;
    });

    document.getElementById('show-dimensions').addEventListener('change', (e) => {
      this.showDimensions = e.target.checked;
      this.render();
    });

    document.getElementById('collision-detection').addEventListener('change', (e) => {
      this.collisionDetection = e.target.checked;
      this.render();
    });

    // Selected furniture controls
    document.getElementById('rotate-left').addEventListener('click', () => this.rotateSelected(-90));
    document.getElementById('rotate-right').addEventListener('click', () => this.rotateSelected(90));
    document.getElementById('delete-furniture').addEventListener('click', () => this.deleteSelected());

    document.getElementById('pos-x').addEventListener('change', (e) => {
      if (this.selectedFurniture) {
        this.selectedFurniture.position.x = parseFloat(e.target.value);
        this.render();
      }
    });

    document.getElementById('pos-z').addEventListener('change', (e) => {
      if (this.selectedFurniture) {
        this.selectedFurniture.position.z = parseFloat(e.target.value);
        this.render();
      }
    });

    document.getElementById('rotation').addEventListener('change', (e) => {
      if (this.selectedFurniture) {
        this.selectedFurniture.rotation.y = parseFloat(e.target.value) * Math.PI / 180;
        this.render();
      }
    });

    // Save/Load
    document.getElementById('save-layout').addEventListener('click', () => this.saveLayout());
    document.getElementById('load-layout').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', (e) => this.loadLayout(e));
    document.getElementById('clear-all').addEventListener('click', () => this.clearAll());

    // Auto-arrange
    document.getElementById('auto-arrange').addEventListener('click', () => this.autoArrange());
    document.getElementById('optimize-space').addEventListener('click', () => this.optimizeSpace());
  }

  setViewMode(mode) {
    this.viewMode = mode;

    document.getElementById('btn-2d').classList.toggle('active', mode === '2d');
    document.getElementById('btn-3d').classList.toggle('active', mode === '3d');

    this.canvas2D.style.display = mode === '2d' ? 'block' : 'none';
    this.canvas3D.style.display = mode === '3d' ? 'block' : 'none';

    if (mode === '3d') {
      this.controls.enabled = true;
      this.animate3D();
    } else {
      this.controls.enabled = false;
      this.render();
    }
  }

  onResize() {
    const wrapper = document.getElementById('canvas-wrapper');
    this.canvas2D.width = wrapper.clientWidth;
    this.canvas2D.height = wrapper.clientHeight;
    this.canvas3D.width = wrapper.clientWidth;
    this.canvas3D.height = wrapper.clientHeight;

    if (this.viewMode === '3d') {
      this.camera.aspect = this.canvas3D.width / this.canvas3D.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.canvas3D.width, this.canvas3D.height);
    }

    this.panOffset.x = this.canvas2D.width / 2;
    this.panOffset.y = this.canvas2D.height / 2;
    this.render();
  }

  onMouseDown(e) {
    const activeCanvas = this.viewMode === '2d' ? this.canvas2D : this.canvas3D;
    const rect = activeCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.viewMode === '2d') {
      // Check if clicked on furniture
      const clickedFurniture = this.getFurnitureAt2D(x, y);

      if (clickedFurniture) {
        this.selectFurniture(clickedFurniture.index);
        this.isDragging = true;
        this.dragStart = { x, y };
        this.dragFurnitureStart = {
          x: clickedFurniture.furniture.position.x,
          z: clickedFurniture.furniture.position.z
        };
      } else {
        this.deselectFurniture();
      }
    } else {
      // 3D mode - raycasting
      this.mouse.x = (x / this.canvas3D.width) * 2 - 1;
      this.mouse.y = -(y / this.canvas3D.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.furniture.map(f => f.children[0]),
        false
      );

      if (intersects.length > 0) {
        const clickedFurniture = intersects[0].object.parent;
        const index = this.furniture.indexOf(clickedFurniture);
        if (index !== -1) {
          this.selectFurniture(index);
        }
      } else {
        this.deselectFurniture();
      }
    }

    this.render();
  }

  onMouseMove(e) {
    if (!this.isDragging || this.viewMode !== '2d') return;

    const rect = this.canvas2D.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = (x - this.dragStart.x) / this.scale;
    const dy = (y - this.dragStart.y) / this.scale;

    let newX = this.dragFurnitureStart.x + dx;
    let newZ = this.dragFurnitureStart.z + dy;

    // Snap to grid
    if (this.snapToGrid) {
      const gridSize = 0.25;
      newX = Math.round(newX / gridSize) * gridSize;
      newZ = Math.round(newZ / gridSize) * gridSize;
    }

    // Update furniture position
    this.selectedFurniture.position.x = newX;
    this.selectedFurniture.position.z = newZ;

    // Check collisions
    if (this.collisionDetection) {
      this.checkCollisions();
    }

    this.updatePropertiesPanel();
    this.render();
  }

  onMouseUp(e) {
    if (this.isDragging && this.selectedFurniture) {
      // Clamp to room bounds
      const bounds = this.room3D.getFloorBounds();
      const config = this.selectedFurniture.userData.config;

      this.selectedFurniture.position.x = Math.max(
        bounds.minX + config.width / 2,
        Math.min(bounds.maxX - config.width / 2, this.selectedFurniture.position.x)
      );
      this.selectedFurniture.position.z = Math.max(
        bounds.minZ + config.depth / 2,
        Math.min(bounds.maxZ - config.depth / 2, this.selectedFurniture.position.z)
      );

      this.updatePropertiesPanel();
    }

    this.isDragging = false;
    this.render();
  }

  onWheel(e) {
    if (this.viewMode === '2d') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(50, Math.min(200, this.scale * delta));
      this.render();
    }
  }

  onDoubleClick(e) {
    if (this.selectedFurniture) {
      this.rotateSelected(90);
    }
  }

  onKeyDown(e) {
    // Ignore shortcuts when typing in inputs
    const tagName = e.target?.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || e.target?.isContentEditable) {
      return;
    }

    if (!this.selectedFurniture) return;

    switch (e.code) {
      case 'KeyR':
        this.rotateSelected(e.shiftKey ? -15 : 15);
        break;
      case 'Delete':
      case 'Backspace':
        this.deleteSelected();
        break;
      case 'ArrowUp':
        this.selectedFurniture.position.z -= 0.1;
        break;
      case 'ArrowDown':
        this.selectedFurniture.position.z += 0.1;
        break;
      case 'ArrowLeft':
        this.selectedFurniture.position.x -= 0.1;
        break;
      case 'ArrowRight':
        this.selectedFurniture.position.x += 0.1;
        break;
    }

    this.updatePropertiesPanel();
    this.render();
  }

  getFurnitureAt2D(x, y) {
    const worldX = (x - this.panOffset.x) / this.scale;
    const worldZ = (y - this.panOffset.y) / this.scale;

    for (let i = this.furniture.length - 1; i >= 0; i--) {
      const furniture = this.furniture[i];
      const config = furniture.userData.config;
      const pos = furniture.position;
      const rotation = furniture.rotation.y;

      // Calculate rotated bounds
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      // Transform point to furniture local space
      const localX = (worldX - pos.x) * cos + (worldZ - pos.z) * sin;
      const localZ = -(worldX - pos.x) * sin + (worldZ - pos.z) * cos;

      if (Math.abs(localX) <= config.width / 2 && Math.abs(localZ) <= config.depth / 2) {
        return { furniture, index: i };
      }
    }

    return null;
  }

  addFurniture(type, canvasX, canvasY) {
    // Calculate world position
    let worldX = (canvasX - this.panOffset.x) / this.scale;
    let worldZ = (canvasY - this.panOffset.y) / this.scale;

    // Snap to grid if enabled
    if (this.snapToGrid) {
      const gridSize = 0.25;
      worldX = Math.round(worldX / gridSize) * gridSize;
      worldZ = Math.round(worldZ / gridSize) * gridSize;
    }

    // Clamp to room bounds
    const bounds = this.room3D.getFloorBounds();
    const config = FURNITURE_TYPES[type];

    worldX = Math.max(bounds.minX + config.width / 2, Math.min(bounds.maxX - config.width / 2, worldX));
    worldZ = Math.max(bounds.minZ + config.depth / 2, Math.min(bounds.maxZ - config.depth / 2, worldZ));

    // Create 3D furniture
    const furniture = createFurnitureMesh(type, THREE);
    furniture.position.set(worldX, 0, worldZ);

    this.furniture.push(furniture);
    this.scene.add(furniture);
    this.collisionDetector.setFurniture(this.furniture);

    // Select the new furniture
    this.selectFurniture(this.furniture.length - 1);

    // Check collisions
    if (this.collisionDetection) {
      this.checkCollisions();
    }

    this.updateInfo();
    this.render();
  }

  selectFurniture(index) {
    // Deselect previous
    if (this.selectedFurniture) {
      const outline = this.selectedFurniture.getObjectByName('outline');
      if (outline) outline.material.opacity = 0;
    }

    this.selectedIndex = index;
    this.selectedFurniture = this.furniture[index];

    // Show selection outline
    const outline = this.selectedFurniture.getObjectByName('outline');
    if (outline) outline.material.opacity = 0.5;

    // Show properties panel
    document.getElementById('selected-furniture-panel').style.display = 'block';
    this.updatePropertiesPanel();
  }

  deselectFurniture() {
    if (this.selectedFurniture) {
      const outline = this.selectedFurniture.getObjectByName('outline');
      if (outline) outline.material.opacity = 0;
    }

    this.selectedFurniture = null;
    this.selectedIndex = -1;
    document.getElementById('selected-furniture-panel').style.display = 'none';
  }

  updatePropertiesPanel() {
    if (!this.selectedFurniture) return;

    const config = this.selectedFurniture.userData.config;
    document.getElementById('selected-name').textContent = config.name;
    document.getElementById('pos-x').value = this.selectedFurniture.position.x.toFixed(2);
    document.getElementById('pos-z').value = this.selectedFurniture.position.z.toFixed(2);
    document.getElementById('rotation').value = Math.round(this.selectedFurniture.rotation.y * 180 / Math.PI);
  }

  rotateSelected(degrees) {
    if (!this.selectedFurniture) return;
    this.selectedFurniture.rotation.y += degrees * Math.PI / 180;
    this.updatePropertiesPanel();
    this.render();
  }

  deleteSelected() {
    if (!this.selectedFurniture) return;

    this.scene.remove(this.selectedFurniture);
    this.furniture.splice(this.selectedIndex, 1);
    this.collisionDetector.setFurniture(this.furniture);

    this.deselectFurniture();
    this.updateInfo();
    this.render();
  }

  clearAll() {
    if (!confirm('모든 가구를 삭제하시겠습니까?')) return;

    this.furniture.forEach(f => this.scene.remove(f));
    this.furniture = [];
    this.collisionDetector.setFurniture(this.furniture);
    this.deselectFurniture();
    this.updateInfo();
    this.render();
  }

  updateRoom() {
    // Update 3D room
    this.room3D.resize(this.roomWidth, this.roomDepth, this.roomHeight);
    this.room3D.showGrid(this.showGrid);
    this.room3D.showWalls(this.showWalls);

    document.getElementById('room-size').textContent =
      `방 크기: ${this.roomWidth}m x ${this.roomDepth}m`;

    this.updateInfo();
    this.render();
  }

  checkCollisions() {
    const collisions = this.collisionDetector.getAllCollisions();

    // Reset all furniture colors
    this.furniture.forEach(f => {
      f.userData.isColliding = false;
      f.children[0].material.color.setHex(f.userData.config.color);
    });

    // Highlight colliding furniture
    collisions.forEach(([i, j]) => {
      this.furniture[i].userData.isColliding = true;
      this.furniture[j].userData.isColliding = true;
      this.furniture[i].children[0].material.color.setHex(0xc0392b);
      this.furniture[j].children[0].material.color.setHex(0xc0392b);
    });
  }

  updateInfo() {
    const utilization = this.collisionDetector.calculateSpaceUtilization(
      this.roomWidth,
      this.roomDepth
    );

    document.getElementById('space-usage').textContent =
      `공간 활용률: ${utilization.toFixed(1)}%`;
    document.getElementById('furniture-count').textContent =
      `가구 수: ${this.furniture.length}개`;
  }

  saveLayout() {
    const layout = {
      room: {
        width: this.roomWidth,
        depth: this.roomDepth,
        height: this.roomHeight
      },
      furniture: this.furniture.map(f => ({
        type: f.userData.type,
        x: f.position.x,
        z: f.position.z,
        rotation: f.rotation.y
      }))
    };

    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barracks-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadLayout(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const layout = JSON.parse(event.target.result);

        // Clear existing furniture
        this.furniture.forEach(f => this.scene.remove(f));
        this.furniture = [];

        // Update room
        this.roomWidth = layout.room.width;
        this.roomDepth = layout.room.depth;
        this.roomHeight = layout.room.height;

        document.getElementById('room-width').value = this.roomWidth;
        document.getElementById('room-depth').value = this.roomDepth;
        document.getElementById('room-height').value = this.roomHeight;

        this.updateRoom();

        // Add furniture
        layout.furniture.forEach(f => {
          const furniture = createFurnitureMesh(f.type, THREE);
          furniture.position.set(f.x, 0, f.z);
          furniture.rotation.y = f.rotation;

          this.furniture.push(furniture);
          this.scene.add(furniture);
        });

        this.collisionDetector.setFurniture(this.furniture);
        this.deselectFurniture();
        this.updateInfo();
        this.render();

        alert('레이아웃을 불러왔습니다!');
      } catch (err) {
        alert('파일을 불러오는데 실패했습니다.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  autoArrange() {
    if (this.furniture.length === 0) {
      alert('배치할 가구가 없습니다.');
      return;
    }

    const arranger = new AutoArranger(
      this.room3D.getFloorBounds(),
      this.collisionDetector
    );

    const positions = arranger.arrangeBarracksStyle(this.furniture);

    positions.forEach(pos => {
      pos.furniture.position.x = pos.x;
      pos.furniture.position.z = pos.z;
      pos.furniture.rotation.y = pos.rotation;
    });

    if (this.collisionDetection) {
      this.checkCollisions();
    }

    this.updateInfo();
    this.render();
  }

  optimizeSpace() {
    if (this.furniture.length === 0) {
      alert('최적화할 가구가 없습니다.');
      return;
    }

    // Simple optimization: align furniture to walls and grid
    const bounds = this.room3D.getFloorBounds();

    this.furniture.forEach(f => {
      const config = f.userData.config;
      const pos = f.position;

      // Snap to nearest wall if close
      const wallThreshold = 0.5;

      if (pos.x - config.width / 2 < bounds.minX + wallThreshold) {
        pos.x = bounds.minX + config.width / 2 + 0.1;
      } else if (pos.x + config.width / 2 > bounds.maxX - wallThreshold) {
        pos.x = bounds.maxX - config.width / 2 - 0.1;
      }

      if (pos.z - config.depth / 2 < bounds.minZ + wallThreshold) {
        pos.z = bounds.minZ + config.depth / 2 + 0.1;
      } else if (pos.z + config.depth / 2 > bounds.maxZ - wallThreshold) {
        pos.z = bounds.maxZ - config.depth / 2 - 0.1;
      }

      // Snap rotation to 90 degrees
      const rotDeg = f.rotation.y * 180 / Math.PI;
      f.rotation.y = Math.round(rotDeg / 90) * 90 * Math.PI / 180;
    });

    if (this.collisionDetection) {
      this.checkCollisions();
    }

    this.updateInfo();
    this.render();
  }

  render() {
    if (this.viewMode === '2d') {
      this.render2D();
    }
  }

  render2D() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);

    // Draw background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, this.canvas2D.width, this.canvas2D.height);

    // Draw room
    draw2DRoom(ctx, this.roomWidth, this.roomDepth, this.scale, this.panOffset.x, this.panOffset.y);

    // Draw furniture
    this.furniture.forEach((furniture, index) => {
      const isSelected = index === this.selectedIndex;
      const isColliding = furniture.userData.isColliding;

      create2DFurniture(
        furniture.userData.type,
        ctx,
        this.panOffset.x + furniture.position.x * this.scale,
        this.panOffset.y + furniture.position.z * this.scale,
        furniture.rotation.y,
        this.scale,
        isSelected,
        isColliding
      );
    });

    // Draw dimensions if enabled
    if (this.showDimensions && this.selectedFurniture) {
      this.drawDimensions();
    }
  }

  drawDimensions() {
    const ctx = this.ctx;
    const furniture = this.selectedFurniture;
    const config = furniture.userData.config;

    const x = this.panOffset.x + furniture.position.x * this.scale;
    const y = this.panOffset.y + furniture.position.z * this.scale;
    const width = config.width * this.scale;
    const depth = config.depth * this.scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(furniture.rotation.y);

    // Dimension lines
    ctx.strokeStyle = '#f1c40f';
    ctx.fillStyle = '#f1c40f';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';

    // Width dimension
    ctx.beginPath();
    ctx.moveTo(-width / 2, depth / 2 + 15);
    ctx.lineTo(width / 2, depth / 2 + 15);
    ctx.stroke();
    ctx.fillText(`${config.width}m`, 0, depth / 2 + 25);

    // Depth dimension
    ctx.beginPath();
    ctx.moveTo(width / 2 + 15, -depth / 2);
    ctx.lineTo(width / 2 + 15, depth / 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(width / 2 + 25, 0);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${config.depth}m`, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  animate3D() {
    if (this.viewMode !== '3d') return;

    requestAnimationFrame(() => this.animate3D());

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the application
const app = new BarracksSimulator();
