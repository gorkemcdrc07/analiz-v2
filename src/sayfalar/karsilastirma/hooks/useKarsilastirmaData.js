// src/sayfalar/karsilastirma/hooks/useKarsilastirmaData.js

import { useMemo } from "react";

import { extractItems } from "../../../ozellikler/yardimcilar/backend";
import { metniNormalizeEt } from "../../../ozellikler/yardimcilar/metin";

import { buildForecastTable } from "../utils/forecast";
import { buildMonthlyHistory } from "../utils/history";
import { buildWeeklyHistory } from "../utils/weekly";

import { clampDayStart, startOfMonth, endOfMonth, addDays, fmtRange, fmtRangeShort } from "../utils/date";
import { isInSelectedRegion, getPickupDate } from "../utils/domain";

/**
 * Ham veriyi (raw) alır, forecast + history + weekly + rows/totals/kpis gibi tüm memo'ları üretir.
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

    // -------- Forecast rows/totals --------
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

    // -------- History rows --------
    const historyRows = useMemo(() => {
        const base = history?.rows || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [history, arama]);

    // -------- Weekly rows --------
    const weeklyRows = useMemo(() => {
        const base = weekly?.rows || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [weekly, arama]);

    // -------- KPI: son 4 hafta, MoM, YoY --------
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
                const d = getPickupDate(it);
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

        // totals/kpis
        forecastTotals,
        trendKpis,

        // meta
        meta,
        weekLabels,
    };
}
