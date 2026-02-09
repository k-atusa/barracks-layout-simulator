import { FURNITURE_TYPES, createFurnitureMesh, create2DFurniture } from './furniture.js';
import { Room, draw2DRoom } from './room.js';
import { CollisionDetector, AutoArranger } from './collision.js';

class BarracksSimulator {
  constructor() {
    this.canvas2D = document.getElementById('canvas-2d');
    this.canvas3D = document.getElementById('canvas-3d');
    this.ctx = this.canvas2D.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.canvas2DDisplayWidth = 0;
    this.canvas2DDisplayHeight = 0;

    // View mode
    this.viewMode = '2d'; // '2d' or '3d'
    this.view360 = {
      active: false,
      yaw: 0,
      pitch: 0,
      isLooking: false,
      lookStart: { x: 0, y: 0 },
      yawStart: 0,
      pitchStart: 0,
      moveSpeed: 1.2,
      lookSensitivity: 0.003,
      baseFov: 60,
      minFov: 25,
      maxFov: 90,
      fovSensitivity: 0.04,
      keys: { forward: false, back: false, left: false, right: false },
      lastTime: 0,
      fovAnim: null
    };

    // Room dimensions (meters) — USAG Humphreys barracks
    this.roomWidth = 3.5;
    this.roomDepth = 5.05;
    this.roomHeight = 2.6;

    // 2D view settings
    this.scale = 100; // pixels per meter
    this.targetScale = this.scale;
    this.zoomAnimating = false;
    this.zoomLerp = 0.2;
    this.panOffset = { x: 0, y: 0 };

    // 3D zoom smoothing
    this.zoom3DTargetDistance = null;
    this.zoom3DLerp = 0.2;

    // Furniture management
    this.furniture = [];
    this.selectedFurniture = null;
    this.selectedIndex = -1;

    // Interaction state
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragFurnitureStart = { x: 0, z: 0 };
    this.panStart = { x: 0, y: 0 };
    this.panOffsetStart = { x: 0, y: 0 };

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
    this.loadLayoutFromData({
      room: {
        width: 3.5,
        depth: 5.05,
        height: 2.6
      },
      furniture: [
        {
          type: 'single-bed',
          x: 1.25,
          z: -0.08000000000000004,
          rotation: Math.PI
        },
        {
          type: 'desk',
          x: -0.5399999999999998,
          z: -2.2249999999999996,
          rotation: 0
        },
        {
          type: 'dresser-5',
          x: 1.4500000000000002,
          z: -2.138778452450518,
          rotation: -Math.PI / 2
        },
        {
          type: 'bed-drawer-2',
          x: 0.4610831414279115,
          z: 0.7249999999999999,
          rotation: Math.PI
        },
        {
          type: 'trash-bin',
          x: -1.55,
          z: -2.3249999999999997,
          rotation: 0
        },
        {
          type: 'chair',
          x: -0.6499999999999999,
          z: -1.625,
          rotation: Math.PI
        }
      ]
    });
    this.render();
  }

  setupCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    this.dpr = window.devicePixelRatio || 1;
    this.canvas2DDisplayWidth = wrapper.clientWidth;
    this.canvas2DDisplayHeight = wrapper.clientHeight;
    this.canvas2D.style.width = `${this.canvas2DDisplayWidth}px`;
    this.canvas2D.style.height = `${this.canvas2DDisplayHeight}px`;
    this.canvas2D.width = Math.floor(this.canvas2DDisplayWidth * this.dpr);
    this.canvas2D.height = Math.floor(this.canvas2DDisplayHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.canvas3D.width = wrapper.clientWidth;
    this.canvas3D.height = wrapper.clientHeight;

    // Center the view
    this.panOffset.x = this.canvas2DDisplayWidth / 2;
    this.panOffset.y = this.canvas2DDisplayHeight / 2;
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
    this.controls.enableZoom = false;
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
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());

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
    document.getElementById('btn-360').addEventListener('click', () => this.setViewMode('360'));
    document.getElementById('exit-360').addEventListener('click', () => this.setViewMode('3d'));

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
        this._snapFurnitureToGrid(this.selectedFurniture);
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
    document.getElementById('btn-360').classList.toggle('active', mode === '360');

