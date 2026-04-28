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
    Checkbox,
    Avatar,
    Tooltip,
    Tabs,
    Tab,
    Badge,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
    Public,
    AddRounded,
    DeleteOutlineRounded,
    ContentCopyRounded,
    SearchRounded,
    RestartAltRounded,
    RocketLaunchRounded,
    SettingsSuggestRounded,
    MailOutlineRounded,
    PersonAddAltRounded,
    FolderSpecialRounded,
    DoneAllRounded,
    EmailRounded,
    CheckCircleRounded,
    AutoAwesomeRounded,
    ArrowOutwardRounded,
} from "@mui/icons-material";
import { motion } from "framer-motion";

import { REGIONS as REGIONS_DEFAULT } from "../ozellikler/yardimcilar/veriKurallari";
import { setRegions } from "../ozellikler/yardimcilar/regionsStore";

const LS_REGIONS_KEY = "app_regions_v1";
const LS_MAIL_LINKS_KEY = "app_mail_links_v1";

const fadeUp = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" },
};

function GlowCard({ children, sx = {}, noPadding = false }) {
    const theme = useTheme();
    return (
        <Box
            component={motion.div}
            {...fadeUp}
            sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: { xs: 5, md: 6 },
                p: noPadding ? 0 : 3,
                background:
                    theme.palette.mode === "dark"
                        ? `linear-gradient(180deg, ${alpha("#0f172a", 0.9)} 0%, ${alpha("#111827", 0.82)} 100%)`
                        : `linear-gradient(180deg, ${alpha("#ffffff", 0.96)} 0%, ${alpha("#f8fbff", 0.92)} 100%)`,
                backdropFilter: "blur(18px)",
                border: "1px solid",
                borderColor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.08 : 0.65),
                boxShadow:
                    theme.palette.mode === "dark"
                        ? `0 20px 60px ${alpha("#000", 0.42)}`
                        : `0 18px 50px ${alpha("#1e293b", 0.12)}`,
                ...sx,
                "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent 35%, ${alpha(theme.palette.secondary.main, 0.08)})`,
                    pointerEvents: "none",
                },
            }}
        >
            {children}
        </Box>
    );
}

