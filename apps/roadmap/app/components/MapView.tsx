'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Node } from '@kantr/types'

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

const NODE_CFG: Record<string, { w: number; baseH: number; rx: number; fs: number; cols: number }> = {
  root:           { w: 168, baseH: 50, rx: 10, fs: 13, cols: 18 },
  module:         { w: 152, baseH: 44, rx: 9,  fs: 11, cols: 17 },
  app:            { w: 124, baseH: 34, rx: 7,  fs: 10, cols: 15 },
  feature:        { w: 112, baseH: 28, rx: 6,  fs: 9,  cols: 14 },
  infrastructure: { w: 112, baseH: 28, rx: 6,  fs: 9,  cols: 14 },
}

function wrapLabel(label: string, cols: number): string[] {
  if (label.length <= cols) return [label]
  const words = label.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const next = cur ? cur + ' ' + word : word
    if (next.length <= cols) { cur = next; continue }
    if (cur) { lines.push(cur); cur = word } else { lines.push(word.slice(0, cols - 1) + '…'); cur = '' }
    if (lines.length === 1) continue  // allow 2nd line
    // on 3rd+ overflow: cram into 2nd line with ellipsis
    const rest = words.slice(words.indexOf(word)).join(' ')
    lines.push(rest.length <= cols ? rest : rest.slice(0, cols - 1) + '…')
    return lines
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 2)
}

type Props = { nodes: Node[]; selected: Node | null; onSelect: (n: Node) => void }

// Push outer rings out when inner phases expand — aggressive enough to clear children
function ringRadii(expanded: Set<string>, modules: Node[]): Record<number, number> {
  const has: Record<number, boolean> = {}
  for (const m of modules) if (expanded.has(m.id)) has[m.phase] = true
  return {
    1: 240,
    2: has[1] ? 580 : has[2] ? 500 : 440,
    3: has[1] ? 860 : has[2] ? 800 : has[3] ? 720 : 640,
  }
}

// Fan n children outward from parent; radius grows if needed to maintain min chord spacing
function fan(
  parent: { x: number; y: number },
  angle: number,
  children: Node[],
  baseR: number,
  minChord: number,
  pos: Record<string, { x: number; y: number }>
) {
  const n = children.length
  if (!n) return
  const step = n > 1 ? Math.min(Math.PI / 5, Math.PI * 1.1 / (n - 1)) : 0
  // Grow radius so adjacent chord ≥ minChord
  const r = n > 1 ? Math.max(baseR, minChord / (2 * Math.sin(step / 2))) : baseR
  const start = angle - step * (n - 1) / 2
  children.forEach((c, i) => {
    const a = start + i * step
    pos[c.id] = { x: parent.x + Math.cos(a) * r, y: parent.y + Math.sin(a) * r }
  })
}

function computePositions(nodes: Node[], expanded: Set<string>) {
  const pos: Record<string, { x: number; y: number }> = {}
  const modules = nodes.filter(n => n.type === 'module')
  const radii = ringRadii(expanded, modules)

  const root = nodes.find(n => n.type === 'root')
  if (!root) return { pos, radii }
  pos[root.id] = { x: 0, y: 0 }

  const byPhase: Record<number, Node[]> = { 1: [], 2: [], 3: [] }
  for (const m of modules) byPhase[m.phase]?.push(m)
  const offsets: Record<number, number> = { 1: 0, 2: 0.18, 3: -0.12 }

  for (const ph of [1, 2, 3]) {
    const ring = byPhase[ph]
    ring.forEach((m, i) => {
      const a = -Math.PI / 2 + offsets[ph] + (i / ring.length) * Math.PI * 2
      pos[m.id] = { x: Math.cos(a) * radii[ph], y: Math.sin(a) * radii[ph] }
    })
  }

  for (const mod of modules) {
    if (!expanded.has(mod.id)) continue
    const mp = pos[mod.id]; if (!mp) continue
    const outA = Math.atan2(mp.y, mp.x)
    const nextR = radii[Math.min(3, mod.phase + 1) as 1 | 2 | 3] ?? radii[mod.phase] + 260
    const gap = nextR - radii[mod.phase]
    const appR = gap * 0.48  // place apps at ~48% into the gap

    const apps = nodes.filter(n => n.parent === mod.id && n.type === 'app')
    if (apps.length) {
      fan(mp, outA, apps, appR, 70, pos)
      for (const app of apps) {
        if (!expanded.has(app.id)) continue
        const ap = pos[app.id]; if (!ap) continue
        const featA = Math.atan2(ap.y - mp.y, ap.x - mp.x)
        const feats = nodes.filter(n => n.parent === app.id)
        fan(ap, featA, feats, 120, 52, pos)
      }
    } else {
      const feats = nodes.filter(n => n.parent === mod.id)
      fan(mp, outA, feats, appR, 60, pos)
    }
  }

  return { pos, radii }
}

