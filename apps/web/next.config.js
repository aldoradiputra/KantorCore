const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace files from repo root so pnpm-symlinked workspace
  // packages land in the Vercel lambda bundle.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@kantorcore/ui', '@kantorcore/db', '@kantorcore/auth'],
  // postgres is pure JS (uses built-in net/tls) — bundle it inline so the
  // lambda doesn't need to require() it from the filesystem. pnpm strict
  // node_modules layout means the .node require path doesn't exist in the
  // lambda if we externalize it.
}
module.exports = nextConfig
