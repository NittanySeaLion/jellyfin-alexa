const jellyfinClient = require('../jellyfin/client');
const { buildStreamUrl } = require('../jellyfin/streamUrl');
const queueStore = require('../state/queueStore');

// Shared by PlayMusicIntent and the type-specific PlayArtist/Album/PlaylistIntent handlers:
// search (optionally restricted to itemTypes), resolve to a track list, queue it, and play.
async function playQuery(handlerInput, query, itemTypes) {
  if (!query) {
    return handlerInput.responseBuilder
      .speak("I didn't catch what to play. Try saying, play, followed by an artist or album.")
      .getResponse();
  }

  const userId = handlerInput.requestEnvelope.context.System.user.userId;

  let result;
  try {
    result = await jellyfinClient.findPlayableItem(query, itemTypes);
  } catch (err) {
    console.error('Jellyfin lookup failed', err);
    return handlerInput.responseBuilder
      .speak("I couldn't reach Jellyfin just now. Please try again in a moment.")
      .getResponse();
  }

  if (!result) {
    return handlerInput.responseBuilder
      .speak(`I couldn't find anything in Jellyfin matching ${query}.`)
      .getResponse();
  }

  queueStore.setQueue(userId, result.tracks, result.match.Name);
  const { track, token } = queueStore.currentTrackWithToken(userId);
  const streamUrl = buildStreamUrl(track.Id);

  return handlerInput.responseBuilder
    .speak(`Playing ${result.match.Name}.`)
    .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, token, 0, null)
    .withShouldEndSession(false)
    .getResponse();
}

module.exports = { playQuery };
