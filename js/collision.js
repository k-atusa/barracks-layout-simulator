// Collision detection utilities
export class CollisionDetector {
  constructor() {
    this.furniture = [];
  }

  setFurniture(furniture) {
    this.furniture = furniture;
  }

  // Check if a furniture piece collides with any other furniture
  checkCollision(targetFurniture, excludeIndex = -1) {
    const targetBounds = this.getFurnitureBounds(targetFurniture);

    for (let i = 0; i < this.furniture.length; i++) {
      if (i === excludeIndex) continue;

      const otherBounds = this.getFurnitureBounds(this.furniture[i]);

      if (this.boundsOverlap(targetBounds, otherBounds)) {
        return true;
      }
    }

    return false;
  }

  // Get all colliding furniture pairs
  getAllCollisions() {
    const collisions = [];

    for (let i = 0; i < this.furniture.length; i++) {
      for (let j = i + 1; j < this.furniture.length; j++) {
        const bounds1 = this.getFurnitureBounds(this.furniture[i]);
        const bounds2 = this.getFurnitureBounds(this.furniture[j]);

        if (this.boundsOverlap(bounds1, bounds2)) {
          collisions.push([i, j]);
        }
      }
    }

    return collisions;
  }

  // Check if furniture is within room bounds
  checkRoomBounds(furniture, roomBounds) {
    const furnitureBounds = this.getFurnitureBounds(furniture);

    return (
      furnitureBounds.minX >= roomBounds.minX &&
      furnitureBounds.maxX <= roomBounds.maxX &&
      furnitureBounds.minZ >= roomBounds.minZ &&
      furnitureBounds.maxZ <= roomBounds.maxZ
    );
  }

  // Get the bounding box of a furniture piece
  getFurnitureBounds(furniture) {
    const config = furniture.userData.config;
    const position = furniture.position;
    const rotation = furniture.rotation.y;

    // Calculate rotated dimensions
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    const rotatedWidth = config.width * cos + config.depth * sin;
    const rotatedDepth = config.width * sin + config.depth * cos;

    return {
      minX: position.x - rotatedWidth / 2,
      maxX: position.x + rotatedWidth / 2,
      minZ: position.z - rotatedDepth / 2,
      maxZ: position.z + rotatedDepth / 2,
      width: rotatedWidth,
      depth: rotatedDepth
    };
  }

  // Check if two bounding boxes overlap
  boundsOverlap(bounds1, bounds2) {
    const margin = 0.02; // Small margin for numerical precision

    return !(
      bounds1.maxX <= bounds2.minX + margin ||
      bounds1.minX >= bounds2.maxX - margin ||
      bounds1.maxZ <= bounds2.minZ + margin ||
      bounds1.minZ >= bounds2.maxZ - margin
    );
  }

  // Calculate total floor area used by furniture
  calculateUsedArea() {
    let totalArea = 0;

    for (const furniture of this.furniture) {
      const config = furniture.userData.config;
      totalArea += config.width * config.depth;
    }

    return totalArea;
  }

  // Calculate space utilization percentage
  calculateSpaceUtilization(roomWidth, roomDepth) {
    const roomArea = roomWidth * roomDepth;
    const usedArea = this.calculateUsedArea();

    return Math.min(100, (usedArea / roomArea) * 100);
  }

  // Find optimal position for new furniture
  findOptimalPosition(furnitureConfig, roomBounds, existingFurniture) {
    const gridStep = 0.1;
    const positions = [];

    // Generate candidate positions
    for (let x = roomBounds.minX + furnitureConfig.width / 2; x <= roomBounds.maxX - furnitureConfig.width / 2; x += gridStep) {
      for (let z = roomBounds.minZ + furnitureConfig.depth / 2; z <= roomBounds.maxZ - furnitureConfig.depth / 2; z += gridStep) {
        const testBounds = {
          minX: x - furnitureConfig.width / 2,
          maxX: x + furnitureConfig.width / 2,
          minZ: z - furnitureConfig.depth / 2,
          maxZ: z + furnitureConfig.depth / 2
        };

        let valid = true;
        for (const furniture of existingFurniture) {
          const otherBounds = this.getFurnitureBounds(furniture);
          if (this.boundsOverlap(testBounds, otherBounds)) {
            valid = false;
            break;
          }
        }

        if (valid) {
          // Calculate score based on proximity to walls and other furniture
          const wallScore = this.calculateWallProximityScore(x, z, roomBounds);
          const clusterScore = this.calculateClusterScore(x, z, existingFurniture);

          positions.push({
            x,
            z,
            score: wallScore + clusterScore
          });
        }
      }
    }

    // Sort by score and return best position
    positions.sort((a, b) => b.score - a.score);
    return positions.length > 0 ? positions[0] : null;
  }

  calculateWallProximityScore(x, z, roomBounds) {
    // Prefer positions near walls
    const distToLeft = x - roomBounds.minX;
    const distToRight = roomBounds.maxX - x;
    const distToBack = z - roomBounds.minZ;
    const distToFront = roomBounds.maxZ - z;

    const minDist = Math.min(distToLeft, distToRight, distToBack, distToFront);
    return minDist < 0.5 ? 10 : 0;
  }

