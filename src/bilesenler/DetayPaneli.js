import React from "react";
import {
    Dialog, DialogTitle, DialogContent, IconButton, Typography,
    Box, Card, Stack, Chip, Divider, Slide, useTheme,
    useMediaQuery, alpha, styled
} from "@mui/material";
import { MdClose, MdLocationOn, MdDateRange, MdAssignmentInd, MdLocalShipping, MdInfoOutline, MdHistory } from "react-icons/md";
import { formatDateTR } from "../yardimcilar/tarihIslemleri";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// --- MODERN STYLED COMPONENTS ---

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: '24px',
        backgroundColor: '#f8fafc',
        backgroundImage: 'none',
        maxHeight: '85vh',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
    }
}));

const DetailCard = styled(Card)(({ theme }) => ({
    borderRadius: '20px',
    border: '1px solid rgba(0,0,0,0.05)',
    background: '#ffffff',
    padding: '16px',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.04)',
        borderColor: '#2563eb',
    }
}));

const LocationLabel = styled(Typography)({
    fontSize: '0.65rem',
    fontWeight: 800,
    color: '#94a3b8',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px'
});

// --- HELPER FUNCTIONS (Parse & Diff unchanged) ---
const parseTRDateTime = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
    }
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? null : d2;
};

const diffHuman = (from, to) => {
    const a = parseTRDateTime(from);
    const b = parseTRDateTime(to);
    if (!a || !b) return null;
    const ms = b.getTime() - a.getTime();
    const abs = Math.abs(ms);
    const totalMinutes = Math.floor(abs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const mins = totalMinutes % 60;
    const sign = ms < 0 ? "-" : "";
    if (days > 0) return `${sign}${days}g ${hours}s`;
    if (hours > 0) return `${sign}${hours}s ${mins}dk`;
    return `${sign}${mins}dk`;
};

const pickField = (item, candidates) => {
    for (const k of candidates) {
        const v = item?.[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
};

export default function DetayPaneli({ type, data, onClose }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    // Veri Filtreleme (Kısa versiyon)
    const getFilteredData = () => {
        switch (type) {
            case "spot": return { title: "Spot Araç Planlama", list: data.filter(o => Number(o.OrderStatu) === 3) };
            case "filo": return { title: "Filo Araç Planlama", list: data.filter(o => Number(o.OrderStatu) === 90) };
            case "tedarik": return { title: "Tedarik Edilenler", list: data.filter(o => o.TMSDespatchDocumentNo?.startsWith("SFR")) };
            case "tedarik_edilmeyen": return { title: "Bekleyen Talepler", list: data.filter(o => !o.TMSDespatchDocumentNo && o.TMSVehicleRequestDocumentNo?.startsWith("VP")) };
            default: return { title: "Detay Listesi", list: [] };
        }
    };

    const { title, list: filtered } = getFilteredData();

    return (
        <StyledDialog open={true} onClose={onClose} fullScreen={fullScreen} maxWidth="lg" fullWidth TransitionComponent={Transition}>
            <DialogTitle sx={{ p: '20px 32px', bgcolor: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1, bgcolor: alpha("#2563eb", 0.1), borderRadius: '12px', color: '#2563eb', display: 'flex' }}>
                        <MdInfoOutline size={22} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{title}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>{filtered.length} Kayıt Bulundu</Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' } }}>
                    <MdClose size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {filtered.length > 0 ? (
                        filtered.map((item, idx) => {
                            const diff = diffHuman(
                                pickField(item, ["sefer_acilis_zamani", "SeferAcilisZamani", "OrderCreatedDate"]),
                                pickField(item, ["yukleme_tarihi", "YuklemeTarihi", "PickupDate"])
                            );

                            return (
                                <DetailCard key={idx} elevation={0}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ width: 36, height: 36, bgcolor: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                                                <MdAssignmentInd size={20} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                                    {item.CurrentAccountTitle?.substring(0, 30) || "Müşteri Belirtilmemiş"}...
                                                </Typography>
                                                <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {item.ProjectName || "Genel Proje"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Chip
                                            label={item.TMSDespatchDocumentNo || "BEKLEMEDE"}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: '8px', bgcolor: item.TMSDespatchDocumentNo ? '#dcfce7' : '#fff7ed', color: item.TMSDespatchDocumentNo ? '#15803d' : '#c2410c' }}
                                        />
                                    </Stack>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#f8fafc', p: 1.5, borderRadius: '12px', mb: 1.5 }}>
                                        <Box>
                                            <LocationLabel>YÜKLEME</LocationLabel>
                                            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}>{item.PickupCityName || "-"}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}><MdLocalShipping size={16} /></Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <LocationLabel>TESLİMAT</LocationLabel>
                                            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}>{item.DeliveryCityName || "-"}</Typography>
                                        </Box>
                                    </Box>

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#64748b' }}>
                                            <MdDateRange size={14} />
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                {formatDateTR(item.OrderDate || item.PickupDate)}
                                            </Typography>
                                        </Stack>
                                        {diff && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#2563eb', bgcolor: alpha('#2563eb', 0.08), px: 1, py: 0.2, borderRadius: '6px' }}>
                                                <MdHistory size={12} />
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800 }}>{diff}</Typography>
                                            </Stack>
                                        )}
                                    </Stack>
                                </DetailCard>
                            );
                        })
                    ) : (
                        <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 8 }}>
                            <Typography sx={{ color: '#94a3b8', fontWeight: 600 }}>Kayıt bulunamadı.</Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </StyledDialog>
    );
}