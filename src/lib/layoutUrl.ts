import { FURNITURE_TYPES, type FurnitureType } from "@/engine/furniture"
import type { LayoutData, LayoutFurnitureItem } from "@/engine/simulator"

const TYPE_TO_CODE: Record<FurnitureType, string> = {
  "single-bed": "sb",
  "bunk-bed": "bb",
  desk: "dk",
  chair: "ch",
  dresser: "dr",
  "dresser-5": "d5",
  "bed-drawer-2": "b2",
  locker: "lk",
  footlocker: "fl",
  nightstand: "ns",
  "trash-bin": "tb",
}

const CODE_TO_TYPE: Record<string, FurnitureType> = Object.fromEntries(
  Object.entries(TYPE_TO_CODE).map(([type, code]) => [code, type as FurnitureType])
)

function formatNum(value: number, decimals = 3): string {
  const fixed = Number(value.toFixed(decimals))
  return Object.is(fixed, -0) ? "0" : String(fixed)
}

function radToCwDeg(rad: number): number {
  const deg = ((-rad * 180) / Math.PI) % 360
  const normalized = (deg + 360) % 360
  return Number(normalized.toFixed(1)) % 360
}

function cwDegToRad(deg: number): number {
  const normalized = ((deg % 360) + 360) % 360
  return (-normalized * Math.PI) / 180
}

export function encodeLayoutToQuery(layout: LayoutData): string {
  const roomStr = [
    formatNum(layout.room.width, 2),
    formatNum(layout.room.depth, 2),
    formatNum(layout.room.height, 2),
  ].join("_")

  const furnitureStr = layout.furniture
    .map((item) => {
      const code = TYPE_TO_CODE[item.type]
      if (!code) return null
      return [
        code,
        formatNum(item.x, 3),
        formatNum(item.z, 3),
        formatNum(radToCwDeg(item.rotation), 1),
      ].join("_")
    })
    .filter((part): part is string => part !== null)
    .join("~")

  return `?r=${roomStr}&f=${furnitureStr}`
}

export function decodeLayoutFromSearch(search: string): LayoutData | null {
  if (!search) return null

  try {
    const params = new URLSearchParams(search)
    const roomParam = params.get("r")
    const furnitureParam = params.get("f")
    if (!roomParam || !furnitureParam) return null

    const roomParts = roomParam.split("_").map(Number)
    if (roomParts.length !== 3 || roomParts.some((n) => !Number.isFinite(n))) {
      return null
    }

    const [rawW, rawD, rawH] = roomParts
    const width = Math.max(2, Math.min(15, rawW))
    const depth = Math.max(2, Math.min(15, rawD))
    const height = Math.max(2, Math.min(4, rawH))

    const furniture: LayoutFurnitureItem[] = []
    for (const token of furnitureParam.split("~")) {
      if (!token) continue
      const parts = token.split("_")
      if (parts.length !== 4) return null

      const [code, xStr, zStr, degStr] = parts
      const type = CODE_TO_TYPE[code]
      if (!type || !(type in FURNITURE_TYPES)) return null

      const x = Number(xStr)
      const z = Number(zStr)
      const deg = Number(degStr)
      if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(deg)) {
        return null
      }

      furniture.push({
        type,
        x,
        z,
        rotation: cwDegToRad(deg),
      })
    }

    if (furniture.length === 0) return null

    return {
      room: { width, depth, height },
      furniture,
    }
  } catch {
    return null
  }
}

export function syncLayoutToUrl(layout: LayoutData): string {
  const query = encodeLayoutToQuery(layout)
  const nextUrl = `${window.location.pathname}${query}${window.location.hash}`
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
    try {
      window.history.replaceState(null, "", nextUrl)
    } catch {
      // Ignore History API throttling errors
    }
  }
  return `${window.location.origin}${nextUrl}`
}
