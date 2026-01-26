import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Chip,
    styled,
    alpha,
    Tabs,
    Tab,
    Collapse,
    TextField,
    InputAdornment,
    Divider,
    Select,
    MenuItem,
    FormControl,
    Switch,
    FormControlLabel,
    Tooltip,
    IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    MdMonitor,
    MdSearch,
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdLocalShipping,
    MdPinDrop,
    MdHistory,
    MdOutlineTimer,
    MdAssignment,
    MdPerson,
    MdBolt,
    MdTrendingUp,
    MdWarning,
    MdCancel,
    MdInfoOutline,
    MdRefresh,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

// ✅ Excel export + import
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ------------------------ BACKEND (İLK KODDAN AYNEN) ------------------------ */
const BASE_URL =
    process.env.REACT_APP_API_URL || "https://tedarik-analiz-backend-clean.onrender.com";

// Backend şu formatı döndürüyor: { rid, ok, data } veya { rid, ok, items }
function extractItems(payload) {
    if (!payload) return [];

    // bizim backend (debug) -> { rid, ok, data }
    const root = payload.items ?? payload.data ?? payload;

    // Odak API -> { Data: [...], Success: true }
    const arr = root?.Data ?? root?.data ?? root?.items ?? root;

    return Array.isArray(arr) ? arr : [];
}

function toIsoLocalStart(d) {
    // "YYYY-MM-DDT00:00:00"
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00`;
}
function toIsoLocalEnd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T23:59:59`;
}

/* ------------------------ yardımcılar (UI kodundan) ------------------------ */
const STATUS_MAP = {
    1: { label: "Bekliyor", color: "#64748b" },
    2: { label: "Onaylandı", color: "#0ea5e9" },
    3: { label: "Spot Araç Planlamada", color: "#f59e0b" },
    4: { label: "Araç Atandı", color: "#8b5cf6" },
    5: { label: "Araç Yüklendi", color: "#10b981" },
    6: { label: "Araç Yolda", color: "#3b82f6" },
    7: { label: "Teslim Edildi", color: "#059669" },
    8: { label: "Tamamlandı", color: "#0f172a" },
    10: { label: "Eksik Evrak", color: "#ef4444" },
    20: { label: "Teslim Edildi", color: "#059669" },
    30: { label: "Tamamlandı", color: "#0f172a" },
    40: { label: "Orijinal Evrak Geldi", color: "#6366f1" },
    50: { label: "Evrak Arşivlendi", color: "#475569" },
    80: { label: "Araç Boşaltmada", color: "#f97316" },
    90: { label: "Filo Araç Planlamada", color: "#ec4899" },
    200: { label: "İptal", color: "#b91c1c" },
};

const norm = (s) =>
    (s ?? "")
        .toString()
        .replace(/\u00A0/g, " ") // NBSP
        .replace(/\u200B/g, "") // zero-width
        .replace(/\r?\n/g, " ")
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");

const normalizeSeferKey = (v) => {
    const s = (v ?? "")
        .toString()
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\r?\n/g, " ")
        .trim();
    if (!s) return "";
    const up = s.toLocaleUpperCase("tr-TR");
    const m = up.match(/SFR\s*\d+/);
    if (m) return m[0].replace(/\s+/g, "");
    if (/^\d{8,}$/.test(up)) return `SFR${up}`;
    return up.split(/\s+/)[0];
};

const mergeKeepFilled = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

const toBool = (v) => {
    if (v === true || v === false) return v;
    if (v === 1 || v === "1") return true;
    if (v === 0 || v === "0") return false;
    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true") return true;
        if (s === "false") return false;
    }
    return false;
};

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "---") return "---";
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return String(dateStr);
        return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(
            2,
            "0"
        )}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;
    } catch {
        return String(dateStr);
    }
};

// dd.mm.yyyy / ISO parse
const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s = String(v).trim();
    if (!s) return null;

    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        const yyyy = Number(m[3]);
        const HH = Number(m[4] ?? 0);
        const MI = Number(m[5] ?? 0);
        const SS = Number(m[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

// sefer_acilis_zamani(TMSDespatchCreatedDate) -> yukleme_tarihi(PickupDate)
const getTimingInfo = (seferAcilisZamani, yuklemeTarihi) => {
    const h = hoursDiff(seferAcilisZamani, yuklemeTarihi);
    if (h == null) return { label: "Tarih yok", color: "#94a3b8", hours: null, level: "none" };
    if (h < 30) return { label: "Zamanında", color: "#10b981", hours: h, level: "ok" };
    return { label: "Gecikme", color: "#ef4444", hours: h, level: "late" };
};

const StatusPill = ({ statusIdRaw }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const id = toNum(statusIdRaw);
    const s =
        id != null && STATUS_MAP[id] ? STATUS_MAP[id] : { label: "Belirsiz", color: "#94a3b8" };

    return (
        <Chip
            size="small"
            label={s.label}
            sx={{
                height: 24,
                fontWeight: 950,
                borderRadius: "999px",
                bgcolor: isDark ? alpha(s.color, 0.28) : s.color,
                color: "#fff",
                px: 1,
                border: isDark ? `1px solid ${alpha(s.color, 0.45)}` : "none",
            }}
        />
    );
};

/* ------------------------ modern UI (theme-aware) ------------------------ */
const Root = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: "100%",
        minHeight: "100vh",
        padding: "clamp(12px, 2vw, 26px)",
        background: isDark
            ? [
                `radial-gradient(1200px 600px at 15% 0%, ${alpha("#3b82f6", 0.22)}, transparent 55%)`,
                `radial-gradient(900px 520px at 85% 5%, ${alpha("#10b981", 0.16)}, transparent 60%)`,
                `radial-gradient(1000px 650px at 50% 100%, ${alpha("#f59e0b", 0.14)}, transparent 60%)`,
                "linear-gradient(180deg,#020617, #071225 60%, #020617)",
            ].join(",")
            : [
                `radial-gradient(1200px 600px at 15% 0%, rgba(59,130,246,0.14), transparent 55%)`,
                `radial-gradient(900px 520px at 85% 5%, rgba(16,185,129,0.10), transparent 60%)`,
                `radial-gradient(1000px 650px at 50% 100%, rgba(245,158,11,0.10), transparent 60%)`,
                "linear-gradient(180deg,#f8fafc, #f6f7fb 60%, #f8fafc)",
            ].join(","),
    };
});

