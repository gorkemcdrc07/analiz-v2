// src/sayfalar/karsilastirma.js
import React, { useMemo, useState, useEffect } from "react";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Stack,
    Button,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    alpha,
    Paper,
    Tooltip,
    TextField,
    Autocomplete,
    ToggleButton,
    ToggleButtonGroup,
    InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import CompressRoundedIcon from "@mui/icons-material/CompressRounded";
import ExpandRoundedIcon from "@mui/icons-material/ExpandRounded";

import { supabase } from "../supabaseClient";
import { calcKpi } from "../utils/compareEngine";

/* ------------------------ REGIONS ------------------------ */
const REGIONS = {
    TRAKYA: [
        "BUNGE LÜLEBURGAZ FTL",
        "BUNGE GEBZE FTL",
        "BUNGE PALET",
        "REKA FTL",
        "EKSUN GIDA FTL",
        "SARUHAN FTL",
        "PEPSİ FTL",
        "PEPSİ FTL ÇORLU",
        "TEKİRDAĞ UN FTL",
        "AYDINLI MODA FTL",
        "ADKOTURK FTL",
        "ADKOTURK FTL ENERJİ İÇECEĞİ",
        "SGS FTL",
        "BSH FTL",
        "ALTERNA GIDA FTL",
        "BİLEŞİM KİMYA FTL",
        "DERYA OFİS FTL",
        "SAPRO FTL",
        "MARMARA CAM FTL",
        "FAKİR FTL",
        "MODERN KARTON FTL",
        "KÜÇÜKBAY TRAKYA FTL",
        "MODERN BOBİN FTL",
    ],
    GEBZE: [
        "HEDEF FTL",
        "HEDEF DIŞ TEDARİK",
        "PEPSİ FTL GEBZE",
        "EBEBEK FTL GEBZE",
        "FAKİR FTL GEBZE",
        "MİLHANS FTL",
        "AYDIN KURUYEMİŞ FTL",
        "AVANSAS FTL",
        "AVANSAS SPOT FTL",
        "DSV ERNAMAŞ FTL",
        "FLO FTL",
        "ÇİÇEKÇİ FTL",
        "ÇİZMECİ GIDA FTL",
        "OTTONYA (HEDEFTEN AÇILIYOR)",
        "GALEN ÇOCUK FTL",
        "ENTAŞ FTL",
    ],
    DERİNCE: ["ARKAS PETROL OFİSİ DERİNCE FTL", "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL"],
    İZMİR: [
        "EURO GIDA FTL",
        "EBEBEK FTL",
        "KİPAŞ SÖKE FTL",
        "CEYSU FTL",
        "TAT GIDA FTL",
        "ZER SALÇA",
        "ANKUTSAN FTL",
        "PELAGOS GIDA FTL",
        "KÜÇÜKBAY İZMİR FTL",
    ],
    ÇUKUROVA: ["PEKER FTL", "GDP FTL", "ÖZMEN UN FTL", "KİPAŞ MARAŞ FTL", "TÜRK OLUKLU FTL", "İLKON TEKSTİL FTL", "BİM / MERSİN"],
    ESKİŞEHİR: ["ES FTL", "ES GLOBAL FRİGO FTL", "KİPAŞ BOZÜYÜK FTL", "2A TÜKETİM FTL", "MODERN HURDA DÖNÜŞ FTL", "MODERN HURDA ZONGULDAK FTL", "ŞİŞECAM FTL", "DENTAŞ FTL"],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
};
const allProjects = Object.values(REGIONS).flat();

/* ------------------------ UI helpers ------------------------ */
function MetricPill({ label, value, tone = "dark" }) {
    const cfg =
        tone === "good"
            ? { bg: alpha("#10b981", 0.14), fg: "#065f46", bd: alpha("#10b981", 0.22) }
            : tone === "warn"
                ? { bg: alpha("#f59e0b", 0.14), fg: "#92400e", bd: alpha("#f59e0b", 0.22) }
                : tone === "bad"
                    ? { bg: alpha("#ef4444", 0.14), fg: "#991b1b", bd: alpha("#ef4444", 0.22) }
                    : { bg: alpha("#0f172a", 0.06), fg: "#0f172a", bd: alpha("#0f172a", 0.12) };

    return (
        <Chip
            size="small"
            label={
                <span>
                    <b style={{ fontWeight: 1000 }}>{label}:</b> {value}
                </span>
            }
            sx={{
                height: 26,
                borderRadius: 999,
                fontWeight: 900,
                bgcolor: cfg.bg,
                color: cfg.fg,
                border: `1px solid ${cfg.bd}`,
                backdropFilter: "blur(10px)",
            }}
        />
    );
}

function SectionTitle({ icon, title, sub }) {
    return (
        <Stack direction="row" spacing={1.1} alignItems="center">
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha("#0f172a", 0.06),
                    border: `1px solid ${alpha("#0f172a", 0.1)}`,
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography sx={{ fontWeight: 1200, color: "#0f172a", letterSpacing: "-0.25px" }}>{title}</Typography>
                {sub ? <Typography sx={{ fontWeight: 850, color: "#64748b", fontSize: "0.82rem", mt: 0.1 }}>{sub}</Typography> : null}
            </Box>
        </Stack>
    );
}

function fmtPct(n) {
    if (n == null || !Number.isFinite(n)) return "-";
    return `%${n}`;
}
function safePct(a, b) {
    const aa = Number(a ?? 0);
    const bb = Number(b ?? 0);
    if (!bb) return null;
    return Math.round((aa / bb) * 100);
}
function fmtInt(n) {
    const x = Number(n ?? 0);
    if (!Number.isFinite(x)) return "-";
    return new Intl.NumberFormat("tr-TR").format(Math.round(x));
}

// ✅ Daha doğru trend hesabı (küçük bazlarda göstermesin)
function pctChange(newVal, baseVal, { minBase = 5 } = {}) {
    const n = Number(newVal);
    const b = Number(baseVal);
    if (!Number.isFinite(n) || !Number.isFinite(b)) return null;
    if (b <= 0 || Math.abs(b) < minBase) return null;
    return ((n - b) / b) * 100;
}

