// src/components/ProjeTablosu/utils.js

export const norm = (s) =>
    (s ?? "")
        .toString()
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\r?\n/g, " ")
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");

export const normalizeSeferKey = (v) => {
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

export const mergeKeepFilled = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

export const toBool = (v) => {
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

export const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

export const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "---") return "---";
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return String(dateStr);
        return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(
            2,
            "0"
        )}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch {
        return String(dateStr);
    }
};

export const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s = String(v).trim();
    if (!s) return null;

    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        const yyyy = Number(m[3]);
        const HH = Number(m[4] ?? 0);
        const MI = Number(m[5] ?? 0);
        const SS = Number(m[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

export const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

export const getTimingInfo = (seferAcilisZamani, yuklemeTarihi) => {
    const h = hoursDiff(seferAcilisZamani, yuklemeTarihi);
    if (h == null) return { label: "Tarih yok", color: "#94a3b8", hours: null, level: "none" };
    if (h < 30) return { label: "Zamanýnda", color: "#10b981", hours: h, level: "ok" };
    return { label: "Gecikme", color: "#ef4444", hours: h, level: "late" };
};

export function buildSubDetails(rowName, allData) {
    const seen = new Set();
    const rowNorm = norm(rowName);

    return (allData || [])
        .filter((item) => {
            const pNorm = norm(item.ProjectName);
            const isDirect = pNorm === rowNorm;

            const isPepsiCorlu =
                rowNorm === norm("PEPSÝ FTL ÇORLU") &&
                pNorm === norm("PEPSÝ FTL") &&
                norm(item.PickupCityName) === norm("TEKÝRDAÐ") &&
                norm(item.PickupCountyName) === norm("ÇORLU");

            const isPepsiGebze =
                rowNorm === norm("PEPSÝ FTL GEBZE") &&
                pNorm === norm("PEPSÝ FTL") &&
                norm(item.PickupCityName) === norm("KOCAELÝ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isEbebekGebze =
                rowNorm === norm("EBEBEK FTL GEBZE") &&
                pNorm === norm("EBEBEK FTL") &&
                norm(item.PickupCityName) === norm("KOCAELÝ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isFakirGebze =
                rowNorm === norm("FAKÝR FTL GEBZE") &&
                pNorm === norm("FAKÝR FTL") &&
                norm(item.PickupCityName) === norm("KOCAELÝ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isOttonya =
                rowNorm === norm("OTTONYA (HEDEFTEN AÇILIYOR)") && pNorm === norm("OTTONYA");

            const isKucukbayTrakya =
                rowNorm.includes("TRAKYA") &&
                pNorm === norm("KÜÇÜKBAY FTL") &&
                new Set(["EDÝRNE", "KIRKLARELÝ", "TEKÝRDAÐ"].map(norm)).has(norm(item.PickupCityName));

            const match = isDirect || isPepsiCorlu || isPepsiGebze || isEbebekGebze || isFakirGebze || isOttonya || isKucukbayTrakya;
            if (!match) return false;

            const reqNo = item.TMSVehicleRequestDocumentNo;
            const despNo = (item.TMSDespatchDocumentNo || "").toString();
            const isValid = !despNo.toUpperCase().startsWith("BOS");
            const uniq = reqNo || despNo;

            if (uniq && isValid && !seen.has(uniq)) {
                seen.add(uniq);
                return true;
            }
            return false;
        })
        .slice(0, 50);
}
