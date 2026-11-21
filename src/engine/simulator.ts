import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  FURNITURE_TYPES,
  create2DFurniture,
  createFurnitureMesh,
  type FurnitureGroup,
  type FurnitureType,
} from "./furniture"
import { Room, draw2DRoom, type HighlightLines } from "./room"
import { CollisionDetector, RandomLayoutGenerator } from "./collision"

export type ViewMode = "2d" | "3d" | "360"

export interface LayoutFurnitureItem {
  type: FurnitureType
  x: number
  z: number
  rotation: number
}

export interface LayoutData {
  room: {
    width: number
    depth: number
    height: number
  }
  furniture: LayoutFurnitureItem[]
}

export interface SimulatorOptions {
  showGrid: boolean
  showWalls: boolean
  snapToGrid: boolean
  showDimensions: boolean
  collisionDetection: boolean
}

export interface FurnitureSnapshot {
  index: number
  type: FurnitureType
  name: string
  width: number
  depth: number
  x: number
  z: number
  rotationDeg: number
  isColliding: boolean
}

export interface SimulatorStateSnapshot {
  viewMode: ViewMode
  room: {
    width: number
    depth: number
    height: number
  }
  options: SimulatorOptions
  furniture: FurnitureSnapshot[]
  selectedIndex: number
  spaceUsage: number
  collisionCount: number
  zoom2DPercent: number
}

export const DEFAULT_LAYOUT: LayoutData = {
  room: {
    width: 3.5,
    depth: 5.05,
    height: 2.6,
  },
  furniture: [
    {
      type: "single-bed",
      x: 1.25,
      z: -0.08000000000000004,
      rotation: Math.PI,
    },
    {
      type: "desk",
      x: -0.5399999999999998,
      z: -2.2249999999999996,
      rotation: 0,
    },
    {
      type: "dresser-5",
      x: 1.4500000000000002,
      z: -2.138778452450518,
      rotation: -Math.PI / 2,
    },
    {
      type: "bed-drawer-2",
      x: 0.4610831414279115,
      z: 0.7249999999999999,
      rotation: Math.PI,
    },
    {
      type: "trash-bin",
      x: -1.55,
      z: -2.3249999999999997,
      rotation: 0,
    },
    {
      type: "chair",
      x: -0.6499999999999999,
      z: -1.625,
      rotation: Math.PI,
    },
  ],
}

export class BarracksSimulatorEngine {
  private wrapper: HTMLElement
  private canvas2D: HTMLCanvasElement
  private canvas3D: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private onStateChange: (state: SimulatorStateSnapshot) => void
  private onLayoutChange?: (layout: LayoutData) => void

  private dpr = window.devicePixelRatio || 1
  private canvas2DDisplayWidth = 0
  private canvas2DDisplayHeight = 0

  private viewMode: ViewMode = "2d"
  private isDark = true
  private disposed = false
  private anim3DId: number | null = null
  private anim360Id: number | null = null
  private resizeObserver: ResizeObserver | null = null

  private view360 = {
    active: false,
    yaw: 0,
    pitch: 0,
    isLooking: false,
    moveSpeed: 1.2,
    lookSensitivity: 0.003,
    baseFov: 60,
    minFov: 25,
    maxFov: 90,
    fovSensitivity: 0.04,
    keys: { forward: false, back: false, left: false, right: false },
    lastTime: 0,
    fovAnim: null as { start: number; from: number; to: number; duration: number } | null,
  }

  private roomWidth = DEFAULT_LAYOUT.room.width
  private roomDepth = DEFAULT_LAYOUT.room.depth
  private roomHeight = DEFAULT_LAYOUT.room.height

  private scale = 100
  private targetScale = 100
  private zoomAnimating = false
  private zoomLerp = 0.2
  private panOffset = { x: 0, y: 0 }

  private zoom3DTargetDistance: number | null = null
  private zoom3DLerp = 0.2

  private furniture: FurnitureGroup[] = []
  private selectedFurniture: FurnitureGroup | null = null
  private selectedIndex = -1

  private isDragging = false
  private isPanning = false
  private dragStart = { x: 0, y: 0 }
  private dragFurnitureStart = { x: 0, z: 0 }
  private panStart = { x: 0, y: 0 }
  private panOffsetStart = { x: 0, y: 0 }

  private options: SimulatorOptions = {
    showGrid: true,
    showWalls: true,
    snapToGrid: true,
    showDimensions: false,
    collisionDetection: true,
  }

  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls!: OrbitControls
  private room3D!: Room
  private raycaster!: THREE.Raycaster
  private mouse!: THREE.Vector2
  private collisionDetector = new CollisionDetector()

  // Bound event listeners for clean teardown
  private boundOnResize: () => void
  private boundOnMouseDown: (e: MouseEvent) => void
  private boundOnMouseMove: (e: MouseEvent) => void
  private boundOnMouseUp: () => void
  private boundOnWheel: (e: WheelEvent) => void
  private boundOnDoubleClick: () => void
  private boundOnKeyDown: (e: KeyboardEvent) => void
  private boundOnKeyUp: (e: KeyboardEvent) => void
  private boundOnPointerLockChange: () => void

