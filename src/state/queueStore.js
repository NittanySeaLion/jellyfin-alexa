// Single-process, in-memory playback queue keyed by Alexa userId.
//
// This is sufficient for a single-household, single-container deployment (the scope of this
// project): one Docker instance, one shared Jellyfin credential. A container restart mid-playback
// loses queue position -- accepted v1 trade-off, not a bug. Don't reach for Redis/DynamoDB here
// unless this stops being a single-instance personal skill.

const queues = new Map();

function tokenFor(index, trackId) {
  return `${index}:${trackId}`;
}

function parseToken(token) {
  const separatorIndex = token.indexOf(':');
  return {
    index: Number(token.slice(0, separatorIndex)),
    trackId: token.slice(separatorIndex + 1),
  };
}

function setQueue(userId, tracks, matchName) {
  queues.set(userId, {
    tracks, currentIndex: 0, matchName, repeatEnabled: false,
  });
}

function getQueue(userId) {
  return queues.get(userId) || null;
}

function currentTrack(userId) {
  const queue = queues.get(userId);
  if (!queue) return null;
  return queue.tracks[queue.currentIndex] || null;
}

function currentToken(userId) {
  const queue = queues.get(userId);
  const track = currentTrack(userId);
  if (!queue || !track) return null;
  return tokenFor(queue.currentIndex, track.Id);
}

function currentTrackWithToken(userId) {
  const track = currentTrack(userId);
  if (!track) return null;
  return { track, token: currentToken(userId) };
}

function hasNext(userId) {
  const queue = queues.get(userId);
  if (!queue) return false;
  return queue.currentIndex + 1 < queue.tracks.length;
}

function peekNext(userId) {
  const queue = queues.get(userId);
  if (!queue || !hasNext(userId)) return null;
  const track = queue.tracks[queue.currentIndex + 1];
  return { track, token: tokenFor(queue.currentIndex + 1, track.Id) };
}

function advance(userId) {
  const queue = queues.get(userId);
  if (!queue || !hasNext(userId)) return null;
  queue.currentIndex += 1;
  return currentTrackWithToken(userId);
}

function goBack(userId) {
  const queue = queues.get(userId);
  if (!queue) return null;
  queue.currentIndex = Math.max(0, queue.currentIndex - 1);
  return currentTrackWithToken(userId);
}

function setIndexFromToken(userId, token) {
  const queue = queues.get(userId);
  if (!queue || !token) return;
  const { index } = parseToken(token);
  if (Number.isInteger(index) && index >= 0 && index < queue.tracks.length) {
    queue.currentIndex = index;
  }
}

function clear(userId) {
  queues.delete(userId);
}

// Shuffles the not-yet-played remainder of the queue in place, leaving the current and
// already-played tracks untouched. Downstream reads (peekNext, tokenFor) work off the same
// array, so nothing else needs to know a shuffle happened.
function shuffleUpcoming(userId) {
  const queue = queues.get(userId);
  if (!queue) return false;

  const upcoming = queue.tracks.slice(queue.currentIndex + 1);
  for (let i = upcoming.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
  }
  queue.tracks = [...queue.tracks.slice(0, queue.currentIndex + 1), ...upcoming];
  return true;
}

function setRepeat(userId, enabled) {
  const queue = queues.get(userId);
  if (!queue) return false;
  queue.repeatEnabled = enabled;
  return true;
}

function isRepeatEnabled(userId) {
  const queue = queues.get(userId);
  return Boolean(queue && queue.repeatEnabled);
}

module.exports = {
  setQueue,
  getQueue,
  currentTrack,
  currentToken,
  currentTrackWithToken,
  hasNext,
  peekNext,
  advance,
  goBack,
  setIndexFromToken,
  parseToken,
  clear,
  shuffleUpcoming,
  setRepeat,
  isRepeatEnabled,
};
