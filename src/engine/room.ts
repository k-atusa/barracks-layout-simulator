import * as THREE from "three"

export interface FloorBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface HighlightLines {
  xLines?: Set<number>
  zLines?: Set<number>
}

interface WallAABB {
  min: THREE.Vector3
  max: THREE.Vector3
}

export interface ConstrainConfig {
  width: number
  depth: number
  allowDressingRoom?: boolean
  prevX?: number
  prevZ?: number
}

export class Room {
  width: number
  depth: number
  height: number
  group: THREE.Group
  grid: THREE.Group | null = null
  walls: THREE.Mesh[] = []
  interiorWalls: THREE.Mesh[] = []
  partitionDepth = 1.5
  partitionX: number
  mainRoomDepth: number
  windowWidth = 1.17
  windowX: number
  entryDoorWidth = 1.0
  entryDoorX: number
  bathDoorWidth = 0.79
  dressDoorWidth = 0.8
  private _wallAABBs: WallAABB[] | null = null

  constructor(width: number, depth: number, height: number) {
    this.width = width
    this.depth = depth
    this.height = height
    this.group = new THREE.Group()

    this.partitionX = -this.width / 2 + 1.16
    this.mainRoomDepth = this.depth - this.partitionDepth
    this.windowX = -this.width / 2 + 0.63 + this.windowWidth / 2
    this.entryDoorX = -this.width / 2 + 0.08 + this.entryDoorWidth / 2

    this.create()
  }

  create() {
    this.createFloor()
    this.createOuterWalls()
    this.createInteriorWalls()
    this.createWindow()
    this.createEntryDoor()
    this.updateWallAABBs()
  }

