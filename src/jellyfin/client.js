const config = require('../config');

const SEARCHABLE_ITEM_TYPES = 'MusicArtist,MusicAlbum,Playlist,Audio';

function authHeaders() {
  return { 'X-Emby-Token': config.jellyfinApiKey };
}

async function jellyfinGet(path, params = {}) {
  const url = new URL(`${config.jellyfinUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`Jellyfin request failed (${response.status}): ${path}`);
  }
  return response.json();
}

async function searchItems(query, itemTypes = SEARCHABLE_ITEM_TYPES) {
  const data = await jellyfinGet('/Items', {
    searchTerm: query,
    IncludeItemTypes: itemTypes,
    Recursive: true,
    UserId: config.jellyfinUserId,
    Limit: 20,
  });
  return data.Items || [];
}

async function getAlbumTracks(albumId) {
  const data = await jellyfinGet('/Items', {
    ParentId: albumId,
    IncludeItemTypes: 'Audio',
    Recursive: true,
    UserId: config.jellyfinUserId,
    SortBy: 'IndexNumber',
  });
  return data.Items || [];
}

async function getArtistTracks(artistId) {
  // Capped at 50 tracks so "play <artist>" on a large discography doesn't queue hundreds of songs.
  const data = await jellyfinGet('/Items', {
    ArtistIds: artistId,
    IncludeItemTypes: 'Audio',
    Recursive: true,
    UserId: config.jellyfinUserId,
    SortBy: 'Album,IndexNumber',
    Limit: 50,
  });
  return data.Items || [];
}

async function getPlaylistTracks(playlistId) {
  try {
    const data = await jellyfinGet(`/Playlists/${playlistId}/Items`, {
      UserId: config.jellyfinUserId,
    });
    return data.Items || [];
  } catch (err) {
    // Some Jellyfin versions reject /Playlists/{id}/Items under API-key-only auth
    // (see jellyfin/jellyfin#15600) -- fall back to the generic parent-item lookup.
    const data = await jellyfinGet('/Items', {
      ParentId: playlistId,
      IncludeItemTypes: 'Audio',
      Recursive: true,
      UserId: config.jellyfinUserId,
    });
    return data.Items || [];
  }
}

async function resolveTracks(item) {
  switch (item.Type) {
    case 'Audio':
      return [item];
    case 'MusicAlbum':
      return getAlbumTracks(item.Id);
    case 'Playlist':
      return getPlaylistTracks(item.Id);
    case 'MusicArtist':
      return getArtistTracks(item.Id);
    default:
      return [];
  }
}

async function findPlayableItem(query, itemTypes) {
  const results = await searchItems(query, itemTypes);
  const match = results[0];
  if (!match) {
    return null;
  }

  const tracks = await resolveTracks(match);
  if (tracks.length === 0) {
    return null;
  }

  return { match, tracks };
}

module.exports = {
  searchItems,
  resolveTracks,
  findPlayableItem,
  ITEM_TYPE_ARTIST: 'MusicArtist',
  ITEM_TYPE_ALBUM: 'MusicAlbum',
  ITEM_TYPE_PLAYLIST: 'Playlist',
};
