/**
 * Central registry of persistence keys used across the application.
 *
 * IMPORTANT: Do NOT change these values — they match data already stored in
 * users' browsers. Renaming any key silently loses all saved songs/settings.
 */

export const KEYS = {
  songs:    'lyric_songs_v1',
  bg:       'lyric_bg_v1',
  bgVideos: 'lyric_bg_videos',
};

/** IndexedDB database name. */
export const DB_NAME    = 'lyric_projector_db';
/** IndexedDB schema version. Bump only when adding/removing object stores. */
export const DB_VERSION = 1;
/** Name of the object store that holds video ArrayBuffers. */
export const DB_STORE   = 'media';

/** BroadcastChannel name shared between the Editor and Projector tabs. */
export const CHANNEL_NAME = 'lyric-projector';