  createFloor() {
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.mainRoomDepth),
      new THREE.MeshLambertMaterial({ color: 0x8b8b7a, side: THREE.DoubleSide })
    )
    mainFloor.rotation.x = -Math.PI / 2
    mainFloor.position.set(0, 0, -this.depth / 2 + this.mainRoomDepth / 2)
    mainFloor.receiveShadow = true
    mainFloor.name = "floor"
    this.group.add(mainFloor)

    const bathWidth = this.partitionX - -this.width / 2
    const bathFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(bathWidth, this.partitionDepth),
      new THREE.MeshLambertMaterial({ color: 0x8b8b7a, side: THREE.DoubleSide })
    )
    bathFloor.rotation.x = -Math.PI / 2
    bathFloor.position.set(
      -this.width / 2 + bathWidth / 2,
      0.001,
      this.depth / 2 - this.partitionDepth / 2
    )
    bathFloor.receiveShadow = true
    this.group.add(bathFloor)

    const dressWidth = this.width / 2 - this.partitionX
    const dressFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(dressWidth, this.partitionDepth),
      new THREE.MeshLambertMaterial({ color: 0x7a7a6a, side: THREE.DoubleSide })
    )
    dressFloor.rotation.x = -Math.PI / 2
    dressFloor.position.set(
      this.partitionX + dressWidth / 2,
      0.001,
      this.depth / 2 - this.partitionDepth / 2
    )
    dressFloor.receiveShadow = true
    this.group.add(dressFloor)

    const tileSize = 0.1
    const linesMat = new THREE.LineBasicMaterial({
      color: 0x6b6b5a,
      transparent: true,
      opacity: 0.3,
    })
    const gridGroup = new THREE.Group()
    gridGroup.name = "grid"

    const gL = -this.width / 2
    const gR = this.width / 2
    const gT = -this.depth / 2
    const gB = -this.depth / 2 + this.mainRoomDepth
    const bottomZ = this.depth / 2
    const partX = this.partitionX

    const tilesX = Math.floor(this.width / tileSize)
    const tilesZ = Math.floor(this.mainRoomDepth / tileSize)

    for (let i = 0; i <= tilesX; i++) {
      const x = gL + i * tileSize
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.002, gT),
        new THREE.Vector3(x, 0.002, gB),
      ])
      gridGroup.add(new THREE.Line(geo, linesMat))
    }
    for (let i = 0; i <= tilesZ; i++) {
      const z = gT + i * tileSize
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(gL, 0.002, z),
        new THREE.Vector3(gR, 0.002, z),
      ])
      gridGroup.add(new THREE.Line(geo, linesMat))
    }

    const tilesXLeft = Math.floor((partX - gL) / tileSize)
    const tilesZBottom = Math.floor((bottomZ - gB) / tileSize)

    for (let i = 0; i <= tilesXLeft; i++) {
      const x = gL + i * tileSize
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.002, gB),
        new THREE.Vector3(x, 0.002, bottomZ),
      ])
      gridGroup.add(new THREE.Line(geo, linesMat))
    }
    for (let i = 0; i <= tilesZBottom; i++) {
      const z = gB + i * tileSize
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(gL, 0.002, z),
        new THREE.Vector3(partX, 0.002, z),
      ])
      gridGroup.add(new THREE.Line(geo, linesMat))
    }

    this.grid = gridGroup
    this.group.add(gridGroup)
  }

  createOuterWalls() {
    const wm = new THREE.MeshLambertMaterial({ color: 0xe8e4d9, side: THREE.DoubleSide })
    const t = 0.1
    const o = t

    const winLeft = this.windowX - this.windowWidth / 2
    const winRight = this.windowX + this.windowWidth / 2
    const winH = 1.0
    const winY = 1.2

    const blw = winLeft - -this.width / 2
    if (blw > 0) {
      const w = this._box(blw, this.height, t, wm)
      w.position.set(-this.width / 2 + blw / 2, this.height / 2, -this.depth / 2 - o)
      this.group.add(w)
      this.walls.push(w)
    }

    const brw = this.width / 2 - winRight
    if (brw > 0) {
      const w = this._box(brw, this.height, t, wm)
      w.position.set(this.width / 2 - brw / 2, this.height / 2, -this.depth / 2 - o)
      this.group.add(w)
      this.walls.push(w)
    }

    const aboveWinH = this.height - winY - winH
    if (aboveWinH > 0) {
      const w = this._box(this.windowWidth, aboveWinH, t, wm)
      w.position.set(this.windowX, winY + winH + aboveWinH / 2, -this.depth / 2 - o)
      this.group.add(w)
      this.walls.push(w)
    }

    if (winY > 0) {
      const w = this._box(this.windowWidth, winY, t, wm)
      w.position.set(this.windowX, winY / 2, -this.depth / 2 - o)
      this.group.add(w)
      this.walls.push(w)
    }

    const lw = this._box(t, this.height, this.depth, wm)
    lw.position.set(-this.width / 2 - o, this.height / 2, 0)
    this.group.add(lw)
    this.walls.push(lw)

    const rw = this._box(t, this.height, this.depth, wm)
    rw.position.set(this.width / 2 + o, this.height / 2, 0)
    this.group.add(rw)
    this.walls.push(rw)

    const frontZ = this.depth / 2 + o
    const doorLeft = this.entryDoorX - this.entryDoorWidth / 2
    const doorRight = this.entryDoorX + this.entryDoorWidth / 2
    const doorH = 2.1

    const flw = doorLeft - -this.width / 2
    if (flw > 0) {
      const w = this._box(flw, this.height, t, wm)
      w.position.set(-this.width / 2 + flw / 2, this.height / 2, frontZ)
      this.group.add(w)
      this.walls.push(w)
    }

    const frw = this.width / 2 - doorRight
    if (frw > 0) {
      const w = this._box(frw, this.height, t, wm)
      w.position.set(this.width / 2 - frw / 2, this.height / 2, frontZ)
      this.group.add(w)
      this.walls.push(w)
    }

    const aboveDoorH = this.height - doorH
    if (aboveDoorH > 0) {
      const w = this._box(this.entryDoorWidth, aboveDoorH, t, wm)
      w.position.set(this.entryDoorX, doorH + aboveDoorH / 2, frontZ)
      this.group.add(w)
      this.walls.push(w)
    }
  }

  createInteriorWalls() {
    const wm = new THREE.MeshLambertMaterial({ color: 0xd5d0c5, side: THREE.DoubleSide })
    const t = 0.08

    const partZ = this.depth / 2 - this.partitionDepth
    const doorH = 2.1
    const aboveDoor = this.height - doorH

    const hSeg = this.width / 2 - this.partitionX
    if (hSeg > 0) {
      const w = this._box(hSeg, this.height, t, wm)
      w.position.set(this.partitionX + hSeg / 2, this.height / 2, partZ)
      this.group.add(w)
      this.walls.push(w)
      this.interiorWalls.push(w)
    }

    const sideDoorWidth = this.dressDoorWidth
    const sideDoorStart = partZ + 0.215
    const sideDoorEnd = sideDoorStart + sideDoorWidth

    const vSegTop = sideDoorStart - partZ
    if (vSegTop > 0.01) {
      const w = this._box(t, this.height, vSegTop, wm)
      w.position.set(this.partitionX, this.height / 2, partZ + vSegTop / 2)
      this.group.add(w)
      this.walls.push(w)
      this.interiorWalls.push(w)
    }

    const vSegBot = this.depth / 2 - sideDoorEnd
    if (vSegBot > 0) {
      const w = this._box(t, this.height, vSegBot, wm)
      w.position.set(this.partitionX, this.height / 2, sideDoorEnd + vSegBot / 2)
      this.group.add(w)
      this.walls.push(w)
      this.interiorWalls.push(w)
    }

    if (aboveDoor > 0) {
      const w = this._box(t, aboveDoor, sideDoorWidth, wm)
      w.position.set(this.partitionX, doorH + aboveDoor / 2, sideDoorStart + sideDoorWidth / 2)
      this.group.add(w)
      this.walls.push(w)
      this.interiorWalls.push(w)
    }
  }

  createWindow() {
    const winW = this.windowWidth
    const winH = 1.0
    const winY = 1.2

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshLambertMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
    )
    glass.position.set(this.windowX, winY + winH / 2, -this.depth / 2 + 0.01)
    this.group.add(glass)

    const fm = new THREE.MeshLambertMaterial({ color: 0x5d4037 })
    const ft = 0.05

    const topF = new THREE.Mesh(new THREE.BoxGeometry(winW + ft * 2, ft, ft), fm)
    topF.position.set(this.windowX, winY + winH, -this.depth / 2 + 0.02)
    this.group.add(topF)

    const botF = new THREE.Mesh(new THREE.BoxGeometry(winW + ft * 2, ft, ft), fm)
    botF.position.set(this.windowX, winY, -this.depth / 2 + 0.02)
    this.group.add(botF)

    const lF = new THREE.Mesh(new THREE.BoxGeometry(ft, winH, ft), fm)
    lF.position.set(this.windowX - winW / 2 - ft / 2, winY + winH / 2, -this.depth / 2 + 0.02)
    this.group.add(lF)

    const rF = new THREE.Mesh(new THREE.BoxGeometry(ft, winH, ft), fm)
    rF.position.set(this.windowX + winW / 2 + ft / 2, winY + winH / 2, -this.depth / 2 + 0.02)
    this.group.add(rF)
  }

  createEntryDoor() {
    const dw = this.entryDoorWidth
    const dh = 2.1

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(dw - 0.1, dh - 0.05, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 })
    )
    door.position.set(this.entryDoorX, dh / 2, this.depth / 2 + 0.05)
    this.group.add(door)

    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xbdbdbd })
    )
    handle.position.set(this.entryDoorX + dw / 2 - 0.15, dh / 2, this.depth / 2 + 0.1)
    this.group.add(handle)
  }

  private _box(w: number, h: number, d: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.receiveShadow = true
    mesh.name = "wall"
    return mesh
  }

  showGrid(show: boolean) {
    if (this.grid) this.grid.visible = show
  }

  showWalls(show: boolean) {
    this.walls.forEach((w) => {
      w.visible = show
    })
  }

  updateWallAABBs() {
    this.group.updateMatrixWorld(true)
    this._wallAABBs = this.walls.map((w) => {
      const box = new THREE.Box3().setFromObject(w)
      return { min: box.min.clone(), max: box.max.clone() }
    })
  }

  resize(width: number, depth: number, height: number) {
    while (this.group.children.length > 0) {
      const child = this.group.children[0]
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
      this.group.remove(child)
    }

    this.width = width
    this.depth = depth
    this.height = height
    this.walls = []
    this.interiorWalls = []
    this.partitionX = -this.width / 2 + 1.16
    this.mainRoomDepth = this.depth - this.partitionDepth
    this.windowX = -this.width / 2 + 0.63 + this.windowWidth / 2
    this.entryDoorX = -this.width / 2 + 0.08 + this.entryDoorWidth / 2
    this.create()
  }

  private _collidesWithWalls(x: number, z: number, radius: number, eyeHeight = 1.6) {
    const aabbs = this._wallAABBs || []
    const minY = 0
    const maxY = eyeHeight

    for (let i = 0; i < aabbs.length; i++) {
      const { min, max } = aabbs[i]
      if (maxY < min.y || minY > max.y) continue

      if (
        x >= min.x - radius &&
        x <= max.x + radius &&
        z >= min.z - radius &&
        z <= max.z + radius
      ) {
        return true
      }
    }
    return false
  }

  constrainToWalkableArea(
    prevX: number,
    prevZ: number,
    nextX: number,
    nextZ: number,
    radius = 0.2,
    eyeHeight = 1.6
  ) {
    const bounds = {
      minX: -this.width / 2 + radius,
      maxX: this.width / 2 - radius,
      minZ: -this.depth / 2 + radius,
      maxZ: this.depth / 2 - radius,
    }

    const targetX = Math.max(bounds.minX, Math.min(bounds.maxX, nextX))
    const targetZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, nextZ))

    if (!this._wallAABBs) this.updateWallAABBs()

    let curX = prevX
    let curZ = prevZ

    if (!this._collidesWithWalls(targetX, curZ, radius, eyeHeight)) {
      curX = targetX
    }
    if (!this._collidesWithWalls(curX, targetZ, radius, eyeHeight)) {
      curZ = targetZ
    }

    return { x: curX, z: curZ }
  }

  getFloorBounds(): FloorBounds {
    return {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minZ: -this.depth / 2,
      maxZ: -this.depth / 2 + this.mainRoomDepth,
    }
  }

  constrainToUsableArea(x: number, z: number, config: ConstrainConfig) {
    const halfW = config.width / 2
    const halfD = config.depth / 2

    const bounds = {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minZ: -this.depth / 2,
      maxZ: this.depth / 2,
    }

    let clampedX = Math.max(bounds.minX + halfW, Math.min(bounds.maxX - halfW, x))
    let clampedZ = Math.max(bounds.minZ + halfD, Math.min(bounds.maxZ - halfD, z))

    if (!config.allowDressingRoom) {
      const partZ = this.depth / 2 - this.partitionDepth
      const maxLeftX = this.partitionX - halfW
      const maxTopZ = partZ - halfD

      if (clampedX > maxLeftX && clampedZ > maxTopZ) {
        const dx = clampedX - maxLeftX
        const dz = clampedZ - maxTopZ
        if (dx < dz) {
          clampedX = maxLeftX
        } else {
          clampedZ = maxTopZ
        }
      }
    } else {
      const partZ = this.depth / 2 - this.partitionDepth
      const prevX = typeof config.prevX === "number" ? config.prevX : clampedX
      const prevZ = typeof config.prevZ === "number" ? config.prevZ : clampedZ

      if (clampedX > this.partitionX + halfW) {
        if (prevZ <= partZ - halfD && clampedZ > partZ - halfD) {
          clampedZ = partZ - halfD
        } else if (prevZ >= partZ + halfD && clampedZ < partZ + halfD) {
          clampedZ = partZ + halfD
        }
      }

      const sideDoorStart = partZ + 0.215
      const sideDoorEnd = sideDoorStart + this.dressDoorWidth
      const doorMinZ = sideDoorStart + halfD
      const doorMaxZ = sideDoorEnd - halfD
      const inDoor = clampedZ >= doorMinZ && clampedZ <= doorMaxZ

      if (!inDoor) {
        if (prevX <= this.partitionX - halfW && clampedX > this.partitionX - halfW) {
          clampedX = this.partitionX - halfW
        } else if (prevX >= this.partitionX + halfW && clampedX < this.partitionX + halfW) {
          clampedX = this.partitionX + halfW
        }
      }
    }

    return { x: clampedX, z: clampedZ }
  }
}

