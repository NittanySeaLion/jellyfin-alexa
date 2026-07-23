# jellyfin-alexa

A self-hosted custom Alexa skill for voice-controlled music playback from a [Jellyfin](https://jellyfin.org/) media server. This is original code, independent of the existing `infinityofspace/jellyfin-alexa-skill` project.

## How it works

Alexa itself is the audio player. When you say something like "Alexa, ask jelly fin to play Daft Punk", the skill:

1. Searches your Jellyfin library for a matching artist, album, playlist, or song.
2. Resolves that match to an ordered list of tracks.
3. Tells the Echo device to stream the audio directly from Jellyfin's HTTP API via Alexa's [AudioPlayer interface](https://developer.amazon.com/en-US/docs/alexa/custom-skills/audioplayer-interface-reference.html).

There's no separate playback client to control — Alexa is the speaker. The skill's backend is a small Node.js/Express service, self-hosted (not AWS Lambda), meant to run as a Docker container alongside your Jellyfin server and reached through your existing Cloudflare Tunnel.

Supported voice commands: play by artist/album/playlist/song (either generically, via `PlayMusicIntent`, or with explicit type intents — `PlayArtistIntent`, `PlayAlbumIntent`, `PlayPlaylistIntent`), pause, resume, next, previous, stop, shuffle the rest of the queue, repeat the current track. Volume is handled natively by the Echo device. "What's playing" and multi-user account linking remain out of scope.

**Invocation notes learned the hard way**:
- Say **"ask jelly fin to \_\_\_"** explicitly rather than "play X on jelly fin" — Alexa's built-in Music domain claims any "play X on/by Y" phrasing before it ever reaches third-party skills (only Amazon's invite-only Music Skill API partners can intercept that pattern).
- Native "Alexa, open jelly fin" (`LaunchRequest`) has been unreliable in practice. `OpenPlayerIntent` gives the same "ready" response through the proven-reliable one-shot path instead — say **"ask jelly fin to open"**.
- Once music is playing, "pause"/"next"/"previous"/"resume" work with no re-invocation at all — Alexa routes those to whichever skill currently owns the playing audio, independent of any session or invocation name.

## Project layout

```
src/
  index.js                       Express app + Alexa request routing
  skill.js                       Registers all request/error handlers
  config.js                      Env var loading/validation
  handlers/
    launchHandler.js             LaunchRequest + OpenPlayerIntent (same "ready" response)
    playShared.js                Shared search/queue/play logic used by every play-family intent
    playMusicHandler.js          PlayMusicIntent (generic, backend-disambiguated)
    playByTypeHandlers.js        PlayArtistIntent / PlayAlbumIntent / PlayPlaylistIntent
    playbackControlHandlers.js   Pause/Resume/Next/Previous/Stop
    queueControlHandlers.js      ShuffleIntent / RepeatIntent
    audioPlayerHandlers.js       AudioPlayer.* system request handlers
    standardHandlers.js          Help/Fallback/SessionEnded
    errorHandler.js
  jellyfin/client.js             Jellyfin search + track-list resolution
  jellyfin/streamUrl.js          Builds transcoded stream URLs
  state/queueStore.js            In-memory per-user playback queue, shuffle, repeat
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

### 2. Deploy as a Portainer stack (alongside Jellyfin)

Deploy this using Portainer's **Repository** build method, not "Web editor" — the Web editor only stores the compose file text with no access to this repo's `Dockerfile`/`src/`, so `build: .` has nothing to build from and fails. Repository mode clones the actual repo first, so the build context is there.

**Portainer → Stacks → Add stack**, build method **Repository**:
- Repository URL: `https://github.com/NittanySeaLion/jellyfin-alexa`
- Repository reference: `main` (or `refs/heads/main`, depending on the field)
- Compose path: `docker-compose.yml`
- Authentication: none needed, it's a public repo.

Set these as **Environment variables in the Portainer UI** rather than a plaintext `.env` file on disk:

```
JELLYFIN_URL=http://<nas-lan-ip>:8096   # Jellyfin's internal address, not through Cloudflare
JELLYFIN_API_KEY=<from Jellyfin Dashboard > API Keys>
JELLYFIN_USER_ID=<the Jellyfin user id this skill acts as, from Dashboard > Users>
PORT=1456
```

`docker-compose.yml` reads these via `${VAR}` substitution, so they work identically whether they come from Portainer's stack environment variables or (if you're not using Portainer) a local `.env` file — see `.env.example` for the file-based equivalent.

