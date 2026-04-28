import { useEffect, useState, useMemo } from "react";
import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Typography,
    Divider,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    alpha,
    useTheme,
    GlobalStyles,
    Stack,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import {
    HomeRounded as HomeIcon,
    ReceiptLongRounded as ReceiptLongIcon,
    DarkModeRounded as DarkModeIcon,
    LightModeRounded as LightModeIcon,
    LogoutRounded as LogoutRoundedIcon,
    StorageRounded as StorageIcon,
    ShowChartRounded as ShowChartIcon,
    TimelineRounded,
} from "@mui/icons-material";

import DetayPaneli from "./DetayPaneli";

const LS_KEY = "app_oturum_kullanici";

const getUserFromSession = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function Layout({ mode, setMode }) {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [detailType, setDetailType] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [profileAnchor, setProfileAnchor] = useState(null);

    const user = useMemo(() => getUserFromSession(), []);
    const userInitial = (user?.ad || user?.kullanici_adi || "U")
        .toString()
        .trim()
        .charAt(0)
        .toUpperCase();

    useEffect(() => {
        if (!user?.kullanici_adi) navigate("/login", { replace: true });
    }, [navigate, user]);

    const logout = () => {
        localStorage.removeItem(LS_KEY);
        setProfileAnchor(null);
        navigate("/login", { replace: true });
    };

    const screenTitle = useMemo(() => {
        const routes = {
            "/": "Dashboard",
            "/siparis-analiz": "Sipariş Analiz",
            "/backend-veri": "Tedarik Hattı",
            "/analiz-paneli": "Analiz Paneli",
            "/tahmin": "Akış Tahmini",
        };
        return routes[location.pathname] || "Genel Bakış";
    }, [location.pathname]);

    const navItems = [
        { label: "Bölge & Proje Ekle", path: "/", icon: <HomeIcon fontSize="small" /> },
        { label: "Sipariş Analiz", path: "/siparis-analiz", icon: <ReceiptLongIcon fontSize="small" /> },
        { label: "Tedarik Analiz", path: "/backend-veri", icon: <StorageIcon fontSize="small" /> },
    ];
    const isDark = theme.palette.mode === "dark";
    const borderColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";
    const glassEffect = {
        bgcolor: isDark ? alpha("#020617", 0.75) : alpha("#ffffff", 0.8),
        backdropFilter: "blur(12px) saturate(160%)",
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: isDark ? "#020617" : "#fbfcfd" }}>
            <GlobalStyles
                styles={{
                    "::-webkit-scrollbar": { width: "6px" },
                    "::-webkit-scrollbar-thumb": {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        borderRadius: "10px",
                    },
                }}
            />

            {/* HEADER */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: "100%",
                    ml: 0,
                    ...glassEffect,
                    borderBottom: `1px solid ${borderColor}`,
                    color: "text.primary",
                    zIndex: (t) => t.zIndex.drawer + 1,
                }}
            >
                <Toolbar
                    sx={{
                        justifyContent: "space-between",
                        minHeight: 72,
                        px: { xs: 2, md: 3 },
                        gap: 2,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={3} sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mr: 1 }}>
                            <TimelineRounded sx={{ color: "primary.main", fontSize: 28 }} />
                            <Stack spacing={-0.5}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 800,
                                        color: "primary.main",
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        fontSize: 9,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {screenTitle}
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 900,
                                        letterSpacing: "-0.5px",
                                        fontSize: "1.1rem",
                                        lineHeight: 1.2,
                                    }}
                                >
                                    Flowline<span style={{ color: theme.palette.primary.main }}>.</span>
                                </Typography>
                            </Stack>
                        </Stack>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                display: { xs: "none", md: "flex" },
                                flexWrap: "wrap",
                            }}
                        >
                            {navItems.map((item) => {
                                const active = location.pathname === item.path;

                                return (
                                    <Box
                                        key={item.label}
                                        onClick={() =>
                                            item.external ? window.open(item.path, "_blank") : navigate(item.path)
                                        }
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.8,
                                            px: 1.6,
                                            py: 1,
                                            borderRadius: "12px",
                                            cursor: "pointer",
                                            fontWeight: active ? 800 : 700,
                                            fontSize: "0.86rem",
                                            color: active ? "primary.main" : "text.secondary",
                                            bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                                            border: "1px solid",
                                            borderColor: active
                                                ? alpha(theme.palette.primary.main, 0.14)
                                                : "transparent",
                                            transition: "all 0.2s ease",
                                            whiteSpace: "nowrap",
                                            "&:hover": {
                                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                                color: "primary.main",
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                color: active ? "primary.main" : "inherit",
                                            }}
                                        >
                                            {item.icon}
                                        </Box>
                                        <Box component="span">{item.label}</Box>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                        <IconButton
                            size="small"
                            onClick={() => setMode(isDark ? "light" : "dark")}
                            sx={{ border: `1px solid ${borderColor}`, borderRadius: "10px" }}
                        >
                            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </IconButton>

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: "center" }} />

                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.2}
                            onClick={(e) => setProfileAnchor(e.currentTarget)}
                            sx={{
                                cursor: "pointer",
                                p: "4px 8px",
                                borderRadius: "12px",
                                transition: "0.2s",
                                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 30,
                                    height: 30,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #6366f1 100%)`,
                                    boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                            >
                                {userInitial}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: "none", sm: "block" } }}>
                                {user?.ad || "Admin"}
                            </Typography>
                        </Stack>
                    </Stack>
                </Toolbar>

                {/* Mobil menu */}
                <Box
                    sx={{
                        display: { xs: "flex", md: "none" },
                        gap: 1,
                        px: 2,
                        pb: 1.5,
                        overflowX: "auto",
                        "::-webkit-scrollbar": { display: "none" },
                    }}
                >
                    {navItems.map((item) => {
                        const active = location.pathname === item.path;

                        return (
                            <Box
                                key={item.label}
                                onClick={() =>
                                    item.external ? window.open(item.path, "_blank") : navigate(item.path)
                                }
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.8,
                                    px: 1.4,
                                    py: 0.9,
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontWeight: active ? 800 : 700,
                                    fontSize: "0.82rem",
                                    color: active ? "primary.main" : "text.secondary",
                                    bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                                    border: "1px solid",
                                    borderColor: active ? alpha(theme.palette.primary.main, 0.14) : borderColor,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                }}
                            >
                                {item.icon}
                                <Box component="span">{item.label}</Box>
                            </Box>
                        );
                    })}
                </Box>
            </AppBar>

            {/* ANA İÇERİK AREA */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: "100%",
                    ml: 0,
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                <Box sx={{ height: { xs: 120, md: 72 } }} />
                <Container
                    maxWidth={false}
                    sx={{
                        mt: 4,
                        mb: 4,
                        px: { xs: 2, md: 4 },
                        animation: "fadeIn 0.5s ease-out",
                        "@keyframes fadeIn": {
                            from: { opacity: 0, transform: "translateY(10px)" },
                            to: { opacity: 1, transform: "translateY(0)" },
                        },
                    }}
                >
                    <Outlet
                        context={{
                            data,
                            loading,
                            startDate,
                            endDate,
                            setStartDate,
                            setEndDate,
                            setLayoutData: setData,
                            openDetail: (type) => {
                                setDetailType(type);
                                setDetailOpen(true);
                            },
                        }}
                    />
                </Container>
            </Box>

            {/* PROFILE MENU */}
            <Menu
                anchorEl={profileAnchor}
                open={Boolean(profileAnchor)}
                onClose={() => setProfileAnchor(null)}
                PaperProps={{
                    sx: {
                        borderRadius: "14px",
                        mt: 1.5,
                        minWidth: 200,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        border: `1px solid ${borderColor}`,
                        ...glassEffect,
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        {user?.ad || "Kullanıcı"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {user?.rol || "Yönetici"}
                    </Typography>
                </Box>
                <Divider sx={{ opacity: 0.5 }} />
                <MenuItem
                    onClick={logout}
                    sx={{
                        m: 0.5,
                        borderRadius: "10px",
                        py: 1.2,
                        fontWeight: 700,
                        color: "error.main",
                    }}
                >
                    <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} /> Çıkış Yap
                </MenuItem>
            </Menu>

            {detailOpen && <DetayPaneli type={detailType} data={data} onClose={() => setDetailOpen(false)} />}
        </Box>
    );
}