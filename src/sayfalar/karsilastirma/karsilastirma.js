import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";

import { REGIONS } from "../../ozellikler/yardimcilar/veriKurallari";
import { metniNormalizeEt } from "../../ozellikler/yardimcilar/metin";
import { BASE_URL } from "../../ozellikler/yardimcilar/sabitler";
import { extractItems } from "../../ozellikler/yardimcilar/backend";
import { toIsoLocalStart, toIsoLocalEnd } from "../../ozellikler/yardimcilar/tarih";

/* -------------------------------------------------------------------------- */
/*                                DATE HELPERS                                */
/* -------------------------------------------------------------------------- */

const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

const startOfWeekMon = (d) => {
    const x = startOfDay(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x;
};

const buildWeekRangesBetween = (startDate, endDate) => {
    const s0 = startOfDay(startDate);
    const e0 = startOfDay(endDate);

    const first = startOfWeekMon(s0);
    const out = [];

    let cur = new Date(first);
    while (cur <= e0) {
        const wStart = new Date(cur);
        const wEnd = addDays(wStart, 6);
        wEnd.setHours(23, 59, 59, 999);

        out.push({
            start: new Date(Math.max(wStart, s0)),
            end: new Date(Math.min(wEnd, endDate)),
        });

        cur = addDays(cur, 7);
    }
    return out;
};

const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;

const fmtTR = (d) =>
    new Date(d).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
    });

/* -------------------------------------------------------------------------- */
/*                     gY"� KESİN TARİH OKUYUCU (FIX)                            */
/* -------------------------------------------------------------------------- */

function getPickupDate(item) {
    const directCandidates = [
        item?.PlannedPickupDate,
        item?.PlannedPickupDateTime,
        item?.PickupPlannedDate,
        item?.PickupDate,
        item?.PickupDateTime,
        item?.TMSPickupDate,
        item?.TMSPickupDateTime,
        item?.LoadingDate,
        item?.ShipmentDate,
        item?.OrderDate,
        item?.CreatedDate,
        item?.CreateDate,
    ];

    for (const v of directCandidates) {
        if (!v) continue;
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
    }

    // gY"� fallback: objede date/time geçen ilk alan
    for (const [k, v] of Object.entries(item || {})) {
        if (!v) continue;
        if (!/(date|time)/i.test(k)) continue;
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}

function getProjectName(item) {
    return (
        item?.CustomerName ??
        item?.Customer ??
        item?.customer ??
        item?.ProjectName ??
        item?.projectName ??
    );
}

function matchAllowlist(projectNorm, allowList) {
    if (!Array.isArray(allowList) || allowList.length === 0) {
        return { ok: true, key: null };
    }

    for (const a of allowList) {
        const norm = metniNormalizeEt(String(a));
        if (projectNorm.includes(norm) || norm.includes(projectNorm)) {
            return { ok: true, key: a };
        }
    }
    return { ok: false };
}

/* -------------------------------------------------------------------------- */
/*                       MODEL: D�oN �?' 7 G�oN �-NCE                               */
/* -------------------------------------------------------------------------- */

function buildModel(items) {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, i) =>
        startOfDay(addDays(today, -(i + 1)))
    );
    const keys = days.map(dayKey);
    const keySet = new Set(keys);

    const parsed = items
        .map((it) => {
            const d = getPickupDate(it);
            if (!d) return null;
            const p = getProjectName(it);
            return {
                day: dayKey(d),
                project: p,
                norm: metniNormalizeEt(p),
            };
        })
        .filter(Boolean)
        .filter((x) => keySet.has(x.day));

    const regions = [];

    for (const bolge of Object.keys(REGIONS)) {
        const allow = REGIONS[bolge];
        const map = new Map();

        allow.forEach((p) => {
            const m = new Map();
            keys.forEach((k) => m.set(k, 0));
            map.set(p, m);
        });

        for (const r of parsed) {
            const m = matchAllowlist(r.norm, allow);
            if (!m.ok) continue;
            const row = map.get(m.key);
            row.set(r.day, row.get(r.day) + 1);
        }

        regions.push({
            bolge,
            days,
            rows: [...map.entries()].map(([proje, m]) => ({
                proje,
                counts: keys.map((k) => m.get(k)),
            })),
        });
    }

    return regions;
}

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function Karsilastirma() {
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const userId = 1;

    const range = useMemo(() => {
        return {
            start: addDays(new Date(), -8),
            end: new Date(),
        };
    }, []);

    const data = useMemo(() => extractItems(raw), [raw]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        setRaw({ items: [] });

        try {
            const weeks = buildWeekRangesBetween(range.start, range.end);
            const collected = [];

            for (const w of weeks) {
                const res = await fetch(`${BASE_URL}/tmsorders/week`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        startDate: toIsoLocalStart(w.start),
                        endDate: toIsoLocalEnd(w.end),
                        userId,
                    }),
                });

                const payload = await res.json();
                collected.push(...extractItems(payload));
                setRaw({ items: [...collected] });
            }

            if (!collected.length) throw new Error("Veri bulunamadı");
        } catch (e) {
            setError(e.message || "API Hatası");
            setRaw(null);
        } finally {
            setLoading(false);
        }
    }, [range.start, range.end, userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const model = useMemo(
        () => buildModel(Array.isArray(data) ? data : []),
        [data]
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>
                Kar�Yıla�Ytırma �?" Gün Gün (Dün �?' 7 Gün �-nce)
            </Typography>

            {loading && <Typography>Yükleniyor�?�</Typography>}
            {error && <Typography color="error">{error}</Typography>}

            {model.map((r) => (
                <Box key={r.bolge} sx={{ mt: 3 }}>
                    <Typography sx={{ fontWeight: 800 }}>{r.bolge}</Typography>

                    <table style={{ width: "100%", marginTop: 8 }}>
                        <thead>
                            <tr>
                                <th>Proje</th>
                                {r.days.map((d) => (
                                    <th key={dayKey(d)}>{fmtTR(d)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {r.rows.map((row) => (
                                <tr key={row.proje}>
                                    <td>{row.proje}</td>
                                    {row.counts.map((c, i) => (
                                        <td key={i} style={{ textAlign: "right" }}>
                                            {c}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            ))}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button variant="contained" onClick={fetchData} disabled={loading}>
                    Yenile
                </Button>
            </Stack>
        </Box>
    );
}
