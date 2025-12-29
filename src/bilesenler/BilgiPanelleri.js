import React, { useState } from 'react';
import CountUp from 'react-countup';
import {
    Box, Card, CardContent, Typography, Grid, Button,
    Collapse, Paper, Stack, styled, alpha
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import {
    FaTruckMoving, FaWarehouse, FaFileAlt, FaFileExcel, FaChevronDown,
    FaChevronUp, FaClipboardList, FaCheckCircle, FaExclamationCircle, FaBolt
} from 'react-icons/fa';

// --- ULTRA MODERN STYLED COMPONENTS ---

const PremiumContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    maxWidth: '1600px', // Geniş ekranlarda daha ferah görünüm
    margin: '0 auto',
    padding: '0 16px'
}));

const ModernFilterBar = styled(Paper)(({ theme }) => ({
    padding: '20px 32px',
    marginBottom: '32px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
}));

const StyledNeonButton = styled(Button)(({ theme }) => ({
    borderRadius: '16px',
    textTransform: 'none',
    padding: '12px 40px',
    fontWeight: 800,
    fontSize: '0.95rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    color: '#fff',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.2)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
        transform: 'scale(1.05) translateY(-2px)',
        background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
        boxShadow: '0 15px 30px rgba(15, 23, 42, 0.3)',
    }
}));

