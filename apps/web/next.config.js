const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace files from repo root so pnpm-symlinked workspace
  // packages and their native deps land in the Vercel lambda bundle.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@kantorcore/ui', '@kantorcore/db', '@kantorcore/auth'],
  serverExternalPackages: ['postgres'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // postgres uses Node.js net/tls — treat as require()-at-runtime so
      // webpack doesn't try to bundle it for the browser.
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals]
      config.externals = [
        ...externals,
        ({ request }, cb) => {
          if (request === 'postgres') {
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