export function draw2DRoom(
  ctx: CanvasRenderingContext2D,
  width: number,
  depth: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  highlightLines: HighlightLines | null = null,
  showGrid = true,
  isDark = true
) {
  const W = width * scale
  const D = depth * scale
  const partitionDepth = 1.5 * scale
  const mainD = D - partitionDepth
  const partX = (-width / 2 + 1.16) * scale

  ctx.save()
  ctx.translate(offsetX, offsetY)

  // Floors
  ctx.fillStyle = "#8B8B7A"
  ctx.fillRect(-W / 2, -D / 2, W, mainD)

  const bathW = partX - -W / 2
  ctx.fillStyle = "#8B8B7A"
  ctx.fillRect(-W / 2, -D / 2 + mainD, bathW, partitionDepth)

  const dressRoomW = W / 2 - partX
  ctx.fillStyle = "#7A7A6A"
  ctx.fillRect(partX, -D / 2 + mainD, dressRoomW, partitionDepth)

  // Grid
  const gridSize = 0.1 * scale
  if (showGrid) {
    ctx.strokeStyle = "#6B6B5A"
    ctx.lineWidth = 0.5

    for (let x = -W / 2; x <= W / 2 + 0.01; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -D / 2)
      ctx.lineTo(x, -D / 2 + mainD)
      ctx.stroke()
    }
    for (let y = -D / 2; y <= -D / 2 + mainD + 0.01; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-W / 2, y)
      ctx.lineTo(W / 2, y)
      ctx.stroke()
    }

    for (let x = -W / 2; x <= partX + 0.01; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -D / 2 + mainD)
      ctx.lineTo(x, D / 2)
      ctx.stroke()
    }
    for (let y = -D / 2 + mainD; y <= D / 2 + 0.01; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-W / 2, y)
      ctx.lineTo(partX, y)
      ctx.stroke()
    }
  }

  // Highlight grid lines when corners touch
  if (highlightLines && (highlightLines.xLines?.size || highlightLines.zLines?.size)) {
    const gL = -W / 2
    const gR = W / 2
    const gT = -D / 2
    const gB = -D / 2 + mainD
    const xLines = highlightLines.xLines || new Set<number>()
    const zLines = highlightLines.zLines || new Set<number>()

    ctx.save()
    ctx.strokeStyle = "#facc15"
    ctx.lineWidth = 1.5

    xLines.forEach((i) => {
      const x = gL + i * gridSize
      if (x < gL - 1 || x > gR + 1) return

      ctx.beginPath()
      ctx.moveTo(x, gT)
      ctx.lineTo(x, gB)
      ctx.stroke()

      if (x <= partX + 0.5) {
        ctx.beginPath()
        ctx.moveTo(x, gB)
        ctx.lineTo(x, D / 2)
        ctx.stroke()
      }
    })

    zLines.forEach((i) => {
      const z = gT + i * gridSize
      if (z < gT - 1 || z > D / 2 + 1) return

      if (z <= gB + 0.5) {
        ctx.beginPath()
        ctx.moveTo(gL, z)
        ctx.lineTo(gR, z)
        ctx.stroke()
      }

      if (z >= gB - 0.5) {
        ctx.beginPath()
        ctx.moveTo(gL, z)
        ctx.lineTo(partX, z)
        ctx.stroke()
      }
    })

    ctx.restore()
  }

  // Outer walls
  ctx.strokeStyle = isDark ? "#3f3f46" : "#27272a"
  ctx.lineWidth = 8
  const wo = ctx.lineWidth / 2
  const partLineZ = -D / 2 + mainD

  ctx.beginPath()
  ctx.moveTo(-W / 2 - wo, -D / 2 - wo)
  ctx.lineTo(W / 2 + wo, -D / 2 - wo)
  ctx.lineTo(W / 2 + wo, D / 2 + wo)
  ctx.lineTo(-W / 2 - wo, D / 2 + wo)
  ctx.lineTo(-W / 2 - wo, -D / 2 - wo)
  ctx.stroke()

  // Interior partition walls
  ctx.strokeStyle = isDark ? "#52525b" : "#3f3f46"
  ctx.lineWidth = 6

  ctx.beginPath()
  ctx.moveTo(partX, partLineZ)
  ctx.lineTo(W / 2, partLineZ)
  ctx.stroke()

  const sideDoorW = 0.8 * scale
  const sideDoorTop = partLineZ + 0.215 * scale
  const sideDoorBottom = sideDoorTop + sideDoorW

  ctx.beginPath()
  ctx.moveTo(partX, partLineZ)
  ctx.lineTo(partX, sideDoorTop)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(partX, sideDoorBottom)
  ctx.lineTo(partX, D / 2)
  ctx.stroke()

  // Entry door
  const entryDoorW = 1.0 * scale
  const entryDoorXpos = (-width / 2 + 0.08 + 0.5) * scale
  ctx.fillStyle = "#8B8B7A"
  ctx.fillRect(entryDoorXpos - entryDoorW / 2, D / 2 - 4, entryDoorW, 12)

  // Window
  const winW = 1.17 * scale
  const winXpos = (-width / 2 + 0.63 + 1.17 / 2) * scale
  ctx.fillStyle = "#38bdf8"
  ctx.fillRect(winXpos - winW / 2, -D / 2 - 4, winW, 8)

  // Dressing room door opening
  ctx.fillStyle = "#8B8B7A"
  ctx.fillRect(partX - 4, sideDoorTop, 8, sideDoorW)

  // Subtle zone label for dressing room
  ctx.fillStyle = "rgba(255,255,255,0.45)"
  ctx.font = `500 ${Math.max(10, Math.min(12, scale * 0.11))}px "Geist Variable", system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Closet / Dressing", partX + dressRoomW / 2, partLineZ + partitionDepth / 2)

  // Dimension labels
  ctx.fillStyle = isDark ? "#a1a1aa" : "#52525b"
  ctx.font = '500 12px "Geist Variable", system-ui, sans-serif'
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  ctx.fillText(`${width.toFixed(2).replace(/\.00$/, "")}m`, 0, D / 2 + 24)

  ctx.save()
  ctx.translate(-W / 2 - 24, 0)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(`${depth.toFixed(2).replace(/\.00$/, "")}m`, 0, 0)
  ctx.restore()

  ctx.restore()
}