export default function BilgiPanelleri({
    data, loading, startDate, endDate,
    setStartDate, setEndDate, handleFilter
}) {
    const [showTedarikDetay, setShowTedarikDetay] = useState(false);

    if (loading) return null;

    // Veri Analiz Mantığı
    const talepPlanlananSet = new Set(data.filter(o => o.TMSVehicleRequestDocumentNo && !o.TMSVehicleRequestDocumentNo.startsWith("BOS") && ["YURTİÇİ FTL HİZMETLERİ", "FİLO DIŞ YÜK YÖNETİMİ"].includes(o.ServiceName)).map(o => o.TMSVehicleRequestDocumentNo));
    const tedarikEdilenSet = new Set(data.filter(o => o.TMSDespatchDocumentNo?.startsWith("SFR") && talepPlanlananSet.has(o.TMSVehicleRequestDocumentNo)).map(o => o.TMSDespatchDocumentNo));
    const tedarikEdilmeyenSet = new Set(data.filter(o => !o.TMSDespatchDocumentNo && o.TMSVehicleRequestDocumentNo?.startsWith("VP") && talepPlanlananSet.has(o.TMSVehicleRequestDocumentNo)).map(o => o.TMSVehicleRequestDocumentNo));
    const spotSet = new Set(data.filter(o => o.VehicleWorkingName === "SPOT" && tedarikEdilenSet.has(o.TMSDespatchDocumentNo)).map(o => o.TMSDespatchDocumentNo));
    const filoSet = new Set(data.filter(o => ["FİLO", "ÖZMAL", "MODERN AMBALAJ FİLO"].includes(o.VehicleWorkingName) && tedarikEdilenSet.has(o.TMSDespatchDocumentNo)).map(o => o.TMSDespatchDocumentNo));
    const shoBasilanSet = new Set(data.filter(o => o.IsPrint === true && tedarikEdilenSet.has(o.TMSDespatchDocumentNo)).map(o => o.TMSDespatchDocumentNo));
    const shoBasilmayanSet = new Set(data.filter(o => o.IsPrint === false && tedarikEdilenSet.has(o.TMSDespatchDocumentNo)).map(o => o.TMSDespatchDocumentNo));

    return (
        <PremiumContainer>
            {/* Filtreleme Alanı */}
            <ModernFilterBar elevation={0}>
                <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e293b', mr: 2 }}>
                        Lojistik Paneli
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DateTimePicker
                            label="Başlangıç"
                            value={startDate}
                            onChange={setStartDate}
                            slotProps={{
                                textField: {
                                    size: 'medium',
                                    sx: { '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: '#fff' } }
                                }
                            }}
                        />
                        <DateTimePicker
                            label="Bitiş"
                            value={endDate}
                            onChange={setEndDate}
                            slotProps={{
                                textField: {
                                    size: 'medium',
                                    sx: { '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: '#fff' } }
                                }
                            }}
                        />
                    </LocalizationProvider>
                </Stack>
                <StyledNeonButton startIcon={<FaBolt />} onClick={handleFilter}>
                    Analizi Güncelle
                </StyledNeonButton>
            </ModernFilterBar>

            {/* Kartlar Grid Yapısı */}
            <Grid container spacing={4} alignItems="stretch">
                <Grid item xs={12} md={4}>
                    <MainStatsCard
                        title="TOPLAM TALEP"
                        count={talepPlanlananSet.size}
                        icon={<FaClipboardList />}
                        color="#6366f1"
                        subtitle="Sistemdeki toplam iş emri"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MainStatsCard
                        title="TEDARİK EDİLEN"
                        count={tedarikEdilenSet.size}
                        icon={<FaCheckCircle />}
                        color="#10b981"
                        onClick={() => setShowTedarikDetay(!showTedarikDetay)}
                        isExpandable
                        isExpanded={showTedarikDetay}
                        subtitle="Planlanan ve onaylanan"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MainStatsCard
                        title="BEKLEYEN"
                        count={tedarikEdilmeyenSet.size}
                        icon={<FaExclamationCircle />}
                        color="#f43f5e"
                        subtitle="Acil aksiyon bekleyen"
                    />
                </Grid>
            </Grid>

            {/* Detay Paneli */}
            <Collapse in={showTedarikDetay} timeout={600}>
                <Box sx={{ mt: 4 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <DetailMiniCard title="Spot Tedarik" count={spotSet.size} color="#8b5cf6" icon={<FaTruckMoving />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DetailMiniCard title="Sabit Filo" count={filoSet.size} color="#0ea5e9" icon={<FaWarehouse />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DetailMiniCard title="Basılan SHÖ" count={shoBasilanSet.size} color="#10b981" icon={<FaFileAlt />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DetailMiniCard title="Kuyrukta" count={shoBasilmayanSet.size} color="#f59e0b" icon={<FaFileExcel />} />
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
        </PremiumContainer>
    );
}

// --- ALT BİLEŞENLER ---

function MainStatsCard({ title, count, icon, color, onClick, isExpandable, isExpanded, subtitle }) {
    return (
        <Card
            onClick={onClick}
            sx={{
                height: '100%',
                bgcolor: '#fff',
                borderRadius: '32px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 20px 40px -12px ${alpha(color, 0.2)}`,
                    borderColor: alpha(color, 0.3),
                }
            }}
        >
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
                    <Box sx={{
                        backgroundColor: alpha(color, 0.1),
                        color: color,
                        p: 2, borderRadius: '20px', display: 'flex',
                        fontSize: '1.5rem'
                    }}>
                        {icon}
                    </Box>
                    {isExpandable && (
                        <Box sx={{
                            p: 1, borderRadius: '50%', bgcolor: isExpanded ? color : '#f8fafc',
                            color: isExpanded ? '#fff' : '#64748b',
                            transition: '0.3s'
                        }}>
                            {isExpanded ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
                        </Box>
                    )}
                </Stack>

                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {title}
                </Typography>

                <Typography sx={{ fontSize: '3.5rem', fontWeight: 900, color: '#0f172a', my: 1, letterSpacing: '-2px' }}>
                    <CountUp end={count} separator="." duration={2.5} />
                </Typography>

                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 4, height: 16, bgcolor: color, borderRadius: 2 }} />
                    <Typography sx={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                        {subtitle}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

function DetailMiniCard({ title, count, color, icon }) {
    return (
        <Paper sx={{
            p: 3, borderRadius: '24px',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #f1f5f9',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: `0 15px 30px ${alpha(color, 0.1)}`,
                borderColor: color
            }
        }}>
            <Stack direction="row" spacing={3} alignItems="center">
                <Box sx={{
                    width: 56, height: 56, borderRadius: '18px',
                    backgroundColor: alpha(color, 0.1), color: color,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontSize: '1.4rem'
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {title}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: '#1e293b', fontSize: '1.8rem', lineHeight: 1 }}>
                        <CountUp end={count} separator="." duration={2} />
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}