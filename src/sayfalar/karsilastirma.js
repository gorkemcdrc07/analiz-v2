// src/sayfalar/karsilastirma.js
import React, { useMemo, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    alpha,
    useTheme,
    Paper,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    Tooltip,
    IconButton,
    Button,
    Divider,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    LinearProgress,
} from "@mui/material";
import { RiRefreshLine, RiBarChart2Line, RiSearch2Line, RiInformationLine } from "react-icons/ri";
import { motion } from "framer-motion";

import { REGIONS } from "../ozellikler/yardimcilar/veriKurallari";
import { metniNormalizeEt } from "../ozellikler/yardimcilar/metin";

/* -------------------------------------------------------------------------- */
/*                              DEMO / LOCAL DATA                             */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Veri çekme kapalı. İstersen aşağıya demo data koy.
 * Beklenen alanlar: PickupDate (veya pickupDate...) + ProjectName (veya türevleri)
 */
const DEMO_ITEMS = [
    // Örnek:
    // { PickupDate: "2026-01-10T10:00:00Z", ProjectName: "ABC LOJİSTİK" },
    // { PickupDate: "2026-01-12T12:00:00Z", ProjectName: "ABC LOJİSTİK" },
    // { PickupDate: "2025-12-05T08:00:00Z", ProjectName: "XYZ OTOMOTİV" },
];

/* ------------------------ küçük tarih yardımcıları ------------------------ */
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const fmtTR = (d) =>
    d
        ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "-";

const fmtRange = (a, b) => `${fmtTR(a)} – ${fmtTR(b)}`;

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

// Pazartesi başlangıçlı hafta
const startOfWeekMon = (d) => {
    const x = clampDayStart(d);
    const day = x.getDay(); // 0 pazar
    const diff = (day + 6) % 7; // pazartesi=0
    x.setDate(x.getDate() - diff);
    return x;
};

const endOfWeekSun = (d) => {
    const s = startOfWeekMon(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
};

// 0..6 (Pzt..Paz)
const weekdayMon0 = (d) => (d.getDay() + 6) % 7;

const eachDay = (a, b) => {
    const out = [];
    let cur = clampDayStart(a);
    const end = clampDayStart(b);
    while (cur <= end) {
        out.push(new Date(cur));
        cur = addDays(cur, 1);
    }
    return out;
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabelTR = (d) => d.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });

