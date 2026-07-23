const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Unhandled skill error', error);
    return handlerInput.responseBuilder
      .speak('Sorry, something went wrong talking to Jellyfin.')
      .getResponse();
  },
};

module.exports = { ErrorHandler };
