// src/sayfalar/karsilastirma.js
import React, { useMemo, useState, useEffect } from "react";
import {
    Box,
    AppBar,
    Toolbar,
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
    Paper,
    Tooltip,
    TextField,
    Autocomplete,
    ToggleButton,
    ToggleButtonGroup,
    InputAdornment,
    useTheme,
    Drawer,
    useMediaQuery,
    alpha,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import CompressRoundedIcon from "@mui/icons-material/CompressRounded";
import ExpandRoundedIcon from "@mui/icons-material/ExpandRounded";
import MenuIcon from "@mui/icons-material/Menu";

// ✅ Excel export
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
function SectionTitle({ icon, title, sub }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const bd = alpha(theme.palette.divider, isDark ? 0.55 : 1);

    return (
        <Stack direction="row" spacing={1.2} alignItems="center">
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.06),
                    border: `1px solid ${bd}`,
                    backdropFilter: "blur(10px)",
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography sx={{ fontWeight: 1200, letterSpacing: "-0.35px", lineHeight: 1.1 }}>{title}</Typography>
                {sub ? (
                    <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, fontSize: "0.82rem", mt: 0.2 }}>
                        {sub}
                    </Typography>
                ) : null}
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
function addMonths(d, m) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + m);
    return x;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
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

/**
 * ✅ Ay haftalarını 7'şer gün olarak böler:
 * W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29-... (ay sonu)
 */
function monthWeeks7(d) {
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    const weeks = [];
    let cursor = new Date(ms);

    let idx = 1;
    while (cursor.getTime() <= me.getTime()) {
        const wStart = new Date(cursor);
        // ✅ Hafta başlangıcı 07:00
        wStart.setHours(7, 0, 0, 0);

        const wEnd = addDays(wStart, 6);

        // ✅ Ay sonunu geçiyorsa ay sonuna kırp
        const cappedEnd = new Date(Math.min(wEnd.getTime(), me.getTime()));

        // ✅ Hafta bitişi 23:55
        cappedEnd.setHours(23, 55, 0, 0);

        weeks.push({
            key: `W${idx}`,
            idx,
            start: wStart,
            end: cappedEnd,
            rangeText: fmtRangeTR(wStart, cappedEnd),
        });

        idx += 1;

        // ✅ bir sonraki hafta 7 gün sonra (yine 07:00’ı yukarıda setliyoruz)
        cursor = addDays(new Date(cursor), 7);
        cursor.setHours(0, 0, 0, 0); // sadece tarih kaydırma için
    }

    // ✅ Ay başlangıcı da 07:00 olsun (toplam hesaplar için)
    const monthStart = new Date(ms);
    monthStart.setHours(7, 0, 0, 0);

    // ✅ Ay sonu olduğu gibi kalsın (sadece hafta bitişlerini 23:55 yaptık)
    return { monthStart, monthEnd: me, weeks };
}

/* ------------------------ Forecast helpers ------------------------ */
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

/**
 * ✅ Önceki ayın haftalık dağılım oranlarını alıp,
 * gelecek ay tahmin toplamını aynı oranlarla haftalara böler.
 * prevWeeksTotals: [W1, W2, ...] toplamları
 */
function forecastWeekSplitsFromPrevMonth(prevWeeksTotals, prevFull, nextMonthTotal) {
    const full = Number(prevFull ?? 0);
    if (!full) return [];

    const ratios = (prevWeeksTotals || []).map((v) => clamp01(Number(v ?? 0) / full));
    return ratios.map((r) => Math.round(nextMonthTotal * r));
}

