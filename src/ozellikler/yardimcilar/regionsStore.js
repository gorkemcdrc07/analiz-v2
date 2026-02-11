import { REGIONS as REGIONS_DEFAULT } from "./veriKurallari";

export const LS_REGIONS_KEY = "app_regions_v1";

export function getRegions() {
    try {
        const raw = localStorage.getItem(LS_REGIONS_KEY);
        if (!raw) return REGIONS_DEFAULT || {};
        const v = JSON.parse(raw);
        return v && typeof v === "object" ? v : (REGIONS_DEFAULT || {});
    } catch {
        return REGIONS_DEFAULT || {};
    }
}

export function setRegions(map) {
    localStorage.setItem(LS_REGIONS_KEY, JSON.stringify(map || {}));
    // ayný tab içinde anýnda haberdar etmek için custom event
    window.dispatchEvent(new Event("regions:changed"));
}
