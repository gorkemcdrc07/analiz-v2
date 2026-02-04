import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

// �o. /backend-veri için ikon (ama yazı Tedarik Analiz olacak)
import StorageIcon from '@mui/icons-material/Storage';

// �o. Forecast menü ikonu
import ShowChartIcon from '@mui/icons-material/ShowChart';

import { useTheme } from '@mui/material/styles';

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

        if (!page || page.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
    }

    return all;
}

const STATUS_TEXT_TO_CODE = {
    Bekliyor: 1,
    Onaylandı: 2,
    'Spot Araç Planlamada': 3,
    'Araç Atandı': 4,
    'Araç Yüklendi': 5,
    'Araç Yolda': 6,
    'Teslim Edildi': 7,
    Tamamlandı: 8,
    'Eksik Evrak': 10,
    'Araç Bo�Yaltmada': 80,
    'Filo Araç Planlamada': 90,
    İptal: 200,
};

const normalizeTR = (s) => (s ?? '').toString().trim().toLocaleUpperCase('tr-TR');

export default function Layout({ mode, setMode }) {
    const theme = useTheme();
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

    // �o. üst bardaki ba�Ylık
    const screenTitle = useMemo(() => {
        if (location.pathname === '/') return 'Ana Sayfa';
        if (location.pathname.startsWith('/siparis-analiz')) return 'Sipari�Y Analiz';
        if (location.pathname.startsWith('/proje-analiz')) return 'Proje Analiz';
        if (location.pathname.startsWith('/backend-veri')) return 'Tedarik Analiz';
        if (location.pathname.startsWith('/karsilastirma')) return 'Forecast';
        return '';
    }, [location.pathname]);

    const handleFilter = useCallback(async () => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        setLoading(true);

        try {
            const rows = await fetchAllRows({
                startIso: start.toISOString(),
                endIso: end.toISOString(),
            });

            const mapped = (rows || []).map((r) => {
                const orderStatusText = (r.siparis_durumu ?? '').toString().trim();
                const orderStatusCode = STATUS_TEXT_TO_CODE[orderStatusText] ?? orderStatusText;

                const isPrintBool =
                    normalizeTR(r.sefer_hesap_ozeti) === 'CHECKED' ||
                    normalizeTR(r.sefer_hesap_ozeti) === 'TRUE' ||
                    r.sefer_hesap_ozeti === true;

                return {
                    ProjectName: r.proje,
                    ServiceName: r.hizmet_tipi,
                    SubServiceName: r.hizmet_tipi ?? '',

                    TMSVehicleRequestDocumentNo: r.pozisyon_no,
                    TMSDespatchDocumentNo: r.sefer_no,

                    OrderStatu: orderStatusCode,

                    PickupCityName: r.yukleme_ili,
                    PickupCountyName: r.yukleme_ilcesi,
                    DeliveryCityName: r.teslim_ili,
                    DeliveryCountyName: r.teslim_ilcesi,

                    VehicleWorkingName: r.arac_calisma_tipi,

                    IsPrint: isPrintBool,

                    TMSDespatchCreatedDate: r.sefer_acilis_zamani,
                    PickupDate: r.yukleme_tarihi,
                    OrderDate: r.yukleme_tarihi,
                    OrderCreatedDate: r.siparis_acilis_zamani,

                    PickupAddressCode: r.yukleme_noktasi,
                    DeliveryAddressCode: r.teslim_noktasi,

                    OrderCreatedBy: r.sipras_acan,
                    CurrentAccountTitle: r.sipras_acan ?? '-',

                    _raw: r,
                };
            });

            setData(mapped);
        } catch (err) {
            console.error('�O Veri çekme hatası:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        handleFilter();
    }, [handleFilter]);

    const outletContext = useMemo(
        () => ({
            data,
            loading,
            startDate,
            endDate,
            setStartDate,
            setEndDate,
            handleFilter,
            openDetail: (type) => {
                setDetailType(type);
                setDetailOpen(true);
            },
        }),
        [data, loading, startDate, endDate, handleFilter]
    );

    // theme-aware renkler
    const appBarBg =
        theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(2, 6, 23, 0.75)';
    const appBarBorder = theme.palette.mode === 'light' ? '#e2e8f0' : 'rgba(148, 163, 184, 0.18)';
    const drawerBorder = theme.palette.mode === 'light' ? '#e2e8f0' : 'rgba(148, 163, 184, 0.18)';
    const drawerBg = theme.palette.mode === 'light' ? '#ffffff' : '#020617';
    const textMain = theme.palette.mode === 'light' ? '#0f172a' : '#e2e8f0';
    const textSub = theme.palette.mode === 'light' ? '#64748b' : '#94a3b8';
    const pillBg = theme.palette.mode === 'light' ? '#f1f5f9' : 'rgba(148, 163, 184, 0.12)';
    const pillBorder = theme.palette.mode === 'light' ? '#e2e8f0' : 'rgba(148, 163, 184, 0.18)';

    const selectedBg = theme.palette.mode === 'light' ? '#eff6ff' : 'rgba(37, 99, 235, 0.18)';
    const selectedHoverBg = theme.palette.mode === 'light' ? '#dbeafe' : 'rgba(37, 99, 235, 0.24)';

    const menuItemSx = {
        borderRadius: 2,
        mx: 1,
        '&.Mui-selected': { bgcolor: selectedBg, '&:hover': { bgcolor: selectedHoverBg } },
    };

    return (
        <>
            {loading && <YukleniyorEkrani />}

            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backgroundColor: appBarBg,
                    backdropFilter: 'blur(10px)',
                    borderBottom: `1px solid ${appBarBorder}`,
                    color: textMain,
                    zIndex: (t) => t.zIndex.drawer + 1,
                }}
            >
                <Container maxWidth={false} disableGutters sx={{ px: 2 }}>
                    <Toolbar variant="dense" sx={{ justifyContent: 'space-between', height: 64 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton onClick={() => setSidebarOpen((p) => !p)} size="small" sx={{ color: textMain }}>
                                <MenuIcon />
                            </IconButton>

                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 900, color: theme.palette.primary.main, display: 'flex', alignItems: 'center' }}
                            >
                                TMS{' '}
                                <Box component="span" sx={{ color: textSub, fontWeight: 500, ml: 1 }}>
                                    Analiz Paneli
                                </Box>
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{
                                    ml: 1,
                                    color: textSub,
                                    fontWeight: 800,
                                    bgcolor: pillBg,
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: '8px',
                                    border: `1px solid ${pillBorder}`,
                                }}
                            >
                                {screenTitle}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: theme.palette.mode === 'light' ? '#94a3b8' : '#a3b3c8',
                                    fontWeight: 700,
                                    bgcolor: pillBg,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '6px',
                                    border: `1px solid ${pillBorder}`,
                                }}
                            >
                                {new Date().toLocaleDateString('tr-TR')}
                            </Typography>

                            <Tooltip title={mode === 'light' ? 'Koyu tema' : 'Açık tema'}>
                                <IconButton
                                    size="small"
                                    onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                                    sx={{ color: textMain }}
                                >
                                    {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                                </IconButton>
                            </Tooltip>
                        </Box>
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
                        borderRight: `1px solid ${drawerBorder}`,
                        background: drawerBg,
                    },
                }}
            >
                <Box sx={{ height: 64 }} />
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography sx={{ fontWeight: 900, color: textMain }}>Menü</Typography>
                    <Typography sx={{ fontSize: 12, color: textSub, fontWeight: 600 }}>Analiz ekranını seçin</Typography>
                </Box>
                <Divider sx={{ borderColor: drawerBorder }} />

                <List sx={{ px: 1, py: 1 }}>
                    {/* �o. Ana Sayfa */}
                    <ListItemButton selected={location.pathname === '/'} onClick={() => navigate('/')} sx={menuItemSx}>
                        <ListItemIcon sx={{ minWidth: 38, color: textSub }}>
                            <HomeIcon color={location.pathname === '/' ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Ana Sayfa" primaryTypographyProps={{ fontWeight: 800, color: textMain }} />
                    </ListItemButton>

                    {/* �o. Sipari�Y Analiz */}
                    <ListItemButton
                        selected={location.pathname.startsWith('/siparis-analiz')}
                        onClick={() => navigate('/siparis-analiz')}
                        sx={menuItemSx}
                    >
                        <ListItemIcon sx={{ minWidth: 38, color: textSub }}>
                            <ReceiptLongIcon color={location.pathname.startsWith('/siparis-analiz') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Sipari�Y Analiz" primaryTypographyProps={{ fontWeight: 800, color: textMain }} />
                    </ListItemButton>

                    {/* �o. Proje Analiz */}
                    <ListItemButton
                        selected={location.pathname.startsWith('/proje-analiz')}
                        onClick={() => navigate('/proje-analiz')}
                        sx={menuItemSx}
                    >
                        <ListItemIcon sx={{ minWidth: 38, color: textSub }}>
                            <AssessmentIcon color={location.pathname.startsWith('/proje-analiz') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Proje Analiz" primaryTypographyProps={{ fontWeight: 800, color: textMain }} />
                    </ListItemButton>

                    {/* �o. /backend-veri route'u kalsın ama menüde "Tedarik Analiz" yazsın */}
                    <ListItemButton
                        selected={location.pathname.startsWith('/backend-veri')}
                        onClick={() => navigate('/backend-veri')}
                        sx={menuItemSx}
                    >
                        <ListItemIcon sx={{ minWidth: 38, color: textSub }}>
                            <StorageIcon color={location.pathname.startsWith('/backend-veri') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Tedarik Analiz" primaryTypographyProps={{ fontWeight: 800, color: textMain }} />
                    </ListItemButton>

                    {/* �o. Forecast (/karsilastirma) */}
                    <ListItemButton
                        selected={location.pathname.startsWith('/karsilastirma')}
                        onClick={() => navigate('/karsilastirma')}
                        sx={menuItemSx}
                    >
                        <ListItemIcon sx={{ minWidth: 38, color: textSub }}>
                            <ShowChartIcon color={location.pathname.startsWith('/karsilastirma') ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Forecast" primaryTypographyProps={{ fontWeight: 800, color: textMain }} />
                    </ListItemButton>
                </List>
            </Drawer>

            <Box
                sx={{
                    ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
                    transition: 'margin-left 0.2s ease',
                    width: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
                }}
            >
                <Container maxWidth={false} disableGutters sx={{ mt: 3, mb: 4, px: 2 }}>
                    <Outlet context={outletContext} />
                </Container>
            </Box>

            {detailOpen && <DetayPaneli type={detailType} data={data} onClose={() => setDetailOpen(false)} />}
        </>
    );
}
