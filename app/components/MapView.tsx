'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Node } from '../types'

// Aligned with CSS variables in globals.css
const PHASE_COLORS: Record<number, string> = {
  0: '#1A2B5A',   // --navy
  1: '#3B4FC4',   // --indigo
  2: '#0F7B6C',   // --teal
  3: '#B35A00',   // --amber
}

const PHASE_LIGHT: Record<number, string> = {
  0: '#E8EBFA',   // --indigo-light
  1: '#E8EBFA',   // --indigo-light
  2: '#E0F4F1',   // --teal-light
  3: '#FEF3E2',   // --amber-light
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
}

// Visual size config per node level
const NODE_SIZE: Record<string, { w: number; h: number; rx: number; fontSize: number }> = {
  root:           { w: 162, h: 50, rx: 10, fontSize: 13 },
  module:         { w: 130, h: 40, rx: 9,  fontSize: 11 },
  app:            { w: 110, h: 32, rx: 7,  fontSize: 10 },
  feature:        { w: 96,  h: 26, rx: 6,  fontSize: 9  },
  infrastructure: { w: 96,  h: 26, rx: 6,  fontSize: 9  },
}

type Props = {
  nodes: Node[]
  selected: Node | null
  onSelect: (node: Node) => void
}

// Fan children around parentPos at a given outward angle
function placeChildren(
  parentPos: { x: number; y: number },
  outAngle: number,
  children: Node[],
  radius: number,
  pos: Record<string, { x: number; y: number }>
) {
  const n = children.length
  if (n === 0) return
  const targetStep = Math.PI / 5   // 36° preferred gap
  const maxArc     = Math.PI * 1.1 // never more than ~200°
  const totalArc   = Math.min((n - 1) * targetStep, maxArc)
  const step       = n > 1 ? totalArc / (n - 1) : 0
  const start      = outAngle - totalArc / 2

  children.forEach((child, i) => {
    const angle = start + i * step
    pos[child.id] = {
      x: parentPos.x + Math.cos(angle) * radius,
      y: parentPos.y + Math.sin(angle) * radius,
    }
  })
}

function computePositions(
  nodes: Node[],
  expanded: Set<string>
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}

  const root = nodes.find(n => n.type === 'root')
  if (!root) return pos
  pos[root.id] = { x: 0, y: 0 }

  // Place modules in phase rings
  const modules = nodes.filter(n => n.type === 'module')
  const radii:   Record<number, number> = { 1: 240, 2: 440, 3: 640 }
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

  // For each expanded module, fan its apps outward
  for (const mod of modules) {
    if (!expanded.has(mod.id)) continue
    const modPos = pos[mod.id]
    if (!modPos) continue

    const apps = nodes.filter(n => n.parent === mod.id && n.type === 'app')
    const outAngle = Math.atan2(modPos.y, modPos.x)

    if (apps.length > 0) {
      placeChildren(modPos, outAngle, apps, 170, pos)

      // For each expanded app, fan its features outward from the app
      for (const app of apps) {
        if (!expanded.has(app.id)) continue
        const appPos = pos[app.id]
        if (!appPos) continue
        const features = nodes.filter(n => n.parent === app.id)
        const appAngle = Math.atan2(appPos.y - modPos.y, appPos.x - modPos.x)
        placeChildren(appPos, appAngle, features, 140, pos)
      }
    } else {
      // Module has direct features (no app layer)
      const features = nodes.filter(n => n.parent === mod.id)
      placeChildren(modPos, outAngle, features, 155, pos)
    }
  }

  return pos
}

