'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Node } from '../types'

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

const HOVER_DELAY_MS = 1000

// Visual size config per node level. Height grows dynamically with line count.
const NODE_SIZE: Record<string, { w: number; baseH: number; rx: number; fontSize: number; maxCharsPerLine: number }> = {
  root:           { w: 168, baseH: 50, rx: 10, fontSize: 13, maxCharsPerLine: 18 },
  module:         { w: 150, baseH: 42, rx: 9,  fontSize: 11, maxCharsPerLine: 17 },
  app:            { w: 122, baseH: 34, rx: 7,  fontSize: 10, maxCharsPerLine: 14 },
  feature:        { w: 110, baseH: 28, rx: 6,  fontSize: 9,  maxCharsPerLine: 13 },
  infrastructure: { w: 110, baseH: 28, rx: 6,  fontSize: 9,  maxCharsPerLine: 13 },
}

// Word-wrap a label into up to maxLines lines, truncating only if a single word doesn't fit
function wrapLabel(label: string, maxCharsPerLine: number, maxLines = 2): string[] {
  if (label.length <= maxCharsPerLine) return [label]

  const words = label.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const tentative = current ? current + ' ' + word : word

    if (tentative.length <= maxCharsPerLine) {
      current = tentative
      continue
    }

    if (current) lines.push(current)

    if (lines.length >= maxLines) {
      // Out of lines — append remaining to last line with ellipsis
      const remaining = words.slice(i).join(' ')
      const last = remaining.length <= maxCharsPerLine
        ? remaining
        : remaining.slice(0, maxCharsPerLine - 1) + '…'
      lines[maxLines - 1] = lines[maxLines - 1] + ' ' + last
      if (lines[maxLines - 1].length > maxCharsPerLine) {
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxCharsPerLine - 1) + '…'
      }
      return lines
    }

    // Word itself longer than line: hard-truncate
    if (word.length > maxCharsPerLine) {
      current = word.slice(0, maxCharsPerLine - 1) + '…'
    } else {
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, maxLines)
}

type Props = {
  nodes: Node[]
  selected: Node | null
  onSelect: (node: Node) => void
}

// Dynamic ring radii: push outer rings out when inner rings have expansions
function computeRingRadii(expanded: Set<string>, modules: Node[]): Record<number, number> {
  const phaseExpanded: Record<number, boolean> = {}
  for (const m of modules) {
    if (expanded.has(m.id)) phaseExpanded[m.phase] = true
  }
  return {
    1: phaseExpanded[1] ? 300 : 240,
    2: phaseExpanded[1] ? 580 : (phaseExpanded[2] ? 520 : 440),
    3: phaseExpanded[1] ? 880 : (phaseExpanded[2] ? 820 : (phaseExpanded[3] ? 740 : 640)),
  }
}

