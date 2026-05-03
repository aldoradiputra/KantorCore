'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Node } from './RoadmapApp'

// Hardcoded because SVG fill/stroke attributes don't resolve CSS variables
const PHASE_COLORS: Record<number, string> = {
  0: '#1A2B5A',
  1: '#3B4FC4',
  2: '#0F7B6C',
  3: '#B35A00',
}

const PHASE_LIGHT: Record<number, string> = {
  0: '#E8EBFA',
  1: '#E8EBFA',
  2: '#E0F4F1',
  3: '#FEF3E2',
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
}

type Props = {
  nodes: Node[]
  selected: Node | null
  onSelect: (node: Node) => void
}

function computePositions(nodes: Node[]): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}
  const root = nodes.find(n => n.type === 'root')
  if (!root) return pos
  pos[root.id] = { x: 0, y: 0 }

  const modules = nodes.filter(n => n.type === 'module')
  const radii: Record<number, number> = { 1: 240, 2: 440, 3: 640 }
  // Slight rotation per ring so nodes don't stack radially
  const offsets: Record<number, number> = { 1: 0, 2: 0.18, 3: -0.12 }

  for (const phase of [1, 2, 3]) {
    const ring = modules.filter(m => m.phase === phase)
    const n = ring.length
    ring.forEach((m, i) => {
      const angle = -Math.PI / 2 + offsets[phase] + (i / n) * Math.PI * 2
      pos[m.id] = {
        x: Math.cos(angle) * radii[phase],
        y: Math.sin(angle) * radii[phase],
      }
    })
  }
  return pos
}

