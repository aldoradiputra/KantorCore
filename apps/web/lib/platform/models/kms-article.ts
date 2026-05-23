import type { ModelMeta } from './types'

export const kmsArticleModel: ModelMeta = {
  entity: 'kms.article',
  module: 'IS-KMS',
  label:       { id: 'Artikel', en: 'Article' },
  pluralLabel: { id: 'Artikel', en: 'Articles' },
  displayField: 'title',
  help:
    'Artikel Knowledge Management System. Tersusun hierarkis di dalam kms.space (parentId self-ref). ' +
    'Tiga visibility level: internal (hanya member), portal (kontak portal), public (anonim). ' +
    'Body disimpan plain + TipTap JSON. Setiap save membuat snapshot di kms.article_version.',

  fields: {
    spaceId: {
      name: 'spaceId',
      label: { id: 'Space', en: 'Space' },
      type: 'many2one',
      target: 'kms.space',
      required: true,
      help: 'Container/workspace artikel. Slug unik per space.',
    },
    parentId: {
      name: 'parentId',
      label: { id: 'Induk', en: 'Parent' },
      type: 'many2one',
      target: 'kms.article',
      help: 'Self-ref untuk struktur tree (nested docs).',
    },
    slug: {
      name: 'slug',
      label: { id: 'Slug', en: 'Slug' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Slug URL-safe, unik per space.',
    },
    title: {
      name: 'title',
      label: { id: 'Judul', en: 'Title' },
      type: 'text',
      required: true,
      searchable: true,
    },
    body: {
      name: 'body',
      label: { id: 'Isi', en: 'Body' },
      type: 'longtext',
      widget: 'textarea',
      searchable: true,
      help: 'Plain text version dari isi artikel. Digunakan untuk full-text search.',
    },
    bodyJson: {
      name: 'bodyJson',
      label: { id: 'Isi (TipTap JSON)', en: 'Body (TipTap JSON)' },
      type: 'json',
      widget: 'rich-text',
      help: 'Rich text TipTap JSON. Sumber kebenaran untuk render WYSIWYG.',
    },
    excerpt: {
      name: 'excerpt',
      label: { id: 'Ringkasan', en: 'Excerpt' },
      type: 'longtext',
      widget: 'textarea',
      searchable: true,
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'draft',
      widget: 'badge',
      options: [
        { value: 'draft',     label: { id: 'Draf',       en: 'Draft' } },
        { value: 'published', label: { id: 'Terbit',     en: 'Published' } },
        { value: 'archived',  label: { id: 'Diarsipkan', en: 'Archived' } },
      ],
    },
    visibility: {
      name: 'visibility',
      label: { id: 'Visibilitas', en: 'Visibility' },
      type: 'enum',
      required: true,
      default: 'internal',
      options: [
        { value: 'internal', label: { id: 'Internal', en: 'Internal' } },
        { value: 'portal',   label: { id: 'Portal',   en: 'Portal' } },
        { value: 'public',   label: { id: 'Publik',   en: 'Public' } },
      ],
      help:
        'internal=hanya member tenant. portal=kontak portal login. public=siapa pun (tanpa auth).',
    },
    tags: {
      name: 'tags',
      label: { id: 'Tag', en: 'Tags' },
      type: 'tags',
      widget: 'tag-input',
      default: [],
    },
    viewCount: {
      name: 'viewCount',
      label: { id: 'Jumlah Dilihat', en: 'View Count' },
      type: 'integer',
      default: 0,
      readonly: true,
    },
    position: {
      name: 'position',
      label: { id: 'Posisi', en: 'Position' },
      type: 'integer',
      default: 0,
      help: 'Urutan tampilan di sidebar space. Lebih kecil = lebih atas.',
    },
    authorId: {
      name: 'authorId',
      label: { id: 'Penulis', en: 'Author' },
      type: 'many2one',
      target: 'platform.user',
    },
    publishedAt: {
      name: 'publishedAt',
      label: { id: 'Diterbitkan Pada', en: 'Published At' },
      type: 'datetime',
      readonly: true,
    },
    aiSummary: {
      name: 'aiSummary',
      label: { id: 'Ringkasan AI', en: 'AI Summary' },
      type: 'ai-field',
      widget: 'textarea',
      ai: {
        prompt:
          'Buat ringkasan 2–3 kalimat Bahasa Indonesia dari isi artikel ini untuk menjadi excerpt.',
        inputFields: ['title', 'body'],
        model: 'haiku',
        trigger: 'on_demand',
        store: true,
      },
    },
    createdAt: {
      name: 'createdAt',
      label: { id: 'Dibuat Pada', en: 'Created At' },
      type: 'datetime',
      readonly: true,
    },
    updatedAt: {
      name: 'updatedAt',
      label: { id: 'Diperbarui Pada', en: 'Updated At' },
      type: 'datetime',
      readonly: true,
    },
  },

  views: {
    list: {
      columns: ['title', 'spaceId', 'status', 'visibility', 'authorId', 'updatedAt'],
      defaultSort: { field: 'updatedAt', direction: 'desc' },
      filters: ['status', 'visibility', 'spaceId', 'authorId'],
    },
    form: {
      rows: [
        'title',
        ['status', 'visibility', 'spaceId'],
      ],
      tabs: [
        {
          id: 'content',
          label: { id: 'Isi', en: 'Content' },
          rows: ['bodyJson', 'excerpt'],
        },
        {
          id: 'meta',
          label: { id: 'Meta', en: 'Meta' },
          rows: [
            ['slug', 'parentId'],
            ['authorId', 'position'],
            ['tags', 'viewCount'],
            'publishedAt',
          ],
        },
        {
          id: 'ai',
          label: { id: 'AI', en: 'AI' },
          rows: ['aiSummary'],
        },
      ],
    },
  },

  perms: {
    create: ['admin', 'member', 'agent'],
    read:   ['admin', 'member', 'agent', 'public'],
    update: ['admin', 'member', 'agent'],
    delete: ['admin'],
  },

  chatter: true,
}
