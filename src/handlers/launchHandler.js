const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    // Keep the session open (with a reprompt) so a direct follow-up like "play u2" matches
    // PlayMusicIntent instead of falling through to Alexa's built-in Music domain once the
    // session has already ended.
    const speakOutput = 'Jellyfin skill ready. Say play, followed by an artist, album, playlist, or song.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

module.exports = { LaunchRequestHandler };