**To pick up code changes later**: redeploy the stack in Portainer with "Re-pull"/"Re-build" enabled (Repository-mode stacks can pull the latest commit and rebuild), or `git pull && docker compose up -d --build` if driving it over the CLI instead.

No shared Docker network is required: this container just needs its port published on the host, and the Cloudflare tunnel container reaches it via the NAS's own address (see below), the same way it already reaches other services on this NAS.

### 3. Point the Cloudflare Tunnel at it

This NAS's tunnel is a **token-run tunnel** (`cloudflared tunnel --token ...`) — there's no local ingress `config.yml` to edit. Public hostnames are configured remotely in the **Cloudflare Zero Trust dashboard** (Networks → Tunnels → your tunnel → Public Hostname tab), pointing each hostname at a `http://<address>:<port>` target the tunnel container can reach (its own `localhost`, or the NAS's LAN IP, depending on how that entry is set up).

If you're replacing an existing self-hosted Alexa skill that was already wired up this way, the simplest path is to reuse its exact port so the existing Public Hostname entry just starts serving the new container — no dashboard changes needed at all.

### 4. Create the skill in the Alexa Developer Console

1. Create a new skill → **Custom** model → **Provision your own** (not Lambda) → category **Music & Audio**. Give it an invocation name that's **at least two words** — Amazon rejects single-word invocation names.
2. Under Interaction Model → JSON Editor, paste in `skill-package/interactionModels/custom/en-US.json`.
3. Under Endpoint, choose **HTTPS**, enter `https://<your-real-hostname>/alexa`, and set the SSL certificate type carefully:
   - If Cloudflare (or wherever your cert comes from) issued a cert **specifically for that one hostname**, use "My development endpoint has a certificate from a trusted certificate authority."
   - If it's a **wildcard cert** (e.g. `*.yourdomain.com` covering multiple subdomains — common with Cloudflare) use **"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"** instead. Picking the wrong one here silently fails every invocation with a generic "not supported on this device" error and zero server-side logs, since Alexa's own certificate check rejects the connection before ever sending the request — this cost significant debugging time to track down. Check `openssl s_client -connect <host>:443 -servername <host> | openssl x509 -noout -issuer -subject` if you're not sure which kind of cert you have.
4. Under Interfaces, make sure **Audio Player** is enabled.
5. Build the model, then enable it under the Alexa app's Your Skills → Dev tab and test on a real Echo device — see the Testing section below for why the console's own Test tab won't work here.

## Testing

1. **Jellyfin API checks** (see step 1 above) — do these first, independent of Alexa.
2. **Endpoint smoke test**: with the container running, `curl` its `/alexa` route with a hand-built sample ASK request (see the [ASK SDK docs](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html) for sample payloads) to confirm it returns valid response JSON before involving Amazon's infrastructure at all.
3. **Skip the Developer Console's Test tab simulator for actual invocation testing.** It's a known platform limitation: the browser simulator's virtual device doesn't report AudioPlayer support, so it rejects *any* AudioPlayer-interface skill with a generic "Sorry, \<invocation name\> is not supported on this device" before the request ever reaches your endpoint — regardless of how correctly everything else (endpoint, interfaces, invocation name, build) is configured. It's still useful for confirming the interaction model builds without errors, just not for testing real invocation.
4. **Real device, from the start**: enable the skill under the Alexa app's **More → Skills & Games → Your Skills → Dev** tab (same Amazon account as your Developer Console login), then test by talking to an actual Echo/Echo Dot. Use the explicit "ask ___ to ___" phrasing (e.g. "Alexa, ask jelly fin to play \<something\>") rather than "play X on jelly fin" — Alexa's built-in Music domain claims "play X on Y" phrasing before it ever reaches third-party skills (this isn't a bug in the interaction model, it's a platform-level reservation; only Amazon's invite-only Music Skill API partners can intercept that pattern).
5. **Unit tests**: `npm test` runs a couple of lightweight tests (Node's built-in test runner) covering the stream URL builder and the queue store logic.

## Known limitations

- **In-memory queue state**: playback queue/position is held in a single process's memory, keyed by Alexa user id. A container restart mid-playback drops the queue — just say "play" again. This is an accepted trade-off for a single-household, single-instance deployment, not a bug.
- **Resume behavior is unverified**: whether `AMAZON.ResumeIntent` is even delivered to the skill (vs. handled client-side by the Echo) hasn't been confirmed — test this on-device before relying on it.
- **Alexa+ transition**: as of mid-2026 Amazon is mid-rollout on "Alexa+", its generative-AI Alexa experience. Custom skills and the AudioPlayer interface are not deprecated and remain reachable under Alexa+ via "Original Alexa Skills" (which wraps third-party skill responses with its own "Here's \<Skill Name\>... say Alexa exit to get back" framing automatically — no need to add your own exit prompt). There are real, intermittent reports of third-party skill instability during this transition: the exact same phrase can work one moment and fail with a generic "not supported on this device" the next, with no configuration change in between and a fully healthy, reachable endpoint. If that happens, it's very likely Alexa-side, not this skill — retry later rather than re-debugging the deployment.
- **Native "open \<invocation\>" (`LaunchRequest`) has been unreliable** in testing, independent of the above — `OpenPlayerIntent` ("ask jelly fin to open") reaches the identical response through the one-shot path, which has been consistently reliable, so prefer that over "Alexa, open jelly fin."
- **Invocation name must be 2+ words**: Amazon rejects single-word custom-skill invocation names (a single-word name silently failed to save in testing, which surfaced as a confusing "not supported on this device" error rather than a clear validation message).
- **The Developer Console's Test tab simulator can't test this skill at all**: it doesn't report AudioPlayer support in its virtual device context, so it rejects the skill with the same generic "not supported on this device" message regardless of configuration correctness. Test on a real Echo device instead (see Testing section).
- **Wildcard SSL certificates need the matching Endpoint option** (see Setup step 4) — picking the wrong one fails every invocation identically to the two points above (generic rejection, no server logs), so it's easy to misattribute to something else.
- **`ask-sdk-express-adapter` needs the raw request body**: don't add a global `express.json()` (or any other body parser) in front of its route — it needs to verify Alexa's request signature against the raw, unparsed body itself, and a parser ahead of it breaks that with an opaque 500 and no application-level error logged.
- **Handler `canHandle` functions must short-circuit on request type before calling `Alexa.getIntentName()`** — that function throws for any non-`IntentRequest`. Computing it as a bare `const` before checking the request type (instead of relying on `&&` short-circuit evaluation, or an early `return`/`if`) crashes for every `AudioPlayer.*`/`System.*` event, which can silently break unrelated functionality (this broke auto-advance to the next queued track for a while, since the crash happened in an earlier-registered handler before dispatch ever reached `PlaybackNearlyFinishedHandler`).

## Privacy

This repo is public. Nothing environment-specific — real Jellyfin URL/IP, API key, user id, or Cloudflare hostname — is committed; only placeholders appear in `.env.example` and `skill-package/skill.json`. Keep your real `.env` local (it's git-ignored) and double-check `git diff --staged` before pushing any config changes.
