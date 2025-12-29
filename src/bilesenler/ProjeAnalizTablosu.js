import React, { useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
    Paper, Typography, Box, Stack, Chip, styled, alpha, Collapse
} from '@mui/material';
import {
    MdLocalShipping, MdKeyboardArrowDown, MdKeyboardArrowUp,
    MdPerson, MdHistory, MdOutlineTimer, MdDoubleArrow, MdAssignment,
    MdPinDrop, MdMonitor
} from 'react-icons/md';
import { motion } from 'framer-motion';

// --- STATÜ EŞLEME ---
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
    } catch (e) { return dateStr; }
};

const norm = (s) => (s ?? "").toString().trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");

// --- STYLES ---
const MainContainer = styled(Box)({
    padding: '32px',
    backgroundColor: '#f4f7fa',
    backgroundImage: 'radial-gradient(#d1d5db 0.5px, transparent 0.5px)',
    backgroundSize: '24px 24px',
    borderRadius: '28px'
});

const GlassCard = styled(Paper)({
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
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

// --- PROJE SATIRI ---
function ProjectRow({ row, allData }) {
    const [open, setOpen] = useState(false);

    // ✅ Bölgesel kırma yok: SADECE ProjectName eşitliği
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
                        <Typography sx={{ fontWeight: 1000, color: '#0f172a', fontSize: '1rem' }}>
                            {row.name}
                        </Typography>
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
                        <Box sx={{ p: 4, bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            {subDetails.map((item, idx) => (
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

                                            <Box sx={{ mb: 2 }}>
                                                {getStatusBadge(item.OrderStatu)}
                                            </Box>

                                            <TimeBadge label="SEFER AÇILIŞ ZAMANI" value={formatDate(item.TMSDespatchCreatedDate)} icon={MdHistory} />
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
                                                        <TimeBadge label="PLANLANAN YÜKLEME" value={formatDate(item.PickupDate)} icon={MdOutlineTimer} color="#10b981" />
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
                                                <TimeBadge label="SİPARİŞ GİRİŞ ZAMANI" value={formatDate(item.OrderCreatedDate)} icon={MdAssignment} color="#64748b" />
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

// --- ANA TABLO: TÜM PROJELER ---
export default function ProjeAnalizTablosu({ data }) {
    const processedRows = useMemo(() => {
        if (!data) return [];

        const stats = {};

        data.forEach(item => {
            // ✅ Bölgesel kırma yok: gelen ProjectName ne ise o.
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

            // Not: Burada da “bölgesel filtre” yok.
            // Eski kodda ServiceName/SubServiceName ile kısıtlama vardı; bunu kaldırdık.
            // Yani data içinde ne geliyorsa hepsi sayılır.

            // TALEP
            if (item.TMSVehicleRequestDocumentNo && !String(item.TMSVehicleRequestDocumentNo).startsWith("BOS")) {
                s.plan.add(item.TMSVehicleRequestDocumentNo);
            }

            // SEVKİYAT (SFR) + İPTAL
            const despNo = item.TMSDespatchDocumentNo || "";
            const isSfr = String(despNo).startsWith("SFR") && !String(despNo).toUpperCase().startsWith("BOS");

            if (isSfr) {
                if (item.OrderStatu === 200) {
                    s.iptal.add(despNo);
                } else {
                    s.ted.add(despNo);

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
            // ✅ “plan > 0” filtresi bile olmasın istiyorsan kaldır.
            .sort((a, b) => b.plan - a.plan);
    }, [data]);

    return (
        <MainContainer>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, bgcolor: '#0f172a', borderRadius: '12px' }}>
                            <MdMonitor color="#fff" size={28} />
                        </Box>
                        <Typography sx={{ fontWeight: 1000, color: '#0f172a', fontSize: '1.2rem' }}>
                            Proje Analiz Tablosu
                        </Typography>
                    </Stack>
                    <Typography sx={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, mt: 0.5 }}>
                        Bölgesel sekme yok — tüm ProjectName değerleri listelenir.
                    </Typography>
                </Box>
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
                                <TableCell align="center" sx={{ fontWeight: 900, color: '#64748b' }}>İPTAL</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900, color: '#64748b', pr: 4 }}>PERFORMANS</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {processedRows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} />
                            ))}
                            {processedRows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ py: 8, textAlign: 'center', color: '#94a3b8', fontWeight: 800 }}>
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