/* ------------------------ Mapping helpers (RAW -> Engine) ------------------------ */
const STATUS_TEXT_TO_CODE = {
    Bekliyor: 1,
    Onaylandı: 2,
    "Spot Araç Planlamada": 3,
    "Araç Atandı": 4,
    "Araç Yüklendi": 5,
    "Araç Yolda": 6,
    "Teslim Edildi": 7,
    Tamamlandı: 8,
    "Eksik Evrak": 10,
    "Araç Boşaltmada": 80,
    "Filo Araç Planlamada": 90,
    İptal: 200,
};
const normalizeTR = (s) => (s ?? "").toString().trim().toLocaleUpperCase("tr-TR");

function mapRawToEngineRow(r) {
    const statusText = (r.siparis_durumu ?? "").toString().trim();
    const statusCode = STATUS_TEXT_TO_CODE[statusText] ?? statusText;

    const isPrintBool =
        normalizeTR(r.sefer_hesap_ozeti) === "CHECKED" ||
        normalizeTR(r.sefer_hesap_ozeti) === "TRUE" ||
        r.sefer_hesap_ozeti === true;

    return {
        ProjectName: r.proje,
        ServiceName: r.hizmet_tipi,
        SubServiceName: r.hizmet_tipi ?? "",

        TMSVehicleRequestDocumentNo: r.pozisyon_no,
        TMSDespatchDocumentNo: r.sefer_no,

        OrderStatu: statusCode,

        PickupCityName: r.yukleme_ili,
        PickupCountyName: r.yukleme_ilcesi,
        DeliveryCityName: r.teslim_ili,
        DeliveryCountyName: r.teslim_ilcesi,

        VehicleWorkingName: r.arac_calisma_tipi,
        IsPrint: isPrintBool,

        TMSDespatchCreatedDate: r.sefer_acilis_zamani,
        PickupDate: r.yukleme_tarihi,

        OrderCreatedDate: r.effective_ts ?? r.yukleme_ts,

        _raw: r,
    };
}

/* ------------------------ Date helpers ------------------------ */
function startOfWeekMonday(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
}
function endOfWeekSunday(d) {
    const s = startOfWeekMonday(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
}
function addMonths(d, m) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + m);
    return x;
}
function startOfMonth(d) {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
}
function endOfMonth(d) {
    const x = startOfMonth(d);
    x.setMonth(x.getMonth() + 1);
    x.setMilliseconds(-1);
    return x;
}
function monthLabelTR(d) {
    try {
        return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    } catch {
        return "";
    }
}
function fmtRangeTR(start, end) {
    try {
        const s = start?.toLocaleDateString("tr-TR");
        const e = end?.toLocaleDateString("tr-TR");
        return `${s} - ${e}`;
    } catch {
        return "";
    }
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function prevMonthWindows(now = new Date()) {
    const prev = startOfMonth(addMonths(now, -1));
    const prevEnd = endOfMonth(prev);
    const w1End = addDays(prev, 6);
    const w2End = addDays(prev, 13);
    const w3End = addDays(prev, 20);

    return {
        prevStart: prev,
        prevEnd,
        w1: { start: prev, end: new Date(Math.min(w1End.getTime(), prevEnd.getTime())) },
        w2: { start: prev, end: new Date(Math.min(w2End.getTime(), prevEnd.getTime())) },
        w3: { start: prev, end: new Date(Math.min(w3End.getTime(), prevEnd.getTime())) },
    };
}
function clamp01(x) {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}
function forecastNextMonthTotal(monthTotalsOldestToNewest) {
    const arr = (monthTotalsOldestToNewest || []).map(Number).filter((x) => Number.isFinite(x));
    if (!arr.length) return 0;
    if (arr.length === 1) return Math.max(0, Math.round(arr[0]));

    const last3 = arr.slice(-3);
    const avg3 = last3.reduce((a, b) => a + b, 0) / last3.length;

    const slope = (arr[arr.length - 1] - arr[0]) / (arr.length - 1);
    const last = arr[arr.length - 1];
    const trendPoint = last + slope;

    const blended = (avg3 + last + trendPoint) / 3;
    return Math.max(0, Math.round(blended));
}
function forecastWeekSplitsFromPrevMonth(prevW1, prevW2, prevW3, prevFull, nextMonthTotal) {
    const full = Number(prevFull ?? 0);
    if (!full) return { fW1: null, fW2: null, fW3: null };

    const r1 = clamp01((prevW1 ?? 0) / full);
    const r2 = clamp01((prevW2 ?? 0) / full);
    const r3 = clamp01((prevW3 ?? 0) / full);

    return {
        fW1: Math.round(nextMonthTotal * r1),
        fW2: Math.round(nextMonthTotal * r2),
        fW3: Math.round(nextMonthTotal * r3),
    };
}

/* ------------------------ Cells: centered number + modern trend ------------------------ */
function TrendPill({ pct }) {
    if (pct == null || !Number.isFinite(pct) || pct === 0) return null;

    const up = pct > 0;
    const bg = up ? alpha("#10b981", 0.14) : alpha("#ef4444", 0.14);
    const bd = up ? alpha("#10b981", 0.22) : alpha("#ef4444", 0.22);
    const fg = up ? "#065f46" : "#991b1b";
    const shown = Math.abs(pct).toFixed(1);

    return (
        <Chip
            size="small"
            label={`${up ? "▲" : "▼"} %${shown}`}
            sx={{
                height: 22,
                borderRadius: 999,
                fontWeight: 1100,
                bgcolor: bg,
                border: `1px solid ${bd}`,
                color: fg,
            }}
        />
    );
}

function CellValue({ value, isForecast, trendPct, density = "comfortable" }) {
    const v = Number(value ?? 0);
    const hasValue = Number.isFinite(v);

    const cellMinH = density === "compact" ? 38 : 44;

    return (
        <Stack spacing={0.35} alignItems="center" justifyContent="center" sx={{ minHeight: cellMinH, px: 0.5 }}>
            <Typography
                sx={{
                    fontWeight: isForecast ? 1250 : 1050,
                    color: "#0f172a",
                    fontSize: isForecast ? (density === "compact" ? "0.96rem" : "1.02rem") : density === "compact" ? "0.90rem" : "0.96rem",
                    textAlign: "center",
                    lineHeight: 1.05,
                    letterSpacing: "-0.2px",
                }}
            >
                {hasValue ? fmtInt(v) : "-"}
            </Typography>

            {isForecast ? <TrendPill pct={trendPct} /> : null}
        </Stack>
    );
}

function MiniPill({ label, value, tone = "dark" }) {
    const cfg =
        tone === "good"
            ? { bg: alpha("#10b981", 0.12), fg: "#065f46", bd: alpha("#10b981", 0.18) }
            : tone === "warn"
                ? { bg: alpha("#f59e0b", 0.12), fg: "#92400e", bd: alpha("#f59e0b", 0.18) }
                : tone === "bad"
                    ? { bg: alpha("#ef4444", 0.12), fg: "#991b1b", bd: alpha("#ef4444", 0.18) }
                    : { bg: alpha("#0f172a", 0.05), fg: "#0f172a", bd: alpha("#0f172a", 0.10) };

    return (
        <Chip
            size="small"
            label={
                <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 1100 }}>{label}</span>
                    <span style={{ fontWeight: 1000 }}>{value}</span>
                </span>
            }
            sx={{
                height: 22,
                borderRadius: 999,
                fontWeight: 1000,
                bgcolor: cfg.bg,
                color: cfg.fg,
                border: `1px solid ${cfg.bd}`,
            }}
        />
    );
}

