const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace files from repo root so pnpm-symlinked workspace
  // packages and their native deps land in the Vercel lambda bundle.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@kantorcore/ui', '@kantorcore/db'],
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
