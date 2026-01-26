import { useMemo } from "react";
import { norm } from "../utils";

/* ------------------------ yardýmcýlar ------------------------ */

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const toBool = (v) => {
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

const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

    const s = String(v).trim();
    if (!s) return null;

    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

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

const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

const normalizeSeferKey = (v) => {
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

/* ------------------------ HOOK ------------------------ */

export function useProcessedData(data) {
    return useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        const stats = {};

        src.forEach((item) => {
            let finalProjectName = item.ProjectName;
            const pNorm = norm(item.ProjectName);

            /* -------- proje normalizasyonlarý -------- */

            // KÜÇÜKBAY
            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA = new Set(["EDÝRNE", "KIRKLARELÝ", "TEKÝRDAÐ"].map(norm));
                if (TRAKYA.has(norm(item.PickupCityName)))
                    finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("ÝZMÝR"))
                    finalProjectName = "KÜÇÜKBAY ÝZMÝR FTL";
                else return;
            }

            // PEPSÝ
            if (pNorm === norm("PEPSÝ FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("TEKÝRDAÐ") && d === norm("ÇORLU"))
                    finalProjectName = "PEPSÝ FTL ÇORLU";
                else if (c === norm("KOCAELÝ") && d === norm("GEBZE"))
                    finalProjectName = "PEPSÝ FTL GEBZE";
            }

            // EBEBEK
            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELÝ") && d === norm("GEBZE"))
                    finalProjectName = "EBEBEK FTL GEBZE";
            }

            // FAKÝR
            if (pNorm === norm("FAKÝR FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELÝ") && d === norm("GEBZE"))
                    finalProjectName = "FAKÝR FTL GEBZE";
            }

            // OTTONYA
            if (pNorm === norm("OTTONYA"))
                finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

            const key = norm(finalProjectName);

            if (!stats[key]) {
                stats[key] = {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    ontime_req: new Set(),
                    late_req: new Set(),
                };
            }

            const s = stats[key];

            /* -------- servis kapsamý -------- */

            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTÝÇÝ FTL HÝZMETLERÝ") ||
                service === norm("FÝLO DIÞ YÜK YÖNETÝMÝ") ||
                service === norm("YURTÝÇÝ FRÝGO HÝZMETLERÝ");

            if (!inScope) return;

            /* -------- TALEP -------- */

            const reqNoRaw = (item.TMSVehicleRequestDocumentNo || "").toString();
            const reqNoKey = reqNoRaw
                .replace(/\u00A0/g, " ")
                .replace(/\u200B/g, "")
                .replace(/\r?\n/g, " ")
                .trim();

            const reqNoUp = reqNoKey.toLocaleUpperCase("tr-TR");

            if (reqNoKey && !reqNoUp.startsWith("BOS")) {
                s.plan.add(reqNoUp);
            }

            /* -------- SEFER -------- */

            const despKey = normalizeSeferKey(item.TMSDespatchDocumentNo);
            if (!despKey || !despKey.startsWith("SFR")) return;

            /* -------- ÝPTAL -------- */

            if (toNum(item.OrderStatu) === 200) {
                s.iptal.add(despKey);
                return;
            }

            /* -------- TEDARÝK -------- */

            s.ted.add(despKey);

            /* -------- FÝLO / SPOT -------- */

            const vw = norm(item.VehicleWorkingName);
            const isFilo =
                vw === norm("FÝLO") ||
                vw === norm("ÖZMAL") ||
                vw === norm("MODERN AMBALAJ FÝLO");

            if (isFilo) s.filo.add(despKey);
            else s.spot.add(despKey);

            /* -------- BASIM -------- */

            if (toBool(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            /* -------- 30 SAAT KURALI -------- */

            const h = hoursDiff(item.TMSDespatchCreatedDate, item.PickupDate);
            if (reqNoKey && !reqNoUp.startsWith("BOS") && h != null) {
                if (h < 30) s.ontime_req.add(reqNoUp);
                else s.late_req.add(reqNoUp);
            }
        });

        return stats;
    }, [data]);
}
