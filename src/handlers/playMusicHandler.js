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

const ShuffleMusicIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShuffleMusicIntent';
  },
  handle(handlerInput) {
    const query = Alexa.getSlotValue(handlerInput.requestEnvelope, 'query');
    return playQuery(handlerInput, query, undefined, { shuffle: true });
  },
};

module.exports = { PlayMusicIntentHandler, ShuffleMusicIntentHandler };
