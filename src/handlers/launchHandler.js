const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Jellyfin skill ready. Say play, followed by an artist, album, playlist, or song.')
      .withShouldEndSession(true)
      .getResponse();
  },
};

module.exports = { LaunchRequestHandler };