/* ------------------------ veri alanları yardımcıları ------------------------ */
// ✅ Sende farklıysa burayı düzelt
function getPickupDate(item) {
    const v =
        item?.PickupDate ??
        item?.pickupDate ??
        item?.pickup_date ??
        item?.pickup_datetime ??
        item?.pickupDatetime ??
        item?.pickup_time;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

// ✅ Sende farklıysa burayı düzelt
function getProjectName(item) {
    return (
        item?.ProjectName ??
        item?.projectName ??
        item?.proje ??
        item?.Proje ??
        item?.Customer ??
        item?.customer ??
        item?.AccountName ??
        item?.accountName ??
        "—"
    );
}

// Region filtresi: REGIONS[bolge] bir allowlist ise onu uygula
function isInSelectedRegion(item, seciliBolge) {
    const allow = REGIONS?.[seciliBolge];
    if (!Array.isArray(allow) || allow.length === 0) return true;

    const proj = getProjectName(item);
    const norm = metniNormalizeEt(String(proj));
    return allow.some((x) => metniNormalizeEt(String(x)) === norm);
}

/* ------------------------ forecast engine (history -> future) ------------------------ */
function buildForecastTable({ data, seciliBolge, today }) {
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

        const actualWeekToDate = countActual(list, week0Start, addDays(t0, 0));
        const expWeekRemainder = expectedForDates(dailyBase, weights, eachDay(addDays(t0, 1), week0End));
        const buHafta = Math.round(actualWeekToDate + expWeekRemainder);

        const gelecekHafta = Math.round(expectedForDates(dailyBase, weights, eachDay(week1Start, week1End)));
        const digerHafta = Math.round(expectedForDates(dailyBase, weights, eachDay(week2Start, week2End)));

        const actualMonthToDate = countActual(list, monthStartD, addDays(t0, 0));
        const expMonthRemainder = expectedForDates(dailyBase, weights, eachDay(addDays(t0, 1), monthEndD));
        const aySonunaKadar = Math.round(actualMonthToDate + expMonthRemainder);

        const ayToplam = Math.round(expectedForDates(dailyBase, weights, eachDay(monthStartD, monthEndD)));

        series.push({ bolge: seciliBolge, proje, buHafta, gelecekHafta, digerHafta, aySonunaKadar, ayToplam });
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

/* ------------------------ tarihsel analiz (son 13 ay) ------------------------ */
function buildMonthlyHistory({ data, seciliBolge, monthsBack = 13, anchorDate }) {
    const t0 = clampDayStart(anchorDate);
    const start = new Date(t0.getFullYear(), t0.getMonth() - (monthsBack - 1), 1);
    const end = endOfMonth(t0);
    end.setHours(23, 59, 59, 999);

    const filtered = (data || [])
        .filter((it) => isInSelectedRegion(it, seciliBolge))
        .map((it) => {
            const d = getPickupDate(it);
            if (!d) return null;
            return { ...it, __pickup: d };
        })
        .filter(Boolean);

    const months = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        const md = new Date(t0.getFullYear(), t0.getMonth() - i, 1);
        months.push(md);
    }

    const byProject = new Map();
    for (const it of filtered) {
        const d = it.__pickup;
        if (d < start || d > end) continue;
        const p = String(getProjectName(it) ?? "—");
        const k = monthKey(d);
        if (!byProject.has(p)) byProject.set(p, {});
        byProject.get(p)[k] = (byProject.get(p)[k] || 0) + 1;
    }

    const rows = [];
    for (const [proje, obj] of byProject.entries()) {
        const counts = months.map((m) => obj[monthKey(m)] || 0);
        const total = counts.reduce((a, b) => a + b, 0);
        rows.push({ bolge: seciliBolge, proje, counts, total });
    }

    return { months, rows };
}

/* ------------------------ KPI kart ------------------------ */
function KpiCard({ label, value, hint, color = "#6366f1" }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isPrimitive = typeof value === "string" || typeof value === "number";

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.2,
                borderRadius: 24,
                border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
                bgcolor: isDark ? alpha("#0b1220", 0.65) : "#fff",
                position: "relative",
                overflow: "hidden",
                minWidth: 190,
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: -40,
                    background: `radial-gradient(circle at 30% 20%, ${alpha(color, 0.18)} 0%, transparent 55%)`,
                    pointerEvents: "none",
                }}
            />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, letterSpacing: 0.9, color: "text.secondary" }}>
                {label}
            </Typography>

            {isPrimitive ? (
                <Typography sx={{ mt: 0.5, fontSize: "1.6rem", fontWeight: 1000, color: "text.primary", letterSpacing: -0.6 }}>
                    {value}
                </Typography>
            ) : (
                <Box sx={{ mt: 0.8 }}>{value}</Box>
            )}

            {hint ? (
                <Typography sx={{ mt: 0.6, fontSize: "0.75rem", fontWeight: 800, color: alpha(theme.palette.text.secondary, 0.9) }}>
                    {hint}
                </Typography>
            ) : null}
        </Paper>
    );
}

function TrendChip({ value }) {
    const v = Number(value || 0);
    const up = v > 0;
    const down = v < 0;
    const label = down ? `${v.toFixed(1)}% ↓` : up ? `+${v.toFixed(1)}% ↑` : "0%";
    const color = down ? "#ef4444" : up ? "#10b981" : "#94a3b8";
    return (
        <Chip
            size="small"
            label={label}
            sx={{
                height: 22,
                borderRadius: 999,
                fontWeight: 1000,
                bgcolor: alpha(color, 0.15),
                border: `1px solid ${alpha(color, 0.35)}`,
            }}
        />
    );
}

