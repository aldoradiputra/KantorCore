'use client'

import { useState } from 'react'
import DocSidebar from './DocSidebar'
import DocContent from './DocContent'
import ChatPanel from './ChatPanel'
import type { Node } from '../types'

type Props = {
  nodes: Node[]
  version: string
}

export default function DocsView({ nodes, version }: Props) {
  const [activeDoc, setActiveDoc] = useState('welcome')
  const [chatOpen, setChatOpen]   = useState(true)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <DocSidebar active={activeDoc} onChange={setActiveDoc} />

      {/* Main content */}
      <DocContent active={activeDoc} nodes={nodes} version={version} />

      {/* Ask Claude panel */}
      {chatOpen
        ? <ChatPanel onClose={() => setChatOpen(false)} />
        : (
          <button
            onClick={() => setChatOpen(true)}
            title="Open Ask Claude"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--navy)',
              border: 'none',
              color: 'var(--white)',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 100,
            }}
          >
            ✦
          </button>
        )
      }
    </div>
  )
}
