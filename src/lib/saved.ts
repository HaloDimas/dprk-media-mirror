/**
 * Saved / bookmarks — articles and recordings the user bookmarked.
 * localStorage-only, one key (`dprk-saved`), shared by the bookmark
 * buttons (article pages, recording cards) and the /saved page.
 *
 * Shape: { items: SavedItem[] } — newest first. Each item carries the
 * id, type, title, date and the URL to open it again (article page
 * /news/<id>, or the recordings list /recordings for recordings).
 * A `dprk-saved-changed` event on window is dispatched after every
 * change so mounted buttons and the /saved list stay in sync without
 * a reload.
 */
import { useCallback, useEffect, useState } from "react";

export const SAVED_STORAGE_KEY = "dprk-saved";
/** Dispatched on window after any saved change. */
export const SAVED_CHANGED_EVENT = "dprk-saved-changed";

export type SavedItemType = "article" | "recording";

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  date: string;
  url: string;
}

interface SavedStore {
  items: SavedItem[];
}

function emptyStore(): SavedStore {
  return { items: [] };
}

function loadStore(): SavedStore {
  try {
    if (typeof window === "undefined") return emptyStore();
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as SavedStore).items)) {
      return emptyStore();
    }
    const items = (parsed as SavedStore).items.filter(
      (it) =>
        it &&
        typeof it.id === "string" &&
        (it.type === "article" || it.type === "recording") &&
        typeof it.title === "string" &&
        typeof it.url === "string"
    );
    return { items };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: SavedStore): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable or full — the bookmark just won't persist.
  }
}

function dispatch(): void {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SAVED_CHANGED_EVENT));
  } catch {
    // No window — nothing listening.
  }
}

/** All saved items, newest first (insertion order is newest first). */
export function loadSaved(): SavedItem[] {
  return loadStore().items;
}

export function isSaved(id: string): boolean {
  return loadStore().items.some((it) => it.id === id);
}

/** Add to the top of the list (no-op if already saved). */
export function saveItem(item: SavedItem): void {
  const store = loadStore();
  if (store.items.some((it) => it.id === item.id)) return;
  store.items.unshift(item);
  saveStore(store);
  dispatch();
}

export function removeSaved(id: string): void {
  const store = loadStore();
  const next = store.items.filter((it) => it.id !== id);
  if (next.length === store.items.length) return;
  saveStore({ items: next });
  dispatch();
}

export function clearSaved(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SAVED_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  dispatch();
}

/** Live saved state for buttons and the /saved list. Starts empty and
 *  loads from storage in an effect — the initializer must NOT read
 *  localStorage, or the server render (empty) and the hydrated client
 *  (saved items) disagree and React throws a hydration error (#418). */
export function useSaved(): {
  items: SavedItem[];
  savedIds: Set<string>;
  toggle: (item: SavedItem) => void;
  remove: (id: string) => void;
  clear: () => void;
} {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(loadSaved());
    sync();
    window.addEventListener(SAVED_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SAVED_CHANGED_EVENT, sync);
  }, []);

  const toggle = useCallback((item: SavedItem) => {
    if (isSaved(item.id)) removeSaved(item.id);
    else saveItem(item);
  }, []);
  const remove = useCallback((id: string) => removeSaved(id), []);
  const clear = useCallback(() => clearSaved(), []);

  return { items, savedIds: new Set(items.map((it) => it.id)), toggle, remove, clear };
}