  calculateClusterScore(x, z, existingFurniture) {
    // Prefer positions that create organized clusters
    let score = 0;

    for (const furniture of existingFurniture) {
      const dist = Math.sqrt(
        Math.pow(x - furniture.position.x, 2) +
        Math.pow(z - furniture.position.z, 2)
      );

      // Reward moderate distance (not too close, not too far)
      if (dist > 0.5 && dist < 2) {
        score += 5;
      }
    }

    return score;
  }
}

// Auto-arrangement algorithms
export class AutoArranger {
  constructor(roomBounds, collisionDetector) {
    this.roomBounds = roomBounds;
    this.collisionDetector = collisionDetector;
  }

  // Arrange furniture in a standard barracks layout
  arrangeBarracksStyle(furniture) {
    const beds = furniture.filter(f => f.userData.type.includes('bed'));
    const desks = furniture.filter(f => f.userData.type === 'desk');
    const chairs = furniture.filter(f => f.userData.type === 'chair');
    const lockers = furniture.filter(f => f.userData.type === 'locker');
    const dressers = furniture.filter(f => f.userData.type === 'dresser');
    const footlockers = furniture.filter(f => f.userData.type === 'footlocker');
    const others = furniture.filter(f =>
      !f.userData.type.includes('bed') &&
      f.userData.type !== 'desk' &&
      f.userData.type !== 'chair' &&
      f.userData.type !== 'locker' &&
      f.userData.type !== 'dresser' &&
      f.userData.type !== 'footlocker'
    );

    const positions = [];

    // Beds along the left wall
    let currentZ = this.roomBounds.minZ + 1.2;
    beds.forEach((bed, index) => {
      const config = bed.userData.config;
      positions.push({
        furniture: bed,
        x: this.roomBounds.minX + config.width / 2 + 0.1,
        z: currentZ,
        rotation: 0
      });
      currentZ += config.depth + 0.3;
    });

    // Lockers along the right wall
    currentZ = this.roomBounds.minZ + 0.5;
    lockers.forEach((locker, index) => {
      const config = locker.userData.config;
      positions.push({
        furniture: locker,
        x: this.roomBounds.maxX - config.width / 2 - 0.1,
        z: currentZ,
        rotation: Math.PI
      });
      currentZ += config.depth + 0.2;
    });

    // Desks along the back wall
    let currentX = this.roomBounds.minX + 1.5;
    desks.forEach((desk, index) => {
      const config = desk.userData.config;
      positions.push({
        furniture: desk,
        x: currentX,
        z: this.roomBounds.minZ + config.depth / 2 + 0.2,
        rotation: 0
      });
      currentX += config.width + 0.3;
    });

    // Chairs in front of desks
    chairs.forEach((chair, index) => {
      if (index < desks.length) {
        const deskPos = positions.find(p => p.furniture === desks[index]);
        if (deskPos) {
          positions.push({
            furniture: chair,
            x: deskPos.x,
            z: deskPos.z + 0.6,
            rotation: 0
          });
        }
      }
    });

    // Footlockers at the foot of beds
    footlockers.forEach((footlocker, index) => {
      if (index < beds.length) {
        const bedPos = positions.find(p => p.furniture === beds[index]);
        if (bedPos) {
          const bedConfig = beds[index].userData.config;
          positions.push({
            furniture: footlocker,
            x: bedPos.x,
            z: bedPos.z + bedConfig.depth / 2 + 0.3,
            rotation: 0
          });
        }
      }
    });

    // Dressers next to beds
    dressers.forEach((dresser, index) => {
      if (index < beds.length) {
        const bedPos = positions.find(p => p.furniture === beds[index]);
        if (bedPos) {
          const bedConfig = beds[index].userData.config;
          const dresserConfig = dresser.userData.config;
          positions.push({
            furniture: dresser,
            x: bedPos.x + bedConfig.width / 2 + dresserConfig.width / 2 + 0.1,
            z: bedPos.z - bedConfig.depth / 2 + dresserConfig.depth / 2,
            rotation: 0
          });
        }
      }
    });

    // Place remaining items in available space
    others.forEach(item => {
      const optimalPos = this.collisionDetector.findOptimalPosition(
        item.userData.config,
        this.roomBounds,
        furniture.filter(f => positions.some(p => p.furniture === f))
      );

      if (optimalPos) {
        positions.push({
          furniture: item,
          x: optimalPos.x,
          z: optimalPos.z,
          rotation: 0
        });
      }
    });

    return positions;
  }

  // Optimize existing layout by minimizing wasted space
  optimizeLayout(furniture) {
    const optimizedPositions = [];

    // Group similar furniture
    const groups = this.groupFurniture(furniture);

    // Arrange each group
    Object.values(groups).forEach(group => {
      this.arrangeGroup(group, optimizedPositions);
    });

    return optimizedPositions;
  }

  groupFurniture(furniture) {
    const groups = {};

    furniture.forEach(item => {
      const type = item.userData.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    });

    return groups;
  }

  arrangeGroup(group, existingPositions) {
    // Simple grid-based arrangement for the group
    group.forEach(item => {
      const optimalPos = this.collisionDetector.findOptimalPosition(
        item.userData.config,
        this.roomBounds,
        existingPositions.map(p => p.furniture)
      );

      if (optimalPos) {
        existingPositions.push({
          furniture: item,
          x: optimalPos.x,
          z: optimalPos.z,
          rotation: 0
        });
      }
    });
  }
}