// Fan children at outAngle, capped at maxArc; grow radius if needed to maintain minimum pixel spacing
function placeChildren(
  parentPos: { x: number; y: number },
  outAngle: number,
  children: Node[],
  baseRadius: number,
  maxArc: number,
  minSpacing: number,
  pos: Record<string, { x: number; y: number }>
) {
  const n = children.length
  if (n === 0) return

  const idealStep = Math.PI / 5 // 36°
  const naturalArc = (n - 1) * idealStep
  let arc: number
  let radius = baseRadius

  if (naturalArc <= maxArc) {
    arc = naturalArc
  } else {
    arc = maxArc
    // Required arc length to fit n children at minSpacing
    const requiredLength = (n - 1) * minSpacing
    radius = Math.max(baseRadius, requiredLength / arc)
  }

  const step = n > 1 ? arc / (n - 1) : 0
  const start = outAngle - arc / 2
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
): { pos: Record<string, { x: number; y: number }>; radii: Record<number, number> } {
  const pos: Record<string, { x: number; y: number }> = {}
  const modules = nodes.filter(n => n.type === 'module')
  const radii = computeRingRadii(expanded, modules)

  const root = nodes.find(n => n.type === 'root')
  if (!root) return { pos, radii }
  pos[root.id] = { x: 0, y: 0 }

  // Modules per phase, for slot-arc calculation
  const modulesByPhase: Record<number, Node[]> = { 1: [], 2: [], 3: [] }
  for (const m of modules) modulesByPhase[m.phase]?.push(m)

  const offsets: Record<number, number> = { 1: 0, 2: 0.18, 3: -0.12 }

  for (const phase of [1, 2, 3]) {
    const ring = modulesByPhase[phase]
    const n = ring.length
    ring.forEach((m, i) => {
      const angle = -Math.PI / 2 + offsets[phase] + (i / n) * Math.PI * 2
      pos[m.id] = {
        x: Math.cos(angle) * radii[phase],
        y: Math.sin(angle) * radii[phase],
      }
    })
  }

  for (const mod of modules) {
    if (!expanded.has(mod.id)) continue
    const modPos = pos[mod.id]
    if (!modPos) continue

    const phaseCount = modulesByPhase[mod.phase].length
    // Module owns 2π / phaseCount of the ring — cap fan to ~92% of that
    const moduleSlotArc = (2 * Math.PI / phaseCount) * 0.92

    const outAngle = Math.atan2(modPos.y, modPos.x)
    const nextRadius = radii[(mod.phase + 1) as keyof typeof radii] ?? radii[mod.phase] + 260
    const baseAppRadius = Math.max(140, (nextRadius - radii[mod.phase]) * 0.5)

    const apps = nodes.filter(n => n.parent === mod.id && n.type === 'app')

    if (apps.length > 0) {
      placeChildren(modPos, outAngle, apps, baseAppRadius, moduleSlotArc, 65, pos)

      for (const app of apps) {
        if (!expanded.has(app.id)) continue
        const appPos = pos[app.id]
        if (!appPos) continue

        const features = nodes.filter(n => n.parent === app.id)
        // Each app gets a share of the module's slot (so siblings of this app's features don't collide)
        const appSlotArc = (moduleSlotArc / apps.length) * 1.5
        const appAngle = Math.atan2(appPos.y - modPos.y, appPos.x - modPos.x)
        placeChildren(appPos, appAngle, features, 120, Math.min(appSlotArc, Math.PI * 0.55), 50, pos)
      }
    } else {
      const features = nodes.filter(n => n.parent === mod.id)
      placeChildren(modPos, outAngle, features, baseAppRadius, moduleSlotArc, 55, pos)
    }
  }

  return { pos, radii }
}

