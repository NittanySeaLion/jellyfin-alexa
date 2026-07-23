const Alexa = require('ask-sdk-core');

const READY_MESSAGE = 'Jellyfin skill ready. Say play, followed by an artist, album, playlist, or song.';

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

// "Alexa, open X" (LaunchRequest) has been unreliable in practice, while "Alexa, ask X to
// Y" one-shot invocations reliably route to this skill's own intents. This intent gives the
// same one-shot pattern a way to reach the exact same "ready" response as LaunchRequest,
// bypassing whatever makes native LaunchRequest dispatch flaky.
const OpenPlayerIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OpenPlayerIntent';
  },
  handle: respondReady,
};

module.exports = { LaunchRequestHandler, OpenPlayerIntentHandler };
