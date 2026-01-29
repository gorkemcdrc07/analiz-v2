// src/sayfalar/karsilastirma/hooks/useKarsilastirmaFetch.js

import { useCallback, useState } from "react";

import { BASE_URL } from "../../../ozellikler/yardimcilar/sabitler";
import { extractItems } from "../../../ozellikler/yardimcilar/backend";
import { buildWeekRanges, isoStartOfDayZ, isoEndOfDayZ } from "../utils/date";

/**
 * Haftalık kademeli veri çekme hook'u
 *
 * @param {Object} params
 * @param {number} params.userId
 * @param {number} params.weeksBack
 */
export default function useKarsilastirmaFetch({ userId = 1, weeksBack = 12 } = {}) {
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

        const ranges = buildWeekRanges({ weeksBack, anchorDate: new Date() });
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
                        console.warn("week failed", i, res.status, payload);
                        continue;
                    }

                    const items = extractItems(payload);

                    // ✅ bu haftadan gelenlere haftalık etiket ekle
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
                    // ✅ kademeli güncelle
                    setRaw({ items: [...collected] });
                    setProgress((p) => ({ ...p, done: p.done + 1 }));
                } catch (e) {
                    setProgress((p) => ({ ...p, done: p.done + 1, failed: p.failed + 1 }));
                    console.warn("week fetch aborted/failed", i, e?.message);
                } finally {
                    clearTimeout(t);
                }
            }
        } catch (e) {
            setError(e?.message || "Bağlantı hatası");
        } finally {
            setLoading(false);
            if (collected.length === 0) {
                setError("Veri çekilemedi (haftalık istekler başarısız)");
            }
        }
    }, [userId, weeksBack]);

    return {
        raw,
        loading,
        error,
        progress,
        refetch,
    };
}