function StatPill({ icon: Icon, label, value, color }) {
    const theme = useTheme();
    return (
        <GlowCard sx={{ p: 2.25 }}>
            <Stack direction="row" spacing={1.75} alignItems="center">
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3.5,
                        display: "grid",
                        placeItems: "center",
                        background: `linear-gradient(135deg, ${alpha(color, 0.22)}, ${alpha(color, 0.08)})`,
                        border: "1px solid",
                        borderColor: alpha(color, 0.18),
                        boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.18)}`,
                    }}
                >
                    <Icon sx={{ color, fontSize: 24 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5 }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        {label}
                    </Typography>
                </Box>
            </Stack>
        </GlowCard>
    );
}

function SectionTitle({ eyebrow, title, subtitle, action }) {
    return (
        <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
            sx={{ mb: 2.5 }}
        >
            <Box>
                {eyebrow && (
                    <Typography
                        variant="overline"
                        sx={{
                            display: "block",
                            color: "primary.main",
                            fontWeight: 900,
                            letterSpacing: 1.2,
                            mb: 0.5,
                        }}
                    >
                        {eyebrow}
                    </Typography>
                )}
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.8 }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.6 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action}
        </Stack>
    );
}

export default function Anasayfa() {
    const theme = useTheme();
    const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

    const [regionsMap, setRegionsMap] = useState(() => {
        const ls = JSON.parse(localStorage.getItem(LS_REGIONS_KEY) || "null");
        return ls || REGIONS_DEFAULT || {};
    });

    const [mailLinks, setMailLinks] = useState(() => {
        const ls = JSON.parse(localStorage.getItem(LS_MAIL_LINKS_KEY) || "null");
        return ls || {};
    });

    const [selectedRegion, setSelectedRegion] = useState(() => Object.keys(regionsMap)[0] || "");
    const [newRegionName, setNewRegionName] = useState("");
    const [newProjectName, setNewProjectName] = useState("");
    const [search, setSearch] = useState("");
    const [globalSearch, setGlobalSearch] = useState("");
    const [mailInput, setMailInput] = useState("");
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [activeMailTab, setActiveMailTab] = useState(0);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    useEffect(() => {
        setRegions(regionsMap);
        localStorage.setItem(LS_REGIONS_KEY, JSON.stringify(regionsMap));
    }, [regionsMap]);

    useEffect(() => {
        localStorage.setItem(LS_MAIL_LINKS_KEY, JSON.stringify(mailLinks));
    }, [mailLinks]);

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
        return q ? list.filter((p) => p.toLowerCase().includes(q)) : list;
    }, [regionsMap, selectedRegion, search]);

    const allProjects = useMemo(() => {
        const all = [];
        for (const [region, projects] of Object.entries(regionsMap)) {
            for (const p of projects || []) all.push({ region, project: p });
        }
        return all;
    }, [regionsMap]);

    const globalResults = useMemo(() => {
        const q = globalSearch.trim().toLowerCase();
        if (!q) return [];
        return allProjects.filter(({ project, region }) =>
            project.toLowerCase().includes(q) || region.toLowerCase().includes(q)
        );
    }, [allProjects, globalSearch]);

    const totalProjects = useMemo(() => rows.reduce((a, c) => a + c.count, 0), [rows]);

    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const handleAddRegion = () => {
        const key = newRegionName.trim().toUpperCase();
        if (!key || regionsMap[key]) return;
        setRegionsMap((p) => ({ ...p, [key]: [] }));
        setNewRegionName("");
        setSelectedRegion(key);
        setToast({ open: true, msg: `Bölge eklendi: ${key}`, severity: "success" });
    };

    const handleDeleteRegion = (name, e) => {
        e.stopPropagation();
        const next = { ...regionsMap };
        delete next[name];
        setRegionsMap(next);
        if (selectedRegion === name) setSelectedRegion(Object.keys(next)[0] || "");
        setToast({ open: true, msg: `Bölge silindi: ${name}`, severity: "info" });
    };

    const handleAddProject = () => {
        const pName = newProjectName.trim();
        if (!pName || !selectedRegion || (regionsMap[selectedRegion] || []).includes(pName)) return;
        setRegionsMap((p) => ({ ...p, [selectedRegion]: [...(p[selectedRegion] || []), pName] }));
        setNewProjectName("");
        setToast({ open: true, msg: `Proje eklendi: ${pName}`, severity: "success" });
    };

    const handleDeleteProject = (projName) => {
        setRegionsMap((p) => ({
            ...p,
            [selectedRegion]: (p[selectedRegion] || []).filter((x) => x !== projName),
        }));
        setToast({ open: true, msg: `Proje silindi: ${projName}`, severity: "info" });
    };

    const toggleProject = (key) => {
        setSelectedProjects((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const handleBindMail = () => {
        const email = mailInput.trim().toLowerCase();
        if (!isValidEmail(email)) {
            setToast({ open: true, msg: "Geçerli bir e-posta adresi girin.", severity: "error" });
            return;
        }
        if (selectedProjects.length === 0) {
            setToast({ open: true, msg: "En az bir proje seçin.", severity: "warning" });
            return;
        }
        setMailLinks((prev) => {
            const existing = prev[email] || [];
            const merged = Array.from(new Set([...existing, ...selectedProjects]));
            return { ...prev, [email]: merged };
        });
        setToast({ open: true, msg: `${selectedProjects.length} proje ${email} adresine bağlandı.`, severity: "success" });
        setMailInput("");
        setSelectedProjects([]);
    };

    const handleUnbindProject = (email, projKey) => {
        setMailLinks((prev) => {
            const filtered = (prev[email] || []).filter((k) => k !== projKey);
            if (filtered.length === 0) {
                const next = { ...prev };
                delete next[email];
                return next;
            }
            return { ...prev, [email]: filtered };
        });
    };

    const handleRemoveEmail = (email) => {
        setMailLinks((prev) => {
            const next = { ...prev };
            delete next[email];
            return next;
        });
        setToast({ open: true, msg: `${email} kaldırıldı.`, severity: "info" });
    };

    const handleReset = () => {
        if (window.confirm("Tüm verileri varsayılana döndürmek istediğine emin misin?")) {
            setRegionsMap(REGIONS_DEFAULT);
            setMailLinks({});
            setSelectedRegion(Object.keys(REGIONS_DEFAULT)[0] || "");
            setSearch("");
            setGlobalSearch("");
            setSelectedProjects([]);
            setMailInput("");
            setToast({ open: true, msg: "Varsayılana döndürüldü.", severity: "warning" });
        }
    };

    const handleCopyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify({ regions: regionsMap, mailLinks }, null, 2));
            setToast({ open: true, msg: "JSON panoya kopyalandı.", severity: "success" });
        } catch {
            setToast({ open: true, msg: "Kopyalama başarısız.", severity: "error" });
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                position: "relative",
                overflow: "hidden",
                background:
                    theme.palette.mode === "dark"
                        ? "radial-gradient(circle at top left, #172554 0%, #0f172a 38%, #020617 100%)"
                        : "radial-gradient(circle at top left, #dbeafe 0%, #eef4ff 28%, #f7faff 65%, #f8fafc 100%)",
                p: { xs: 2, md: 3.5, lg: 4 },
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    top: -120,
                    right: -60,
                    width: 420,
                    height: 420,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(99,102,241,.20), transparent 70%)",
                    filter: "blur(30px)",
                    pointerEvents: "none",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    bottom: -160,
                    left: -100,
                    width: 360,
                    height: 360,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(168,85,247,.15), transparent 70%)",
                    filter: "blur(28px)",
                    pointerEvents: "none",
                }}
            />

            <Stack spacing={3} sx={{ maxWidth: 1550, mx: "auto", position: "relative", zIndex: 1 }}>
                <GlowCard sx={{ p: { xs: 2.5, md: 3.5 } }}>
                    <Stack
                        direction={{ xs: "column", lg: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", lg: "center" }}
                        spacing={2.5}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 4,
                                    display: "grid",
                                    placeItems: "center",
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.26)}, ${alpha(theme.palette.secondary.main, 0.16)})`,
                                    border: "1px solid",
                                    borderColor: alpha(theme.palette.primary.main, 0.22),
                                    boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.18)}`,
                                }}
                            >
                                <AutoAwesomeRounded sx={{ color: "primary.main", fontSize: 30 }} />
                            </Box>
                            <Box>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 950,
                                        letterSpacing: -1.8,
                                        lineHeight: 1.04,
                                        fontSize: { xs: 30, md: 42 },
                                    }}
                                >
                                    Bölge & Proje Yönetimi
                                </Typography>
                                <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.9, maxWidth: 700 }}>
                                    Daha modern, premium ve yönetimi kolay bir panel deneyimi.
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.25}>
                            <Button
                                variant="contained"
                                startIcon={<ContentCopyRounded />}
                                onClick={handleCopyJSON}
                                sx={{
                                    borderRadius: 3.5,
                                    textTransform: "none",
                                    fontWeight: 800,
                                    px: 2.4,
                                    boxShadow: "none",
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                }}
                            >
                                JSON Kopyala
                            </Button>
                            <Tooltip title="Varsayılana döndür">
                                <IconButton
                                    onClick={handleReset}
                                    sx={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: 3.5,
                                        bgcolor: alpha(theme.palette.error.main, 0.09),
                                        border: "1px solid",
                                        borderColor: alpha(theme.palette.error.main, 0.18),
                                    }}
                                >
                                    <RestartAltRounded color="error" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </GlowCard>

                <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2}>
                    <StatPill icon={Public} label="Aktif Bölge" value={rows.length} color="#4f46e5" />
                    <StatPill icon={RocketLaunchRounded} label="Toplam Proje" value={totalProjects} color="#059669" />
                    <StatPill icon={EmailRounded} label="Mail Bağlantısı" value={Object.keys(mailLinks).length} color="#a855f7" />
                </Box>

                <GlowCard sx={{ p: 2.2 }}>
                    <TextField
                        fullWidth
                        placeholder="Tüm bölgelerde veya projelerde ara..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded sx={{ color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 4,
                                bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.72),
                                "& fieldset": { borderColor: alpha(theme.palette.primary.main, 0.12) },
                            },
                        }}
                    />

                    {globalSearch.trim() && (
                        <Box sx={{ mt: 2.2 }}>
                            <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 900 }}>
                                Arama Sonuçları ({globalResults.length})
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1.2,
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                                    gap: 1.5,
                                }}
                            >
                                {globalResults.map((item) => (
                                    <Box
                                        key={`${item.region}-${item.project}`}
                                        onClick={() => {
                                            setSelectedRegion(item.region);
                                            setSearch(item.project);
                                        }}
                                        sx={{
                                            p: 2,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            background: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.78),
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.primary.main, 0.12),
                                            transition: "all .18s ease",
                                            "&:hover": {
                                                transform: "translateY(-2px)",
                                                borderColor: alpha(theme.palette.primary.main, 0.28),
                                                boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                                            },
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 800 }}>{item.project}</Typography>
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.7 }}>
                                            <Chip size="small" label={item.region} sx={{ fontWeight: 700 }} />
                                            <ArrowOutwardRounded sx={{ fontSize: 14, color: "text.secondary" }} />
                                        </Stack>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </GlowCard>

                <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "340px 1fr" }} gap={3}>
                    <GlowCard noPadding sx={{ height: "fit-content" }}>
                        <Box sx={{ p: 3 }}>
                            <SectionTitle
                                eyebrow="SOL PANEL"
                                title="Bölgeler"
                                subtitle="Bölge seç, yeni bölge ekle ve listeyi yönet."
                                action={<Chip label={`${rows.length} bölge`} color="primary" variant="outlined" />}
                            />

                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Yeni bölge oluştur"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddRegion()}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleAddRegion} color="primary">
                                                <AddRounded />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: 3.5,
                                        bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.7),
                                    },
                                }}
                            />
                        </Box>

                        <Divider sx={{ opacity: 0.14 }} />

                        <List sx={{ p: 1.5, maxHeight: isLgUp ? 620 : "none", overflowY: isLgUp ? "auto" : "visible" }}>
                            {rows.map((r) => (
                                <ListItemButton
                                    key={r.name}
                                    selected={selectedRegion === r.name}
                                    onClick={() => {
                                        setSelectedRegion(r.name);
                                        setSearch("");
                                    }}
                                    sx={{
                                        mb: 1,
                                        py: 1.35,
                                        px: 1.4,
                                        borderRadius: 3.5,
                                        border: "1px solid",
                                        borderColor:
                                            selectedRegion === r.name
                                                ? alpha(theme.palette.primary.main, 0.28)
                                                : alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.06 : 0.58),
                                        bgcolor:
                                            selectedRegion === r.name
                                                ? alpha(theme.palette.primary.main, 0.1)
                                                : alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.03 : 0.5),
                                        transition: "all .18s ease",
                                        "&:hover": {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            transform: "translateX(2px)",
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={r.name}
                                        secondary={`${r.count} proje`}
                                        primaryTypographyProps={{ fontWeight: 900, fontSize: 14 }}
                                        secondaryTypographyProps={{ sx: { color: "text.secondary", fontSize: 12 } }}
                                    />
                                    <Chip label={r.count} size="small" sx={{ mr: 1, fontWeight: 800 }} />
                                    <IconButton size="small" onClick={(e) => handleDeleteRegion(r.name, e)}>
                                        <DeleteOutlineRounded fontSize="small" />
                                    </IconButton>
                                </ListItemButton>
                            ))}
                        </List>
                    </GlowCard>

                    <GlowCard>
                        <SectionTitle
                            eyebrow="ANA ALAN"
                            title={selectedRegion ? `${selectedRegion} Projeleri` : "Projeler"}
                            subtitle="Seçili bölgedeki projeleri düzenle, ara ve yeni proje ekle."
                            action={<Chip icon={<CheckCircleRounded />} label={`${filteredProjects.length} proje`} color="success" variant="outlined" />}
                        />

                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                placeholder="Bu bölgede proje ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded sx={{ color: "text.secondary" }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: 3.5,
                                        bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.72),
                                    },
                                }}
                            />

                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                <TextField
                                    fullWidth
                                    placeholder="Yeni proje adı"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                                    InputProps={{
                                        sx: {
                                            borderRadius: 3.5,
                                            bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.72),
                                        },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleAddProject}
                                    startIcon={<AddRounded />}
                                    sx={{
                                        borderRadius: 3.5,
                                        px: 3.5,
                                        whiteSpace: "nowrap",
                                        fontWeight: 900,
                                        textTransform: "none",
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        boxShadow: "none",
                                    }}
                                >
                                    Proje Ekle
                                </Button>
                            </Stack>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                                    gap: 1.6,
                                    mt: 0.5,
                                }}
                            >
                                {filteredProjects.map((p) => (
                                    <Box
                                        key={p}
                                        component={motion.div}
                                        whileHover={{ y: -4 }}
                                        sx={{
                                            p: 2,
                                            borderRadius: 4,
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.primary.main, 0.1),
                                            background: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.82),
                                            boxShadow: `0 10px 26px ${alpha(theme.palette.primary.main, 0.06)}`,
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 800, wordBreak: "break-word" }}>{p}</Typography>
                                                <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.6, display: "block" }}>
                                                    {selectedRegion}
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteProject(p)}>
                                                <DeleteOutlineRounded fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                ))}
                            </Box>

                            {filteredProjects.length === 0 && (
                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 4,
                                        textAlign: "center",
                                        border: "1px dashed",
                                        borderColor: alpha(theme.palette.primary.main, 0.18),
                                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 800 }}>Bu alanda gösterilecek proje yok.</Typography>
                                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.6 }}>
                                        Yeni proje ekleyebilir veya arama filtresini temizleyebilirsin.
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </GlowCard>
                </Box>

                <GlowCard>
                    <SectionTitle
                        eyebrow="BAĞLANTI MERKEZİ"
                        title="Proje – Mail Bağlantısı"
                        subtitle="Projeleri ilgili e-posta adresleriyle hızlıca eşleştir."
                        action={<Chip label={`${Object.keys(mailLinks).length} kayıt`} color="secondary" variant="outlined" />}
                    />

                    <Tabs
                        value={activeMailTab}
                        onChange={(_, v) => setActiveMailTab(v)}
                        sx={{
                            mb: 3,
                            minHeight: 46,
                            "& .MuiTabs-indicator": {
                                height: 34,
                                borderRadius: 999,
                                background: alpha(theme.palette.secondary.main, 0.12),
                            },
                            "& .MuiTab-root": {
                                zIndex: 1,
                                minHeight: 46,
                                textTransform: "none",
                                fontWeight: 800,
                            },
                        }}
                    >
                        <Tab label="Yeni Bağlantı" />
                        <Tab label={`Kayıtlı Bağlantılar (${Object.keys(mailLinks).length})`} />
                    </Tabs>

                    {activeMailTab === 0 ? (
                        <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1.1fr 0.9fr" }} gap={3}>
                            <Box>
                                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                                    {rows.map((r) => (
                                        <Chip
                                            key={r.name}
                                            label={r.name}
                                            clickable
                                            onClick={() => setSelectedRegion(r.name)}
                                            color={selectedRegion === r.name ? "primary" : "default"}
                                            variant={selectedRegion === r.name ? "filled" : "outlined"}
                                            sx={{ fontWeight: 800, borderRadius: 999 }}
                                        />
                                    ))}
                                </Stack>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                                        gap: 1.2,
                                        maxHeight: 320,
                                        overflowY: "auto",
                                        pr: 1,
                                    }}
                                >
                                    {(regionsMap[selectedRegion] || []).map((p) => {
                                        const key = `${selectedRegion}::${p}`;
                                        const checked = selectedProjects.includes(key);
                                        return (
                                            <Box
                                                key={key}
                                                onClick={() => toggleProject(key)}
                                                sx={{
                                                    p: 1.6,
                                                    borderRadius: 3.5,
                                                    cursor: "pointer",
                                                    border: "1px solid",
                                                    borderColor: checked ? alpha(theme.palette.secondary.main, 0.32) : alpha(theme.palette.primary.main, 0.08),
                                                    bgcolor: checked ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.72),
                                                    transition: "all .18s ease",
                                                    "&:hover": { transform: "translateY(-2px)" },
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Checkbox checked={checked} size="small" sx={{ p: 0.25 }} />
                                                    <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{p}</Typography>
                                                </Stack>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            <Box>
                                <Box
                                    sx={{
                                        p: 2.2,
                                        borderRadius: 4,
                                        border: "1px solid",
                                        borderColor: alpha(theme.palette.secondary.main, 0.14),
                                        background: `linear-gradient(180deg, ${alpha(theme.palette.secondary.main, 0.07)}, ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.03 : 0.66)})`,
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 900, mb: 1.4 }}>E-posta ile eşleştir</Typography>

                                    <TextField
                                        fullWidth
                                        type="email"
                                        placeholder="ornek@sirket.com"
                                        value={mailInput}
                                        onChange={(e) => setMailInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleBindMail()}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MailOutlineRounded sx={{ color: "secondary.main" }} />
                                                </InputAdornment>
                                            ),
                                            sx: {
                                                borderRadius: 3.5,
                                                bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.85),
                                            },
                                        }}
                                    />

                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 1.6,
                                            minHeight: 120,
                                            borderRadius: 3.5,
                                            border: "1px dashed",
                                            borderColor: alpha(theme.palette.secondary.main, 0.2),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 800, mb: 1.1 }}>
                                            Seçili projeler ({selectedProjects.length})
                                        </Typography>
                                        <Stack direction="row" flexWrap="wrap" gap={1}>
                                            {selectedProjects.length === 0 ? (
                                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                                    Henüz proje seçilmedi.
                                                </Typography>
                                            ) : (
                                                selectedProjects.map((key) => {
                                                    const [reg, proj] = key.split("::");
                                                    return (
                                                        <Chip
                                                            key={key}
                                                            icon={<FolderSpecialRounded />}
                                                            label={`${proj} • ${reg}`}
                                                            onDelete={() => toggleProject(key)}
                                                            variant="outlined"
                                                            color="secondary"
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    );
                                                })
                                            )}
                                        </Stack>
                                    </Box>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<PersonAddAltRounded />}
                                        onClick={handleBindMail}
                                        disabled={!mailInput.trim() || selectedProjects.length === 0}
                                        sx={{
                                            mt: 2,
                                            borderRadius: 3.5,
                                            textTransform: "none",
                                            fontWeight: 900,
                                            py: 1.45,
                                            background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                                            boxShadow: "none",
                                        }}
                                    >
                                        Kaydet ve Bağla
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            {Object.keys(mailLinks).length === 0 ? (
                                <Box
                                    sx={{
                                        borderRadius: 4,
                                        p: 5,
                                        textAlign: "center",
                                        border: "1px dashed",
                                        borderColor: alpha(theme.palette.secondary.main, 0.2),
                                        bgcolor: alpha(theme.palette.secondary.main, 0.03),
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 800 }}>Henüz kayıtlı bağlantı yok.</Typography>
                                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.6 }}>
                                        Yeni bağlantı sekmesinden proje ve e-posta eşleştirmesi yapabilirsin.
                                    </Typography>
                                </Box>
                            ) : (
                                Object.entries(mailLinks).map(([email, projects]) => (
                                    <Box
                                        key={email}
                                        sx={{
                                            p: 2.2,
                                            borderRadius: 4,
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.secondary.main, 0.14),
                                            background: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.76),
                                        }}
                                    >
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            justifyContent="space-between"
                                            alignItems={{ xs: "flex-start", sm: "center" }}
                                            spacing={2}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 42,
                                                        height: 42,
                                                        background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    {email.slice(0, 2).toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 900 }}>{email}</Typography>
                                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                                        {projects.length} proje bağlı
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <IconButton color="error" onClick={() => handleRemoveEmail(email)}>
                                                <DeleteOutlineRounded />
                                            </IconButton>
                                        </Stack>

                                        <Divider sx={{ my: 2, opacity: 0.18 }} />

                                        <Stack direction="row" flexWrap="wrap" gap={1}>
                                            {projects.map((key) => {
                                                const [reg, proj] = key.split("::");
                                                return (
                                                    <Chip
                                                        key={key}
                                                        avatar={<Avatar>{reg[0]}</Avatar>}
                                                        label={`${proj} • ${reg}`}
                                                        onDelete={() => handleUnbindProject(email, key)}
                                                        variant="outlined"
                                                        sx={{ borderRadius: 999, fontWeight: 700 }}
                                                    />
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                ))
                            )}
                        </Stack>
                    )}
                </GlowCard>
            </Stack>

            <Snackbar
                open={toast.open}
                autoHideDuration={2400}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ borderRadius: 3, fontWeight: 800 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