// Smooth S-curve through origin between two nodes
function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1} ${y1} C ${x1 * 0.35} ${y1 * 0.35}, ${x2 * 0.35} ${y2 * 0.35}, ${x2} ${y2}`
}

export default function MapView({ nodes, selected, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 900, h: 600 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(0.82)
  const [hovered, setHovered] = useState<string | null>(null)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setPan(p => ({
      x: p.x + e.clientX - lastMouse.current.x,
      y: p.y + e.clientY - lastMouse.current.y,
    }))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(2.5, Math.max(0.25, s * (1 - e.deltaY * 0.0008))))
  }, [])

  const zoomIn  = () => setScale(s => Math.min(2.5, s * 1.2))
  const zoomOut = () => setScale(s => Math.max(0.25, s / 1.2))
  const reset   = () => { setPan({ x: 0, y: 0 }); setScale(0.82) }

  const positions = computePositions(nodes)
  const mapNodes = nodes.filter(n => n.type === 'root' || n.type === 'module')

  const cx = size.w / 2 + pan.x
  const cy = size.h / 2 + pan.y

  return (
    <svg
      ref={svgRef}
      style={{ flex: 1, cursor: 'grab', userSelect: 'none', background: 'var(--bg)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onWheel={onWheel}
    >
      <defs>
        <filter id="shadow-sm" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="rgba(0,0,0,0.10)" />
        </filter>
        <filter id="shadow-md" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(0,0,0,0.16)" />
        </filter>
        {/* Subtle radial gradient background */}
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#EEF1FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F8F9FB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft background glow at center */}
      <ellipse cx={cx} cy={cy} rx={size.w * 0.4} ry={size.h * 0.4} fill="url(#bg-glow)" />

      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>

        {/* Phase ring guides — dashed circles */}
        {([240, 440, 640] as const).map((r, i) => (
          <circle
            key={r}
            cx={0} cy={0} r={r}
            fill="none"
            stroke={PHASE_COLORS[(i + 1) as 1 | 2 | 3]}
            strokeWidth="1"
            strokeOpacity="0.1"
            strokeDasharray="6 10"
          />
        ))}

        {/* Connection lines — draw before nodes so nodes sit on top */}
        {mapNodes
          .filter(n => n.parent && positions[n.parent] && positions[n.id])
          .map((n, i) => {
            const from = positions[n.parent!]
            const to   = positions[n.id]
            const isHot = hovered === n.id || selected?.id === n.id
            return (
              <path
                key={`line-${n.id}`}
                className="map-line"
                d={curvePath(from.x, from.y, to.x, to.y)}
                stroke={PHASE_COLORS[n.phase as keyof typeof PHASE_COLORS]}
                strokeWidth={isHot ? 1.8 : 1}
                strokeOpacity={isHot ? 0.55 : 0.18}
                fill="none"
                style={{
                  animationDelay: `${i * 18}ms`,
                  transition: 'stroke-opacity 0.2s, stroke-width 0.2s',
                }}
              />
            )
          })}

        {/* Nodes */}
        {mapNodes.map((node, i) => {
          const pos = positions[node.id]
          if (!pos) return null

          const isRoot     = node.type === 'root'
          const isSelected = selected?.id === node.id
          const isHovered  = hovered === node.id
          const color      = PHASE_COLORS[node.phase as keyof typeof PHASE_COLORS]
          const lightBg    = PHASE_LIGHT[node.phase as keyof typeof PHASE_LIGHT]
          const w          = isRoot ? 162 : 128
          const h          = isRoot ? 50  : 40
          const label      = node.label.length > 17 ? node.label.slice(0, 16) + '…' : node.label

          return (
            // Outer g: SVG attribute transform for positioning (not CSS)
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect(node) }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Inner g: CSS transform only for hover scale + fade-in animation */}
              <g
                className="map-node"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: `scale(${isHovered || isSelected ? 1.07 : 1})`,
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  animationDelay: `${i * 28}ms`,
                }}
              >
                {/* Pulsing selection ring */}
                {isSelected && (
                  <rect
                    className="map-ring"
                    x={-w / 2 - 7} y={-h / 2 - 7}
                    width={w + 14} height={h + 14}
                    rx={13}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />
                )}

                {/* Card */}
                <rect
                  x={-w / 2} y={-h / 2}
                  width={w} height={h}
                  rx={9}
                  fill={isRoot ? color : lightBg}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  filter={isHovered || isSelected ? 'url(#shadow-md)' : 'url(#shadow-sm)'}
                />

                {/* Label */}
                <text
                  x={0} y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isRoot ? 13 : 11}
                  fontWeight={700}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                  fill={isRoot ? '#FFFFFF' : color}
                >
                  {label}
                </text>

                {/* Status dot for in-progress modules */}
                {!isRoot && node.status === 'in-progress' && (
                  <circle cx={w / 2 - 9} cy={-h / 2 + 9} r={3.5} fill={color} opacity={0.85} />
                )}
              </g>
            </g>
          )
        })}
      </g>

      {/* Phase legend — bottom-left */}
      <g transform={`translate(20, ${size.h - 88})`}>
        {([1, 2, 3] as const).map((phase, i) => (
          <g key={phase} transform={`translate(0, ${i * 22})`}>
            <rect width={10} height={10} rx={2} fill={PHASE_COLORS[phase]} opacity={0.75} y={1} />
            <text x={17} y={10} fontSize={11} fontFamily="-apple-system, sans-serif" fill="#6B7280">
              {PHASE_LABELS[phase]}
            </text>
          </g>
        ))}
      </g>

      {/* Zoom controls — top-right */}
      <g transform={`translate(${size.w - 52}, 16)`}>
        <ZoomButton y={0}  label="+"  onClick={zoomIn}  />
        <ZoomButton y={38} label="−"  onClick={zoomOut} />
        <ZoomButton y={76} label="⟲" onClick={reset}   />
      </g>

      {/* Node count hint */}
      <text
        x={size.w - 54} y={size.h - 14}
        textAnchor="end"
        fontSize={10}
        fontFamily="-apple-system, sans-serif"
        fill="#9CA3AF"
      >
        {mapNodes.length - 1} modules · scroll to zoom · drag to pan
      </text>
    </svg>
  )
}

function ZoomButton({ y, label, onClick }: { y: number; label: string; onClick: () => void }) {
  return (
    <g transform={`translate(0, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        width={34} height={32} rx={7}
        fill="white"
        stroke="#E5E7EB"
        strokeWidth={1}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
      />
      <text
        x={17} y={21}
        textAnchor="middle"
        fontSize={15}
        fontFamily="-apple-system, sans-serif"
        fill="#4A4A5A"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}
