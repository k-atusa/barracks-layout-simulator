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

export interface UsableRoomGeometry {
  width: number
  depth: number
  partitionDepth: number
  partitionX: number
}

export class RandomLayoutGenerator {
  private room: UsableRoomGeometry

  constructor(room: UsableRoomGeometry) {
    this.room = room
  }

  generate(furniture: FurnitureGroup[]): ArrangedPosition[] | null {
    if (furniture.length === 0) return []

    // Place larger furniture first for higher placement success
    const sorted = [...furniture].sort((a, b) => {
      const areaA = a.userData.config.width * a.userData.config.depth
      const areaB = b.userData.config.width * b.userData.config.depth
      if (Math.abs(areaA - areaB) < 0.05) return Math.random() - 0.5
      return areaB - areaA
    })

    const maxAttempts = 40
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Slightly relax spacing on later attempts if room is tight
      const clearance = attempt < 25 ? 0.04 : 0.005
      const placed: ArrangedPosition[] = []
      const placedBounds: Bounds2D[] = []
      let allPlaced = true

      for (const item of sorted) {
        const spot = this.findRandomSpot(item, placedBounds, clearance)
        if (!spot) {
          allPlaced = false
          break
        }
        placed.push(spot.pos)
        placedBounds.push(spot.bounds)
      }

      if (allPlaced) {
        return placed
      }
    }

    return null
  }

  private findRandomSpot(
    item: FurnitureGroup,
    placedBounds: Bounds2D[],
    clearance: number
  ): { pos: ArrangedPosition; bounds: Bounds2D } | null {
    const config = item.userData.config
    const rotations = this.shuffle([0, Math.PI / 2, Math.PI, -Math.PI / 2])
    const minX = -this.room.width / 2
    const maxX = this.room.width / 2
    const minZ = -this.room.depth / 2
    const maxZ = this.room.depth / 2
    const partZ = maxZ - this.room.partitionDepth
    const wallMargin = 0.03

    // Phase 1: Random sampling (mix of wall-aligned and free-space positions)
    for (let i = 0; i < 90; i++) {
      const rot = rotations[i % rotations.length]
      const isRotated = Math.abs(Math.sin(rot)) > 0.5
      const effW = isRotated ? config.depth : config.width
      const effD = isRotated ? config.width : config.depth

      const validMinX = minX + effW / 2
      const validMaxX = maxX - effW / 2
      const validMinZ = minZ + effD / 2
      const validMaxZ = maxZ - effD / 2
      if (validMinX > validMaxX || validMinZ > validMaxZ) continue

      let x: number
      let z: number

      if (i < 60) {
        // Biased toward placing along one of the usable walls for cleaner layouts
        const wall = Math.floor(Math.random() * 4)
        if (wall === 0) {
          // Back wall (-Z)
          x = this.randomRange(validMinX, validMaxX)
          z = validMinZ + wallMargin
        } else if (wall === 1) {
          // Left wall (-X)
          x = validMinX + wallMargin
          z = this.randomRange(validMinZ, validMaxZ)
        } else if (wall === 2) {
          // Right wall (+X, main room portion)
          const maxRightZ = partZ - effD / 2
          if (validMinZ > maxRightZ) continue
          x = validMaxX - wallMargin
          z = this.randomRange(validMinZ, maxRightZ)
        } else {
          // Horizontal partition wall (facing main room)
          const maxMainZ = partZ - effD / 2 - wallMargin
          if (validMinZ > maxMainZ) continue
          x = this.randomRange(validMinX, validMaxX)
          z = maxMainZ
        }
      } else {
        // Uniform random anywhere in the room
        x = this.randomRange(validMinX, validMaxX)
        z = this.randomRange(validMinZ, validMaxZ)
      }

      // Snap to 5cm increments for tidy alignment
      x = Math.round(x * 20) / 20
      z = Math.round(z * 20) / 20

      const bounds = this.makeBounds(x, z, effW, effD)
      if (this.isInsideUsableArea(bounds) && !this.overlapsAny(bounds, placedBounds, clearance)) {
        return {
          pos: { furniture: item, x, z, rotation: rot },
          bounds,
        }
      }
    }

    // Phase 2: Randomized grid sweep fallback to guarantee finding any valid gap
    const step = 0.1
    for (const rot of rotations) {
      const isRotated = Math.abs(Math.sin(rot)) > 0.5
      const effW = isRotated ? config.depth : config.width
      const effD = isRotated ? config.width : config.depth

      const xs: number[] = []
      for (let x = minX + effW / 2; x <= maxX - effW / 2 + 0.001; x += step) {
        xs.push(Math.round(x * 100) / 100)
      }
      const zs: number[] = []
      for (let z = minZ + effD / 2; z <= maxZ - effD / 2 + 0.001; z += step) {
        zs.push(Math.round(z * 100) / 100)
      }

      for (const x of this.shuffle(xs)) {
        for (const z of this.shuffle(zs)) {
          const bounds = this.makeBounds(x, z, effW, effD)
          if (
            this.isInsideUsableArea(bounds) &&
            !this.overlapsAny(bounds, placedBounds, clearance)
          ) {
            return {
              pos: { furniture: item, x, z, rotation: rot },
              bounds,
            }
          }
        }
      }
    }

    return null
  }

  private makeBounds(x: number, z: number, width: number, depth: number): Bounds2D {
    return {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      width,
      depth,
    }
  }

  private isInsideUsableArea(b: Bounds2D): boolean {
    const eps = 0.001
    const minX = -this.room.width / 2
    const maxX = this.room.width / 2
    const minZ = -this.room.depth / 2
    const maxZ = this.room.depth / 2
    const partZ = maxZ - this.room.partitionDepth

    if (b.minX < minX - eps || b.maxX > maxX + eps || b.minZ < minZ - eps || b.maxZ > maxZ + eps) {
      return false
    }

    // Exclude bottom-right dressing room area
    if (b.maxX > this.room.partitionX + eps && b.maxZ > partZ + eps) {
      return false
    }

    return true
  }

  private overlapsAny(candidate: Bounds2D, existing: Bounds2D[], clearance: number): boolean {
    for (const other of existing) {
      const separated =
        candidate.maxX + clearance <= other.minX ||
        candidate.minX >= other.maxX + clearance ||
        candidate.maxZ + clearance <= other.minZ ||
        candidate.minZ >= other.maxZ + clearance
      if (!separated) return true
    }
    return false
  }

  private randomRange(min: number, max: number): number {
    if (max <= min) return min
    return min + Math.random() * (max - min)
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
}
