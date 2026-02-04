// src/sayfalar/karsilastirma/hooks/useKarsilastirmaFetch.js
import { useCallback, useState } from "react";

import { BASE_URL } from "../../../ozellikler/yardimcilar/sabitler";
import { extractItems } from "../../../ozellikler/yardimcilar/backend";
import { isoStartOfDayZ, isoEndOfDayZ } from "../utils/date";

/* ------------------------ küçük tarih yardımcıları ------------------------ */
const clampDayStart = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

// Pazartesi ba�Ylangıçlı hafta
const startOfWeekMon = (d) => {
    const x = clampDayStart(d);
    const day = x.getDay(); // 0 pazar
    const diff = (day + 6) % 7; // pazartesi=0
    x.setDate(x.getDate() - diff);
    return x;
};

// Seçilen (start-end) aralı�Yını kapsayan haftaları üret
const buildWeekRangesBetween = (startDate, endDate) => {
    const s0 = clampDayStart(new Date(startDate));
    const e0 = clampDayStart(new Date(endDate));

    const firstWeekStart = startOfWeekMon(s0);
    const out = [];

    let cur = new Date(firstWeekStart);
    while (cur <= e0) {
        const wStart = new Date(cur);
        const wEnd = addDays(wStart, 6);
        wEnd.setHours(23, 59, 59, 999);

        // aralık kesi�Yimi
        const a = new Date(Math.max(wStart.getTime(), s0.getTime()));
        const b = new Date(Math.min(wEnd.getTime(), new Date(endDate).getTime()));

        if (a <= b) out.push({ start: a, end: b });

        cur = addDays(cur, 7);
    }

    return out;
};

/**
 * Son N gün (varsayılan 7) verisini kademeli çeker.
 *
 * @param {Object} params
 * @param {number} params.userId
 * @param {number} params.daysBack  - kaç gün geriye gidilecek (default 7)
 */
export default function useKarsilastirmaFetch({ userId = 1, daysBack = 7 } = {}) {
    const [loading, setLoading] = useState(false);
    const [raw, setRaw] = useState(null);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

    const refetch = useCallback(async () => {
        setLoading(true);
        setError("");
        setProgress({ done: 0, total: 0, failed: 0 });

        // UI hemen veri görsün
        setRaw({ items: [] });

        // �o. Son N gün aralı�Yı
        const end = new Date();
        const start = addDays(new Date(), -Math.max(1, Number(daysBack)));
        const ranges = buildWeekRangesBetween(start, end);

        setProgress({ done: 0, total: ranges.length, failed: 0 });

        const collected = [];

        try {
            for (let i = 0; i < ranges.length; i++) {
                const r = ranges[i];

                const body = {
                    startDate: isoStartOfDayZ(r.start),
                    endDate: isoEndOfDayZ(r.end),
                    userId: Number(userId),
                };

                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), 35_000);

                try {
                    const res = await fetch(`${BASE_URL}/tmsorders/week`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });

                    const rawText = await res.text();

                    let payload;
                    try {
                        payload = rawText ? JSON.parse(rawText) : null;
                    } catch {
                        payload = rawText;
                    }

                    if (!res.ok) {
                        setProgress((p) => ({ ...p, done: p.done + 1, failed: p.failed + 1 }));
                        console.warn("range failed", i, res.status, payload);
                        continue;
                    }

                    const items = extractItems(payload);

                    // �o. range etiketi
                    const weekStart = new Date(r.start);
                    const weekEnd = new Date(r.end);
                    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(
                        weekStart.getDate()
                    ).padStart(2, "0")}`;

                    const tagged = (items || []).map((it) => ({
                        ...it,
                        __weekKey: weekKey,
                        __weekStart: weekStart.toISOString(),
                        __weekEnd: weekEnd.toISOString(),
                    }));

                    collected.push(...tagged);
                    setRaw({ items: [...collected] });
                    setProgress((p) => ({ ...p, done: p.done + 1 }));
                } catch (e) {
                    setProgress((p) => ({ ...p, done: p.done + 1, failed: p.failed + 1 }));
                    console.warn("range fetch aborted/failed", i, e?.message);
                } finally {
                    clearTimeout(t);
                }
            }
        } catch (e) {
            setError(e?.message || "Ba�Ylantı hatası");
        } finally {
            setLoading(false);
            if (collected.length === 0) {
                setError("Veri çekilemedi (son gün istekleri ba�Yarısız)");
            }
        }
    }, [userId, daysBack]);

    return {
        raw,
        loading,
        error,
        progress,
        refetch,
    };
}
