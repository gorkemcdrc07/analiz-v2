import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, styled, Tooltip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { FaSync, FaCalendarAlt, FaSlidersH, FaBalanceScale } from "react-icons/fa";
import { MdUploadFile } from "react-icons/md";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ─── temel token'lar ────────────────────────────────────────────────────── */
const R = {
    border: (isDark) =>
        isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
    surface: (isDark) =>
        isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
};

/* ─── LiveDot ────────────────────────────────────────────────────────────── */
const LiveDot = styled(Box)({
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    flexShrink: 0,
    "@keyframes livepulse": {
        "0%,100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.45)" },
        "60%": { boxShadow: "0 0 0 5px rgba(34,197,94,0)" },
    },
    animation: "livepulse 2s ease-out infinite",
});

/* ─── PickerSlot ─────────────────────────────────────────────────────────── */
const PickerSlot = styled(Box)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 0,
        background: "transparent",
        fontSize: "0.8rem",
        fontWeight: 700,
        width: 174,
        height: 40,
        color: theme.palette.text.primary,
        letterSpacing: "-0.01em",
        "& fieldset": { border: "none" },
        "&:hover": {
            background: theme.palette.mode === "light"
                ? "rgba(0,0,0,0.025)"
                : "rgba(255,255,255,0.035)",
        },
        "&.Mui-focused": {
            background: theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.06)",
        },
    },
    "& .MuiInputBase-input": { color: theme.palette.text.primary },
    "& .MuiInputAdornment-root svg": {
        color: theme.palette.text.disabled,
        fontSize: 14,
    },
}));

/* ─── küçük atom butonlar ────────────────────────────────────────────────── */
function IconBtn({ children, tooltip, onClick, isDark }) {
    return (
        <Tooltip title={tooltip || ""} placement="bottom">
            <motion.div
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: R.border(isDark),
                    background: "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                    color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = R.surface(isDark);
                    e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
                }}
            >
                {children}
            </motion.div>
        </Tooltip>
    );
}

function ActionBtn({ children, onClick, variant = "ghost", isDark }) {
    const styles = {
        primary: {
            bg: isDark ? "#e2e8f0" : "#0f172a",
            color: isDark ? "#0f172a" : "#fff",
            border: "none",
            hoverBg: isDark ? "#cbd5e1" : "#1e293b",
            shadow: isDark ? "none" : "0 4px 14px rgba(15,23,42,0.18)",
        },
        ghost: {
            bg: "transparent",
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
            border: R.border(isDark),
            hoverBg: R.surface(isDark),
            shadow: "none",
        },
        accent: {
            bg: "transparent",
            color: "#4f8ef7",
            border: "1px solid rgba(79,142,247,0.28)",
            hoverBg: "rgba(79,142,247,0.07)",
            shadow: "none",
        },
    };
    const s = styles[variant] || styles.ghost;

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "0 14px",
                height: 38,
                borderRadius: 10,
                border: s.border || "none",
                background: s.bg,
                color: s.color,
                fontSize: "0.8rem",
                fontWeight: 800,
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                boxShadow: s.shadow,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = s.hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = s.bg; }}
        >
            {children}
        </motion.button>
    );
}

/* ─── VertDivider ────────────────────────────────────────────────────────── */
function VDiv({ isDark }) {
    return (
        <Box sx={{
            width: "1px",
            height: 20,
            flexShrink: 0,
            background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
        }} />
    );
}

/* ─── ANA BİLEŞEN ────────────────────────────────────────────────────────── */
export default function BilgiPanelleri({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handleFilter,
    uploadActions,
    hideDate = false,
    showVeriAktarimButton = true,
    showCompareButton = true,
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const navigate = useNavigate();

    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);
    const [compareOpen, setCompareOpen] = useState(false);

    useEffect(() => setDraftStart(startDate), [startDate]);
    useEffect(() => setDraftEnd(endDate), [endDate]);

    const handleApply = () => {
        setStartDate(draftStart);
        setEndDate(draftEnd);
        if (handleFilter) handleFilter(draftStart, draftEnd);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
            <Box
                component={motion.div}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                sx={{
                    width: "100%",
                    px: { xs: 2, md: "32px" },
                    height: 64,
                    background: isDark
                        ? "rgba(9,11,20,0.82)"
                        : "rgba(252,252,253,0.88)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: R.border(isDark),
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                {/* ── Sol: başlık ────────────────────────────────────────── */}
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flexShrink: 0 }}>
                    <LiveDot />
                    <Box>
                        <Typography sx={{
                            fontWeight: 900,
                            fontSize: "0.88rem",
                            letterSpacing: "-0.03em",
                            lineHeight: 1.2,
                            color: theme.palette.text.primary,
                        }}>
                            Canlı Operasyon Paneli
                        </Typography>
                        <Typography sx={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            color: theme.palette.text.disabled,
                            lineHeight: 1,
                        }}>
                            Otomatik senkronize
                        </Typography>
                    </Box>
                </Stack>

                {/* ── Sağ: kontroller ────────────────────────────────────── */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>

                    {/* Tarih aralığı */}
                    {!hideDate && (
                        <>
                            <Box sx={{
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "12px",
                                border: R.border(isDark),
                                background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                                overflow: "hidden",
                                height: 40,
                            }}>
                                {/* takvim ikonu */}
                                <Box sx={{
                                    px: 1.4,
                                    display: "flex",
                                    alignItems: "center",
                                    color: theme.palette.text.disabled,
                                    flexShrink: 0,
                                }}>
                                    <FaCalendarAlt size={12} />
                                </Box>

                                <PickerSlot>
                                    <DateTimePicker
                                        label={null}
                                        value={draftStart}
                                        onChange={setDraftStart}
                                        slotProps={{ textField: { size: "small" } }}
                                    />
                                </PickerSlot>

                                {/* ayraç */}
                                <Box sx={{
                                    width: "1px", height: 18, flexShrink: 0,
                                    background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
                                }} />

                                <PickerSlot>
                                    <DateTimePicker
                                        label={null}
                                        value={draftEnd}
                                        onChange={setDraftEnd}
                                        slotProps={{ textField: { size: "small" } }}
                                    />
                                </PickerSlot>
                            </Box>

                            <IconBtn tooltip="Gelişmiş Filtreler" isDark={isDark}>
                                <FaSlidersH size={14} />
                            </IconBtn>

                            <VDiv isDark={isDark} />
                        </>
                    )}

                    {/* Karşılaştırma */}
                    {showCompareButton && (
                        <ActionBtn variant="accent" isDark={isDark} onClick={() => setCompareOpen(true)}>
                            <FaBalanceScale size={12} />
                            Karşılaştır
                        </ActionBtn>
                    )}

                    {/* Veri Aktarım */}
                    {showVeriAktarimButton && (
                        <ActionBtn variant="ghost" isDark={isDark} onClick={() => navigate("/veri-aktarim")}>
                            <MdUploadFile size={15} />
                            Veri Aktarım
                        </ActionBtn>
                    )}

                    {/* Özel upload aksiyonları */}
                    {uploadActions && (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            {uploadActions}
                        </Box>
                    )}

                    {/* Uygula */}
                    {handleFilter && (
                        <>
                            <VDiv isDark={isDark} />
                            <ActionBtn variant="primary" isDark={isDark} onClick={handleApply}>
                                <FaSync size={10} />
                                Analizi Güncelle
                            </ActionBtn>
                        </>
                    )}
                </Stack>
            </Box>
        </LocalizationProvider>
    );
}