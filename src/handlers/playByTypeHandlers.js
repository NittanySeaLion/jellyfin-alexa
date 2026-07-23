const Alexa = require('ask-sdk-core');
const jellyfinClient = require('../jellyfin/client');
const { playQuery } = require('./playShared');

const PlayArtistIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayArtistIntent';
  },
  handle(handlerInput) {
    const artist = Alexa.getSlotValue(handlerInput.requestEnvelope, 'artist');
    return playQuery(handlerInput, artist, jellyfinClient.ITEM_TYPE_ARTIST);
  },
};

const PlayAlbumIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayAlbumIntent';
  },
  handle(handlerInput) {
    const album = Alexa.getSlotValue(handlerInput.requestEnvelope, 'album');
    return playQuery(handlerInput, album, jellyfinClient.ITEM_TYPE_ALBUM);
  },
};

const PlayPlaylistIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPlaylistIntent';
  },
  handle(handlerInput) {
    const playlist = Alexa.getSlotValue(handlerInput.requestEnvelope, 'playlist');
    return playQuery(handlerInput, playlist, jellyfinClient.ITEM_TYPE_PLAYLIST);
  },
};

module.exports = {
  PlayArtistIntentHandler,
  PlayAlbumIntentHandler,
  PlayPlaylistIntentHandler,
};
