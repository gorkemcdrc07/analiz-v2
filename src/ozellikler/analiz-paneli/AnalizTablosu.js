// src/ozellikler/analiz-paneli/AnalizTablosu.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
    Box, Typography, Stack, TextField, InputAdornment,
    Select, MenuItem, Tooltip, IconButton, ButtonBase,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    MdSearch, MdDownload, MdTrendingUp,
    MdBolt, MdWarning, MdCancel, MdInfoOutline, MdFilterList,
    MdFileDownload, MdInsertDriveFile,
} from "react-icons/md";
import { RiPulseLine } from "react-icons/ri";
import { TbLayoutDashboard, TbClockHour4 } from "react-icons/tb";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import ProjeSatiri from "./bilesenler/ProjeSatiri";
import { metniNormalizeEt as norm, seferNoNormalizeEt } from "../yardimcilar/metin";
import { Root, Wide } from "../stiller/stilBilesenleri";

/* ─── yardımcılar ────────────────────────────────────────────────────────── */
const mergeKeepFilled = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

const booleanCevir = (v) =>
    v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";

const sayiCevir = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

    const s0 = String(v).trim();
    if (!s0) return null;

    const isoFix = (s) => {
        const m = s.match(
            /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([Zz]|([+-]\d{2}:\d{2}))?$/
        );
        if (!m) return s;
        const ms3 = m[3] ? (m[3] + "000").slice(0, 3) : "";
        return `${m[1]}${ms3 ? "." + ms3 : ""}${m[4] || ""}`;
    };

    const s = isoFix(s0);

    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );
    if (m) {
        const d = new Date(+m[3], +m[2] - 1, +m[1], +m[4] ?? 0, +m[5] ?? 0, +m[6] ?? 0);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const formatDateTimeTR = (v) => {
    const d = parseTRDateTime(v);
    if (!d) return v || "—";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
};

const isGecTedarik = (pickupDate, arrivalDate) => {
    const yukleme = parseTRDateTime(pickupDate);
    const varis = parseTRDateTime(arrivalDate);

    if (!yukleme || !varis) return false;

    const farkSaat = (varis.getTime() - yukleme.getTime()) / (1000 * 60 * 60);
    return farkSaat >= 30;
};

const pickColumn = (rowObj, possibleNames) => {
    const keys = Object.keys(rowObj || {});
    const normKeys = keys.map((k) => ({ raw: k, n: norm(k) }));
    for (const nm of possibleNames) {
        const target = norm(nm);
        const exact = normKeys.find((x) => x.n === target);
        if (exact) return rowObj[exact.raw];
        const contains = normKeys.find((x) => x.n.includes(target));
        if (contains) return rowObj[contains.raw];
    }
    return undefined;
};

const excelCellToISO = (cellVal) => {
    if (cellVal == null || cellVal === "") return null;
    if (cellVal instanceof Date && !Number.isNaN(cellVal.getTime())) return cellVal.toISOString();

    if (typeof cellVal === "number") {
        const dc = XLSX.SSF.parse_date_code(cellVal);
        if (dc) {
            const d = new Date(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, Math.floor(dc.S || 0));
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    }

    const d2 = parseTRDateTime(cellVal);
    return d2 ? d2.toISOString() : String(cellVal);
};

/* ─── Performans renkleri ───────────────────────────────────────────────── */
const perfColor = (p) => {
    if (p >= 95) return { main: "#00E5A0", dim: "rgba(0,229,160,0.12)", text: "#00E5A0" };
    if (p >= 85) return { main: "#4ADE80", dim: "rgba(74,222,128,0.12)", text: "#4ADE80" };
    if (p >= 70) return { main: "#60A5FA", dim: "rgba(96,165,250,0.12)", text: "#60A5FA" };
    if (p >= 50) return { main: "#FBBF24", dim: "rgba(251,191,36,0.12)", text: "#FBBF24" };
    return { main: "#F87171", dim: "rgba(248,113,113,0.12)", text: "#F87171" };
};

/* ─── HTML raporu için performans rengi (hex) ───────────────────────────── */
const perfHex = (p) => {
    if (p >= 95) return "#16a34a";
    if (p >= 80) return "#3b82f6";
    if (p >= 60) return "#f59e0b";
    if (p >= 40) return "#f97316";
    return "#ef4444";
};

/* ─── Animasyonlu sayı ──────────────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = "", prefix = "", duration = 1.2 }) {
    const [display, setDisplay] = useState(0);
    const prevRef = useRef(0);

    useEffect(() => {
        const from = prevRef.current;
        const to = value;
        prevRef.current = to;
        const start = Date.now();
        const end = start + duration * 1000;

        const tick = () => {
            const now = Date.now();
            const t = Math.min(1, (now - start) / (end - start));
            const ease = 1 - Math.pow(1 - t, 4);
            setDisplay(Math.round(from + (to - from) * ease));
            if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [value, duration]);

    return (
        <>
            {prefix}
            {display}
            {suffix}
        </>
    );
}

/* ─── KPI Kart ───────────────────────────────────────────────────────────── */
function KPICard({ title, value, suffix = "", meta, icon, accentColor, isDark, children }) {
    const acc = accentColor || "#818CF8";
    const dimColor = `${acc}18`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: "20px",
                    p: "18px 20px",
                    height: "100%",
                    minHeight: 110,
                    background: isDark
                        ? "linear-gradient(135deg, rgba(15,18,30,0.9) 0%, rgba(20,24,38,0.95) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.98) 100%)",
                    border: `1px solid ${isDark ? `${acc}22` : `${acc}20`}`,
                    backdropFilter: "blur(20px)",
                    boxShadow: isDark
                        ? `0 0 0 0.5px ${acc}15, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${acc}12`
                        : `0 0 0 0.5px ${acc}20, 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`,
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(ellipse at 90% 10%, ${dimColor} 0%, transparent 60%)`,
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: "2.5px",
                        borderRadius: "0 2px 2px 0",
                        background: `linear-gradient(180deg, transparent, ${acc}, transparent)`,
                    }}
                />

                <Stack spacing={1.25} sx={{ position: "relative" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Typography
                            sx={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: isDark ? `${acc}BB` : `${acc}99`,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                            }}
                        >
                            {title}
                        </Typography>

                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "10px",
                                display: "grid",
                                placeItems: "center",
                                background: dimColor,
                                border: `1px solid ${acc}25`,
                                color: acc,
                                fontSize: 16,
                            }}
                        >
                            {icon}
                        </Box>
                    </Stack>

                    {children ?? (
                        <>
                            <Typography
                                sx={{
                                    fontSize: "2rem",
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    letterSpacing: "-0.04em",
                                    color: isDark ? "#F0F4FF" : "#0F1729",
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                <AnimatedNumber value={typeof value === "number" ? value : 0} suffix={suffix} />
                                {typeof value === "string" ? value : ""}
                            </Typography>

                            {meta && (
                                <Typography
                                    sx={{
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        color: isDark ? "rgba(160,170,200,0.6)" : "rgba(100,110,140,0.7)",
                                    }}
                                >
                                    {meta}
                                </Typography>
                            )}
                        </>
                    )}
                </Stack>
            </Box>
        </motion.div>
    );
}

/* ─── Filtre chip ───────────────────────────────────────────────────────── */
function FilterChip({ label, active, onToggle, color, isDark }) {
    return (
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Box
                onClick={onToggle}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 0.65,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: `1px solid ${active ? `${color}40` : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                    background: active
                        ? `${color}15`
                        : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: active ? `0 0 12px ${color}20` : "none",
                }}
            >
                <Box
                    sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: active ? color : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                        boxShadow: active ? `0 0 6px ${color}` : "none",
                        transition: "all 0.2s",
                        flexShrink: 0,
                    }}
                />
                <Typography
                    sx={{
                        fontSize: "0.73rem",
                        fontWeight: 700,
                        color: active ? color : (isDark ? "rgba(160,170,200,0.6)" : "rgba(100,110,140,0.6)"),
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                    }}
                >
                    {label}
                </Typography>
            </Box>
        </motion.div>
    );
}

