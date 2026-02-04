import React, { useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
    Paper, Typography, Box, Stack, Chip, styled, alpha, Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    MdLocalShipping, MdKeyboardArrowDown, MdKeyboardArrowUp,
    MdPerson, MdHistory, MdOutlineTimer, MdDoubleArrow, MdAssignment,
    MdPinDrop, MdMonitor
} from 'react-icons/md';
import { motion } from 'framer-motion';

// --- STAT�o EŞLEME ---
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
    50: { label: "Evrak Ar�Yivlendi", color: "#475569" },
    80: { label: "Araç Bo�Yaltmada", color: "#f97316" },
    90: { label: "Filo Araç Planlamada", color: "#ec4899" },
    200: { label: "İptal", color: "#b91c1c" }
};

const getStatusBadge = (statusId, theme) => {
    const status = STATUS_MAP[statusId] || { label: "Belirsiz", color: "#94a3b8" };
    const isDark = theme.palette.mode === "dark";

    return (
        <Chip
            label={status.label.toUpperCase()}
            size="small"
            sx={{
                fontWeight: 900,
                fontSize: '0.65rem',
                height: 22,
                bgcolor: isDark ? alpha(status.color, 0.30) : status.color,
                color: '#fff',
                borderRadius: '6px',
                px: 0.5,
                border: isDark ? `1px solid ${alpha(status.color, 0.45)}` : 'none',
            }}
        />
    );
};

const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "---") return "---";
    try {
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (e) { return dateStr; }
};

const norm = (s) => (s ?? "").toString().trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");

// --- THEME-AWARE STYLES ---
const MainContainer = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        padding: '32px',
        backgroundColor: isDark ? '#020617' : '#f4f7fa',
        backgroundImage: isDark
            ? 'radial-gradient(rgba(148,163,184,0.22) 0.45px, transparent 0.45px)'
            : 'radial-gradient(#d1d5db 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
        borderRadius: '28px',
        border: isDark ? `1px solid ${alpha('#ffffff', 0.08)}` : 'none',
    };
});

const GlassCard = styled(Paper)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: '24px',
        boxShadow: isDark ? '0 18px 60px rgba(0,0,0,0.55)' : '0 10px 40px rgba(0,0,0,0.06)',
        background: isDark ? alpha('#0b1220', 0.90) : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : '1px solid #e2e8f0',
    };
});

const ShipmentPaper = styled(motion.div)(({ theme, isprinted }) => {
    const isDark = theme.palette.mode === "dark";
    const barColor = isprinted === 'true' ? '#10b981' : '#3b82f6';
    return {
        background: isDark ? '#0b1220' : '#ffffff',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '20px',
        border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? '0 10px 28px rgba(0,0,0,0.45)' : '0 4px 12px rgba(0,0,0,0.02)',
        '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '8px',
            height: '100%',
            background: barColor,
        },
    };
});

const DynamicOrderBadge = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        position: 'absolute',
        right: '-30px',
        top: '20px',
        background: isDark ? alpha('#ffffff', 0.06) : '#f1f5f9',
        color: isDark ? alpha('#ffffff', 0.70) : '#94a3b8',
        fontSize: '0.65rem',
        fontWeight: 900,
        padding: '4px 40px',
        transform: 'rotate(45deg)',
        textAlign: 'center',
        minWidth: '120px',
        letterSpacing: '0.5px',
        border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : 'none',
    };
});

const RouteStop = styled(Box)(({ theme, type }) => {
    const isDark = theme.palette.mode === "dark";
    const base = type === 'pickup' ? '#10b981' : '#ef4444';
    return {
        padding: '16px',
        borderRadius: '16px',
        background: alpha(base, isDark ? 0.10 : 0.05),
        border: `1px dashed ${alpha(base, isDark ? 0.55 : 1)}`,
        flex: 1,
        position: 'relative',
    };
});

