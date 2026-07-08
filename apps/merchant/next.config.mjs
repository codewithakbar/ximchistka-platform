import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateNextPublicEnv } = require('../../deploy/validate-next-env.cjs');
validateNextPublicEnv('merchant');

/** @type {import('next').NextConfig} */
const basePath = process.env.MERCHANT_BASE_PATH || '';

const nextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  transpilePackages: ['@ximchistka/shared'],
};

export default nextConfig;
