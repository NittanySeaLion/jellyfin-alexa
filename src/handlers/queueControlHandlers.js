const Alexa = require('ask-sdk-core');
const queueStore = require('../state/queueStore');
const { buildStreamUrl } = require('../jellyfin/streamUrl');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

// AMAZON.ShuffleOnIntent/ShuffleOffIntent/LoopOnIntent/LoopOffIntent/StartOverIntent are
// Amazon's standard "PlaybackMode" built-ins for AudioPlayer skills -- Alexa routes them
// automatically to whichever skill owns the currently (or most recently) playing audio, the
// same mechanism that already makes pause/next/previous work with no re-invocation needed.
// Using these instead of custom intents means shuffle/repeat get that same no-invocation
// behavior for free, and Amazon's own built-in NLU training for the phrasing.

const ShuffleOnIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOnIntent';
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

// Shuffling here is a one-time reorder rather than a persistent mode, so there's nothing to
// toggle back off -- acknowledge gracefully per Amazon's guidance for PlaybackMode intents
// that don't fully apply to a skill, rather than erroring or ignoring it.
const ShuffleOffIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOffIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Shuffle here is a one-time shuffle rather than a mode, so there's nothing to turn off.")
      .getResponse();
  },
};

const LoopOnIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent';
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

const LoopOffIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    queueStore.setRepeat(userId, false);
    return handlerInput.responseBuilder
      .speak('Repeat is off.')
      .getResponse();
  },
};

const StartOverIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const current = queueStore.currentTrackWithToken(userId);
    if (!current) {
      return handlerInput.responseBuilder
        .speak("There's nothing playing to start over. Try saying, play, followed by an artist or album, first.")
        .getResponse();
    }

    const streamUrl = buildStreamUrl(current.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, current.token, 0, null)
      .getResponse();
  },
};

module.exports = {
  ShuffleOnIntentHandler,
  ShuffleOffIntentHandler,
  LoopOnIntentHandler,
  LoopOffIntentHandler,
  StartOverIntentHandler,
};
