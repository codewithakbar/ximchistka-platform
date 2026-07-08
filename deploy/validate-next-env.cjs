/** Fail production Next.js builds when API URL is missing or points to localhost. */
function validateNextPublicEnv(appName) {
  if (process.env.ENFORCE_PRODUCTION_API_URL !== '1') return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!apiUrl.startsWith('https://') || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    throw new Error(
      `[${appName}] NEXT_PUBLIC_API_URL must be a production https URL before deploy build. ` +
        'Run: set -a && source .env && set +a && ENFORCE_PRODUCTION_API_URL=1 npm run build …',
    );
  }
}

module.exports = { validateNextPublicEnv };
