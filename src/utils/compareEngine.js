// src/utils/compareEngine.js
import { metniNormalizeEt as norm } from "../ozellikler/yardimcilar/metin";
import { REGIONS } from "../ozellikler/yardimcilar/veriKurallari";

// ---- tarih yardımcıları
const asDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthStart = (y, m0) => new Date(y, m0, 1);
const monthEnd = (y, m0) => new Date(y, m0 + 1, 0, 23, 59, 59, 999);

const getWeekOfMonth = (d) => {
    // 1..5 (ayın kaçıncı haftası)
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const dayOffset = first.getDay() === 0 ? 6 : first.getDay() - 1; // pazartesi başlangıç
    const index = Math.floor((d.getDate() + dayOffset - 1) / 7) + 1;
    return Math.min(5, Math.max(1, index));
};

const listLastMonths = (endDate, count) => {
    const out = [];
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    for (let i = 0; i < count; i++) {
        const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
        out.push({
            key: monthKey(x),
            start: monthStart(x.getFullYear(), x.getMonth()),
            end: monthEnd(x.getFullYear(), x.getMonth()),
            year: x.getFullYear(),
            month0: x.getMonth(),
        });
    }
    return out.reverse(); // eski -> yeni
};

// ---- proje mapping: AnalizTablosu’ndaki aynı kurallar
export function mapProjectName(item) {
    let name = item?.ProjectName;
    const pNorm = norm(name);

    // KÜÇÜKBAY
    if (pNorm === norm("KÜÇÜKBAY FTL")) {
        const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
        if (TRAKYA.has(norm(item?.PickupCityName))) return "KÜÇÜKBAY TRAKYA FTL";
        if (norm(item?.PickupCityName) === norm("İZMİR")) return "KÜÇÜKBAY İZMİR FTL";
        return null; // kapsam dışı
    }

    // PEPSİ
    if (pNorm === norm("PEPSİ FTL")) {
        const c = norm(item?.PickupCityName);
        const d = norm(item?.PickupCountyName);
        if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) return "PEPSİ FTL ÇORLU";
        if (c === norm("KOCAELİ") && d === norm("GEBZE")) return "PEPSİ FTL GEBZE";
        return "PEPSİ FTL";
    }

    // EBEBEK
    if (pNorm === norm("EBEBEK FTL")) {
        const c = norm(item?.PickupCityName);
        const d = norm(item?.PickupCountyName);
        if (c === norm("KOCAELİ") && d === norm("GEBZE")) return "EBEBEK FTL GEBZE";
        return "EBEBEK FTL";
    }

    // FAKİR
    if (pNorm === norm("FAKİR FTL")) {
        const c = norm(item?.PickupCityName);
        const d = norm(item?.PickupCountyName);
        if (c === norm("KOCAELİ") && d === norm("GEBZE")) return "FAKİR FTL GEBZE";
        return "FAKİR FTL";
    }

    // OTTONYA
    if (pNorm === norm("OTTONYA")) return "OTTONYA (HEDEFTEN AÇILIYOR)";

    return name || null;
}

// ---- region filter
export function isInRegion(projectName, regionKey) {
    const list = REGIONS?.[regionKey] || [];
    const key = norm(projectName);
    return list.some((x) => norm(x) === key);
}

// ---- asıl agregasyon
export function buildTimeSeries({ data, regionKey, endDate = new Date(), months = 13 }) {
    const monthsList = listLastMonths(endDate, months);

    // monthKey -> { total, w1..w5 }
    const monthAgg = {};
    monthsList.forEach((m) => {
        monthAgg[m.key] = { key: m.key, total: 0, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0 };
    });

    // project bazlı istersen:
    // monthProjectAgg[monthKey][project] = { total, w1..w5 }
    const monthProjectAgg = {};

    (Array.isArray(data) ? data : []).forEach((item) => {
        const p = mapProjectName(item);
        if (!p) return;
        if (regionKey && !isInRegion(p, regionKey)) return;

        const d = asDate(item?.PickupDate);
        if (!d) return;

        const mk = monthKey(d);
        if (!monthAgg[mk]) return;

        const w = getWeekOfMonth(d); // 1..5
        monthAgg[mk].total += 1;
        monthAgg[mk][`w${w}`] += 1;

        if (!monthProjectAgg[mk]) monthProjectAgg[mk] = {};
        if (!monthProjectAgg[mk][p]) monthProjectAgg[mk][p] = { project: p, total: 0, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0 };
        monthProjectAgg[mk][p].total += 1;
        monthProjectAgg[mk][p][`w${w}`] += 1;
    });

    const series = monthsList.map((m) => monthAgg[m.key]);

    // Trend metrikleri
    const last = series[series.length - 1]?.total ?? 0;
    const prev = series[series.length - 2]?.total ?? 0;
    const prev3Avg =
        series.slice(-3).reduce((a, x) => a + (x.total || 0), 0) / Math.max(1, series.slice(-3).length);

    const mom = prev ? Math.round(((last - prev) / prev) * 100) : null;

    // YoY: 12 ay önce aynı ay
    const yoyBase = series.length >= 13 ? series[series.length - 13]?.total ?? 0 : null;
    const yoy = yoyBase ? Math.round(((last - yoyBase) / yoyBase) * 100) : null;

    // basit slope (son 4 ay)
    const last4 = series.slice(-4).map((x) => x.total || 0);
    const slope = last4.length >= 2 ? (last4[last4.length - 1] - last4[0]) : 0;
    const trend = slope > 0 ? "yukselis" : slope < 0 ? "azalis" : "stabil";

    return {
        series,              // ay ay total + w1..w5
        monthProjectAgg,     // ay->proje kırılımı
        meta: { monthsList },
        kpi: { last, prev, mom, yoy, prev3Avg: Math.round(prev3Avg), trend, slope },
    };
}
