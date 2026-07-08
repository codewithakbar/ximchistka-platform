const { validateNextPublicEnv } = require('../../deploy/validate-next-env.cjs');
validateNextPublicEnv('client-web');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ximchistka/shared'],
};

module.exports = nextConfig;
