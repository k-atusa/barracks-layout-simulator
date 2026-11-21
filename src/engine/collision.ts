import type { FurnitureConfig, FurnitureGroup } from "./furniture"
import type { FloorBounds } from "./room"

export interface Bounds2D {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  width?: number
  depth?: number
}

export interface ArrangedPosition {
  furniture: FurnitureGroup
  x: number
  z: number
  rotation: number
}

export class CollisionDetector {
  furniture: FurnitureGroup[] = []

  setFurniture(furniture: FurnitureGroup[]) {
    this.furniture = furniture
  }

  checkCollision(targetFurniture: FurnitureGroup, excludeIndex = -1) {
    const targetBounds = this.getFurnitureBounds(targetFurniture)

    for (let i = 0; i < this.furniture.length; i++) {
      if (i === excludeIndex) continue
      const otherBounds = this.getFurnitureBounds(this.furniture[i])
      if (this.boundsOverlap(targetBounds, otherBounds)) {
        return true
      }
    }

    return false
  }

  getAllCollisions(): [number, number][] {
    const collisions: [number, number][] = []

    for (let i = 0; i < this.furniture.length; i++) {
      for (let j = i + 1; j < this.furniture.length; j++) {
        const bounds1 = this.getFurnitureBounds(this.furniture[i])
        const bounds2 = this.getFurnitureBounds(this.furniture[j])

        if (this.boundsOverlap(bounds1, bounds2)) {
          collisions.push([i, j])
        }
      }
    }

    return collisions
  }

  checkRoomBounds(furniture: FurnitureGroup, roomBounds: FloorBounds) {
    const furnitureBounds = this.getFurnitureBounds(furniture)
    return (
      furnitureBounds.minX >= roomBounds.minX &&
      furnitureBounds.maxX <= roomBounds.maxX &&
      furnitureBounds.minZ >= roomBounds.minZ &&
      furnitureBounds.maxZ <= roomBounds.maxZ
    )
  }

  getFurnitureBounds(furniture: FurnitureGroup): Bounds2D {
    const config = furniture.userData.config
    const position = furniture.position
    const rotation = furniture.rotation.y

    const cos = Math.abs(Math.cos(rotation))
    const sin = Math.abs(Math.sin(rotation))
    const rotatedWidth = config.width * cos + config.depth * sin
    const rotatedDepth = config.width * sin + config.depth * cos

    return {
      minX: position.x - rotatedWidth / 2,
      maxX: position.x + rotatedWidth / 2,
      minZ: position.z - rotatedDepth / 2,
      maxZ: position.z + rotatedDepth / 2,
      width: rotatedWidth,
      depth: rotatedDepth,
    }
  }

  boundsOverlap(bounds1: Bounds2D, bounds2: Bounds2D) {
    const margin = 0.02
    return !(
      bounds1.maxX <= bounds2.minX + margin ||
      bounds1.minX >= bounds2.maxX - margin ||
      bounds1.maxZ <= bounds2.minZ + margin ||
      bounds1.minZ >= bounds2.maxZ - margin
    )
  }

  calculateUsedArea() {
    let totalArea = 0
    for (const furniture of this.furniture) {
      const config = furniture.userData.config
      totalArea += config.width * config.depth
    }
    return totalArea
  }

  calculateSpaceUtilization(roomWidth: number, roomDepth: number) {
    const roomArea = roomWidth * roomDepth
    if (roomArea <= 0) return 0
    const usedArea = this.calculateUsedArea()
    return Math.min(100, (usedArea / roomArea) * 100)
  }

  findOptimalPosition(
    furnitureConfig: FurnitureConfig,
    roomBounds: FloorBounds,
    existingBounds: Bounds2D[]
  ) {
    const gridStep = 0.1
    const positions: { x: number; z: number; score: number }[] = []

    for (
      let x = roomBounds.minX + furnitureConfig.width / 2;
      x <= roomBounds.maxX - furnitureConfig.width / 2;
      x += gridStep
    ) {
      for (
        let z = roomBounds.minZ + furnitureConfig.depth / 2;
        z <= roomBounds.maxZ - furnitureConfig.depth / 2;
        z += gridStep
      ) {
        const testBounds: Bounds2D = {
          minX: x - furnitureConfig.width / 2,
          maxX: x + furnitureConfig.width / 2,
          minZ: z - furnitureConfig.depth / 2,
          maxZ: z + furnitureConfig.depth / 2,
        }

        let valid = true
        for (const otherBounds of existingBounds) {
          if (this.boundsOverlap(testBounds, otherBounds)) {
            valid = false
            break
          }
        }

        if (valid) {
          const wallScore = this.calculateWallProximityScore(x, z, roomBounds)
          positions.push({ x, z, score: wallScore })
        }
      }
    }

    positions.sort((a, b) => b.score - a.score)
    return positions.length > 0 ? positions[0] : null
  }

  calculateWallProximityScore(x: number, z: number, roomBounds: FloorBounds) {
    const distToLeft = x - roomBounds.minX
    const distToRight = roomBounds.maxX - x
    const distToBack = z - roomBounds.minZ
    const distToFront = roomBounds.maxZ - z

    const minDist = Math.min(distToLeft, distToRight, distToBack, distToFront)
    return minDist < 0.5 ? 10 : 0
  }
}

export class AutoArranger {
  roomBounds: FloorBounds
  collisionDetector: CollisionDetector

