const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace files from repo root so pnpm-symlinked workspace
  // packages and their native deps land in the Vercel lambda bundle.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Force-include native modules that nft misses because they appear as
  // webpack externals (require() calls) rather than static imports.
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/.pnpm/@node-rs+argon2@*/**',
      '../../node_modules/.pnpm/@node-rs+argon2-*/**',
      '../../node_modules/.pnpm/node_modules/@node-rs/argon2/**',
      '../../node_modules/.pnpm/node_modules/@node-rs/argon2-linux-x64-gnu/**',
      '../../node_modules/.pnpm/postgres@*/**',
      '../../node_modules/.pnpm/node_modules/postgres/**',
    ],
  },
  transpilePackages: ['@kantorcore/ui', '@kantorcore/db', '@kantorcore/auth'],
  serverExternalPackages: ['@node-rs/argon2', 'postgres'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Native bindings imported transitively via workspace packages bypass
      // `serverExternalPackages`. Treat them as require()-at-runtime.
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals]
      config.externals = [
        ...externals,
        ({ request }, cb) => {
          if (request === '@node-rs/argon2' || request === 'postgres') {
            return cb(null, `commonjs ${request}`)
          }
          cb()
        },
      ]
    }
    return config
  },
}
module.exports = nextConfig
