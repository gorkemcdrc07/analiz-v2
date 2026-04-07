// src/ozellikler/analiz-paneli/AnalizTablosu.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
    Box, Typography, Stack, TextField, InputAdornment,
    Select, MenuItem, Tooltip, IconButton, alpha, ButtonBase, Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    MdMonitor, MdSearch, MdHistory, MdDownload, MdTrendingUp,
    MdBolt, MdWarning, MdCancel, MdInfoOutline, MdFilterList,
    MdSpeed, MdArrowUpward, MdArrowDownward,
} from "react-icons/md";
import { RiTruckLine, RiPulseLine, RiMapPin2Line } from "react-icons/ri";
import { TbLayoutDashboard, TbChartBar, TbRoute, TbClockHour4 } from "react-icons/tb";
import { AnimatePresence, motion, useSpring, useMotionValue } from "framer-motion";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import ProjeSatiri from "./bilesenler/ProjeSatiri";
import { metniNormalizeEt as norm, seferNoNormalizeEt } from "../yardimcilar/metin";
import { Root, Wide, TopBar, Grid, CardList } from "../stiller/stilBilesenleri";

/* ─── yardımcılar ────────────────────────────────────────────────────────── */
const mergeKeepFilled = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

const booleanCevir = (v) => v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
const sayiCevir = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s0 = String(v).trim();
    if (!s0) return null;
    const isoFix = (s) => {
        const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([Zz]|([+-]\d{2}:\d{2}))?$/);
        if (!m) return s;
        const ms3 = m[3] ? (m[3] + "000").slice(0, 3) : "";
        return `${m[1]}${ms3 ? "." + ms3 : ""}${m[4] || ""}`;
    };
    const s = isoFix(s0);
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
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
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
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

/* ─── Performans Renk Sistemi ────────────────────────────────────────────── */
const perfColor = (p) => {
    if (p >= 95) return { main: "#00E5A0", dim: "rgba(0,229,160,0.12)", text: "#00E5A0" };
    if (p >= 85) return { main: "#4ADE80", dim: "rgba(74,222,128,0.12)", text: "#4ADE80" };
    if (p >= 70) return { main: "#60A5FA", dim: "rgba(96,165,250,0.12)", text: "#60A5FA" };
    if (p >= 50) return { main: "#FBBF24", dim: "rgba(251,191,36,0.12)", text: "#FBBF24" };
    return { main: "#F87171", dim: "rgba(248,113,113,0.12)", text: "#F87171" };
};

/* ─── Animasyonlu Sayaç ──────────────────────────────────────────────────── */
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
    }, [value]);

    return <>{prefix}{display}{suffix}</>;
}