const Wide = styled(Box)({
    width: "100%",
    maxWidth: 30000,
    marginLeft: "auto",
    marginRight: "auto",
});

const TopBar = styled(Paper)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        position: "sticky",
        top: 14,
        zIndex: 10,
        borderRadius: 26,
        padding: 18,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.8)",
        background: isDark ? alpha("#0b1220", 0.78) : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(16px)",
        boxShadow: isDark ? "0 28px 90px rgba(0,0,0,0.55)" : "0 24px 80px rgba(2,6,23,0.12)",
    };
});

const Grid = styled(Box)({
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
});

const Grid2 = styled(Box)({
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
});

const KPI = styled(motion.div)(({ theme, accent = "#3b82f6" }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 22,
        padding: 16,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
        background: isDark ? alpha("#0b1220", 0.86) : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(10px)",
        boxShadow: isDark ? "0 18px 55px rgba(0,0,0,0.45)" : "0 18px 55px rgba(2,6,23,0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        "&:before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `radial-gradient(900px 250px at 18% 0%, ${alpha(accent, isDark ? 0.24 : 0.18)}, transparent 55%)`,
            pointerEvents: "none",
        },
    };
});

const RegionTabs = styled(Tabs)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        background: isDark ? alpha("#ffffff", 0.06) : "rgba(15,23,42,0.04)",
        padding: 6,
        borderRadius: 18,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "1px solid rgba(226,232,240,0.9)",
        "& .MuiTabs-indicator": {
            height: "calc(100% - 12px)",
            borderRadius: 14,
            backgroundColor: isDark ? alpha("#ffffff", 0.1) : "rgba(255,255,255,0.92)",
            top: 6,
        },
    };
});

const RegionTab = styled(Tab)(({ theme }) => ({
    textTransform: "none",
    fontWeight: 950,
    zIndex: 2,
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

const CardList = styled(Box)({
    marginTop: 16,
    display: "grid",
    gap: 12,
});

const ProjectCard = styled(motion.div)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 24,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.95)",
        background: isDark ? alpha("#0b1220", 0.86) : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        boxShadow: isDark ? "0 18px 60px rgba(0,0,0,0.55)" : "0 16px 55px rgba(2,6,23,0.07)",
        overflow: "hidden",
    };
});

const CardHeader = styled(Box)({
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
});