// AABB repulsion: push overlapping non-module nodes apart, repeated iterations
function repulse(
  visible: Node[],
  pos: Record<string, { x: number; y: number }>,
  iters = 8
): Record<string, { x: number; y: number }> {
  const p: Record<string, { x: number; y: number }> = {}
  for (const k in pos) p[k] = { ...pos[k] }

  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i], b = visible[j]
        const pa = p[a.id], pb = p[b.id]
        if (!pa || !pb) continue

        const ca = NODE_CFG[a.type] ?? NODE_CFG.feature
        const cb = NODE_CFG[b.type] ?? NODE_CFG.feature

        const dx = pb.x - pa.x, dy = pb.y - pa.y
        const mx = (ca.w + cb.w) / 2 + 10
        const my = (ca.baseH + cb.baseH) / 2 + 14  // +14 covers 2-line height growth

        const ox = mx - Math.abs(dx), oy = my - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue  // no overlap

        // Resolve along the axis of least overlap
        const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1
        const push = 0.55
        if (ox < oy) {
          const d = ox * push
          if (a.type !== 'root' && a.type !== 'module') p[a.id] = { x: pa.x - sx * d, y: pa.y }
          if (b.type !== 'root' && b.type !== 'module') p[b.id] = { x: pb.x + sx * d, y: pb.y }
        } else {
          const d = oy * push
          if (a.type !== 'root' && a.type !== 'module') p[a.id] = { x: pa.x, y: pa.y - sy * d }
          if (b.type !== 'root' && b.type !== 'module') p[b.id] = { x: pb.x, y: pb.y + sy * d }
        }
      }
    }
  }
  return p
}

function edgePath(x1: number, y1: number, x2: number, y2: number, deep: boolean) {
  if (deep) return `M${x1} ${y1}C${x1*.35} ${y1*.35},${x2*.35} ${y2*.35},${x2} ${y2}`
  return `M${x1} ${y1}Q${(x1+x2)/2} ${(y1+y2)/2},${x2} ${y2}`
}