/* ─── KPI Kart ───────────────────────────────────────────────────────────── */
function KPICard({ title, value, suffix = "", meta, icon, accentColor, isDark, trend, children }) {
    const acc = accentColor || "#818CF8";
    const dimColor = `${acc}18`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
            <Box sx={{
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
            }}>
                {/* Arka plan doku */}
                <Box sx={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: `radial-gradient(ellipse at 90% 10%, ${dimColor} 0%, transparent 60%)`,
                }} />

                {/* Sol kenar çizgisi */}
                <Box sx={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%", width: "2.5px",
                    borderRadius: "0 2px 2px 0",
                    background: `linear-gradient(180deg, transparent, ${acc}, transparent)`,
                }} />

                <Stack spacing={1.25} sx={{ position: "relative" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                        <Typography sx={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: isDark ? `${acc}BB` : `${acc}99`,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                        }}>
                            {title}
                        </Typography>
                        <Box sx={{
                            width: 32, height: 32, borderRadius: "10px",
                            display: "grid", placeItems: "center",
                            background: dimColor,
                            border: `1px solid ${acc}25`,
                            color: acc,
                            fontSize: 16,
                        }}>
                            {icon}
                        </Box>
                    </Stack>

                    {children ?? (
                        <>
                            <Typography sx={{
                                fontSize: "2rem",
                                fontWeight: 900,
                                lineHeight: 1,
                                letterSpacing: "-0.04em",
                                color: isDark ? "#F0F4FF" : "#0F1729",
                                fontVariantNumeric: "tabular-nums",
                            }}>
                                <AnimatedNumber value={typeof value === "number" ? value : 0} suffix={suffix} />
                                {typeof value === "string" ? value : ""}
                            </Typography>
                            {meta && (
                                <Typography sx={{
                                    fontSize: "0.7rem", fontWeight: 600,
                                    color: isDark ? "rgba(160,170,200,0.6)" : "rgba(100,110,140,0.7)",
                                }}>
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

/* ─── Mini Badge ─────────────────────────────────────────────────────────── */
function MetaBadge({ label, value, color, isDark }) {
    return (
        <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 0.5,
            px: 1, py: 0.4, borderRadius: "7px",
            background: `${color}14`,
            border: `0.5px solid ${color}28`,
        }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.67rem", fontWeight: 700, color: isDark ? `${color}CC` : `${color}AA`, letterSpacing: "0.04em" }}>
                {label}: <Box component="span" sx={{ color: isDark ? "#E0E8FF" : "#1A2140", fontWeight: 800 }}>{value}</Box>
            </Typography>
        </Box>
    );
}

/* ─── Toggle Filtre ──────────────────────────────────────────────────────── */
function FilterChip({ label, active, onToggle, color, isDark }) {
    return (
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Box
                onClick={onToggle}
                sx={{
                    display: "flex", alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.65, borderRadius: "10px",
                    cursor: "pointer",
                    border: `1px solid ${active ? `${color}40` : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                    background: active
                        ? `${color}15`
                        : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: active ? `0 0 12px ${color}20` : "none",
                }}
            >
                <Box sx={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: active ? color : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                    boxShadow: active ? `0 0 6px ${color}` : "none",
                    transition: "all 0.2s",
                    flexShrink: 0,
                }} />
                <Typography sx={{
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    color: active ? color : (isDark ? "rgba(160,170,200,0.6)" : "rgba(100,110,140,0.6)"),
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                }}>
                    {label}
                </Typography>
            </Box>
        </motion.div>
    );
}

/* ─── Aksiyon Butonu ─────────────────────────────────────────────────────── */
function GlassButton({ icon, label, onClick, loading, accent, isDark }) {
    const acc = accent || "#818CF8";
    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={loading ? undefined : onClick}
            style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
            <Box sx={{
                display: "flex", alignItems: "center", gap: 1,
                px: 1.75, py: 0.9, borderRadius: "12px",
                background: isDark
                    ? `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))`
                    : `linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,255,0.9))`,
                border: `1px solid ${acc}28`,
                boxShadow: `0 0 0 0.5px ${acc}15, 0 2px 12px rgba(0,0,0,${isDark ? 0.3 : 0.08})`,
                backdropFilter: "blur(12px)",
                transition: "all 0.2s",
                "&:hover": {
                    background: `${acc}18`,
                    borderColor: `${acc}45`,
                    boxShadow: `0 0 16px ${acc}20, 0 4px 20px rgba(0,0,0,${isDark ? 0.4 : 0.1})`,
                },
            }}>
                {loading ? (
                    <Box sx={{
                        width: 15, height: 15, borderRadius: "50%",
                        border: `2px solid ${acc}30`,
                        borderTopColor: acc,
                        animation: "spin 0.8s linear infinite",
                        "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                    }} />
                ) : (
                    <Box sx={{ color: acc, display: "flex", fontSize: 15 }}>{icon}</Box>
                )}
                <Typography sx={{
                    fontSize: "0.77rem", fontWeight: 800, letterSpacing: "0.02em",
                    color: isDark ? "rgba(220,228,255,0.85)" : "rgba(30,40,80,0.8)",
                    display: { xs: "none", md: "block" },
                }}>
                    {loading ? "Yükleniyor..." : label}
                </Typography>
            </Box>
        </motion.div>
    );
}

/* ─── Stat Pill ──────────────────────────────────────────────────────────── */
function LiveStat({ icon, label, value, color, isDark, loading }) {
    return (
        <Box sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            px: 1.25, py: 0.6, borderRadius: "9px",
            background: `${color}10`,
            border: `0.5px solid ${color}25`,
        }}>
            <Box sx={{ color, display: "flex", fontSize: 13 }}>{icon}</Box>
            <Typography sx={{
                fontSize: "0.7rem", fontWeight: 700,
                color: isDark ? `${color}CC` : `${color}99`,
                letterSpacing: "0.03em",
            }}>
                {label}
            </Typography>
            <Typography sx={{
                fontSize: "0.72rem", fontWeight: 900,
                color: loading
                    ? (isDark ? "rgba(160,170,200,0.4)" : "rgba(100,110,140,0.4)")
                    : (isDark ? "#E0E8FF" : "#1A2140"),
            }}>
                {loading ? "..." : value}
            </Typography>
        </Box>
    );
}

/* ─── Bölge Tab ──────────────────────────────────────────────────────────── */
function RegionTab({ label, count, selected, onClick, isDark }) {
    return (
        <Box sx={{ position: "relative" }}>
            {selected && (
                <motion.div
                    layoutId="regionSelected"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    style={{
                        position: "absolute", inset: 0, borderRadius: 12,
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
                    px: 2, py: 1, borderRadius: "12px",
                    display: "flex", alignItems: "center", gap: 1.25, zIndex: 1, position: "relative",
                    transition: "color 0.2s",
                }}
            >
                <Typography sx={{
                    fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.02em",
                    color: selected ? "#C7D2FE" : (isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.6)"),
                    transition: "color 0.2s",
                }}>
                    {label}
                </Typography>
                <Box sx={{
                    px: 0.9, py: 0.15, borderRadius: "6px", minWidth: 22, textAlign: "center",
                    background: selected ? "rgba(129,140,248,0.2)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                    border: `0.5px solid ${selected ? "rgba(129,140,248,0.3)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                }}>
                    <Typography sx={{
                        fontSize: "0.65rem", fontWeight: 800, lineHeight: 1.5,
                        color: selected ? "#A5B4FC" : (isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.5)"),
                        fontVariantNumeric: "tabular-nums",
                    }}>
                        {String(count).padStart(2, "0")}
                    </Typography>
                </Box>
            </ButtonBase>
        </Box>
    );
}

/* ─── ANA BİLEŞEN ────────────────────────────────────────────────────────── */
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
                        const seferKey = seferNoNormalizeEt(pickColumn(r, ["Sefer Numarası", "Sefer No", "SeferNo", "Sefer", "Sefer Numarasi"]));
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
                        [tt.yukleme_varis, tt.yukleme_giris, tt.yukleme_cikis, tt.teslim_varis, tt.teslim_giris, tt.teslim_cikis].some(x => x != null && x !== "" && x !== "---")
                    ).length;
                    setExcelIcerikBilgisi({ totalRows: json.length, withSefer, withAnyDate });
                    setExcelTarihleriSeferBazli(map);
                } catch (err) { console.error("Excel okuma hatası:", err); }
                finally { setExcelOkunuyor(false); }
            };
            input.click();
        } catch (err) { console.error("Excel seçme hatası:", err); }
    };

    /* ── veri işleme ─────────────────────────────────────────────────────── */
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
            if (!stats[key]) stats[key] = { plan: new Set(), ted: new Set(), iptal: new Set(), filo: new Set(), spot: new Set(), sho_b: new Set(), sho_bm: new Set(), gec_tedarik: new Set() };

            const s = stats[key];
            const service = norm(item.ServiceName);
            const inScope = service === norm("YURTİÇİ FTL HİZMETLERİ") || service === norm("FİLO DIŞ YÜK YÖNETİMİ") || service === norm("YURTİÇİ FRİGO HİZMETLERİ");
            if (!inScope) return;

            const reqNoUp = (item.TMSVehicleRequestDocumentNo || "").toString().replace(/\u00A0/g, " ").replace(/\u200B/g, "").replace(/\r?\n/g, " ").trim().toLocaleUpperCase("tr-TR");
            if (reqNoUp && !reqNoUp.startsWith("BOS")) s.plan.add(reqNoUp);

            const despKey = seferNoNormalizeEt((item.TMSDespatchDocumentNo || "").toString());
            if (!despKey || !despKey.startsWith("SFR")) return;

            if (sayiCevir(item.OrderStatu) === 200) { s.iptal.add(despKey); return; }

            s.ted.add(despKey);
            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm(" -ZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despKey); else s.spot.add(despKey);
            if (booleanCevir(item.IsPrint)) s.sho_b.add(despKey); else s.sho_bm.add(despKey);
            if (isGecTedarik(item.PickupDate, item.TMSLoadingDocumentPrintedDate)) s.gec_tedarik.add(despKey);
        });

        return stats;
    }, [data]);

    const satirlar = useMemo(() => {
        const q = norm(arama);
        const bolgeListesi = regionsMap?.[seciliBolge] || [];
        const base = bolgeListesi.map((projeAdi) => {
            const s = islenmisVeri[norm(projeAdi)] || { plan: new Set(), ted: new Set(), iptal: new Set(), filo: new Set(), spot: new Set(), sho_b: new Set(), sho_bm: new Set(), gec_tedarik: new Set() };
            const plan = s.plan?.size ?? 0;
            const ted = s.ted?.size ?? 0;
            const iptal = s.iptal?.size ?? 0;
            const edilmeyen = Math.max(0, plan - (ted + iptal));
            const gec = s.gec_tedarik?.size ?? 0;
            const zamaninda = Math.max(0, ted - gec);
            const yuzde = ted > 0 ? Math.max(0, Math.min(100, Math.round((zamaninda / ted) * 100))) : 0;
            return { name: projeAdi, plan, ted, edilmeyen, iptal, spot: s.spot?.size ?? 0, filo: s.filo?.size ?? 0, sho_b: s.sho_b?.size ?? 0, sho_bm: s.sho_bm?.size ?? 0, zamaninda, gec, yuzde };
        })
            .filter(r => r.plan > 0)
            .filter(r => q ? norm(r.name).includes(q) : true)
            .filter(r => sadeceGecikenler ? r.gec > 0 : true)
            .filter(r => sadeceTedarikEdilmeyenler ? r.edilmeyen > 0 : true);

        return [...base].sort((a, b) => {
            if (sadeceGecikenler) return b.gec - a.gec;
            if (sadeceTedarikEdilmeyenler) return b.edilmeyen - a.edilmeyen;
            if (sirala === "plan") return b.plan - a.plan;
            if (sirala === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde;
        });
    }, [seciliBolge, islenmisVeri, arama, sirala, sadeceGecikenler, sadeceTedarikEdilmeyenler, regionsMap]);

    const kpi = useMemo(() => {
        const sum = satirlar.reduce((acc, r) => {
            acc.plan += r.plan; acc.ted += r.ted; acc.edilmeyen += r.edilmeyen;
            acc.spot += r.spot; acc.filo += r.filo; acc.gec += r.gec; acc.zamaninda += r.zamaninda;
            return acc;
        }, { plan: 0, ted: 0, edilmeyen: 0, spot: 0, filo: 0, gec: 0, zamaninda: 0 });
        sum.perf = sum.ted ? Math.max(0, Math.min(100, Math.round((sum.zamaninda / sum.ted) * 100))) : 0;
        return sum;
    }, [satirlar]);

    const perfC = perfColor(kpi.perf);
    const printsCount = useMemo(() => Object.keys(printsMap || {}).length, [printsMap]);
    const vehicleCount = useMemo(() => Object.keys(vehicleMap || {}).length, [vehicleMap]);
    const excelCount = Object.keys(excelTarihleriSeferBazli || {}).length;

    /* ── Excel export ────────────────────────────────────────────────────── */
    const bolgeyiExceleAktar = () => {
        const toSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

        const colLetter = (n) => {
            let s = "", x = n + 1;
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

            // 🔥 kritik değişiklik
            if (p0 <= 0) return "TALEP YOK";

            if (t0 <= 0) return 0;

            return Math.max(
                0,
                Math.min(100, Math.round(((Math.max(0, t0 - g0)) / t0) * 100))
            );
        };
        const tedarikOraniHesapla = (plan, ted) => {
            const p0 = Number(plan) || 0;
            const t0 = Number(ted) || 0;
            if (p0 <= 0) return "TALEP YOK";
            return Math.max(0, Math.min(100, Math.round((t0 / p0) * 100)));
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
            "TEDARİK ORANI (%)",
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
                    "PROJE": projeAdi,
                    "TALEP": plan,
                    "TEDARİK": ted,
                    "EDİLMEYEN": edilmeyen,
                    "GEÇ TEDARİK": gecTedarik,
                    "SPOT": spot,
                    "FİLO": filo,
                    "SHÖ VAR": shoVar,
                    "SHÖ YOK": shoYok,
                    "ZAMANINDA ORANI (%)": zamanindaOraniHesapla(plan, ted, gecTedarik),
                    "TEDARİK ORANI (%)": tedarikOraniHesapla(plan, ted),
                };
            });

        const applySheetStyling = (ws, dataRowCount, customCols = null) => {
            ws["!cols"] = customCols || [
                { wch: 46 }, // PROJE
                { wch: 10 }, // TALEP
                { wch: 10 }, // TEDARİK
                { wch: 12 }, // EDİLMEYEN
                { wch: 12 }, // GEÇ TEDARİK
                { wch: 10 }, // SPOT
                { wch: 10 }, // FİLO
                { wch: 10 }, // SHÖ VAR
                { wch: 10 }, // SHÖ YOK
                { wch: 18 }, // ZAMANINDA ORANI
                { wch: 16 }, // TEDARİK ORANI
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
            const tedarikColIndex = localHeaders.indexOf("TEDARİK ORANI (%)");

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

                    if (
                        c >= 1 &&
                        c !== zamanindaColIndex &&
                        c !== tedarikColIndex &&
                        ws[addr]
                    ) {
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

                    if ((c === zamanindaColIndex || c === tedarikColIndex) && ws[addr]) {
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
                    acc.TALEP += Number(r["TALEP"] || 0);
                    acc.TEDARİK += Number(r["TEDARİK"] || 0);
                    acc.EDİLMEYEN += Number(r["EDİLMEYEN"] || 0);
                    acc.GEC += Number(r["GEÇ TEDARİK"] || 0);
                    acc.SPOT += Number(r["SPOT"] || 0);
                    acc.FILO += Number(r["FİLO"] || 0);
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

            const toplamZamanindaOrani = zamanindaOraniHesapla(totals.TEDARİK, totals.GEC);
            const toplamTedarikOrani = tedarikOraniHesapla(totals.TALEP, totals.TEDARİK);

            aoa.push(blank);
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
                toplamTedarikOrani,
            ]);

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            applySheetStyling(ws, rows.length);

            const totalRowIdx = 4 + rows.length + 2;
            const lateColIndex = headers.indexOf("GEÇ TEDARİK");
            const zamanindaColIndex = headers.indexOf("ZAMANINDA ORANI (%)");
            const tedarikColIndex = headers.indexOf("TEDARİK ORANI (%)");

            for (let c = 0; c < headers.length; c++) {
                const addr = `${colLetter(c)}${totalRowIdx}`;
                if (!ws[addr]) continue;

                setCellStyle(ws, addr, {
                    font: font(true, "FFFFFFFF"),
                    fill: fill("FF0F172A"),
                    alignment: align(c === 0 ? "left" : "center"),
                    border: borderAll,
                });

                if (c >= 1 && c !== zamanindaColIndex && c !== tedarikColIndex) {
                    ws[addr].z = "#,##0";
                }

                if (c === lateColIndex) {
                    setCellStyle(ws, addr, {
                        fill: lateFill(ws[addr].v ?? 0),
                        font: font(true, "FFFFFFFF"),
                    });
                }

                if (c === zamanindaColIndex || c === tedarikColIndex) {
                    const v = ws[addr].v;
                    if (typeof v === "number") {
                        setCellStyle(ws, addr, {
                            fill: perfFill(v),
                            font: font(true, "FFFFFFFF"),
                        });
                        ws[addr].z = '0"%"';
                    } else {
                        delete ws[addr].z;
                    }
                }
            }

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
            new Set(
                Object.values(regionsMap || {}).flatMap((arr) => (Array.isArray(arr) ? arr : []))
            )
        ).sort((a, b) => String(a).localeCompare(String(b), "tr"));

        const allRows = buildRowsFromProjectList(tumProjelerListesi);

        buildRegionSheet("TÜM PROJELER", allRows, "Tüm Bölgeler: TÜM PROJELER");

        const buildAnalizSheet = (rows) => {
            const ANALIZ_HEADERS = [
                "PROJE",
                "TALEP",
                "TEDARİK",
                "EDİLMEYEN",
                "ZAMANINDA ORANI (%)",
                "TEDARİK ORANI (%)",
                "GRAFİK",
            ];

            const sorted = [...rows].sort((a, b) => {
                const ap =
                    typeof a["ZAMANINDA ORANI (%)"] === "number"
                        ? a["ZAMANINDA ORANI (%)"]
                        : -1;
                const bp =
                    typeof b["ZAMANINDA ORANI (%)"] === "number"
                        ? b["ZAMANINDA ORANI (%)"]
                        : -1;
                return bp !== ap ? bp - ap : (b["TALEP"] || 0) - (a["TALEP"] || 0);
            });

            const today = new Date();
            const blank = Array(ANALIZ_HEADERS.length).fill("");

            const aoa = [
                ["ANALİZ: TÜM PROJELER (ORAN GRAFİĞİ)", ...Array(ANALIZ_HEADERS.length - 1).fill("")],
                [`Oluşturma: ${today.toLocaleString("tr-TR")}`, ...Array(ANALIZ_HEADERS.length - 1).fill("")],
                blank,
                ANALIZ_HEADERS,
            ];

            sorted.forEach((r) =>
                aoa.push([
                    r["PROJE"],
                    r["TALEP"],
                    r["TEDARİK"],
                    r["EDİLMEYEN"],
                    r["ZAMANINDA ORANI (%)"],
                    r["TEDARİK ORANI (%)"],
                    "",
                ])
            );

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            ws["!cols"] = [
                { wch: 46 },
                { wch: 10 },
                { wch: 10 },
                { wch: 12 },
                { wch: 18 },
                { wch: 16 },
                { wch: 34 },
            ];

            applySheetStyling(ws, sorted.length, ws["!cols"]);

            for (let r = 5; r <= 4 + sorted.length; r++) {
                const barCell = `G${r}`;
                ws[barCell] = ws[barCell] || {};
                ws[barCell].f = `IF(E${r}="TEDARİK YOK","",REPT("█",ROUND(E${r}/5,0))&REPT("░",20-ROUND(E${r}/5,0)))`;
                ws[barCell].s = {
                    font: { name: "Consolas", bold: true, color: { rgb: "FF0F172A" } },
                    alignment: { vertical: "center", horizontal: "left", wrapText: true },
                    border: borderAll,
                    fill: (r - 5) % 2 === 1 ? rowFillB : rowFillA,
                };
            }

            XLSX.utils.book_append_sheet(wb, ws, "ANALİZ");
        };

        buildAnalizSheet(allRows);

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
    /* ── Renk sabitleri ───────────────────────────────────────────────────── */
    const BLUE = "#60A5FA";
    const GREEN = "#34D399";
    const RED = "#F87171";
    const AMBER = "#FBBF24";
    const VIOLET = "#A78BFA";

    /* ─── RENDER ─────────────────────────────────────────────────────────── */
    return (
        <Box sx={{
            width: "100%",
            background: isDark
                ? "radial-gradient(ellipse at 10% 0%, rgba(99,102,241,0.08) 0%, transparent 40%), radial-gradient(ellipse at 90% 100%, rgba(59,130,246,0.06) 0%, transparent 40%), #070B14"
                : "radial-gradient(ellipse at 10% 0%, rgba(99,102,241,0.05) 0%, transparent 40%), #F0F4FF",
            minHeight: "100vh",
        }}>
            <Root>
                <Wide>
                    {/* ═══════════════════════════════════════════════════════
                        HEADER
                    ═══════════════════════════════════════════════════════ */}
                    <Box sx={{ pt: 3, pb: 2, px: { xs: 2, md: 3 } }}>

                        {/* Başlık */}
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <Box sx={{
                                width: 44, height: 44, borderRadius: "14px", flexShrink: 0,
                                background: "linear-gradient(135deg, #818CF8, #6366F1)",
                                display: "grid", placeItems: "center",
                                boxShadow: "0 0 24px rgba(99,102,241,0.4), 0 4px 12px rgba(0,0,0,0.3)",
                            }}>
                                <TbLayoutDashboard size={22} color="#fff" />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="baseline" spacing={1.5}>
                                    <Typography sx={{
                                        fontWeight: 900,
                                        fontSize: { xs: "1.1rem", md: "1.35rem" },
                                        letterSpacing: "-0.04em",
                                        color: isDark ? "#E8EEFF" : "#0F1729",
                                        lineHeight: 1,
                                    }}>
                                        Analiz Paneli
                                    </Typography>
                                    <Box sx={{
                                        px: 1.2, py: 0.3, borderRadius: "8px",
                                        background: "rgba(99,102,241,0.15)",
                                        border: "0.5px solid rgba(99,102,241,0.3)",
                                    }}>
                                        <Typography sx={{
                                            fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em",
                                            color: "#818CF8", textTransform: "uppercase",
                                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                                        }}>
                                            CANLI
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Typography sx={{
                                    fontSize: "0.72rem", fontWeight: 600, mt: 0.5,
                                    color: isDark ? "rgba(160,170,200,0.5)" : "rgba(80,90,120,0.55)",
                                    letterSpacing: "0.01em",
                                }}>
                                    Tedarik · Performans · Rota · Zaman Analizi
                                </Typography>
                            </Box>
                            <Tooltip title="30 saat kuralı: sefer açılışından yüklemeye kadar geçen süre baz alınır." placement="left">
                                <IconButton size="small" sx={{
                                    width: 34, height: 34, borderRadius: "10px",
                                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                                    color: isDark ? "rgba(160,170,200,0.5)" : "rgba(100,110,140,0.5)",
                                    "&:hover": { background: "rgba(99,102,241,0.1)", color: "#818CF8" },
                                }}>
                                    <MdInfoOutline size={16} />
                                </IconButton>
                            </Tooltip>
                        </Stack>

                        {/* ── KPI Kartları ─────────────────────────────────── */}
                        <Box sx={{
                            display: "grid", gap: 1.5,
                            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
                            mb: 2.5,
                        }}>
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
                                meta={`SPOT ${kpi.spot}  ·  FİLO ${kpi.filo}`}
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
                                title="Tedarik Oranı"
                                value={kpi.perf}
                                suffix="%"
                                accentColor={perfC.main}
                                icon={<RiPulseLine />}
                                isDark={isDark}
                            />
                        </Box>

                        {/* ── Kontrol Paneli ───────────────────────────────── */}
                        <Box sx={{
                            borderRadius: "20px", overflow: "hidden",
                            background: isDark
                                ? "rgba(10, 14, 26, 0.7)"
                                : "rgba(255,255,255,0.75)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                            backdropFilter: "blur(24px)",
                            boxShadow: isDark
                                ? "0 4px 40px rgba(0,0,0,0.4)"
                                : "0 4px 32px rgba(0,0,0,0.06)",
                        }}>
                            {/* Bölge seçici */}
                            <Box sx={{
                                px: 2, py: 1.5,
                                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                                display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap",
                            }}>
                                <Box sx={{
                                    display: "flex", alignItems: "center", gap: 0.5,
                                    color: isDark ? "rgba(160,170,200,0.45)" : "rgba(80,90,120,0.45)",
                                    flexShrink: 0,
                                }}>
                                    <RiMapPin2Line size={13} />
                                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                        Bölge
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    {bolgeler.map((r) => (
                                        <RegionTab
                                            key={r}
                                            label={r}
                                            count={regionsMap?.[r]?.length ?? 0}
                                            selected={seciliBolge === r}
                                            onClick={() => setSeciliBolge(r)}
                                            isDark={isDark}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            {/* Arama + Sıralama + Filtreler */}
                            <Box sx={{
                                px: 2, py: 1.25,
                                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                                display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap",
                            }}>
                                {/* Arama */}
                                <TextField
                                    value={arama}
                                    onChange={(e) => setArama(e.target.value)}
                                    placeholder="Proje ara..."
                                    size="small"
                                    sx={{
                                        minWidth: 180, flex: 1,
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "11px", height: 36,
                                            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                                            fontSize: "0.82rem", fontWeight: 600,
                                            "& fieldset": {
                                                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}`,
                                            },
                                            "&:hover fieldset": {
                                                borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
                                            },
                                            "&.Mui-focused fieldset": {
                                                borderColor: "rgba(99,102,241,0.5)",
                                                boxShadow: "0 0 0 3px rgba(99,102,241,0.12)",
                                            },
                                        },
                                        "& .MuiInputBase-input": {
                                            color: isDark ? "rgba(220,228,255,0.85)" : "#0F1729",
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MdSearch size={15} color={isDark ? "rgba(160,170,200,0.4)" : "rgba(100,110,140,0.4)"} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Box sx={{ width: "1px", height: 20, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", flexShrink: 0 }} />

                                {/* Sıralama */}
                                <Select
                                    value={sirala}
                                    onChange={(e) => setSirala(e.target.value)}
                                    size="small"
                                    sx={{
                                        minWidth: 140, height: 36, borderRadius: "11px",
                                        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                                        fontSize: "0.78rem", fontWeight: 700,
                                        color: isDark ? "rgba(220,228,255,0.85)" : "#0F1729",
                                        "& fieldset": {
                                            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)"}`,
                                        },
                                        "&:hover .MuiOutlinedInput-notchedOutline": {
                                            borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
                                        },
                                        "& .MuiSelect-icon": { color: isDark ? "rgba(160,170,200,0.4)" : "rgba(100,110,140,0.4)" },
                                    }}
                                >
                                    <MenuItem value="perf">
                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                            <RiPulseLine size={13} />
                                            <span>Performans</span>
                                        </Stack>
                                    </MenuItem>
                                    <MenuItem value="plan">
                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                            <TbChartBar size={13} />
                                            <span>Talep</span>
                                        </Stack>
                                    </MenuItem>
                                    <MenuItem value="late">
                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                            <MdWarning size={13} />
                                            <span>Gecikme</span>
                                        </Stack>
                                    </MenuItem>
                                </Select>

                                <Box sx={{ width: "1px", height: 20, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", flexShrink: 0 }} />

                                {/* Toggle Filtreler */}
                                <FilterChip
                                    label="Gecikenler"
                                    active={sadeceGecikenler}
                                    onToggle={() => setSadeceGecikenler(v => !v)}
                                    color={RED}
                                    isDark={isDark}
                                />
                                <FilterChip
                                    label="Tedarik Edilmeyenler"
                                    active={sadeceTedarikEdilmeyenler}
                                    onToggle={() => setSadeceTedarikEdilmeyenler(v => !v)}
                                    color={AMBER}
                                    isDark={isDark}
                                />

                                <Box sx={{ ml: "auto", display: "flex", gap: 0.75, flexShrink: 0 }}>
                                    <GlassButton
                                        icon={<MdHistory size={15} />}
                                        label="Reel Tarihler"
                                        onClick={exceldenTarihleriIceriAl}
                                        loading={excelOkunuyor}
                                        accent={VIOLET}
                                        isDark={isDark}
                                    />
                                    <GlassButton
                                        icon={<MdDownload size={15} />}
                                        label="Excel İndir"
                                        onClick={bolgeyiExceleAktar}
                                        accent={GREEN}
                                        isDark={isDark}
                                    />
                                </Box>
                            </Box>

                            {/* Status Bar */}
                            <Box sx={{
                                px: 2, py: 1,
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                flexWrap: "wrap", gap: 1,
                            }}>
                                <Stack direction="row" alignItems="center" spacing={1.25}>
                                    <Box sx={{
                                        display: "flex", alignItems: "center", gap: 0.75,
                                        px: 1, py: 0.4, borderRadius: "8px",
                                        background: `${GREEN}12`,
                                        border: `0.5px solid ${GREEN}22`,
                                    }}>
                                        <Box sx={{
                                            width: 6, height: 6, borderRadius: "50%",
                                            background: GREEN,
                                            boxShadow: `0 0 6px ${GREEN}`,
                                            animation: "pulse 2s ease-in-out infinite",
                                            "@keyframes pulse": {
                                                "0%, 100%": { opacity: 1, boxShadow: `0 0 6px ${GREEN}` },
                                                "50%": { opacity: 0.6, boxShadow: `0 0 12px ${GREEN}` },
                                            },
                                        }} />
                                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: GREEN, letterSpacing: "0.02em" }}>
                                            {satirlar.length} aktif proje
                                        </Typography>
                                    </Box>
                                    <Typography sx={{
                                        fontSize: "0.68rem", fontWeight: 500,
                                        color: isDark ? "rgba(160,170,200,0.4)" : "rgba(100,110,140,0.4)",
                                        display: { xs: "none", sm: "block" },
                                    }}>
                                        Detaylar için kartlara tıklayın
                                    </Typography>
                                </Stack>

                                <Stack direction="row" spacing={0.75} flexWrap="wrap">
                                    <LiveStat icon={<MdBolt size={12} />} label="Basım" value={printsCount} color={GREEN} isDark={isDark} loading={printsLoading} />
                                    <LiveStat icon={<RiTruckLine size={12} />} label="Araç" value={vehicleCount} color={AMBER} isDark={isDark} loading={vehicleLoading} />
                                    {excelCount > 0 && (
                                        <LiveStat icon={<MdDownload size={12} />} label="Excel" value={excelCount} color={BLUE} isDark={isDark} />
                                    )}
                                    {excelIcerikBilgisi && (
                                        <Tooltip title={`Toplam: ${excelIcerikBilgisi.totalRows} satır · Tarih dolu: ${excelIcerikBilgisi.withAnyDate}`}>
                                            <Box sx={{ cursor: "help" }}>
                                                <LiveStat icon={<MdHistory size={12} />} label="Sefer" value={excelIcerikBilgisi.withSefer} color={VIOLET} isDark={isDark} />
                                            </Box>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        </Box>
                    </Box>

                    {/* ═══════════════════════════════════════════════════════
                        KART LİSTESİ
                    ═══════════════════════════════════════════════════════ */}
                    <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
                        <AnimatePresence initial={false}>
                            {satirlar.map((satir, idx) => (
                                <motion.div
                                    key={satir.name}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                    transition={{ delay: Math.min(idx * 0.04, 0.3), type: "spring", stiffness: 280, damping: 26 }}
                                    style={{ marginBottom: 10 }}
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
                            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                                <Box sx={{
                                    borderRadius: "20px",
                                    border: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                                    p: 8, textAlign: "center",
                                    background: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)",
                                }}>
                                    <Box sx={{
                                        width: 56, height: 56, borderRadius: "18px", mx: "auto", mb: 2.5,
                                        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                                        display: "grid", placeItems: "center",
                                    }}>
                                        <MdSearch size={24} color={isDark ? "rgba(160,170,200,0.35)" : "rgba(100,110,140,0.35)"} />
                                    </Box>
                                    <Typography sx={{
                                        fontWeight: 900, fontSize: "1rem",
                                        color: isDark ? "rgba(220,228,255,0.7)" : "#1A2140",
                                        mb: 0.75, letterSpacing: "-0.02em",
                                    }}>
                                        Sonuç bulunamadı
                                    </Typography>
                                    <Typography sx={{
                                        fontSize: "0.82rem",
                                        color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.45)",
                                    }}>
                                        Arama kriterini değiştir veya filtreleri kapat.
                                    </Typography>
                                </Box>
                            </motion.div>
                        )}
                    </Box>
                </Wide>
            </Root>
        </Box>
    );
}