const TimeBadge = ({ label, value, icon: Icon, color = "#3b82f6" }) => {
    const theme = useTheme();
    return (
        <Box sx={{ mb: 2 }}>
            <Typography
                sx={{
                    fontSize: '0.55rem',
                    fontWeight: 1000,
                    color: color,
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    letterSpacing: '0.5px'
                }}
            >
                {Icon && <Icon size={12} />} {label}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: theme.palette.text.primary }}>
                {value}
            </Typography>
        </Box>
    );
};

const StatBox = ({ label, value, color }) => {
    const theme = useTheme();
    return (
        <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: theme.palette.text.secondary, mb: 0.5 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 1000, color: color }}>
                {value}
            </Typography>
        </Box>
    );
};

// --- PROJE SATIRI ---
function ProjectRow({ row, allData }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [open, setOpen] = useState(false);

    // �o. Bölgesel kırma yok: SADECE ProjectName e�Yitli�Yi
    const subDetails = useMemo(() => {
        const seenRequests = new Set();
        const rowNorm = norm(row.name);

        return (allData || [])
            .filter(item => {
                const pNorm = norm(item.ProjectName || 'TANIMSIZ PROJE');
                if (pNorm !== rowNorm) return false;

                const reqNo = item.TMSVehicleRequestDocumentNo;
                const despNo = item.TMSDespatchDocumentNo || "";
                const isDespatchValid = !String(despNo).toUpperCase().startsWith("BOS");

                // aynı talebi tekrar göstermeyelim
                if (reqNo && isDespatchValid && !seenRequests.has(reqNo)) {
                    seenRequests.add(reqNo);
                    return true;
                }
                return false;
            })
            .slice(0, 50);
    }, [row.name, allData]);

    const rowHoverBg = isDark ? alpha('#60a5fa', 0.06) : alpha('#3b82f6', 0.02);
    const cellBorder = isDark ? alpha('#ffffff', 0.08) : alpha('#0f172a', 0.06);

    return (
        <React.Fragment>
            <TableRow
                onClick={() => setOpen(!open)}
                sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: rowHoverBg },
                    '& td': { borderBottom: `1px solid ${cellBorder}` },
                }}
            >
                <TableCell sx={{ pl: 4, py: 3.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '10px',
                                bgcolor: open
                                    ? (isDark ? alpha('#ffffff', 0.10) : '#0f172a')
                                    : (isDark ? alpha('#ffffff', 0.06) : '#f1f5f9'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: '0.3s',
                                border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : 'none',
                            }}
                        >
                            {open ? (
                                <MdKeyboardArrowUp size={22} color={open && !isDark ? "#fff" : (isDark ? "#e2e8f0" : "#fff")} />
                            ) : (
                                <MdKeyboardArrowDown size={22} color={isDark ? "#94a3b8" : "#64748b"} />
                            )}
                        </Box>

                        <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: '1rem' }}>
                            {row.name}
                        </Typography>
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <StatBox label="TALEP" value={row.plan} color={theme.palette.text.primary} />
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
                        <StatBox label="SH�- BASILAN" value={row.sho_b} color="#059669" />
                        <StatBox label="SH�- BASILMAYAN" value={row.sho_bm} color="#f97316" />
                    </Stack>
                </TableCell>

                <TableCell align="center">
                    <StatBox label="İPTAL" value={row.iptal} color="#b91c1c" />
                </TableCell>

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
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box
                            sx={{
                                p: 4,
                                bgcolor: isDark ? alpha('#ffffff', 0.03) : '#f8fafc',
                                borderTop: isDark ? `2px solid ${alpha('#ffffff', 0.10)}` : '2px solid #e2e8f0',
                            }}
                        >
                            {subDetails.map((item, idx) => (
                                <ShipmentPaper key={idx} isprinted={item.IsPrint ? 'true' : 'false'}>
                                    <DynamicOrderBadge>{idx + 1}. SİPARİŞ</DynamicOrderBadge>

                                    <Stack direction="row" spacing={4} alignItems="stretch">
                                        <Box sx={{ minWidth: '200px' }}>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 1000,
                                                    color: theme.palette.text.secondary,
                                                    mb: 0.5,
                                                    letterSpacing: '1px'
                                                }}
                                            >
                                                SEFER NO
                                            </Typography>

                                            <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: '1.15rem', mb: 1 }}>
                                                {item.TMSDespatchDocumentNo || 'PLANLANMADI'}
                                            </Typography>

                                            <Box sx={{ mb: 2 }}>
                                                {getStatusBadge(item.OrderStatu, theme)}
                                            </Box>

                                            <TimeBadge label="SEFER A�?ILIŞ ZAMANI" value={formatDate(item.TMSDespatchCreatedDate)} icon={MdHistory} />
                                        </Box>

                                        <Stack direction="row" sx={{ flexGrow: 1 }} spacing={2} alignItems="center">
                                            <RouteStop type="pickup">
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: 1000,
                                                        color: '#10b981',
                                                        mb: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5
                                                    }}
                                                >
                                                    <MdPinDrop /> Y�oKLEME NOKTASI
                                                </Typography>

                                                <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                    {item.PickupCityName}
                                                </Typography>

                                                <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, mb: 2 }}>
                                                    {item.PickupCountyName}
                                                </Typography>

                                                <Box sx={{ mt: 'auto' }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 1000,
                                                            color: theme.palette.text.primary,
                                                            bgcolor: isDark ? alpha('#ffffff', 0.05) : '#fff',
                                                            px: 1,
                                                            py: 0.2,
                                                            borderRadius: '4px',
                                                            border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : '1px solid #e2e8f0',
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        KOD: {item.PickupAddressCode}
                                                    </Typography>

                                                    <Box sx={{ mt: 2 }}>
                                                        <TimeBadge label="PLANLANAN Y�oKLEME" value={formatDate(item.PickupDate)} icon={MdOutlineTimer} color="#10b981" />
                                                    </Box>
                                                </Box>
                                            </RouteStop>

                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <MdLocalShipping size={24} color="#3b82f6" />
                                                <MdDoubleArrow size={20} color={isDark ? alpha('#ffffff', 0.22) : '#cbd5e1'} />
                                            </Box>

                                            <RouteStop type="delivery">
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: 1000,
                                                        color: '#ef4444',
                                                        mb: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5
                                                    }}
                                                >
                                                    <MdPinDrop /> TESLİMAT NOKTASI
                                                </Typography>

                                                <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                    {item.DeliveryCityName}
                                                </Typography>

                                                <Typography sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary, mb: 2 }}>
                                                    {item.DeliveryCountyName}
                                                </Typography>

                                                <Typography
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 1000,
                                                        color: theme.palette.text.primary,
                                                        bgcolor: isDark ? alpha('#ffffff', 0.05) : '#fff',
                                                        px: 1,
                                                        py: 0.2,
                                                        borderRadius: '4px',
                                                        border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : '1px solid #e2e8f0',
                                                        width: 'fit-content'
                                                    }}
                                                >
                                                    KOD: {item.DeliveryAddressCode}
                                                </Typography>
                                            </RouteStop>
                                        </Stack>

                                        <Box
                                            sx={{
                                                minWidth: '220px',
                                                pl: 3,
                                                borderLeft: isDark ? `1px dashed ${alpha('#ffffff', 0.18)}` : '1px dashed #cbd5e1'
                                            }}
                                        >
                                            <Stack spacing={2}>
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.6rem',
                                                            fontWeight: 1000,
                                                            color: theme.palette.text.secondary,
                                                            mb: 1
                                                        }}
                                                    >
                                                        OPERASYON SORUMLUSU
                                                    </Typography>

                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <Box
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: '50%',
                                                                bgcolor: isDark ? alpha('#ffffff', 0.06) : '#f1f5f9',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : 'none',
                                                            }}
                                                        >
                                                            <MdPerson size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                                                        </Box>

                                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: theme.palette.text.primary }}>
                                                            {item.OrderCreatedBy}
                                                        </Typography>
                                                    </Stack>
                                                </Box>

                                                <TimeBadge label="SİPARİŞ GİRİŞ ZAMANI" value={formatDate(item.OrderCreatedDate)} icon={MdAssignment} color={isDark ? "#94a3b8" : "#64748b"} />
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </ShipmentPaper>
                            ))}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

