const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JELLYFIN_URL = 'http://jellyfin.local:8096';
process.env.JELLYFIN_API_KEY = 'test-api-key';
process.env.JELLYFIN_USER_ID = 'test-user-id';
process.env.PUBLIC_BASE_URL = 'https://alexa.example.com';
process.env.STREAM_SIGNING_SECRET = 'test-signing-secret';
process.env.PORT = '3000';

const { buildStreamUrl, buildJellyfinStreamUrl, verifyStreamToken } = require('../src/jellyfin/streamUrl');

test('buildJellyfinStreamUrl points at the universal endpoint with a compatible codec', () => {
  const url = new URL(buildJellyfinStreamUrl('track-123'));
  assert.equal(url.origin, 'http://jellyfin.local:8096');
  assert.equal(url.pathname, '/Audio/track-123/universal');
  assert.equal(url.searchParams.get('UserId'), 'test-user-id');
  assert.equal(url.searchParams.get('api_key'), 'test-api-key');
  assert.equal(url.searchParams.get('AudioCodec'), 'mp3');
  assert.equal(url.searchParams.get('Container'), 'mp3');
});

test('buildStreamUrl points at this server\'s own proxy route with a valid signed token, no Jellyfin credentials', () => {
  const url = new URL(buildStreamUrl('track-123'));
  assert.equal(url.origin, 'https://alexa.example.com');
  assert.equal(url.pathname, '/stream/track-123');
  assert.equal(url.searchParams.has('api_key'), false);

  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig');
  assert.equal(verifyStreamToken('track-123', exp, sig), true);
});

test('verifyStreamToken rejects tampered or expired tokens', () => {
  const url = new URL(buildStreamUrl('track-123'));
  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig');

  assert.equal(verifyStreamToken('a-different-track', exp, sig), false);
  assert.equal(verifyStreamToken('track-123', exp, 'not-the-real-signature'), false);
  assert.equal(verifyStreamToken('track-123', Date.now() - 1000, sig), false);
});
