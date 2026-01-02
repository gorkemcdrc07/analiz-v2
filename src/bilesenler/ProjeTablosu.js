import React, { useMemo, useState } from "react";
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
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------ yardımcılar ------------------------ */
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
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");

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
        return `${String(date.getDate()).padStart(2, "0")}.${String(
            date.getMonth() + 1
        ).padStart(2, "0")}.${date.getFullYear()} ${String(
            date.getHours()
        ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
    if (h == null)
        return { label: "Tarih yok", color: "#94a3b8", hours: null, level: "none" };
    if (h < 30)
        return { label: "Zamanında", color: "#10b981", hours: h, level: "ok" };
    return { label: "Gecikme", color: "#ef4444", hours: h, level: "late" };
};

const StatusPill = ({ statusIdRaw }) => {
    const id = toNum(statusIdRaw);
    const s =
        id != null && STATUS_MAP[id]
            ? STATUS_MAP[id]
            : { label: "Belirsiz", color: "#94a3b8" };
    return (
        <Chip
            size="small"
            label={s.label}
            sx={{
                height: 24,
                fontWeight: 950,
                borderRadius: "999px",
                bgcolor: s.color,
                color: "#fff",
                px: 1,
            }}
        />
    );
};

/* ------------------------ modern UI ------------------------ */
const Root = styled(Box)({
    width: "100%",
    minHeight: "100vh",
    padding: "clamp(12px, 2vw, 26px)",
    background:
        "radial-gradient(1200px 600px at 15% 0%, rgba(59,130,246,0.14), transparent 55%)," +
        "radial-gradient(900px 520px at 85% 5%, rgba(16,185,129,0.10), transparent 60%)," +
        "radial-gradient(1000px 650px at 50% 100%, rgba(245,158,11,0.10), transparent 60%)," +
        "linear-gradient(180deg,#f8fafc, #f6f7fb 60%, #f8fafc)",
});

const Wide = styled(Box)({
    width: "100%",
    maxWidth: 30000,
    marginLeft: "auto",
    marginRight: "auto",
});

const TopBar = styled(Paper)({
    position: "sticky",
    top: 14,
    zIndex: 10,
    borderRadius: 26,
    padding: 18,
    border: "1px solid rgba(226,232,240,0.8)",
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 24px 80px rgba(2,6,23,0.12)",
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

const KPI = styled(motion.div)(({ accent = "#3b82f6" }) => ({
    borderRadius: 22,
    padding: 16,
    border: "1px solid rgba(226,232,240,0.9)",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 55px rgba(2,6,23,0.06)",
    position: "relative",
    overflow: "hidden",
    cursor: "default",
    "&:before": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: `radial-gradient(900px 250px at 18% 0%, ${alpha(
            accent,
            0.18
        )}, transparent 55%)`,
        pointerEvents: "none",
    },
}));

const RegionTabs = styled(Tabs)({
    background: "rgba(15,23,42,0.04)",
    padding: 6,
    borderRadius: 18,
    border: "1px solid rgba(226,232,240,0.9)",
    "& .MuiTabs-indicator": {
        height: "calc(100% - 12px)",
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.92)",
        top: 6,
    },
});

const RegionTab = styled(Tab)({
    textTransform: "none",
    fontWeight: 950,
    zIndex: 2,
    color: "#64748b",
    "&.Mui-selected": { color: "#0f172a" },
});

const CardList = styled(Box)({
    marginTop: 16,
    display: "grid",
    gap: 12,
});

const ProjectCard = styled(motion.div)({
    borderRadius: 24,
    border: "1px solid rgba(226,232,240,0.95)",
    background: "rgba(255,255,255,0.90)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 16px 55px rgba(2,6,23,0.07)",
    overflow: "hidden",
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

const Pill = styled(Chip)(({ pillcolor }) => ({
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    background: alpha(pillcolor || "#3b82f6", 0.12),
    color: pillcolor || "#3b82f6",
    border: `1px solid ${alpha(pillcolor || "#3b82f6", 0.22)}`,
}));

const MiniStat = ({ label, value, color = "#0f172a" }) => (
    <Box sx={{ textAlign: "center", minWidth: 92 }}>
        <Typography
            sx={{
                fontSize: "0.62rem",
                fontWeight: 950,
                color: "#94a3b8",
                letterSpacing: "0.6px",
            }}
        >
            {label}
        </Typography>
        <Typography sx={{ fontSize: "1.08rem", fontWeight: 1000, color }}>
            {value}
        </Typography>
    </Box>
);

const ExpandBtn = styled(Box)(({ open }) => ({
    width: 40,
    height: 40,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: open ? "#0f172a" : "rgba(15,23,42,0.06)",
    color: open ? "#fff" : "#64748b",
    transition: "0.2s",
}));

const ShipmentWrap = styled(Box)({
    padding: 16,
    background: "rgba(15,23,42,0.02)",
    borderTop: "1px solid rgba(226,232,240,0.9)",
});

const ShipmentCard = styled(motion.div)(({ printed }) => ({
    borderRadius: 22,
    border: "1px solid rgba(226,232,240,0.95)",
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 14px 48px rgba(2,6,23,0.07)",
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
        background: printed
            ? "linear-gradient(180deg,#10b981,#059669)"
            : "linear-gradient(180deg,#3b82f6,#2563eb)",
    },
}));

const RowTabs = styled(Tabs)({
    minHeight: 34,
    "& .MuiTabs-indicator": { height: 3, borderRadius: 3 },
});
const RowTab = styled(Tab)({
    minHeight: 34,
    textTransform: "none",
    fontWeight: 950,
    fontSize: "0.85rem",
});

const RouteBox = styled(Box)(({ t = "pickup" }) => ({
    flex: 1,
    borderRadius: 18,
    padding: 14,
    border: `1px dashed ${t === "pickup" ? alpha("#10b981", 0.55) : alpha("#ef4444", 0.55)
        }`,
    background: t === "pickup" ? alpha("#10b981", 0.06) : alpha("#ef4444", 0.06),
}));

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
    DERİNCE: [
        "ARKAS PETROL OFİSİ DERİNCE FTL",
        "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL",
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
    ÇUKUROVA: [
        "PEKER FTL",
        "GDP FTL",
        "ÖZMEN UN FTL",
        "KİPAŞ MARAŞ FTL",
        "TÜRK OLUKLU FTL",
        "İLKON TEKSTİL FTL",
        "BİM / MERSİN",
    ],
    ESKİŞEHİR: [
        "ES FTL",
        "ES GLOBAL FRİGO FTL",
        "KİPAŞ BOZÜYÜK FTL",
        "2A TÜKETİM FTL",
        "MODERN HURDA DÖNÜŞ FTL",
        "MODERN HURDA ZONGULDAK FTL",
        "ŞİŞECAM FTL",
        "DENTAŞ FTL",
    ],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
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

            const isOttonya =
                rowNorm === norm("OTTONYA (HEDEFTEN AÇILIYOR)") &&
                pNorm === norm("OTTONYA");

            const isKucukbayTrakya =
                rowNorm.includes("TRAKYA") &&
                pNorm === norm("KÜÇÜKBAY FTL") &&
                new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm)).has(
                    norm(item.PickupCityName)
                );

            const match =
                isDirect ||
                isPepsiCorlu ||
                isPepsiGebze ||
                isEbebekGebze ||
                isFakirGebze ||
                isOttonya ||
                isKucukbayTrakya;
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
function ProjectRow({ row, allData }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState(0);

    const subDetails = useMemo(
        () => buildSubDetails(row.name, allData),
        [row.name, allData]
    );

    const accentColor =
        row.yuzde >= 90 ? "#10b981" : row.yuzde >= 70 ? "#3b82f6" : "#f59e0b";

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
                                color: "#0f172a",
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
                        <MiniStat
                            label="Zamanında"
                            value={`%${row.yuzde}`}
                            color={row.yuzde >= 90 ? "#10b981" : "#f59e0b"}
                        />
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
                                                    color: "#94a3b8",
                                                    letterSpacing: "0.8px",
                                                }}
                                            >
                                                SEFER
                                            </Typography>
                                            <Typography sx={{ fontWeight: 1000, color: "#0f172a", fontSize: "1.05rem" }}>
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
                                                        bgcolor: timing.color,
                                                        color: "#fff",
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
                                                            bgcolor: alpha(timing.color, 0.12),
                                                            color: timing.color,
                                                            border: `1px solid ${alpha(timing.color, 0.22)}`,
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
                                                        bgcolor: printed ? alpha("#10b981", 0.14) : alpha("#64748b", 0.12),
                                                        color: printed ? "#059669" : "#64748b",
                                                        border: `1px solid ${printed ? alpha("#10b981", 0.24) : alpha("#64748b", 0.20)}`,
                                                    }}
                                                />
                                            </Stack>
                                        </Box>

                                        <Chip
                                            size="small"
                                            label={`#${idx + 1}`}
                                            sx={{
                                                height: 26,
                                                borderRadius: 999,
                                                fontWeight: 1000,
                                                bgcolor: alpha("#0f172a", 0.06),
                                                color: "#0f172a",
                                            }}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 1.2, opacity: 0.6 }} />

                                    {/* TAB CONTENT */}
                                    {tab === 0 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: "#94a3b8",
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
                                                            bgcolor: "rgba(15,23,42,0.06)",
                                                        }}
                                                    >
                                                        <MdPerson size={18} color="#64748b" />
                                                    </Box>
                                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a" }}>
                                                        {item.OrderCreatedBy || "-"}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: "#94a3b8",
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    ZAMAN BİLGİLERİ
                                                </Typography>
                                                <Stack sx={{ mt: 1 }} spacing={0.8}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdHistory color="#64748b" />
                                                        <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                                                            Sefer açılış: {formatDate(item.TMSDespatchCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdOutlineTimer color="#10b981" />
                                                        <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                                                            Yükleme: {formatDate(item.PickupDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdAssignment color="#64748b" />
                                                        <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
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
                                                        color: "#94a3b8",
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    ROTA ÖZETİ
                                                </Typography>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a" }}>
                                                        {pickupCity} / {pickupCounty}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 0.6 }}>
                                                    <MdLocalShipping color="#3b82f6" />
                                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a" }}>
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
                                                    color: "#94a3b8",
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
                                                        bgcolor: alpha("#0f172a", 0.06),
                                                    }}
                                                />
                                                <Chip
                                                    icon={<MdBolt />}
                                                    label={timing.hours == null ? "---" : `${timing.hours.toFixed(1)} saat`}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 1000,
                                                        bgcolor: alpha(timing.color, 0.14),
                                                        color: timing.color,
                                                        border: `1px solid ${alpha(timing.color, 0.22)}`,
                                                    }}
                                                />
                                                <Chip
                                                    icon={<MdOutlineTimer />}
                                                    label={formatDate(item.PickupDate)}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: alpha("#10b981", 0.10),
                                                        color: "#0f172a",
                                                    }}
                                                />
                                            </Stack>

                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    p: 2,
                                                    borderRadius: 20,
                                                    border: "1px solid rgba(226,232,240,0.9)",
                                                    bgcolor: alpha(timing.color, 0.08),
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 1000, color: "#0f172a", fontSize: "1rem" }}>
                                                    {timing.level === "ok"
                                                        ? "✅ Zamanında"
                                                        : timing.level === "late"
                                                            ? "⚠️ Gecikme var"
                                                            : "ℹ️ Tarih eksik"}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 800, color: "#64748b", mt: 0.4 }}>
                                                    Kural: Sefer açılıştan itibaren 30 saat altında yükleme yapılırsa “zamanında” sayılır.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {tab === 2 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <RouteBox t="pickup">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a" }}>Yükleme Noktası</Typography>
                                                </Stack>
                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: "#0f172a" }}>
                                                    {pickupCity}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#64748b" }}>{pickupCounty}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={`Kod: ${item.PickupAddressCode || "-"}`}
                                                    sx={{
                                                        mt: 1.2,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: "#fff",
                                                        border: "1px solid rgba(226,232,240,0.9)",
                                                    }}
                                                />
                                            </RouteBox>

                                            <Box sx={{ display: "grid", placeItems: "center", px: 1 }}>
                                                <MdLocalShipping size={28} color="#3b82f6" />
                                            </Box>

                                            <RouteBox t="delivery">
                                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a" }}>Teslimat Noktası</Typography>
                                                    <MdPinDrop color="#ef4444" />
                                                </Stack>
                                                <Typography
                                                    sx={{
                                                        mt: 0.8,
                                                        fontWeight: 1000,
                                                        color: "#0f172a",
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {deliveryCity}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#64748b", textAlign: "right" }}>
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
                                                            bgcolor: "#fff",
                                                            border: "1px solid rgba(226,232,240,0.9)",
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

/* ------------------------ ana bileşen ------------------------ */
export default function UltraProjeTablosu({ data }) {
    const [selectedRegion, setSelectedRegion] = useState("GEBZE");
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("perf"); // perf | plan | late
    const [onlyLate, setOnlyLate] = useState(false);

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
                service === norm("YURTİÇİ FTL HİZMETLERİ") || service === norm("FİLO DIŞ YÜK YÖNETİMİ");
            if (!inScope) return;

            const reqNo = (item.TMSVehicleRequestDocumentNo || "").toString();
            if (reqNo && !reqNo.startsWith("BOS")) s.plan.add(reqNo);

            const despNo = (item.TMSDespatchDocumentNo || "").toString();
            const isSfr = despNo.startsWith("SFR") && !despNo.toUpperCase().startsWith("BOS");
            if (!isSfr) return;

            const statu = toNum(item.OrderStatu);
            if (statu === 200) {
                s.iptal.add(despNo);
                return;
            }

            s.ted.add(despNo);

            // timing: sefer açılış - yükleme
            const timing = getTimingInfo(item.TMSDespatchCreatedDate, item.PickupDate);
            if (timing.hours != null && reqNo) {
                if (timing.hours < 30) s.ontime_req.add(reqNo);
                else s.late_req.add(reqNo);
            }

            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm("ÖZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despNo);
            else s.spot.add(despNo);

            if (toBool(item.IsPrint)) s.sho_b.add(despNo);
            else s.sho_bm.add(despNo);
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
                                            bgcolor: "#0f172a",
                                            display: "grid",
                                            placeItems: "center",
                                            boxShadow: "0 18px 45px rgba(2,6,23,0.22)",
                                        }}
                                    >
                                        <MdMonitor size={24} color="#fff" />
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 1000,
                                                color: "#0f172a",
                                                fontSize: "1.25rem",
                                                letterSpacing: "-0.7px",
                                            }}
                                        >
                                            ANALİZ PANELİ
                                        </Typography>
                                        <Typography sx={{ fontWeight: 800, color: "#64748b" }}>
                                            Kart görünümü • Filtreleme • Zaman analizi • Rota
                                        </Typography>
                                    </Box>

                                    <Tooltip title="Bu panel, sefer açılışından yüklemeye kadar geçen süreyi (30 saat kuralı) baz alır.">
                                        <IconButton size="small" sx={{ ml: "auto", bgcolor: alpha("#0f172a", 0.05) }}>
                                            <MdInfoOutline />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                <Grid2>
                                    <KPI accent="#0ea5e9" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: "#94a3b8", letterSpacing: "0.8px" }}>
                                            TOPLAM TALEP
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#0f172a" }}>
                                            {kpi.plan}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdTrendingUp color="#0ea5e9" />
                                            <Typography sx={{ fontWeight: 900, color: "#64748b" }}>
                                                Bölge: {selectedRegion}
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#10b981" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: "#94a3b8", letterSpacing: "0.8px" }}>
                                            TEDARİK EDİLEN
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#10b981" }}>
                                            {kpi.ted}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdBolt color="#10b981" />
                                            <Typography sx={{ fontWeight: 900, color: "#64748b" }}>
                                                Aktif seferler
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: "#94a3b8", letterSpacing: "0.8px" }}>
                                            ZAMANINDA ORANI
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "1.55rem",
                                                fontWeight: 1000,
                                                color: kpi.perf >= 90 ? "#10b981" : "#f59e0b",
                                            }}
                                        >
                                            %{kpi.perf}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdWarning color={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} />
                                            <Typography sx={{ fontWeight: 900, color: "#64748b" }}>
                                                30 saat kuralı
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#ef4444" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: "#94a3b8", letterSpacing: "0.8px" }}>
                                            RİSK: GECİKME / İPTAL
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.15rem", fontWeight: 1000, color: "#0f172a" }}>
                                            <span style={{ color: "#ef4444" }}>{kpi.gec}</span> /{" "}
                                            <span style={{ color: "#b91c1c" }}>{kpi.iptal}</span>
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdCancel color="#ef4444" />
                                            <Typography sx={{ fontWeight: 900, color: "#64748b" }}>
                                                Takip alanı
                                            </Typography>
                                        </Stack>
                                    </KPI>
                                </Grid2>
                            </Stack>

                            {/* Sağ: Kontroller */}
                            <Stack spacing={1.5} alignItems="stretch" justifyContent="space-between">
                                <RegionTabs
                                    value={selectedRegion}
                                    onChange={(e, v) => setSelectedRegion(v)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                >
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
                                                            bgcolor: alpha("#0f172a", 0.08),
                                                            color: "#0f172a",
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
                                                bgcolor: "rgba(255,255,255,0.95)",
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
                                            sx={{ borderRadius: 18, bgcolor: "rgba(255,255,255,0.95)" }}
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
                                                bgcolor: "rgba(255,255,255,0.95)",
                                                border: "1px solid rgba(226,232,240,0.9)",
                                            }}
                                            control={
                                                <Switch
                                                    checked={onlyLate}
                                                    onChange={(e) => setOnlyLate(e.target.checked)}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontWeight: 950, color: "#0f172a" }}>
                                                    Sadece gecikenler
                                                </Typography>
                                            }
                                        />
                                    </Tooltip>
                                </Stack>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 22,
                                        border: "1px solid rgba(226,232,240,0.9)",
                                        bgcolor: "rgba(255,255,255,0.85)",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 1000, color: "#0f172a", letterSpacing: "-0.4px" }}>
                                        Liste: {rows.length} proje
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, color: "#64748b", mt: 0.4 }}>
                                        Detay için kartlara tıkla (sefer listesi, zaman çizelgesi ve rota).
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>
                    </TopBar>

                    {/* İçerik */}
                    <CardList>
                        <AnimatePresence initial={false}>
                            {rows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} />
                            ))}
                        </AnimatePresence>

                        {rows.length === 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 26,
                                    border: "1px solid rgba(226,232,240,0.9)",
                                    background: "rgba(255,255,255,0.85)",
                                    p: 6,
                                    textAlign: "center",
                                    boxShadow: "0 16px 55px rgba(2,6,23,0.07)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1000, color: "#0f172a", fontSize: "1.2rem" }}>
                                    Sonuç bulunamadı
                                </Typography>
                                <Typography sx={{ fontWeight: 800, color: "#64748b", mt: 0.6 }}>
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
