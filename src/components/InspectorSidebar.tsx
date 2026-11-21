import { useEffect, useState } from "react"
import {
  Box,
  Check,
  Compass,
  Grid2x2,
  Home,
  Link2,
  Moon,
  RotateCcw,
  RotateCw,
  Ruler,
  Shuffle,
  Sparkles,
  Sun,
  X,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type {
  FurnitureSnapshot,
  SimulatorOptions,
  SimulatorStateSnapshot,
  ViewMode,
} from "@/engine/simulator"

interface InspectorSidebarProps {
  state: SimulatorStateSnapshot
  isDark: boolean
  onToggleTheme: () => void
  onViewModeChange: (mode: ViewMode) => void
  onDeselectFurniture: () => void
  onUpdatePosition: (x: number, z: number) => void
  onUpdateRotation: (degrees: number) => void
  onRotateDelta: (delta: number) => void
  onToggleOption: <K extends keyof SimulatorOptions>(key: K, value: SimulatorOptions[K]) => void
  onApplyRoomSize: (width: number, depth: number, height: number) => void
  onRandomLayout: () => void
  onOptimizeSpace: () => void
  onCopyShareUrl: () => Promise<boolean>
  onResetLayout: () => void
}

export function InspectorSidebar({
  state,
  isDark,
  onToggleTheme,
  onViewModeChange,
  onDeselectFurniture,
  onUpdatePosition,
  onUpdateRotation,
  onRotateDelta,
  onToggleOption,
  onApplyRoomSize,
  onRandomLayout,
  onOptimizeSpace,
  onCopyShareUrl,
  onResetLayout,
}: InspectorSidebarProps) {
  const [resetOpen, setResetOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const [roomW, setRoomW] = useState(String(state.room.width))
  const [roomD, setRoomD] = useState(String(state.room.depth))
  const [roomH, setRoomH] = useState(String(state.room.height))

  useEffect(() => {
    setRoomW(String(state.room.width))
    setRoomD(String(state.room.depth))
    setRoomH(String(state.room.height))
  }, [state.room.width, state.room.depth, state.room.height])

  const selected: FurnitureSnapshot | null =
    state.selectedIndex >= 0 ? state.furniture[state.selectedIndex] ?? null : null

  const [posX, setPosX] = useState("")
  const [posZ, setPosZ] = useState("")
  const [rotDeg, setRotDeg] = useState("")

  useEffect(() => {
    if (selected) {
      setPosX(selected.x.toFixed(2))
      setPosZ(selected.z.toFixed(2))
      setRotDeg(String(selected.rotationDeg))
    }
  }, [selected?.index, selected?.x, selected?.z, selected?.rotationDeg])

  const handleApplyRoom = (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(roomW)
    const d = parseFloat(roomD)
    const h = parseFloat(roomH)
    if (!Number.isNaN(w) && !Number.isNaN(d) && !Number.isNaN(h)) {
      onApplyRoomSize(w, d, h)
    }
  }

  return (
    <aside className="liquid-glass-panel fixed top-3 right-3 bottom-3 z-20 flex w-[296px] flex-col overflow-hidden rounded-2xl">
      {/* Sidebar Top: Brand + Theme Toggle */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <Home className="size-4 text-foreground" />
          <h1 className="text-sm font-semibold tracking-tight">Barracks Layout Simulator</h1>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleTheme}
                aria-label="Toggle theme"
                className="rounded-lg hover:bg-foreground/10"
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            }
          />
          <TooltipContent side="left">Switch to {isDark ? "light" : "dark"} mode</TooltipContent>
        </Tooltip>
      </div>

      {/* View Mode Switcher (Pill buttons directly in row — no outer container) */}
      <div
        role="tablist"
        aria-label="View mode"
        className="relative z-10 flex shrink-0 items-center gap-1.5 border-b border-foreground/10 px-4 pb-3"
      >
        {(
          [
            { id: "2d", label: "2D View", icon: Grid2x2 },
            { id: "3d", label: "3D View", icon: Box },
            { id: "360", label: "360°", icon: Compass },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const isActive = state.viewMode === id
          return (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              size="sm"
              variant={isActive ? "default" : "ghost"}
              onClick={() => onViewModeChange(id)}
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
      </div>

      <ScrollArea className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-col">
          {/* Selected Furniture */}
          <section className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Selected Furniture
              </h2>
              {selected && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-foreground/12 font-mono text-[10px]">
                    {selected.width}×{selected.depth}m
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onDeselectFurniture}
                    aria-label="Deselect furniture"
                    className="hover:bg-foreground/10"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {selected ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-foreground">{selected.name}</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pos-x" className="text-xs text-muted-foreground">
                      X Position (m)
                    </Label>
                    <Input
                      id="pos-x"
                      type="number"
                      step="0.1"
                      value={posX}
                      onChange={(e) => {
                        setPosX(e.target.value)
                        const val = parseFloat(e.target.value)
                        if (!Number.isNaN(val)) {
                          onUpdatePosition(val, selected.z)
                        }
                      }}
                      className="liquid-glass-input h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pos-z" className="text-xs text-muted-foreground">
                      Z Position (m)
                    </Label>
                    <Input
                      id="pos-z"
                      type="number"
                      step="0.1"
                      value={posZ}
                      onChange={(e) => {
                        setPosZ(e.target.value)
                        const val = parseFloat(e.target.value)
                        if (!Number.isNaN(val)) {
                          onUpdatePosition(selected.x, val)
                        }
                      }}
                      className="liquid-glass-input h-8 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rotation" className="text-xs text-muted-foreground">
                      Rotation
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="rotation"
                        type="number"
                        min={0}
                        max={360}
                        step={15}
                        value={rotDeg}
                        onChange={(e) => {
                          setRotDeg(e.target.value)
                          const val = parseFloat(e.target.value)
                          if (!Number.isNaN(val)) {
                            onUpdateRotation(val)
                          }
                        }}
                        className="liquid-glass-input h-7 w-16 text-right font-mono text-xs"
                      />
                      <span className="text-xs text-muted-foreground">°</span>
                    </div>
                  </div>
                  <Slider
                    value={[selected.rotationDeg]}
                    min={0}
                    max={360}
                    step={15}
                    onValueChange={(value) => {
                      const next = Array.isArray(value) ? value[0] : value
                      if (typeof next === "number") {
                        onUpdateRotation(next)
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRotateDelta(-90)}
                    className="border-foreground/15 bg-foreground/8 hover:bg-foreground/14"
                  >
                    <RotateCcw className="size-3.5" />
                    -90°
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRotateDelta(90)}
                    className="border-foreground/15 bg-foreground/8 hover:bg-foreground/14"
                  >
                    <RotateCw className="size-3.5" />
                    +90°
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Click any furniture item on the canvas to adjust its position and rotation.
              </p>
            )}
          </section>

          <Separator className="bg-foreground/10" />

          {/* Display & Snap Options */}
          <section className="flex flex-col gap-3 p-4">
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Options
            </h2>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  { id: "showGrid", label: "Show Grid" },
                  { id: "showWalls", label: "Show Walls (3D)" },
                  { id: "snapToGrid", label: "Snap to Grid" },
                  { id: "showDimensions", label: "Show Dimensions" },
                  { id: "collisionDetection", label: "Collision Detection" },
                ] as const
              ).map((opt) => (
                <div key={opt.id} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer text-xs font-normal">
                    {opt.label}
                  </Label>
                  <Switch
                    id={`opt-${opt.id}`}
                    size="sm"
                    checked={state.options[opt.id]}
                    onCheckedChange={(checked) => onToggleOption(opt.id, checked)}
                  />
                </div>
              ))}
            </div>
          </section>

          <Separator className="bg-foreground/10" />

          {/* Layout & Optimization Actions */}
          <section className="flex flex-col gap-2.5 p-4">
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Layout Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="default" size="sm" onClick={onRandomLayout}>
                <Shuffle className="size-3.5" />
                Random
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOptimizeSpace}
                className="bg-foreground/12 hover:bg-foreground/18"
              >
                <Sparkles className="size-3.5" />
                Optimize
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ok = await onCopyShareUrl()
                  if (ok) {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1800)
                  }
                }}
                className="border-foreground/15 bg-foreground/8 hover:bg-foreground/14"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Link2 className="size-3.5" />}
                {copied ? "Copied!" : "Share URL"}
              </Button>

              <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="sm" className="w-full">
                      <RotateCcw className="size-3.5" />
                      Reset Layout
                    </Button>
                  }
                />
                <AlertDialogContent size="sm" className="liquid-glass-panel border-0 ring-0">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset furniture layout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This restores the default room dimensions and returns all existing furniture
                      items to their initial positions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="border-foreground/10 bg-foreground/[0.04]">
                    <AlertDialogCancel className="border-foreground/15 bg-foreground/8 hover:bg-foreground/14">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => {
                        onResetLayout()
                        setResetOpen(false)
                      }}
                    >
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>

          <Separator className="bg-foreground/10" />

          {/* Room Settings */}
          <section className="flex flex-col gap-3 p-4">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <Ruler className="size-3.5" />
              Room Dimensions
            </h2>
            <form onSubmit={handleApplyRoom} className="flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="room-width" className="text-[11px] text-muted-foreground">
                    Width (m)
                  </Label>
                  <Input
                    id="room-width"
                    type="number"
                    min={2}
                    max={15}
                    step={0.1}
                    value={roomW}
                    onChange={(e) => setRoomW(e.target.value)}
                    className="liquid-glass-input h-8 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="room-depth" className="text-[11px] text-muted-foreground">
                    Depth (m)
                  </Label>
                  <Input
                    id="room-depth"
                    type="number"
                    min={2}
                    max={15}
                    step={0.05}
                    value={roomD}
                    onChange={(e) => setRoomD(e.target.value)}
                    className="liquid-glass-input h-8 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="room-height" className="text-[11px] text-muted-foreground">
                    Height (m)
                  </Label>
                  <Input
                    id="room-height"
                    type="number"
                    min={2}
                    max={4}
                    step={0.1}
                    value={roomH}
                    onChange={(e) => setRoomH(e.target.value)}
                    className="liquid-glass-input h-8 font-mono text-xs"
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full bg-foreground/12 hover:bg-foreground/18"
              >
                Apply Dimensions
              </Button>
            </form>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
