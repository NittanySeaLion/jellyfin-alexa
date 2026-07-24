const { Readable } = require('node:stream');
const { buildJellyfinStreamUrl, verifyStreamToken } = require('./jellyfin/streamUrl');

// Proxies audio from Jellyfin so the real JELLYFIN_API_KEY never reaches Alexa/Amazon's
// infrastructure -- Alexa only ever sees this server's own short-lived signed token URL
// (see buildStreamUrl in jellyfin/streamUrl.js).
async function streamProxyHandler(req, res) {
  const { trackId } = req.params;
  const { exp, sig } = req.query;

  if (!exp || !sig || !verifyStreamToken(trackId, Number(exp), sig)) {
    res.status(403).send('Invalid or expired stream token');
    return;
  }

  try {
    const upstream = await fetch(buildJellyfinStreamUrl(trackId));
    if (!upstream.ok || !upstream.body) {
      res.status(502).send('Unable to fetch stream from Jellyfin');
      return;
    }

    res.status(200);
    res.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('Stream proxy error', err);
    if (!res.headersSent) {
      res.status(502).send('Stream proxy error');
    }
  }
}

module.exports = { streamProxyHandler };
