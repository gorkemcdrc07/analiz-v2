// src/components/ProjeTablosu/styles.js
import { Box, Chip, Paper, Tab, Tabs } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { motion } from "framer-motion";

export const Root = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: "100%",
        minHeight: "100vh",
        padding: "clamp(12px, 2vw, 26px)",
        background: isDark
            ? [
                `radial-gradient(1200px 600px at 15% 0%, ${alpha("#3b82f6", 0.22)}, transparent 55%)`,
                `radial-gradient(900px 520px at 85% 5%, ${alpha("#10b981", 0.16)}, transparent 60%)`,
                `radial-gradient(1000px 650px at 50% 100%, ${alpha("#f59e0b", 0.14)}, transparent 60%)`,
                "linear-gradient(180deg,#020617, #071225 60%, #020617)",
            ].join(",")
            : [
                "radial-gradient(1200px 600px at 15% 0%, rgba(59,130,246,0.14), transparent 55%)",
                "radial-gradient(900px 520px at 85% 5%, rgba(16,185,129,0.10), transparent 60%)",
                "radial-gradient(1000px 650px at 50% 100%, rgba(245,158,11,0.10), transparent 60%)",
                "linear-gradient(180deg,#f8fafc, #f6f7fb 60%, #f8fafc)",
            ].join(","),
    };
});

export const Wide = styled(Box)({
    width: "100%",
    maxWidth: 30000,
    marginLeft: "auto",
    marginRight: "auto",
});

export const TopBar = styled(Paper)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        position: "sticky",
        top: 14,
        zIndex: 10,
        borderRadius: 26,
        padding: 18,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.8)",
        background: isDark ? alpha("#0b1220", 0.78) : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(16px)",
        boxShadow: isDark ? "0 28px 90px rgba(0,0,0,0.55)" : "0 24px 80px rgba(2,6,23,0.12)",
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

export const KPI = styled(motion.div)(({ theme, accent = "#3b82f6" }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 22,
        padding: 16,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
        background: isDark ? alpha("#0b1220", 0.86) : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(10px)",
        boxShadow: isDark ? "0 18px 55px rgba(0,0,0,0.45)" : "0 18px 55px rgba(2,6,23,0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        "&:before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `radial-gradient(900px 250px at 18% 0%, ${alpha(accent, isDark ? 0.24 : 0.18)}, transparent 55%)`,
            pointerEvents: "none",
        },
    };
});

export const RegionTabs = styled(Tabs)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        background: isDark ? alpha("#ffffff", 0.06) : "rgba(15,23,42,0.04)",
        padding: 6,
        borderRadius: 18,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "1px solid rgba(226,232,240,0.9)",
        "& .MuiTabs-indicator": {
            height: "calc(100% - 12px)",
            borderRadius: 14,
            backgroundColor: isDark ? alpha("#ffffff", 0.1) : "rgba(255,255,255,0.92)",
            top: 6,
        },
    };
});

export const RegionTab = styled(Tab)(({ theme }) => ({
    textTransform: "none",
    fontWeight: 950,
    zIndex: 2,
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

export const CardList = styled(Box)({
    marginTop: 16,
    display: "grid",
    gap: 12,
});

/** ProjectRow için gereken stiller */
export const ProjectCard = styled(motion.div)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 24,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.95)",
        background: isDark ? alpha("#0b1220", 0.86) : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        boxShadow: isDark ? "0 18px 60px rgba(0,0,0,0.55)" : "0 16px 55px rgba(2,6,23,0.07)",
        overflow: "hidden",
    };
});

export const CardHeader = styled(Box)({
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
});

export const Accent = styled(Box)(({ color = "#3b82f6" }) => ({
    width: 10,
    borderRadius: 999,
    background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.65)})`,
    alignSelf: "stretch",
}));

export const Pill = styled(Chip)(({ theme, pillcolor }) => {
    const isDark = theme.palette.mode === "dark";
    const c = pillcolor || "#3b82f6";
    return {
        height: 26,
        borderRadius: 999,
        fontWeight: 950,
        background: alpha(c, isDark ? 0.22 : 0.12),
        color: isDark ? theme.palette.text.primary : c,
        border: `1px solid ${alpha(c, isDark ? 0.32 : 0.22)}`,
    };
});

export const ExpandBtn = styled(Box)(({ theme, open }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        width: 40,
        height: 40,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: open
            ? isDark
                ? alpha("#ffffff", 0.1)
                : "#0f172a"
            : isDark
                ? alpha("#ffffff", 0.06)
                : "rgba(15,23,42,0.06)",
        color: open ? (isDark ? "#e2e8f0" : "#fff") : theme.palette.text.secondary,
        transition: "0.2s",
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
    };
});

export const ShipmentWrap = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        padding: 16,
        background: isDark ? alpha("#ffffff", 0.03) : "rgba(15,23,42,0.02)",
        borderTop: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
    };
});

export const ShipmentCard = styled(motion.div)(({ theme, printed }) => {
    const isDark = theme.palette.mode === "dark";
    return {
        borderRadius: 22,
        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.95)",
        background: isDark ? alpha("#0b1220", 0.92) : "rgba(255,255,255,0.94)",
        boxShadow: isDark ? "0 18px 55px rgba(0,0,0,0.50)" : "0 14px 48px rgba(2,6,23,0.07)",
        overflow: "hidden",
        position: "relative",
        padding: 16,
        "&:before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: printed ? "linear-gradient(180deg,#10b981,#059669)" : "linear-gradient(180deg,#3b82f6,#2563eb)",
        },
    };
});

export const RowTabs = styled(Tabs)(({ theme }) => ({
    minHeight: 34,
    "& .MuiTabs-indicator": {
        height: 3,
        borderRadius: 3,
        backgroundColor: theme.palette.primary.main,
    },
}));

export const RowTab = styled(Tab)(({ theme }) => ({
    minHeight: 34,
    textTransform: "none",
    fontWeight: 950,
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
    "&.Mui-selected": { color: theme.palette.text.primary },
}));

export const RouteBox = styled(Box)(({ theme, t = "pickup" }) => {
    const isDark = theme.palette.mode === "dark";
    const c = t === "pickup" ? "#10b981" : "#ef4444";
    return {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        border: `1px dashed ${alpha(c, isDark ? 0.6 : 0.55)}`,
        background: alpha(c, isDark ? 0.1 : 0.06),
    };
});