/* ─── Aksiyon butonu ────────────────────────────────────────────────────── */
function GlassButton({ icon, label, onClick, loading, accent, isDark }) {
    const acc = accent || "#818CF8";

    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={loading ? undefined : onClick}
            style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.75,
                    py: 0.9,
                    borderRadius: "12px",
                    background: isDark
                        ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))"
                        : "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9))",
                    border: `1px solid ${acc}28`,
                    boxShadow: `0 0 0 0.5px ${acc}15, 0 2px 12px rgba(0,0,0,${isDark ? 0.3 : 0.08})`,
                    backdropFilter: "blur(12px)",
                    transition: "all 0.2s",
                    "&:hover": {
                        background: `${acc}18`,
                        borderColor: `${acc}45`,
                        boxShadow: `0 0 16px ${acc}20, 0 4px 20px rgba(0,0,0,${isDark ? 0.4 : 0.1})`,
                    },
                }}
            >
                {loading ? (
                    <Box
                        sx={{
                            width: 15,
                            height: 15,
                            borderRadius: "50%",
                            border: `2px solid ${acc}30`,
                            borderTopColor: acc,
                            animation: "spin 0.8s linear infinite",
                            "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                        }}
                    />
                ) : (
                    <Box sx={{ color: acc, display: "flex", fontSize: 15 }}>{icon}</Box>
                )}

                <Typography
                    sx={{
                        fontSize: "0.77rem",
                        fontWeight: 800,
                        letterSpacing: "0.02em",
                        color: isDark ? "rgba(220,228,255,0.85)" : "rgba(30,40,80,0.8)",
                        display: { xs: "none", md: "block" },
                    }}
                >
                    {loading ? "Yükleniyor..." : label}
                </Typography>
            </Box>
        </motion.div>
    );
}

/* ─── Bölge tab ─────────────────────────────────────────────────────────── */
function RegionTab({ label, count, selected, onClick, isDark }) {
    return (
        <Box sx={{ position: "relative" }}>
            {selected && (
                <motion.div
                    layoutId="regionSelected"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 12,
                        background: isDark
                            ? "linear-gradient(135deg, #1E2540, #252B45)"
                            : "linear-gradient(135deg, #0F1729, #1A2550)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(129,140,248,0.25)",
                        zIndex: 0,
                    }}
                />
            )}

            <ButtonBase
                onClick={onClick}
                sx={{
                    px: 2,
                    py: 1,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    zIndex: 1,
                    position: "relative",
                    transition: "color 0.2s",
                }}
            >
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        letterSpacing: "0.02em",
                        color: selected ? "#C7D2FE" : (isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.6)"),
                        transition: "color 0.2s",
                    }}
                >
                    {label}
                </Typography>

                <Box
                    sx={{
                        px: 0.9,
                        py: 0.15,
                        borderRadius: "6px",
                        minWidth: 22,
                        textAlign: "center",
                        background: selected ? "rgba(129,140,248,0.2)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                        border: `0.5px solid ${selected ? "rgba(129,140,248,0.3)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            lineHeight: 1.5,
                            color: selected ? "#A5B4FC" : (isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.5)"),
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {String(count).padStart(2, "0")}
                    </Typography>
                </Box>
            </ButtonBase>
        </Box>
    );
}

