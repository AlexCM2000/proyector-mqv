/**
 * Factory and helper functions for the "lyric-projector" BroadcastChannel.
 *
 * ─── Message protocol ──────────────────────────────────────────────────────
 *
 * Editor → Projector:
 *   request_state                       — ask projector to send current songs list
 *   songs_updated  { songs }            — full songs list changed
 *   update_song    { song }             — single song added/updated
 *   delete_song    { id }              — single song deleted
 *   bg_updated     { mode, videoId }    — background setting changed
 *   control        { action, targetId, index? } — navigation command
 *                    action: 'next' | 'prev' | 'goto'
 *   clear                               — show blank projector
 *   ping                                — detect whether projector is open
 *
 * Projector → Editor:
 *   state          { songs }            — response to request_state
 *   position       { id, index }        — current song/slide in projector
 *   pong                                — response to ping; projector is alive
 *   projector_closed                    — projector window is about to unload
 *
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Usage in a Vue Options API component:
 *
 *   import { createChannel, broadcastPing } from '../services/broadcastService.js';
 *
 *   created() {
 *     this.bc = createChannel((ev) => { ... handle ev.data ... });
 *     broadcastPing(this.bc);
 *   },
 *   beforeUnmount() {
 *     if (this.bc) this.bc.close();
 *   }
 */

import { CHANNEL_NAME } from '../utils/storageKeys.js';

/**
 * Opens the BroadcastChannel and attaches the provided message handler.
 * Returns null if BroadcastChannel is unavailable (old browsers / non-HTTPS).
 *
 * @param {function(MessageEvent): void} onMessage
 * @returns {BroadcastChannel|null}
 */
export function createChannel(onMessage) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = onMessage;
    return bc;
  } catch (e) {
    return null;
  }
}

/** Internal: silently post a message — no-ops if bc is null or closed. */
function send(bc, payload) {
  try { if (bc) bc.postMessage(payload); } catch (e) {}
}

// ── Editor → Projector ──────────────────────────────────────────────────────

/** Send the full songs list (call after any CRUD operation). */
export function broadcastSongsUpdated(bc, songs) {
  send(bc, { type: 'songs_updated', songs });
}

/** Notify projector that a single song was added or updated. */
export function broadcastUpdateSong(bc, song) {
  send(bc, { type: 'update_song', song });
}

/** Notify projector that a song was deleted. */
export function broadcastDeleteSong(bc, id) {
  send(bc, { type: 'delete_song', id });
}

/**
 * Notify projector that the global background setting changed.
 *
 * @param {BroadcastChannel|null} bc
 * @param {string}      mode    - 'dark' | 'gradient' | 'video'
 * @param {string|null} videoId - Required when mode === 'video'.
 */
export function broadcastBgUpdated(bc, mode, videoId) {
  send(bc, { type: 'bg_updated', mode, videoId: videoId || null });
}

/**
 * Send a navigation command to the projector.
 *
 * @param {BroadcastChannel|null} bc
 * @param {string} targetId - Song ID to navigate within.
 * @param {string} action   - 'next' | 'prev' | 'goto'
 * @param {number} [index]  - Required when action === 'goto'.
 */
export function broadcastControl(bc, targetId, action, index) {
  const msg = { type: 'control', action, targetId };
  if (typeof index === 'number') msg.index = index;
  send(bc, msg);
}

/** Tell projector to show blank (no song/slide). */
export function broadcastClear(bc) {
  send(bc, { type: 'clear' });
}

/** Ask whether the projector window is currently open (expects a 'pong' back). */
export function broadcastPing(bc) {
  send(bc, { type: 'ping' });
}

// ── Projector → Editor ──────────────────────────────────────────────────────

/** Report the projector's current song and slide position to the editor. */
export function broadcastPosition(bc, songId, index) {
  send(bc, { type: 'position', id: songId, index });
}

/** Confirm to the editor that this projector window is alive. */
export function broadcastPong(bc) {
  send(bc, { type: 'pong' });
}

/** Notify the editor that the projector window is about to close. */
export function broadcastProjectorClosed(bc) {
  send(bc, { type: 'projector_closed' });
}

/** Request the current songs state from the editor (called on projector init). */
export function broadcastRequestState(bc) {
  send(bc, { type: 'request_state' });
}

/** Send the current songs state back to a requesting window. */
export function broadcastState(bc, songs) {
  send(bc, { type: 'state', songs });
}
