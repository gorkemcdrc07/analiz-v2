import React from "react";
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
    Slide,
    useTheme,
    useMediaQuery,
    alpha,
    styled,
} from "@mui/material";
import {
    MdClose,
    MdDateRange,
    MdAssignmentInd,
    MdLocalShipping,
    MdInfoOutline,
    MdHistory,
} from "react-icons/md";
import { formatDateTR } from "../yardimcilar/tarihIslemleri";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// --- HELPER FUNCTIONS (Parse & Diff unchanged) ---
const parseTRDateTime = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const s = String(v).trim();
    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (m) {
        return new Date(
            Number(m[3]),
            Number(m[2]) - 1,
            Number(m[1]),
            Number(m[4] ?? 0),
            Number(m[5] ?? 0),
            Number(m[6] ?? 0)
        );
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

// --- MODERN THEME-AWARE STYLED COMPONENTS ---

const StyledDialog = styled(Dialog)(({ theme }) => ({
    "& .MuiPaper-root": {
        borderRadius: "24px",
        backgroundColor: theme.palette.mode === "light" ? "#f8fafc" : "#020617",
        backgroundImage: "none",
        maxHeight: "85vh",
        boxShadow:
            theme.palette.mode === "light"
                ? "0 20px 50px rgba(0,0,0,0.10)"
                : "0 26px 70px rgba(0,0,0,0.60)",
        border:
            theme.palette.mode === "light"
                ? "1px solid rgba(15, 23, 42, 0.06)"
                : `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
    },
}));

const DetailCard = styled(Card)(({ theme }) => ({
    borderRadius: "20px",
    border:
        theme.palette.mode === "light"
            ? "1px solid rgba(0,0,0,0.05)"
            : `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
    background: theme.palette.mode === "light" ? "#ffffff" : "#0b1220",
    padding: "16px",
    transition: "all 0.2s ease-in-out",
    boxShadow:
        theme.palette.mode === "light"
            ? "0 0 0 rgba(0,0,0,0)"
            : "0 10px 28px rgba(0,0,0,0.35)",
    "&:hover": {
        transform: "translateY(-3px)",
        boxShadow:
            theme.palette.mode === "light"
                ? "0 12px 24px rgba(0,0,0,0.04)"
                : "0 18px 40px rgba(0,0,0,0.55)",
        borderColor: theme.palette.primary.main,
    },
}));

const LocationLabel = styled(Typography)(({ theme }) => ({
    fontSize: "0.65rem",
    fontWeight: 800,
    color: theme.palette.mode === "light" ? "#94a3b8" : "#93a4be",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "2px",
}));

export default function DetayPaneli({ type, data, onClose }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    // Veri Filtreleme (Kısa versiyon)
    const getFilteredData = () => {
        switch (type) {
            case "spot":
                return { title: "Spot Araç Planlama", list: data.filter((o) => Number(o.OrderStatu) === 3) };
            case "filo":
                return { title: "Filo Araç Planlama", list: data.filter((o) => Number(o.OrderStatu) === 90) };
            case "tedarik":
                return { title: "Tedarik Edilenler", list: data.filter((o) => o.TMSDespatchDocumentNo?.startsWith("SFR")) };
            case "tedarik_edilmeyen":
                return {
                    title: "Bekleyen Talepler",
                    list: data.filter((o) => !o.TMSDespatchDocumentNo && o.TMSVehicleRequestDocumentNo?.startsWith("VP")),
                };
            default:
                return { title: "Detay Listesi", list: [] };
        }
    };

    const { title, list: filtered } = getFilteredData();

    const headerBg = theme.palette.mode === "light" ? "#ffffff" : "#0b1220";
    const headerBorder =
        theme.palette.mode === "light" ? "#f1f5f9" : alpha(theme.palette.common.white, 0.10);

    const softBg = theme.palette.mode === "light" ? "#f8fafc" : alpha(theme.palette.common.white, 0.05);
    const softBorder = theme.palette.mode === "light" ? "#e2e8f0" : alpha(theme.palette.common.white, 0.10);

    const iconBoxBg =
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.10)
            : alpha(theme.palette.primary.main, 0.18);

    const closeBtnBg = theme.palette.mode === "light" ? "#f1f5f9" : alpha(theme.palette.common.white, 0.06);

    return (
        <StyledDialog
            open={true}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="lg"
            fullWidth
            TransitionComponent={Transition}
        >
            <DialogTitle
                sx={{
                    p: "20px 32px",
                    bgcolor: headerBg,
                    borderBottom: `1px solid ${headerBorder}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            p: 1,
                            bgcolor: iconBoxBg,
                            borderRadius: "12px",
                            color: theme.palette.primary.main,
                            display: "flex",
                        }}
                    >
                        <MdInfoOutline size={22} />
                    </Box>

                    <Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: theme.palette.text.primary,
                                lineHeight: 1.2,
                            }}
                        >
                            {title}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
                        >
                            {filtered.length} Kayıt Bulundu
                        </Typography>
                    </Box>
                </Stack>

                <IconButton
                    onClick={onClose}
                    sx={{
                        bgcolor: closeBtnBg,
                        color: theme.palette.text.secondary,
                        "&:hover": {
                            bgcolor: alpha("#ef4444", theme.palette.mode === "light" ? 0.15 : 0.20),
                            color: "#ef4444",
                        },
                    }}
                >
                    <MdClose size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 2,
                    }}
                >
                    {filtered.length > 0 ? (
                        filtered.map((item, idx) => {
                            const diff = diffHuman(
                                pickField(item, ["sefer_acilis_zamani", "SeferAcilisZamani", "OrderCreatedDate"]),
                                pickField(item, ["yukleme_tarihi", "YuklemeTarihi", "PickupDate"])
                            );

                            const hasDespatch = Boolean(item.TMSDespatchDocumentNo);

                            const chipBg = hasDespatch
                                ? (theme.palette.mode === "light"
                                    ? "#dcfce7"
                                    : alpha("#22c55e", 0.18))
                                : (theme.palette.mode === "light"
                                    ? "#fff7ed"
                                    : alpha("#f97316", 0.18));

                            const chipColor = hasDespatch ? "#15803d" : "#c2410c";

                            return (
                                <DetailCard key={idx} elevation={0}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    bgcolor: softBg,
                                                    borderRadius: "10px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: theme.palette.text.secondary,
                                                    border: `1px solid ${softBorder}`,
                                                }}
                                            >
                                                <MdAssignmentInd size={20} />
                                            </Box>

                                            <Box>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: theme.palette.text.primary,
                                                        fontSize: "0.9rem",
                                                    }}
                                                >
                                                    {item.CurrentAccountTitle?.substring(0, 30) || "Mü�Yteri Belirtilmemi�Y"}...
                                                </Typography>

                                                <Typography
                                                    sx={{
                                                        color: theme.palette.text.secondary,
                                                        fontSize: "0.7rem",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {item.ProjectName || "Genel Proje"}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Chip
                                            label={item.TMSDespatchDocumentNo || "BEKLEMEDE"}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.65rem",
                                                borderRadius: "8px",
                                                bgcolor: chipBg,
                                                color: theme.palette.mode === "light" ? chipColor : theme.palette.text.primary,
                                                border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0 : 0.08)}`,
                                            }}
                                        />
                                    </Stack>

                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            bgcolor: softBg,
                                            p: 1.5,
                                            borderRadius: "12px",
                                            mb: 1.5,
                                            border: `1px solid ${softBorder}`,
                                        }}
                                    >
                                        <Box>
                                            <LocationLabel>Y�oKLEME</LocationLabel>
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "0.8rem",
                                                    color: theme.palette.text.primary,
                                                }}
                                            >
                                                {item.PickupCityName || "-"}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: "flex", alignItems: "center", color: alpha(theme.palette.text.secondary, 0.7) }}>
                                            <MdLocalShipping size={16} />
                                        </Box>

                                        <Box sx={{ textAlign: "right" }}>
                                            <LocationLabel>TESLİMAT</LocationLabel>
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "0.8rem",
                                                    color: theme.palette.text.primary,
                                                }}
                                            >
                                                {item.DeliveryCityName || "-"}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: theme.palette.text.secondary }}>
                                            <MdDateRange size={14} />
                                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                                {formatDateTR(item.OrderDate || item.PickupDate)}
                                            </Typography>
                                        </Stack>

                                        {diff && (
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                alignItems="center"
                                                sx={{
                                                    color: theme.palette.primary.main,
                                                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.08 : 0.18),
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: "6px",
                                                    border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.12 : 0.22)}`,
                                                }}
                                            >
                                                <MdHistory size={12} />
                                                <Typography sx={{ fontSize: "0.7rem", fontWeight: 800 }}>{diff}</Typography>
                                            </Stack>
                                        )}
                                    </Stack>
                                </DetailCard>
                            );
                        })
                    ) : (
                        <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 8 }}>
                            <Typography sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                                Kayıt bulunamadı.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </StyledDialog>
    );
}
