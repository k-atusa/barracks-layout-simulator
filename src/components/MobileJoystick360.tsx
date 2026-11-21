import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"

interface MobileJoystick360Props {
  onMove: (x: number, y: number) => void
}

const MAX_RADIUS = 36

export function MobileJoystick360({ onMove }: MobileJoystick360Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    return () => {
      onMove(0, 0)
    }
  }, [onMove])

  const updateFromClient = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY
    const dist = Math.hypot(dx, dy)
    const clampedDist = Math.min(dist, MAX_RADIUS)
    const angle = Math.atan2(dy, dx)

    const kx = dist > 0 ? Math.cos(angle) * clampedDist : 0
    const ky = dist > 0 ? Math.sin(angle) * clampedDist : 0

    setKnob({ x: kx, y: ky })

    // Normalized: x right (+1), y forward (+1 when dragging up)
    const normX = kx / MAX_RADIUS
    const normY = -ky / MAX_RADIUS
    onMove(normX, normY)
  }

  const resetStick = () => {
    activePointerIdRef.current = null
    setActive(false)
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="360 movement joystick"
      onPointerDown={(e) => {
        e.stopPropagation()
        if (activePointerIdRef.current !== null) return
        activePointerIdRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        setActive(true)
        updateFromClient(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== activePointerIdRef.current) return
        e.stopPropagation()
        updateFromClient(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== activePointerIdRef.current) return
        e.stopPropagation()
        resetStick()
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== activePointerIdRef.current) return
        e.stopPropagation()
        resetStick()
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="liquid-glass-pill fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] z-30 flex size-28 touch-none select-none items-center justify-center rounded-full"
    >
      {/* Subtle directional guides */}
      <ChevronUp className="pointer-events-none absolute top-2 size-3.5 text-muted-foreground/60" />
      <ChevronDown className="pointer-events-none absolute bottom-2 size-3.5 text-muted-foreground/60" />
      <ChevronLeft className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground/60" />
      <ChevronRight className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground/60" />

      {/* Inner thumb puck */}
      <div
        className={[
          "pointer-events-none size-11 rounded-full border border-white/35 shadow-md transition-transform duration-75",
          active ? "bg-primary/90 scale-105" : "bg-foreground/25",
        ].join(" ")}
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  )
}
