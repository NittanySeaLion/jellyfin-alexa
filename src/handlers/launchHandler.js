const Alexa = require('ask-sdk-core');

const READY_MESSAGE = 'Jellyfin skill ready. Say play or shuffle, followed by an artist, album, playlist, or song.';

// Keep the session open (with a reprompt) so a direct follow-up like "play u2" matches
// PlayMusicIntent instead of falling through to Alexa's built-in Music domain once the
// session has already ended.
function respondReady(handlerInput) {
  return handlerInput.responseBuilder
    .speak(READY_MESSAGE)
    .reprompt(READY_MESSAGE)
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle: respondReady,
};

// Earlier testing found native "Alexa, open X" (LaunchRequest) unreliable, which is why this
// intent exists as a one-shot "ask X to open" fallback. Since then, native open has proven
// reliable as step one of the two-part invocation flow (see README) -- kept as a fallback path.
const OpenPlayerIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OpenPlayerIntent';
  },
  handle: respondReady,
};

module.exports = { LaunchRequestHandler, OpenPlayerIntentHandler };