  constructor(
    wrapper: HTMLElement,
    canvas2D: HTMLCanvasElement,
    canvas3D: HTMLCanvasElement,
    onStateChange: (state: SimulatorStateSnapshot) => void,
    isDark = true,
    initialLayout: LayoutData = DEFAULT_LAYOUT,
    onLayoutChange?: (layout: LayoutData) => void
  ) {
    this.wrapper = wrapper
    this.canvas2D = canvas2D
    this.canvas3D = canvas3D
    const context = this.canvas2D.getContext("2d")
    if (!context) {
      throw new Error("Could not acquire 2D canvas context")
    }
    this.ctx = context
    this.onStateChange = onStateChange
    this.onLayoutChange = onLayoutChange
    this.isDark = isDark

    this.boundOnResize = () => this.onResize()
    this.boundOnMouseDown = (e) => this.onMouseDown(e)
    this.boundOnMouseMove = (e) => this.onMouseMove(e)
    this.boundOnMouseUp = () => this.onMouseUp()
    this.boundOnWheel = (e) => this.onWheel(e)
    this.boundOnDoubleClick = () => this.onDoubleClick()
    this.boundOnKeyDown = (e) => this.onKeyDown(e)
    this.boundOnKeyUp = (e) => this.onKeyUp(e)
    this.boundOnPointerLockChange = () => this.onPointerLockChange()

    this.setupCanvas()
    this.setup3D()
    this.setupEventListeners()
    this.loadLayoutFromData(initialLayout)
    this.fit2DView()
    this.render()
    this.emitState()
  }