  constructor(roomBounds: FloorBounds, collisionDetector: CollisionDetector) {
    this.roomBounds = roomBounds
    this.collisionDetector = collisionDetector
  }

  arrangeBarracksStyle(furniture: FurnitureGroup[]): ArrangedPosition[] {
    const beds = furniture.filter(
      (f) => f.userData.type === "single-bed" || f.userData.type === "bunk-bed"
    )
    const desks = furniture.filter((f) => f.userData.type === "desk")
    const chairs = furniture.filter((f) => f.userData.type === "chair")
    const lockers = furniture.filter((f) => f.userData.type === "locker")
    const dressers = furniture.filter(
      (f) => f.userData.type === "dresser" || f.userData.type === "dresser-5"
    )
    const bedsideChests = furniture.filter(
      (f) => f.userData.type === "bed-drawer-2" || f.userData.type === "nightstand"
    )
    const footlockers = furniture.filter((f) => f.userData.type === "footlocker")

    const assigned = new Set<FurnitureGroup>([
      ...beds,
      ...desks,
      ...chairs,
      ...lockers,
      ...dressers,
      ...bedsideChests,
      ...footlockers,
    ])
    const others = furniture.filter((f) => !assigned.has(f))

    const positions: ArrangedPosition[] = []
    const placedBounds: Bounds2D[] = []

    const pushPos = (item: FurnitureGroup, x: number, z: number, rotation: number) => {
      positions.push({ furniture: item, x, z, rotation })
      const config = item.userData.config
      const cos = Math.abs(Math.cos(rotation))
      const sin = Math.abs(Math.sin(rotation))
      const w = config.width * cos + config.depth * sin
      const d = config.width * sin + config.depth * cos
      placedBounds.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      })
    }

    // Beds along the left wall
    let currentZ = this.roomBounds.minZ + 1.15
    beds.forEach((bed) => {
      const config = bed.userData.config
      pushPos(bed, this.roomBounds.minX + config.width / 2 + 0.05, currentZ, 0)
      currentZ += config.depth + 0.25
    })

    // Bedside chests next to beds
    bedsideChests.forEach((chest, index) => {
      const config = chest.userData.config
      if (index < beds.length) {
        const bedPos = positions.find((p) => p.furniture === beds[index])
        if (bedPos) {
          const bedConfig = beds[index].userData.config
          pushPos(
            chest,
            bedPos.x + bedConfig.width / 2 + config.width / 2 + 0.08,
            bedPos.z - bedConfig.depth / 2 + config.depth / 2,
            0
          )
          return
        }
      }
      const opt = this.collisionDetector.findOptimalPosition(config, this.roomBounds, placedBounds)
      if (opt) pushPos(chest, opt.x, opt.z, 0)
    })

    // Desks along the right/back wall
    let currentX = this.roomBounds.maxX - 0.65
    desks.forEach((desk) => {
      const config = desk.userData.config
      pushPos(
        desk,
        Math.min(this.roomBounds.maxX - config.width / 2 - 0.05, currentX),
        this.roomBounds.minZ + config.depth / 2 + 0.05,
        0
      )
      currentX -= config.width + 0.2
    })

    // Chairs in front of desks
    chairs.forEach((chair, index) => {
      if (index < desks.length) {
        const deskPos = positions.find((p) => p.furniture === desks[index])
        if (deskPos) {
          pushPos(chair, deskPos.x, deskPos.z + 0.62, Math.PI)
          return
        }
      }
      const opt = this.collisionDetector.findOptimalPosition(
        chair.userData.config,
        this.roomBounds,
        placedBounds
      )
      if (opt) pushPos(chair, opt.x, opt.z, 0)
    })

    // Dressers along the right wall
    let dresserZ = this.roomBounds.minZ + 1.55
    dressers.forEach((dresser) => {
      const config = dresser.userData.config
      pushPos(
        dresser,
        this.roomBounds.maxX - config.depth / 2 - 0.05,
        Math.min(this.roomBounds.maxZ - config.width / 2 - 0.05, dresserZ),
        -Math.PI / 2
      )
      dresserZ += config.width + 0.2
    })

    // Lockers along the right wall
    let lockerZ = this.roomBounds.minZ + 0.5
    lockers.forEach((locker) => {
      const config = locker.userData.config
      pushPos(locker, this.roomBounds.maxX - config.width / 2 - 0.05, lockerZ, Math.PI)
      lockerZ += config.depth + 0.2
    })

    // Footlockers at the foot of beds
    footlockers.forEach((footlocker, index) => {
      if (index < beds.length) {
        const bedPos = positions.find((p) => p.furniture === beds[index])
        if (bedPos) {
          const bedConfig = beds[index].userData.config
          pushPos(footlocker, bedPos.x, bedPos.z + bedConfig.depth / 2 + 0.3, 0)
          return
        }
      }
      const opt = this.collisionDetector.findOptimalPosition(
        footlocker.userData.config,
        this.roomBounds,
        placedBounds
      )
      if (opt) pushPos(footlocker, opt.x, opt.z, 0)
    })

    // Place remaining items in available space
    others.forEach((item) => {
      const opt = this.collisionDetector.findOptimalPosition(
        item.userData.config,
        this.roomBounds,
        placedBounds
      )
      if (opt) {
        pushPos(item, opt.x, opt.z, 0)
      }
    })

    return positions
  }
}
