'use client'

import type { BlocksBlock } from '../../lib/blocks'
import type {
  TextBlockConfig,
  HeadingBlockConfig,
  ImageBlockConfig,
  CtaButtonBlockConfig,
  DividerBlockConfig,
  ArticlesListBlockConfig,
  FieldBlockConfig,
  CustomHtmlBlockConfig,
} from '@kantorcore/db'
import { RichEditor } from '../editor'
import type { JSONContent } from '@tiptap/react'

// ── Individual block renderers ─────────────────────────────────────────────────

function TextBlock({ config }: { config: TextBlockConfig }) {
  if (config.bodyJson) {
    return (
      <div style={{ margin: '0 0 var(--s-4)' }}>
        <RichEditor valueJson={config.bodyJson as JSONContent} readOnly showToolbar={false} minHeight={0} />
      </div>
    )
  }
  return (
    <div style={{ font: '15px/1.7 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 var(--s-4)', whiteSpace: 'pre-wrap' }}>
      {config.content}
    </div>
  )
}

function HeadingBlock({ config }: { config: HeadingBlockConfig }) {
  const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' }
  return (
    <div style={{
      font: `700 ${sizes[config.level] ?? '22px'}/1.3 var(--font-sans)`,
      color: 'var(--fg-1)',
      margin: '0 0 var(--s-3)',
      textAlign: config.align ?? 'left',
    }}>
      {config.text}
    </div>
  )
}

function ImageBlock({ config }: { config: ImageBlockConfig }) {
  return (
    <figure style={{ margin: '0 0 var(--s-4)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.url}
        alt={config.alt ?? ''}
        style={{
          maxWidth: '100%',
          width: config.width ?? undefined,
          height: config.height ?? undefined,
          borderRadius: config.rounded ? 'var(--r-md)' : 0,
          display: 'block',
        }}
      />
      {config.caption && (
        <figcaption style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 6 }}>
          {config.caption}
        </figcaption>
      )}
    </figure>
  )
}

function CtaButtonBlock({ config }: { config: CtaButtonBlockConfig }) {
  const styleMap = {
    primary: { background: 'var(--indigo)', color: 'var(--white)', border: 'none' },
    secondary: { background: 'transparent', color: 'var(--indigo)', border: '1px solid var(--indigo)' },
    ghost: { background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border)' },
  }
  const s = styleMap[config.style ?? 'primary']
  return (
    <div style={{ textAlign: config.align ?? 'left', margin: '0 0 var(--s-4)' }}>
      <a
        href={config.href}
        target={config.openInNewTab ? '_blank' : undefined}
        rel={config.openInNewTab ? 'noopener noreferrer' : undefined}
        style={{
          display: 'inline-block',
          padding: '10px 24px',
          borderRadius: 'var(--r-sm)',
          font: '600 14px/1 var(--font-sans)',
          textDecoration: 'none',
          ...s,
        }}
      >
        {config.label}
      </a>
    </div>
  )
}

function DividerBlock({ config }: { config: DividerBlockConfig }) {
  return (
    <hr style={{
      border: 'none',
      borderTop: `1px ${config.style ?? 'solid'} var(--border)`,
      margin: `${config.margin ?? 16}px 0`,
    }} />
  )
}

function ArticlesListBlock({ config, articles }: { config: ArticlesListBlockConfig; articles?: ArticlePreview[] }) {
  if (!articles?.length) return null
  const limited = articles.slice(0, config.limit ?? 5)
  return (
    <div style={{ margin: '0 0 var(--s-4)' }}>
      {limited.map((a) => (
        <a
          key={a.id}
          href={a.href}
          style={{
            display: 'block',
            padding: 'var(--s-3) 0',
            borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
          }}
        >
          <div style={{ font: '500 14px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{a.title}</div>
          {config.showExcerpt && a.excerpt && (
            <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              {a.excerpt}
            </div>
          )}
        </a>
      ))}
    </div>
  )
}

function FieldBlock({ config, fieldValue }: { config: FieldBlockConfig; fieldValue?: string | null }) {
  if (!fieldValue) return null
  return (
    <div style={{ margin: '0 0 var(--s-3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {config.label ?? config.field}
      </span>
      {config.format === 'badge' ? (
        <span style={{ display: 'inline-flex', padding: '3px 10px', background: 'var(--indigo-light)', color: 'var(--indigo)', borderRadius: 999, font: '600 12px/1 var(--font-sans)', width: 'fit-content' }}>
          {fieldValue}
        </span>
      ) : (
        <span style={{ font: '14px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{fieldValue}</span>
      )}
    </div>
  )
}

function CustomHtmlBlock({ config }: { config: CustomHtmlBlockConfig }) {
  return (
    <div
      style={{ margin: '0 0 var(--s-4)' }}
      // Custom HTML is intentionally rendered — only accessible to admins via
      // the block editor; not user-supplied content.
      dangerouslySetInnerHTML={{ __html: config.html }}
    />
  )
}

// ── Types for runtime data injection ──────────────────────────────────────────

export type ArticlePreview = {
  id: string
  title: string
  excerpt: string | null
  href: string
}

export type BlockRenderContext = {
  articles?: ArticlePreview[]
  // field values indexed by "entity.fieldName"
  fields?: Record<string, string | null>
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function BlockRenderer({
  blocks,
  context = {},
}: {
  blocks: BlocksBlock[]
  context?: BlockRenderContext
}) {
  const visible = blocks.filter((b) => b.visible)
  if (!visible.length) return null

  return (
    <div>
      {visible.map((block) => {
        const cfg = block.config as Record<string, unknown>
        switch (block.type) {
          case 'text':
            return <TextBlock key={block.id} config={cfg as TextBlockConfig} />
          case 'heading':
            return <HeadingBlock key={block.id} config={cfg as HeadingBlockConfig} />
          case 'image':
            return <ImageBlock key={block.id} config={cfg as ImageBlockConfig} />
          case 'cta_button':
            return <CtaButtonBlock key={block.id} config={cfg as CtaButtonBlockConfig} />
          case 'divider':
            return <DividerBlock key={block.id} config={cfg as DividerBlockConfig} />
          case 'articles_list':
            return (
              <ArticlesListBlock
                key={block.id}
                config={cfg as ArticlesListBlockConfig}
                articles={context.articles}
              />
            )
          case 'tickets_list':
            // Rendered by portal dashboard — passed through context
            return null
          case 'gift_cards_grid':
            return null
          case 'field': {
            const fc = cfg as FieldBlockConfig
            const value = context.fields?.[`${fc.entity}.${fc.field}`] ?? null
            return <FieldBlock key={block.id} config={fc} fieldValue={value} />
          }
          case 'custom_html':
            return <CustomHtmlBlock key={block.id} config={cfg as CustomHtmlBlockConfig} />
          default:
            return null
        }
      })}
    </div>
  )
}
