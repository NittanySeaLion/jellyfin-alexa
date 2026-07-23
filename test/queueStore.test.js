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

test('shuffleUpcoming only reorders tracks after the current index', () => {
  const userId = 'user-queue-test-3';
  const tracks = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }, { Id: 'd' }, { Id: 'e' }];
  queueStore.setQueue(userId, tracks, 'Test');
  queueStore.advance(userId); // currentIndex now 1 (track 'b')

  assert.equal(queueStore.shuffleUpcoming(userId), true);
  const queue = queueStore.getQueue(userId);
  assert.equal(queue.tracks[0].Id, 'a');
  assert.equal(queue.tracks[1].Id, 'b');
  assert.deepEqual(
    queue.tracks.slice(2).map((t) => t.Id).sort(),
    ['c', 'd', 'e'],
  );

  assert.equal(queueStore.shuffleUpcoming('no-such-user'), false);
  queueStore.clear(userId);
});

test('repeat mode is per-user and requires an active queue', () => {
  const userId = 'user-queue-test-4';
  assert.equal(queueStore.setRepeat(userId, true), false);
  assert.equal(queueStore.isRepeatEnabled(userId), false);

  queueStore.setQueue(userId, [{ Id: 'a' }], 'Test');
  assert.equal(queueStore.setRepeat(userId, true), true);
  assert.equal(queueStore.isRepeatEnabled(userId), true);

  queueStore.clear(userId);
});