/* ------------------------ Aesthetic tokens ------------------------ */
function useShellStyles() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const border = `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`;

    const pageBg = isDark
        ? `radial-gradient(1100px 700px at 10% 0%, ${alpha("#3b82f6", 0.18)}, transparent 55%),
       radial-gradient(900px 600px at 90% 10%, ${alpha("#10b981", 0.12)}, transparent 55%),
       radial-gradient(1000px 800px at 60% 95%, ${alpha("#f43f5e", 0.10)}, transparent 60%),
       linear-gradient(180deg, ${alpha("#0b1220", 0.98)}, ${alpha("#070c16", 0.98)})`
        : `radial-gradient(1100px 700px at 10% 0%, ${alpha("#3b82f6", 0.16)}, transparent 55%),
       radial-gradient(900px 600px at 90% 10%, ${alpha("#10b981", 0.10)}, transparent 55%),
       radial-gradient(1000px 800px at 60% 95%, ${alpha("#f43f5e", 0.08)}, transparent 60%),
       linear-gradient(180deg, ${alpha("#ffffff", 0.96)}, ${alpha("#f8fafc", 0.96)})`;

    const glass = (strength = 0.72) => ({
        bgcolor: isDark ? alpha("#0b1220", strength) : alpha("#ffffff", strength),
        border,
        backdropFilter: "blur(16px)",
        boxShadow: isDark ? "0 22px 70px rgba(0,0,0,0.55)" : "0 18px 60px rgba(15,23,42,0.10)",
    });

    const softInput = {
        "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            bgcolor: isDark ? alpha("#0b1220", 0.55) : alpha("#ffffff", 0.75),
            backdropFilter: "blur(10px)",
        },
    };

    const primaryBtn = {
        borderRadius: 3,
        fontWeight: 1100,
        textTransform: "none",
        px: 1.6,
        ...(isDark
            ? { bgcolor: "#e2e8f0", color: "#0b1220", "&:hover": { bgcolor: "#f1f5f9" } }
            : { bgcolor: "#0f172a", color: "#fff", "&:hover": { bgcolor: "#111827" } }),
    };

    const outlineBtn = {
        borderRadius: 3,
        fontWeight: 1000,
        textTransform: "none",
        bgcolor: isDark ? alpha("#0b1220", 0.55) : alpha("#ffffff", 0.55),
        borderColor: alpha(theme.palette.divider, isDark ? 0.6 : 1),
        backdropFilter: "blur(12px)",
    };

    return { isDark, border, pageBg, glass, softInput, primaryBtn, outlineBtn };
}

/* ------------------------ Small UI bits ------------------------ */
function KpiCard({ title, value, sub, tone = "neutral" }) {
    const theme = useTheme();
    const { isDark, glass } = useShellStyles();

    const toneCfg =
        tone === "good"
            ? { bg: alpha("#10b981", isDark ? 0.16 : 0.10), fg: isDark ? "#86efac" : "#065f46", bd: alpha("#10b981", isDark ? 0.26 : 0.18) }
            : tone === "warn"
                ? { bg: alpha("#f59e0b", isDark ? 0.16 : 0.10), fg: isDark ? "#fcd34d" : "#92400e", bd: alpha("#f59e0b", isDark ? 0.26 : 0.18) }
                : { bg: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.04), fg: theme.palette.text.primary, bd: alpha(theme.palette.divider, isDark ? 0.55 : 1) };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.7,
                borderRadius: 5,
                ...glass(0.62),
                border: `1px solid ${toneCfg.bd}`,
                bgcolor: toneCfg.bg,
            }}
        >
            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary, fontSize: "0.80rem" }}>{title}</Typography>
            <Typography sx={{ fontWeight: 1200, color: toneCfg.fg, fontSize: "1.55rem", mt: 0.25, letterSpacing: "-0.3px" }}>
                {value}
            </Typography>
            {sub ? (
                <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, fontSize: "0.78rem", mt: 0.45 }}>{sub}</Typography>
            ) : null}
        </Paper>
    );
}

function TrendChip({ pct }) {
    const { isDark } = useShellStyles();
    if (pct == null || !Number.isFinite(pct) || pct === 0) return null;

    const up = pct > 0;
    const bg = up ? alpha("#10b981", isDark ? 0.22 : 0.14) : alpha("#ef4444", isDark ? 0.22 : 0.14);
    const bd = up ? alpha("#10b981", isDark ? 0.3 : 0.22) : alpha("#ef4444", isDark ? 0.3 : 0.22);
    const fg = up ? (isDark ? "#86efac" : "#065f46") : (isDark ? "#fca5a5" : "#991b1b");

    return (
        <Chip
            size="small"
            label={`${up ? "▲" : "▼"} %${Math.abs(pct).toFixed(1)}`}
            sx={{ height: 22, borderRadius: 999, fontWeight: 1100, bgcolor: bg, border: `1px solid ${bd}`, color: fg, ml: 1 }}
        />
    );
}

