# jellyfin-alexa

A self-hosted custom Alexa skill for voice-controlled music playback from a [Jellyfin](https://jellyfin.org/) media server. This is original code, independent of the existing `infinityofspace/jellyfin-alexa-skill` project.

## How it works

Alexa itself is the audio player. When you say something like "Alexa, ask Jellyfin to play Daft Punk", the skill:

1. Searches your Jellyfin library for a matching artist, album, playlist, or song.
2. Resolves that match to an ordered list of tracks.
3. Tells the Echo device to stream the audio directly from Jellyfin's HTTP API via Alexa's [AudioPlayer interface](https://developer.amazon.com/en-US/docs/alexa/custom-skills/audioplayer-interface-reference.html).

There's no separate playback client to control — Alexa is the speaker. The skill's backend is a small Node.js/Express service, self-hosted (not AWS Lambda), meant to run as a Docker container alongside your Jellyfin server and reached through your existing Cloudflare Tunnel.

Supported voice commands (v1): play by artist/album/playlist/song, pause, resume, next, previous, stop. Volume is handled natively by the Echo device. Shuffle, repeat, "what's playing", and multi-user account linking are explicitly out of scope for v1.

## Project layout

```
src/
  index.js                       Express app + Alexa request routing
  skill.js                       Registers all request/error handlers
  config.js                      Env var loading/validation
  handlers/                      One file per group of intents/requests
  jellyfin/client.js             Jellyfin search + track-list resolution
  jellyfin/streamUrl.js          Builds transcoded stream URLs
  state/queueStore.js            In-memory per-user playback queue
skill-package/
  skill.json                     Alexa skill manifest
  interactionModels/custom/en-US.json   Intents, slots, sample utterances
```

## Setup

### 1. Verify your Jellyfin server first (do this before touching Alexa)

A few things are worth checking directly against your Jellyfin server before wiring up the skill, since behavior varies by version when authenticating with an API key (rather than a user login token).

The skill code sends the API key as an `X-Emby-Token` header, but a plain browser address bar can't set custom headers — so for these manual checks, pass the key as an `api_key` query param instead (Jellyfin accepts either). Also note `<id>` below means your Jellyfin **user GUID** (Dashboard → Users → click your user → the GUID is in that page's URL), not your username.

- **Search**: `GET {JELLYFIN_URL}/Items?searchTerm=<query>&IncludeItemTypes=MusicArtist,MusicAlbum,Playlist,Audio&Recursive=true&UserId=<id>&api_key=<key>` — replace `<query>` with a real search term, e.g. `daft%20punk`. Confirm it returns the item types you expect. A 401 here means the `api_key`/header isn't reaching Jellyfin; a 400 or empty result with the right key usually means `UserId` is wrong (username instead of GUID, or a GUID from the wrong server).
- **Playlists**: `GET {JELLYFIN_URL}/Playlists/<playlistId>/Items?UserId=<id>&api_key=<key>` — some Jellyfin versions reject this under API-key-only auth ([jellyfin/jellyfin#15600](https://github.com/jellyfin/jellyfin/issues/15600)); the client falls back to `/Items?ParentId=<playlistId>` automatically if it fails, but it's worth knowing which path your server uses.
- **Transcoding**: open `{JELLYFIN_URL}/Audio/<trackId>/universal?UserId=<id>&api_key=<key>&Container=mp3&AudioCodec=mp3` in a browser or VLC and confirm it plays. Alexa's AudioPlayer only supports AAC/MP3/HLS at 16–384kbps, so if your library is FLAC/lossless, Jellyfin must transcode — this requires working FFmpeg on the server.

### 2. Configure and run the container (on the NAS, alongside Jellyfin)

```
cp .env.example .env
# edit .env: JELLYFIN_URL (internal address), JELLYFIN_API_KEY, JELLYFIN_USER_ID
```

`JELLYFIN_API_KEY` comes from Jellyfin's Dashboard → API Keys. `JELLYFIN_USER_ID` is the id of the Jellyfin user whose library/permissions this skill uses — visible in the URL when viewing that user under Dashboard → Users.

If a Docker network doesn't already tie your Jellyfin/Cloudflare containers together, create one (or find the existing one with `docker network ls` and update `docker-compose.yml`'s `networks:` block to match):

```
docker network create jellyfin-net
docker compose up -d --build
```

### 3. Add the Cloudflare Tunnel ingress rule

On whatever host manages your tunnel config, add an ingress entry pointing at this container. If the tunnel container shares the `jellyfin-net` Docker network, you can reference the service by name:

```yaml
ingress:
  - hostname: alexa-jellyfin.example.com   # replace with your real subdomain
    service: http://jellyfin-alexa:3000
```

Otherwise, use the NAS's LAN IP and the published port instead of the service name.

### 4. Create the skill in the Alexa Developer Console

1. Create a new skill → **Custom** model → **Provision your own** (not Lambda) → category **Music & Audio**.
2. Under Interaction Model → JSON Editor, paste in `skill-package/interactionModels/custom/en-US.json`.
3. Under Endpoint, choose **HTTPS**, enter `https://<your-real-hostname>/alexa`, and set the SSL certificate type to "My development endpoint has a certificate from a trusted certificate authority" (correct since Cloudflare issues a publicly trusted cert).
4. Under Interfaces, make sure **Audio Player** is enabled.
5. Build the model, then use the **Test** tab to try it out.

## Testing

1. **Jellyfin API checks** (see step 1 above) — do these first, independent of Alexa.
2. **Endpoint smoke test**: with the container running, `curl` its `/alexa` route with a hand-built sample ASK request (see the [ASK SDK docs](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html) for sample payloads) to confirm it returns valid response JSON before involving Amazon's infrastructure at all.
3. **Developer Console simulator**: use the Test tab to try "open jellyfin" and "play \<something\>", and inspect the response JSON for a correctly-shaped `AudioPlayer.Play` directive.
4. **Real device**: enable the skill for testing on your account and try it on an actual Echo.
5. **Unit tests**: `npm test` runs a couple of lightweight tests (Node's built-in test runner) covering the stream URL builder and the queue store logic.

## Known limitations

- **In-memory queue state**: playback queue/position is held in a single process's memory, keyed by Alexa user id. A container restart mid-playback drops the queue — just say "play" again. This is an accepted trade-off for a single-household, single-instance deployment, not a bug.
- **Resume behavior is unverified**: whether `AMAZON.ResumeIntent` is even delivered to the skill (vs. handled client-side by the Echo) hasn't been confirmed — test this in the simulator/on-device before relying on it.
- **Alexa+ transition**: as of mid-2026 Amazon is mid-rollout on "Alexa+", its generative-AI Alexa experience. Custom skills and the AudioPlayer interface are not deprecated and remain reachable under Alexa+ via "Original Alexa Skills", but there are scattered reports of third-party skill instability during this transition. Worth re-verifying end-to-end if something that used to work stops working after an Alexa+ update.

## Privacy

This repo is public. Nothing environment-specific — real Jellyfin URL/IP, API key, user id, or Cloudflare hostname — is committed; only placeholders appear in `.env.example` and `skill-package/skill.json`. Keep your real `.env` local (it's git-ignored) and double-check `git diff --staged` before pushing any config changes.
