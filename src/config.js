function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  jellyfinUrl: required('JELLYFIN_URL').replace(/\/+$/, ''),
  jellyfinApiKey: required('JELLYFIN_API_KEY'),
  jellyfinUserId: required('JELLYFIN_USER_ID'),
  publicBaseUrl: required('PUBLIC_BASE_URL').replace(/\/+$/, ''),
  streamSigningSecret: required('STREAM_SIGNING_SECRET'),
  port: Number(process.env.PORT) || 1456,
};
