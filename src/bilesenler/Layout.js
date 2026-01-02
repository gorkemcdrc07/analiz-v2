import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Box, Container, AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
    ListItemIcon, ListItemText, Divider, IconButton
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';

import YukleniyorEkrani from './YukleniyorEkrani';
import DetayPaneli from './DetayPaneli';

import { supabase } from '../supabaseClient';

const DRAWER_WIDTH = 260;
const PAGE_SIZE = 1000;

async function fetchAllRows({ startIso, endIso }) {
    let all = [];
    let from = 0;

    while (true) {
        const to = from + PAGE_SIZE - 1;

        const { data: page, error } = await supabase
            .from('siparisler_raw_v')
            .select(`
        proje,
        hizmet_tipi,
        arac_calisma_tipi,
        pozisyon_no,
        sefer_no,
        siparis_durumu,
        yukleme_ili,
        yukleme_ilcesi,
        teslim_ili,
        teslim_ilcesi,
        yukleme_noktasi,
        teslim_noktasi,
        sipras_acan,
        siparis_acilis_zamani,
        sefer_acilis_zamani,
        sefer_hesap_ozeti,
        yukleme_tarihi,
        yukleme_ts
      `)
            .gte('yukleme_ts', startIso)
            .lte('yukleme_ts', endIso)
            .order('yukleme_ts', { ascending: false })
            .range(from, to);

        if (error) throw error;

        all = all.concat(page || []);

        // son sayfa
        if (!page || page.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
    }

    return all;
}


// "Teslim Edildi" gibi text status -> eski koddaki numeric OrderStatu (opsiyonel)
const STATUS_TEXT_TO_CODE = {
    "Bekliyor": 1,
    "Onaylandı": 2,
    "Spot Araç Planlamada": 3,
    "Araç Atandı": 4,
    "Araç Yüklendi": 5,
    "Araç Yolda": 6,
    "Teslim Edildi": 7,
    "Tamamlandı": 8,
    "Eksik Evrak": 10,
    "Araç Boşaltmada": 80,
    "Filo Araç Planlamada": 90,
    "İptal": 200,
};

const normalizeTR = (s) =>
    (s ?? '').toString().trim().toLocaleUpperCase('tr-TR');

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // default bugün
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [detailType, setDetailType] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const screenTitle = useMemo(() => {
        if (location.pathname === '/') return 'Anasayfa';
        if (location.pathname.startsWith('/tedarik-analiz')) return 'Tedarik Analiz';
        if (location.pathname.startsWith('/siparis-analiz')) return 'Sipariş Analiz';
        if (location.pathname.startsWith('/proje-analiz')) return 'Proje Analiz';
        return '';
    }, [location.pathname]);

    const handleFilter = useCallback(async () => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        console.log('🚀 handleFilter başladı', {
            start: start.toISOString(),
            end: end.toISOString(),
        });

        setLoading(true);

        try {
            const rows = await fetchAllRows({
                startIso: start.toISOString(),
                endIso: end.toISOString(),
            });

            console.log('🟩 supabase result (ALL)', { rowsLength: rows?.length ?? 0 });

            // ✅ ESKİ UI alanlarına mapping
            const mapped = (rows || []).map((r) => {
                const orderStatusText = (r.siparis_durumu ?? '').toString().trim();
                const orderStatusCode =
                    STATUS_TEXT_TO_CODE[orderStatusText] ?? orderStatusText; // bulamazsa text bırak

                const isPrintBool =
                    normalizeTR(r.sefer_hesap_ozeti) === 'CHECKED' ||
                    normalizeTR(r.sefer_hesap_ozeti) === 'TRUE' ||
                    r.sefer_hesap_ozeti === true;

                return {
                    // ✅ eski kodların beklediği isimler
                    ProjectName: r.proje,
                    ServiceName: r.hizmet_tipi,              // ÖNEMLİ: hizmet_tipi
                    SubServiceName: r.hizmet_tipi ?? '',     // tablon yoksa aynı kalsın

                    TMSVehicleRequestDocumentNo: r.pozisyon_no,
                    TMSDespatchDocumentNo: r.sefer_no,

                    OrderStatu: orderStatusCode,             // numericse numeric, değilse text kalır

                    PickupCityName: r.yukleme_ili,
                    PickupCountyName: r.yukleme_ilcesi,
                    DeliveryCityName: r.teslim_ili,
                    DeliveryCountyName: r.teslim_ilcesi,

                    VehicleWorkingName: r.arac_calisma_tipi, // SPOT/FİLO vs

                    IsPrint: isPrintBool,                    // boolean olmalı

                    // Tarihler
                    TMSDespatchCreatedDate: r.sefer_acilis_zamani,
                    PickupDate: r.yukleme_tarihi,
                    OrderDate: r.yukleme_tarihi,
                    OrderCreatedDate: r.siparis_acilis_zamani,

                    PickupAddressCode: r.yukleme_noktasi,
                    DeliveryAddressCode: r.teslim_noktasi,

                    OrderCreatedBy: r.sipras_acan,
                    CurrentAccountTitle: r.sipras_acan ?? '-',

                    _raw: r
                };
            });

            console.log('✅ mapped length:', mapped.length);
            console.log('🔎 sample mapped[0]:', mapped[0]);

            setData(mapped);
        } catch (err) {
            console.error('❌ Veri çekme hatası:', err);
            setData([]);
        } finally {
            setLoading(false);
            console.log('🏁 handleFilter bitti');
        }
    }, [startDate, endDate]);

    useEffect(() => {
        handleFilter();
    }, [handleFilter]);

    const outletContext = {
        data,
        loading,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        handleFilter,
        openDetail: (type) => { setDetailType(type); setDetailOpen(true); }
    };

    return (
        <>
            {loading && <YukleniyorEkrani />}

            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#1e293b',
                    zIndex: (t) => t.zIndex.drawer + 1
                }}
            >
                <Container maxWidth={false} disableGutters sx={{ px: 2 }}>
                    <Toolbar variant="dense" sx={{ justifyContent: 'space-between', height: 64 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton onClick={() => setSidebarOpen(p => !p)} size="small" sx={{ color: '#1e293b' }}>
                                <MenuIcon />
                            </IconButton>

                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                                TMS <Box component="span" sx={{ color: '#64748b', fontWeight: 500, ml: 1 }}>Analiz Paneli</Box>
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{
                                    ml: 1,
                                    color: '#64748b',
                                    fontWeight: 800,
                                    bgcolor: '#f1f5f9',
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                {screenTitle}
                            </Typography>
                        </Box>

                        <Typography
                            variant="caption"
                            sx={{
                                color: '#94a3b8',
                                fontWeight: 700,
                                bgcolor: '#f1f5f9',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '6px'
                            }}
                        >
                            {new Date().toLocaleDateString('tr-TR')}
                        </Typography>
                    </Toolbar>
                </Container>
            </AppBar>

            <Drawer
                variant="persistent"
                open={sidebarOpen}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        borderRight: '1px solid #e2e8f0',
                        background: '#ffffff'
                    }
                }}
            >
                <Box sx={{ height: 64 }} />
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>Menü</Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Analiz ekranını seçin
                    </Typography>
                </Box>
                <Divider />

                <List sx={{ px: 1, py: 1 }}>
                    <ListItemButton
                        selected={location.pathname === '/'}
                        onClick={() => navigate('/')}
                        sx={{ borderRadius: 2, mx: 1, '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } } }}
                    >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                            <HomeIcon color={location.pathname === '/' ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Anasayfa" primaryTypographyProps={{ fontWeight: 800, color: '#0f172a' }} />
                    </ListItemButton>

                    <ListItemButton
                        selected={location.pathname.startsWith('/tedarik-analiz')}
                        onClick={() => navigate('/tedarik-analiz')}
                        sx={{ borderRadius: 2, mx: 1, '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } } }}
                    >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                            <LocalShippingIcon color={location.pathname.startsWith('/tedarik-analiz') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Tedarik Analiz" primaryTypographyProps={{ fontWeight: 800, color: '#0f172a' }} />
                    </ListItemButton>

                    <ListItemButton
                        selected={location.pathname.startsWith('/siparis-analiz')}
                        onClick={() => navigate('/siparis-analiz')}
                        sx={{ borderRadius: 2, mx: 1, '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } } }}
                    >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                            <ReceiptLongIcon color={location.pathname.startsWith('/siparis-analiz') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Sipariş Analiz" primaryTypographyProps={{ fontWeight: 800, color: '#0f172a' }} />
                    </ListItemButton>

                    <ListItemButton
                        selected={location.pathname.startsWith('/proje-analiz')}
                        onClick={() => navigate('/proje-analiz')}
                        sx={{ borderRadius: 2, mx: 1, '&.Mui-selected': { bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } } }}
                    >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                            <AssessmentIcon color={location.pathname.startsWith('/proje-analiz') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Proje Analiz" primaryTypographyProps={{ fontWeight: 800, color: '#0f172a' }} />
                    </ListItemButton>
                </List>
            </Drawer>

            <Box
                sx={{
                    ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
                    transition: "margin-left 0.2s ease",
                    width: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%", // ✅ önemli
                }}
            >
                <Container maxWidth={false} disableGutters sx={{ mt: 3, mb: 4, px: 2 }}>
                    <Outlet context={outletContext} />
                </Container>
            </Box>

            {detailOpen && (
                <DetayPaneli
                    type={detailType}
                    data={data}
                    onClose={() => setDetailOpen(false)}
                />
            )}
        </>
    );
}
