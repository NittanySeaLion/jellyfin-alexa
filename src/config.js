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
  port: Number(process.env.PORT) || 3000,
};
