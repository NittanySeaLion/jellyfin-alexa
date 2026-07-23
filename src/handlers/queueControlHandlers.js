const Alexa = require('ask-sdk-core');
const queueStore = require('../state/queueStore');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

const ShuffleIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShuffleIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const shuffled = queueStore.shuffleUpcoming(userId);
    if (!shuffled) {
      return handlerInput.responseBuilder
        .speak("There's nothing queued to shuffle. Try saying, play, followed by an artist or album, first.")
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak('Shuffling the rest of the queue.')
      .getResponse();
  },
};

const RepeatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepeatIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const enabled = queueStore.setRepeat(userId, true);
    if (!enabled) {
      return handlerInput.responseBuilder
        .speak("There's nothing playing to repeat. Try saying, play, followed by an artist or album, first.")
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak("Okay, I'll keep repeating this track.")
      .getResponse();
  },
};

module.exports = { ShuffleIntentHandler, RepeatIntentHandler };