  private setupCanvas() {
    this.dpr = window.devicePixelRatio || 1
    this.canvas2DDisplayWidth = Math.max(1, this.wrapper.clientWidth)
    this.canvas2DDisplayHeight = Math.max(1, this.wrapper.clientHeight)
    this.canvas2D.style.width = `${this.canvas2DDisplayWidth}px`
    this.canvas2D.style.height = `${this.canvas2DDisplayHeight}px`
    this.canvas2D.width = Math.floor(this.canvas2DDisplayWidth * this.dpr)
    this.canvas2D.height = Math.floor(this.canvas2DDisplayHeight * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.canvas3D.width = this.canvas2DDisplayWidth
    this.canvas3D.height = this.canvas2DDisplayHeight

    this.panOffset.x = this.canvas2DDisplayWidth / 2
    this.panOffset.y = this.canvas2DDisplayHeight / 2
  }

  private setup3D() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.isDark ? 0x0b0e16 : 0xeef2f8)

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas3D.width / this.canvas3D.height,
      0.1,
      100
    )
    this.camera.position.set(4.5, 4.8, 6.2)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas3D,
      antialias: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(this.canvas3D.width, this.canvas3D.height, false)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.controls = new OrbitControls(this.camera, this.canvas3D)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.enableZoom = false
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08
    this.controls.minDistance = 2
    this.controls.maxDistance = 18
    this.controls.enabled = false

    // Balanced lighting for modern Three.js color management
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x3f3f46, 0.5)
    this.scene.add(hemiLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)

    this.room3D = new Room(this.roomWidth, this.roomDepth, this.roomHeight)
    this.scene.add(this.room3D.group)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
  }

  private setupEventListeners() {
    window.addEventListener("resize", this.boundOnResize)
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.onResize())
      this.resizeObserver.observe(this.wrapper)
    }

    this.canvas2D.addEventListener("mousedown", this.boundOnMouseDown)
    window.addEventListener("mousemove", this.boundOnMouseMove)
    window.addEventListener("mouseup", this.boundOnMouseUp)
    this.canvas2D.addEventListener("wheel", this.boundOnWheel, { passive: false })
    this.canvas2D.addEventListener("dblclick", this.boundOnDoubleClick)

    this.canvas3D.addEventListener("mousedown", this.boundOnMouseDown)
    this.canvas3D.addEventListener("wheel", this.boundOnWheel, { passive: false })
    this.canvas3D.addEventListener("dblclick", this.boundOnDoubleClick)

    window.addEventListener("keydown", this.boundOnKeyDown)
    window.addEventListener("keyup", this.boundOnKeyUp)
    document.addEventListener("pointerlockchange", this.boundOnPointerLockChange)
  }

  destroy() {
    this.disposed = true
    if (this.anim3DId !== null) cancelAnimationFrame(this.anim3DId)
    if (this.anim360Id !== null) cancelAnimationFrame(this.anim360Id)
    this.exit360View()

    window.removeEventListener("resize", this.boundOnResize)
    this.resizeObserver?.disconnect()

    this.canvas2D.removeEventListener("mousedown", this.boundOnMouseDown)
    window.removeEventListener("mousemove", this.boundOnMouseMove)
    window.removeEventListener("mouseup", this.boundOnMouseUp)
    this.canvas2D.removeEventListener("wheel", this.boundOnWheel)
    this.canvas2D.removeEventListener("dblclick", this.boundOnDoubleClick)

    this.canvas3D.removeEventListener("mousedown", this.boundOnMouseDown)
    this.canvas3D.removeEventListener("wheel", this.boundOnWheel)
    this.canvas3D.removeEventListener("dblclick", this.boundOnDoubleClick)

    window.removeEventListener("keydown", this.boundOnKeyDown)
    window.removeEventListener("keyup", this.boundOnKeyUp)
    document.removeEventListener("pointerlockchange", this.boundOnPointerLockChange)

    this.controls.dispose()
    this.renderer.dispose()
  }

  setTheme(isDark: boolean) {
    this.isDark = isDark
    if (this.scene) {
      this.scene.background = new THREE.Color(isDark ? 0x0b0e16 : 0xeef2f8)
    }
    this.render()
  }

  setViewMode(mode: ViewMode) {
    if (this.viewMode === mode) return
    this.viewMode = mode

    if (this.anim3DId !== null) {
      cancelAnimationFrame(this.anim3DId)
      this.anim3DId = null
    }
    if (this.anim360Id !== null) {
      cancelAnimationFrame(this.anim360Id)
      this.anim360Id = null
    }

    if (mode === "360") {
      this.enter360View()
    } else {
      this.exit360View()
    }

    if (mode === "3d") {
      this.controls.enabled = true
      this.camera.rotation.order = "XYZ"
      this.camera.fov = 60
      this.camera.position.set(4.5, 4.8, 6.2)
      this.controls.target.set(0, 0.5, 0)
      this.camera.updateProjectionMatrix()
      this.onResize()
      this.animate3D()
    } else if (mode === "2d") {
      this.controls.enabled = false
      this.onResize()
      this.render()
    }

    this.emitState()
  }

  private getVisibleCenterOffset() {
    // Account for floating right inspector sidebar (~308px)
    const rightInset = this.viewMode === "360" ? 0 : this.canvas2DDisplayWidth > 768 ? 308 : 0
    return {
      centerX: (this.canvas2DDisplayWidth - rightInset) / 2,
      centerY: this.canvas2DDisplayHeight / 2,
      availW: Math.max(120, this.canvas2DDisplayWidth - rightInset - 110),
      availH: Math.max(120, this.canvas2DDisplayHeight - 100),
    }
  }

  fit2DView() {
    const { centerX, centerY, availW, availH } = this.getVisibleCenterOffset()
    const fitScale = Math.min(availW / this.roomWidth, availH / this.roomDepth)
    this.scale = Math.max(60, Math.min(180, fitScale))
    this.targetScale = this.scale
    this.panOffset.x = centerX
    this.panOffset.y = centerY
    this.render()
    this.emitState()
  }

  zoom2DBy(factor: number) {
    if (this.viewMode !== "2d") return
    this.targetScale = Math.max(50, Math.min(350, this.targetScale * factor))
    this.startZoomAnimation()
  }

  updateRoomDimensions(width: number, depth: number, height: number) {
    if (Number.isNaN(width) || Number.isNaN(depth) || Number.isNaN(height)) return
    this.roomWidth = Math.max(2, Math.min(15, width))
    this.roomDepth = Math.max(2, Math.min(15, depth))
    this.roomHeight = Math.max(2, Math.min(4, height))

    this.room3D.resize(this.roomWidth, this.roomDepth, this.roomHeight)
    this.room3D.showGrid(this.options.showGrid)
    this.room3D.showWalls(this.options.showWalls)

    // Keep existing furniture inside updated bounds
    this.furniture.forEach((f) => this.constrainFurnitureToRoom(f))

    if (this.options.collisionDetection) {
      this.checkCollisions()
    }

    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  setOption<K extends keyof SimulatorOptions>(key: K, value: SimulatorOptions[K]) {
    this.options[key] = value
    if (key === "showGrid") {
      this.room3D.showGrid(value)
    } else if (key === "showWalls") {
      this.room3D.showWalls(value)
    } else if (key === "collisionDetection") {
      if (value) {
        this.checkCollisions()
      } else {
        this.clearCollisionHighlights()
      }
    }
    this.render()
    this.emitState()
  }

  selectFurniture(index: number) {
    if (index < 0 || index >= this.furniture.length) {
      this.deselectFurniture()
      return
    }

    if (this.selectedFurniture) {
      const prevOutline = this.selectedFurniture.getObjectByName("outline") as THREE.Mesh | undefined
      if (prevOutline && prevOutline.material instanceof THREE.MeshBasicMaterial) {
        prevOutline.material.opacity = 0
      }
    }

    this.selectedIndex = index
    this.selectedFurniture = this.furniture[index]

    const outline = this.selectedFurniture.getObjectByName("outline") as THREE.Mesh | undefined
    if (outline && outline.material instanceof THREE.MeshBasicMaterial) {
      outline.material.opacity = 0.45
    }

    this.render()
    this.emitState()
  }

  deselectFurniture() {
    if (this.selectedFurniture) {
      const outline = this.selectedFurniture.getObjectByName("outline") as THREE.Mesh | undefined
      if (outline && outline.material instanceof THREE.MeshBasicMaterial) {
        outline.material.opacity = 0
      }
    }
    this.selectedFurniture = null
    this.selectedIndex = -1
    this.render()
    this.emitState()
  }

  updateSelectedPosition(x: number, z: number) {
    if (!this.selectedFurniture || Number.isNaN(x) || Number.isNaN(z)) return
    this.selectedFurniture.position.x = x
    this.selectedFurniture.position.z = z
    this.constrainFurnitureToRoom(this.selectedFurniture)
    if (this.options.collisionDetection) {
      this.checkCollisions()
    }
    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  updateSelectedRotation(degrees: number) {
    if (!this.selectedFurniture || Number.isNaN(degrees)) return
    const normalized = ((degrees % 360) + 360) % 360
    // UI angle is clockwise in top-down view; Three.js +Y rotation is counter-clockwise
    this.selectedFurniture.rotation.y = (-normalized * Math.PI) / 180
    this._snapFurnitureToGrid(this.selectedFurniture)
    this.constrainFurnitureToRoom(this.selectedFurniture)
    if (this.options.collisionDetection) {
      this.checkCollisions()
    }
    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  rotateSelected(deltaDegrees: number) {
    if (!this.selectedFurniture) return
    const currentDeg = (-this.selectedFurniture.rotation.y * 180) / Math.PI
    this.updateSelectedRotation(currentDeg + deltaDegrees)
  }

  resetLayout() {
    this.loadLayoutFromData(DEFAULT_LAYOUT)
    this.fit2DView()
    this.render()
    this.emitState()
  }

  getLayoutData(): LayoutData {
    return {
      room: {
        width: this.roomWidth,
        depth: this.roomDepth,
        height: this.roomHeight,
      },
      furniture: this.furniture.map((f) => ({
        type: f.userData.type,
        x: f.position.x,
        z: f.position.z,
        rotation: f.rotation.y,
      })),
    }
  }

  private notifyLayoutChange() {
    this.onLayoutChange?.(this.getLayoutData())
  }

  loadLayoutFromData(layout: LayoutData): boolean {
    if (!layout || !layout.room || !Array.isArray(layout.furniture)) return false

    // Remove previous meshes
    this.furniture.forEach((f) => this.scene.remove(f))
    this.furniture = []

    this.roomWidth = Number(layout.room.width) || DEFAULT_LAYOUT.room.width
    this.roomDepth = Number(layout.room.depth) || DEFAULT_LAYOUT.room.depth
    this.roomHeight = Number(layout.room.height) || DEFAULT_LAYOUT.room.height

    this.room3D.resize(this.roomWidth, this.roomDepth, this.roomHeight)
    this.room3D.showGrid(this.options.showGrid)
    this.room3D.showWalls(this.options.showWalls)

    layout.furniture.forEach((item) => {
      if (!(item.type in FURNITURE_TYPES)) return
      const mesh = createFurnitureMesh(item.type)
      if (!mesh) return
      mesh.position.set(item.x, 0, item.z)
      mesh.rotation.y = item.rotation
      this.furniture.push(mesh)
      this.scene.add(mesh)
    })

    this.collisionDetector.setFurniture(this.furniture)
    this.selectedFurniture = null
    this.selectedIndex = -1

    if (this.options.collisionDetection) {
      this.checkCollisions()
    }

    this.render()
    this.emitState()
    this.notifyLayoutChange()
    return true
  }

  randomizeLayout(): boolean {
    if (this.furniture.length === 0) return false

    const generator = new RandomLayoutGenerator({
      width: this.roomWidth,
      depth: this.roomDepth,
      partitionDepth: this.room3D.partitionDepth,
      partitionX: this.room3D.partitionX,
    })

    const positions = generator.generate(this.furniture)
    if (!positions) return false

    positions.forEach((pos) => {
      pos.furniture.position.x = pos.x
      pos.furniture.position.z = pos.z
      pos.furniture.rotation.y = pos.rotation
    })

    if (this.options.collisionDetection) {
      this.checkCollisions()
    }

    this.render()
    this.emitState()
    this.notifyLayoutChange()
    return true
  }

  optimizeSpace() {
    if (this.furniture.length === 0) return

    const bounds = this.room3D.getFloorBounds()

    this.furniture.forEach((f) => {
      const config = f.userData.config
      const pos = f.position

      // Snap rotation to nearest 90 degrees first
      const rotDeg = (f.rotation.y * 180) / Math.PI
      f.rotation.y = (Math.round(rotDeg / 90) * 90 * Math.PI) / 180

      const { effW, effD } = this.getEffectiveDimensions(f)
      const wallThreshold = 0.5

      if (pos.x - effW / 2 < bounds.minX + wallThreshold) {
        pos.x = bounds.minX + effW / 2 + 0.05
      } else if (pos.x + effW / 2 > bounds.maxX - wallThreshold) {
        pos.x = bounds.maxX - effW / 2 - 0.05
      }

      if (pos.z - effD / 2 < bounds.minZ + wallThreshold) {
        pos.z = bounds.minZ + effD / 2 + 0.05
      } else if (pos.z + effD / 2 > bounds.maxZ - wallThreshold) {
        pos.z = bounds.maxZ - effD / 2 - 0.05
      }

      this._snapFurnitureToGrid(f)
      this.constrainFurnitureToRoom(f)
    })

    if (this.options.collisionDetection) {
      this.checkCollisions()
    }

    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  private getEffectiveDimensions(furniture: FurnitureGroup) {
    const config = furniture.userData.config
    const rot = furniture.rotation.y
    const cos = Math.abs(Math.cos(rot))
    const sin = Math.abs(Math.sin(rot))
    return {
      effW: config.width * cos + config.depth * sin,
      effD: config.width * sin + config.depth * cos,
    }
  }

  private constrainFurnitureToRoom(furniture: FurnitureGroup) {
    const { effW, effD } = this.getEffectiveDimensions(furniture)
    const constrained = this.room3D.constrainToUsableArea(
      furniture.position.x,
      furniture.position.z,
      { width: effW, depth: effD }
    )
    furniture.position.x = constrained.x
    furniture.position.z = constrained.z
  }

  private onResize() {
    if (this.disposed) return
    const width = Math.max(1, this.wrapper.clientWidth)
    const height = Math.max(1, this.wrapper.clientHeight)

    this.dpr = window.devicePixelRatio || 1
    this.canvas2DDisplayWidth = width
    this.canvas2DDisplayHeight = height
    this.canvas2D.style.width = `${width}px`
    this.canvas2D.style.height = `${height}px`
    this.canvas2D.width = Math.floor(width * this.dpr)
    this.canvas2D.height = Math.floor(height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.canvas3D.width = width
    this.canvas3D.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)

    const { centerX, centerY } = this.getVisibleCenterOffset()
    this.panOffset.x = centerX
    this.panOffset.y = centerY
    this.render()
  }

  private onMouseDown(e: MouseEvent) {
    const activeCanvas = this.viewMode === "2d" ? this.canvas2D : this.canvas3D
    const rect = activeCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (this.viewMode === "360") {
      if (e.button === 1) {
        e.preventDefault()
        this.animateFovTo(this.view360.baseFov)
        return
      }
      if (document.pointerLockElement !== this.canvas3D) {
        this.canvas3D.requestPointerLock?.()
      }
      return
    }

    if (this.viewMode === "2d") {
      const clicked = this.getFurnitureAt2D(x, y)
      if (clicked) {
        this.selectFurniture(clicked.index)
        this.isDragging = true
        this.dragStart = { x, y }
        this.dragFurnitureStart = {
          x: clicked.furniture.position.x,
          z: clicked.furniture.position.z,
        }
      } else {
        this.deselectFurniture()
        this.isPanning = true
        this.panStart = { x, y }
        this.panOffsetStart = { x: this.panOffset.x, y: this.panOffset.y }
      }
    } else {
      // 3D raycast across all meshes of each furniture group
      this.mouse.x = (x / rect.width) * 2 - 1
      this.mouse.y = -(y / rect.height) * 2 + 1
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.furniture, true)

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object
        while (obj && obj.parent && !this.furniture.includes(obj as FurnitureGroup)) {
          obj = obj.parent
        }
        const index = this.furniture.indexOf(obj as FurnitureGroup)
        if (index !== -1) {
          this.selectFurniture(index)
          return
        }
      }
      this.deselectFurniture()
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.viewMode === "360") {
      if (!this.view360.isLooking) return
      const dx = e.movementX || 0
      const dy = e.movementY || 0
      this.view360.yaw -= dx * this.view360.lookSensitivity
      this.view360.pitch -= dy * this.view360.lookSensitivity
      const maxPitch = Math.PI / 2 - 0.1
      this.view360.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.view360.pitch))
      this.camera.rotation.set(this.view360.pitch, this.view360.yaw, 0, "YXZ")
      return
    }

    if (this.viewMode !== "2d") return
    if (!this.isPanning && !this.isDragging) return

    const rect = this.canvas2D.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (this.isPanning) {
      this.panOffset.x = this.panOffsetStart.x + (x - this.panStart.x)
      this.panOffset.y = this.panOffsetStart.y + (y - this.panStart.y)
      this.render()
      return
    }

    if (!this.isDragging || !this.selectedFurniture) return

    const dx = (x - this.dragStart.x) / this.scale
    const dy = (y - this.dragStart.y) / this.scale

    let newX = this.dragFurnitureStart.x + dx
    let newZ = this.dragFurnitureStart.z + dy

    if (this.options.snapToGrid) {
      const snapped = this.computeSnappedCoords(this.selectedFurniture, newX, newZ)
      newX = snapped.x
      newZ = snapped.z
    }

    this.selectedFurniture.position.x = newX
    this.selectedFurniture.position.z = newZ

    if (this.options.collisionDetection) {
      this.checkCollisions()
    }

    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  private onMouseUp() {
    if (this.viewMode === "360") return

    if (this.isDragging && this.selectedFurniture) {
      this.constrainFurnitureToRoom(this.selectedFurniture)
      if (this.options.collisionDetection) {
        this.checkCollisions()
      }
      this.emitState()
      this.notifyLayoutChange()
    }

    this.isDragging = false
    this.isPanning = false
    this.render()
  }

  private onWheel(e: WheelEvent) {
    if (this.viewMode === "2d") {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.94 : 1.06
      this.targetScale = Math.max(50, Math.min(350, this.targetScale * delta))
      this.startZoomAnimation()
    } else if (this.viewMode === "360") {
      e.preventDefault()
      const deltaFov = e.deltaY * this.view360.fovSensitivity
      this.camera.fov = Math.max(
        this.view360.minFov,
        Math.min(this.view360.maxFov, this.camera.fov + deltaFov)
      )
      this.camera.updateProjectionMatrix()
    } else if (this.viewMode === "3d") {
      e.preventDefault()
      this.start3DZoom(e.deltaY)
    }
  }

  private start3DZoom(deltaY: number) {
    const currentDistance = this.camera.position.distanceTo(this.controls.target)
    const baseDistance = this.zoom3DTargetDistance ?? currentDistance
    const factor = deltaY > 0 ? 1.05 : 0.95
    const min = this.controls.minDistance ?? 2
    const max = this.controls.maxDistance ?? 18
    this.zoom3DTargetDistance = Math.max(min, Math.min(max, baseDistance * factor))
  }

  private startZoomAnimation() {
    if (this.zoomAnimating || this.viewMode !== "2d") return
    this.zoomAnimating = true
    let lastEmittedZoom = Math.round(this.scale)

    const step = () => {
      if (this.disposed || this.viewMode !== "2d") {
        this.zoomAnimating = false
        return
      }
      const diff = this.targetScale - this.scale
      if (Math.abs(diff) < 0.2) {
        this.scale = this.targetScale
        this.zoomAnimating = false
        this.render()
        this.emitState()
        return
      }
      this.scale += diff * this.zoomLerp
      this.render2D()
      const currentZoom = Math.round(this.scale)
      if (currentZoom !== lastEmittedZoom) {
        lastEmittedZoom = currentZoom
        this.emitState()
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  private onDoubleClick() {
    if (this.selectedFurniture) {
      this.rotateSelected(90)
    }
  }

  private enter360View() {
    this.view360.active = true
    this.controls.enabled = false
    this.onResize()

    const mainRoomDepth = this.roomDepth - 1.5
    const startX = 0
    const startZ = -this.roomDepth / 2 + mainRoomDepth / 2
    const startY = 1.6

    this.camera.position.set(startX, startY, startZ)
    this.view360.yaw = 0
    this.view360.pitch = 0
    this.camera.fov = this.view360.baseFov
    this.camera.updateProjectionMatrix()
    this.camera.rotation.order = "YXZ"
    this.camera.rotation.set(0, 0, 0, "YXZ")
    this.view360.lastTime = performance.now()

    if (document.pointerLockElement !== this.canvas3D) {
      this.canvas3D.requestPointerLock?.()
    }

    this.animate360()
  }

  private exit360View() {
    this.view360.active = false
    this.view360.isLooking = false
    this.view360.keys = { forward: false, back: false, left: false, right: false }
    this.view360.fovAnim = null

    if (document.pointerLockElement === this.canvas3D) {
      document.exitPointerLock?.()
    }
  }

  private onPointerLockChange() {
    this.view360.isLooking = document.pointerLockElement === this.canvas3D
  }

  private animateFovTo(targetFov: number, duration = 220) {
    if (this.viewMode !== "360") return
    const clamped = Math.max(this.view360.minFov, Math.min(this.view360.maxFov, targetFov))
    const from = this.camera.fov
    if (Math.abs(from - clamped) < 0.01) return

    const start = performance.now()
    this.view360.fovAnim = { start, from, to: clamped, duration }
    const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

    const step = (now: number) => {
      if (this.disposed || this.viewMode !== "360" || !this.view360.fovAnim) return
      const t = Math.min(1, (now - start) / duration)
      this.camera.fov = from + (clamped - from) * easeInOutQuad(t)
      this.camera.updateProjectionMatrix()
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        this.view360.fovAnim = null
      }
    }
    requestAnimationFrame(step)
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.viewMode === "360") {
      if (e.code === "Escape") {
        this.setViewMode("3d")
        return
      }
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          this.view360.keys.forward = true
          e.preventDefault()
          return
        case "KeyS":
        case "ArrowDown":
          this.view360.keys.back = true
          e.preventDefault()
          return
        case "KeyA":
        case "ArrowLeft":
          this.view360.keys.left = true
          e.preventDefault()
          return
        case "KeyD":
        case "ArrowRight":
          this.view360.keys.right = true
          e.preventDefault()
          return
      }
    }

    const target = e.target as HTMLElement | null
    const tagName = target?.tagName?.toLowerCase()
    if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) {
      return
    }

    if (!this.selectedFurniture) return

    const nudgeStep = this.options.snapToGrid ? 0.1 : 0.02

    switch (e.code) {
      case "KeyR":
        this.rotateSelected(e.shiftKey ? -15 : 15)
        e.preventDefault()
        return
      case "Escape":
        this.deselectFurniture()
        return
      case "ArrowUp":
        e.preventDefault()
        this.selectedFurniture.position.z -= nudgeStep
        break
      case "ArrowDown":
        e.preventDefault()
        this.selectedFurniture.position.z += nudgeStep
        break
      case "ArrowLeft":
        e.preventDefault()
        this.selectedFurniture.position.x -= nudgeStep
        break
      case "ArrowRight":
        e.preventDefault()
        this.selectedFurniture.position.x += nudgeStep
        break
      default:
        return
    }

    this._snapFurnitureToGrid(this.selectedFurniture)
    this.constrainFurnitureToRoom(this.selectedFurniture)
    if (this.options.collisionDetection) {
      this.checkCollisions()
    }
    this.render()
    this.emitState()
    this.notifyLayoutChange()
  }

  private onKeyUp(e: KeyboardEvent) {
    if (this.viewMode !== "360") return
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.view360.keys.forward = false
        break
      case "KeyS":
      case "ArrowDown":
        this.view360.keys.back = false
        break
      case "KeyA":
      case "ArrowLeft":
        this.view360.keys.left = false
        break
      case "KeyD":
      case "ArrowRight":
        this.view360.keys.right = false
        break
    }
  }

  private getFurnitureAt2D(x: number, y: number) {
    const worldX = (x - this.panOffset.x) / this.scale
    const worldZ = (y - this.panOffset.y) / this.scale

    for (let i = this.furniture.length - 1; i >= 0; i--) {
      const furniture = this.furniture[i]
      const config = furniture.userData.config
      const pos = furniture.position
      const rotation = furniture.rotation.y

      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)
      // Inverse of Three.js Y-rotation: x' = x*cos + z*sin, z' = -x*sin + z*cos
      const localX = (worldX - pos.x) * cos - (worldZ - pos.z) * sin
      const localZ = (worldX - pos.x) * sin + (worldZ - pos.z) * cos

      if (Math.abs(localX) <= config.width / 2 && Math.abs(localZ) <= config.depth / 2) {
        return { furniture, index: i }
      }
    }
    return null
  }

  private computeSnappedCoords(furniture: FurnitureGroup, x: number, z: number) {
    const gridSize = 0.1
    const originX = -this.roomWidth / 2
    const originZ = -this.roomDepth / 2
    const { effW, effD } = this.getEffectiveDimensions(furniture)
    const halfW = effW / 2
    const halfD = effD / 2
    const remX = halfW % gridSize
    const remZ = halfD % gridSize
    const eps = 0.001
    const offsetX = remX > eps && Math.abs(remX - gridSize) > eps ? gridSize / 2 : 0
    const offsetZ = remZ > eps && Math.abs(remZ - gridSize) > eps ? gridSize / 2 : 0
    return {
      x: originX + offsetX + Math.round((x - originX - offsetX) / gridSize) * gridSize,
      z: originZ + offsetZ + Math.round((z - originZ - offsetZ) / gridSize) * gridSize,
    }
  }

  private _snapFurnitureToGrid(furniture: FurnitureGroup) {
    if (!this.options.snapToGrid) return
    const snapped = this.computeSnappedCoords(furniture, furniture.position.x, furniture.position.z)
    furniture.position.x = snapped.x
    furniture.position.z = snapped.z
  }

  private clearCollisionHighlights() {
    this.furniture.forEach((f) => {
      f.userData.isColliding = false
      f.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || child.name === "outline" || !child.material) return
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          if (!("color" in mat) || !(mat.color instanceof THREE.Color)) return
          const original = child.userData?.originalColor
          if (original !== undefined) {
            mat.color.setHex(original)
          }
        })
      })
    })
  }

  private checkCollisions() {
    const collisions = this.collisionDetector.getAllCollisions()
    this.clearCollisionHighlights()

    collisions.forEach(([i, j]) => {
      this.furniture[i].userData.isColliding = true
      this.furniture[j].userData.isColliding = true
        ;[this.furniture[i], this.furniture[j]].forEach((f) => {
          f.traverse((child) => {
            if (!(child instanceof THREE.Mesh) || child.name === "outline" || !child.material) return
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat) => {
              if (!("color" in mat) || !(mat.color instanceof THREE.Color)) return
              mat.color.setHex(0xdc2626)
            })
          })
        })
    })
  }

  private emitState() {
    const collisionPairs = this.options.collisionDetection
      ? this.collisionDetector.getAllCollisions().length
      : 0

    const snapshot: SimulatorStateSnapshot = {
      viewMode: this.viewMode,
      room: {
        width: this.roomWidth,
        depth: this.roomDepth,
        height: this.roomHeight,
      },
      options: { ...this.options },
      furniture: this.furniture.map((f, index) => {
        const rawDeg = Math.round((-f.rotation.y * 180) / Math.PI)
        const normalizedDeg = ((rawDeg % 360) + 360) % 360
        return {
          index,
          type: f.userData.type,
          name: f.userData.config.name,
          width: f.userData.config.width,
          depth: f.userData.config.depth,
          x: Number(f.position.x.toFixed(2)),
          z: Number(f.position.z.toFixed(2)),
          rotationDeg: normalizedDeg,
          isColliding: f.userData.isColliding,
        }
      }),
      selectedIndex: this.selectedIndex,
      spaceUsage: this.collisionDetector.calculateSpaceUtilization(this.roomWidth, this.roomDepth),
      collisionCount: collisionPairs,
      zoom2DPercent: Math.round(this.scale),
    }

    this.onStateChange(snapshot)
  }

  render() {
    if (this.disposed) return
    if (this.viewMode === "2d") {
      this.render2D()
    } else if (this.viewMode === "3d") {
      this.renderer.render(this.scene, this.camera)
    }
  }

  private render2D() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas2DDisplayWidth, this.canvas2DDisplayHeight)

    // Atmospheric Liquid Glass backdrop synced with theme
    const w = this.canvas2DDisplayWidth
    const h = this.canvas2DDisplayHeight
    ctx.fillStyle = this.isDark ? "#090c14" : "#eef2f8"
    ctx.fillRect(0, 0, w, h)

    // Soft ambient radial glows for optical glass refraction
    const glow1 = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, Math.max(w, h) * 0.6)
    if (this.isDark) {
      glow1.addColorStop(0, "rgba(56, 189, 248, 0.12)")
      glow1.addColorStop(0.5, "rgba(99, 102, 241, 0.06)")
      glow1.addColorStop(1, "rgba(9, 12, 20, 0)")
    } else {
      glow1.addColorStop(0, "rgba(56, 189, 248, 0.18)")
      glow1.addColorStop(0.5, "rgba(129, 140, 248, 0.09)")
      glow1.addColorStop(1, "rgba(238, 242, 248, 0)")
    }
    ctx.fillStyle = glow1
    ctx.fillRect(0, 0, w, h)

    const glow2 = ctx.createRadialGradient(w * 0.84, h * 0.78, 0, w * 0.84, h * 0.78, Math.max(w, h) * 0.55)
    if (this.isDark) {
      glow2.addColorStop(0, "rgba(168, 85, 247, 0.11)")
      glow2.addColorStop(0.5, "rgba(14, 165, 233, 0.05)")
      glow2.addColorStop(1, "rgba(9, 12, 20, 0)")
    } else {
      glow2.addColorStop(0, "rgba(192, 132, 252, 0.15)")
      glow2.addColorStop(0.5, "rgba(56, 189, 248, 0.08)")
      glow2.addColorStop(1, "rgba(238, 242, 248, 0)")
    }
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, w, h)

    // Subtle dot matrix backdrop
    ctx.fillStyle = this.isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.065)"
    const dotGap = 24
    for (let x = dotGap / 2; x < w; x += dotGap) {
      for (let y = dotGap / 2; y < h; y += dotGap) {
        ctx.fillRect(x, y, 1.5, 1.5)
      }
    }

    let highlightLines: HighlightLines | null = null
    if (this.selectedFurniture && this.options.showGrid) {
      const gridSize = 0.1
      const originX = -this.roomWidth / 2
      const originZ = -this.roomDepth / 2
      const config = this.selectedFurniture.userData.config
      const pos = this.selectedFurniture.position
      const rot = this.selectedFurniture.rotation.y
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      const halfW = config.width / 2
      const halfD = config.depth / 2
      const corners = [
        { x: -halfW, z: -halfD },
        { x: halfW, z: -halfD },
        { x: halfW, z: halfD },
        { x: -halfW, z: halfD },
      ]

      const xLines = new Set<number>()
      const zLines = new Set<number>()
      const eps = 0.002

      corners.forEach((c) => {
        const worldX = pos.x + c.x * cos + c.z * sin
        const worldZ = pos.z - c.x * sin + c.z * cos
        const relX = worldX - originX
        const relZ = worldZ - originZ

        let remX = relX % gridSize
        let remZ = relZ % gridSize
        if (remX < 0) remX += gridSize
        if (remZ < 0) remZ += gridSize

        if (remX < eps || gridSize - remX < eps) {
          xLines.add(Math.round(relX / gridSize))
        }
        if (remZ < eps || gridSize - remZ < eps) {
          zLines.add(Math.round(relZ / gridSize))
        }
      })

      if (xLines.size || zLines.size) {
        highlightLines = { xLines, zLines }
      }
    }

    draw2DRoom(
      ctx,
      this.roomWidth,
      this.roomDepth,
      this.scale,
      this.panOffset.x,
      this.panOffset.y,
      highlightLines,
      this.options.showGrid,
      this.isDark
    )

    this.furniture.forEach((furniture, index) => {
      const isSelected = index === this.selectedIndex
      const isColliding = furniture.userData.isColliding

      create2DFurniture(
        furniture.userData.type,
        ctx,
        this.panOffset.x + furniture.position.x * this.scale,
        this.panOffset.y + furniture.position.z * this.scale,
        furniture.rotation.y,
        this.scale,
        isSelected,
        isColliding
      )
    })

    if (this.options.showDimensions && this.selectedFurniture) {
      this.drawDimensions()
    }
  }

  private drawDimensions() {
    if (!this.selectedFurniture) return
    const ctx = this.ctx
    const furniture = this.selectedFurniture
    const config = furniture.userData.config

    const x = this.panOffset.x + furniture.position.x * this.scale
    const y = this.panOffset.y + furniture.position.z * this.scale
    const width = config.width * this.scale
    const depth = config.depth * this.scale

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-furniture.rotation.y)

    ctx.strokeStyle = "#facc15"
    ctx.fillStyle = "#facc15"
    ctx.font = '600 10px "Geist Variable", system-ui, sans-serif'
    ctx.textAlign = "center"

    ctx.beginPath()
    ctx.moveTo(-width / 2, depth / 2 + 14)
    ctx.lineTo(width / 2, depth / 2 + 14)
    ctx.stroke()
    ctx.fillText(`${config.width}m`, 0, depth / 2 + 25)

    ctx.beginPath()
    ctx.moveTo(width / 2 + 14, -depth / 2)
    ctx.lineTo(width / 2 + 14, depth / 2)
    ctx.stroke()

    ctx.save()
    ctx.translate(width / 2 + 25, 0)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${config.depth}m`, 0, 0)
    ctx.restore()

    ctx.restore()
  }

  private animate3D() {
    if (this.disposed || this.viewMode !== "3d") return
    this.anim3DId = requestAnimationFrame(() => this.animate3D())

    if (this.zoom3DTargetDistance !== null) {
      const currentDistance = this.camera.position.distanceTo(this.controls.target)
      const diff = this.zoom3DTargetDistance - currentDistance

      if (Math.abs(diff) < 0.01) {
        const dir = new THREE.Vector3()
          .subVectors(this.camera.position, this.controls.target)
          .normalize()
        this.camera.position.copy(
          this.controls.target.clone().addScaledVector(dir, this.zoom3DTargetDistance)
        )
        this.zoom3DTargetDistance = null
      } else {
        const newDistance = currentDistance + diff * this.zoom3DLerp
        const dir = new THREE.Vector3()
          .subVectors(this.camera.position, this.controls.target)
          .normalize()
        this.camera.position.copy(
          this.controls.target.clone().addScaledVector(dir, newDistance)
        )
      }
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private animate360(time = performance.now()) {
    if (this.disposed || this.viewMode !== "360") return
    this.anim360Id = requestAnimationFrame((t) => this.animate360(t))

    const dt = Math.min(0.05, (time - this.view360.lastTime) / 1000)
    this.view360.lastTime = time

    const move = new THREE.Vector3()
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() > 0) forward.normalize()

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize()

    if (this.view360.keys.forward) move.add(forward)
    if (this.view360.keys.back) move.sub(forward)
    if (this.view360.keys.right) move.add(right)
    if (this.view360.keys.left) move.sub(right)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.view360.moveSpeed * dt)
      const prev = this.camera.position.clone()
      const next = prev.clone().add(move)
      const constrained = this.room3D.constrainToWalkableArea(
        prev.x,
        prev.z,
        next.x,
        next.z,
        0.2,
        1.6
      )
      this.camera.position.set(constrained.x, this.camera.position.y, constrained.z)
    }

    this.renderer.render(this.scene, this.camera)
  }
}