const Accent = styled(Box)(({ color = "#3b82f6" }) => ({
    width: 10,
    borderRadius: 999,
    background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.65)})`,
    alignSelf: "stretch",
}));

const Pill = styled(Chip)(({ theme, pillcolor }) => {
    const isDark = theme.palette.mode === "dark";
    const c = pillcolor || "#3b82f6";
    return {
        height: 26,
        borderRadius: 999,
        fontWeight: 950,
        background: alpha(c, isDark ? 0.22 : 0.12),
        color: isDark ? theme.palette.text.primary : c,
        border: `1px solid ${alpha(c, isDark ? 0.32 : 0.22)}`,
    };
});

const MiniStat = ({ label, value, color = "#0f172a" }) => {
    const theme = useTheme();
    return (
        <Box sx={{ textAlign: "center", minWidth: 92 }}>
            <Typography
                sx={{
                    fontSize: "0.62rem",
                    fontWeight: 950,
                    color: theme.palette.text.secondary,
                    letterSpacing: "0.6px",
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ fontSize: "1.08rem", fontWeight: 1000, color }}>{value}</Typography>
        </Box>
    );
};

const ExpandBtn = styled(Box)(({ theme, open }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: 40,
        height: 40,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: open
            ? isDark
                ? alpha("#ffffff", 0.1)
                : "#0f172a"
            : isDark
                ? alpha("#ffffff", 0.06)
                : "rgba(15,23,42,0.06)",
        color: open ? (isDark ? "#e2e8f0" : "#fff") : theme.palette.text.secondary,
        transition: "0.2s",
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
    };
});

const ShipmentWrap = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        padding: 16,
        background: isDark ? alpha("#ffffff", 0.03) : "rgba(15,23,42,0.02)",
        borderTop: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
    };
});

const ShipmentCard = styled(motion.div)(({ theme, printed }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 22,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.95)",
        background: isDark ? alpha("#0b1220", 0.92) : "rgba(255,255,255,0.94)",
        boxShadow: isDark ? "0 18px 55px rgba(0,0,0,0.50)" : "0 14px 48px rgba(2,6,23,0.07)",
        overflow: "hidden",
        position: "relative",
        padding: 16,
        "&:before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: printed ? "linear-gradient(180deg,#10b981,#059669)" : "linear-gradient(180deg,#3b82f6,#2563eb)",
        },
    };
});

const RowTabs = styled(Tabs)(({ theme }) => ({
    minHeight: 34,
    "& .MuiTabs-indicator": {
        height: 3,
        borderRadius: 3,
        backgroundColor: theme.palette.primary.main,
    },
}));
const RowTab = styled(Tab)(({ theme }) => ({
    minHeight: 34,
    textTransform: "none",
    fontWeight: 950,
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

const RouteBox = styled(Box)(({ theme, t = "pickup" }) => {
    const isDark = theme.palette.mode === "dark";
    const c = t === "pickup" ? "#10b981" : "#ef4444";
    return {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        border: `1px dashed ${alpha(c, isDark ? 0.6 : 0.55)}`,
        background: alpha(c, isDark ? 0.1 : 0.06),
    };
});

/* ------------------------ veri kuralları ------------------------ */
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
        "SUDESAN FTL",
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
        "NAZAR KİMYA FTL",
    ],
    DERİNCE: [
        "ARKAS PETROL OFİSİ DERİNCE FTL",
        "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL",
        "ARKAS TOGG",
        "ARKAS SPOT FTL",
    ],
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
    ESKİŞEHİR: [
        "ES FTL",
        "ES GLOBAL FRİGO FTL",
        "KİPAŞ BOZÜYÜK FTL",
        "2A TÜKETİM FTL",
        "MODERN HURDA DÖNÜŞ FTL",
        "MODERN HURDA ZONGULDAK FTL",
        "ŞİŞECAM FTL",
        "DENTAŞ FTL",
        "MODERN AMBALAJ FTL",
    ],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
    DİĞER: ["DOĞTAŞ İNEGÖL FTL", "AKTÜL FTL"],
};

function buildSubDetails(rowName, allData) {
    const seen = new Set();
    const rowNorm = norm(rowName);

    return (allData || [])
        .filter((item) => {
            const pNorm = norm(item.ProjectName);
            const isDirect = pNorm === rowNorm;

            const isPepsiCorlu =
                rowNorm === norm("PEPSİ FTL ÇORLU") &&
                pNorm === norm("PEPSİ FTL") &&
                norm(item.PickupCityName) === norm("TEKİRDAĞ") &&
                norm(item.PickupCountyName) === norm("ÇORLU");

            const isPepsiGebze =
                rowNorm === norm("PEPSİ FTL GEBZE") &&
                pNorm === norm("PEPSİ FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isEbebekGebze =
                rowNorm === norm("EBEBEK FTL GEBZE") &&
                pNorm === norm("EBEBEK FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isFakirGebze =
                rowNorm === norm("FAKİR FTL GEBZE") &&
                pNorm === norm("FAKİR FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isOttonya = rowNorm === norm("OTTONYA (HEDEFTEN AÇILIYOR)") && pNorm === norm("OTTONYA");

            const isKucukbayTrakya =
                rowNorm.includes("TRAKYA") &&
                pNorm === norm("KÜÇÜKBAY FTL") &&
                new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm)).has(norm(item.PickupCityName));

            const match =
                isDirect || isPepsiCorlu || isPepsiGebze || isEbebekGebze || isFakirGebze || isOttonya || isKucukbayTrakya;

            if (!match) return false;

            const reqNo = item.TMSVehicleRequestDocumentNo;
            const despNo = (item.TMSDespatchDocumentNo || "").toString();
            const isValid = !despNo.toUpperCase().startsWith("BOS");
            const uniq = reqNo || despNo;

            if (uniq && isValid && !seen.has(uniq)) {
                seen.add(uniq);
                return true;
            }
            return false;
        })
        .slice(0, 50);
}

/* ------------------------ satır bileşeni ------------------------ */
function ProjectRow({ row, allData, excelTimesBySefer }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState(0);

    const subDetails = useMemo(() => buildSubDetails(row.name, allData), [row.name, allData]);

    const accentColor = row.yuzde >= 90 ? "#10b981" : row.yuzde >= 70 ? "#3b82f6" : "#f59e0b";

    return (
        <ProjectCard
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            whileHover={{ y: -2 }}
        >
            <CardHeader onClick={() => setOpen((s) => !s)} style={{ cursor: "pointer" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Accent color={accentColor} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 1000,
                                color: theme.palette.text.primary,
                                fontSize: "1.06rem",
                                letterSpacing: "-0.5px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: { xs: 220, md: 560 },
                            }}
                        >
                            {row.name}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.7, flexWrap: "wrap" }}>
                            <Pill pillcolor="#0ea5e9" label={`Talep: ${row.plan}`} />
                            <Pill pillcolor="#10b981" label={`Tedarik: ${row.ted}`} />
                            <Pill pillcolor="#ef4444" label={`Gecikme: ${row.gec}`} />
                            <Pill pillcolor="#b91c1c" label={`İptal: ${row.iptal}`} />
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
                        <MiniStat label="SPOT" value={row.spot} color="#3b82f6" />
                        <MiniStat label="FİLO" value={row.filo} color="#8b5cf6" />
                        <MiniStat label="Basım" value={row.sho_b} color="#059669" />
                        <MiniStat label="Zamanında" value={`%${row.yuzde}`} color={row.yuzde >= 90 ? "#10b981" : "#f59e0b"} />
                    </Stack>

                    <ExpandBtn open={open ? 1 : 0}>
                        {open ? <MdKeyboardArrowUp size={22} /> : <MdKeyboardArrowDown size={22} />}
                    </ExpandBtn>
                </Stack>
            </CardHeader>

            <Collapse in={open} timeout={250} unmountOnExit>
                <ShipmentWrap>
                    <RowTabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
                        <RowTab label="Genel Bakış" />
                        <RowTab label="Zaman Çizelgesi" />
                        <RowTab label="Rota" />
                    </RowTabs>

                    <Box sx={{ mt: 1.5, display: "grid", gap: 12 }}>
                        {subDetails.map((item, idx) => {
                            const timing = getTimingInfo(item.TMSDespatchCreatedDate, item.PickupDate);
                            const printed = toBool(item.IsPrint);

                            const seferNo = item.TMSDespatchDocumentNo || "Planlanmadı";
                            const excelTimes = excelTimesBySefer?.[normalizeSeferKey(seferNo)];

                            const pickupCity = item.PickupCityName || "-";
                            const pickupCounty = item.PickupCountyName || "-";
                            const deliveryCity = item.DeliveryCityName || "-";
                            const deliveryCounty = item.DeliveryCountyName || "-";

                            return (
                                <ShipmentCard
                                    key={`${item.TMSVehicleRequestDocumentNo || idx}`}
                                    printed={printed ? 1 : 0}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.7rem",
                                                    fontWeight: 950,
                                                    color: theme.palette.text.secondary,
                                                    letterSpacing: "0.8px",
                                                }}
                                            >
                                                SEFER
                                            </Typography>

                                            <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "1.05rem" }}>
                                                {seferNo}
                                            </Typography>

                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }}>
                                                <StatusPill statusIdRaw={item.OrderStatu} />

                                                <Chip
                                                    size="small"
                                                    label={timing.label}
                                                    sx={{
                                                        height: 24,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark ? alpha(timing.color, 0.28) : timing.color,
                                                        color: "#fff",
                                                        border: isDark ? `1px solid ${alpha(timing.color, 0.45)}` : "none",
                                                    }}
                                                />

                                                {timing.hours != null && (
                                                    <Chip
                                                        size="small"
                                                        label={`${timing.hours.toFixed(1)} saat`}
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: alpha(timing.color, isDark ? 0.22 : 0.12),
                                                            color: isDark ? theme.palette.text.primary : timing.color,
                                                            border: `1px solid ${alpha(timing.color, isDark ? 0.32 : 0.22)}`,
                                                        }}
                                                    />
                                                )}

                                                <Chip
                                                    size="small"
                                                    label={printed ? "Basım var" : "Basım yok"}
                                                    sx={{
                                                        height: 24,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: printed
                                                            ? alpha("#10b981", isDark ? 0.18 : 0.14)
                                                            : alpha("#64748b", isDark ? 0.18 : 0.12),
                                                        color: printed ? (isDark ? theme.palette.text.primary : "#059669") : theme.palette.text.secondary,
                                                        border: `1px solid ${printed ? alpha("#10b981", isDark ? 0.3 : 0.24) : alpha("#64748b", isDark ? 0.28 : 0.2)
                                                            }`,
                                                    }}
                                                />

                                                {excelTimes && (
                                                    <Chip
                                                        size="small"
                                                        label="Excel tarihleri var"
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: alpha("#0ea5e9", isDark ? 0.18 : 0.12),
                                                            color: isDark ? theme.palette.text.primary : "#0ea5e9",
                                                            border: `1px solid ${alpha("#0ea5e9", isDark ? 0.28 : 0.2)}`,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>

                                        <Chip
                                            size="small"
                                            label={`#${idx + 1}`}
                                            sx={{
                                                height: 26,
                                                borderRadius: 999,
                                                fontWeight: 1000,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                                color: theme.palette.text.primary,
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                            }}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 1.2, opacity: isDark ? 0.18 : 0.6 }} />

                                    {/* TAB CONTENT */}
                                    {tab === 0 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    OPERASYON
                                                </Typography>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 999,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(15,23,42,0.06)",
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                        }}
                                                    >
                                                        <MdPerson size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                                                    </Box>
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {item.OrderCreatedBy || "-"}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    ZAMAN BİLGİLERİ
                                                </Typography>
                                                <Stack sx={{ mt: 1 }} spacing={0.8}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdHistory color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sefer açılış: {formatDate(item.TMSDespatchCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdOutlineTimer color="#10b981" />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Yükleme: {formatDate(item.PickupDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdAssignment color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sipariş: {formatDate(item.OrderCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    ROTA ÖZETİ
                                                </Typography>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {pickupCity} / {pickupCounty}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 0.6 }}>
                                                    <MdLocalShipping color="#3b82f6" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {deliveryCity} / {deliveryCounty}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    )}

                                    {tab === 1 && (
                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 950,
                                                    color: theme.palette.text.secondary,
                                                    letterSpacing: "0.6px",
                                                }}
                                            >
                                                SEFER AÇILIŞ → YÜKLEME (30 saat kuralı)
                                            </Typography>

                                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                <Chip
                                                    icon={<MdHistory />}
                                                    label={formatDate(item.TMSDespatchCreatedDate)}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                    }}
                                                />

                                                <Chip
                                                    icon={<MdBolt />}
                                                    label={timing.hours == null ? "---" : `${timing.hours.toFixed(1)} saat`}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 1000,
                                                        bgcolor: alpha(timing.color, isDark ? 0.22 : 0.14),
                                                        color: isDark ? theme.palette.text.primary : timing.color,
                                                        border: `1px solid ${alpha(timing.color, isDark ? 0.32 : 0.22)}`,
                                                    }}
                                                />

                                                <Chip
                                                    icon={<MdOutlineTimer />}
                                                    label={formatDate(item.PickupDate)}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: alpha("#10b981", isDark ? 0.16 : 0.1),
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#10b981", 0.2)}` : "none",
                                                    }}
                                                />
                                            </Stack>

                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    p: 2,
                                                    borderRadius: 20,
                                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                    bgcolor: alpha(timing.color, isDark ? 0.12 : 0.08),
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "1rem" }}>
                                                    {timing.level === "ok" ? "✅ Zamanında" : timing.level === "late" ? "⚠️ Gecikme var" : "ℹ️ Tarih eksik"}
                                                </Typography>

                                                <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.4 }}>
                                                    Kural: Sefer açılıştan itibaren 30 saat altında yükleme yapılırsa “zamanında” sayılır.
                                                </Typography>
                                            </Box>

                                            {/* ✅ Excel’den gelen 6 tarih alanı */}
                                            {excelTimes && (
                                                <Box
                                                    sx={{
                                                        mt: 1.6,
                                                        p: 2,
                                                        borderRadius: 20,
                                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                        bgcolor: isDark ? alpha("#ffffff", 0.04) : "rgba(15,23,42,0.02)",
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, mb: 1 }}>
                                                        Excel’den Gelen Tarihler
                                                    </Typography>

                                                    <Stack spacing={0.7}>
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Yükleme Varış:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.yukleme_varis)}</span>
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Yükleme Giriş:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.yukleme_giris)}</span>
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Yükleme Çıkış:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.yukleme_cikis)}</span>
                                                        </Typography>

                                                        <Divider sx={{ my: 1, opacity: isDark ? 0.18 : 0.6 }} />

                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Teslim Varış:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.teslim_varis)}</span>
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Teslim Giriş:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.teslim_giris)}</span>
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                            Teslim Çıkış:{" "}
                                                            <span style={{ color: theme.palette.text.primary }}>{formatDate(excelTimes.teslim_cikis)}</span>
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    {tab === 2 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <RouteBox t="pickup">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>Yükleme Noktası</Typography>
                                                </Stack>
                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: theme.palette.text.primary }}>{pickupCity}</Typography>
                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>{pickupCounty}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={`Kod: ${item.PickupAddressCode || "-"}`}
                                                    sx={{
                                                        mt: 1.2,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark ? alpha("#ffffff", 0.06) : "#fff",
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                    }}
                                                />
                                            </RouteBox>

                                            <Box sx={{ display: "grid", placeItems: "center", px: 1 }}>
                                                <MdLocalShipping size={28} color="#3b82f6" />
                                            </Box>

                                            <RouteBox t="delivery">
                                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>Teslimat Noktası</Typography>
                                                    <MdPinDrop color="#ef4444" />
                                                </Stack>

                                                <Typography
                                                    sx={{
                                                        mt: 0.8,
                                                        fontWeight: 1000,
                                                        color: theme.palette.text.primary,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {deliveryCity}
                                                </Typography>

                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary, textAlign: "right" }}>
                                                    {deliveryCounty}
                                                </Typography>

                                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                    <Chip
                                                        size="small"
                                                        label={`Kod: ${item.DeliveryAddressCode || "-"}`}
                                                        sx={{
                                                            mt: 1.2,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: isDark ? alpha("#ffffff", 0.06) : "#fff",
                                                            color: theme.palette.text.primary,
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                        }}
                                                    />
                                                </Box>
                                            </RouteBox>
                                        </Stack>
                                    )}
                                </ShipmentCard>
                            );
                        })}
                    </Box>
                </ShipmentWrap>
            </Collapse>
        </ProjectCard>
    );
}

