import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  AlertTriangle,
  Box,
  Compass,
  Grid2x2,
  LogOut,
  Maximize2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { InspectorSidebar } from "@/components/InspectorSidebar"
import { MobileJoystick360 } from "@/components/MobileJoystick360"
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [isTouchOrMobile, setIsTouchOrMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
      : false
  )
  const urlSyncTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const updateDeviceMode = () => {
      const mobileOrTouch =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
      setIsTouchOrMobile(mobileOrTouch)
      if (window.innerWidth >= 768) {
        setMobileSheetOpen(false)
      }
    }
    window.addEventListener("resize", updateDeviceMode)
    return () => window.removeEventListener("resize", updateDeviceMode)
  }, [])

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
  const selectedFurniture =
    simState.selectedIndex >= 0 ? simState.furniture[simState.selectedIndex] ?? null : null

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "360") {
      setMobileSheetOpen(false)
    }
    engineRef.current?.setViewMode(mode)
  }

  const handleJoystickMove = useCallback((x: number, y: number) => {
    engineRef.current?.set360VirtualMove(x, y)
  }, [])

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

  const handleRandomLayout = () => {
    const ok = engineRef.current?.randomizeLayout()
    if (ok) {
      toast.success("Generated a new non-overlapping random layout.")
    } else {
      toast.error("Could not fit all furniture without overlap in the current room size.")
    }
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
    <div className="relative h-dvh w-screen overflow-hidden bg-background text-foreground">
      {/* Full-bleed Canvas Viewport behind floating Liquid Glass UI */}
      <main className="fixed inset-0 z-0">
        <div ref={wrapperRef} className="relative size-full overflow-hidden">
          <canvas
            ref={canvas2DRef}
            className="absolute inset-0 block size-full touch-none cursor-grab active:cursor-grabbing"
            style={{ display: simState.viewMode === "2d" ? "block" : "none" }}
          />
          <canvas
            ref={canvas3DRef}
            className="absolute inset-0 block size-full touch-none"
            style={{
              display:
                simState.viewMode === "3d" || simState.viewMode === "360" ? "block" : "none",
            }}
          />
        </div>
      </main>

      {/* Floating 2D Zoom Controls */}
      {simState.viewMode === "2d" && (
        <div className="liquid-glass-pill fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-20 flex items-center gap-1 rounded-full px-1.5 py-1">
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
        <div className="pointer-events-none fixed top-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))] left-1/2 z-20 -translate-x-1/2 md:top-3 md:left-[calc((100%-308px)/2)]">
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

      {/* 360° Mode Compact Floating Guide Pill */}
      {is360 && (
        <div className="liquid-glass-pill fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-20 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full py-1 pr-1.5 pl-3 text-[11px] text-muted-foreground sm:gap-2.5 sm:text-xs">
          {isTouchOrMobile ? (
            <>
              <span>
                <strong className="font-medium text-foreground">Drag</strong> Look
              </span>
              <span>·</span>
              <span>
                <strong className="font-medium text-foreground">Stick</strong> Move
              </span>
              <span>·</span>
              <span>
                <strong className="font-medium text-foreground">Pinch</strong> Zoom
              </span>
            </>
          ) : (
            <>
              <span>
                <strong className="font-medium text-foreground">Click</strong> Look
              </span>
              <span>·</span>
              <span>
                <strong className="font-medium text-foreground">WASD</strong> Move
              </span>
              <span>·</span>
              <span>
                <strong className="font-medium text-foreground">Scroll</strong> Zoom
              </span>
            </>
          )}
          <Separator orientation="vertical" className="h-3.5 self-center bg-foreground/15" />
          <Button
            variant="ghost"
            size="xs"
            onClick={() => engineRef.current?.setViewMode("3d")}
            className="rounded-full px-2.5 hover:bg-foreground/12"
          >
            <LogOut className="size-3" />
            {isTouchOrMobile ? "Exit" : "Exit (Esc)"}
          </Button>
        </div>
      )}

      {/* 360° Mode Touch Virtual Joystick */}
      {is360 && isTouchOrMobile && <MobileJoystick360 onMove={handleJoystickMove} />}

      {/* Responsive Floating Inspector (Desktop Right Sidebar / Mobile Bottom Sheet) */}
      {!is360 && (
        <InspectorSidebar
          state={simState}
          isDark={isDark}
          mobileOpen={mobileSheetOpen}
          onMobileClose={() => setMobileSheetOpen(false)}
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
          onRandomLayout={handleRandomLayout}
          onOptimizeSpace={handleOptimizeSpace}
          onCopyShareUrl={handleCopyShareUrl}
          onResetLayout={handleResetLayout}
        />
      )}

      {/* Mobile Selected Furniture Quick-Action Pill */}
      {!is360 && selectedFurniture && (
        <div
          className={[
            "liquid-glass-pill fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+3.75rem)] left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-full py-1 pr-1.5 pl-3 transition-[translate,opacity] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
            mobileSheetOpen
              ? "translate-y-4 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100 pointer-events-auto",
          ].join(" ")}
        >
          <span className="max-w-28 truncate text-xs font-medium text-foreground">
            {selectedFurniture.name}
          </span>
          <Separator orientation="vertical" className="mx-1 h-3.5 self-center bg-foreground/15" />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => engineRef.current?.rotateSelected(-90)}
            aria-label="Rotate -90 degrees"
            className="rounded-full hover:bg-foreground/10"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => engineRef.current?.rotateSelected(90)}
            aria-label="Rotate +90 degrees"
            className="rounded-full hover:bg-foreground/10"
          >
            <RotateCw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Edit selected furniture details"
            className="rounded-full hover:bg-foreground/10"
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => engineRef.current?.deselectFurniture()}
            aria-label="Deselect furniture"
            className="rounded-full hover:bg-foreground/10"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Mobile Bottom Floating Navigation Dock */}
      {!is360 && (
        <div
          className={[
            "liquid-glass-pill fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center gap-1 rounded-full p-1.5 transition-[translate,opacity] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
            mobileSheetOpen
              ? "translate-y-6 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100 pointer-events-auto",
          ].join(" ")}
        >
          {(
            [
              { id: "2d", label: "2D", icon: Grid2x2 },
              { id: "3d", label: "3D", icon: Box },
              { id: "360", label: "360°", icon: Compass },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const isActive = simState.viewMode === id
            return (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleViewModeChange(id)}
                className={
                  isActive
                    ? "flex-1 rounded-full font-semibold shadow-sm"
                    : "flex-1 rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                }
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            )
          })}
          <Separator orientation="vertical" className="mx-0.5 h-5 self-center bg-foreground/15" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Open properties"
            className="rounded-full hover:bg-foreground/10"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      )}

      {/* Floating Bottom Shortcuts Pill (wide desktop screens) */}
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
