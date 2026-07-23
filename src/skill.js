const Alexa = require('ask-sdk-core');

const { LaunchRequestHandler } = require('./handlers/launchHandler');
const { PlayMusicIntentHandler } = require('./handlers/playMusicHandler');
const {
  PauseIntentHandler,
  ResumeIntentHandler,
  NextIntentHandler,
  PreviousIntentHandler,
  StopIntentHandler,
} = require('./handlers/playbackControlHandlers');
const {
  PlaybackStartedHandler,
  PlaybackFinishedHandler,
  PlaybackStoppedHandler,
  PlaybackNearlyFinishedHandler,
  PlaybackFailedHandler,
} = require('./handlers/audioPlayerHandlers');
const {
  HelpIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
} = require('./handlers/standardHandlers');
const { ErrorHandler } = require('./handlers/errorHandler');

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayMusicIntentHandler,
    PauseIntentHandler,
    ResumeIntentHandler,
    NextIntentHandler,
    PreviousIntentHandler,
    StopIntentHandler,
    PlaybackStartedHandler,
    PlaybackFinishedHandler,
    PlaybackStoppedHandler,
    PlaybackNearlyFinishedHandler,
    PlaybackFailedHandler,
    HelpIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .create();

module.exports = skill;