    this.canvas2D.style.display = mode === '2d' ? 'block' : 'none';
    this.canvas3D.style.display = mode === '3d' ? 'block' : 'none';

    if (mode === '360') {
      this.canvas2D.style.display = 'none';
      this.canvas3D.style.display = 'block';
      document.body.classList.add('mode-360');
      this.enter360View();
    } else {
      document.body.classList.remove('mode-360');
      this.exit360View();
    }

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
    this.dpr = window.devicePixelRatio || 1;
    this.canvas2DDisplayWidth = wrapper.clientWidth;
    this.canvas2DDisplayHeight = wrapper.clientHeight;
    this.canvas2D.style.width = `${this.canvas2DDisplayWidth}px`;
    this.canvas2D.style.height = `${this.canvas2DDisplayHeight}px`;
    this.canvas2D.width = Math.floor(this.canvas2DDisplayWidth * this.dpr);
    this.canvas2D.height = Math.floor(this.canvas2DDisplayHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.canvas3D.width = wrapper.clientWidth;
    this.canvas3D.height = wrapper.clientHeight;

    if (this.viewMode === '3d' || this.viewMode === '360') {
      this.camera.aspect = this.canvas3D.width / this.canvas3D.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.canvas3D.width, this.canvas3D.height);
    }

    this.panOffset.x = this.canvas2DDisplayWidth / 2;
    this.panOffset.y = this.canvas2DDisplayHeight / 2;
    this.render();
  }

  onMouseDown(e) {
    const activeCanvas = this.viewMode === '2d' ? this.canvas2D : this.canvas3D;
    const rect = activeCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.viewMode === '360') {
      if (e.button === 1) {
        e.preventDefault();
        this.animateFovTo(this.view360.baseFov);
        return;
      }
      if (document.pointerLockElement !== this.canvas3D) {
        this.canvas3D.requestPointerLock();
      }
      return;
    }

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
        // Start panning when dragging empty space
        this.isPanning = true;
        this.panStart = { x, y };
        this.panOffsetStart = { x: this.panOffset.x, y: this.panOffset.y };
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
    if (this.viewMode === '360') {
      if (!this.view360.isLooking) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      this.view360.yaw -= dx * this.view360.lookSensitivity;
      this.view360.pitch -= dy * this.view360.lookSensitivity;
      const maxPitch = Math.PI / 2 - 0.1;
      this.view360.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.view360.pitch));
      this.camera.rotation.set(this.view360.pitch, this.view360.yaw, 0, 'YXZ');
      return;
    }

    if (this.viewMode !== '2d') return;

    const rect = this.canvas2D.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPanning) {
      const dx = x - this.panStart.x;
      const dy = y - this.panStart.y;
      this.panOffset.x = this.panOffsetStart.x + dx;
      this.panOffset.y = this.panOffsetStart.y + dy;
      this.render();
      return;
    }

    if (!this.isDragging) return;

    const dx = (x - this.dragStart.x) / this.scale;
    const dy = (y - this.dragStart.y) / this.scale;

    let newX = this.dragFurnitureStart.x + dx;
    let newZ = this.dragFurnitureStart.z + dy;

    // Snap to grid (aligned to room origin, edge-aware)
    if (this.snapToGrid) {
      const gridSize = 0.1;
      const originX = -this.roomWidth / 2;
      const originZ = -this.roomDepth / 2;
      const config = this.selectedFurniture.userData;
      const rot = this.selectedFurniture.rotation.y;
      const isRotated = Math.abs(Math.sin(rot)) > 0.5;
      const effW = isRotated ? config.depth : config.width;
      const effD = isRotated ? config.width : config.depth;
      // If half-dimension is not on grid, offset by half grid so edges align
      const halfW = effW / 2;
      const halfD = effD / 2;
      const remX = halfW % gridSize;
      const remZ = halfD % gridSize;
      const eps = 0.001;
      const offsetX = (remX > eps && Math.abs(remX - gridSize) > eps) ? gridSize / 2 : 0;
      const offsetZ = (remZ > eps && Math.abs(remZ - gridSize) > eps) ? gridSize / 2 : 0;
      newX = originX + offsetX + Math.round((newX - originX - offsetX) / gridSize) * gridSize;
      newZ = originZ + offsetZ + Math.round((newZ - originZ - offsetZ) / gridSize) * gridSize;
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
    if (this.viewMode === '360') {
      return;
    }
    if (this.isDragging && this.selectedFurniture) {
      const config = this.selectedFurniture.userData.config;
      if (typeof this.room3D.constrainToUsableArea === 'function') {
        const constrained = this.room3D.constrainToUsableArea(
          this.selectedFurniture.position.x,
          this.selectedFurniture.position.z,
          config
        );
        this.selectedFurniture.position.x = constrained.x;
        this.selectedFurniture.position.z = constrained.z;
      } else {
        const bounds = this.room3D.getFloorBounds();
        this.selectedFurniture.position.x = Math.max(
          bounds.minX + config.width / 2,
          Math.min(bounds.maxX - config.width / 2, this.selectedFurniture.position.x)
        );
        this.selectedFurniture.position.z = Math.max(
          bounds.minZ + config.depth / 2,
          Math.min(bounds.maxZ - config.depth / 2, this.selectedFurniture.position.z)
        );
      }

      this.updatePropertiesPanel();
    }

    this.isDragging = false;
    this.isPanning = false;
    this.render();
  }

  onWheel(e) {
    if (this.viewMode === '2d') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.96 : 1.04;
      this.targetScale = Math.max(50, Math.min(400, this.targetScale * delta));
      this.startZoomAnimation();
    } else if (this.viewMode === '360') {
      e.preventDefault();
      const deltaFov = e.deltaY * this.view360.fovSensitivity;
      const nextFov = Math.max(
        this.view360.minFov,
        Math.min(this.view360.maxFov, this.camera.fov + deltaFov)
      );
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    } else if (this.viewMode === '3d') {
      e.preventDefault();
      this.start3DZoom(e.deltaY);
    }
  }

  start3DZoom(deltaY) {
    if (!this.controls) return;

    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const baseDistance = this.zoom3DTargetDistance ?? currentDistance;
    const factor = deltaY > 0 ? 1.05 : 0.95;

    const min = this.controls.minDistance ?? 0.1;
    const max = this.controls.maxDistance ?? 1000;
    const target = Math.max(min, Math.min(max, baseDistance * factor));

    this.zoom3DTargetDistance = target;
  }

  startZoomAnimation() {
    if (this.zoomAnimating || this.viewMode !== '2d') return;
    this.zoomAnimating = true;

    const step = () => {
      if (this.viewMode !== '2d') {
        this.zoomAnimating = false;
        return;
      }

      const diff = this.targetScale - this.scale;
      if (Math.abs(diff) < 0.1) {
        this.scale = this.targetScale;
        this.zoomAnimating = false;
        this.render();
        return;
      }

      this.scale += diff * this.zoomLerp;
      this.render2D();
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  onDoubleClick(e) {
    if (this.selectedFurniture) {
      this.rotateSelected(90);
    }
  }

  enter360View() {
    this.view360.active = true;
    this.controls.enabled = false;

    this.onResize();

    const mainRoomDepth = this.roomDepth - 1.5;
    const startX = 0;
    const startZ = -this.roomDepth / 2 + mainRoomDepth / 2;
    const startY = 1.6;

    this.camera.position.set(startX, startY, startZ);
    this.view360.yaw = 0;
    this.view360.pitch = 0;
    this.camera.fov = this.view360.baseFov;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.view360.lastTime = performance.now();

    if (document.pointerLockElement !== this.canvas3D) {
      this.canvas3D.requestPointerLock();
    }

    this.animate360();
  }

  exit360View() {
    this.view360.active = false;
    this.view360.isLooking = false;
    this.view360.keys = { forward: false, back: false, left: false, right: false };
    this.view360.fovAnim = null;

    if (document.pointerLockElement === this.canvas3D) {
      document.exitPointerLock();
    }
  }

  onPointerLockChange() {
    this.view360.isLooking = document.pointerLockElement === this.canvas3D;
  }

  animateFovTo(targetFov, duration = 220) {
    if (this.viewMode !== '360') return;

    const clamped = Math.max(this.view360.minFov, Math.min(this.view360.maxFov, targetFov));
    const from = this.camera.fov;
    const to = clamped;

    if (Math.abs(from - to) < 0.01) return;

    const start = performance.now();
    this.view360.fovAnim = { start, from, to, duration };

    const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const step = (now) => {
      if (this.viewMode !== '360' || !this.view360.fovAnim) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(t);
      this.camera.fov = from + (to - from) * eased;
      this.camera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.view360.fovAnim = null;
      }
    };

    requestAnimationFrame(step);
  }

  onKeyDown(e) {
    if (this.viewMode === '360') {
      if (e.code === 'Escape') {
        this.setViewMode('3d');
        return;
      }
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.view360.keys.forward = true;
          e.preventDefault();
          return;
        case 'KeyS':
        case 'ArrowDown':
          this.view360.keys.back = true;
          e.preventDefault();
          return;
        case 'KeyA':
        case 'ArrowLeft':
          this.view360.keys.left = true;
          e.preventDefault();
          return;
        case 'KeyD':
        case 'ArrowRight':
          this.view360.keys.right = true;
          e.preventDefault();
          return;
      }
    }
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
        this.selectedFurniture.position.z -= 0.01;
        this._snapFurnitureToGrid(this.selectedFurniture);
        break;
      case 'ArrowDown':
        this.selectedFurniture.position.z += 0.01;
        this._snapFurnitureToGrid(this.selectedFurniture);
        break;
      case 'ArrowLeft':
        this.selectedFurniture.position.x -= 0.01;
        this._snapFurnitureToGrid(this.selectedFurniture);
        break;
      case 'ArrowRight':
        this.selectedFurniture.position.x += 0.01;
        this._snapFurnitureToGrid(this.selectedFurniture);
        break;
    }

    this.updatePropertiesPanel();
    this.render();
  }

  onKeyUp(e) {
    if (this.viewMode !== '360') return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.view360.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.view360.keys.back = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.view360.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.view360.keys.right = false;
        break;
    }
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

    // Clamp to usable area (main room + bottom-left)
    const config = FURNITURE_TYPES[type];

    // Snap to grid if enabled (aligned to room origin, edge-aware)
    if (this.snapToGrid) {
      const gridSize = 0.1;
      const originX = -this.roomWidth / 2;
      const originZ = -this.roomDepth / 2;
      const halfW = config.width / 2;
      const halfD = config.depth / 2;
      const remX = halfW % gridSize;
      const remZ = halfD % gridSize;
      const eps = 0.001;
      const offsetX = (remX > eps && Math.abs(remX - gridSize) > eps) ? gridSize / 2 : 0;
      const offsetZ = (remZ > eps && Math.abs(remZ - gridSize) > eps) ? gridSize / 2 : 0;
      worldX = originX + offsetX + Math.round((worldX - originX - offsetX) / gridSize) * gridSize;
      worldZ = originZ + offsetZ + Math.round((worldZ - originZ - offsetZ) / gridSize) * gridSize;
    }
    if (typeof this.room3D.constrainToUsableArea === 'function') {
      const constrained = this.room3D.constrainToUsableArea(worldX, worldZ, config);
      worldX = constrained.x;
      worldZ = constrained.z;
    } else {
      const bounds = this.room3D.getFloorBounds();
      worldX = Math.max(bounds.minX + config.width / 2, Math.min(bounds.maxX - config.width / 2, worldX));
      worldZ = Math.max(bounds.minZ + config.depth / 2, Math.min(bounds.maxZ - config.depth / 2, worldZ));
    }

    this.addFurnitureAt(type, worldX, worldZ, 0, true);

    // Check collisions
    if (this.collisionDetection) {
      this.checkCollisions();
    }

    this.updateInfo();
    this.render();
  }

  addFurnitureAt(type, x, z, rotation = 0, select = false) {
    const furniture = createFurnitureMesh(type, THREE);
    if (!furniture) return null;

    furniture.position.set(x, 0, z);
    furniture.rotation.y = rotation;

    this.furniture.push(furniture);
    this.scene.add(furniture);
    this.collisionDetector.setFurniture(this.furniture);

    if (select) {
      this.selectFurniture(this.furniture.length - 1);
    }

    return furniture;
  }

  addDefaultLayout() {
    const bounds = this.room3D.getFloorBounds();

    // Single bed along the back wall (window side), left area
    const bedConfig = FURNITURE_TYPES['single-bed'];
    const bedX = bounds.minX + bedConfig.width / 2 + 0.1;
    const bedZ = bounds.minZ + bedConfig.depth / 2 + 0.1;
    this.addFurnitureAt('single-bed', bedX, bedZ, 0, false);

    // Desk along the right wall, near window
    const deskConfig = FURNITURE_TYPES['desk'];
    const deskX = bounds.maxX - deskConfig.width / 2 - 0.1;
    const deskZ = bounds.minZ + deskConfig.depth / 2 + 0.2;
    this.addFurnitureAt('desk', deskX, deskZ, 0, false);

    // 5-drawer dresser along the right wall, below desk
    const dresser5Config = FURNITURE_TYPES['dresser-5'];
    const dresser5X = bounds.maxX - dresser5Config.width / 2 - 0.1;
    const dresser5Z = deskZ + deskConfig.depth / 2 + dresser5Config.depth / 2 + 0.3;
    this.addFurnitureAt('dresser-5', dresser5X, dresser5Z, Math.PI, false);

    // 2-drawer bedside chest next to the bed
    const bedDrawerConfig = FURNITURE_TYPES['bed-drawer-2'];
    const bedDrawerX = bedX + bedConfig.width / 2 + bedDrawerConfig.width / 2 + 0.05;
    const bedDrawerZ = bedZ - bedConfig.depth / 2 + bedDrawerConfig.depth / 2;
    this.addFurnitureAt('bed-drawer-2', bedDrawerX, bedDrawerZ, 0, false);

    this.updateInfo();
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
    // Re-snap after rotation since effective dimensions may change
    this._snapFurnitureToGrid(this.selectedFurniture);
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
    if (!confirm('Delete all furniture?')) return;

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
      `Room Size: ${this.roomWidth}m x ${this.roomDepth}m`;

    this.updateInfo();
    this.render();
  }

  checkCollisions() {
    const collisions = this.collisionDetector.getAllCollisions();

    // Reset all furniture colors
    this.furniture.forEach(f => {
      f.userData.isColliding = false;
      f.traverse(child => {
        if (!child.isMesh || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (!mat || !mat.color) return;
          const original = child.userData?.originalColor;
          if (original) {
            mat.color.setHex(original);
          }
        });
      });
    });

    // Highlight colliding furniture
    collisions.forEach(([i, j]) => {
      this.furniture[i].userData.isColliding = true;
      this.furniture[j].userData.isColliding = true;
      [this.furniture[i], this.furniture[j]].forEach(f => {
        f.traverse(child => {
          if (!child.isMesh || !child.material) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (!mat || !mat.color) return;
            mat.color.setHex(0xc0392b);
          });
        });
      });
    });
  }

  updateInfo() {
    const utilization = this.collisionDetector.calculateSpaceUtilization(
      this.roomWidth,
      this.roomDepth
    );

    document.getElementById('space-usage').textContent =
      `Space Usage: ${utilization.toFixed(1)}%`;
    document.getElementById('furniture-count').textContent =
      `Furniture Count: ${this.furniture.length}`;
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

        alert('Layout loaded!');
      } catch (err) {
        alert('Failed to load the file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  loadLayoutFromData(layout) {
    if (!layout || !layout.room || !layout.furniture) return;

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
  }

  autoArrange() {
    if (this.furniture.length === 0) {
      alert('No furniture to arrange.');
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
      alert('No furniture to optimize.');
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

      if (typeof this.room3D.constrainToUsableArea === 'function') {
        const constrained = this.room3D.constrainToUsableArea(pos.x, pos.z, config);
        pos.x = constrained.x;
        pos.z = constrained.z;
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

  _snapFurnitureToGrid(furniture) {
    if (!this.snapToGrid) return;
    const gridSize = 0.1;
    const originX = -this.roomWidth / 2;
    const originZ = -this.roomDepth / 2;
    const config = furniture.userData;
    const rot = furniture.rotation.y;
    const isRotated = Math.abs(Math.sin(rot)) > 0.5;
    const effW = isRotated ? config.depth : config.width;
    const effD = isRotated ? config.width : config.depth;
    const halfW = effW / 2;
    const halfD = effD / 2;
    // Offset by half grid when half-dimension doesn't land on grid
    const remX = halfW % gridSize;
    const remZ = halfD % gridSize;
    const eps = 0.001;
    const offsetX = (remX > eps && Math.abs(remX - gridSize) > eps) ? gridSize / 2 : 0;
    const offsetZ = (remZ > eps && Math.abs(remZ - gridSize) > eps) ? gridSize / 2 : 0;
    furniture.position.x = originX + offsetX + Math.round((furniture.position.x - originX - offsetX) / gridSize) * gridSize;
    furniture.position.z = originZ + offsetZ + Math.round((furniture.position.z - originZ - offsetZ) / gridSize) * gridSize;
  }

  render() {
    if (this.viewMode === '2d') {
      this.render2D();
    }
  }

  render2D() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas2DDisplayWidth, this.canvas2DDisplayHeight);

    // Draw background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, this.canvas2DDisplayWidth, this.canvas2DDisplayHeight);

    // Draw room (with optional grid highlights)
    let highlightLines = null;
    if (this.selectedFurniture) {
      const gridSize = 0.1;
      const originX = -this.roomWidth / 2;
      const originZ = -this.roomDepth / 2;
      const config = this.selectedFurniture.userData.config;
      const pos = this.selectedFurniture.position;
      const rot = this.selectedFurniture.rotation.y;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const halfW = config.width / 2;
      const halfD = config.depth / 2;
      const corners = [
        { x: -halfW, z: -halfD },
        { x: halfW, z: -halfD },
        { x: halfW, z: halfD },
        { x: -halfW, z: halfD }
      ];

      const xLines = new Set();
      const zLines = new Set();
      const eps = 0.002;

      corners.forEach((c) => {
        const worldX = pos.x + c.x * cos - c.z * sin;
        const worldZ = pos.z + c.x * sin + c.z * cos;

        const relX = worldX - originX;
        const relZ = worldZ - originZ;

        let remX = relX % gridSize;
        let remZ = relZ % gridSize;
        if (remX < 0) remX += gridSize;
        if (remZ < 0) remZ += gridSize;

        if (remX < eps || gridSize - remX < eps) {
          const idxX = Math.round(relX / gridSize);
          xLines.add(idxX);
        }
        if (remZ < eps || gridSize - remZ < eps) {
          const idxZ = Math.round(relZ / gridSize);
          zLines.add(idxZ);
        }
      });

      if (xLines.size || zLines.size) {
        highlightLines = { xLines, zLines };
      }
    }

    draw2DRoom(
      ctx,
      this.roomWidth,
      this.roomDepth,
      this.scale,
      this.panOffset.x,
      this.panOffset.y,
      highlightLines
    );

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

    if (this.zoom3DTargetDistance !== null) {
      const currentDistance = this.camera.position.distanceTo(this.controls.target);
      const diff = this.zoom3DTargetDistance - currentDistance;

      if (Math.abs(diff) < 0.01) {
        const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        this.camera.position.copy(this.controls.target.clone().addScaledVector(dir, this.zoom3DTargetDistance));
        this.zoom3DTargetDistance = null;
      } else {
        const newDistance = currentDistance + diff * this.zoom3DLerp;
        const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        this.camera.position.copy(this.controls.target.clone().addScaledVector(dir, newDistance));
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  animate360(time = performance.now()) {
    if (this.viewMode !== '360') return;

    requestAnimationFrame((t) => this.animate360(t));

    const dt = Math.min(0.05, (time - this.view360.lastTime) / 1000);
    this.view360.lastTime = time;

    const move = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) {
      forward.normalize();
    }
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.view360.keys.forward) move.add(forward);
    if (this.view360.keys.back) move.sub(forward);
    if (this.view360.keys.right) move.add(right);
    if (this.view360.keys.left) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.view360.moveSpeed * dt);
      const prev = this.camera.position.clone();
      const next = prev.clone().add(move);
      if (typeof this.room3D?.constrainToWalkableArea === 'function') {
        const constrained = this.room3D.constrainToWalkableArea(
          prev.x,
          prev.z,
          next.x,
          next.z,
          0.2,
          1.6
        );
        this.camera.position.set(constrained.x, this.camera.position.y, constrained.z);
      } else {
        this.camera.position.copy(next);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the application
const app = new BarracksSimulator();
