const config = require('../config');

// Alexa's AudioPlayer only supports AAC/MP4, MP3, and HLS at 16-384kbps -- it cannot play
// FLAC/lossless sources directly. Forcing mp3 output here means Jellyfin transcodes any
// source format to something Alexa is guaranteed to support (requires working FFmpeg on
// the Jellyfin server for non-mp3 libraries).
function buildStreamUrl(trackId) {
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

module.exports = { buildStreamUrl };
