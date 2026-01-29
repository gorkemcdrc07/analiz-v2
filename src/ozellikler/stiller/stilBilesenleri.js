// src/ozellikler/stiller/stilBilesenleri.js
import { Box, Chip, Paper, Tab, Tabs, alpha, styled } from "@mui/material";
import { motion } from "framer-motion";

/* ------------------------ Ana Zemin ------------------------ */
export const Root = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: "100%",
        minHeight: "100vh",
        padding: "clamp(12px, 2vw, 26px)",
        background: isDark
            ? `radial-gradient(at 0% 0%, ${alpha("#1e293b", 1)} 0%, transparent 50%),
               radial-gradient(at 100% 0%, ${alpha("#0f172a", 1)} 0%, transparent 50%),
               radial-gradient(at 50% 100%, ${alpha("#1e3a8a", 0.3)} 0%, transparent 50%),
               #020617`
            : `radial-gradient(at 0% 0%, ${alpha("#f0f9ff", 1)} 0%, transparent 50%),
               radial-gradient(at 100% 0%, ${alpha("#f0fdf4", 1)} 0%, transparent 50%),
               radial-gradient(at 50% 100%, ${alpha("#fff7ed", 1)} 0%, transparent 50%),
               #f8fafc`,
    };
});

export const Wide = styled(Box)({
    width: "100%",
    maxWidth: "100%", // 30000 yerine daha güvenli bir değer
    marginLeft: "auto",
    marginRight: "auto",
});

export const TopBar = styled(Paper)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        position: "sticky",
        top: 14,
        zIndex: 100,
        borderRadius: 24,
        padding: "16px 24px",
        border: `1px solid ${alpha(isDark ? "#ffffff" : "#000000", 0.08)}`,
        background: isDark ? alpha("#0b1220", 0.7) : alpha("#ffffff", 0.75),
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.4)" : "0 15px 40px rgba(2,6,23,0.08)",
    };
});

export const Grid = styled(Box)({
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
});

export const Grid2 = styled(Box)({
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
});

/* ------------------------ KPI Kartları ------------------------ */
export const KPI = styled(motion.div)(({ theme, accent = "#3b82f6" }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 24,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${alpha(accent, 0.15)}`,
        background: isDark ? alpha("#0b1220", 0.8) : alpha("#ffffff", 0.8),
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
        "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: `0 12px 30px ${alpha(accent, 0.2)}`,
        },
        "&:before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 20% 0%, ${alpha(accent, 0.15)}, transparent 70%)`,
            pointerEvents: "none",
        },
    };
});

/* ------------------------ Bölge Sekmeleri ------------------------ */
export const RegionTabs = styled(Tabs)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        background: isDark ? alpha("#ffffff", 0.05) : alpha("#000", 0.04),
        padding: 6,
        borderRadius: 18,
        "& .MuiTabs-indicator": {
            height: "calc(100% - 12px)",
            borderRadius: 14,
            backgroundColor: isDark ? alpha("#fff", 0.1) : "#fff",
            top: 6,
            boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
        },
    };
});

export const RegionTab = styled(Tab)(({ theme }) => ({
    textTransform: "none",
    fontWeight: 800,
    zIndex: 2,
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

export const CardList = styled(Box)({
    marginTop: 16,
    display: "grid",
    gap: 12,
});

/* ------------------------ Proje Kartı ve Altları ------------------------ */
export const ProjeKarti = styled(motion.div)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 28,
        border: `1px solid ${alpha(isDark ? "#ffffff" : "#000", 0.08)}`,
        background: isDark ? alpha("#0b1220", 0.8) : alpha("#ffffff", 0.9),
        backdropFilter: "blur(12px)",
        boxShadow: isDark ? "0 20px 60px rgba(0,0,0,0.4)" : "0 15px 45px rgba(2,6,23,0.05)",
        overflow: "hidden",
    };
});

export const KartBasligi = styled(Box)({
    padding: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
});

export const VurguCubugu = styled(Box)(({ color = "#3b82f6" }) => ({
    width: 6,
    borderRadius: 999,
    background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.4)})`,
    alignSelf: "stretch",
}));

export const Hap = styled(Chip)(({ theme, pillcolor = "#3b82f6" }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        height: 26,
        borderRadius: 10,
        fontWeight: 800,
        background: alpha(pillcolor, isDark ? 0.15 : 0.08),
        color: isDark ? "#fff" : pillcolor,
        border: `1px solid ${alpha(pillcolor, 0.2)}`,
    };
});

export const GenisletButonu = styled(Box)(({ theme, open }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: 38,
        height: 38,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        background: open
            ? (isDark ? alpha("#fff", 0.15) : "#0f172a")
            : (isDark ? alpha("#fff", 0.05) : alpha("#0f172a", 0.05)),
        color: open ? "#fff" : theme.palette.text.secondary,
        transition: "0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    };
});

export const SevkiyatSarmal = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        padding: 16,
        background: isDark ? alpha("#000", 0.2) : alpha("#f8fafc", 0.5),
        borderTop: `1px solid ${alpha(isDark ? "#fff" : "#000", 0.06)}`,
    };
});

export const SevkiyatKarti = styled(motion.div)(({ theme, printed }) => {
    const isDark = theme.palette.mode === "dark";
    const accent = printed ? "#10b981" : "#3b82f6";
    return {
        borderRadius: 20,
        border: `1px solid ${alpha(accent, 0.2)}`,
        background: isDark ? alpha("#0b1220", 0.95) : "#fff",
        padding: 16,
        position: "relative",
        overflow: "hidden",
        "&:before": {
            content: '""',
            position: "absolute",
            left: 0, top: 0, bottom: 0, width: 6,
            background: accent,
        },
    };
});

/* Satır içi tabs */
export const SatirSekmeleri = styled(Tabs)(({ theme }) => ({
    minHeight: 38,
    "& .MuiTabs-indicator": {
        height: 3,
        borderRadius: 3,
        backgroundColor: theme.palette.primary.main,
    },
}));

export const SatirSekme = styled(Tab)(({ theme }) => ({
    minHeight: 38,
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

/* Rota kutuları */
export const RotaKutusu = styled(Box)(({ theme, t = "pickup" }) => {
    const isDark = theme.palette.mode === "dark";
    const c = t === "pickup" ? "#10b981" : "#ef4444";
    return {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        border: `1px dashed ${alpha(c, 0.4)}`,
        background: alpha(c, isDark ? 0.08 : 0.04),
        transition: "0.2s",
        "&:hover": {
            background: alpha(c, isDark ? 0.12 : 0.07),
        }
    };
});