export default function AnalizTablosu({
    data,
    printsMap = {},
    printsLoading = false,
    regionsMap = {},
    vehicleMap = {},
    vehicleLoading = false,
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const bolgeler = useMemo(() => Object.keys(regionsMap || {}), [regionsMap]);

    const [seciliBolge, setSeciliBolge] = useState(() => {
        if (regionsMap?.GEBZE) return "GEBZE";
        return bolgeler[0] || "";
    });

    useEffect(() => {
        if (!seciliBolge || !regionsMap?.[seciliBolge]) {
            setSeciliBolge(regionsMap?.GEBZE ? "GEBZE" : bolgeler[0] || "");
        }
    }, [regionsMap, bolgeler, seciliBolge]);

    const [arama, setArama] = useState("");
    const [sirala, setSirala] = useState("perf");
    const [sadeceGecikenler, setSadeceGecikenler] = useState(false);
    const [sadeceTedarikEdilmeyenler, setSadeceTedarikEdilmeyenler] = useState(false);
    const [excelTarihleriSeferBazli, setExcelTarihleriSeferBazli] = useState({});
    const [excelIcerikBilgisi, setExcelIcerikBilgisi] = useState(null);
    const [excelOkunuyor, setExcelOkunuyor] = useState(false);
    const [excelUyari, setExcelUyari] = useState("");
    const [detayExcelYukleniyor, setDetayExcelYukleniyor] = useState(false);

    const exceldenTarihleriIceriAl = async () => {
        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xlsx,.xls";
            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setExcelOkunuyor(true);

                try {
                    const buf = await file.arrayBuffer();
                    const wb = XLSX.read(buf, { type: "array", cellDates: true });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
                    const map = {};

                    json.forEach((r) => {
                        const seferKey = seferNoNormalizeEt(
                            pickColumn(r, ["Sefer Numarası", "Sefer No", "SeferNo", "Sefer", "Sefer Numarasi"])
                        );
                        if (!seferKey) return;

                        const nextObj = {
                            yukleme_varis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Varış Zamanı", "Yükleme Varış"])),
                            yukleme_giris: excelCellToISO(pickColumn(r, ["Yükleme Noktasına Giriş Zamanı", "Yükleme Giriş"])),
                            yukleme_cikis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Çıkış Zamanı", "Yükleme Çıkış"])),
                            teslim_varis: excelCellToISO(pickColumn(r, ["Teslim Noktası Varış Zamanı", "Teslim Varış"])),
                            teslim_giris: excelCellToISO(pickColumn(r, ["Teslim Noktasına Giriş Zamanı", "Teslim Giriş"])),
                            teslim_cikis: excelCellToISO(pickColumn(r, ["Teslim Noktası Çıkış Zamanı", "Teslim Çıkış"])),
                        };

                        map[seferKey] = mergeKeepFilled(map[seferKey], nextObj);
                    });

                    const withSefer = Object.keys(map).length;
                    const withAnyDate = Object.values(map).filter((tt) =>
                        [tt.yukleme_varis, tt.yukleme_giris, tt.yukleme_cikis, tt.teslim_varis, tt.teslim_giris, tt.teslim_cikis]
                            .some((x) => x != null && x !== "" && x !== "---")
                    ).length;

                    setExcelIcerikBilgisi({ totalRows: json.length, withSefer, withAnyDate });
                    setExcelTarihleriSeferBazli(map);
                } catch (err) {
                    console.error("Excel okuma hatası:", err);
                    setExcelUyari("Excel dosyası okunamadı.");
                } finally {
                    setExcelOkunuyor(false);
                }
            };
            input.click();
        } catch (err) {
            console.error("Excel seçme hatası:", err);
            setExcelUyari("Excel dosyası seçilemedi.");
        }
    };

    const yuklemeTarihleriHazirMi = useMemo(() => {
        if (printsLoading) return false;
        const printsCount = Object.keys(printsMap || {}).length;
        if (printsCount > 0) return true;

        return (Array.isArray(data) ? data : []).some(
            (item) => item?.TMSLoadingDocumentPrintedDate
        );
    }, [printsMap, printsLoading, data]);

    const islenmisVeri = useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        const stats = {};

        src.forEach((item) => {
            let finalProjectName = item.ProjectName;
            const pNorm = norm(item.ProjectName);

            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                else return;
            }

            if (pNorm === norm("PEPSİ FTL")) {
                const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL  ÇORLU";
                else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
            }

            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
            }

            if (pNorm === norm("FAKİR FTL")) {
                const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
            }

            if (pNorm === norm("MODERN BOBİN FTL")) {
                const c = norm(item.PickupCityName);
                if (c === norm("ZONGULDAK")) finalProjectName = "MODERN BOBİN ZONGULDAK FTL";
                else if (c === norm("TEKİRDAĞ")) finalProjectName = "MODERN BOBİN TEKİRDAĞ FTL";
                else return;
            }

            if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN A ÇIKILIYOR)";

            const key = norm(finalProjectName);
            if (!stats[key]) {
                stats[key] = {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    gec_tedarik: new Set(),
                };
            }

            const s = stats[key];
            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                service === norm("YURTİÇİ FRİGO HİZMETLERİ");

            if (!inScope) return;

            const reqNoUp = (item.TMSVehicleRequestDocumentNo || "")
                .toString()
                .replace(/\u00A0/g, " ")
                .replace(/\u200B/g, "")
                .replace(/\r?\n/g, " ")
                .trim()
                .toLocaleUpperCase("tr-TR");

            if (reqNoUp && !reqNoUp.startsWith("BOS")) s.plan.add(reqNoUp);

            const despKey = seferNoNormalizeEt((item.TMSDespatchDocumentNo || "").toString());
            if (!despKey || !despKey.startsWith("SFR")) return;

            if (sayiCevir(item.OrderStatu) === 200) {
                s.iptal.add(despKey);
                return;
            }

            s.ted.add(despKey);

            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm(" -ZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despKey);
            else s.spot.add(despKey);

            if (booleanCevir(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            if (isGecTedarik(item.PickupDate, item.TMSLoadingDocumentPrintedDate)) {
                s.gec_tedarik.add(despKey);
            }
        });

        return stats;
    }, [data]);

    const satirlar = useMemo(() => {
        const q = norm(arama);
        const bolgeListesi = regionsMap?.[seciliBolge] || [];

        const base = bolgeListesi
            .map((projeAdi) => {
                const s = islenmisVeri[norm(projeAdi)] || {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    gec_tedarik: new Set(),
                };

                const plan = s.plan?.size ?? 0;
                const ted = s.ted?.size ?? 0;
                const iptal = s.iptal?.size ?? 0;
                const edilmeyen = Math.max(0, plan - (ted + iptal));
                const gec = s.gec_tedarik?.size ?? 0;
                const zamaninda = Math.max(0, ted - gec);
                const yuzde = plan > 0 ? Math.max(0, Math.min(100, Math.round((zamaninda / plan) * 100))) : 0;

                return {
                    name: projeAdi,
                    plan,
                    ted,
                    edilmeyen,
                    iptal,
                    spot: s.spot?.size ?? 0,
                    filo: s.filo?.size ?? 0,
                    sho_b: s.sho_b?.size ?? 0,
                    sho_bm: s.sho_bm?.size ?? 0,
                    zamaninda,
                    gec,
                    yuzde,
                };
            })
            .filter((r) => r.plan > 0)
            .filter((r) => (q ? norm(r.name).includes(q) : true))
            .filter((r) => (sadeceGecikenler ? r.gec > 0 : true))
            .filter((r) => (sadeceTedarikEdilmeyenler ? r.edilmeyen > 0 : true));

        return [...base].sort((a, b) => {
            if (sadeceGecikenler) return b.gec - a.gec;
            if (sadeceTedarikEdilmeyenler) return b.edilmeyen - a.edilmeyen;
            if (sirala === "plan") return b.plan - a.plan;
            if (sirala === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde;
        });
    }, [seciliBolge, islenmisVeri, arama, sirala, sadeceGecikenler, sadeceTedarikEdilmeyenler, regionsMap]);

    const kpi = useMemo(() => {
        const sum = satirlar.reduce(
            (acc, r) => {
                acc.plan += r.plan;
                acc.ted += r.ted;
                acc.edilmeyen += r.edilmeyen;
                acc.spot += r.spot;
                acc.filo += r.filo;
                acc.gec += r.gec;
                acc.zamaninda += r.zamaninda;
                return acc;
            },
            { plan: 0, ted: 0, edilmeyen: 0, spot: 0, filo: 0, gec: 0, zamaninda: 0 }
        );

        sum.perf = sum.plan
            ? Math.max(0, Math.min(100, Math.round((sum.zamaninda / sum.plan) * 100)))
            : 0;

        return sum;
    }, [satirlar]);

    const perfC = perfColor(kpi.perf);
    const excelCount = Object.keys(excelTarihleriSeferBazli || {}).length;

    /* ─── İnteraktif HTML Rapor Export ─────────────────────────────────── */
    const interaktifHTMLRaporuIndir = () => {
        // Tüm bölge verilerini hesapla ve JSON olarak gömecek yapıyı oluştur
        const tumBolgeVerisi = {};

        Object.keys(regionsMap || {}).forEach((bolge) => {
            const bolgeListesi = regionsMap[bolge] || [];
            const bolgeRows = bolgeListesi
                .map((projeAdi) => {
                    const s = islenmisVeri[norm(projeAdi)] || {
                        plan: new Set(), ted: new Set(), iptal: new Set(),
                        filo: new Set(), spot: new Set(), sho_b: new Set(),
                        sho_bm: new Set(), gec_tedarik: new Set(),
                    };
                    const plan = s.plan?.size ?? 0;
                    const ted = s.ted?.size ?? 0;
                    const iptal = s.iptal?.size ?? 0;
                    const edilmeyen = Math.max(0, plan - (ted + iptal));
                    const gec = s.gec_tedarik?.size ?? 0;
                    const zamaninda = Math.max(0, ted - gec);
                    const yuzde = plan > 0 ? Math.max(0, Math.min(100, Math.round((zamaninda / plan) * 100))) : 0;
                    return {
                        name: projeAdi, plan, ted, edilmeyen, iptal,
                        spot: s.spot?.size ?? 0, filo: s.filo?.size ?? 0,
                        sho_b: s.sho_b?.size ?? 0, sho_bm: s.sho_bm?.size ?? 0,
                        zamaninda, gec, yuzde,
                    };
                })
                .filter((r) => r.plan > 0);
            tumBolgeVerisi[bolge] = bolgeRows;
        });

        const tarih = new Date().toLocaleDateString("tr-TR", {
            day: "2-digit", month: "long", year: "numeric",
        });
        const saat = new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit", minute: "2-digit",
        });

        const ilkBolge = Object.keys(regionsMap || {})[0] || "";

        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Analiz Raporu · ${tarih}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #F0F4FF;
      --surface: #ffffff;
      --surface2: #F8FAFF;
      --border: #E5E9F5;
      --text: #0F1729;
      --text2: #5A6589;
      --text3: #8892B0;
      --radius: 12px;
      --radius-lg: 20px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #070B14;
        --surface: #0F1829;
        --surface2: #131C30;
        --border: #1E2A45;
        --text: #E8EEFF;
        --text2: #8892B0;
        --text3: #4A5578;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .page { max-width: 1280px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    /* ── Header ── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo-box {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, #818CF8, #6366F1);
      display: grid; place-items: center; flex-shrink: 0;
      font-size: 20px; color: #fff;
      box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    }
    .header-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.04em; }
    .header-subtitle { font-size: 0.75rem; color: var(--text2); margin-top: 2px; }
    .live-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 8px;
      background: rgba(99,102,241,0.12); border: 0.5px solid rgba(99,102,241,0.25);
      font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em;
      color: #818CF8; text-transform: uppercase; font-family: monospace;
    }
    .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #818CF8; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .meta-text { font-size: 0.75rem; color: var(--text3); text-align: right; line-height: 1.6; }

    /* ── Filtreler ── */
    .filters-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin-bottom: 1.5rem;
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
    }
    .search-input {
      flex: 1; min-width: 180px; max-width: 280px;
      padding: 7px 12px; border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface2);
      color: var(--text);
      font-size: 0.82rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #818CF8; }
    .sort-select {
      padding: 7px 12px; border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface2);
      color: var(--text);
      font-size: 0.82rem;
      outline: none; cursor: pointer;
    }
    .filter-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--border);
      background: var(--surface2);
      font-size: 0.73rem; font-weight: 700;
      color: var(--text2);
      transition: all 0.2s; user-select: none;
    }
    .filter-chip.active-amber { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #FBBF24; }
    .filter-chip.active-red { background: rgba(248,113,113,0.12); border-color: rgba(248,113,113,0.3); color: #F87171; }
    .chip-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .filter-count { font-size: 0.7rem; color: var(--text3); margin-left: auto; white-space: nowrap; }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px; margin-bottom: 1.5rem;
    }
    @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr 1fr; } }

    .kpi-card {
      background: var(--surface); border: 0.5px solid var(--border);
      border-radius: var(--radius-lg); padding: 16px 18px;
      position: relative; overflow: hidden;
    }
    .kpi-card::before {
      content: ""; position: absolute; left: 0; top: 20%; bottom: 20%;
      width: 2.5px; border-radius: 0 2px 2px 0;
    }
    .kpi-card.blue::before { background: linear-gradient(180deg,transparent,#60A5FA,transparent); }
    .kpi-card.green::before { background: linear-gradient(180deg,transparent,#34D399,transparent); }
    .kpi-card.red::before { background: linear-gradient(180deg,transparent,#F87171,transparent); }
    .kpi-card.amber::before { background: linear-gradient(180deg,transparent,#FBBF24,transparent); }
    .kpi-card.perf-card::before { background: linear-gradient(180deg,transparent,var(--perf-color, #16a34a),transparent); }
    .kpi-label {
      font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; font-family: monospace; margin-bottom: 8px;
    }
    .kpi-card.blue .kpi-label { color: #60A5FA; }
    .kpi-card.green .kpi-label { color: #34D399; }
    .kpi-card.red .kpi-label { color: #F87171; }
    .kpi-card.amber .kpi-label { color: #FBBF24; }
    .kpi-card.perf-card .kpi-label { color: var(--perf-color, #16a34a); }
    .kpi-val {
      font-size: 2rem; font-weight: 900; line-height: 1;
      letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
    }
    .kpi-meta { font-size: 0.68rem; color: var(--text3); margin-top: 4px; }

    /* ── Bölge Tabs ── */
    .bolge-bar {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }
    .bolge-tab {
      padding: 6px 14px; border-radius: 10px; cursor: pointer;
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em;
      color: var(--text2); border: 0.5px solid var(--border);
      background: var(--surface); display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.2s; user-select: none;
    }
    .bolge-tab em {
      font-style: normal; font-size: 0.65rem; font-weight: 800;
      padding: 1px 6px; border-radius: 5px;
      background: rgba(255,255,255,0.06); color: var(--text3);
    }
    .bolge-tab.aktif { background: #1A2550; color: #C7D2FE; border-color: rgba(129,140,248,0.3); }
    .bolge-tab.aktif em { color: #A5B4FC; }

    /* ── Özet row ── */
    .ozet-row { display: flex; gap: 8px; margin-bottom: 1rem; flex-wrap: wrap; }
    .ozet-pill {
      display: flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 7px;
      font-size: 0.7rem; font-weight: 700;
    }
    .ozet-pill.green { background: rgba(52,211,153,0.1); color: #34D399; border: 0.5px solid rgba(52,211,153,0.2); }
    .ozet-pill.amber { background: rgba(251,191,36,0.1); color: #FBBF24; border: 0.5px solid rgba(251,191,36,0.2); }
    .ozet-pill.red { background: rgba(248,113,113,0.1); color: #F87171; border: 0.5px solid rgba(248,113,113,0.2); }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* ── Tablo ── */
    .tablo-wrap {
      background: var(--surface); border: 0.5px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    thead th {
      background: #1e3a8a; color: #fff;
      padding: 11px 14px; text-align: left;
      font-weight: 700; font-size: 0.7rem; letter-spacing: 0.04em; text-transform: uppercase;
      white-space: nowrap; user-select: none; cursor: pointer; position: relative;
    }
    thead th:hover { background: #1e40af; }
    thead th.num, thead th.perf-col { text-align: center; }
    thead th.perf-col { min-width: 180px; }
    thead th .sort-arrow { margin-left: 4px; opacity: 0.5; font-size: 0.65rem; }
    thead th.sorted .sort-arrow { opacity: 1; }

    tbody tr { border-bottom: 0.5px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(99,102,241,0.04) !important; }
    tbody tr.zebra { background: var(--surface2); }
    tbody tr.total-row { border-top: 2px solid rgba(99,102,241,0.2); }

    td { padding: 10px 14px; vertical-align: middle; }
    td.proje-col { font-weight: 600; color: var(--text); max-width: 220px; }
    td.num { text-align: center; font-variant-numeric: tabular-nums; color: var(--text2); }
    td.edilmeyen { color: #F87171; font-weight: 700; }
    td.gec { color: #FBBF24; font-weight: 700; }
    .perf-col { min-width: 180px; padding: 8px 14px; }
    .perf-wrap { display: flex; align-items: center; gap: 8px; }
    .perf-bar-bg { flex: 1; height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
    .perf-bar { height: 100%; border-radius: 3px; }
    .perf-badge {
      color: #fff; font-size: 0.68rem; font-weight: 800;
      padding: 2px 8px; border-radius: 6px; min-width: 44px;
      text-align: center; flex-shrink: 0; font-variant-numeric: tabular-nums;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 2.5rem; text-align: center;
      font-size: 0.72rem; color: var(--text3);
      border-top: 0.5px solid var(--border); padding-top: 1.5rem;
    }

    /* ── Print ── */
    @media print {
      body { background: #fff; color: #000; }
      .page { padding: 0.5cm 1cm; max-width: 100%; }
      .kpi-grid { grid-template-columns: repeat(5, 1fr); }
      .filters-bar, .bolge-bar { display: none; }
      thead th { background: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .perf-bar, .perf-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="logo-box">&#9783;</div>
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:3px;">
          <span class="header-title">Analiz Raporu</span>
          <span class="live-badge"><span class="live-dot"></span>CANLI</span>
        </div>
        <div class="header-subtitle">Tedarik · Performans · Rota · Zaman Analizi</div>
      </div>
    </div>
    <div class="meta-text">
      ${tarih} · ${saat}<br/>
      30 saat kuralı baz alınır
    </div>
  </div>

  <div id="kpi-grid" class="kpi-grid"></div>
  <div id="bolge-bar" class="bolge-bar"></div>

  <div class="filters-bar">
    <input type="text" class="search-input" id="searchInput" placeholder="Proje ara..." oninput="applyFilters()" />
    <select class="sort-select" id="sortSelect" onchange="applyFilters()">
      <option value="perf">Performansa Göre</option>
      <option value="plan">Talebe Göre</option>
      <option value="late">Geç Tedarike Göre</option>
    </select>
    <div class="filter-chip" id="chipGec" onclick="toggleChip('gec')">
      <span class="chip-dot"></span> Sadece Gecikenler
    </div>
    <div class="filter-chip" id="chipEdilmeyen" onclick="toggleChip('edilmeyen')">
      <span class="chip-dot"></span> Tedarik Edilmeyenler
    </div>
    <span class="filter-count" id="filterCount"></span>
  </div>

  <div class="ozet-row" id="ozetRow"></div>
  <div class="tablo-wrap"><table id="mainTable"></table></div>

  <div class="footer">
    Analiz Paneli &nbsp;·&nbsp; <span id="footerBolge"></span> &nbsp;·&nbsp; ${tarih} ${saat} &nbsp;·&nbsp;
    30 saat kuralı: yükleme tarihinden yüklemeye gelişe kadar geçen süre baz alınır.
  </div>
</div>

<script>
  const BOLGE_VERISI = ${JSON.stringify(tumBolgeVerisi)};
  const BOLGE_LISTESI = ${JSON.stringify(Object.keys(regionsMap || {}))};

  let aktifBolge = "${ilkBolge}";
  let aktifFiltreler = { gec: false, edilmeyen: false };
  let sütunSiralama = { col: null, asc: false };

  function perfHex(p) {
    if (p >= 95) return "#16a34a";
    if (p >= 80) return "#3b82f6";
    if (p >= 60) return "#f59e0b";
    if (p >= 40) return "#f97316";
    return "#ef4444";
  }

  function toggleChip(which) {
    aktifFiltreler[which] = !aktifFiltreler[which];
    const chipId = which === "gec" ? "chipGec" : "chipEdilmeyen";
    const activeClass = which === "gec" ? "active-amber" : "active-red";
    const el = document.getElementById(chipId);
    if (aktifFiltreler[which]) el.classList.add(activeClass);
    else el.classList.remove(activeClass);
    applyFilters();
  }

  function setBolge(bolge) {
    aktifBolge = bolge;
    document.querySelectorAll(".bolge-tab").forEach(el => {
      el.classList.toggle("aktif", el.dataset.bolge === bolge);
    });
    document.getElementById("footerBolge").textContent = bolge + " bölgesi";
    applyFilters();
  }

  function applyFilters() {
    const q = (document.getElementById("searchInput").value || "").toLowerCase().replace(/\s+/g, "");
    const sort = document.getElementById("sortSelect").value;
    const onlyGec = aktifFiltreler.gec;
    const onlyEdilmeyen = aktifFiltreler.edilmeyen;

    let rows = (BOLGE_VERISI[aktifBolge] || []).slice();

    if (q) rows = rows.filter(r => r.name.toLowerCase().replace(/\s+/g, "").includes(q));
    if (onlyGec) rows = rows.filter(r => r.gec > 0);
    if (onlyEdilmeyen) rows = rows.filter(r => r.edilmeyen > 0);

    rows.sort((a, b) => {
      if (onlyGec) return b.gec - a.gec;
      if (onlyEdilmeyen) return b.edilmeyen - a.edilmeyen;
      if (sort === "plan") return b.plan - a.plan;
      if (sort === "late") return b.gec - a.gec;
      return b.yuzde - a.yuzde;
    });

    if (sütunSiralama.col !== null) {
      const col = sütunSiralama.col;
      const asc = sütunSiralama.asc;
      rows.sort((a, b) => {
        const cols = ["name","plan","ted","edilmeyen","gec","spot","filo","sho_b","sho_bm","yuzde"];
        const va = a[cols[col]], vb = b[cols[col]];
        if (typeof va === "number") return asc ? va - vb : vb - va;
        return asc ? String(va).localeCompare(String(vb),"tr") : String(vb).localeCompare(String(va),"tr");
      });
    }

    renderTable(rows);
    renderKPI(rows);
    renderOzet(rows);
    document.getElementById("filterCount").textContent = rows.length + " proje";
  }

  function renderKPI(rows) {
    const totals = rows.reduce((acc, r) => {
      acc.plan += r.plan; acc.ted += r.ted; acc.edilmeyen += r.edilmeyen;
      acc.spot += r.spot; acc.filo += r.filo; acc.gec += r.gec; acc.zamaninda += r.zamaninda;
      return acc;
    }, { plan:0, ted:0, edilmeyen:0, spot:0, filo:0, gec:0, zamaninda:0 });

    const perf = totals.plan > 0 ? Math.max(0, Math.min(100, Math.round((totals.zamaninda / totals.plan) * 100))) : 0;
    const perfColor = perfHex(perf);

    const tedarikOrani = totals.plan > 0 ? Math.round((totals.ted / totals.plan) * 100) : 0;

    document.getElementById("kpi-grid").innerHTML = \`
      <div class="kpi-card blue">
        <div class="kpi-label">Toplam Talep</div>
        <div class="kpi-val">\${totals.plan}</div>
        <div class="kpi-meta">Bölge: \${aktifBolge}</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Tedarik Edilen</div>
        <div class="kpi-val">\${totals.ted}</div>
        <div class="kpi-meta">SPOT \${totals.spot} · FİLO \${totals.filo}</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-label">Tedarik Edilmeyen</div>
        <div class="kpi-val">\${totals.edilmeyen}</div>
        <div class="kpi-meta">&nbsp;</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Geç Tedarik</div>
        <div class="kpi-val">\${totals.gec}</div>
        <div class="kpi-meta">&nbsp;</div>
      </div>
      <div class="kpi-card perf-card" style="--perf-color:\${perfColor}">
        <div class="kpi-label">Zamanında Oran</div>
        <div class="kpi-val" style="color:\${perfColor}">\${perf}%</div>
        <div class="kpi-meta">Tedarik: %\${tedarikOrani}</div>
      </div>
    \`;
  }

  function renderOzet(rows) {
    const totals = rows.reduce((acc, r) => {
      acc.gec += r.gec; acc.edilmeyen += r.edilmeyen; return acc;
    }, { gec: 0, edilmeyen: 0 });

    let html = \`<div class="ozet-pill green"><span class="pill-dot"></span>\${rows.length} proje listeleniyor</div>\`;
    if (totals.gec > 0) html += \`<div class="ozet-pill amber"><span class="pill-dot"></span>\${totals.gec} geç tedarik</div>\`;
    if (totals.edilmeyen > 0) html += \`<div class="ozet-pill red"><span class="pill-dot"></span>\${totals.edilmeyen} tedarik edilmeyen</div>\`;
    document.getElementById("ozetRow").innerHTML = html;
  }

  const COLS = ["name","plan","ted","edilmeyen","gec","spot","filo","sho_b","sho_bm","yuzde"];
  const COL_LABELS = ["Proje","Talep","Tedarik","Edilmeyen","Geç","Spot","Filo","SHÖ Var","SHÖ Yok","Performans"];

  function sortByCol(colIdx) {
    if (sütunSiralama.col === colIdx) sütunSiralama.asc = !sütunSiralama.asc;
    else { sütunSiralama.col = colIdx; sütunSiralama.asc = false; }
    applyFilters();
  }

  function renderTable(rows) {
    const thead = \`<thead><tr>\${COL_LABELS.map((label, i) => {
      const isSorted = sütunSiralama.col === i;
      const arrow = isSorted ? (sütunSiralama.asc ? "▲" : "▼") : "▼";
      const cls = (i === 0 ? "" : " num") + (i === 9 ? " perf-col" : "") + (isSorted ? " sorted" : "");
      return \`<th class="\${cls}" onclick="sortByCol(\${i})">\${label}<span class="sort-arrow">\${arrow}</span></th>\`;
    }).join("")}</tr></thead>\`;

    const totals = rows.reduce((acc, r) => {
      acc.plan += r.plan; acc.ted += r.ted; acc.edilmeyen += r.edilmeyen;
      acc.spot += r.spot; acc.filo += r.filo; acc.gec += r.gec;
      acc.zamaninda += r.zamaninda; acc.sho_b += r.sho_b; acc.sho_bm += r.sho_bm;
      return acc;
    }, { plan:0, ted:0, edilmeyen:0, spot:0, filo:0, gec:0, zamaninda:0, sho_b:0, sho_bm:0 });

    const totalPerf = totals.plan > 0 ? Math.max(0, Math.min(100, Math.round((totals.zamaninda / totals.plan) * 100))) : 0;
    const totalPerfColor = perfHex(totalPerf);

    const bodyRows = rows.map((r, i) => {
      const renk = perfHex(r.yuzde);
      const barW = r.plan > 0 ? Math.round((r.zamaninda / r.plan) * 100) : 0;
      const zc = i % 2 === 1 ? ' class="zebra"' : "";
      return \`<tr\${zc}>
        <td class="proje-col">\${r.name}</td>
        <td class="num">\${r.plan}</td>
        <td class="num">\${r.ted}</td>
        <td class="num edilmeyen">\${r.edilmeyen > 0 ? r.edilmeyen : "—"}</td>
        <td class="num gec">\${r.gec > 0 ? r.gec : "—"}</td>
        <td class="num">\${r.spot}</td>
        <td class="num">\${r.filo}</td>
        <td class="num">\${r.sho_b}</td>
        <td class="num">\${r.sho_bm}</td>
        <td class="perf-col">
          <div class="perf-wrap">
            <div class="perf-bar-bg"><div class="perf-bar" style="width:\${barW}%;background:\${renk};"></div></div>
            <span class="perf-badge" style="background:\${renk};">\${r.yuzde}%</span>
          </div>
        </td>
      </tr>\`;
    }).join("");

    const totalRow = \`<tr class="total-row">
      <td style="font-weight:800;font-size:0.8rem;">TOPLAM</td>
      <td class="num" style="font-weight:800;">\${totals.plan}</td>
      <td class="num" style="font-weight:800;">\${totals.ted}</td>
      <td class="num edilmeyen" style="font-weight:800;">\${totals.edilmeyen > 0 ? totals.edilmeyen : "—"}</td>
      <td class="num gec" style="font-weight:800;">\${totals.gec > 0 ? totals.gec : "—"}</td>
      <td class="num" style="font-weight:800;">\${totals.spot}</td>
      <td class="num" style="font-weight:800;">\${totals.filo}</td>
      <td class="num" style="font-weight:800;">\${totals.sho_b}</td>
      <td class="num" style="font-weight:800;">\${totals.sho_bm}</td>
      <td class="perf-col">
        <div class="perf-wrap">
          <div class="perf-bar-bg"><div class="perf-bar" style="width:\${totalPerf}%;background:\${totalPerfColor};"></div></div>
          <span class="perf-badge" style="background:\${totalPerfColor};">\${totalPerf}%</span>
        </div>
      </td>
    </tr>\`;

    document.getElementById("mainTable").innerHTML = thead + "<tbody>" + bodyRows + totalRow + "</tbody>";
  }

  function init() {
    // Bölge tabları oluştur
    const bolgeBar = document.getElementById("bolge-bar");
    BOLGE_LISTESI.forEach(bolge => {
      const count = (BOLGE_VERISI[bolge] || []).filter(r => r.plan > 0).length;
      const tab = document.createElement("div");
      tab.className = "bolge-tab" + (bolge === aktifBolge ? " aktif" : "");
      tab.dataset.bolge = bolge;
      tab.onclick = () => setBolge(bolge);
      tab.innerHTML = bolge + " <em>" + count + "</em>";
      bolgeBar.appendChild(tab);
    });

    document.getElementById("footerBolge").textContent = aktifBolge + " bölgesi";
    applyFilters();
  }

  init();
</script>
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        saveAs(blob, `AnalizRaporu_Interaktif_${new Date().toISOString().slice(0, 10)}.html`);
    };

    /* ─── Excel: bölge özet ────────────────────────────────────────────── */
    const bolgeyiExceleAktar = () => {
        if (!yuklemeTarihleriHazirMi) {
            setExcelUyari("Önce Yükleme Tarihleri butonuna basınız.");
            return;
        }

        const toSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

        const colLetter = (n) => {
            let s = "";
            let x = n + 1;
            while (x > 0) {
                const m = (x - 1) % 26;
                s = String.fromCharCode(65 + m) + s;
                x = Math.floor((x - 1) / 26);
            }
            return s;
        };

        const setCellStyle = (ws, addr, style) => {
            if (!ws[addr]) return;
            ws[addr].s = { ...(ws[addr].s || {}), ...style };
        };

        const font = (bold = false, color = "FF0F172A") => ({
            bold,
            color: { rgb: color },
            name: "Calibri",
        });

        const fill = (rgb) => ({
            patternType: "solid",
            fgColor: { rgb },
        });

        const borderAll = {
            top: { style: "thin", color: { rgb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
            left: { style: "thin", color: { rgb: "FFE5E7EB" } },
            right: { style: "thin", color: { rgb: "FFE5E7EB" } },
        };

        const align = (horizontal = "center") => ({
            vertical: "center",
            horizontal,
            wrapText: true,
        });

        const headerStyle = {
            font: font(true, "FFFFFFFF"),
            fill: fill("FF2563EB"),
            alignment: align("center"),
            border: borderAll,
        };

        const metaStyleDark = {
            font: font(true, "FFFFFFFF"),
            fill: fill("FF0F172A"),
            alignment: align("left"),
            border: borderAll,
        };

        const metaStyleSoft = {
            font: font(true, "FF0F172A"),
            fill: fill("FFDBEAFE"),
            alignment: align("left"),
            border: borderAll,
        };

        const rowFillA = fill("FFFFFFFF");
        const rowFillB = fill("FFF8FAFC");

        const lateFill = (n) => {
            const v = Number(n) || 0;
            if (v >= 10) return fill("FFDC2626");
            if (v >= 1) return fill("FFF97316");
            return fill("FF60A5FA");
        };

        const perfFill = (p) => {
            const v = Number(p) || 0;
            if (v >= 95) return fill("FF16A34A");
            if (v >= 90) return fill("FF10B981");
            if (v >= 80) return fill("FF3B82F6");
            if (v >= 70) return fill("FFF59E0B");
            if (v >= 50) return fill("FFF97316");
            return fill("FFEF4444");
        };

        const zamanindaOraniHesapla = (plan, ted, gec) => {
            const p0 = Number(plan) || 0;
            const t0 = Number(ted) || 0;
            const g0 = Number(gec) || 0;

            if (p0 <= 0) return "TALEP YOK";
            if (t0 <= 0) return 0;

            return Math.max(
                0,
                Math.min(100, Math.round(((Math.max(0, t0 - g0)) / p0) * 100))
            );
        };


        const headers = [
            "PROJE",
            "TALEP",
            "TEDARİK",
            "EDİLMEYEN",
            "GEÇ TEDARİK",
            "SPOT",
            "FİLO",
            "SHÖ VAR",
            "SHÖ YOK",
            "ZAMANINDA ORANI (%)",
        ];
        const wb = XLSX.utils.book_new();

        const buildRowsFromProjectList = (projeListesi) =>
            (projeListesi || []).map((projeAdi) => {
                const raw = islenmisVeri[norm(projeAdi)] || {};
                const plan = toSet(raw.plan).size;
                const ted = toSet(raw.ted).size;
                const iptal = toSet(raw.iptal).size;
                const spot = toSet(raw.spot).size;
                const filo = toSet(raw.filo).size;
                const shoVar = toSet(raw.sho_b).size;
                const shoYok = toSet(raw.sho_bm).size;
                const gecTedarik = toSet(raw.gec_tedarik).size;
                const edilmeyen = Math.max(0, plan - (ted + iptal));

                return {
                    PROJE: projeAdi,
                    TALEP: plan,
                    TEDARİK: ted,
                    EDİLMEYEN: edilmeyen,
                    "GEÇ TEDARİK": gecTedarik,
                    SPOT: spot,
                    FİLO: filo,
                    "SHÖ VAR": shoVar,
                    "SHÖ YOK": shoYok,
                    "ZAMANINDA ORANI (%)": zamanindaOraniHesapla(plan, ted, gecTedarik),
                };
            });

        const applySheetStyling = (ws, dataRowCount, customCols = null) => {
            ws["!cols"] = customCols || [
                { wch: 46 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
                { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 },
            ];

            ws["!freeze"] = { xSplit: 0, ySplit: 4 };
            ws["!autofilter"] = {
                ref: `A4:${colLetter((ws["!cols"]?.length || headers.length) - 1)}4`,
            };

            const colCount = ws["!cols"]?.length || headers.length;

            for (let c = 0; c < colCount; c++) {
                setCellStyle(ws, `${colLetter(c)}1`, metaStyleDark);
                setCellStyle(ws, `${colLetter(c)}2`, metaStyleSoft);
                setCellStyle(ws, `${colLetter(c)}3`, { fill: fill("FFFFFFFF"), border: borderAll });
                setCellStyle(ws, `${colLetter(c)}4`, headerStyle);
            }

            const localHeaders = [];
            for (let c = 0; c < colCount; c++) {
                localHeaders.push(ws[`${colLetter(c)}4`]?.v);
            }

            const lateColIndex = localHeaders.indexOf("GEÇ TEDARİK");
            const zamanindaColIndex = localHeaders.indexOf("ZAMANINDA ORANI (%)");
            for (let r = 5; r <= 4 + dataRowCount; r++) {
                const zebra = (r - 5) % 2 === 1 ? rowFillB : rowFillA;

                for (let c = 0; c < colCount; c++) {
                    const addr = `${colLetter(c)}${r}`;

                    setCellStyle(ws, addr, {
                        fill: zebra,
                        border: borderAll,
                        alignment: align(c === 0 ? "left" : "center"),
                        font: font(false, "FF0F172A"),
                    });

                    if (c >= 1 && c !== zamanindaColIndex && ws[addr]) {
                        ws[addr].z = "#,##0";
                    }

                    if (c === lateColIndex && ws[addr]) {
                        setCellStyle(ws, addr, {
                            fill: lateFill(ws[addr].v ?? 0),
                            font: font(true, "FFFFFFFF"),
                            alignment: align("center"),
                            border: borderAll,
                        });
                    }

                    if (c === zamanindaColIndex && ws[addr]) {
                        const v = ws[addr].v;
                        if (typeof v !== "number") {
                            setCellStyle(ws, addr, {
                                fill: zebra,
                                border: borderAll,
                                alignment: align("center"),
                                font: font(true, "FF64748B"),
                            });
                            delete ws[addr].z;
                        } else {
                            setCellStyle(ws, addr, {
                                fill: perfFill(v),
                                font: font(true, "FFFFFFFF"),
                                alignment: align("center"),
                                border: borderAll,
                            });
                            ws[addr].z = '0"%"';
                        }
                    }
                }
            }
        };

        const buildRegionSheet = (sheetName, rows, metaLeftText) => {
            const today = new Date();
            const blank = Array(headers.length).fill("");

            const aoa = [
                [metaLeftText, ...Array(headers.length - 1).fill("")],
                [`Oluşturma: ${today.toLocaleString("tr-TR")}`, ...Array(headers.length - 1).fill("")],
                blank,
                headers,
            ];

            rows.forEach((r) => aoa.push(headers.map((h) => r[h] ?? "")));

            const totals = rows.reduce(
                (acc, r) => {
                    acc.TALEP += Number(r.TALEP || 0);
                    acc.TEDARİK += Number(r.TEDARİK || 0);
                    acc.EDİLMEYEN += Number(r.EDİLMEYEN || 0);
                    acc.GEC += Number(r["GEÇ TEDARİK"] || 0);
                    acc.SPOT += Number(r.SPOT || 0);
                    acc.FILO += Number(r.FİLO || 0);
                    acc.SHO_VAR += Number(r["SHÖ VAR"] || 0);
                    acc.SHO_YOK += Number(r["SHÖ YOK"] || 0);
                    return acc;
                },
                {
                    TALEP: 0,
                    TEDARİK: 0,
                    EDİLMEYEN: 0,
                    GEC: 0,
                    SPOT: 0,
                    FILO: 0,
                    SHO_VAR: 0,
                    SHO_YOK: 0,
                }
            );

            const toplamZamanindaOrani = zamanindaOraniHesapla(
                totals.TALEP,
                totals.TEDARİK,
                totals.GEC
            );
            aoa.push([
                "TOPLAM",
                totals.TALEP,
                totals.TEDARİK,
                totals.EDİLMEYEN,
                totals.GEC,
                totals.SPOT,
                totals.FILO,
                totals.SHO_VAR,
                totals.SHO_YOK,
                toplamZamanindaOrani,
            ]);
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            applySheetStyling(ws, rows.length);

            XLSX.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
        };

        Object.keys(regionsMap || {}).forEach((bolge) => {
            buildRegionSheet(
                bolge,
                buildRowsFromProjectList(regionsMap?.[bolge] || []),
                `Bölge: ${bolge}`
            );
        });

        const tumProjelerListesi = Array.from(
            new Set(Object.values(regionsMap || {}).flatMap((arr) => (Array.isArray(arr) ? arr : [])))
        ).sort((a, b) => String(a).localeCompare(String(b), "tr"));

        const allRows = buildRowsFromProjectList(tumProjelerListesi);

        buildRegionSheet("TÜM PROJELER", allRows, "Tüm Bölgeler: TÜM PROJELER");

        const out = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array",
            cellStyles: true,
        });

        saveAs(
            new Blob([out], { type: "application/octet-stream" }),
            `AnalizPanel_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
    };

    /* ─── Geç sefer detay Excel ─────────────────────────────────────────── */
    const gecSeferDetaylariniExceleAktar = async () => {
        if (!yuklemeTarihleriHazirMi) {
            setExcelUyari("Önce Yükleme Tarihleri butonuna basınız.");
            return;
        }

        try {
            setDetayExcelYukleniyor(true);

            const seciliBolgeProjeleri = regionsMap?.[seciliBolge] || [];
            const projeSeti = new Set(seciliBolgeProjeleri.map((x) => norm(x)));

            const detaylar = (Array.isArray(data) ? data : [])
                .filter((item) => {
                    let finalProjectName = item.ProjectName;
                    const pNorm = norm(item.ProjectName);

                    if (pNorm === norm("KÜÇÜKBAY FTL")) {
                        const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                        if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                        else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                        else return false;
                    }

                    if (pNorm === norm("PEPSİ FTL")) {
                        const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                        if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL  ÇORLU";
                        else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
                    }

                    if (pNorm === norm("EBEBEK FTL")) {
                        const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                        if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
                    }

                    if (pNorm === norm("FAKİR FTL")) {
                        const c = norm(item.PickupCityName), d = norm(item.PickupCountyName);
                        if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
                    }

                    if (pNorm === norm("MODERN BOBİN FTL")) {
                        const c = norm(item.PickupCityName);
                        if (c === norm("ZONGULDAK")) finalProjectName = "MODERN BOBİN ZONGULDAK FTL";
                        else if (c === norm("TEKİRDAĞ")) finalProjectName = "MODERN BOBİN TEKİRDAĞ FTL";
                        else return false;
                    }

                    if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN A ÇIKILIYOR)";

                    const service = norm(item.ServiceName);
                    const inScope =
                        service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                        service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                        service === norm("YURTİÇİ FRİGO HİZMETLERİ");

                    if (!inScope) return false;
                    if (!projeSeti.has(norm(finalProjectName))) return false;

                    const despKey = seferNoNormalizeEt(item?.TMSDespatchDocumentNo || "");
                    if (!despKey || !despKey.startsWith("SFR")) return false;

                    return isGecTedarik(item?.PickupDate, item?.TMSLoadingDocumentPrintedDate);
                })
                .map((item, idx) => {
                    const seferNo = item?.TMSDespatchDocumentNo || "";
                    const excelKey = seferNoNormalizeEt(seferNo);
                    const excelKaydi = excelTarihleriSeferBazli?.[excelKey] || {};

                    const pickup = parseTRDateTime(item?.PickupDate);
                    const loading = parseTRDateTime(item?.TMSLoadingDocumentPrintedDate);

                    const farkSaat =
                        pickup && loading
                            ? Number(((loading.getTime() - pickup.getTime()) / (1000 * 60 * 60)).toFixed(2))
                            : null;

                    return {
                        SIRA: idx + 1,
                        PROJE: item?.ProjectName || "—",
                        "SEFER NO": seferNo || "—",
                        "ARAÇ TALEP NO": item?.TMSVehicleRequestDocumentNo || "—",
                        MÜŞTERİ: item?.CurrentAccountTitle || "—",
                        SERVİS: item?.ServiceName || "—",
                        "YÜKLEME İL": item?.PickupCityName || "—",
                        "YÜKLEME İLÇE": item?.PickupCountyName || "—",
                        "TESLİMAT İL": item?.DeliveryCityName || "—",
                        "TESLİMAT İLÇE": item?.DeliveryCountyName || "—",
                        "YÜKLEME TARİHİ": formatDateTimeTR(item?.PickupDate),
                        "YÜKLEMEYE GELİŞ": formatDateTimeTR(item?.TMSLoadingDocumentPrintedDate),
                        "TAHMİNİ VARIŞ": formatDateTimeTR(item?.EstimatedArrivalTime),
                        "FARK (SAAT)": farkSaat ?? "—",
                        "PRINT EDEN": item?.TMSLoadingDocumentPrintedBy || "—",
                        "EXCEL YÜKLEME VARIŞ": formatDateTimeTR(excelKaydi?.yukleme_varis),
                        "EXCEL YÜKLEME GİRİŞ": formatDateTimeTR(excelKaydi?.yukleme_giris),
                        "EXCEL YÜKLEME ÇIKIŞ": formatDateTimeTR(excelKaydi?.yukleme_cikis),
                        "EXCEL TESLİM VARIŞ": formatDateTimeTR(excelKaydi?.teslim_varis),
                        "EXCEL TESLİM GİRİŞ": formatDateTimeTR(excelKaydi?.teslim_giris),
                        "EXCEL TESLİM ÇIKIŞ": formatDateTimeTR(excelKaydi?.teslim_cikis),
                    };
                });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(detaylar);

            ws["!cols"] = [
                { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 28 },
                { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
                { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
                { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            ];

            const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = XLSX.utils.encode_cell({ r: 0, c });
                if (!ws[cell]) continue;
                ws[cell].s = {
                    font: { bold: true, color: { rgb: "FFFFFFFF" } },
                    fill: { patternType: "solid", fgColor: { rgb: "FF2563EB" } },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                };
            }

            XLSX.utils.book_append_sheet(wb, ws, "Gec Sefer Detay");
            const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });

            saveAs(
                new Blob([out], { type: "application/octet-stream" }),
                `GecSeferDetay_${seciliBolge || "BOLGE"}_${new Date().toISOString().slice(0, 10)}.xlsx`
            );
        } catch (err) {
            console.error("Geç sefer detay export hatası:", err);
            setExcelUyari("Geç sefer detay Excel oluşturulurken bir hata oluştu.");
        } finally {
            setDetayExcelYukleniyor(false);
        }
    };

    const BLUE = "#60A5FA";
    const GREEN = "#34D399";
    const RED = "#F87171";
    const AMBER = "#FBBF24";
    const INDIGO = "#818CF8";

    return (
        <Box
            sx={{
                width: "100%",
                background: isDark
                    ? "radial-gradient(ellipse at 10% 0%, rgba(99,102,241,0.08) 0%, transparent 40%), radial-gradient(ellipse at 90% 100%, rgba(59,130,246,0.06) 0%, transparent 40%), #070B14"
                    : "radial-gradient(ellipse at 10% 0%, rgba(99,102,241,0.05) 0%, transparent 40%), #F0F4FF",
                minHeight: "100vh",
            }}
        >
            <Root>
                <Wide>
                    <Box sx={{ pt: 3, pb: 2, px: { xs: 2, md: 3 } }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "14px",
                                    flexShrink: 0,
                                    background: "linear-gradient(135deg, #818CF8, #6366F1)",
                                    display: "grid",
                                    placeItems: "center",
                                    boxShadow: "0 0 24px rgba(99,102,241,0.4), 0 4px 12px rgba(0,0,0,0.3)",
                                }}
                            >
                                <TbLayoutDashboard size={22} color="#fff" />
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="baseline" spacing={1.5}>
                                    <Typography
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: { xs: "1.1rem", md: "1.35rem" },
                                            letterSpacing: "-0.04em",
                                            color: isDark ? "#E8EEFF" : "#0F1729",
                                            lineHeight: 1,
                                        }}
                                    >
                                        Analiz Paneli
                                    </Typography>

                                    <Box
                                        sx={{
                                            px: 1.2,
                                            py: 0.3,
                                            borderRadius: "8px",
                                            background: "rgba(99,102,241,0.15)",
                                            border: "0.5px solid rgba(99,102,241,0.3)",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 800,
                                                letterSpacing: "0.1em",
                                                color: "#818CF8",
                                                textTransform: "uppercase",
                                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                            }}
                                        >
                                            CANLI
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Typography
                                    sx={{
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        mt: 0.5,
                                        color: isDark ? "rgba(160,170,200,0.5)" : "rgba(80,90,120,0.55)",
                                        letterSpacing: "0.01em",
                                    }}
                                >
                                    Tedarik · Performans · Rota · Zaman Analizi
                                </Typography>
                            </Box>

                            <Tooltip
                                title="30 saat kuralı: yükleme tarihinden yüklemeye gelişe kadar geçen süre baz alınır."
                                placement="left"
                            >
                                <IconButton
                                    size="small"
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "10px",
                                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                                        border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                                        color: isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.5)",
                                        "&:hover": { background: "rgba(99,102,241,0.1)", color: "#818CF8" },
                                    }}
                                >
                                    <MdInfoOutline size={16} />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        <Box
                            sx={{
                                display: "grid",
                                gap: 1.5,
                                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
                                mb: 2.5,
                            }}
                        >
                            <KPICard
                                title="Toplam Talep"
                                value={kpi.plan}
                                accentColor={BLUE}
                                icon={<MdTrendingUp />}
                                isDark={isDark}
                                meta={`Bölge: ${seciliBolge || "—"}`}
                            />
                            <KPICard
                                title="Tedarik Edilen"
                                value={kpi.ted}
                                accentColor={GREEN}
                                icon={<MdBolt />}
                                isDark={isDark}
                                meta={`SPOT ${kpi.spot} · FİLO ${kpi.filo}`}
                            />
                            <KPICard
                                title="Tedarik Edilmeyen"
                                value={kpi.edilmeyen}
                                accentColor={RED}
                                icon={<MdCancel />}
                                isDark={isDark}
                            />
                            <KPICard
                                title="Geç Tedarik"
                                value={kpi.gec}
                                accentColor={AMBER}
                                icon={<TbClockHour4 />}
                                isDark={isDark}
                            />
                            <KPICard
                                title="Zamanında Oran"
                                value={kpi.perf}
                                suffix="%"
                                accentColor={perfC.main}
                                icon={<RiPulseLine />}
                                isDark={isDark}
                            />
                        </Box>

                        <Box
                            sx={{
                                borderRadius: "20px",
                                overflow: "hidden",
                                background: isDark ? "rgba(10, 14, 26, 0.7)" : "rgba(255,255,255,0.75)",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                                backdropFilter: "blur(24px)",
                                boxShadow: isDark
                                    ? "0 8px 32px rgba(0,0,0,0.4)"
                                    : "0 4px 24px rgba(0,0,0,0.06)",
                            }}
                        >
                            <Box
                                sx={{
                                    p: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.25,
                                    flexWrap: "wrap",
                                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                                }}
                            >
                                <TextField
                                    size="small"
                                    placeholder="Proje ara..."
                                    value={arama}
                                    onChange={(e) => setArama(e.target.value)}
                                    sx={{
                                        minWidth: { xs: "100%", md: 240 },
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "12px",
                                            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MdSearch />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Select
                                    size="small"
                                    value={sirala}
                                    onChange={(e) => setSirala(e.target.value)}
                                    sx={{
                                        minWidth: 170,
                                        borderRadius: "12px",
                                        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                    }}
                                    startAdornment={
                                        <InputAdornment position="start">
                                            <MdFilterList />
                                        </InputAdornment>
                                    }
                                >
                                    <MenuItem value="perf">Performansa Göre</MenuItem>
                                    <MenuItem value="plan">Talebe Göre</MenuItem>
                                    <MenuItem value="late">Geç Tedarike Göre</MenuItem>
                                </Select>

                                <FilterChip
                                    label="Sadece Gecikenler"
                                    active={sadeceGecikenler}
                                    onToggle={() => setSadeceGecikenler((p) => !p)}
                                    color={AMBER}
                                    isDark={isDark}
                                />
                                <FilterChip
                                    label="Sadece Tedarik Edilmeyenler"
                                    active={sadeceTedarikEdilmeyenler}
                                    onToggle={() => setSadeceTedarikEdilmeyenler((p) => !p)}
                                    color={RED}
                                    isDark={isDark}
                                />

                                <Box sx={{ ml: "auto", display: "flex", gap: 0.75, flexShrink: 0 }}>
                                    <Tooltip title="Tüm bölgeler dahil, tab geçişli interaktif HTML raporu — maille göndermek için ideal">
                                        <Box>
                                            <GlassButton
                                                icon={<MdInsertDriveFile size={15} />}
                                                label="HTML Rapor"
                                                onClick={interaktifHTMLRaporuIndir}
                                                accent={INDIGO}
                                                isDark={isDark}
                                            />
                                        </Box>
                                    </Tooltip>

                                    <Tooltip
                                        title={
                                            yuklemeTarihleriHazirMi
                                                ? "Bölge özet Excel çıktısı"
                                                : "Önce Yükleme Tarihleri butonuna basınız."
                                        }
                                    >
                                        <Box>
                                            <GlassButton
                                                icon={<MdDownload size={15} />}
                                                label="Excel İndir"
                                                onClick={bolgeyiExceleAktar}
                                                accent={GREEN}
                                                isDark={isDark}
                                            />
                                        </Box>
                                    </Tooltip>

                                    <Tooltip
                                        title={
                                            yuklemeTarihleriHazirMi
                                                ? "Geç seferlerin detay satırlarını indir"
                                                : "Önce Yükleme Tarihleri butonuna basınız."
                                        }
                                    >
                                        <Box>
                                            <GlassButton
                                                icon={<MdFileDownload size={15} />}
                                                label="Geç Sefer Detay"
                                                onClick={gecSeferDetaylariniExceleAktar}
                                                loading={detayExcelYukleniyor}
                                                accent={AMBER}
                                                isDark={isDark}
                                            />
                                        </Box>
                                    </Tooltip>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    px: 2,
                                    py: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 1,
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.25}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.75,
                                            px: 1,
                                            py: 0.4,
                                            borderRadius: "8px",
                                            background: `${GREEN}12`,
                                            border: `0.5px solid ${GREEN}22`,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: GREEN,
                                                boxShadow: `0 0 6px ${GREEN}`,
                                            }}
                                        />
                                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: GREEN, letterSpacing: "0.02em" }}>
                                            {satirlar.length} proje
                                        </Typography>
                                    </Box>

                                    {!!excelIcerikBilgisi && (
                                        <Box
                                            sx={{
                                                px: 1,
                                                py: 0.4,
                                                borderRadius: "8px",
                                                background: "rgba(129,140,248,0.12)",
                                                border: "0.5px solid rgba(129,140,248,0.22)",
                                            }}
                                        >
                                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#818CF8", letterSpacing: "0.02em" }}>
                                                Excel Sefer: {excelCount}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>

                                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                                    {bolgeler.map((bolge) => (
                                        <RegionTab
                                            key={bolge}
                                            label={bolge}
                                            count={(regionsMap?.[bolge] || []).length}
                                            selected={seciliBolge === bolge}
                                            onClick={() => setSeciliBolge(bolge)}
                                            isDark={isDark}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
                        <Stack spacing={1.25}>
                            <AnimatePresence mode="popLayout">
                                {satirlar.map((satir) => (
                                    <motion.div
                                        key={satir.name}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <ProjeSatiri
                                            satir={satir}
                                            tumVeri={data}
                                            excelTarihleriSeferBazli={excelTarihleriSeferBazli}
                                            printsMap={printsMap}
                                            printsLoading={printsLoading}
                                            vehicleMap={vehicleMap}
                                            vehicleLoading={vehicleLoading}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {satirlar.length === 0 && (
                                <Box
                                    sx={{
                                        py: 8,
                                        textAlign: "center",
                                        borderRadius: "16px",
                                        border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.75)",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "0.95rem",
                                            fontWeight: 700,
                                            color: isDark ? "rgba(160,170,200,0.55)" : "rgba(80,90,120,0.55)",
                                        }}
                                    >
                                        Kriterlere uygun proje bulunamadı.
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Wide>

                <AnimatePresence>
                    {excelUyari && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            style={{
                                position: "fixed",
                                right: 20,
                                bottom: 20,
                                zIndex: 2000,
                            }}
                        >
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 1.1,
                                    borderRadius: "12px",
                                    background: isDark ? "rgba(127, 29, 29, 0.95)" : "rgba(254, 242, 242, 0.98)",
                                    border: `1px solid ${isDark ? "rgba(248,113,113,0.35)" : "rgba(239,68,68,0.25)"}`,
                                    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    maxWidth: 420,
                                }}
                            >
                                <Box sx={{ color: RED, display: "flex", flexShrink: 0 }}>
                                    <MdWarning size={18} />
                                </Box>

                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: isDark ? "#FEE2E2" : "#991B1B",
                                        lineHeight: 1.35,
                                    }}
                                >
                                    {excelUyari}
                                </Typography>

                                <IconButton
                                    size="small"
                                    onClick={() => setExcelUyari("")}
                                    sx={{
                                        ml: 0.5,
                                        color: isDark ? "#FCA5A5" : "#B91C1C",
                                        flexShrink: 0,
                                    }}
                                >
                                    <MdCancel size={16} />
                                </IconButton>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Root>
        </Box>
    );
}