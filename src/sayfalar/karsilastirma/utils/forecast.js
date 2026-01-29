// src/sayfalar/karsilastirma/utils/forecast.js

import {
    clampDayStart,
    startOfWeekMon,
    endOfWeekSun,
    startOfMonth,
    endOfMonth,
    addDays,
    weekdayMon0,
    eachDay,
} from "./date";
import { getPickupDate, getProjectName, isInSelectedRegion } from "./domain";

/**
 * Forecast engine (history -> future)
 * - Seviye: son 28 gün ortalama günlük adet
 * - Dağılım: son 12 haftada haftanın günlerine göre ağırlık
 * - Bu hafta: gerçekleşen (bugüne kadar) + kalan günlerin beklenen
 * - Gelecek hafta / diğer hafta: tamamen beklenen
 * - Ay sonuna kadar: ay içi gerçekleşen + kalan beklenen
 * - Ay toplam: ayın tamamı beklenen
 */
export function buildForecastTable({ data, seciliBolge, today = new Date() }) {
    const t0 = clampDayStart(today);

    const week0Start = startOfWeekMon(t0);
    const week0End = endOfWeekSun(t0);
    const week1Start = addDays(week0Start, 7);
    const week1End = endOfWeekSun(week1Start);
    const week2Start = addDays(week0Start, 14);
    const week2End = endOfWeekSun(week2Start);

    const monthStartD = startOfMonth(t0);
    const monthEndD = endOfMonth(t0);
    monthEndD.setHours(23, 59, 59, 999);

    const baselineDays = 28; // seviye
    const weightWeeks = 12; // dağılım

    const baselineStart = addDays(t0, -baselineDays + 1);
    baselineStart.setHours(0, 0, 0, 0);

    const weightsStart = addDays(week0Start, -weightWeeks * 7);
    weightsStart.setHours(0, 0, 0, 0);

    const filtered = (data || [])
        .filter((it) => isInSelectedRegion(it, seciliBolge))
        .map((it) => {
            const d = getPickupDate(it);
            if (!d) return null;
            return { ...it, __pickup: d };
        })
        .filter(Boolean);

    const byProject = new Map();
    for (const it of filtered) {
        const p = String(getProjectName(it) ?? "—");
        if (!byProject.has(p)) byProject.set(p, []);
        byProject.get(p).push(it);
    }

    const countActual = (list, a, b) => {
        let c = 0;
        for (const it of list) {
            const d = it.__pickup;
            if (d >= a && d <= b) c += 1;
        }
        return c;
    };

    const buildBaselineDaily = (list) => {
        const c = countActual(list, baselineStart, addDays(t0, 0));
        return c / baselineDays;
    };

    const buildWeekdayWeights = (list) => {
        const w = Array(7).fill(0);
        let total = 0;

        for (const it of list) {
            const d = it.__pickup;
            if (d < weightsStart || d > addDays(t0, 0)) continue;
            w[weekdayMon0(d)] += 1;
            total += 1;
        }

        if (total <= 0) return Array(7).fill(1);

        const avg = total / 7;
        return w.map((x) => (avg > 0 ? x / avg : 1));
    };

    const expectedForDates = (dailyBase, weights, dates) => {
        if (!dailyBase || dailyBase <= 0) return 0;
        let sum = 0;
        for (const d of dates) sum += dailyBase * (weights[weekdayMon0(d)] || 1);
        return sum;
    };

    const series = [];
    for (const [proje, list] of byProject.entries()) {
        const dailyBase = buildBaselineDaily(list);
        const weights = buildWeekdayWeights(list);

        // Bu hafta: gerçekleşen + kalan beklenen
        const actualWeekToDate = countActual(list, week0Start, addDays(t0, 0));
        const expWeekRemainder = expectedForDates(
            dailyBase,
            weights,
            eachDay(addDays(t0, 1), week0End)
        );
        const buHafta = Math.round(actualWeekToDate + expWeekRemainder);

        // Gelecek hafta / diğer hafta
        const gelecekHafta = Math.round(
            expectedForDates(dailyBase, weights, eachDay(week1Start, week1End))
        );
        const digerHafta = Math.round(
            expectedForDates(dailyBase, weights, eachDay(week2Start, week2End))
        );

        // Ay sonuna kadar: ay içi gerçekleşen + kalan beklenen
        const actualMonthToDate = countActual(list, monthStartD, addDays(t0, 0));
        const expMonthRemainder = expectedForDates(
            dailyBase,
            weights,
            eachDay(addDays(t0, 1), monthEndD)
        );
        const aySonunaKadar = Math.round(actualMonthToDate + expMonthRemainder);

        // Ay toplam: ayın tamamı beklenen
        const ayToplam = Math.round(
            expectedForDates(dailyBase, weights, eachDay(monthStartD, monthEndD))
        );

        series.push({
            bolge: seciliBolge,
            proje,
            buHafta,
            gelecekHafta,
            digerHafta,
            aySonunaKadar,
            ayToplam,
        });
    }

    return {
        meta: {
            today: t0,
            week0Start,
            week0End,
            week1Start,
            week1End,
            week2Start,
            week2End,
            monthStart: monthStartD,
            monthEnd: monthEndD,
            baselineStart,
            weightsStart,
        },
        series,
    };
}

export default buildForecastTable;
