const Alexa = require('ask-sdk-core');
const queueStore = require('../state/queueStore');
const { buildStreamUrl } = require('../jellyfin/streamUrl');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

const PlaybackStartedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackStarted';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const { token } = handlerInput.requestEnvelope.request;
    queueStore.setIndexFromToken(userId, token);
    return handlerInput.responseBuilder.getResponse();
  },
};

const PlaybackFinishedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackFinished';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const PlaybackStoppedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackStopped';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const PlaybackNearlyFinishedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackNearlyFinished';
  },
  handle(handlerInput) {
    const userId = getUserId(handlerInput);
    const next = queueStore.peekNext(userId);
    if (!next) {
      return handlerInput.responseBuilder.getResponse();
    }

    const { token: previousToken } = handlerInput.requestEnvelope.request;
    const streamUrl = buildStreamUrl(next.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('ENQUEUE', streamUrl, next.token, 0, previousToken)
      .getResponse();
  },
};

const PlaybackFailedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackFailed';
  },
  handle(handlerInput) {
    console.error('AudioPlayer.PlaybackFailed', JSON.stringify(handlerInput.requestEnvelope.request.error));

    const userId = getUserId(handlerInput);
    const next = queueStore.advance(userId);
    if (!next) {
      return handlerInput.responseBuilder.addAudioPlayerStopDirective().getResponse();
    }

    const streamUrl = buildStreamUrl(next.track.Id);
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl, next.token, 0, null)
      .getResponse();
  },
};

module.exports = {
  PlaybackStartedHandler,
  PlaybackFinishedHandler,
  PlaybackStoppedHandler,
  PlaybackNearlyFinishedHandler,
  PlaybackFailedHandler,
};