/* ------------------------ ana panel (data prop alır) ------------------------ */
function UltraProjeTablosu({ data }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [selectedRegion, setSelectedRegion] = useState("GEBZE");
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("perf"); // perf | plan | late
    const [onlyLate, setOnlyLate] = useState(false);

    // ✅ Excel’den okunacak zamanlar (Sefer Numarası -> 6 tarih alanı)
    const [excelTimesBySefer, setExcelTimesBySefer] = useState({});
    const [excelImportInfo, setExcelImportInfo] = useState(null);
    const [excelSyncLoading, setExcelSyncLoading] = useState(false);

    // Excel hücre değeri Date / number / string olabilir -> normalize edip ISO string yapalım
    const excelCellToISO = (cellVal) => {
        if (cellVal == null || cellVal === "") return null;

        if (cellVal instanceof Date && !Number.isNaN(cellVal.getTime())) {
            return cellVal.toISOString();
        }

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

    const pickColumn = (rowObj, possibleNames) => {
        const keys = Object.keys(rowObj || {});
        const normKeys = keys.map((k) => ({ raw: k, n: norm(k) }));

        for (const nm of possibleNames) {
            const target = norm(nm);

            // 1) birebir eşleşme
            const exact = normKeys.find((x) => x.n === target);
            if (exact) return rowObj[exact.raw];

            // 2) içeriyor eşleşme
            const contains = normKeys.find((x) => x.n.includes(target));
            if (contains) return rowObj[contains.raw];
        }
        return undefined;
    };

    // ✅ Tarihleri Getir: Excel seç -> oku -> sefer no’ya göre map oluştur (BACKEND YOK)
    const importTimesFromExcel = async () => {
        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xlsx,.xls";

            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setExcelSyncLoading(true);
                try {
                    const buf = await file.arrayBuffer();
                    const wb = XLSX.read(buf, { type: "array", cellDates: true });

                    // ilk sheet
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

                    const map = {};

                    json.forEach((r) => {
                        const seferNoRaw = pickColumn(r, ["Sefer Numarası", "Sefer No", "SeferNo", "Sefer", "Sefer Numarasi"]);
                        const seferKey = normalizeSeferKey(seferNoRaw);
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

                    const totalRows = json.length;
                    const withSefer = Object.keys(map).length;

                    const withAnyDate = Object.values(map).filter((t) =>
                        [t.yukleme_varis, t.yukleme_giris, t.yukleme_cikis, t.teslim_varis, t.teslim_giris, t.teslim_cikis].some(
                            (x) => x != null && x !== "" && x !== "---"
                        )
                    ).length;

                    setExcelImportInfo({ totalRows, withSefer, withAnyDate });
                    setExcelTimesBySefer(map);
                } catch (err) {
                    console.error("Excel okuma hatası:", err);
                } finally {
                    setExcelSyncLoading(false);
                }
            };

            input.click();
        } catch (err) {
            console.error("Excel seçme hatası:", err);
        }
    };

    const processedData = useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        const stats = {};

        src.forEach((item) => {
            let finalProjectName = item.ProjectName;
            const pNorm = norm(item.ProjectName);

            // KÜÇÜKBAY
            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                else return;
            }

            // PEPSİ
            if (pNorm === norm("PEPSİ FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
                else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
            }

            // EBEBEK
            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
            }

            // FAKİR
            if (pNorm === norm("FAKİR FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
            }

            // OTTONYA
            if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

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
                    ontime_req: new Set(),
                    late_req: new Set(),
                };
            }

            const s = stats[key];

            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                service === norm("YURTİÇİ FRİGO HİZMETLERİ");
            if (!inScope) return;

            // ✅ reqNo normalize (BOS kontrolü)
            const reqNoRaw = (item.TMSVehicleRequestDocumentNo || "").toString();
            const reqNoKey = reqNoRaw
                .replace(/\u00A0/g, " ")
                .replace(/\u200B/g, "")
                .replace(/\r?\n/g, " ")
                .trim();

            const reqNoUp = reqNoKey.toLocaleUpperCase("tr-TR");
            if (reqNoKey && !reqNoUp.startsWith("BOS")) {
                s.plan.add(reqNoUp);
            }

            // ✅ despNo tek format
            const despNoRaw = (item.TMSDespatchDocumentNo || "").toString();
            const despKey = normalizeSeferKey(despNoRaw);
            if (!despKey || !despKey.startsWith("SFR")) return;

            // İptal
            const statu = toNum(item.OrderStatu);
            if (statu === 200) {
                s.iptal.add(despKey);
                return;
            }

            // Ted
            s.ted.add(despKey);

            // Filo/Spot
            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm("ÖZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despKey);
            else s.spot.add(despKey);

            // Basım
            if (toBool(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            // ✅ 30 saat kuralı (req bazlı set’leri doldur)
            const h = hoursDiff(item.TMSDespatchCreatedDate, item.PickupDate);
            if (reqNoKey && !reqNoUp.startsWith("BOS") && h != null) {
                if (h < 30) s.ontime_req.add(reqNoUp);
                else s.late_req.add(reqNoUp);
            }
        });

        return stats;
    }, [data]);

    const rows = useMemo(() => {
        const q = norm(query);
        const regionList = REGIONS[selectedRegion] || [];

        const base = regionList
            .map((pName) => {
                const s = processedData[norm(pName)] || {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    ontime_req: new Set(),
                    late_req: new Set(),
                };

                const plan = s.plan.size;
                const ted = s.ted.size;
                const iptal = s.iptal.size;
                const edilmeyen = Math.max(0, plan - (ted + iptal));
                const zamaninda = s.ontime_req.size;
                const gec = s.late_req.size;
                const yuzde = plan > 0 ? Math.round((zamaninda / plan) * 100) : 0;

                return {
                    name: pName,
                    plan,
                    ted,
                    edilmeyen,
                    iptal,
                    spot: s.spot.size,
                    filo: s.filo.size,
                    sho_b: s.sho_b.size,
                    sho_bm: s.sho_bm.size,
                    zamaninda,
                    gec,
                    yuzde,
                };
            })
            .filter((r) => r.plan > 0)
            .filter((r) => (q ? norm(r.name).includes(q) : true))
            .filter((r) => (onlyLate ? r.gec > 0 : true));

        const sorted = [...base].sort((a, b) => {
            if (sortBy === "plan") return b.plan - a.plan;
            if (sortBy === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde; // performans
        });

        return sorted;
    }, [selectedRegion, processedData, query, sortBy, onlyLate]);

    const kpi = useMemo(() => {
        const sum = rows.reduce(
            (acc, r) => {
                acc.plan += r.plan;
                acc.ted += r.ted;
                acc.gec += r.gec;
                acc.iptal += r.iptal;
                acc.zamaninda += r.zamaninda;
                return acc;
            },
            { plan: 0, ted: 0, gec: 0, iptal: 0, zamaninda: 0 }
        );
        sum.perf = sum.plan ? Math.round((sum.zamaninda / sum.plan) * 100) : 0;
        return sum;
    }, [rows]);

    // ✅ Excel export: seçili bölgedeki TÜM projeler (filtrelerden bağımsız)
    const exportRegionToExcel = () => {
        const regionList = REGIONS[selectedRegion] || [];

        const allRegionRows = regionList.map((pName) => {
            const s = processedData[norm(pName)] || {
                plan: new Set(),
                ted: new Set(),
                iptal: new Set(),
                filo: new Set(),
                spot: new Set(),
                sho_b: new Set(),
                sho_bm: new Set(),
                ontime_req: new Set(),
                late_req: new Set(),
            };

            const plan = s.plan.size;
            const ted = s.ted.size;
            const iptal = s.iptal.size;
            const edilmeyen = Math.max(0, plan - (ted + iptal));
            const zamaninda = s.ontime_req.size;
            const gec = s.late_req.size;
            const yuzde = plan > 0 ? Math.round((zamaninda / plan) * 100) : 0;

            return {
                Proje: pName,
                Talep: plan,
                Tedarik: ted,
                Edilmeyen: edilmeyen,
                Gecikme: gec,
                İptal: iptal,
                SPOT: s.spot.size,
                FİLO: s.filo.size,
                "Basım Var": s.sho_b.size,
                "Basım Yok": s.sho_bm.size,
                Zamanında: zamaninda,
                "Zamanında %": yuzde,
            };
        });

        const headers = [
            "Proje",
            "Talep",
            "Tedarik",
            "Edilmeyen",
            "Gecikme",
            "İptal",
            "SPOT",
            "FİLO",
            "Basım Var",
            "Basım Yok",
            "Zamanında",
            "Zamanında %",
        ];

        const aoa = [headers];
        allRegionRows.forEach((r) => aoa.push(headers.map((h) => r[h] ?? "")));

        const totals = allRegionRows.reduce(
            (acc, r) => {
                acc.Talep += Number(r["Talep"] || 0);
                acc.Tedarik += Number(r["Tedarik"] || 0);
                acc.Edilmeyen += Number(r["Edilmeyen"] || 0);
                acc.Gecikme += Number(r["Gecikme"] || 0);
                acc.İptal += Number(r["İptal"] || 0);
                acc.SPOT += Number(r["SPOT"] || 0);
                acc.FİLO += Number(r["FİLO"] || 0);
                acc.BasımVar += Number(r["Basım Var"] || 0);
                acc.BasımYok += Number(r["Basım Yok"] || 0);
                acc.Zamanında += Number(r["Zamanında"] || 0);
                return acc;
            },
            { Talep: 0, Tedarik: 0, Edilmeyen: 0, Gecikme: 0, İptal: 0, SPOT: 0, FİLO: 0, BasımVar: 0, BasımYok: 0, Zamanında: 0 }
        );

        const totalPerf = totals.Talep ? Math.round((totals.Zamanında / totals.Talep) * 100) : 0;

        aoa.push([
            "BÖLGE TOPLAM",
            totals.Talep,
            totals.Tedarik,
            totals.Edilmeyen,
            totals.Gecikme,
            totals.İptal,
            totals.SPOT,
            totals.FİLO,
            totals.BasımVar,
            totals.BasımYok,
            totals.Zamanında,
            totalPerf,
        ]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 42 }, ...headers.slice(1).map(() => ({ wch: 14 }))];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, selectedRegion);

        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const fileName = `AnalizPanel_${selectedRegion}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
    };

    return (
        <Box sx={{ width: "100%" }}>
            <Root>
                <Wide>
                    <TopBar elevation={0}>
                        <Grid>
                            {/* Sol: Başlık + KPI */}
                            <Stack spacing={1.2}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 18,
                                            bgcolor: isDark ? alpha("#ffffff", 0.08) : "#0f172a",
                                            display: "grid",
                                            placeItems: "center",
                                            boxShadow: isDark ? "0 18px 45px rgba(0,0,0,0.55)" : "0 18px 45px rgba(2,6,23,0.22)",
                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "none",
                                        }}
                                    >
                                        <MdMonitor size={24} color={isDark ? "#e2e8f0" : "#fff"} />
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 1000,
                                                color: theme.palette.text.primary,
                                                fontSize: "1.25rem",
                                                letterSpacing: "-0.7px",
                                            }}
                                        >
                                            ANALİZ PANELİ
                                        </Typography>
                                        <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
                                            Kart görünümü • Filtreleme • Zaman analizi • Rota
                                        </Typography>
                                    </Box>

                                    <Tooltip title="Bu panel, sefer açılışından yüklemeye kadar geçen süreyi (30 saat kuralı) baz alır.">
                                        <IconButton
                                            size="small"
                                            sx={{
                                                ml: "auto",
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.05),
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                color: theme.palette.text.primary,
                                            }}
                                        >
                                            <MdInfoOutline />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                <Grid2>
                                    <KPI accent="#0ea5e9" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            TOPLAM TALEP
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: theme.palette.text.primary }}>{kpi.plan}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdTrendingUp color="#0ea5e9" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Bölge: {selectedRegion}</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#10b981" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            TEDARİK EDİLEN
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#10b981" }}>{kpi.ted}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdBolt color="#10b981" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Aktif seferler</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            ZAMANINDA ORANI
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: kpi.perf >= 90 ? "#10b981" : "#f59e0b" }}>
                                            %{kpi.perf}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdWarning color={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>30 saat kuralı</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#ef4444" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            RİSK: GECİKME / İPTAL
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.15rem", fontWeight: 1000, color: theme.palette.text.primary }}>
                                            <span style={{ color: "#ef4444" }}>{kpi.gec}</span> / <span style={{ color: "#b91c1c" }}>{kpi.iptal}</span>
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdCancel color="#ef4444" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Takip alanı</Typography>
                                        </Stack>
                                    </KPI>
                                </Grid2>
                            </Stack>

                            {/* Sağ: Kontroller */}
                            <Stack spacing={1.5} alignItems="stretch" justifyContent="space-between">
                                <RegionTabs value={selectedRegion} onChange={(e, v) => setSelectedRegion(v)} variant="scrollable" scrollButtons="auto">
                                    {Object.keys(REGIONS).map((r) => (
                                        <RegionTab
                                            key={r}
                                            value={r}
                                            label={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <span>{r}</span>
                                                    <Chip
                                                        size="small"
                                                        label={REGIONS[r].length}
                                                        sx={{
                                                            height: 18,
                                                            fontWeight: 1000,
                                                            bgcolor: isDark ? alpha("#ffffff", 0.1) : alpha("#0f172a", 0.08),
                                                            color: theme.palette.text.primary,
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "none",
                                                        }}
                                                    />
                                                </Stack>
                                            }
                                        />
                                    ))}
                                </RegionTabs>

                                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems="center">
                                    <TextField
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Proje adıyla ara…"
                                        size="small"
                                        fullWidth
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                color: theme.palette.text.primary,
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                            },
                                            "& .MuiOutlinedInput-notchedOutline": {
                                                borderColor: isDark ? alpha("#ffffff", 0.12) : alpha("#0f172a", 0.12),
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

                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <Select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            sx={{
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                color: theme.palette.text.primary,
                                                "& .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: isDark ? alpha("#ffffff", 0.12) : alpha("#0f172a", 0.12),
                                                },
                                            }}
                                        >
                                            <MenuItem value="perf">Sırala: Performans</MenuItem>
                                            <MenuItem value="plan">Sırala: Talep (yüksek)</MenuItem>
                                            <MenuItem value="late">Sırala: Gecikme (yüksek)</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Tooltip title="Sadece gecikmesi olan projeleri göster">
                                        <FormControlLabel
                                            sx={{
                                                m: 0,
                                                px: 1.2,
                                                py: 0.3,
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                            }}
                                            control={<Switch checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} />}
                                            label={<Typography sx={{ fontWeight: 950, color: theme.palette.text.primary }}>Sadece gecikenler</Typography>}
                                        />
                                    </Tooltip>

                                    {/* ✅ Reel Tarihler */}
                                    <Tooltip title="Excel seçip reel sefer tarihlerini yükle">
                                        <Box
                                            onClick={excelSyncLoading ? undefined : importTimesFromExcel}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: excelSyncLoading ? "default" : "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {excelSyncLoading ? "Excel okunuyor..." : "Reel Tarihler"}
                                        </Box>
                                    </Tooltip>

                                    {/* ✅ FTS Tarihler (aynı import fonksiyonu, istersen ileride ayrılaştırırsın) */}
                                    <Tooltip title="Excel seçip FTS tarihlerini yükle">
                                        <Box
                                            onClick={excelSyncLoading ? undefined : importTimesFromExcel}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: excelSyncLoading ? "default" : "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {excelSyncLoading ? "Excel okunuyor..." : "FTS Tarihler"}
                                        </Box>
                                    </Tooltip>

                                    {/* ✅ Excel’e Aktar */}
                                    <Tooltip title="Seçili bölgedeki tüm projeleri Excel’e aktar">
                                        <Box
                                            onClick={exportRegionToExcel}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                "&:hover": { transform: "translateY(-1px)" },
                                                transition: "0.15s",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Excel’e Aktar
                                        </Box>
                                    </Tooltip>
                                </Stack>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 22,
                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                        bgcolor: isDark ? alpha("#0b1220", 0.7) : "rgba(255,255,255,0.85)",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, letterSpacing: "-0.4px" }}>
                                        Liste: {rows.length} proje
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.4 }}>
                                        Detay için kartlara tıkla (sefer listesi, zaman çizelgesi ve rota).
                                    </Typography>

                                    <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.6 }}>
                                        Excel eşleşen sefer sayısı: {Object.keys(excelTimesBySefer || {}).length}
                                    </Typography>
                                    {excelImportInfo && (
                                        <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.35 }}>
                                            Excel satır: {excelImportInfo.totalRows} • Sefer bulunan: {excelImportInfo.withSefer} • Tarih dolu: {excelImportInfo.withAnyDate}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Grid>
                    </TopBar>

                    {/* İçerik */}
                    <CardList>
                        <AnimatePresence initial={false}>
                            {rows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} excelTimesBySefer={excelTimesBySefer} />
                            ))}
                        </AnimatePresence>

                        {rows.length === 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 26,
                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                    background: isDark ? alpha("#0b1220", 0.72) : "rgba(255,255,255,0.85)",
                                    p: 6,
                                    textAlign: "center",
                                    boxShadow: isDark ? "0 18px 65px rgba(0,0,0,0.55)" : "0 16px 55px rgba(2,6,23,0.07)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "1.2rem" }}>
                                    Sonuç bulunamadı
                                </Typography>
                                <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.6 }}>
                                    Arama kriterini değiştir veya “Sadece gecikenler” filtresini kapat.
                                </Typography>
                            </Paper>
                        )}
                    </CardList>
                </Wide>
            </Root>
        </Box>
    );
}

/* ------------------------ DIŞ KATMAN: BACKEND'DEN ÇEK + UltraProjeTablosu'na ver ------------------------ */
export default function AnalizPaneliBackend() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [loading, setLoading] = useState(false);
    const [raw, setRaw] = useState(null);
    const [error, setError] = useState("");

    // varsayılan: bugün
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const [userId, setUserId] = useState(1);

    const load = async () => {
        setLoading(true);
        setError("");
        setRaw(null);

        try {
            const body = {
                startDate: toIsoLocalStart(date),
                endDate: toIsoLocalEnd(date),
                userId: Number(userId),
            };

            const res = await fetch(`${BASE_URL}/tmsorders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const text = await res.text();
            let payload;
            try {
                payload = text ? JSON.parse(text) : null;
            } catch {
                payload = text;
            }

            if (!res.ok) {
                throw new Error(typeof payload === "string" ? payload : JSON.stringify(payload));
            }

            setRaw(payload);
        } catch (e) {
            setError(e?.message || "Bilinmeyen hata");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const data = useMemo(() => extractItems(raw), [raw]);

    return (
        <Box sx={{ width: "100%" }}>
            {/* Üst küçük kontrol barı (veri çekme kısmı) */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    p: 1.2,
                    bgcolor: isDark ? alpha("#020617", 0.72) : alpha("#f8fafc", 0.85),
                    backdropFilter: "blur(10px)",
                    borderBottom: isDark ? `1px solid ${alpha("#ffffff", 0.08)}` : "1px solid rgba(226,232,240,0.9)",
                }}
            >
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Chip
                            size="small"
                            label={`Base: ${BASE_URL}`}
                            sx={{
                                maxWidth: { xs: "100%", md: 520 },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontWeight: 900,
                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                            }}
                        />
                        <Chip
                            size="small"
                            label={`POST /tmsorders`}
                            sx={{
                                fontWeight: 950,
                                bgcolor: alpha("#0ea5e9", isDark ? 0.16 : 0.12),
                                border: `1px solid ${alpha("#0ea5e9", isDark ? 0.26 : 0.2)}`,
                            }}
                        />
                        <Chip
                            size="small"
                            label={loading ? "Yükleniyor..." : `Satır: ${data.length}`}
                            sx={{
                                fontWeight: 950,
                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                            }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { md: "auto" }, flexWrap: "wrap" }}>
                        <Tooltip title="Veriyi tekrar çek">
                            <Box
                                onClick={loading ? undefined : load}
                                sx={{
                                    px: 1.4,
                                    py: 0.9,
                                    borderRadius: 16,
                                    cursor: loading ? "default" : "pointer",
                                    userSelect: "none",
                                    fontWeight: 950,
                                    bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                    color: theme.palette.text.primary,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <MdRefresh />
                                {loading ? "Çekiliyor..." : "Getir"}
                            </Box>
                        </Tooltip>

                        <TextField
                            type="date"
                            size="small"
                            value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
                            onChange={(e) => {
                                const [y, m, d] = e.target.value.split("-").map(Number);
                                const nd = new Date(y, m - 1, d);
                                nd.setHours(0, 0, 0, 0);
                                setDate(nd);
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 16,
                                    bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                },
                            }}
                        />

                        <TextField
                            type="number"
                            size="small"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            inputProps={{ min: 1 }}
                            sx={{
                                width: 120,
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 16,
                                    bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                },
                            }}
                            placeholder="userId"
                        />
                    </Stack>
                </Stack>

                {error ? (
                    <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontWeight: 900, color: "#ef4444" }}>Hata: {error}</Typography>
                    </Box>
                ) : null}
            </Box>

            {/* Asıl UI */}
            <UltraProjeTablosu data={data} />
        </Box>
    );
}

