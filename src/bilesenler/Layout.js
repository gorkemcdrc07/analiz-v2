import { useEffect, useState, useMemo } from 'react';
import {
    Box, Container, AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
    ListItemIcon, ListItemText, Divider, IconButton
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment'; // ✅ EKLENDİ

import { formatDate } from '../yardimcilar/tarihIslemleri';
import YukleniyorEkrani from './YukleniyorEkrani';
import DetayPaneli from './DetayPaneli';

const DRAWER_WIDTH = 260;

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [detailType, setDetailType] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Sayfaya göre başlık
    const screenTitle = useMemo(() => {
        if (location.pathname === '/') return 'Anasayfa';
        if (location.pathname.startsWith('/tedarik-analiz')) return 'Tedarik Analiz';
        if (location.pathname.startsWith('/siparis-analiz')) return 'Sipariş Analiz';
        if (location.pathname.startsWith('/proje-analiz')) return 'Proje Analiz'; // ✅ EKLENDİ
        return '';
    }, [location.pathname]);

    // API fetch
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');
    const API_TOKEN = process.env.REACT_APP_API_TOKEN || '';

    const handleFilter = async () => {
        const startDateTime = formatDate(startDate);
        const endDateTime = formatDate(endDate, true);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/tmsorders/getall`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`
                },
                body: JSON.stringify({
                    startDate: startDateTime,
                    endDate: endDateTime,
                    userId: 1
                })
            });

            const result = await response.json();
            setData(result.Data || []);
        } catch (error) {
            console.error('❌ API Hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { handleFilter(); }, []);

    // Outlet’e ortak props aktaracağız
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

            {/* NAVBAR */}
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
                <Container maxWidth="xl">
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

            {/* SIDEBAR */}
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

                    {/* ✅ YENİ: PROJE ANALİZ */}
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

            {/* CONTENT */}
            <Box sx={{ ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0, transition: 'margin-left 0.2s ease' }}>
                <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
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
