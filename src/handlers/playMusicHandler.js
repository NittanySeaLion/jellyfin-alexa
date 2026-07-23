const Alexa = require('ask-sdk-core');
const { playQuery } = require('./playShared');

const PlayMusicIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayMusicIntent';
  },
  handle(handlerInput) {
    const query = Alexa.getSlotValue(handlerInput.requestEnvelope, 'query');
    return playQuery(handlerInput, query);
  },
};

module.exports = { PlayMusicIntentHandler };
