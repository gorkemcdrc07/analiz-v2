import React, { useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
    Paper, Typography, Box, Stack, Chip, styled, alpha, Tab, Tabs, Collapse
} from '@mui/material';
import {
    MdLocalShipping, MdKeyboardArrowDown, MdKeyboardArrowUp,
    MdPerson, MdHistory, MdOutlineTimer, MdDoubleArrow, MdAssignment,
    MdPinDrop, MdMonitor
} from 'react-icons/md';
import { motion } from 'framer-motion';

// --- STATÜ EŞLEME SÖZLÜĞÜ (OrderStatu Değerleri) ---
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
    40: { label: "Orjinal Evrak Geldi", color: "#6366f1" },
    50: { label: "Evrak Arşivlendi", color: "#475569" },
    80: { label: "Araç Boşaltmada", color: "#f97316" },
    90: { label: "Filo Araç Planlamada", color: "#ec4899" },
    200: { label: "İptal", color: "#b91c1c" }
};

// --- YARDIMCI FONKSİYONLAR ---
const getStatusBadge = (statusId) => {
    const status = STATUS_MAP[statusId] || { label: "Belirsiz", color: "#94a3b8" };
    return (
        <Chip
            label={status.label.toUpperCase()}
            size="small"
            sx={{
                fontWeight: 900,
                fontSize: '0.65rem',
                height: 22,
                bgcolor: status.color,
                color: '#fff',
                borderRadius: '6px',
                px: 0.5
            }}
        />
    );
};

const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "---") return "---";
    try {
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
        return dateStr;
    }
};

const norm = (s) => (s ?? "").toString().trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");

// --- ✅ TARİH FARKI HESAPLAMA (30 saat kuralı) ---
const hoursDiff = (a, b) => {
    if (!a || !b || a === "---" || b === "---") return null;

    const d1 = new Date(a);
    const d2 = new Date(b);

    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;

    // tarih sırası bazen ters gelebilir diye abs
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    return diffMs / (1000 * 60 * 60); // saat
};

const getTimingInfo = (despatchCreated, pickupDate) => {
    const h = hoursDiff(despatchCreated, pickupDate);

    if (h == null) return { label: "TARİH YOK", color: "#94a3b8", hours: null };
    if (h < 30) return { label: "ZAMANINDA", color: "#10b981", hours: h };
    return { label: "GEÇ TESLİMAT", color: "#ef4444", hours: h };
};

// --- LOJİSTİK TEMA BİLEŞENLERİ ---
const MainContainer = styled(Box)({
    padding: '32px',
    backgroundColor: '#f4f7fa',
    minHeight: '100vh',
    backgroundImage: 'radial-gradient(#d1d5db 0.5px, transparent 0.5px)',
    backgroundSize: '24px 24px'
});

const GlassCard = styled(Paper)({
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
});

const StyledTabs = styled(Tabs)({
    background: '#e2e8f0',
    padding: '6px',
    borderRadius: '16px',
    '& .MuiTabs-indicator': {
        height: 'calc(100% - 12px)',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        zIndex: 0,
        top: '6px',
    },
});

const StyledTab = styled(Tab)({
    textTransform: 'none',
    fontWeight: 800,
    zIndex: 2,
    color: '#64748b',
    '&.Mui-selected': { color: '#0f172a' },
});

const ShipmentPaper = styled(motion.div)(({ isprinted }) => ({
    background: '#ffffff',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    '&:before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, width: '8px', height: '100%',
        background: isprinted === 'true' ? '#10b981' : '#3b82f6',
    }
}));

const DynamicOrderBadge = styled(Box)({
    position: 'absolute',
    right: '-30px',
    top: '20px',
    background: '#f1f5f9',
    color: '#94a3b8',
    fontSize: '0.65rem',
    fontWeight: 900,
    padding: '4px 40px',
    transform: 'rotate(45deg)',
    textAlign: 'center',
    minWidth: '120px',
    letterSpacing: '0.5px'
});

