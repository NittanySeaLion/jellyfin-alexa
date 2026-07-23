const Alexa = require('ask-sdk-core');
const queueStore = require('../state/queueStore');
const { buildStreamUrl } = require('../jellyfin/streamUrl');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

const PauseIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    return (requestType === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent')
      || requestType === 'PlaybackController.PauseCommandIssued';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  },
};

const ResumeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const current = queueStore.currentTrackWithToken(userId);
    if (!current) {
      return handlerInput.responseBuilder
        .speak("There's nothing queued to resume. Try saying, play, followed by an artist or album.")
        .getResponse();
    }

    // No offset tracking in v1, so resume restarts the current track from the beginning.
    // NOTE: verify empirically whether this handler is even invoked -- Alexa/Echo may resume
    // playback client-side from the paused offset without ever calling the skill.
    const streamUrl = buildStreamUrl(current.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, current.token, 0, null)
      .getResponse();
  },
};

const NextIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    return (requestType === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent')
      || requestType === 'PlaybackController.NextCommandIssued';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const next = queueStore.advance(userId);
    if (!next) {
      return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    const streamUrl = buildStreamUrl(next.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, next.token, 0, null)
      .getResponse();
  },
};

const PreviousIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    return (requestType === 'IntentRequest' && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent')
      || requestType === 'PlaybackController.PreviousCommandIssued';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const previous = queueStore.goBack(userId);
    if (!previous) {
      return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    const streamUrl = buildStreamUrl(previous.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, previous.token, 0, null)
      .getResponse();
  },
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    if (requestType === 'PlaybackController.StopCommandIssued') {
      return true;
    }
    if (requestType !== 'IntentRequest') {
      return false;
    }
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    return intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    queueStore.clear(userId);
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .withShouldEndSession(true)
      .getResponse();
  },
};

module.exports = {
  PauseIntentHandler,
  ResumeIntentHandler,
  NextIntentHandler,
  PreviousIntentHandler,
  StopIntentHandler,
};
