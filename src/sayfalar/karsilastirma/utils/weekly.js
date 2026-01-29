// src/sayfalar/karsilastirma/utils/weekly.js

import { isInSelectedRegion, getProjectName } from "./domain";
import { buildWeekRanges, clampDayStart } from "./date";

/**
 * Son N haftanın (default 12) proje bazlı adetlerini üretir
 * Not: data içindeki item'larda __weekKey olmalıdır
 */
export function buildWeeklyHistory({ data, seciliBolge, weeksBack = 12, anchorDate = new Date() }) {
    const t0 = clampDayStart(anchorDate);

    // Haftalar (eskiden -> yeniye)
    const ranges = buildWeekRanges({ weeksBack, anchorDate: t0 });

    const weeks = ranges.map((r) => {
        const s = new Date(r.start);
        const key = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(
            s.getDate()
        ).padStart(2, "0")}`;

        return {
            key,
            start: r.start,
            end: r.end,
        };
    });

    // weekKey -> index
    const weekIndex = new Map();
    weeks.forEach((w, i) => weekIndex.set(w.key, i));

    // proje -> counts[]
    const byProject = new Map();

    for (const it of data || []) {
        if (!isInSelectedRegion(it, seciliBolge)) continue;

        const wk = it?.__weekKey;
        if (!wk || !weekIndex.has(wk)) continue;

        const proje = String(getProjectName(it) ?? "—");

        if (!byProject.has(proje)) {
            byProject.set(proje, Array(weeksBack).fill(0));
        }

        byProject.get(proje)[weekIndex.get(wk)] += 1;
    }

    const rows = [];
    for (const [proje, counts] of byProject.entries()) {
        const total = counts.reduce((a, b) => a + b, 0);
        rows.push({ bolge: seciliBolge, proje, counts, total });
    }

    return { weeks, rows };
}

export default buildWeeklyHistory;