const RouteStop = styled(Box)(({ type }) => ({
    padding: '16px',
    borderRadius: '16px',
    background: type === 'pickup' ? alpha('#10b981', 0.05) : alpha('#ef4444', 0.05),
    border: `1px dashed ${type === 'pickup' ? '#10b981' : '#ef4444'}`,
    flex: 1,
    position: 'relative'
}));

const TimeBadge = ({ label, value, icon: Icon, color = "#3b82f6" }) => (
    <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 1000, color: color, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: '0.5px' }}>
            {Icon && <Icon size={12} />} {label}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{value}</Typography>
    </Box>
);

const StatBox = ({ label, value, color }) => (
    <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 1000, color: color }}>{value}</Typography>
    </Box>
);

// --- PROJE SATIRI BİLEŞENİ ---
function ProjectRow({ row, allData }) {
    const [open, setOpen] = useState(false);

    const subDetails = useMemo(() => {
        const seenRequests = new Set();
        return allData.filter(item => {
            const pNorm = norm(item.ProjectName);
            const rowNorm = norm(row.name);

            // ✅ özel mapping ile oluşturduğumuz proje adları için de eşleştirme yapalım:
            // item.ProjectName'i pickup il/ilçe ile "finalProjectName" gibi normalize edemiyoruz burada (çünkü ProjectRow'a gelmeden dönüşüyor).
            // Bu yüzden: hem row.name ile item.ProjectName eşitliği, hem de bilinen özel projeleri pickup'a göre yakalıyoruz.

            const isProjectMatchDirect = pNorm === rowNorm;

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

            // senin mevcut TRAKYA/KÜÇÜKBAY özel eşleştirmen
            const isKucukbayTrakyaSpecial =
                (rowNorm.includes("TRAKYA") && pNorm === norm("KÜÇÜKBAY FTL")) &&
                new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm)).has(norm(item.PickupCityName));

            const isProjectMatch =
                isProjectMatchDirect ||
                isPepsiCorlu || isPepsiGebze ||
                isEbebekGebze ||
                isFakirGebze ||
                isOttonya ||
                isKucukbayTrakyaSpecial;

            if (isProjectMatch) {
                const reqNo = item.TMSVehicleRequestDocumentNo;
                const despNo = item.TMSDespatchDocumentNo || "";
                const isDespatchValid = !despNo.toUpperCase().startsWith("BOS");

                if (reqNo && isDespatchValid && !seenRequests.has(reqNo)) {
                    seenRequests.add(reqNo);
                    return true;
                }
            }
            return false;
        }).slice(0, 50);
    }, [row.name, allData]);

    return (
        <React.Fragment>
            <TableRow
                onClick={() => setOpen(!open)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha('#3b82f6', 0.02) } }}
            >
                <TableCell sx={{ pl: 4, py: 3.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: open ? '#0f172a' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }}>
                            {open ? <MdKeyboardArrowUp size={22} color="#fff" /> : <MdKeyboardArrowDown size={22} color="#64748b" />}
                        </Box>
                        <Typography sx={{ fontWeight: 1000, color: '#0f172a', fontSize: '1rem' }}>{row.name}</Typography>
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <StatBox label="TALEP" value={row.plan} color="#1e293b" />
                </TableCell>

                <TableCell align="center">
                    <Stack direction="row" spacing={3} justifyContent="center">
                        <StatBox label="TEDARİK EDİLEN" value={row.ted} color="#10b981" />
                        <StatBox label="TEDARİK EDİLMEYEN" value={row.edilmeyen} color="#f59e0b" />
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <Stack direction="row" spacing={3} justifyContent="center">
                        <StatBox label="SPOT" value={row.spot} color="#3b82f6" />
                        <StatBox label="FİLO" value={row.filo} color="#8b5cf6" />
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <Stack direction="row" spacing={3} justifyContent="center">
                        <StatBox label="SHÖ BASILAN" value={row.sho_b} color="#059669" />
                        <StatBox label="SHÖ BASILMAYAN" value={row.sho_bm} color="#f97316" />
                    </Stack>
                </TableCell>

                {/* ✅ BİLGİ (ZAMANINDA / GEÇ) */}
                <TableCell align="center">
                    <Stack direction="row" spacing={3} justifyContent="center">
                        <StatBox label="ZAMANINDA" value={row.zamaninda} color="#10b981" />
                        <StatBox label="GEÇ" value={row.gec} color="#ef4444" />
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <StatBox label="İPTAL" value={row.iptal} color="#b91c1c" />
                </TableCell>

                {/* ✅ PERFORMANS = zamanında / talep */}
                <TableCell align="right" sx={{ pr: 4 }}>
                    <Typography
                        sx={{
                            fontSize: '1.6rem',
                            fontWeight: 1000,
                            color: row.yuzde >= 90 ? '#10b981' : '#f59e0b',
                            letterSpacing: '-1px'
                        }}
                    >
                        %{row.yuzde}
                    </Typography>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 4, bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            {subDetails.map((item, idx) => {
                                const timing = getTimingInfo(item.TMSDespatchCreatedDate, item.PickupDate);

                                return (
                                    <ShipmentPaper key={idx} isprinted={item.IsPrint ? 'true' : 'false'}>
                                        <DynamicOrderBadge>{idx + 1}. SİPARİŞ</DynamicOrderBadge>

                                        <Stack direction="row" spacing={4} alignItems="stretch">
                                            <Box sx={{ minWidth: '200px' }}>
                                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 1000, color: '#94a3b8', mb: 0.5, letterSpacing: '1px' }}>
                                                    SEFER NO
                                                </Typography>

                                                <Typography sx={{ fontWeight: 1000, color: '#0f172a', fontSize: '1.15rem', mb: 1 }}>
                                                    {item.TMSDespatchDocumentNo || 'PLANLANMADI'}
                                                </Typography>

                                                <Box sx={{ mb: 1 }}>
                                                    {getStatusBadge(item.OrderStatu)}
                                                </Box>

                                                {/* ✅ 30 saat kuralı: Zamanında / Geç Teslimat */}
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                                    <Chip
                                                        label={timing.label}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 900,
                                                            fontSize: '0.65rem',
                                                            height: 22,
                                                            bgcolor: timing.color,
                                                            color: '#fff',
                                                            borderRadius: '6px',
                                                            px: 0.5
                                                        }}
                                                    />
                                                    {timing.hours != null && (
                                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                                            ({timing.hours.toFixed(1)} saat)
                                                        </Typography>
                                                    )}
                                                </Stack>

                                                <TimeBadge
                                                    label="SEFER AÇILIŞ ZAMANI"
                                                    value={formatDate(item.TMSDespatchCreatedDate)}
                                                    icon={MdHistory}
                                                />
                                            </Box>

                                            <Stack direction="row" sx={{ flexGrow: 1 }} spacing={2} alignItems="center">
                                                <RouteStop type="pickup">
                                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 1000, color: '#10b981', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <MdPinDrop /> YÜKLEME NOKTASI
                                                    </Typography>
                                                    <Typography sx={{ fontWeight: 1000, color: '#1e293b' }}>{item.PickupCityName}</Typography>
                                                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>{item.PickupCountyName}</Typography>

                                                    <Box sx={{ mt: 'auto' }}>
                                                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 1000, color: '#475569', bgcolor: '#fff', px: 1, py: 0.2, borderRadius: '4px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
                                                            KOD: {item.PickupAddressCode}
                                                        </Typography>
                                                        <Box sx={{ mt: 2 }}>
                                                            <TimeBadge
                                                                label="PLANLANAN YÜKLEME"
                                                                value={formatDate(item.PickupDate)}
                                                                icon={MdOutlineTimer}
                                                                color="#10b981"
                                                            />
                                                        </Box>
                                                    </Box>
                                                </RouteStop>

                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <MdLocalShipping size={24} color="#3b82f6" />
                                                    <MdDoubleArrow size={20} color="#cbd5e1" />
                                                </Box>

                                                <RouteStop type="delivery">
                                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 1000, color: '#ef4444', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <MdPinDrop /> TESLİMAT NOKTASI
                                                    </Typography>
                                                    <Typography sx={{ fontWeight: 1000, color: '#1e293b' }}>{item.DeliveryCityName}</Typography>
                                                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>{item.DeliveryCountyName}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 1000, color: '#475569', bgcolor: '#fff', px: 1, py: 0.2, borderRadius: '4px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
                                                        KOD: {item.DeliveryAddressCode}
                                                    </Typography>
                                                </RouteStop>
                                            </Stack>

                                            <Box sx={{ minWidth: '220px', pl: 3, borderLeft: '1px dashed #cbd5e1' }}>
                                                <Stack spacing={2}>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 1000, color: '#94a3b8', mb: 1 }}>
                                                            OPERASYON SORUMLUSU
                                                        </Typography>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <MdPerson size={18} color="#64748b" />
                                                            </Box>
                                                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                                                {item.OrderCreatedBy}
                                                            </Typography>
                                                        </Stack>
                                                    </Box>
                                                    <TimeBadge
                                                        label="SİPARİŞ GİRİŞ ZAMANI"
                                                        value={formatDate(item.OrderCreatedDate)}
                                                        icon={MdAssignment}
                                                        color="#64748b"
                                                    />
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </ShipmentPaper>
                                );
                            })}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

