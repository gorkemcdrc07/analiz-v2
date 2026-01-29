// src/ozellikler/analiz-paneli/yardimcilar/backend.js
// Backend þu formatý döndürüyor: { rid, ok, data } veya { rid, ok, items }
// ya da Odak API: { Data: [...], Success: true }
export function extractItems(payload) {
    if (!payload) return [];

    const root = payload.items ?? payload.data ?? payload;
    const arr = root?.Data ?? root?.data ?? root?.items ?? root;

    return Array.isArray(arr) ? arr : [];
}