// --- ANA TABLO: T�oM PROJELER ---
export default function ProjeAnalizTablosu({ data }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const processedRows = useMemo(() => {
        if (!data) return [];

        const stats = {};

        data.forEach(item => {
            const finalProjectName = (item.ProjectName ?? '').trim() || 'TANIMSIZ PROJE';

            if (!stats[finalProjectName]) {
                stats[finalProjectName] = {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set()
                };
            }

            const s = stats[finalProjectName];

            if (item.TMSVehicleRequestDocumentNo && !String(item.TMSVehicleRequestDocumentNo).startsWith("BOS")) {
                s.plan.add(item.TMSVehicleRequestDocumentNo);
            }

            const despNo = item.TMSDespatchDocumentNo || "";
            const isSfr = String(despNo).startsWith("SFR") && !String(despNo).toUpperCase().startsWith("BOS");

            if (isSfr) {
                if (item.OrderStatu === 200) {
                    s.iptal.add(despNo);
                } else {
                    s.ted.add(despNo);

                    if (["FİLO", "�-ZMAL", "MODERN AMBALAJ FİLO"].includes(item.VehicleWorkingName)) {
                        s.filo.add(despNo);
                    } else {
                        s.spot.add(despNo);
                    }

                    if (item.IsPrint) s.sho_b.add(despNo);
                    else s.sho_bm.add(despNo);
                }
            }
        });

        return Object.keys(stats)
            .map(name => {
                const s = stats[name];
                const plan = s.plan.size;
                const ted = s.ted.size;
                const iptal = s.iptal.size;
                const edilmeyen = Math.max(0, plan - (ted + iptal));

                return {
                    name,
                    plan,
                    ted,
                    edilmeyen,
                    iptal,
                    spot: s.spot.size,
                    filo: s.filo.size,
                    sho_b: s.sho_b.size,
                    sho_bm: s.sho_bm.size,
                    yuzde: plan > 0 ? Math.round((ted / plan) * 100) : 0
                };
            })
            .sort((a, b) => b.plan - a.plan);
    }, [data]);

    const titleBadgeBg = isDark ? alpha('#ffffff', 0.06) : '#0f172a';

    return (
        <MainContainer>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                p: 1,
                                bgcolor: titleBadgeBg,
                                borderRadius: '12px',
                                border: isDark ? `1px solid ${alpha('#ffffff', 0.10)}` : 'none',
                            }}
                        >
                            <MdMonitor color={isDark ? "#e2e8f0" : "#fff"} size={28} />
                        </Box>

                        <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: '1.2rem' }}>
                            Proje Analiz Tablosu
                        </Typography>
                    </Stack>

                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem', fontWeight: 600, mt: 0.5 }}>
                        Bölgesel sekme yok �?" tüm ProjectName de�Yerleri listelenir.
                    </Typography>
                </Box>
            </Stack>

            <GlassCard elevation={0}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: isDark ? alpha('#ffffff', 0.04) : '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 900, color: theme.palette.text.secondary, pl: 4, py: 2.5 }}>
                                    M�oŞTERİ / PROJE ODAĞI
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                    TALEP
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                    TEDARİK
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                    KAYNAK
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                    SH�-
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                    İPTAL
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900, color: theme.palette.text.secondary, pr: 4 }}>
                                    PERFORMANS
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {processedRows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} />
                            ))}

                            {processedRows.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        sx={{
                                            py: 8,
                                            textAlign: 'center',
                                            color: theme.palette.text.secondary,
                                            fontWeight: 800
                                        }}
                                    >
                                        Kayıt bulunamadı.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </GlassCard>
        </MainContainer>
    );
}