// --- ANA PANEL BİLEŞENİ ---
export default function UltraProjeTablosu({ data }) {
    const [selectedRegion, setSelectedRegion] = useState('GEBZE');

    const processedData = useMemo(() => {
        if (!data) return {};
        const stats = {};

        data.forEach(item => {
            let finalProjectName = item.ProjectName;

            const pNorm = norm(item.ProjectName);

            // ✅ KÜÇÜKBAY özel kuralı (mevcut)
            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA_CITIES = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                if (TRAKYA_CITIES.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                else return;
            }

            // ✅ PEPSİ FTL -> ÇORLU / GEBZE kırılımı
            if (pNorm === norm("PEPSİ FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);

                if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
                else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
            }

            // ✅ EBEBEK FTL -> GEBZE kırılımı
            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
            }

            // ✅ FAKİR FTL -> GEBZE kırılımı
            if (pNorm === norm("FAKİR FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
            }

            // ✅ OTTONYA isimlendirme
            if (pNorm === norm("OTTONYA")) {
                finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";
            }

            if (!stats[finalProjectName]) {
                stats[finalProjectName] = {
                    plan: new Set(),     // talep (VP...)
                    ted: new Set(),      // tedarik edilen (SFR...)
                    iptal: new Set(),    // iptal edilen (SFR + statu 200)
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),

                    // ✅ zamanında/geç performansı REQUEST bazında
                    ontime_req: new Set(), // TMSVehicleRequestDocumentNo
                    late_req: new Set()    // TMSVehicleRequestDocumentNo
                };
            }

            const s = stats[finalProjectName];

            if (["YURTİÇİ FTL HİZMETLERİ", "FİLO DIŞ YÜK YÖNETİMİ"].includes(item.ServiceName)) {
                const reqNo = item.TMSVehicleRequestDocumentNo || "";

                // TALEP
                if (reqNo && !reqNo.startsWith("BOS")) {
                    s.plan.add(reqNo);
                }

                // SEVKİYAT (SFR) + İPTAL AYRIMI
                const despNo = item.TMSDespatchDocumentNo || "";
                if (despNo.startsWith("SFR") && !despNo.startsWith("BOS")) {
                    if (item.OrderStatu === 200) {
                        s.iptal.add(despNo);
                    } else {
                        s.ted.add(despNo);

                        // ✅ zamanında / geç (30 saat kuralı) -> REQUEST bazında say
                        const timing = getTimingInfo(item.TMSDespatchCreatedDate, item.PickupDate);
                        if (timing.hours != null && reqNo) {
                            if (timing.hours < 30) s.ontime_req.add(reqNo);
                            else s.late_req.add(reqNo);
                        }

                        // filo / spot
                        if (["FİLO", "ÖZMAL", "MODERN AMBALAJ FİLO"].includes(item.VehicleWorkingName)) {
                            s.filo.add(despNo);
                        } else {
                            s.spot.add(despNo);
                        }

                        // shö basılan / basılmayan
                        if (item.IsPrint) s.sho_b.add(despNo);
                        else s.sho_bm.add(despNo);
                    }
                }
            }
        });

        return stats;
    }, [data]);

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
            "MODERN BOBİN FTL"
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
            "ENTAŞ FTL"
        ],
        DERİNCE: [
            "ARKAS PETROL OFİSİ DERİNCE FTL",
            "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL"
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
            "KÜÇÜKBAY İZMİR FTL"
        ],
        ÇUKUROVA: [
            "PEKER FTL",
            "GDP FTL",
            "ÖZMEN UN FTL",
            "KİPAŞ MARAŞ FTL",
            "TÜRK OLUKLU FTL",
            "İLKON TEKSTİL FTL",
            "BİM / MERSİN"
        ],
        ESKİŞEHİR: [
            "ES FTL",
            "ES GLOBAL FRİGO FTL",
            "KİPAŞ BOZÜYÜK FTL",
            "2A TÜKETİM FTL",
            "MODERN HURDA DÖNÜŞ FTL",
            "MODERN HURDA ZONGULDAK FTL",
            "ŞİŞECAM FTL",
            "DENTAŞ FTL"
        ],
        "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
        AFYON: ["BİM AFYON PLATFORM FTL"]
    };

    const currentRows = useMemo(() => {
        return (REGIONS[selectedRegion] || []).map(pName => {
            const s = processedData[pName] || {
                plan: new Set(),
                ted: new Set(),
                iptal: new Set(),
                filo: new Set(),
                spot: new Set(),
                sho_b: new Set(),
                sho_bm: new Set(),
                ontime_req: new Set(),
                late_req: new Set()
            };

            const plan = s.plan.size;
            const ted = s.ted.size;
            const iptal = s.iptal.size;
            const edilmeyen = Math.max(0, plan - (ted + iptal));

            const zamaninda = s.ontime_req.size;
            const gec = s.late_req.size;

            // ✅ PERFORMANS = (ZAMANINDA / TALEP) * 100
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
                yuzde
            };
        }).filter(r => r.plan > 0);
    }, [selectedRegion, processedData]);

    return (
        <MainContainer>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, bgcolor: '#0f172a', borderRadius: '12px' }}>
                            <MdMonitor color="#fff" size={28} />
                        </Box>
                    </Stack>
                    <Typography sx={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, mt: 0.5 }}>
                        Real-time Lojistik ve Sevkiyat Takip Sistemi
                    </Typography>
                </Box>

                <StyledTabs value={selectedRegion} onChange={(e, v) => setSelectedRegion(v)}>
                    {Object.keys(REGIONS).map(reg => <StyledTab key={reg} label={reg} value={reg} />)}
                </StyledTabs>
            </Stack>

            <GlassCard elevation={0}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 900, color: '#64748b', pl: 4, py: 2.5 }}>MÜŞTERİ / PROJE ODAĞI</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>TALEP</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>TEDARİK</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>KAYNAK</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>SHÖ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>BİLGİ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>İPTAL</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900, color: '#64748b', pr: 4 }}>PERFORMANS</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {currentRows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </GlassCard>
        </MainContainer>
    );
}
