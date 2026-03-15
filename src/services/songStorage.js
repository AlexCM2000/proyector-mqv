/**
 * Persistence helpers for the songs library.
 *
 * Reads and writes to localStorage using the key defined in storageKeys.js.
 * Does NOT trigger BroadcastChannel updates — that is the caller's responsibility.
 */

import { KEYS } from '../utils/storageKeys.js';

/**
 * Loads the songs array from localStorage.
 * Returns null if no data is stored yet (so the caller can decide to seed
 * with sample data). Returns [] on parse failure.
 *
 * @returns {object[]|null}
 */
export function loadSongs() {
  try {
    const stored = localStorage.getItem(KEYS.songs);
    if (stored === null) return null;
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

/**
 * Saves the songs array to localStorage.
 *
 * @param {object[]} songs
 */
export function saveSongs(songs) {
  localStorage.setItem(KEYS.songs, JSON.stringify(songs));
}
