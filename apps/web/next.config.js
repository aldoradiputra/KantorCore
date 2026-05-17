/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kantr/ui'],
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