/* ------------------------ Table (Premium but clean) ------------------------ */
function TedMatrixTablePretty({ title, subtitle, columns, rows, totals }) {
    const theme = useTheme();
    const { isDark, border, glass, softInput } = useShellStyles();

    const [showHistory, setShowHistory] = useState(false);
    const [density, setDensity] = useState("comfortable"); // compact | comfortable
    const [sortMode, setSortMode] = useState("none"); // none | forecast_desc | trend_desc
    const [query, setQuery] = useState("");

    const dims = useMemo(() => {
        if (density === "compact") return { colW: 160, leftW: 420, headH: 56, rowH: 46 };
        return { colW: 190, leftW: 460, headH: 60, rowH: 52 };
    }, [density]);

    const colW = dims.colW;
    const leftW = dims.leftW;

    const forecastCols = useMemo(() => columns.filter((c) => String(c.key).startsWith("F_")), [columns]);
    const historyCols = useMemo(() => columns.filter((c) => !String(c.key).startsWith("F_")), [columns]);
    const visibleCols = useMemo(() => (showHistory ? [...historyCols, ...forecastCols] : forecastCols), [showHistory, historyCols, forecastCols]);

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

    // ✅ Excel Export: ekranda görünen (visibleCols + sortedRows) tabloyu indirir
    const exportToExcel = () => {
        const cols = visibleCols;
        const dataRows = sortedRows;

        const aoa = [["Proje", ...cols.map((c) => `${c.label}${c.sub ? " • " + c.sub : ""}`)]];

        dataRows.forEach((r) => {
            aoa.push([r.project, ...cols.map((c) => (r.values?.[c.key] == null ? "" : Number(r.values?.[c.key])))]);
        });

        aoa.push(["BÖLGE TOPLAM", ...cols.map((c) => Number(totals?.[c.key] ?? 0))]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 42 }, ...cols.map(() => ({ wch: 16 }))];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ongoru");

        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });

        const safeTitle = (title || "tablo").toString().replace(/[\\/:*?"<>|]/g, "-").slice(0, 120);
        const fileName = `${safeTitle}.xlsx`;
        saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
    };

    const shellBg = isDark ? alpha("#0b1220", 0.72) : alpha("#ffffff", 0.78);
    const stickyBg = isDark ? alpha("#0b1220", 0.78) : alpha("#f8fafc", 0.86);
    const rowOddBg = isDark ? alpha("#ffffff", 0.03) : alpha("#0f172a", 0.025);
    const rowHoverBg = isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.055);

    // ✅ Tahmin kolonlarına karşılık gerçek değerler (tablo içinde küçük satır olarak göstermek için)
    const realKeyForForecast = (k) => {
        if (k === "F_NEXT") return "REAL_CM";
        if (String(k).startsWith("F_W")) return `REAL_${String(k).slice(2)}`; // F_W1 -> REAL_W1
        return null;
    };

    return (
        <Paper elevation={0} sx={{ p: 1.6, borderRadius: 6, ...glass(0.62) }}>
            {/* Header */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} alignItems={{ lg: "center" }} justifyContent="space-between" sx={{ mb: 1.2 }}>
                <SectionTitle icon={<TableRowsRoundedIcon fontSize="small" />} title={title} sub={subtitle} />

                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <TextField
                        size="small"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Projede ara…"
                        sx={{ width: { xs: "100%", md: 260 }, ...softInput }}
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
                        sx={{ "& .MuiToggleButton-root": { borderRadius: 3, fontWeight: 1100, textTransform: "none" } }}
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
                        sx={{ "& .MuiToggleButton-root": { borderRadius: 3, fontWeight: 1100, textTransform: "none" } }}
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
                            textTransform: "none",
                            ...(showHistory
                                ? isDark
                                    ? { bgcolor: "#e2e8f0", color: "#0b1220", "&:hover": { bgcolor: "#f1f5f9" } }
                                    : { bgcolor: "#0f172a", color: "#fff", "&:hover": { bgcolor: "#111827" } }
                                : {}),
                        }}
                    >
                        {showHistory ? "Detayı Gizle" : "Detay (Geçmiş)"}
                    </Button>

                    {/* ✅ Excel’e Aktar */}
                    <Button variant="outlined" onClick={exportToExcel} sx={{ borderRadius: 3, fontWeight: 1100, textTransform: "none" }}>
                        Excel’e Aktar
                    </Button>
                </Stack>
            </Stack>

            {/* Table shell */}
            <Box sx={{ borderRadius: 5, border, bgcolor: shellBg, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                    <Box sx={{ minWidth: leftW + visibleCols.length * colW }}>
                        {/* Header */}
                        <Box
                            sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 5,
                                display: "grid",
                                gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                bgcolor: stickyBg,
                                backdropFilter: "blur(14px)",
                                borderBottom: border,
                                boxShadow: isDark ? "0 10px 26px rgba(0,0,0,0.35)" : "0 10px 22px rgba(15,23,42,0.08)",
                                height: dims.headH,
                            }}
                        >
                            <Box sx={{ px: 2, display: "flex", flexDirection: "column", justifyContent: "center", position: "sticky", left: 0, zIndex: 6, bgcolor: stickyBg, borderRight: border }}>
                                <Typography sx={{ fontWeight: 1200, fontSize: "0.86rem" }}>Proje</Typography>
                                <Typography sx={{ fontWeight: 850, fontSize: "0.74rem", color: theme.palette.text.secondary, mt: 0.15 }}>
                                    Ort • Önceki Ay • Tahmin
                                </Typography>
                            </Box>

                            {visibleCols.map((c) => (
                                <Box key={c.key} sx={{ px: 1.2, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
                                    <Typography sx={{ fontWeight: 1200, fontSize: "0.84rem" }}>{c.label}</Typography>
                                    <Typography sx={{ fontWeight: 850, fontSize: "0.72rem", color: theme.palette.text.secondary, mt: 0.15 }}>
                                        {c.sub || c.rangeText || ""}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Body */}
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
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, isDark ? 0.45 : 0.7)}`,
                                        bgcolor: idx % 2 === 0 ? rowOddBg : "transparent",
                                        "&:hover": { bgcolor: rowHoverBg },
                                        transition: "background 160ms ease",
                                    }}
                                >
                                    {/* Left sticky */}
                                    <Box
                                        sx={{
                                            px: 2,
                                            height: dims.rowH,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 4,
                                            bgcolor: idx % 2 === 0 ? alpha(stickyBg, 0.55) : alpha(stickyBg, 0.72),
                                            borderRight: border,
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 1200, fontSize: density === "compact" ? "0.9rem" : "0.94rem", letterSpacing: "-0.15px" }}>
                                            {r.project}
                                        </Typography>
                                        <Typography sx={{ fontWeight: 850, fontSize: "0.76rem", color: theme.palette.text.secondary, mt: 0.15, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.6 }}>
                                            <span>Ort: {fmtInt(avg3)}</span>
                                            <span>• Ö.Ay: {fmtInt(pmFull)}</span>
                                            <span>• Tah: {fmtInt(fNext)}</span>
                                            <TrendChip pct={fTrend} />
                                        </Typography>
                                    </Box>

                                    {visibleCols.map((c) => {
                                        const v = r.values?.[c.key];
                                        const isForecast = String(c.key).startsWith("F_");
                                        const trendPct = isForecast ? r.trendMeta?.[c.key] : null;

                                        const realKey = isForecast ? realKeyForForecast(c.key) : null;
                                        const realVal = realKey ? r.values?.[realKey] : null;

                                        return (
                                            <Box key={c.key} sx={{ height: dims.rowH, display: "grid", placeItems: "center", px: 1 }}>
                                                <Tooltip
                                                    title={
                                                        isForecast && trendPct != null
                                                            ? `Trend: %${Math.abs(trendPct).toFixed(1)} ${trendPct > 0 ? "artış" : "azalış"}`
                                                            : ""
                                                    }
                                                    disableHoverListener={!isForecast || trendPct == null}
                                                >
                                                    <Box sx={{ textAlign: "center", lineHeight: 1.15 }}>
                                                        <Typography
                                                            sx={{
                                                                fontWeight: isForecast ? 1250 : 1050,
                                                                fontSize: density === "compact" ? "0.94rem" : "1.0rem",
                                                                letterSpacing: "-0.15px",
                                                            }}
                                                        >
                                                            {v == null ? "-" : fmtInt(v)}
                                                        </Typography>

                                                        {isForecast && realVal != null && (
                                                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 900, opacity: 0.75, mt: 0.2 }}>
                                                                Ger: {fmtInt(realVal)}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            );
                        })}

                        {/* Totals sticky */}
                        <Box
                            sx={{
                                position: "sticky",
                                bottom: 0,
                                zIndex: 6,
                                display: "grid",
                                gridTemplateColumns: `${leftW}px repeat(${visibleCols.length}, ${colW}px)`,
                                bgcolor: stickyBg,
                                backdropFilter: "blur(16px)",
                                borderTop: border,
                                boxShadow: isDark ? "0 -14px 36px rgba(0,0,0,0.45)" : "0 -10px 26px rgba(15,23,42,0.10)",
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.15, position: "sticky", left: 0, zIndex: 7, bgcolor: stickyBg, borderRight: border }}>
                                <Typography sx={{ fontWeight: 1250 }}>BÖLGE TOPLAM</Typography>
                                <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, fontSize: "0.78rem", mt: 0.15 }}>
                                    Filtrelenmiş tablo toplamı
                                </Typography>
                            </Box>
                            {visibleCols.map((c) => (
                                <Box key={c.key} sx={{ px: 1, py: 1.15, display: "grid", placeItems: "center" }}>
                                    <Typography sx={{ fontWeight: 1250, letterSpacing: "-0.15px" }}>{fmtInt(totals?.[c.key] ?? 0)}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {!sortedRows.length ? (
                            <Box sx={{ p: 2.2 }}>
                                <Typography sx={{ fontWeight: 1100 }}>Sonuç yok</Typography>
                                <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, mt: 0.4 }}>
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
    const theme = useTheme();
    const { isDark, pageBg, glass, softInput, primaryBtn, outlineBtn, border } = useShellStyles();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

    const [region, setRegion] = useState("");
    const [projects, setProjects] = useState([]);

    const dbDateField = "effective_ts";
    const engineDateField = "OrderCreatedDate";
    const toNow = true;

    const [result, setResult] = useState(null);
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const availableProjects = useMemo(() => (region ? REGIONS[region] || [] : allProjects), [region]);

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
        const minStart = startOfMonth(addMonths(now, -6));
        const maxEnd = toNow ? now : endOfMonth(now);

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

            // Haftalık KPI (mevcut: Pazartesi bazlı değil; istersen ayrıca değiştiririz)
            // Şimdilik "son 7 gün" gibi değil; senin eski mantığın gibi bırakıyorum: haftalık özet istersen ayrıca 1-7,8-14'e bağlarız.
            const cmInfo = monthWeeks7(now);
            const currentWeek = cmInfo.weeks.find(w => now >= w.start && now <= w.end) || cmInfo.weeks[0];

            const weekStart = currentWeek.start;
            const weekEnd = toNow ? now : currentWeek.end;

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

        // ✅ 7'şer gün haftalar: 1-7, 8-14, ...
        const pmInfo = monthWeeks7(addMonths(now, -1));
        const cmInfo = monthWeeks7(now);

        const forecastMonthStart = startOfMonth(now);
        const forecastMonthLabel = monthLabelTR(forecastMonthStart);

        const monthsBack = [6, 5, 4, 3, 2, 1].map((n) => {
            const ms = startOfMonth(addMonths(now, -n));
            return { start: ms, end: endOfMonth(ms) };
        });

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

        const clampToNow = (d) => (toNow ? new Date(Math.min(d.getTime(), now.getTime())) : d);

        // ✅ Dinamik hafta kolonları (W1..W4/W5)
        const weekKeys = cmInfo.weeks.map((w) => w.key); // W1..Wn

        const columns = [
            { key: "F_NEXT", label: "Tahmin", sub: forecastMonthLabel, rangeText: "" },
            ...weekKeys.map((wk, i) => ({ key: `F_${wk}`, label: "Tahmin", sub: `${i + 1}. Hafta`, rangeText: cmInfo.weeks[i]?.rangeText || "" })),

            { key: "AVG_3M", label: "Son 3 Ay", sub: "Ortalama", rangeText: "" },

            ...weekKeys.map((wk, i) => ({ key: `PM_${wk}`, label: "Önceki Ay", sub: `${i + 1}. Hafta`, rangeText: pmInfo.weeks[i]?.rangeText || "" })),
            { key: "PM_FULL", label: "Önceki Ay", sub: "Toplam", rangeText: fmtRangeTR(pmInfo.monthStart, pmInfo.monthEnd) },
        ];

        const rows = result.projects.map((proj) => {
            const allowed = new Set([normalizeTR(proj).replace(/\s+/g, " ")]);

            // ✅ Önceki ay haftaları (1-7,8-14,...)
            const pmWeekTotals = weekKeys.map((wk, idx) => {
                const w = pmInfo.weeks[idx];
                if (!w) return 0;
                return calcTed(allowed, w.start, w.end);
            });
            const pmFull = calcTed(allowed, pmInfo.monthStart, pmInfo.monthEnd);

            // ✅ Bu ay gerçek (1-7,8-14,... ay sonu)
            const realThisMonth = calcTed(allowed, cmInfo.monthStart, toNow ? now : cmInfo.monthEnd);
            const realWeekTotals = weekKeys.map((wk, idx) => {
                const w = cmInfo.weeks[idx];
                if (!w) return 0;
                const end = clampToNow(w.end);
                return calcTed(allowed, w.start, end);
            });

            // ✅ 6 aylık seri
            const series6 = monthsBack.map((mr) => calcTed(allowed, mr.start, mr.end)); // oldest->newest
            const last3 = series6.slice(-3);

            const avg3mRaw = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;
            const avg3m = Math.round(avg3mRaw);

            // ✅ Tahmin
            const nextTotal = forecastNextMonthTotal(series6);
            const splits = forecastWeekSplitsFromPrevMonth(pmWeekTotals, pmFull, nextTotal); // [W1..Wn]

            const values = {
                REAL_CM: realThisMonth,
                AVG_3M: avg3m,
                PM_FULL: pmFull,
                F_NEXT: nextTotal,
            };

            // W1..Wn setleri
            weekKeys.forEach((wk, idx) => {
                values[`REAL_${wk}`] = realWeekTotals[idx] ?? 0;
                values[`PM_${wk}`] = pmWeekTotals[idx] ?? 0;
                values[`F_${wk}`] = splits[idx] ?? null;
            });

            const trendMeta = {
                F_NEXT: pctChange(nextTotal, avg3mRaw, { minBase: 5 }),
            };
            weekKeys.forEach((wk, idx) => {
                trendMeta[`F_${wk}`] = pctChange(splits[idx], pmWeekTotals[idx], { minBase: 5 });
            });

            return { project: proj, values, trendMeta };
        });

        const totals = {};
        columns.forEach((c) => {
            totals[c.key] = rows.reduce((sum, r) => sum + Number(r.values?.[c.key] ?? 0), 0);
        });

        return { columns, rows, totals, forecastMonthLabel };
    }, [result, engineDateField, toNow]);

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

    const FiltersPanel = (
        <Box sx={{ p: 2 }}>
            <Paper elevation={0} sx={{ p: 1.6, borderRadius: 6, ...glass(0.62) }}>
                <Stack spacing={1.2}>
                    <SectionTitle icon={<TuneRoundedIcon fontSize="small" />} title="Filtreler" sub="Bölge • Proje seçimi" />

                    <FormControl fullWidth size="small">
                        <InputLabel>Bölge</InputLabel>
                        <Select
                            label="Bölge"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            sx={{ borderRadius: 3, bgcolor: isDark ? alpha("#0b1220", 0.55) : alpha("#ffffff", 0.75), backdropFilter: "blur(10px)" }}
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

                    <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.55 : 1) }} />

                    <Autocomplete
                        multiple
                        options={availableProjects}
                        value={projects}
                        onChange={(_, newValue) => setProjects(newValue)}
                        disableCloseOnSelect
                        renderInput={(params) => <TextField {...params} size="small" label="Projeler" placeholder="Yazıp ara…" sx={softInput} />}
                        renderTags={(value, getTagProps) =>
                            value.slice(0, 3).map((option, index) => (
                                <Chip
                                    {...getTagProps({ index })}
                                    key={option}
                                    label={option}
                                    size="small"
                                    sx={{
                                        borderRadius: 2,
                                        fontWeight: 900,
                                        bgcolor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.06),
                                        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                                    }}
                                />
                            ))
                        }
                    />

                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant={allSelected ? "contained" : "outlined"}
                            onClick={() => setProjects(availableProjects)}
                            disabled={!availableProjects?.length}
                            sx={{ borderRadius: 3, fontWeight: 1000, textTransform: "none" }}
                        >
                            Tümünü seç
                        </Button>
                        <Button size="small" variant="text" onClick={() => setProjects([])} sx={{ borderRadius: 3, fontWeight: 1000, textTransform: "none" }}>
                            Temizle
                        </Button>
                    </Stack>

                    {!canApply && (
                        <Typography sx={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 1000 }}>
                            Getir için en az 1 proje seçmelisin.
                        </Typography>
                    )}

                    <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.55 : 1) }} />

                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={resetFilters} startIcon={<RestartAltRoundedIcon />} sx={outlineBtn}>
                            Sıfırla
                        </Button>
                        <Button variant="contained" onClick={handleApply} disabled={!canApply || loading} startIcon={<BoltRoundedIcon />} sx={primaryBtn}>
                            Getir
                        </Button>
                    </Stack>

                    {showAdvanced ? (
                        <Box sx={{ mt: 0.6, p: 1.2, borderRadius: 4, border, bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.03) }}>
                            <Typography sx={{ fontWeight: 1000, fontSize: "0.86rem" }}>Gelişmiş (placeholder)</Typography>
                            <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, fontSize: "0.78rem", mt: 0.3 }}>
                                Buraya tarih aralığı / hardCap / toNow gibi seçenekleri ekleyebiliriz.
                            </Typography>
                        </Box>
                    ) : null}
                </Stack>
            </Paper>
        </Box>
    );

    if (!open) return null;

    return (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex" }}>
            {/* Background */}
            <Box sx={{ position: "absolute", inset: 0, background: pageBg, zIndex: 0 }} />

            {/* Top bar */}
            <AppBar
                position="fixed"
                color="transparent"
                elevation={0}
                sx={{
                    zIndex: 10,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.55) : alpha("#ffffff", 0.6),
                    backdropFilter: "blur(18px)",
                }}
            >
                <Toolbar sx={{ gap: 1 }}>
                    {!isMdUp ? (
                        <IconButton
                            onClick={() => setMobileDrawerOpen(true)}
                            sx={{ bgcolor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.05), border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}` }}
                        >
                            <MenuIcon />
                        </IconButton>
                    ) : null}

                    <Stack sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 1250, letterSpacing: "-0.45px", lineHeight: 1.05 }}>
                            Tedarik Öngörü Paneli
                        </Typography>
                        <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, fontSize: "0.78rem", mt: 0.15 }}>
                            1-7 / 8-14 / 15-21 / ... ay sonu • Filtre → Getir → Özet + Tablo
                        </Typography>
                    </Stack>

                    <Chip
                        size="small"
                        label={selectionBadge}
                        sx={{
                            height: 26,
                            borderRadius: 999,
                            fontWeight: 1100,
                            bgcolor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.06),
                            border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
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
                                fontWeight: 1100,
                                bgcolor: alpha("#10b981", isDark ? 0.18 : 0.1),
                                border: `1px solid ${alpha("#10b981", isDark ? 0.26 : 0.16)}`,
                                color: isDark ? "#86efac" : "#065f46",
                            }}
                        />
                    ) : null}

                    <Tooltip title="Gelişmiş">
                        <Button variant="outlined" onClick={() => setShowAdvanced((v) => !v)} startIcon={<TuneRoundedIcon />} sx={outlineBtn}>
                            Ayarlar
                        </Button>
                    </Tooltip>

                    <Button variant="outlined" onClick={resetFilters} startIcon={<RestartAltRoundedIcon />} sx={outlineBtn}>
                        Sıfırla
                    </Button>

                    <Button variant="contained" onClick={handleApply} disabled={!canApply || loading} startIcon={<BoltRoundedIcon />} sx={primaryBtn}>
                        Getir
                    </Button>

                    <IconButton
                        onClick={onClose}
                        sx={{
                            bgcolor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.05),
                            border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Toolbar>

                {(loading || errorText) && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        {loading ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={16} />
                                <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, fontSize: "0.85rem" }}>
                                    Supabase’den çekiliyor ve analiz ediliyor…
                                </Typography>
                            </Stack>
                        ) : null}

                        {errorText ? (
                            <Typography sx={{ mt: 0.6, fontSize: "0.85rem", color: "#ef4444", fontWeight: 1000 }}>
                                {errorText}
                            </Typography>
                        ) : null}
                    </Box>
                )}
            </AppBar>

            {/* Left sidebar (desktop) */}
            {isMdUp ? (
                <Box sx={{ width: 420, flex: "0 0 420px", pt: "86px", position: "relative", zIndex: 2, overflow: "auto" }}>
                    {FiltersPanel}
                </Box>
            ) : (
                <Drawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
                    <Box sx={{ width: 420, maxWidth: "92vw" }}>
                        <Box sx={{ p: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}` }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontWeight: 1200 }}>Filtreler</Typography>
                                <IconButton onClick={() => setMobileDrawerOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </Box>
                        {FiltersPanel}
                    </Box>
                </Drawer>
            )}

            {/* Main */}
            <Box sx={{ flex: 1, pt: "86px", position: "relative", zIndex: 1, overflow: "auto" }}>
                <Box sx={{ p: { xs: 1.5, md: 2.2 }, maxWidth: 1700, mx: "auto" }}>
                    {/* Empty state */}
                    {!result && !loading ? (
                        <Paper elevation={0} sx={{ p: 2.2, borderRadius: 6, ...glass(0.62) }}>
                            <SectionTitle
                                icon={<CalendarMonthRoundedIcon fontSize="small" />}
                                title="Başlamak için"
                                sub='Soldan proje(leri) seç ve “Getir” ile öngörü tablosunu oluştur.'
                            />
                            <Box sx={{ mt: 1.4, p: 1.6, borderRadius: 5, border, bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.03) }}>
                                <Typography sx={{ fontWeight: 1100 }}>İpuçları</Typography>
                                <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, mt: 0.55, lineHeight: 1.6 }}>
                                    • Haftalar artık <b>1-7, 8-14, 15-21, 22-28, 29-ay sonu</b> şeklinde hesaplanır <br />
                                    • İlk ekranda sadece <b>Tahmin</b> kolonları görünür <br />
                                    • “Detay (Geçmiş)” ile önceki ay haftaları açılır <br />
                                    • Tahmin kolonlarında altta <b>Ger</b> gerçekleşen değeri görünür
                                </Typography>
                            </Box>
                        </Paper>
                    ) : null}

                    {/* Week KPI */}
                    {result && weekPills ? (
                        <Paper elevation={0} sx={{ p: 1.8, borderRadius: 6, ...glass(0.62), mb: 2 }}>
                            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.4} alignItems={{ lg: "center" }} justifyContent="space-between">
                                <SectionTitle icon={<CalendarMonthRoundedIcon fontSize="small" />} title="Son 7 gün özet" sub={weekPills.rangeText} />
                                <Chip
                                    size="small"
                                    label="KPI • canlı"
                                    sx={{
                                        height: 26,
                                        borderRadius: 999,
                                        fontWeight: 1100,
                                        bgcolor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.06),
                                        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                                    }}
                                />
                            </Stack>

                            <Box sx={{ mt: 1.4, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.2 }}>
                                <KpiCard title="Tedarik" value={fmtInt(weekPills.ted)} tone="good" />
                                <KpiCard title="Talep" value={fmtInt(weekPills.plan)} />
                                <KpiCard title="Ted/Talep" value={weekPills.cov == null ? "-" : fmtPct(weekPills.cov)} sub="Karşılama" tone={(weekPills.cov ?? 0) >= 90 ? "good" : "warn"} />
                                <KpiCard title="Perf" value={fmtPct(weekPills.perf)} sub="Performans" tone={(weekPills.perf ?? 0) >= 90 ? "good" : "warn"} />
                            </Box>
                        </Paper>
                    ) : null}

                    {/* Table */}
                    {result && tedMatrix ? (
                        <TedMatrixTablePretty
                            title={`Tedarik Öngörü Tablosu • ${region || "Tümü"}`}
                            subtitle="Hafta aralıkları: 1-7, 8-14, ... ay sonu • Arama/Sıralama/Density • Sticky toplam"
                            columns={tedMatrix.columns}
                            rows={tedMatrix.rows}
                            totals={tedMatrix.totals}
                        />
                    ) : null}

                    <Box sx={{ height: 18 }} />
                </Box>
            </Box>
        </Box>
    );
}
