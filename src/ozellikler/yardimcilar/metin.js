// src/ozellikler/analiz-paneli/yardimcilar/metin.js
export const metniNormalizeEt = (s) =>
    (s ?? "")
        .toString()
        .replace(/\u00A0/g, " ") // NBSP
        .replace(/\u200B/g, "") // zero-width
        .replace(/\r?\n/g, " ")
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");

export const seferNoNormalizeEt = (v) => {
    const s = (v ?? "")
        .toString()
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\r?\n/g, " ")
        .trim();
    if (!s) return "";

    const up = s.toLocaleUpperCase("tr-TR");
    const m = up.match(/SFR\s*\d+/);
    if (m) return m[0].replace(/\s+/g, "");
    if (/^\d{8,}$/.test(up)) return `SFR${up}`;
    return up.split(/\s+/)[0];
};

export const mergeDoluOlanlariKoru = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

export const booleanCevir = (v) => {
    if (v === true || v === false) return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true") return true;
        if (s === "false") return false;
    }
    return false;
};

export const sayiCevir = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