export default function MapView({ nodes, selected, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
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
    const el = svgRef.current; if (!el) return
    const obs = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }, [])

  const scheduleHover = useCallback((id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setHovered(id), HOVER_DELAY_MS)
  }, [])

  const cancelHover = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    setHovered(null)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true; didDrag.current = false
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x, dy = e.clientY - lastMouse.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) didDrag.current = true
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])
  const onWheel  = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(2.5, Math.max(0.2, s * (1 - e.deltaY * 0.0008))))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const { pos: rawPos, radii } = useMemo(() => computePositions(nodes, expanded), [nodes, expanded])

  const visible = useMemo(() => nodes.filter(n => {
    if (n.type === 'root' || n.type === 'module') return true
    return n.parent ? expanded.has(n.parent) : false
  }), [nodes, expanded])

  // Repulsion runs on visible nodes only — fast even with 60+ visible
  const positions = useMemo(() => repulse(visible, rawPos, 8), [visible, rawPos])

  const childCount = useMemo(() => {
    const m = new Map<string, number>()
    nodes.forEach(n => { if (n.parent) m.set(n.parent, (m.get(n.parent) ?? 0) + 1) })
    return m
  }, [nodes])

  const labelCache = useMemo(() => {
    const m = new Map<string, { lines: string[]; h: number }>()
    for (const n of nodes) {
      const c = NODE_CFG[n.type] ?? NODE_CFG.feature
      const lines = wrapLabel(n.label, c.cols)
      m.set(n.id, { lines, h: c.baseH + (lines.length - 1) * (c.fs + 3) })
    }
    return m
  }, [nodes])

  // Full ancestry + all descendants for hover highlighting
  const related = useMemo<Set<string> | null>(() => {
    if (!hovered) return null
    const byId = new Map(nodes.map(n => [n.id, n]))
    const kids = new Map<string, string[]>()
    for (const n of nodes) { if (n.parent) { if (!kids.has(n.parent)) kids.set(n.parent, []); kids.get(n.parent)!.push(n.id) } }
    const set = new Set<string>([hovered])
    let cur = byId.get(hovered)
    while (cur?.parent) { set.add(cur.parent); cur = byId.get(cur.parent) }
    const q = [hovered]
    while (q.length) { const id = q.shift()!; for (const k of kids.get(id) ?? []) { if (!set.has(k)) { set.add(k); q.push(k) } } }
    return set
  }, [hovered, nodes])

  const cx = size.w / 2 + pan.x, cy = size.h / 2 + pan.y

  return (
    <svg
      ref={svgRef}
      style={{ flex: 1, cursor: 'grab', userSelect: 'none', background: 'var(--bg)' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={stopDrag} onMouseLeave={stopDrag} onWheel={onWheel}
    >
      <defs>
        <filter id="sh-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.09)" />
        </filter>
        <filter id="sh-md" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
        </filter>
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EEF1FF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F8F9FB" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy} rx={size.w * 0.38} ry={size.h * 0.38} fill="url(#bg-glow)" />

      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        {([1, 2, 3] as const).map(ph => (
          <circle key={ph} cx={0} cy={0} r={radii[ph]} fill="none"
            stroke={PHASE_COLORS[ph]} strokeWidth="1" strokeOpacity="0.1" strokeDasharray="6 10"
            style={{ transition: 'r 0.45s cubic-bezier(0.25,0.8,0.25,1)' }}
          />
        ))}

        {/* Edges */}
        {visible.filter(n => n.parent && positions[n.parent] && positions[n.id]).map(n => {
          const from = positions[n.parent!], to = positions[n.id]
          const deep  = n.type === 'module'
          const color = PHASE_COLORS[n.phase as keyof typeof PHASE_COLORS]
          const active = related !== null && related.has(n.id) && related.has(n.parent!)
          const hot    = active || selected?.id === n.id || selected?.id === n.parent
          const opacity = related ? (active ? 0.85 : 0.05) : (hot ? 0.55 : deep ? 0.18 : 0.25)
          return (
            <path key={`e-${n.id}`}
              d={edgePath(from.x, from.y, to.x, to.y, deep)}
              stroke={color} fill="none"
              strokeWidth={active ? 2 : hot ? 1.6 : 0.9}
              strokeOpacity={opacity}
              strokeDasharray={active ? '5 5' : undefined}
              style={{
                transition: 'stroke-opacity 0.25s, stroke-width 0.25s',
                ...(active && { animation: 'dashFlow 0.55s linear infinite' }),
              }}
            />
          )
        })}

        {/* Nodes */}
        {visible.map((node, i) => {
          const p = positions[node.id]; if (!p) return null
          const isRoot = node.type === 'root'
          const isSel  = selected?.id === node.id
          const isHov  = hovered === node.id
          const isExp  = expanded.has(node.id)
          const hasKids = (childCount.get(node.id) ?? 0) > 0
          const color  = PHASE_COLORS[node.phase as keyof typeof PHASE_COLORS]
          const lightBg = PHASE_LIGHT[node.phase as keyof typeof PHASE_LIGHT]
          const cfg    = NODE_CFG[node.type] ?? NODE_CFG.feature
          const lbl    = labelCache.get(node.id)!
          const { lines, h } = lbl
          const { w, rx, fs } = cfg
          const fill   = isRoot ? color : node.type === 'module' ? lightBg : '#FFF'
          const sop    = node.type === 'feature' || node.type === 'infrastructure' ? 0.55 : 1
          const dimmed = related !== null && !related.has(node.id)
          const lh     = fs * 1.15
          const firstDy = -((lines.length - 1) * lh) / 2

          return (
            <g key={node.id}
              style={{
                transform: `translate(${p.x}px,${p.y}px)`,
                transition: 'transform 0.45s cubic-bezier(0.25,0.8,0.25,1), opacity 0.25s',
                opacity: dimmed ? 0.1 : 1,
                cursor: 'pointer',
              }}
              onClick={e => { if (!didDrag.current) { e.stopPropagation(); onSelect(node) } }}
              onMouseEnter={() => scheduleHover(node.id)}
              onMouseLeave={cancelHover}
            >
              <g className="map-node"
                style={{
                  transformBox: 'fill-box', transformOrigin: 'center',
                  transform: `scale(${isHov || isSel ? 1.07 : 1})`,
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  animationDelay: `${Math.min(i * 22, 600)}ms`,
                }}
              >
                {isSel && (
                  <rect className="map-ring"
                    x={-w/2-6} y={-h/2-6} width={w+12} height={h+12} rx={rx+4}
                    fill="none" stroke={color} strokeWidth="2"
                  />
                )}
                <rect x={-w/2} y={-h/2} width={w} height={h} rx={rx}
                  fill={fill} stroke={color}
                  strokeWidth={isSel ? 2 : 1.5} strokeOpacity={sop}
                  filter={isHov || isSel ? 'url(#sh-md)' : 'url(#sh-sm)'}
                />
                <text x={0} textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs}
                  fontWeight={node.type === 'feature' || node.type === 'infrastructure' ? 500 : 700}
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
                  fill={isRoot ? '#FFF' : color} fillOpacity={sop}
                  style={{ pointerEvents: 'none' }}
                >
                  {lines.map((ln, idx) => (
                    <tspan key={idx} x={0} dy={idx === 0 ? firstDy : lh}>{ln}</tspan>
                  ))}
                </text>

                {hasKids && !isRoot && (
                  <g transform={`translate(0,${h/2+13})`}
                    onClick={e => { e.stopPropagation(); toggleExpand(node.id) }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect x={-16} y={-9} width={32} height={18} rx={9}
                      fill={isExp ? color : 'white'} stroke={color}
                      strokeWidth={1.5} strokeOpacity={sop}
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.10))' }}
                    />
                    <text x={0} y={5} textAnchor="middle" fontSize={10} fontWeight={700}
                      fontFamily="-apple-system,sans-serif"
                      fill={isExp ? 'white' : color} fillOpacity={sop}
                      style={{ pointerEvents: 'none' }}
                    >
                      {isExp ? '−' : `+${childCount.get(node.id) ?? ''}`}
                    </text>
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>

      <g transform={`translate(20,${size.h - 88})`}>
        {([1, 2, 3] as const).map((ph, i) => (
          <g key={ph} transform={`translate(0,${i * 22})`}>
            <rect width={10} height={10} rx={2} fill={PHASE_COLORS[ph]} opacity={0.75} y={1} />
            <text x={17} y={10} fontSize={11} fontFamily="-apple-system,sans-serif" fill="#6B7280">
              {PHASE_LABELS[ph]}
            </text>
          </g>
        ))}
      </g>

      <g transform={`translate(${size.w - 52},16)`}>
        <ZB y={0}  label="+" onClick={() => setScale(s => Math.min(2.5, s * 1.2))} />
        <ZB y={38} label="−" onClick={() => setScale(s => Math.max(0.2, s / 1.2))} />
        <ZB y={76} label="⟲" onClick={() => { setPan({ x: 0, y: 0 }); setScale(0.82) }} />
      </g>

      <text x={size.w - 54} y={size.h - 14} textAnchor="end" fontSize={10}
        fontFamily="-apple-system,sans-serif" fill="#9CA3AF"
      >
        {visible.length - 1} nodes · expand + · hover 1s to focus · drag · scroll to zoom
      </text>
    </svg>
  )
}

function ZB({ y, label, onClick }: { y: number; label: string; onClick: () => void }) {
  return (
    <g transform={`translate(0,${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect width={34} height={32} rx={7} fill="white" stroke="#E5E7EB" strokeWidth={1}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
      />
      <text x={17} y={21} textAnchor="middle" fontSize={15}
        fontFamily="-apple-system,sans-serif" fill="#4A4A5A" style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}
