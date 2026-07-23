const Alexa = require('ask-sdk-core');
const jellyfinClient = require('../jellyfin/client');
const { buildStreamUrl } = require('../jellyfin/streamUrl');
const queueStore = require('../state/queueStore');

const PlayMusicIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayMusicIntent';
  },
  async handle(handlerInput) {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    const query = Alexa.getSlotValue(handlerInput.requestEnvelope, 'query');

    if (!query) {
      return handlerInput.responseBuilder
        .speak("I didn't catch what to play. Try saying, play, followed by an artist or album.")
        .getResponse();
    }

    let result;
    try {
      result = await jellyfinClient.findPlayableItem(query);
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

    // Leave the session open (no reprompt, so nothing talks over the music) so a bare
    // follow-up like "play radiohead" has a chance to match PlayMusicIntent again instead
    // of falling through to Alexa's built-in Music domain.
    return handlerInput.responseBuilder
      .speak(`Playing ${result.match.Name}.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, token, 0, null)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = { PlayMusicIntentHandler };
