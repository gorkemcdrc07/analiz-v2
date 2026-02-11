import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    Divider,
    Chip,
    TextField,
    Button,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    InputAdornment,
    Snackbar,
    Alert,
    useMediaQuery,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
    Public,
    AddRounded,
    DeleteOutlineRounded,
    ContentCopyRounded,
    SearchRounded,
    RestartAltRounded,
    ChevronRightRounded,
    RocketLaunchRounded,
    SettingsSuggestRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

// Varsayılan veriler ve Store (Dosya yollarını projene göre kontrol et)
import { REGIONS as REGIONS_DEFAULT } from "../ozellikler/yardimcilar/veriKurallari";
import { setRegions } from "../ozellikler/yardimcilar/regionsStore";

const LS_REGIONS_KEY = "app_regions_v1";

const NoiseOverlay = ({ opacity = 0.06 }) => (
    <Box
        sx={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
            opacity,
            mixBlendMode: "overlay",
        }}
    />
);

// --- Ultra Modern Glass Card ---
const GlassCard = ({ children, sx, noPadding = false }) => {
    const theme = useTheme();
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            whileHover={{ y: -2 }}
            sx={{
                position: "relative",
                p: noPadding ? 0 : 3,
                borderRadius: { xs: "22px", md: "30px" },
                overflow: "hidden",
                background:
                    theme.palette.mode === "dark"
                        ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.62)}, ${alpha(
                            theme.palette.background.paper,
                            0.40
                        )})`
                        : `linear-gradient(180deg, ${alpha("#ffffff", 0.90)}, ${alpha("#ffffff", 0.72)})`,
                backdropFilter: "blur(24px) saturate(170%)",
                border: "1px solid",
                borderColor: alpha(theme.palette.divider, theme.palette.mode === "dark" ? 0.18 : 0.12),
                boxShadow:
                    theme.palette.mode === "dark"
                        ? `0 26px 70px ${alpha("#000", 0.42)}`
                        : `0 26px 70px ${alpha("#0b1220", 0.10)}`,
                ...sx,
                "&:before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    padding: "1px",
                    background: `linear-gradient(135deg,
            ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.30 : 0.20)},
            ${alpha(theme.palette.secondary?.main || theme.palette.primary.light, 0.14)},
            transparent
          )`,
                    WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    pointerEvents: "none",
                },
                "&:after": {
                    content: '""',
                    position: "absolute",
                    top: -140,
                    right: -140,
                    width: 320,
                    height: 320,
                    background: `radial-gradient(circle, ${alpha(
                        "#fff",
                        theme.palette.mode === "dark" ? 0.10 : 0.24
                    )}, transparent 60%)`,
                    transform: "rotate(12deg)",
                    pointerEvents: "none",
                },
            }}
        >
            {children}
        </Box>
    );
};

export default function Anasayfa() {
    const theme = useTheme();
    const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

    const [regionsMap, setRegionsMap] = useState(() => {
        const ls = JSON.parse(localStorage.getItem(LS_REGIONS_KEY) || "null");
        return ls || REGIONS_DEFAULT || {};
    });

    const [selectedRegion, setSelectedRegion] = useState(() => Object.keys(regionsMap)[0] || "");
    const [newRegionName, setNewRegionName] = useState("");
    const [newProjectName, setNewProjectName] = useState("");
    const [search, setSearch] = useState("");

    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    useEffect(() => {
        setRegions(regionsMap);
        localStorage.setItem(LS_REGIONS_KEY, JSON.stringify(regionsMap));
    }, [regionsMap]);

    const rows = useMemo(
        () =>
            Object.entries(regionsMap)
                .map(([name, list]) => ({ name, count: list?.length || 0 }))
                .sort((a, b) => b.count - a.count),
        [regionsMap]
    );

    const filteredProjects = useMemo(() => {
        const list = regionsMap[selectedRegion] || [];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((p) => p.toLowerCase().includes(q));
    }, [regionsMap, selectedRegion, search]);

    const totalProjects = useMemo(() => rows.reduce((acc, curr) => acc + curr.count, 0), [rows]);

    const handleAddRegion = () => {
        const key = newRegionName.trim().toUpperCase();
        if (!key || regionsMap[key]) return;
        setRegionsMap((prev) => ({ ...prev, [key]: [] }));
        setNewRegionName("");
        setSelectedRegion(key);
        setToast({ open: true, msg: `Bölge eklendi: ${key}`, severity: "success" });
    };

    const handleDeleteRegion = (regionName, e) => {
        e.stopPropagation();
        const newMap = { ...regionsMap };
        delete newMap[regionName];
        setRegionsMap(newMap);

        if (selectedRegion === regionName) {
            setSelectedRegion(Object.keys(newMap)[0] || "");
        }
        setToast({ open: true, msg: `Bölge silindi: ${regionName}`, severity: "info" });
    };

    const handleAddProject = () => {
        const pName = newProjectName.trim();
        if (!pName || !selectedRegion) return;
        if ((regionsMap[selectedRegion] || []).includes(pName)) return;

        setRegionsMap((prev) => ({
            ...prev,
            [selectedRegion]: [...(prev[selectedRegion] || []), pName],
        }));
        setNewProjectName("");
        setToast({ open: true, msg: `Proje eklendi: ${pName}`, severity: "success" });
    };

    const handleDeleteProject = (projName) => {
        setRegionsMap((prev) => ({
            ...prev,
            [selectedRegion]: (prev[selectedRegion] || []).filter((p) => p !== projName),
        }));
        setToast({ open: true, msg: `Proje silindi: ${projName}`, severity: "info" });
    };

    const handleReset = () => {
        if (window.confirm("Tüm verileri varsayılana döndürmek istediğine emin misin?")) {
            setRegionsMap(REGIONS_DEFAULT);
            setSelectedRegion(Object.keys(REGIONS_DEFAULT)[0] || "");
            setSearch("");
            setToast({ open: true, msg: "Varsayılana döndürüldü.", severity: "warning" });
        }
    };

    const handleCopyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(regionsMap, null, 2));
            setToast({ open: true, msg: "JSON panoya kopyalandı.", severity: "success" });
        } catch {
            setToast({ open: true, msg: "Kopyalama başarısız oldu.", severity: "error" });
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                position: "relative",
                p: { xs: 2, lg: 6 },
                overflow: "hidden",
                background:
                    theme.palette.mode === "dark"
                        ? "radial-gradient(1200px 700px at 10% 10%, rgba(59,130,246,0.26), transparent 55%), radial-gradient(900px 500px at 92% 12%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(1000px 600px at 40% 98%, rgba(16,185,129,0.14), transparent 60%), #060914"
                        : "radial-gradient(1200px 700px at 10% 10%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(900px 500px at 92% 12%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(1000px 600px at 40% 98%, rgba(16,185,129,0.12), transparent 60%), #F7FAFF",
            }}
        >
            <NoiseOverlay opacity={theme.palette.mode === "dark" ? 0.07 : 0.05} />

            <Stack spacing={{ xs: 3, lg: 4 }} sx={{ maxWidth: 1500, mx: "auto", position: "relative" }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <SettingsSuggestRounded color="primary" />
                            <Typography
                                variant="h4"
                                sx={{ fontWeight: 950, letterSpacing: -1.2, lineHeight: 1.05 }}
                            >
                                Bölge Proje Ayarla
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Bölgeleri ve projeleri modern arayüzle yönetin.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="contained"
                            startIcon={<ContentCopyRounded />}
                            onClick={handleCopyJSON}
                            sx={{
                                borderRadius: 4,
                                fontWeight: 900,
                                textTransform: "none",
                                boxShadow: "none",
                            }}
                        >
                            JSON Kopyala
                        </Button>
                        <IconButton
                            color="error"
                            onClick={handleReset}
                            sx={{
                                borderRadius: 4,
                                bgcolor: alpha(theme.palette.error.main, 0.12),
                                border: "1px solid",
                                borderColor: alpha(theme.palette.error.main, 0.18),
                            }}
                        >
                            <RestartAltRounded />
                        </IconButton>
                    </Stack>
                </Stack>

                {/* Stats */}
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3}>
                    <GlassCard
                        sx={{
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.22)}, transparent)`,
                        }}
                    >
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 4,
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                    border: "1px solid",
                                    borderColor: alpha(theme.palette.primary.main, 0.18),
                                }}
                            >
                                <Public sx={{ fontSize: 28, color: "primary.main" }} />
                            </Box>
                            <Box>
                                <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: -1 }}>
                                    {rows.length}
                                </Typography>
                                <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.65 }}>
                                    Aktif Bölge
                                </Typography>
                            </Box>
                        </Stack>
                    </GlassCard>

                    <GlassCard
                        sx={{
                            background: `linear-gradient(135deg, ${alpha("#10b981", 0.22)}, transparent)`,
                        }}
                    >
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 4,
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: alpha("#10b981", 0.12),
                                    border: "1px solid",
                                    borderColor: alpha("#10b981", 0.18),
                                }}
                            >
                                <RocketLaunchRounded sx={{ fontSize: 28, color: "#10b981" }} />
                            </Box>
                            <Box>
                                <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: -1 }}>
                                    {totalProjects}
                                </Typography>
                                <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.65 }}>
                                    Toplam Proje
                                </Typography>
                            </Box>
                        </Stack>
                    </GlassCard>
                </Box>

                {/* Editor */}
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "380px 1fr" }} gap={4}>
                    {/* Sidebar */}
                    <GlassCard
                        noPadding
                        sx={{
                            height: "fit-content",     // <-- DEĞİŞTİR
                            maxHeight: isLgUp ? 640 : "none", // istersen sınır koy
                        }}
                    >
                        <Box
                            sx={{
                                p: 3,
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                background: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.45 : 0.72),
                                backdropFilter: "blur(18px)",
                                borderBottom: "1px solid",
                                borderColor: alpha(theme.palette.divider, 0.10),
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 950, mb: 1.5 }}>
                                Bölgeler
                            </Typography>

                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Yeni bölge (örn: AVRUPA)"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddRegion()}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleAddRegion} color="primary" sx={{ borderRadius: 3 }}>
                                                <AddRounded />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: 4,
                                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.05 : 0.03),
                                    },
                                }}
                            />
                        </Box>

                        <List
                            sx={{
                                p: 1.5,
                                maxHeight: isLgUp ? 520 : "none",
                                overflow: isLgUp ? "auto" : "visible",
                            }}
                        >
                            {rows.map((r) => (
                                <ListItemButton
                                    key={r.name}
                                    selected={selectedRegion === r.name}
                                    onClick={() => setSelectedRegion(r.name)}
                                    sx={{
                                        borderRadius: 4,
                                        mb: 1,
                                        px: 2,
                                        py: 1.5,
                                        border: "1px solid",
                                        borderColor:
                                            selectedRegion === r.name
                                                ? alpha(theme.palette.primary.main, 0.22)
                                                : alpha(theme.palette.divider, 0.10),
                                        bgcolor:
                                            selectedRegion === r.name
                                                ? alpha(theme.palette.primary.main, 0.10)
                                                : alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.035 : 0.02),
                                        "&:hover": {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            borderColor: alpha(theme.palette.primary.main, 0.20),
                                        },
                                        "&.Mui-selected:hover": { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                                    }}
                                >
                                    <ListItemText
                                        primary={r.name}
                                        primaryTypographyProps={{ fontWeight: 950, letterSpacing: -0.2 }}
                                        secondary={`${r.count} proje`}
                                        secondaryTypographyProps={{ sx: { opacity: 0.65 } }}
                                    />
                                    <Chip
                                        label={r.count}
                                        size="small"
                                        sx={{
                                            mr: 1,
                                            fontWeight: 950,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDeleteRegion(r.name, e)}
                                        sx={{
                                            borderRadius: 3,
                                            bgcolor: alpha(theme.palette.error.main, 0.10),
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.error.main, 0.16),
                                            mr: 0.5,
                                        }}
                                    >
                                        <DeleteOutlineRounded fontSize="small" />
                                    </IconButton>
                                    <ChevronRightRounded sx={{ opacity: 0.35 }} />
                                </ListItemButton>
                            ))}
                        </List>
                    </GlassCard>

                    {/* Projects */}
                    <GlassCard>
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={2}
                            alignItems={{ xs: "stretch", md: "center" }}
                            sx={{ mb: 3 }}
                        >
                            <Box sx={{ minWidth: 220 }}>
                                <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 950 }}>
                                    Seçili Bölge
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.6 }}>
                                    {selectedRegion || "Bölge Seçin"}
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                placeholder="Proje ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded sx={{ color: "text.disabled" }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: 4,
                                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.05 : 0.03),
                                    },
                                }}
                            />
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                            <TextField
                                fullWidth
                                placeholder="Yeni proje ekle..."
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                                InputProps={{ sx: { borderRadius: 4 } }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleAddProject}
                                startIcon={<AddRounded />}
                                sx={{
                                    borderRadius: 4,
                                    px: 4,
                                    whiteSpace: "nowrap",
                                    fontWeight: 950,
                                    textTransform: "none",
                                    boxShadow: "none",
                                }}
                            >
                                Proje Ekle
                            </Button>
                        </Stack>

                        <Divider sx={{ mb: 3, opacity: 0.35 }} />

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                                gap: 2,
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredProjects.map((p) => (
                                    <Box
                                        key={p}
                                        component={motion.div}
                                        layout
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                        transition={{ type: "spring", stiffness: 170, damping: 18 }}
                                        sx={{
                                            p: 2,
                                            borderRadius: 4,
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.divider, 0.12),
                                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.035 : 0.02),
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1.5,
                                            "&:hover": {
                                                transform: "translateY(-2px)",
                                                borderColor: alpha(theme.palette.primary.main, 0.20),
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            },
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {p}
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.65 }}>
                                                {selectedRegion}
                                            </Typography>
                                        </Box>

                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteProject(p)}
                                            sx={{
                                                borderRadius: 3,
                                                bgcolor: alpha(theme.palette.error.main, 0.10),
                                                border: "1px solid",
                                                borderColor: alpha(theme.palette.error.main, 0.18),
                                            }}
                                        >
                                            <DeleteOutlineRounded fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </AnimatePresence>
                        </Box>
                    </GlassCard>
                </Box>
            </Stack>

            <Snackbar
                open={toast.open}
                autoHideDuration={2200}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ borderRadius: 3, fontWeight: 900 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
