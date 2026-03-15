/**
 * IndexedDB access layer for binary media (video ArrayBuffers).
 *
 *   Database:     lyric_projector_db  (DB_NAME in storageKeys.js)
 *   Object store: media               (DB_STORE in storageKeys.js)
 *
 * Each function opens a fresh DB connection per call — this matches the
 * existing application pattern and avoids holding a persistent connection.
 *
 * IMPORTANT: Do not rename the database or store. Data is already stored in
 * users' browsers under these exact names.
 */

import { DB_NAME, DB_VERSION, DB_STORE } from '../utils/storageKeys.js';

/**
 * Internal helper: opens the DB and calls cb(db, resolve, reject).
 * @param {function(IDBDatabase, function, function): void} cb
 * @returns {Promise<any>}
 */
function openDB(cb) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(DB_STORE);
    req.onsuccess = (e) => {
      try { cb(e.target.result, resolve, reject); }
      catch (err) { reject(err); }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads a video ArrayBuffer from IndexedDB by key.
 *
 * @param {string} key - The video's unique storage key (e.g. "video_1234567890").
 * @returns {Promise<ArrayBuffer|undefined>} Resolves with the buffer, or undefined if not found.
 */
export function readVideoFromDB(key) {
  return openDB((db, resolve, reject) => {
    const get = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
    get.onsuccess = () => resolve(get.result);
    get.onerror   = () => reject(get.error);
  });
}

/**
 * Saves a video ArrayBuffer to IndexedDB.
 *
 * @param {string}      key         - Unique storage key (e.g. "video_" + Date.now()).
 * @param {ArrayBuffer} arrayBuffer - Raw video bytes.
 * @returns {Promise<void>}
 */
export function saveVideoToDB(key, arrayBuffer) {
  return openDB((db, resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(arrayBuffer, key);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Deletes a video entry from IndexedDB.
 *
 * @param {string} key - The storage key to remove.
 * @returns {Promise<void>}
 */
export function deleteVideoFromDB(key) {
  return openDB((db, resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}
