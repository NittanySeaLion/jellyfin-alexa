const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const skill = require('./skill');
const config = require('./config');

const adapter = new ExpressAdapter(skill, true, true);

const app = express();

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  res.on('finish', () => {
    console.log(`[${timestamp}] ${req.method} ${req.path} -> ${res.statusCode}`);
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('jellyfin-alexa skill endpoint is running');
});

app.post('/alexa', adapter.getRequestHandlers());

app.listen(config.port, () => {
  console.log(`jellyfin-alexa listening on port ${config.port}`);
});
