const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JELLYFIN_URL = process.env.JELLYFIN_URL || 'http://jellyfin.local:8096';
process.env.JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || 'test-api-key';
process.env.JELLYFIN_USER_ID = process.env.JELLYFIN_USER_ID || 'test-user-id';

const queueStore = require('../src/state/queueStore');

test('queue advances through tracks and reports tokens', () => {
  const userId = 'user-queue-test';
  const tracks = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }];
  queueStore.setQueue(userId, tracks, 'Test Album');

  const first = queueStore.currentTrackWithToken(userId);
  assert.equal(first.track.Id, 'a');
  assert.equal(queueStore.hasNext(userId), true);

  const next = queueStore.advance(userId);
  assert.equal(next.track.Id, 'b');

  queueStore.advance(userId);
  assert.equal(queueStore.hasNext(userId), false);
  assert.equal(queueStore.advance(userId), null);

  const previous = queueStore.goBack(userId);
  assert.equal(previous.track.Id, 'b');

  queueStore.clear(userId);
  assert.equal(queueStore.getQueue(userId), null);
});

test('setIndexFromToken only accepts tokens for the current queue', () => {
  const userId = 'user-queue-test-2';
  queueStore.setQueue(userId, [{ Id: 'x' }, { Id: 'y' }], 'Test');

  queueStore.setIndexFromToken(userId, '1:y');
  assert.equal(queueStore.currentTrack(userId).Id, 'y');

  queueStore.setIndexFromToken(userId, '5:z');
  assert.equal(queueStore.currentTrack(userId).Id, 'y');

  queueStore.clear(userId);
});
