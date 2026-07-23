const Alexa = require('ask-sdk-core');

const { LaunchRequestHandler, OpenPlayerIntentHandler } = require('./handlers/launchHandler');
const { PlayMusicIntentHandler } = require('./handlers/playMusicHandler');
const {
  PlayArtistIntentHandler,
  PlayAlbumIntentHandler,
  PlayPlaylistIntentHandler,
} = require('./handlers/playByTypeHandlers');
const {
  PauseIntentHandler,
  ResumeIntentHandler,
  NextIntentHandler,
  PreviousIntentHandler,
  StopIntentHandler,
} = require('./handlers/playbackControlHandlers');
const { ShuffleIntentHandler, RepeatIntentHandler } = require('./handlers/queueControlHandlers');
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
    OpenPlayerIntentHandler,
    PlayMusicIntentHandler,
    PlayArtistIntentHandler,
    PlayAlbumIntentHandler,
    PlayPlaylistIntentHandler,
    PauseIntentHandler,
    ResumeIntentHandler,
    NextIntentHandler,
    PreviousIntentHandler,
    StopIntentHandler,
    ShuffleIntentHandler,
    RepeatIntentHandler,
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
