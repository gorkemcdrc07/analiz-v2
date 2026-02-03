// src/sayfalar/karsilastirma/hooks/useKarsilastirmaData.js
import { useMemo } from "react";

import { extractItems } from "../../../ozellikler/yardimcilar/backend";
import { metniNormalizeEt } from "../../../ozellikler/yardimcilar/metin";

import { buildForecastTable } from "../utils/forecast";
import { buildMonthlyHistory } from "../utils/history";
import { buildWeeklyHistory } from "../utils/weekly";

import {
    clampDayStart,
    startOfMonth,
    endOfMonth,
    addDays,
    fmtRange,
    fmtRangeShort,
} from "../utils/date";

import { isInSelectedRegion, getPickupDate } from "../utils/domain";

/**
 * Ham veriyi (raw) alır, forecast + history + weekly + rows/totals/kpis gibi tüm memo'ları üretir.
 * Ayrıca: "önceki 7 gün" (dün → 7 gün önce) gün gün sayımlarını üretir.
 *
 * @param {Object} params
 * @param {Object|null} params.raw
 * @param {String} params.seciliBolge
 * @param {String} params.arama
 * @param {String} params.sirala   - forecast sıralama alanı
 */
export default function useKarsilastirmaData({ raw, seciliBolge, arama, sirala }) {
    // raw -> items
    const data = useMemo(() => extractItems(raw), [raw]);

    /* ---------------------------------------------------------------------- */
    /*                         Tarih / alan güvenli okuma                      */
    /* ---------------------------------------------------------------------- */

    // TMS’te pickup alanı farklıysa "hep 0" sorunu çıkıyor.
    // getPickupDate null dönerse otomatik date/time alanlarını tarıyoruz.
    const getPickupDateSafe = (it) => {
        const d0 = getPickupDate(it);
        if (d0 && !isNaN(d0.getTime())) return d0;

        // fallback: objede date/time geçen ilk parse edilebilir alan
        const obj = it || {};
        for (const [k, v] of Object.entries(obj)) {
            if (!v) continue;
            if (!/(date|time)/i.test(k)) continue;
            const d = new Date(v);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    };

    // Proje adını hook içinde güvenli alalım (domain’de yoksa da çalışsın)
    const getProjectNameSafe = (it) => {
        const v =
            it?.ProjectName ??
            it?.projectName ??
            it?.CustomerName ??
            it?.customerName ??
            it?.Customer ??
            it?.customer ??
            it?.AccountName ??
            it?.accountName ??
            it?.Client ??
            it?.client ??
            it?.Proje ??
            it?.proje;

        return String(v ?? "—");
    };

    /* ---------------------------------------------------------------------- */
    /*                                 Engines                                 */
    /* ---------------------------------------------------------------------- */

    const forecast = useMemo(() => {
        if (!data?.length) return null;
        return buildForecastTable({ data, seciliBolge, today: new Date() });
    }, [data, seciliBolge]);

    const history = useMemo(() => {
        if (!data?.length) return null;
        return buildMonthlyHistory({ data, seciliBolge, monthsBack: 13, anchorDate: new Date() });
    }, [data, seciliBolge]);

    const weekly = useMemo(() => {
        if (!data?.length) return null;
        return buildWeeklyHistory({ data, seciliBolge, weeksBack: 12, anchorDate: new Date() });
    }, [data, seciliBolge]);

    /* ---------------------------------------------------------------------- */
    /*                             Forecast rows/totals                         */
    /* ---------------------------------------------------------------------- */

    const forecastRows = useMemo(() => {
        const base = forecast?.series || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => Number(b?.[sirala] || 0) - Number(a?.[sirala] || 0));
    }, [forecast, arama, sirala]);

    const forecastTotals = useMemo(() => {
        return forecastRows.reduce(
            (acc, r) => {
                acc.buHafta += r.buHafta || 0;
                acc.gelecekHafta += r.gelecekHafta || 0;
                acc.digerHafta += r.digerHafta || 0;
                acc.aySonunaKadar += r.aySonunaKadar || 0;
                acc.ayToplam += r.ayToplam || 0;
                return acc;
            },
            { buHafta: 0, gelecekHafta: 0, digerHafta: 0, aySonunaKadar: 0, ayToplam: 0 }
        );
    }, [forecastRows]);

    /* ---------------------------------------------------------------------- */
    /*                                History rows                              */
    /* ---------------------------------------------------------------------- */

    const historyRows = useMemo(() => {
        const base = history?.rows || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [history, arama]);

    /* ---------------------------------------------------------------------- */
    /*                                 Weekly rows                              */
    /* ---------------------------------------------------------------------- */

    const weeklyRows = useMemo(() => {
        const base = weekly?.rows || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [weekly, arama]);

    /* ---------------------------------------------------------------------- */
    /*                  ✅ Daily (önceki 7 gün) — gün gün sayım                  */
    /* ---------------------------------------------------------------------- */
    const dailyLast7 = useMemo(() => {
        // Dün → 7 gün önce (bugün dahil değil)
        const today0 = clampDayStart(new Date());
        const days = Array.from({ length: 7 }, (_, i) => clampDayStart(addDays(today0, -(i + 1))));

        const dayKeys = days.map((d) => {
            // clampDayStart zaten 00:00, güvenli string key
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        });

        const keyIndex = new Map(dayKeys.map((k, i) => [k, i]));

        // region filtreli + pickup parse edilmiş liste
        const items = (data || [])
            .filter((it) => isInSelectedRegion(it, seciliBolge))
            .map((it) => {
                const d = getPickupDateSafe(it);
                if (!d) return null;

                const ds = clampDayStart(d);
                const yyyy = ds.getFullYear();
                const mm = String(ds.getMonth() + 1).padStart(2, "0");
                const dd = String(ds.getDate()).padStart(2, "0");
                const dk = `${yyyy}-${mm}-${dd}`;

                return {
                    __dayKey: dk,
                    __proje: getProjectNameSafe(it),
                };
            })
            .filter(Boolean);

        // proje -> counts[7]
        const byProject = new Map();

        for (const it of items) {
            const idx = keyIndex.get(it.__dayKey);
            if (idx === undefined) continue; // sadece hedef 7 gün
            const p = it.__proje || "—";
            if (!byProject.has(p)) byProject.set(p, Array(7).fill(0));
            byProject.get(p)[idx] += 1;
        }

        // arama filtresi (proje adına göre)
        const q = metniNormalizeEt(arama || "");
        let rows = [...byProject.entries()].map(([proje, counts]) => ({
            bolge: seciliBolge,
            proje,
            counts,
            total: counts.reduce((a, b) => a + b, 0),
        }));

        if (q) rows = rows.filter((r) => metniNormalizeEt(r.proje).includes(q));

        // sıralama: en yakın gün (dün) büyükten küçüğe, sonra total, sonra isim
        rows.sort((a, b) => {
            const a0 = a.counts?.[0] || 0;
            const b0 = b.counts?.[0] || 0;
            if (b0 !== a0) return b0 - a0;
            if ((b.total || 0) !== (a.total || 0)) return (b.total || 0) - (a.total || 0);
            return String(a.proje).localeCompare(String(b.proje), "tr");
        });

        // totals: gün gün toplam
        const totals = rows.reduce(
            (acc, r) => {
                for (let i = 0; i < 7; i++) acc.byDay[i] += r.counts[i] || 0;
                acc.total += r.total || 0;
                return acc;
            },
            { byDay: Array(7).fill(0), total: 0 }
        );

        // UI’da kolon etiketi basmak için (TR kısa tarih)
        const labels = days.map((d) =>
            d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
        );

        return {
            bolge: seciliBolge,
            days,       // Date[]
            dayKeys,    // "YYYY-MM-DD"[]
            labels,     // "DD.MM"[]
            rows,       // {bolge,proje,counts[7],total}[]
            totals,     // {byDay[7], total}
        };
    }, [data, seciliBolge, arama]); // arama günlük tabloda da etkili olsun

    /* ---------------------------------------------------------------------- */
    /*                              KPI: son 4 hafta, MoM, YoY                  */
    /* ---------------------------------------------------------------------- */

    const trendKpis = useMemo(() => {
        if (!data?.length) {
            return {
                mom: 0,
                yoy: 0,
                w4: 0,
                thisMonth: 0,
                lastMonth: 0,
                lastYearSame: 0,
                prevW4: 0,
                w4trend: 0,
            };
        }

        const today = clampDayStart(new Date());

        const thisMonthStart = startOfMonth(today);

        const lastMonthStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        const lastMonthEnd = endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        lastMonthEnd.setHours(23, 59, 59, 999);

        const lastYearSameMonthStart = startOfMonth(new Date(today.getFullYear() - 1, today.getMonth(), 1));
        const lastYearSameMonthEnd = endOfMonth(new Date(today.getFullYear() - 1, today.getMonth(), 1));
        lastYearSameMonthEnd.setHours(23, 59, 59, 999);

        const w4Start = addDays(today, -27);
        const prevW4Start = addDays(today, -55);
        const prevW4End = addDays(today, -28);

        const items = (data || [])
            .filter((it) => isInSelectedRegion(it, seciliBolge))
            .map((it) => {
                const d = getPickupDateSafe(it);
                if (!d) return null;
                return { ...it, __pickup: d };
            })
            .filter(Boolean);

        const count = (a, b) => {
            let c = 0;
            for (const it of items) {
                const d = it.__pickup;
                if (d >= a && d <= b) c += 1;
            }
            return c;
        };

        const thisMonth = count(thisMonthStart, today);
        const lastMonth = count(lastMonthStart, lastMonthEnd);
        const lastYearSame = count(lastYearSameMonthStart, lastYearSameMonthEnd);

        const w4 = count(w4Start, today);
        const prevW4 = count(prevW4Start, prevW4End);

        const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

        return {
            thisMonth,
            lastMonth,
            lastYearSame,
            w4,
            prevW4,
            mom: pct(thisMonth, lastMonth),
            yoy: pct(thisMonth, lastYearSame),
            w4trend: pct(w4, prevW4),
        };
    }, [data, seciliBolge]);

    const meta = forecast?.meta || null;

    const weekLabels = useMemo(() => {
        if (!meta) return null;
        return {
            w0: fmtRange(meta.week0Start, meta.week0End),
            w1: fmtRange(meta.week1Start, meta.week1End),
            w2: fmtRange(meta.week2Start, meta.week2End),
            month: fmtRange(meta.monthStart, meta.monthEnd),
            w0Short: fmtRangeShort(meta.week0Start, meta.week0End),
            w1Short: fmtRangeShort(meta.week1Start, meta.week1End),
            w2Short: fmtRangeShort(meta.week2Start, meta.week2End),
        };
    }, [meta]);

    return {
        data,

        // engines
        forecast,
        history,
        weekly,

        // rows
        forecastRows,
        historyRows,
        weeklyRows,

        // ✅ daily
        dailyLast7,

        // totals/kpis
        forecastTotals,
        trendKpis,

        // meta
        meta,
        weekLabels,
    };
}
