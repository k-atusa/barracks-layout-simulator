import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  AlertTriangle,
  Compass,
  LogOut,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InspectorSidebar } from "@/components/InspectorSidebar"
import { decodeLayoutFromSearch, syncLayoutToUrl } from "@/lib/layoutUrl"
import {
  BarracksSimulatorEngine,
  DEFAULT_LAYOUT,
  type LayoutData,
  type SimulatorOptions,
  type SimulatorStateSnapshot,
  type ViewMode,
} from "@/engine/simulator"

const INITIAL_STATE: SimulatorStateSnapshot = {
  viewMode: "2d",
  room: { ...DEFAULT_LAYOUT.room },
  options: {
    showGrid: true,
    showWalls: true,
    snapToGrid: true,
    showDimensions: false,
    collisionDetection: true,
  },
  furniture: [],
  selectedIndex: -1,
  spaceUsage: 0,
  collisionCount: 0,
  zoom2DPercent: 100,
}

export default function App() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvas2DRef = useRef<HTMLCanvasElement>(null)
  const canvas3DRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<BarracksSimulatorEngine | null>(null)

  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  const [simState, setSimState] = useState<SimulatorStateSnapshot>(INITIAL_STATE)
  const urlSyncTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!wrapperRef.current || !canvas2DRef.current || !canvas3DRef.current) return

    const initialLayout = decodeLayoutFromSearch(window.location.search) ?? DEFAULT_LAYOUT
    const scheduleUrlSync = (layout: LayoutData) => {
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
      }
      urlSyncTimerRef.current = window.setTimeout(() => {
        syncLayoutToUrl(layout)
        urlSyncTimerRef.current = null
      }, 200)
    }

    const engine = new BarracksSimulatorEngine(
      wrapperRef.current,
      canvas2DRef.current,
      canvas3DRef.current,
      (snapshot) => setSimState(snapshot),
      isDark,
      initialLayout,
      scheduleUrlSync
    )
    engineRef.current = engine
    syncLayoutToUrl(engine.getLayoutData())

    return () => {
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
        urlSyncTimerRef.current = null
      }
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.setTheme(isDark)
  }, [isDark])

  const is360 = simState.viewMode === "360"

  const handleViewModeChange = (mode: ViewMode) => {
    engineRef.current?.setViewMode(mode)
  }

  const handleCopyShareUrl = async (): Promise<boolean> => {
    const layout = engineRef.current?.getLayoutData()
    if (!layout) return false

    if (urlSyncTimerRef.current !== null) {
      window.clearTimeout(urlSyncTimerRef.current)
      urlSyncTimerRef.current = null
    }
    const shareUrl = syncLayoutToUrl(layout)

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = shareUrl
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      toast.success("Share URL copied to clipboard.")
      return true
    } catch {
      toast.error("Failed to copy URL. You can copy it directly from the address bar.")
      return false
    }
  }

  const handleAutoArrange = () => {
    engineRef.current?.autoArrange()
    toast.success("Applied barracks auto-arrangement.")
  }

  const handleOptimizeSpace = () => {
    engineRef.current?.optimizeSpace()
    toast.success("Aligned furniture to walls and snapped rotations.")
  }

  const handleResetLayout = () => {
    engineRef.current?.resetLayout()
    toast.info("Restored default room and furniture positions.")
  }

  const handleApplyRoomSize = (w: number, d: number, h: number) => {
    engineRef.current?.updateRoomDimensions(w, d, h)
    toast.success(`Updated room size to ${w}m × ${d}m × ${h}m.`)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Full-bleed Canvas Viewport behind floating Liquid Glass UI */}
      <main className="fixed inset-0 z-0">
        <div ref={wrapperRef} className="relative size-full overflow-hidden">
          <canvas
            ref={canvas2DRef}
            className="absolute inset-0 block size-full cursor-grab active:cursor-grabbing"
            style={{ display: simState.viewMode === "2d" ? "block" : "none" }}
          />
          <canvas
            ref={canvas3DRef}
            className="absolute inset-0 block size-full"
            style={{
              display:
                simState.viewMode === "3d" || simState.viewMode === "360" ? "block" : "none",
            }}
          />
        </div>
      </main>

      {/* Floating 2D Zoom Controls */}
      {simState.viewMode === "2d" && (
        <div className="liquid-glass-pill fixed top-3 left-3 z-20 flex items-center gap-1 rounded-full px-1.5 py-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => engineRef.current?.zoom2DBy(0.85)}
                  aria-label="Zoom out"
                  className="rounded-full hover:bg-foreground/10"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>
          <span className="min-w-10 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
            {simState.zoom2DPercent}%
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => engineRef.current?.zoom2DBy(1.18)}
                  aria-label="Zoom in"
                  className="rounded-full hover:bg-foreground/10"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-0.5 h-3.5 self-center bg-foreground/15" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => engineRef.current?.fit2DView()}
                  aria-label="Fit view"
                  className="rounded-full hover:bg-foreground/10"
                >
                  <Maximize2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Center & fit room</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Floating Collision Alert Pill */}
      {!is360 && simState.collisionCount > 0 && (
        <div className="pointer-events-none fixed top-3 left-[calc((100%-308px)/2)] z-20 -translate-x-1/2">
          <Badge
            variant="destructive"
            className="gap-1.5 rounded-full border border-destructive/40 px-3.5 py-1 shadow-lg backdrop-blur-xl"
          >
            <AlertTriangle className="size-3.5" />
            Collision detected ({simState.collisionCount}{" "}
            {simState.collisionCount === 1 ? "overlap" : "overlaps"})
          </Badge>
        </div>
      )}

      {/* 360° Mode Floating Liquid Glass HUD */}
      {is360 && (
        <Card
          size="sm"
          className="liquid-glass-panel fixed top-4 left-4 z-20 w-72 rounded-2xl border-0 ring-0"
        >
          <CardContent className="relative z-10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Compass className="size-4 text-primary" />
                <span>360° First-Person View</span>
              </div>
              <Badge variant="secondary" className="bg-foreground/12 text-[10px]">
                WASD
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Click the room to look around · WASD / Arrows to walk · Scroll to zoom FOV · Press
              Esc to exit.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => engineRef.current?.setViewMode("3d")}
              className="w-full bg-foreground/12 hover:bg-foreground/18"
            >
              <LogOut className="size-3.5" />
              Exit 360° View
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Single-Container Floating Liquid Glass Right Inspector */}
      {!is360 && (
        <InspectorSidebar
          state={simState}
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
          onViewModeChange={handleViewModeChange}
          onDeselectFurniture={() => engineRef.current?.deselectFurniture()}
          onUpdatePosition={(x, z) => engineRef.current?.updateSelectedPosition(x, z)}
          onUpdateRotation={(deg) => engineRef.current?.updateSelectedRotation(deg)}
          onRotateDelta={(delta) => engineRef.current?.rotateSelected(delta)}
          onToggleOption={(key: keyof SimulatorOptions, val: boolean) =>
            engineRef.current?.setOption(key, val)
          }
          onApplyRoomSize={handleApplyRoomSize}
          onAutoArrange={handleAutoArrange}
          onOptimizeSpace={handleOptimizeSpace}
          onCopyShareUrl={handleCopyShareUrl}
          onResetLayout={handleResetLayout}
        />
      )}

      {/* Floating Bottom Shortcuts Pill (wide screens) */}
      {!is360 && (
        <div className="pointer-events-none fixed right-[320px] bottom-3 z-20 hidden xl:block">
          <div className="liquid-glass-pill flex items-center gap-3.5 rounded-full px-3.5 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/12 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Drag
              </kbd>
              Move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/12 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                R
              </kbd>
              Rotate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/12 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Dbl-Click
              </kbd>
              90°
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/12 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Arrows
              </kbd>
              Nudge
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