/* ------------------------ Table (Modern v2) ------------------------ */
function TedMatrixTableModern({ title, subtitle, columns, rows, totals }) {
    const [showHistory, setShowHistory] = useState(false);

    // ✅ Modern extras
    const [density, setDensity] = useState("comfortable"); // compact | comfortable
    const [sortMode, setSortMode] = useState("none"); // none | forecast_desc | trend_desc
    const [query, setQuery] = useState("");

    const dims = useMemo(() => {
        if (density === "compact") return { colW: 165, leftW: 380, headTop2: 40 };
        return { colW: 190, leftW: 420, headTop2: 42 };
    }, [density]);

    const colW = dims.colW;
    const leftW = dims.leftW;

    const forecastCols = useMemo(() => columns.filter((c) => String(c.key).startsWith("F_")), [columns]);
    const historyCols = useMemo(() => columns.filter((c) => !String(c.key).startsWith("F_")), [columns]);

    // ✅ İlk görünüm: sadece tahmin | Detay: geçmiş solda, tahmin sağda
    const visibleCols = useMemo(() => {
        return showHistory ? [...historyCols, ...forecastCols] : forecastCols;
    }, [showHistory, historyCols, forecastCols]);

    const firstForecastKey = forecastCols[0]?.key;

    const filteredRows = useMemo(() => {
        const q = normalizeTR(query).replace(/\s+/g, " ").trim();
        if (!q) return rows;
        return (rows || []).filter((r) => normalizeTR(r.project).includes(q));
    }, [rows, query]);

    const sortedRows = useMemo(() => {
        const arr = [...(filteredRows || [])];
        if (sortMode === "forecast_desc") {
            arr.sort((a, b) => Number(b.values?.F_NEXT ?? 0) - Number(a.values?.F_NEXT ?? 0));
        } else if (sortMode === "trend_desc") {
            arr.sort((a, b) => Number(b.trendMeta?.F_NEXT ?? -9999) - Number(a.trendMeta?.F_NEXT ?? -9999));
        }
        return arr;
    }, [filteredRows, sortMode]);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 6,
                border: "1px solid rgba(226,232,240,0.9)",
                bgcolor: "rgba(255,255,255,0.86)",
                overflow: "hidden",
                boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
            }}
        >
            {/* Header */}
            <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", lg: "center" }}
                justifyContent="space-between"
                sx={{ mb: 1.4 }}
            >
                <Stack spacing={0.45} sx={{ minWidth: 280 }}>
                    <SectionTitle icon={<TableRowsRoundedIcon fontSize="small" />} title={title} sub={subtitle} />
                    <Typography sx={{ fontWeight: 850, color: "#94a3b8", fontSize: "0.78rem", mt: 0.1 }}>
                        Arama • Sıralama • Kompakt/Rahat • Sticky toplam
                    </Typography>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                    <TextField
                        size="small"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tabloda proje ara…"
                        sx={{
                            minWidth: { xs: "100%", md: 240 },
                            "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "rgba(255,255,255,0.60)" },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={density}
                        onChange={(_, v) => v && setDensity(v)}
                        sx={{
                            "& .MuiToggleButton-root": { borderRadius: 3, fontWeight: 1100 },
                        }}
                    >
                        <ToggleButton value="compact">
                            <Stack direction="row" spacing={0.7} alignItems="center">
                                <CompressRoundedIcon fontSize="small" />
                                <span>Kompakt</span>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="comfortable">
                            <Stack direction="row" spacing={0.7} alignItems="center">
                                <ExpandRoundedIcon fontSize="small" />
                                <span>Rahat</span>
                            </Stack>
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={sortMode}
                        onChange={(_, v) => setSortMode(v ?? "none")}
                        sx={{
                            "& .MuiToggleButton-root": { borderRadius: 3, fontWeight: 1100 },
                        }}
                    >
                        <ToggleButton value="none">
                            <Stack direction="row" spacing={0.7} alignItems="center">
                                <SwapVertRoundedIcon fontSize="small" />
                                <span>Normal</span>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="forecast_desc">Tahmin ↓</ToggleButton>
                        <ToggleButton value="trend_desc">Trend ↓</ToggleButton>
                    </ToggleButtonGroup>

                    <Button
                        variant={showHistory ? "contained" : "outlined"}
                        onClick={() => setShowHistory((v) => !v)}
                        sx={{
                            borderRadius: 3,
                            fontWeight: 1100,
                            ...(showHistory ? { bgcolor: "#0f172a", "&:hover": { bgcolor: "#111827" } } : {}),
                        }}
                    >
                        {showHistory ? "Detayı Gizle" : "Detay (Geçmiş)"}
                    </Button>
                </Stack>
            </Stack>

            {/* Table shell */}
            <Box
                sx={{
                    borderRadius: 5,
                    border: "1px solid rgba(226,232,240,0.95)",
                    bgcolor: "rgba(255,255,255,0.92)",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ overflowX: "auto" }}>
                    <Box sx={{ minWidth: leftW + visibleCols.length * colW }}>
                        {/* GROUP HEADER */}
                        <Box
                            sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 7,
                                display: "grid",
                                gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                bgcolor: "rgba(248,250,252,0.92)",
                                backdropFilter: "blur(12px)",
                                borderBottom: "1px solid rgba(226,232,240,0.95)",
                                boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                            }}
                        >
                            <Box
                                sx={{
                                    px: 1.8,
                                    py: 1.0,
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 8,
                                    bgcolor: "rgba(248,250,252,0.92)",
                                    borderRight: "1px solid rgba(226,232,240,0.9)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1100, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                                    Proje
                                </Typography>
                                <Typography sx={{ fontWeight: 850, color: "#94a3b8", fontSize: "0.72rem", mt: 0.1, textAlign: "left" }}>
                                    Sticky • Arama/Sıralama • Trend rozetli
                                </Typography>
                            </Box>

                            {!showHistory ? (
                                <Box
                                    sx={{
                                        gridColumn: `span ${visibleCols.length}`,
                                        px: 1.2,
                                        py: 1.0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Chip
                                        size="small"
                                        label="TAHMİN"
                                        sx={{
                                            height: 24,
                                            borderRadius: 999,
                                            fontWeight: 1200,
                                            bgcolor: alpha("#0f172a", 0.06),
                                            border: `1px solid ${alpha("#0f172a", 0.12)}`,
                                            color: "#0f172a",
                                        }}
                                    />
                                </Box>
                            ) : (
                                <>
                                    <Box
                                        sx={{
                                            gridColumn: `span ${historyCols.length}`,
                                            px: 1.2,
                                            py: 1.0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRight: "1px solid rgba(226,232,240,0.85)",
                                            background: `linear-gradient(180deg, ${alpha("#f59e0b", 0.08)}, transparent)`,
                                        }}
                                    >
                                        <Chip
                                            size="small"
                                            label="GEÇMİŞ"
                                            sx={{
                                                height: 24,
                                                borderRadius: 999,
                                                fontWeight: 1200,
                                                bgcolor: alpha("#f59e0b", 0.12),
                                                border: `1px solid ${alpha("#f59e0b", 0.18)}`,
                                                color: "#92400e",
                                            }}
                                        />
                                    </Box>

                                    <Box
                                        sx={{
                                            gridColumn: `span ${forecastCols.length}`,
                                            px: 1.2,
                                            py: 1.0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: `linear-gradient(180deg, ${alpha("#0f172a", 0.05)}, transparent)`,
                                        }}
                                    >
                                        <Chip
                                            size="small"
                                            label="TAHMİN"
                                            sx={{
                                                height: 24,
                                                borderRadius: 999,
                                                fontWeight: 1200,
                                                bgcolor: alpha("#0f172a", 0.06),
                                                border: `1px solid ${alpha("#0f172a", 0.12)}`,
                                                color: "#0f172a",
                                            }}
                                        />
                                    </Box>
                                </>
                            )}
                        </Box>

                        {/* COLUMN HEADER */}
                        <Box
                            sx={{
                                position: "sticky",
                                top: dims.headTop2,
                                zIndex: 6,
                                display: "grid",
                                gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                bgcolor: "rgba(248,250,252,0.92)",
                                backdropFilter: "blur(12px)",
                                borderBottom: "1px solid rgba(226,232,240,0.95)",
                            }}
                        >
                            <Box
                                sx={{
                                    px: 1.8,
                                    py: 1.2,
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 7,
                                    bgcolor: "rgba(248,250,252,0.92)",
                                    borderRight: "1px solid rgba(226,232,240,0.9)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1150, color: "#0f172a", fontSize: "0.82rem", textAlign: "left" }}>
                                    Proje
                                </Typography>
                                <Typography sx={{ fontWeight: 850, color: "#94a3b8", fontSize: "0.74rem", mt: 0.2, textAlign: "left" }}>
                                    Özet + Tedarik (adet)
                                </Typography>
                            </Box>

                            {visibleCols.map((c) => {
                                const isForecast = String(c.key).startsWith("F_");
                                const isGroupSplit = showHistory && c.key === firstForecastKey && historyCols.length;

                                return (
                                    <Box
                                        key={c.key}
                                        sx={{
                                            px: 1.2,
                                            py: 1.2,
                                            textAlign: "center",
                                            borderLeft: isGroupSplit ? "1px solid rgba(226,232,240,0.85)" : "none",
                                            background: showHistory
                                                ? isForecast
                                                    ? `linear-gradient(180deg, ${alpha("#0f172a", 0.05)}, ${alpha("#0f172a", 0.01)})`
                                                    : alpha("#f59e0b", 0.012)
                                                : `linear-gradient(180deg, ${alpha("#0f172a", 0.05)}, ${alpha("#0f172a", 0.01)})`,
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 1200, color: "#0f172a", fontSize: "0.82rem", textAlign: "center" }}>
                                            {c.label}
                                        </Typography>
                                        <Typography sx={{ fontWeight: 850, color: "#94a3b8", fontSize: "0.72rem", mt: 0.2, textAlign: "center" }}>
                                            {c.sub || c.rangeText || ""}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* BODY */}
                        {sortedRows.map((r, idx) => {
                            const avg3 = Number(r.values?.AVG_3M ?? 0);
                            const pmFull = Number(r.values?.PM_FULL ?? 0);
                            const fNext = Number(r.values?.F_NEXT ?? 0);
                            const fTrend = r.trendMeta?.F_NEXT;

                            return (
                                <Box
                                    key={r.project}
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                        borderBottom: "1px solid rgba(226,232,240,0.65)",
                                        bgcolor: idx % 2 === 0 ? "rgba(15,23,42,0.012)" : "transparent",
                                        "&:hover": { bgcolor: "rgba(15,23,42,0.045)" },
                                        transition: "background 160ms ease",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 1.8,
                                            py: density === "compact" ? 0.9 : 1.15,
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 3,
                                            bgcolor: idx % 2 === 0 ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.94)",
                                            borderRight: "1px solid rgba(226,232,240,0.7)",
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 1200, color: "#0f172a", fontSize: density === "compact" ? "0.90rem" : "0.92rem" }}>
                                            {r.project}
                                        </Typography>

                                        {/* mini summary pills */}
                                        <Stack direction="row" spacing={0.8} sx={{ mt: 0.55 }} flexWrap="wrap" useFlexGap>
                                            <MiniPill label="Ort" value={fmtInt(avg3)} />
                                            <MiniPill label="Ö.Ay" value={fmtInt(pmFull)} tone="warn" />
                                            <MiniPill label="Tah" value={fmtInt(fNext)} tone="dark" />
                                            {fTrend != null ? <TrendPill pct={fTrend} /> : null}
                                        </Stack>

                                        {r.note ? (
                                            <Typography sx={{ fontWeight: 850, color: "#64748b", fontSize: "0.76rem", mt: 0.45 }}>
                                                {r.note}
                                            </Typography>
                                        ) : null}
                                    </Box>

                                    {visibleCols.map((c) => {
                                        const v = r.values?.[c.key];
                                        const isForecast = String(c.key).startsWith("F_");
                                        const isGroupSplit = showHistory && c.key === firstForecastKey && historyCols.length;

                                        return (
                                            <Box
                                                key={c.key}
                                                sx={{
                                                    px: 0.8,
                                                    py: 0.7,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderLeft: isGroupSplit ? "1px solid rgba(226,232,240,0.85)" : "none",
                                                    background: showHistory
                                                        ? isForecast
                                                            ? alpha("#0f172a", 0.012)
                                                            : "transparent"
                                                        : alpha("#0f172a", 0.012),
                                                }}
                                            >
                                                <CellValue
                                                    value={v}
                                                    density={density}
                                                    isForecast={isForecast}
                                                    trendPct={isForecast ? r.trendMeta?.[c.key] : null}
                                                />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            );
                        })}

                        {/* TOTALS (Sticky footer) */}
                        <Box
                            sx={{
                                position: "sticky",
                                bottom: 0,
                                zIndex: 8,
                                display: "grid",
                                gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                bgcolor: "rgba(248,250,252,0.92)",
                                backdropFilter: "blur(14px)",
                                borderTop: "1px solid rgba(226,232,240,0.95)",
                                boxShadow: "0 -10px 26px rgba(15,23,42,0.10)",
                            }}
                        >
                            <Box
                                sx={{
                                    px: 1.8,
                                    py: 1.15,
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 9,
                                    bgcolor: "rgba(248,250,252,0.96)",
                                    borderRight: "1px solid rgba(226,232,240,0.9)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1250, color: "#0f172a" }}>BÖLGE TOPLAM</Typography>
                                <Typography sx={{ fontWeight: 850, color: "#64748b", fontSize: "0.78rem", mt: 0.15 }}>
                                    Filtrelenmiş tablo toplamı
                                </Typography>
                            </Box>

                            {visibleCols.map((c) => {
                                const isForecast = String(c.key).startsWith("F_");
                                const isGroupSplit = showHistory && c.key === firstForecastKey && historyCols.length;

                                return (
                                    <Box
                                        key={c.key}
                                        sx={{
                                            px: 0.8,
                                            py: 0.7,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderLeft: isGroupSplit ? "1px solid rgba(226,232,240,0.85)" : "none",
                                        }}
                                    >
                                        <CellValue value={totals?.[c.key]} density={density} isForecast={isForecast} />
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* empty state */}
                        {!sortedRows.length ? (
                            <Box sx={{ p: 2.2 }}>
                                <Typography sx={{ fontWeight: 1100, color: "#0f172a" }}>Sonuç yok</Typography>
                                <Typography sx={{ fontWeight: 850, color: "#64748b", mt: 0.4 }}>
                                    Arama filtresi nedeniyle eşleşen proje bulunamadı.
                                </Typography>
                            </Box>
                        ) : null}
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}

/* ------------------------ Supabase fetch (pagination) ------------------------ */
async function fetchSiparislerRawV({ projects, startISO, endISO, dateField, pageSize = 1000, hardCap = null }) {
    const selectCols = `
    proje,
    hizmet_tipi,
    arac_calisma_tipi,
    pozisyon_no,
    sefer_no,
    siparis_durumu,
    sefer_acilis_zamani,
    siparis_acilis_zamani,
    yukleme_tarihi,
    yukleme_ts,
    effective_ts,
    yukleme_ili,
    yukleme_ilcesi,
    teslim_ili,
    teslim_ilcesi,
    sefer_hesap_ozeti
  `;

    let all = [];
    let from = 0;

    while (true) {
        const to = from + pageSize - 1;

        const q = supabase
            .from("siparisler_raw_v_eff")
            .select(selectCols)
            .in("proje", projects)
            .gte(dateField, startISO)
            .lte(dateField, endISO)
            .order(dateField, { ascending: false })
            .range(from, to);

        const { data, error } = await q;
        if (error) throw error;

        const chunk = Array.isArray(data) ? data : [];
        all = all.concat(chunk);

        if (hardCap && all.length >= hardCap) {
            all = all.slice(0, hardCap);
            break;
        }

        if (chunk.length < pageSize) break;
        from += pageSize;
    }

    return all;
}

/* ------------------------ Component ------------------------ */
export default function KarsilastirmaPanel({ open, onClose, onApply }) {
    // ✅ Bölge boşsa tüm projeler listelensin
    const [region, setRegion] = useState("");
    // ✅ Proje boş gelsin kullanıcı seçsin
    const [projects, setProjects] = useState([]);

    const dbDateField = "effective_ts";
    const engineDateField = "OrderCreatedDate";
    const toNow = true;

    const [result, setResult] = useState(null);
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // ✅ Bölge seçilince o bölgenin projeleri, seçilmezse tüm projeler
    const availableProjects = useMemo(() => {
        return region ? REGIONS[region] || [] : allProjects;
    }, [region]);

    // ✅ Bölge değişince seçili projeler filtre dışına çıktıysa çıkar
    useEffect(() => {
        setProjects((prev) => prev.filter((p) => availableProjects.includes(p)));
    }, [availableProjects]);

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setErrorText("");
        setLoading(false);
        setShowAdvanced(false);
    }, [open]);

    const selectedProjects = useMemo(() => projects, [projects]);
    const canApply = selectedProjects.length > 0;

    const allSelected = useMemo(() => {
        const a = availableProjects || [];
        if (!a.length) return false;
        if ((projects?.length || 0) !== a.length) return false;
        const setP = new Set(projects);
        return a.every((x) => setP.has(x));
    }, [projects, availableProjects]);

    const resetFilters = () => {
        setRegion("");
        setProjects([]);
        setResult(null);
        setErrorText("");
    };

    const handleApply = async () => {
        setErrorText("");
        setResult(null);
        if (!canApply) return;

        const now = new Date();

        // son 6 ay + (bu hafta/şimdiye kadar)
        const minStart = startOfMonth(addMonths(now, -6));
        const maxEnd = toNow ? now : endOfWeekSunday(now);

        const startISO = minStart.toISOString();
        const endISO = maxEnd.toISOString();

        onApply?.({
            region,
            projects: selectedProjects,
            dbDateField,
            engineDateField,
            periods: [],
        });

        setLoading(true);
        try {
            const raw = await fetchSiparislerRawV({
                projects: selectedProjects,
                startISO,
                endISO,
                dateField: dbDateField,
                pageSize: 1000,
                hardCap: null,
            });

            const engineData = (raw || []).map(mapRawToEngineRow);

            // Bu hafta KPI
            const weekStart = startOfWeekMonday(now);
            const weekEnd = toNow ? now : endOfWeekSunday(now);
            const allowedTotal = new Set(selectedProjects.map((p) => normalizeTR(p).replace(/\s+/g, " ")));
            const weekKpi = calcKpi({
                data: engineData,
                start: weekStart,
                end: weekEnd,
                dateField: engineDateField,
                allowedProjects: allowedTotal,
            });

            setResult({
                fetchedCount: raw.length,
                _engineData: engineData,
                week: { start: weekStart, end: weekEnd, rangeText: fmtRangeTR(weekStart, weekEnd), kpi: weekKpi },
                region,
                projects: selectedProjects,
            });
        } catch (e) {
            setErrorText(e?.message ? String(e.message) : "Supabase/Analiz sırasında hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const tedMatrix = useMemo(() => {
        if (!result?._engineData?.length || !result?.projects?.length) return null;

        const now = new Date();
        const pm = prevMonthWindows(now);

        // ✅ Tahmin ayı: içinde bulunduğumuz ay (Ocak gibi)
        const forecastMonthStart = startOfMonth(now);
        const forecastMonthLabel = monthLabelTR(forecastMonthStart);

        const monthsBack = [6, 5, 4, 3, 2, 1].map((n) => {
            const ms = startOfMonth(addMonths(now, -n));
            return { start: ms, end: endOfMonth(ms) };
        });

        // Görsel sırayı biz kontrol ediyoruz:
        // - default: sadece tahmin
        // - detay açılınca: geçmiş solda, tahmin sağda (table içinde hallediliyor)
        const columns = [
            // Tahmin
            { key: "F_NEXT", label: "Tahmin", sub: forecastMonthLabel, rangeText: "" },
            { key: "F_W1", label: "Tahmin", sub: "İlk 1 Hafta", rangeText: "" },
            { key: "F_W2", label: "Tahmin", sub: "İlk 2 Hafta", rangeText: "" },
            { key: "F_W3", label: "Tahmin", sub: "İlk 3 Hafta", rangeText: "" },

            // Geçmiş
            { key: "AVG_3M", label: "Son 3 Ay", sub: "Ortalama", rangeText: "" },
            { key: "PM_W1", label: "Önceki Ay", sub: "İlk 1 Hafta", rangeText: fmtRangeTR(pm.w1.start, pm.w1.end) },
            { key: "PM_W2", label: "Önceki Ay", sub: "İlk 2 Hafta", rangeText: fmtRangeTR(pm.w2.start, pm.w2.end) },
            { key: "PM_W3", label: "Önceki Ay", sub: "İlk 3 Hafta", rangeText: fmtRangeTR(pm.w3.start, pm.w3.end) },
            { key: "PM_FULL", label: "Önceki Ay", sub: "Toplam", rangeText: fmtRangeTR(pm.prevStart, pm.prevEnd) },
        ];

        const engineData = result._engineData;

        const calcTed = (allowedSet, start, end) => {
            const kpi = calcKpi({
                data: engineData,
                start,
                end,
                dateField: engineDateField,
                allowedProjects: allowedSet,
            });
            return Number(kpi?.ted ?? 0);
        };

        const rows = result.projects.map((proj) => {
            const allowed = new Set([normalizeTR(proj).replace(/\s+/g, " ")]);

            const pmW1 = calcTed(allowed, pm.w1.start, pm.w1.end);
            const pmW2 = calcTed(allowed, pm.w2.start, pm.w2.end);
            const pmW3 = calcTed(allowed, pm.w3.start, pm.w3.end);
            const pmFull = calcTed(allowed, pm.prevStart, pm.prevEnd);

            const series6 = monthsBack.map((mr) => calcTed(allowed, mr.start, mr.end)); // oldest->newest
            const last3 = series6.slice(-3);

            // ✅ baz (raw) yuvarlanmaz; ekranda gösterilecek değer ayrı
            const avg3mRaw = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;
            const avg3m = Math.round(avg3mRaw);

            const nextTotal = forecastNextMonthTotal(series6);
            const splits = forecastWeekSplitsFromPrevMonth(pmW1, pmW2, pmW3, pmFull, nextTotal);

            return {
                project: proj,
                note: `Son 3 ay ort: ${fmtInt(avg3m)} • Tahmin: ${fmtInt(nextTotal)}`,
                values: {
                    PM_W1: pmW1,
                    PM_W2: pmW2,
                    PM_W3: pmW3,
                    PM_FULL: pmFull,
                    AVG_3M: avg3m,

                    F_NEXT: nextTotal,
                    F_W1: splits.fW1,
                    F_W2: splits.fW2,
                    F_W3: splits.fW3,
                },
                // ✅ Daha doğru oranlar:
                // - F_NEXT: son 3 ay ort (raw)
                // - F_W*: önceki ay aynı pencere
                // - küçük bazlarda rozet göstermez (minBase)
                trendMeta: {
                    F_NEXT: pctChange(nextTotal, avg3mRaw, { minBase: 5 }),
                    F_W1: pctChange(splits.fW1, pmW1, { minBase: 5 }),
                    F_W2: pctChange(splits.fW2, pmW2, { minBase: 5 }),
                    F_W3: pctChange(splits.fW3, pmW3, { minBase: 5 }),
                },
            };
        });

        const totals = {};
        columns.forEach((c) => {
            totals[c.key] = rows.reduce((sum, r) => sum + Number(r.values?.[c.key] ?? 0), 0);
        });

        return { columns, rows, totals, forecastMonthLabel };
    }, [result]);

    const selectionBadge = useMemo(() => {
        const r = region || "Tüm projeler";
        const projCount = projects?.length || 0;
        return `${r} • ${projCount} proje`;
    }, [projects, region]);

    const weekPills = useMemo(() => {
        if (!result?.week?.kpi) return null;
        const plan = Number(result.week.kpi.plan ?? 0);
        const ted = Number(result.week.kpi.ted ?? 0);
        const perf = Number(result.week.kpi.perf ?? 0);
        const cov = safePct(ted, plan);
        return { plan, ted, perf, cov, rangeText: result.week.rangeText };
    }, [result]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: { xs: "100vw", md: "96vw" },
                    height: { xs: "100dvh", md: "92dvh" },
                    borderRadius: { xs: 0, md: "28px" },
                    overflow: "hidden",
                    border: "1px solid rgba(226,232,240,0.9)",
                    boxShadow: "0 30px 90px rgba(15,23,42,0.20)",
                    bgcolor: "transparent",
                },
            }}
        >
            {/* Premium background */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    background:
                        "radial-gradient(1200px 700px at 15% 10%, rgba(59,130,246,0.18), transparent 55%)," +
                        "radial-gradient(900px 600px at 85% 20%, rgba(16,185,129,0.14), transparent 55%)," +
                        "radial-gradient(1000px 800px at 60% 95%, rgba(244,63,94,0.10), transparent 60%)," +
                        "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.92))",
                    filter: "saturate(1.05)",
                }}
            />

            {/* Header */}
            <DialogTitle
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 6,
                    py: 1.6,
                    px: 2.0,
                    bgcolor: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(18px)",
                    borderBottom: "1px solid rgba(226,232,240,0.9)",
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Stack spacing={0.45}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 1200, color: "#0f172a", letterSpacing: "-0.55px" }}>
                                Tedarik Öngörü Paneli
                            </Typography>
                            <Chip
                                size="small"
                                label={selectionBadge}
                                sx={{
                                    height: 26,
                                    borderRadius: 999,
                                    fontWeight: 1100,
                                    bgcolor: alpha("#0f172a", 0.06),
                                    border: `1px solid ${alpha("#0f172a", 0.12)}`,
                                    color: "#0f172a",
                                    backdropFilter: "blur(10px)",
                                }}
                            />
                            {result?.fetchedCount != null ? (
                                <Chip
                                    size="small"
                                    label={`Kayıt: ${fmtInt(result.fetchedCount)}`}
                                    sx={{
                                        height: 26,
                                        borderRadius: 999,
                                        fontWeight: 1000,
                                        bgcolor: alpha("#10b981", 0.10),
                                        border: `1px solid ${alpha("#10b981", 0.16)}`,
                                        color: "#065f46",
                                    }}
                                />
                            ) : null}
                        </Stack>

                        <Typography sx={{ fontWeight: 850, color: "#64748b", fontSize: "0.85rem" }}>
                            İlk görünüm: Tahmin • Detay: Geçmiş solda, Tahmin sağda • Arama/Sıralama/Kompakt + Sticky toplam
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Gelişmiş">
                            <Button
                                variant="outlined"
                                onClick={() => setShowAdvanced((v) => !v)}
                                startIcon={<TuneRoundedIcon />}
                                sx={{
                                    borderRadius: 3,
                                    fontWeight: 1000,
                                    bgcolor: "rgba(255,255,255,0.55)",
                                    backdropFilter: "blur(12px)",
                                }}
                            >
                                Ayarlar
                            </Button>
                        </Tooltip>

                        <Tooltip title="Sıfırla">
                            <Button
                                variant="outlined"
                                onClick={resetFilters}
                                startIcon={<RestartAltRoundedIcon />}
                                sx={{
                                    borderRadius: 3,
                                    fontWeight: 1000,
                                    bgcolor: "rgba(255,255,255,0.55)",
                                    backdropFilter: "blur(12px)",
                                }}
                            >
                                Sıfırla
                            </Button>
                        </Tooltip>

                        <Button
                            variant="contained"
                            onClick={handleApply}
                            disabled={!canApply || loading}
                            startIcon={<BoltRoundedIcon />}
                            sx={{
                                borderRadius: 3,
                                fontWeight: 1200,
                                bgcolor: "#0f172a",
                                "&:hover": { bgcolor: "#111827" },
                            }}
                        >
                            Getir
                        </Button>

                        <IconButton onClick={onClose} sx={{ bgcolor: alpha("#0f172a", 0.04), border: `1px solid ${alpha("#0f172a", 0.10)}` }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Stack>

                {loading && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <CircularProgress size={16} />
                        <Typography sx={{ fontWeight: 850, color: "#64748b", fontSize: "0.85rem" }}>
                            Supabase’den çekiliyor ve analiz ediliyor…
                        </Typography>
                    </Stack>
                )}

                {errorText && (
                    <Typography sx={{ mt: 1, fontSize: "0.85rem", color: "#ef4444", fontWeight: 1000 }}>
                        {errorText}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent sx={{ position: "relative", zIndex: 1, p: 2.0, height: "100%", overflow: "auto" }}>
                <Stack spacing={1.6}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "440px 1fr" },
                            gap: 1.8,
                            alignItems: "start",
                        }}
                    >
                        {/* Left: Filters */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: 3,
                                border: "1px solid rgba(226,232,240,1)",
                                bgcolor: "#fff",
                                boxShadow: "none",
                            }}
                        >
                            <Stack spacing={1.1}>
                                <Box>
                                    <Typography sx={{ fontWeight: 1100, color: "#0f172a" }}>Filtreler</Typography>
                                    <Typography sx={{ fontWeight: 700, color: "#64748b", fontSize: "0.8rem" }}>
                                        Bölge • Proje
                                    </Typography>
                                </Box>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Bölge</InputLabel>
                                    <Select
                                        label="Bölge"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        sx={{ borderRadius: 2, bgcolor: "#fff" }}
                                    >
                                        <MenuItem value="">
                                            <em>Tümü (Bölge seçilmedi)</em>
                                        </MenuItem>
                                        {Object.keys(REGIONS).map((r) => (
                                            <MenuItem key={r} value={r}>
                                                {r}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Divider sx={{ my: 0.3 }} />

                                <Autocomplete
                                    multiple
                                    options={availableProjects}
                                    value={projects}
                                    onChange={(_, newValue) => setProjects(newValue)}
                                    disableCloseOnSelect
                                    renderInput={(params) => (
                                        <TextField {...params} size="small" label="Projeler" placeholder="Yazıp ara…" />
                                    )}
                                    renderTags={(value, getTagProps) =>
                                        value.slice(0, 3).map((option, index) => (
                                            <Chip
                                                {...getTagProps({ index })}
                                                key={option}
                                                label={option}
                                                size="small"
                                                sx={{ borderRadius: 2, fontWeight: 800 }}
                                            />
                                        ))
                                    }
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" },
                                    }}
                                />

                                <Stack direction="row" spacing={1} sx={{ mt: 0.2 }}>
                                    <Button
                                        size="small"
                                        variant={allSelected ? "contained" : "outlined"}
                                        onClick={() => setProjects(availableProjects)}
                                        disabled={!availableProjects?.length}
                                        sx={{
                                            borderRadius: 2,
                                            fontWeight: 900,
                                            ...(allSelected ? { bgcolor: "#0f172a", "&:hover": { bgcolor: "#111827" } } : {}),
                                        }}
                                    >
                                        Tümünü seç
                                    </Button>

                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setProjects([])}
                                        sx={{ borderRadius: 2, fontWeight: 900, color: "#0f172a" }}
                                    >
                                        Temizle
                                    </Button>
                                </Stack>

                                {!canApply && (
                                    <Typography sx={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 1000 }}>
                                        Getir için en az 1 proje seçmelisin.
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>

                        {/* Right: Results */}
                        <Stack spacing={1.4}>
                            {!result && !loading && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.4,
                                        borderRadius: 6,
                                        border: `1px solid ${alpha("#0f172a", 0.10)}`,
                                        bgcolor: "rgba(255,255,255,0.70)",
                                        backdropFilter: "blur(18px)",
                                        boxShadow: "0 20px 70px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <SectionTitle
                                        icon={<PublicRoundedIcon fontSize="small" />}
                                        title="Başlamak için"
                                        sub='Proje(leri) seç ve “Getir” ile öngörü tablosunu oluştur.'
                                    />
                                    <Box
                                        sx={{
                                            mt: 1.4,
                                            p: 1.6,
                                            borderRadius: 5,
                                            bgcolor: alpha("#0f172a", 0.03),
                                            border: `1px solid ${alpha("#0f172a", 0.08)}`,
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Neler göreceksin?</Typography>
                                        <Typography sx={{ fontWeight: 850, color: "#64748b", mt: 0.55, lineHeight: 1.55 }}>
                                            • İlk ekranda <b>Tahmin</b> kolonları
                                            <br />
                                            • <b>Detay</b> ile <b>Geçmiş</b> kolonları (solda)
                                            <br />
                                            • Tahminlerde ▲/▼ trend yüzdeleri
                                            <br />
                                            • Yeni: Arama • Sıralama • Kompakt/Rahat • Sticky toplam
                                        </Typography>
                                    </Box>
                                </Paper>
                            )}

                            {result && weekPills && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.8,
                                        borderRadius: 6,
                                        border: `1px solid ${alpha("#0f172a", 0.10)}`,
                                        bgcolor: "rgba(255,255,255,0.70)",
                                        backdropFilter: "blur(18px)",
                                        boxShadow: "0 20px 70px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        spacing={1.2}
                                        alignItems={{ xs: "flex-start", md: "center" }}
                                        justifyContent="space-between"
                                    >
                                        <SectionTitle icon={<CalendarMonthRoundedIcon fontSize="small" />} title="Bu hafta özet" sub={weekPills.rangeText} />
                                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                                            <MetricPill label="Tedarik" value={fmtInt(weekPills.ted)} tone="good" />
                                            <MetricPill label="Talep" value={fmtInt(weekPills.plan)} />
                                            <MetricPill
                                                label="Ted/Talep"
                                                value={weekPills.cov == null ? "-" : fmtPct(weekPills.cov)}
                                                tone={(weekPills.cov ?? 0) >= 90 ? "good" : "warn"}
                                            />
                                            <MetricPill
                                                label="Perf"
                                                value={fmtPct(weekPills.perf)}
                                                tone={(weekPills.perf ?? 0) >= 90 ? "good" : "warn"}
                                            />
                                        </Stack>
                                    </Stack>
                                </Paper>
                            )}

                            {result && tedMatrix && (
                                <TedMatrixTableModern
                                    title={`Tedarik Öngörü Tablosu • ${region || "Tümü"}`}
                                    subtitle={`Mevcut ay tahmini • Detay: Geçmiş solda, Tahmin sağda • Modern v2`}
                                    columns={tedMatrix.columns}
                                    rows={tedMatrix.rows}
                                    totals={tedMatrix.totals}
                                />
                            )}
                        </Stack>
                    </Box>

                    <Box sx={{ height: 14 }} />
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
