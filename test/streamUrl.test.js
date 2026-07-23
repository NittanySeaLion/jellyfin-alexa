const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JELLYFIN_URL = 'http://jellyfin.local:8096';
process.env.JELLYFIN_API_KEY = 'test-api-key';
process.env.JELLYFIN_USER_ID = 'test-user-id';
process.env.PORT = '3000';

const { buildStreamUrl } = require('../src/jellyfin/streamUrl');

test('buildStreamUrl points at the universal endpoint with a compatible codec', () => {
  const url = new URL(buildStreamUrl('track-123'));
  assert.equal(url.origin, 'http://jellyfin.local:8096');
  assert.equal(url.pathname, '/Audio/track-123/universal');
  assert.equal(url.searchParams.get('UserId'), 'test-user-id');
  assert.equal(url.searchParams.get('api_key'), 'test-api-key');
  assert.equal(url.searchParams.get('AudioCodec'), 'mp3');
  assert.equal(url.searchParams.get('Container'), 'mp3');
});
