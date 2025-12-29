import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Box,
    Card,
    Stack,
    Chip,
    Divider,
    Slide,
    useTheme,
    useMediaQuery,
    alpha
} from '@mui/material';
import {
    MdClose,
    MdLocationOn,
    MdDateRange,
    MdAssignmentInd,
    MdLocalShipping,
    MdInfoOutline
} from 'react-icons/md';
import { formatDateTR } from '../yardimcilar/tarihIslemleri';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function DetayPaneli({ type, data, onClose }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    let title = '';
    let filtered = [];

    // Veri Filtreleme Mantığı (Orijinal mantık korundu)
    switch (type) {
        case 'spot':
            title = 'Spot Araç Planlamada';
            filtered = data.filter(o => o.OrderStatu === 3);
            break;
        case 'filo':
            title = 'Filo Araç Planlamada';
            filtered = data.filter(o => o.OrderStatu === 90);
            break;
        case 'planlanan':
            title = 'Talep / Planlanan Listesi';
            filtered = data.filter(o =>
                o.TMSVehicleRequestDocumentNo &&
                !o.TMSVehicleRequestDocumentNo.startsWith("BOS") &&
                ["YURTİÇİ FTL HİZMETLERİ", "FİLO DIŞ YÜK YÖNETİMİ"].includes(o.ServiceName) &&
                ["FTL HİZMETİ", "FİLO DIŞ YÜK YÖNETİMİ"].includes(o.SubServiceName)
            );
            break;
        case 'tedarik':
            title = 'Tedarik Edilen Sevkiyatlar';
            filtered = data.filter(o =>
                o.TMSDespatchDocumentNo &&
                o.TMSDespatchDocumentNo.startsWith("SFR") &&
                o.TMSVehicleRequestDocumentNo &&
                !o.TMSVehicleRequestDocumentNo.startsWith("BOS")
            );
            break;
        case 'tedarik_edilmeyen':
            title = 'Tedarik Edilmeyen Talepler';
            filtered = data.filter(o =>
                !o.TMSDespatchDocumentNo &&
                o.TMSVehicleRequestDocumentNo?.startsWith("VP")
            );
            break;
        case 'sho_basilan':
            title = 'SHÖ Basılan Kayıtlar';
            filtered = data.filter(o => o.IsPrint === true && o.TMSDespatchDocumentNo?.startsWith("SFR"));
            break;
        case 'sho_basilmayan':
            title = 'SHÖ Basılmayan Kayıtlar';
            filtered = data.filter(o => o.IsPrint === false && o.TMSDespatchDocumentNo?.startsWith("SFR"));
            break;
        default:
            title = 'Detay Bilgisi';
            filtered = [];
    }

    return (
        <Dialog
            open={true}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="xl" // Genişlik "xl" yapılarak tablodaki ferahlık buraya da taşındı
            fullWidth
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : '28px', // Daha yumuşak köşeler
                    background: '#f8fafc', // Tablo arka planıyla aynı
                    maxHeight: '85vh',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
                }
            }}
        >
            {/* Üst Başlık Alanı - Ultra Modern */}
            <DialogTitle sx={{
                m: 0, p: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ p: 1, bgcolor: '#2563eb', color: '#white', borderRadius: '10px', display: 'flex', color: 'white' }}>
                            <MdInfoOutline size={24} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 950, color: '#0f172a', letterSpacing: '-0.8px' }}>
                            {title}
                        </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, ml: 5 }}>
                        Toplam {filtered.length} Kayıt Listeleniyor
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    sx={{
                        color: '#64748b',
                        bgcolor: '#f1f5f9',
                        padding: '12px',
                        '&:hover': { bgcolor: '#fee2e2', color: '#ef4444' }
                    }}
                >
                    <MdClose size={24} />
                </IconButton>
            </DialogTitle>

            {/* Liste İçeriği - Daha Geniş Izgara Yapısı */}
            <DialogContent sx={{ p: 4 }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: filtered.length > 1 ? '1fr 1fr' : '1fr' // 2'li yan yana dizilim ile alanı doldurur
                    },
                    gap: 3
                }}>
                    {filtered.length > 0 ? (
                        filtered.map((item, idx) => (
                            <Card
                                key={idx}
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: '24px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        boxShadow: '0 15px 35px rgba(37, 99, 235, 0.1)',
                                        transform: 'translateY(-5px)',
                                        borderColor: '#2563eb'
                                    }
                                }}
                            >
                                {/* Kart Header: Hesap Bilgisi */}
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{
                                            p: 1.5,
                                            bgcolor: alpha('#2563eb', 0.08),
                                            borderRadius: '14px',
                                            color: '#2563eb',
                                            display: 'flex'
                                        }}>
                                            <MdAssignmentInd size={26} />
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.2 }}>
                                                {item.CurrentAccountTitle}
                                            </Typography>
                                            <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>
                                                {item.ProjectName}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Chip
                                        label={item.TMSDespatchDocumentNo || 'PLANLAMA'}
                                        sx={{
                                            fontWeight: 900,
                                            borderRadius: '10px',
                                            height: 32,
                                            bgcolor: item.TMSDespatchDocumentNo ? '#dcfce7' : alpha('#f59e0b', 0.1),
                                            color: item.TMSDespatchDocumentNo ? '#166534' : '#f59e0b',
                                            border: '1px solid',
                                            borderColor: item.TMSDespatchDocumentNo ? '#bbf7d0' : alpha('#f59e0b', 0.2)
                                        }}
                                    />
                                </Stack>

                                <Divider sx={{ my: 2.5, opacity: 0.6 }} />

                                {/* Lokasyonlar - Daha Okunabilir Fontlar */}
                                <Stack direction="row" spacing={2} justifyContent="space-between">
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                            <MdLocationOn size={20} color="#ef4444" />
                                            <Typography sx={{ fontWeight: 800, color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                YÜKLEME
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>
                                            {item.PickupCityName}
                                        </Typography>
                                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            {item.PickupCountyName}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                                        <Box sx={{ width: 40, height: 1, bgcolor: '#e2e8f0', position: 'relative' }}>
                                            <MdLocalShipping style={{ position: 'absolute', top: -10, left: 10, color: '#cbd5e1' }} />
                                        </Box>
                                    </Box>

                                    <Box sx={{ flex: 1, textAlign: 'right' }}>
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
                                            <Typography sx={{ fontWeight: 800, color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                TESLİMAT
                                            </Typography>
                                            <MdLocalShipping size={20} color="#22c55e" />
                                        </Stack>
                                        <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>
                                            {item.DeliveryCityName}
                                        </Typography>
                                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            {item.DeliveryCountyName}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {/* Tarih ve Bilgi Alt Barı */}
                                <Box sx={{
                                    mt: 3, p: 2,
                                    bgcolor: '#f8fafc',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#64748b' }}>
                                        <MdDateRange size={18} />
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                                            {formatDateTR(item.OrderDate)}
                                        </Typography>
                                    </Stack>
                                    <Typography sx={{ fontWeight: 800, color: '#2563eb', fontSize: '0.75rem' }}>
                                        ID: #{idx + 101}
                                    </Typography>
                                </Box>
                            </Card>
                        ))
                    ) : (
                        <Box sx={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            py: 12,
                            bgcolor: '#fff',
                            borderRadius: '32px',
                            border: '3px dashed #e2e8f0'
                        }}>
                            <MdAssignmentInd size={60} color="#cbd5e1" />
                            <Typography variant="h6" sx={{ color: '#94a3b8', mt: 2, fontWeight: 700 }}>
                                Bu kategoriye ait kayıt bulunamadı.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}