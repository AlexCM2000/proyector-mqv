/**
 * Persistence helpers for the global background preferences.
 *
 * Two separate localStorage keys are used:
 *   lyric_bg_v1      — active background mode + selected video ID
 *   lyric_bg_videos  — list of uploaded video metadata (id + name)
 *
 * Binary video data is stored separately in IndexedDB (see mediaDB.js).
 */

import { KEYS } from '../utils/storageKeys.js';

/**
 * Loads background preferences from localStorage.
 * Returns safe defaults on missing or corrupt data.
 *
 * @returns {{ mode: string, videoId: string|null }}
 */
export function loadBgPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.bg) || '{}');
    return { mode: saved.mode || 'dark', videoId: saved.videoId || null };
  } catch (e) {
    return { mode: 'dark', videoId: null };
  }
}

/**
 * Saves background preferences to localStorage.
 *
 * @param {{ mode: string, videoId: string|null }} prefs
 */
export function saveBgPrefs(prefs) {
  localStorage.setItem(KEYS.bg, JSON.stringify(prefs));
}

/**
 * Loads the list of uploaded video metadata from localStorage.
 *
 * @returns {Array<{ id: string, name: string }>}
 */
export function loadVideoList() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.bgVideos) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Saves the video metadata list to localStorage.
 * This stores only id/name — the binary data lives in IndexedDB.
 *
 * @param {Array<{ id: string, name: string }>} list
 */
export function saveVideoList(list) {
  localStorage.setItem(KEYS.bgVideos, JSON.stringify(list));
}