/* ------------------------ sayfa ------------------------ */
export default function Karsilastirma() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [seciliBolge, setSeciliBolge] = useState("GEBZE");
    const [arama, setArama] = useState("");
    const [sirala, setSirala] = useState("buHafta");
    const [loading, setLoading] = useState(false); // veri çekme yok => genelde false
    const [error, setError] = useState("");

    const [viewMode, setViewMode] = useState("forecast"); // forecast | tarihsel

    // ✅ Veri çekme yok: raw sadece local/demo items
    const [raw, setRaw] = useState({ items: DEMO_ITEMS });

    const data = useMemo(() => raw?.items || [], [raw]);

    const forecast = useMemo(() => {
        if (!data?.length) return null;
        return buildForecastTable({ data, seciliBolge, today: new Date() });
    }, [data, seciliBolge]);

    const history = useMemo(() => {
        if (!data?.length) return null;
        return buildMonthlyHistory({ data, seciliBolge, monthsBack: 13, anchorDate: new Date() });
    }, [data, seciliBolge]);

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

    const historyRows = useMemo(() => {
        const base = history?.rows || [];
        const q = metniNormalizeEt(arama || "");
        const filtered = !q ? base : base.filter((r) => metniNormalizeEt(r.proje).includes(q));
        return [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [history, arama]);

    const trendKpis = useMemo(() => {
        if (!data?.length)
            return { mom: 0, yoy: 0, w4: 0, thisMonth: 0, lastMonth: 0, lastYearSame: 0, prevW4: 0, w4trend: 0 };

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

    const meta = forecast?.meta;

    // ✅ Veri çekme yok: Yenile sadece demo/items’i tekrar set eder
    const handleRefreshLocal = () => {
        setLoading(true);
        setError("");
        try {
            setRaw({ items: [...DEMO_ITEMS] });
        } catch (e) {
            setError(e?.message || "Local veri yenileme hatası");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100vh",
                p: { xs: 2, md: 4 },
                background: isDark
                    ? `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 52%)`
                    : `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 52%)`,
            }}
        >
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.2,
                        borderRadius: 28,
                        border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                        bgcolor: isDark ? alpha("#0b1220", 0.62) : alpha("#ffffff", 0.85),
                        backdropFilter: "blur(16px)",
                        boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.35)" : "0 24px 80px rgba(2,6,23,0.08)",
                    }}
                >
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ lg: "center" }} justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 18,
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: isDark ? alpha("#fff", 0.08) : "#0f172a",
                                    boxShadow: isDark ? "none" : "0 18px 45px rgba(2,6,23,0.22)",
                                }}
                            >
                                <RiBarChart2Line size={22} color={isDark ? "#e2e8f0" : "#fff"} />
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 1000, fontSize: "1.25rem", letterSpacing: "-0.7px" }}>
                                    KARŞILAŞTIRMA • FORECAST + ANALİZ
                                </Typography>
                                <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
                                    (Veri çekme kapalı) • Bölge bazlı • Forecast + Son 13 ay tarihsel tablo
                                </Typography>
                            </Box>

                            <Tooltip title="Forecast: Son 28 gün seviye + son 12 hafta dağılımı ile hesaplanır. Tarihsel: son 13 ay gerçekleşen sipariş sayıları.">
                                <IconButton
                                    size="small"
                                    sx={{
                                        ml: "auto",
                                        bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#0f172a", 0.05),
                                        border: isDark ? `1px solid ${alpha("#fff", 0.1)}` : "none",
                                    }}
                                >
                                    <RiInformationLine />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                            <Select
                                size="small"
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                sx={{
                                    minWidth: 220,
                                    borderRadius: 18,
                                    bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                    "& fieldset": { border: "none" },
                                    fontWeight: 900,
                                    fontSize: "0.85rem",
                                }}
                            >
                                <MenuItem value="forecast">📍 Forecast görünümü</MenuItem>
                                <MenuItem value="tarihsel">🗓️ Tarihsel analiz (13 ay)</MenuItem>
                            </Select>

                            <Button
                                variant="contained"
                                disableElevation
                                onClick={handleRefreshLocal}
                                disabled={loading}
                                startIcon={loading ? null : <RiRefreshLine size={18} />}
                                sx={{
                                    borderRadius: 18,
                                    px: 3,
                                    py: 1.2,
                                    fontWeight: 900,
                                    textTransform: "none",
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.28)}`,
                                    "&:hover": { boxShadow: "none" },
                                }}
                            >
                                {loading ? "Analiz..." : "Yenile"}
                            </Button>
                        </Stack>
                    </Stack>

                    {raw && !loading ? (
                        <Box sx={{ mt: 1.6 }}>
                            <LinearProgress sx={{ opacity: 0.15 }} />
                        </Box>
                    ) : null}

                    {error ? (
                        <Paper
                            elevation={0}
                            sx={{
                                mt: 2,
                                p: 2,
                                borderRadius: 18,
                                border: `1px solid ${alpha("#ef4444", 0.35)}`,
                                bgcolor: alpha("#ef4444", isDark ? 0.14 : 0.08),
                            }}
                        >
                            <Typography sx={{ fontWeight: 900, color: isDark ? "#fecaca" : "#b91c1c" }}>{error}</Typography>
                        </Paper>
                    ) : null}
                </Paper>
            </motion.div>

            {/* Kontroller */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 2.5 }} alignItems={{ lg: "center" }} justifyContent="space-between">
                {/* Bölge seçimi */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 1,
                        borderRadius: 22,
                        border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                        bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.9),
                        backdropFilter: "blur(14px)",
                        overflowX: "auto",
                    }}
                >
                    <Stack direction="row" spacing={1}>
                        {Object.keys(REGIONS).map((r) => {
                            const selected = seciliBolge === r;
                            const count = REGIONS[r]?.length ?? 0;
                            return (
                                <Button
                                    key={r}
                                    onClick={() => setSeciliBolge(r)}
                                    variant={selected ? "contained" : "text"}
                                    disableElevation
                                    sx={{
                                        borderRadius: 16,
                                        px: 2,
                                        py: 1,
                                        fontWeight: 900,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                        ...(selected
                                            ? { bgcolor: isDark ? "#fff" : "#0f172a", color: isDark ? "#000" : "#fff" }
                                            : { color: isDark ? alpha("#fff", 0.75) : alpha("#0f172a", 0.78) }),
                                    }}
                                    endIcon={
                                        <Chip
                                            size="small"
                                            label={String(count).padStart(2, "0")}
                                            sx={{
                                                height: 22,
                                                fontWeight: 1000,
                                                borderRadius: 999,
                                                bgcolor: selected ? alpha("#22c55e", 0.2) : alpha(theme.palette.primary.main, 0.12),
                                            }}
                                        />
                                    }
                                >
                                    {r}
                                </Button>
                            );
                        })}
                    </Stack>
                </Paper>

                {/* Arama + Sıralama */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 1,
                        borderRadius: 22,
                        border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                        bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.9),
                        backdropFilter: "blur(14px)",
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                        <TextField
                            value={arama}
                            onChange={(e) => setArama(e.target.value)}
                            placeholder="Proje ara..."
                            size="small"
                            sx={{
                                minWidth: { xs: "100%", sm: 320 },
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 18,
                                    bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                    "& fieldset": { border: "none" },
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <RiSearch2Line />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {viewMode === "forecast" ? (
                            <Select
                                size="small"
                                value={sirala}
                                onChange={(e) => setSirala(e.target.value)}
                                sx={{
                                    minWidth: 220,
                                    borderRadius: 18,
                                    bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                    "& fieldset": { border: "none" },
                                    fontWeight: 800,
                                    fontSize: "0.85rem",
                                }}
                            >
                                <MenuItem value="buHafta">📍 Bu hafta</MenuItem>
                                <MenuItem value="gelecekHafta">➡️ Gelecek hafta</MenuItem>
                                <MenuItem value="digerHafta">⏭️ Diğer hafta</MenuItem>
                                <MenuItem value="aySonunaKadar">🧾 Ay sonuna kadar</MenuItem>
                                <MenuItem value="ayToplam">🧮 Ay toplam</MenuItem>
                            </Select>
                        ) : null}
                    </Stack>
                </Paper>
            </Stack>

            {/* KPI */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2.5, flexWrap: "wrap" }}>
                <KpiCard
                    label="SON 4 HAFTA TREND"
                    value={<TrendChip value={trendKpis.w4trend} />}
                    hint={`Son 28 gün: ${trendKpis.w4} | Önceki 28 gün: ${trendKpis.prevW4}`}
                    color="#22c55e"
                />
                <KpiCard
                    label="AYDAN AYA (MoM)"
                    value={<TrendChip value={trendKpis.mom} />}
                    hint={`Bu ay (to-date): ${trendKpis.thisMonth} | Geçen ay: ${trendKpis.lastMonth}`}
                    color="#0ea5e9"
                />
                <KpiCard
                    label="YILDAN YILA (YoY)"
                    value={<TrendChip value={trendKpis.yoy} />}
                    hint={`Bu ay (to-date): ${trendKpis.thisMonth} | Geçen yıl aynı ay: ${trendKpis.lastYearSame}`}
                    color="#8b5cf6"
                />

                {viewMode === "forecast" ? (
                    <>
                        <KpiCard label="BU HAFTA" value={forecastTotals.buHafta} hint={meta ? fmtRange(meta.week0Start, meta.week0End) : ""} color="#0ea5e9" />
                        <KpiCard label="GELECEK HAFTA" value={forecastTotals.gelecekHafta} hint={meta ? fmtRange(meta.week1Start, meta.week1End) : ""} color="#10b981" />
                        <KpiCard label="AY SONUNA KADAR" value={forecastTotals.aySonunaKadar} hint={meta ? fmtRange(meta.monthStart, meta.monthEnd) : ""} color="#f59e0b" />
                    </>
                ) : null}
            </Stack>

            <Divider sx={{ my: 2.5, opacity: isDark ? 0.2 : 0.35 }} />

            {/* TABLO */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 28,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.92),
                    overflow: "visible",
                }}
            >
                <Box sx={{ position: "relative", mt: 2 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: "24px",
                            border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.05)}`,
                            bgcolor: isDark ? alpha("#0f172a", 0.4) : alpha("#fff", 0.8),
                            backdropFilter: "blur(12px)",
                            overflow: "hidden",
                            boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.4)" : "0 20px 40px rgba(15, 23, 42, 0.06)",
                        }}
                    >
                        {/* HEADER */}
                        <Box
                            sx={{
                                px: 3,
                                py: 2.5,
                                borderBottom: `1px solid ${isDark ? alpha("#fff", 0.05) : alpha("#0f172a", 0.05)}`,
                                background: isDark
                                    ? `linear-gradient(90deg, ${alpha("#1e293b", 0.3)}, transparent)`
                                    : `linear-gradient(90deg, ${alpha("#f8fafc", 0.7)}, transparent)`,
                            }}
                        >
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{ width: 6, height: 24, bgcolor: "primary.main", borderRadius: 4 }} />
                                    <Typography sx={{ fontWeight: 900, letterSpacing: "-0.02em", fontSize: "1.1rem" }}>
                                        {seciliBolge}
                                        <Box component="span" sx={{ opacity: 0.4, mx: 1.5, fontWeight: 300 }}>
                                            |
                                        </Box>
                                        <Box component="span" sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
                                            {viewMode === "forecast" ? "Forecast Analizi" : "Tarihsel Trend (13 Ay)"}
                                        </Box>
                                    </Typography>
                                </Stack>

                                <Chip
                                    label={!raw || data.length === 0 ? "Veri Yok" : `${viewMode === "forecast" ? forecastRows.length : historyRows.length} Aktif Kayıt`}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: isDark ? alpha("#38bdf8", 0.1) : alpha("#0284c7", 0.05),
                                        color: isDark ? "#7dd3fc" : "#0369a1",
                                        borderRadius: "8px",
                                        border: `1px solid ${isDark ? alpha("#38bdf8", 0.2) : alpha("#0284c7", 0.1)}`,
                                    }}
                                />
                            </Stack>
                        </Box>

                        {(!raw || data.length === 0) ? (
                            <Box sx={{ py: 12, textAlign: "center" }}>
                                <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: "text.secondary", opacity: 0.5 }}>
                                    Görüntülenecek veri bulunamadı.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer
                                sx={{
                                    maxHeight: 640,
                                    overflow: "auto",
                                    "&::-webkit-scrollbar": { width: 8, height: 8 },
                                    "&::-webkit-scrollbar-thumb": { bgcolor: alpha("#94a3b8", 0.2), borderRadius: 8 },
                                }}
                            >
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            {["Bölge", "Proje"].map((head, i) => (
                                                <TableCell
                                                    key={head}
                                                    sx={{
                                                        fontWeight: 800,
                                                        bgcolor: isDark ? "#0f172a" : "#f8fafc",
                                                        zIndex: 11,
                                                        left: i === 0 ? 0 : 100,
                                                        position: "sticky",
                                                        borderBottom: `2px solid ${alpha("#94a3b8", 0.1)}`,
                                                        fontSize: "0.85rem",
                                                        textTransform: "uppercase",
                                                        letterSpacing: 0.5,
                                                    }}
                                                >
                                                    {head}
                                                </TableCell>
                                            ))}

                                            {(viewMode === "forecast" ? ["Bu Hafta", "Haftaya", "Diğer", "Ay Sonu", "Toplam"] : [...(history?.months || []), "Toplam"]).map(
                                                (col, idx) => (
                                                    <TableCell
                                                        key={idx}
                                                        align="right"
                                                        sx={{
                                                            fontWeight: 800,
                                                            bgcolor: isDark ? "#0f172a" : "#f8fafc",
                                                            borderBottom: `2px solid ${alpha("#94a3b8", 0.1)}`,
                                                            fontSize: "0.85rem",
                                                            textTransform: "uppercase",
                                                        }}
                                                    >
                                                        {typeof col === "string" ? col : monthLabelTR(col)}
                                                    </TableCell>
                                                )
                                            )}
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {(viewMode === "forecast" ? forecastRows : historyRows).map((r, idx) => {
                                            const isHot = viewMode === "forecast" && r.ayToplam > 0;
                                            return (
                                                <TableRow
                                                    key={idx}
                                                    hover
                                                    sx={{
                                                        transition: "all 0.2s",
                                                        "&:hover": { bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01) },
                                                    }}
                                                >
                                                    <TableCell
                                                        sx={{
                                                            position: "sticky",
                                                            left: 0,
                                                            zIndex: 5,
                                                            bgcolor: isDark ? "#0b1220" : "#fff",
                                                            borderRight: `1px solid ${alpha("#94a3b8", 0.05)}`,
                                                        }}
                                                    >
                                                        <Chip label={seciliBolge} size="small" sx={{ fontWeight: 900, fontSize: "0.7rem", height: 20 }} />
                                                    </TableCell>

                                                    <TableCell
                                                        sx={{
                                                            position: "sticky",
                                                            left: 100,
                                                            zIndex: 5,
                                                            bgcolor: isDark ? "#0b1220" : "#fff",
                                                            borderRight: `1px solid ${alpha("#94a3b8", 0.05)}`,
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{r.proje}</Typography>
                                                    </TableCell>

                                                    {viewMode === "forecast" ? (
                                                        <>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                                {r.buHafta}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                                {r.gelecekHafta}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                                {r.digerHafta}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                                {r.aySonunaKadar}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box
                                                                    sx={{
                                                                        display: "inline-block",
                                                                        px: 1.2,
                                                                        py: 0.4,
                                                                        borderRadius: "6px",
                                                                        bgcolor: isHot ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                                                                        color: isHot ? "primary.main" : "text.primary",
                                                                        fontWeight: 900,
                                                                    }}
                                                                >
                                                                    {r.ayToplam}
                                                                </Box>
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {r.counts.map((c, i) => (
                                                                <TableCell key={i} align="right" sx={{ fontWeight: 600, opacity: c === 0 ? 0.3 : 1 }}>
                                                                    {c}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell align="right" sx={{ fontWeight: 900, color: "primary.main" }}>
                                                                {r.total}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            );
                                        })}

                                        {/* TOPLAM SATIRI */}
                                        <TableRow sx={{ bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02) }}>
                                            <TableCell
                                                colSpan={2}
                                                sx={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 6,
                                                    bgcolor: isDark ? "#161d2b" : "#f1f5f9",
                                                    fontWeight: 900,
                                                    color: "primary.main",
                                                    fontSize: "0.9rem",
                                                }}
                                            >
                                                GENEL TOPLAM
                                            </TableCell>

                                            {viewMode === "forecast" ? (
                                                <>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                                                        {forecastTotals.buHafta}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                                                        {forecastTotals.gelecekHafta}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                                                        {forecastTotals.digerHafta}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                                                        {forecastTotals.aySonunaKadar}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 1000, fontSize: "1rem", color: "primary.main" }}>
                                                        {forecastTotals.ayToplam}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <TableCell align="right" colSpan={(history?.months?.length || 0) + 1} sx={{ fontWeight: 900 }}>
                                                    {/* İstersen buraya tarihsel genel toplamları da ekleyebilirsin */}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </Box>
            </Paper>
        </Box>
    );
}
