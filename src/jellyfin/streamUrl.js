const crypto = require('crypto');
const config = require('../config');

// Long enough to cover a full track (plus buffering/retries) without needing a mid-playback
// refresh, short enough to limit exposure if a URL ever leaked (e.g. via logs).
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

function signStreamToken(trackId, expiresAt) {
  return crypto.createHmac('sha256', config.streamSigningSecret)
    .update(`${trackId}:${expiresAt}`)
    .digest('hex');
}

function verifyStreamToken(trackId, expiresAt, signature) {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const expected = Buffer.from(signStreamToken(trackId, expiresAt), 'hex');
  const given = Buffer.from(String(signature || ''), 'hex');
  if (expected.length !== given.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, given);
}

// Public-facing URL handed to Alexa. Points at this server's own /stream proxy route with a
// short-lived signed token -- carries no Jellyfin credentials at all. The real Jellyfin URL
// (buildJellyfinStreamUrl, below) is only ever used server-side, never sent to Alexa/Amazon.
function buildStreamUrl(trackId) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const signature = signStreamToken(trackId, expiresAt);
  const url = new URL(`${config.publicBaseUrl}/stream/${trackId}`);
  url.searchParams.set('exp', String(expiresAt));
  url.searchParams.set('sig', signature);
  return url.toString();
}

// Real Jellyfin universal-audio URL, including the actual API key. Only ever called
// server-side, by the /stream proxy route -- never sent to Alexa/Amazon.
//
// Alexa's AudioPlayer only supports AAC/MP4, MP3, and HLS at 16-384kbps -- it cannot play
// FLAC/lossless sources directly. Forcing mp3 output here means Jellyfin transcodes any
// source format to something Alexa is guaranteed to support (requires working FFmpeg on
// the Jellyfin server for non-mp3 libraries).
function buildJellyfinStreamUrl(trackId) {
  const url = new URL(`${config.jellyfinUrl}/Audio/${trackId}/universal`);
  url.searchParams.set('UserId', config.jellyfinUserId);
  url.searchParams.set('DeviceId', 'alexa-jellyfin-skill');
  url.searchParams.set('api_key', config.jellyfinApiKey);
  url.searchParams.set('Container', 'mp3');
  url.searchParams.set('AudioCodec', 'mp3');
  url.searchParams.set('TranscodingContainer', 'mp3');
  url.searchParams.set('TranscodingProtocol', 'http');
  url.searchParams.set('AudioBitRate', '192000');
  url.searchParams.set('MaxAudioBitDepth', '16');
  return url.toString();
}

module.exports = {
  buildStreamUrl,
  buildJellyfinStreamUrl,
  verifyStreamToken,
};