// Straight-ish bezier that curves gently through the midpoint
function edgePath(x1: number, y1: number, x2: number, y2: number, deep: boolean): string {
  if (deep) {
    // For module→root: S-curve through origin
    return `M ${x1} ${y1} C ${x1 * 0.35} ${y1 * 0.35}, ${x2 * 0.35} ${y2 * 0.35}, ${x2} ${y2}`
  }
  // For app/feature: gentle quadratic
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`
}

export default function MapView({ nodes, selected, onSelect }: Props) {
  const svgRef   = useRef<SVGSVGElement>(null)
  const [size, setSize]       = useState({ w: 900, h: 600 })
  const [pan, setPan]         = useState({ x: 0, y: 0 })
  const [scale, setScale]     = useState(0.82)
  const [hovered, setHovered] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const dragging  = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const didDrag   = useRef(false)

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
    didDrag.current = false
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) didDrag.current = true
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(2.5, Math.max(0.2, s * (1 - e.deltaY * 0.0008))))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const positions = computePositions(nodes, expanded)

  // Determine which nodes are visible
  const visibleNodes = nodes.filter(n => {
    if (n.type === 'root' || n.type === 'module') return true
    if (!n.parent) return false
    return expanded.has(n.parent)
  })

  // Pre-compute children counts for expand button
  const childCount = new Map<string, number>()
  nodes.forEach(n => {
    if (n.parent) childCount.set(n.parent, (childCount.get(n.parent) ?? 0) + 1)
  })

  const cx = size.w / 2 + pan.x
  const cy = size.h / 2 + pan.y

  return (
    <svg
      ref={svgRef}
      style={{ flex: 1, cursor: dragging.current ? 'grabbing' : 'grab', userSelect: 'none', background: 'var(--bg)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onWheel={onWheel}
    >
      <defs>
        <filter id="shadow-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.09)" />
        </filter>
        <filter id="shadow-md" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
        </filter>
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#EEF1FF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F8F9FB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Center glow */}
      <ellipse cx={cx} cy={cy} rx={size.w * 0.38} ry={size.h * 0.38} fill="url(#bg-glow)" />

      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>

        {/* Phase ring guides */}
        {([240, 440, 640] as const).map((r, i) => (
          <circle key={r} cx={0} cy={0} r={r}
            fill="none" stroke={PHASE_COLORS[i + 1]} strokeWidth="1"
            strokeOpacity="0.1" strokeDasharray="6 10"
          />
        ))}

        {/* Edges — drawn before nodes */}
        {visibleNodes
          .filter(n => n.parent && positions[n.parent] && positions[n.id])
          .map(n => {
            const from  = positions[n.parent!]
            const to    = positions[n.id]
            const isHot = hovered === n.id || selected?.id === n.id
            const deep  = n.type === 'module'
            const color = PHASE_COLORS[n.phase as keyof typeof PHASE_COLORS]
            return (
              <path
                key={`edge-${n.id}`}
                className={deep ? 'map-line' : undefined}
                d={edgePath(from.x, from.y, to.x, to.y, deep)}
                stroke={color}
                strokeWidth={isHot ? 1.6 : 0.9}
                strokeOpacity={isHot ? 0.5 : n.type === 'module' ? 0.18 : 0.25}
                fill="none"
                style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
              />
            )
          })}

        {/* Nodes */}
        {visibleNodes.map((node, i) => {
          const pos = positions[node.id]
          if (!pos) return null

          const isRoot     = node.type === 'root'
          const isSelected = selected?.id === node.id
          const isHovered  = hovered === node.id
          const isExpanded = expanded.has(node.id)
          const hasKids    = (childCount.get(node.id) ?? 0) > 0
          const color      = PHASE_COLORS[node.phase as keyof typeof PHASE_COLORS]
          const lightBg    = PHASE_LIGHT[node.phase as keyof typeof PHASE_LIGHT]
          const cfg        = NODE_SIZE[node.type] ?? NODE_SIZE.feature
          const { w, h, rx, fontSize } = cfg

          // Label truncation — tighter for smaller nodes
          const maxChars = isRoot ? 18 : node.type === 'module' ? 16 : node.type === 'app' ? 14 : 13
          const label = node.label.length > maxChars ? node.label.slice(0, maxChars - 1) + '…' : node.label

          // Card fill: root=solid, module=phase light, app=white, feature=white (more subtle)
          const fill = isRoot
            ? color
            : node.type === 'module'
              ? lightBg
              : '#FFFFFF'

          const strokeOpacity = node.type === 'feature' || node.type === 'infrastructure' ? 0.55 : 1

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ cursor: 'pointer' }}
              onClick={e => { if (!didDrag.current) { e.stopPropagation(); onSelect(node) } }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <g
                className="map-node"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: `scale(${isHovered || isSelected ? 1.07 : 1})`,
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  animationDelay: `${Math.min(i * 22, 600)}ms`,
                }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <rect
                    className="map-ring"
                    x={-w / 2 - 6} y={-h / 2 - 6}
                    width={w + 12} height={h + 12}
                    rx={rx + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />
                )}

                {/* Card */}
                <rect
                  x={-w / 2} y={-h / 2}
                  width={w} height={h} rx={rx}
                  fill={fill}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  strokeOpacity={strokeOpacity}
                  filter={isHovered || isSelected ? 'url(#shadow-md)' : 'url(#shadow-sm)'}
                />

                {/* Label */}
                <text
                  x={0} y={0}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fontSize}
                  fontWeight={node.type === 'feature' || node.type === 'infrastructure' ? 500 : 700}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                  fill={isRoot ? '#FFFFFF' : color}
                  fillOpacity={node.type === 'feature' || node.type === 'infrastructure' ? 0.85 : 1}
                >
                  {label}
                </text>

                {/* Expand / collapse toggle below card */}
                {hasKids && !isRoot && (
                  <g
                    transform={`translate(0, ${h / 2 + 13})`}
                    onClick={e => { e.stopPropagation(); toggleExpand(node.id) }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={-16} y={-9} width={32} height={18} rx={9}
                      fill={isExpanded ? color : 'white'}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeOpacity={strokeOpacity}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))' }}
                    />
                    <text
                      x={0} y={5}
                      textAnchor="middle"
                      fontSize={10} fontWeight={700}
                      fontFamily="-apple-system, sans-serif"
                      fill={isExpanded ? 'white' : color}
                      fillOpacity={strokeOpacity}
                      style={{ pointerEvents: 'none' }}
                    >
                      {isExpanded ? '−' : `+${childCount.get(node.id) ?? ''}`}
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>

      {/* Legend */}
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

      {/* Zoom controls */}
      <g transform={`translate(${size.w - 52}, 16)`}>
        <ZoomButton y={0}   label="+" onClick={() => setScale(s => Math.min(2.5, s * 1.2))} />
        <ZoomButton y={38}  label="−" onClick={() => setScale(s => Math.max(0.2, s / 1.2))} />
        <ZoomButton y={76}  label="⟲" onClick={() => { setPan({ x: 0, y: 0 }); setScale(0.82) }} />
      </g>

      <text
        x={size.w - 54} y={size.h - 14}
        textAnchor="end" fontSize={10}
        fontFamily="-apple-system, sans-serif" fill="#9CA3AF"
      >
        {visibleNodes.length - 1} nodes visible · click + to expand · drag to pan · scroll to zoom
      </text>
    </svg>
  )
}

function ZoomButton({ y, label, onClick }: { y: number; label: string; onClick: () => void }) {
  return (
    <g transform={`translate(0, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect width={34} height={32} rx={7} fill="white" stroke="#E5E7EB" strokeWidth={1}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
      />
      <text x={17} y={21} textAnchor="middle" fontSize={15}
        fontFamily="-apple-system, sans-serif" fill="#4A4A5A"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}