function edgePath(x1: number, y1: number, x2: number, y2: number, deep: boolean): string {
  if (deep) {
    return `M ${x1} ${y1} C ${x1 * 0.35} ${y1 * 0.35}, ${x2 * 0.35} ${y2 * 0.35}, ${x2} ${y2}`
  }
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
  const hoverTimer = useRef<number | null>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
  }, [])

  const scheduleHover = useCallback((id: string) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => {
      setHovered(id)
    }, HOVER_DELAY_MS)
  }, [])

  const cancelHover = useCallback(() => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    setHovered(null)
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

  const { pos: positions, radii } = useMemo(
    () => computePositions(nodes, expanded),
    [nodes, expanded]
  )

  const visibleNodes = useMemo(() => nodes.filter(n => {
    if (n.type === 'root' || n.type === 'module') return true
    if (!n.parent) return false
    return expanded.has(n.parent)
  }), [nodes, expanded])

  const childCount = useMemo(() => {
    const map = new Map<string, number>()
    nodes.forEach(n => {
      if (n.parent) map.set(n.parent, (map.get(n.parent) ?? 0) + 1)
    })
    return map
  }, [nodes])

  // Pre-wrap labels and compute box heights once per nodes
  const labelCache = useMemo(() => {
    const map = new Map<string, { lines: string[]; h: number }>()
    for (const n of nodes) {
      const cfg = NODE_SIZE[n.type] ?? NODE_SIZE.feature
      const lines = wrapLabel(n.label, cfg.maxCharsPerLine, 2)
      const h = cfg.baseH + (lines.length - 1) * (cfg.fontSize + 4)
      map.set(n.id, { lines, h })
    }
    return map
  }, [nodes])

  // Related set: full ancestry (all parents up to root) + all descendants (recursive)
  const relatedSet = useMemo<Set<string> | null>(() => {
    if (!hovered) return null
    const byId = new Map(nodes.map(n => [n.id, n]))
    const childrenOf = new Map<string, string[]>()
    for (const n of nodes) {
      if (n.parent) {
        if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, [])
        childrenOf.get(n.parent)!.push(n.id)
      }
    }

    const set = new Set<string>()
    set.add(hovered)

    // Walk up — all ancestors
    let cur = byId.get(hovered)
    while (cur?.parent) {
      set.add(cur.parent)
      cur = byId.get(cur.parent)
    }

    // Walk down — all descendants (BFS)
    const queue = [hovered]
    while (queue.length) {
      const id = queue.shift()!
      const kids = childrenOf.get(id) ?? []
      for (const kid of kids) {
        if (!set.has(kid)) {
          set.add(kid)
          queue.push(kid)
        }
      }
    }
    return set
  }, [hovered, nodes])

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

      <ellipse cx={cx} cy={cy} rx={size.w * 0.38} ry={size.h * 0.38} fill="url(#bg-glow)" />

      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>

        {/* Phase ring guides — r transitions when expansion shifts rings */}
        {([1, 2, 3] as const).map(phase => (
          <circle
            key={phase}
            cx={0} cy={0}
            r={radii[phase]}
            fill="none"
            stroke={PHASE_COLORS[phase]}
            strokeWidth="1"
            strokeOpacity="0.1"
            strokeDasharray="6 10"
            style={{ transition: 'r 0.45s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
          />
        ))}

        {/* Edges */}
        {visibleNodes
          .filter(n => n.parent && positions[n.parent] && positions[n.id])
          .map(n => {
            const from = positions[n.parent!]
            const to   = positions[n.id]
            const deep = n.type === 'module'
            const color = PHASE_COLORS[n.phase as keyof typeof PHASE_COLORS]

            // Edge is active if BOTH endpoints are in the ancestry/descendant chain
            const isActiveEdge =
              relatedSet !== null &&
              relatedSet.has(n.id) &&
              relatedSet.has(n.parent!)
            const isSelectedEdge = selected?.id === n.id || selected?.id === n.parent
            const isHot = isActiveEdge || isSelectedEdge

            const baseOpacity = n.type === 'module' ? 0.18 : 0.25
            const opacity = relatedSet
              ? (isActiveEdge ? 0.85 : 0.05)
              : (isHot ? 0.55 : baseOpacity)

            return (
              <path
                key={`edge-${n.id}`}
                d={edgePath(from.x, from.y, to.x, to.y, deep)}
                stroke={color}
                strokeWidth={isActiveEdge ? 2 : isHot ? 1.6 : 0.9}
                strokeOpacity={opacity}
                strokeDasharray={isActiveEdge ? '5 5' : undefined}
                fill="none"
                style={{
                  transition: 'stroke-opacity 0.25s, stroke-width 0.25s',
                  ...(isActiveEdge && {
                    animation: 'dashFlow 0.55s linear infinite',
                  }),
                }}
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
          const { w, rx, fontSize } = cfg
          const labelInfo  = labelCache.get(node.id)!
          const { lines, h } = labelInfo

          const fill = isRoot
            ? color
            : node.type === 'module'
              ? lightBg
              : '#FFFFFF'

          const strokeOpacity = node.type === 'feature' || node.type === 'infrastructure' ? 0.55 : 1
          const isDimmed = relatedSet !== null && !relatedSet.has(node.id)

          // Vertical centering for multi-line text
          const lineHeight = fontSize * 1.15
          const textBlockHeight = (lines.length - 1) * lineHeight
          const firstLineDy = -textBlockHeight / 2

          return (
            <g
              key={node.id}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: 'transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s',
                opacity: isDimmed ? 0.1 : 1,
                cursor: 'pointer',
              }}
              onClick={e => { if (!didDrag.current) { e.stopPropagation(); onSelect(node) } }}
              onMouseEnter={() => scheduleHover(node.id)}
              onMouseLeave={cancelHover}
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

                <rect
                  x={-w / 2} y={-h / 2}
                  width={w} height={h} rx={rx}
                  fill={fill}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  strokeOpacity={strokeOpacity}
                  filter={isHovered || isSelected ? 'url(#shadow-md)' : 'url(#shadow-sm)'}
                />

                <text
                  x={0} y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  fontWeight={node.type === 'feature' || node.type === 'infrastructure' ? 500 : 700}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                  fill={isRoot ? '#FFFFFF' : color}
                  fillOpacity={node.type === 'feature' || node.type === 'infrastructure' ? 0.9 : 1}
                  style={{ pointerEvents: 'none' }}
                >
                  {lines.map((line, idx) => (
                    <tspan
                      key={idx}
                      x={0}
                      dy={idx === 0 ? firstLineDy : lineHeight}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>

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
        <ZoomButton y={0}  label="+" onClick={() => setScale(s => Math.min(2.5, s * 1.2))} />
        <ZoomButton y={38} label="−" onClick={() => setScale(s => Math.max(0.2, s / 1.2))} />
        <ZoomButton y={76} label="⟲" onClick={() => { setPan({ x: 0, y: 0 }); setScale(0.82) }} />
      </g>

      <text
        x={size.w - 54} y={size.h - 14}
        textAnchor="end" fontSize={10}
        fontFamily="-apple-system, sans-serif" fill="#9CA3AF"
      >
        {visibleNodes.length - 1} nodes visible · click + to expand · hover (1s) to focus · drag to pan · scroll to zoom
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
