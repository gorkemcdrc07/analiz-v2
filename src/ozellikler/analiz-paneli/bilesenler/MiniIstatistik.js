import React, { memo } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";

/**
 * MiniIstatistik (Sade)
 * - etiket: string | ReactNode
 * - deger: string | number | ReactNode
 * - altMetin: optional açıklama
 * - renk: vurgu rengi (minimal kullanılır)
 */
const MiniIstatistik = ({ etiket, deger, altMetin = null, renk = "#6366f1" }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    /* ----------- SADE RENK PALETİ ----------- */
    const cardBg = isDark ? alpha("#0b1220", 0.42) : alpha("#ffffff", 0.86);
    const baseBorder = isDark ? alpha("#ffffff", 0.10) : alpha("#0f172a", 0.10);

    const labelColor = isDark ? alpha("#ffffff", 0.72) : alpha("#0f172a", 0.68);
    const valueColor = theme.palette.text.primary;
    const subColor = isDark ? alpha("#ffffff", 0.78) : alpha("#0f172a", 0.72);

    return (
        <Box
            component={motion.div}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.995 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            sx={{
                position: "relative",
                minWidth: { xs: 128, md: 150 },
                px: { xs: 2, md: 2.2 },
                py: { xs: 1.6, md: 1.8 },
                borderRadius: "16px",
                overflow: "hidden",
                userSelect: "none",
                cursor: "default",

                bgcolor: cardBg,
                backdropFilter: "blur(10px)",
                border: "1px solid",
                borderColor: baseBorder,

                boxShadow: isDark
                    ? `0 10px 26px ${alpha("#000", 0.28)}`
                    : `0 10px 26px ${alpha("#0f172a", 0.10)}`,

                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 0.55,

                // ✅ sadece hover'da hafif vurgu
                "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "16px",
                    pointerEvents: "none",
                    border: "1px solid",
                    borderColor: alpha(renk, isDark ? 0.18 : 0.16),
                    opacity: 0,
                    transition: "opacity 160ms ease",
                },
                "&:hover::after": { opacity: 1 },
            }}
        >
            {/* ETİKET */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, zIndex: 1 }}>
                <Box
                    sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: alpha(renk, 0.9),
                        flexShrink: 0,
                    }}
                />
                <Typography
                    sx={{
                        fontSize: "0.78rem",
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: labelColor,
                        lineHeight: 1.15,
                    }}
                >
                    {etiket}
                </Typography>
            </Box>

            {/* DEĞER */}
            {typeof deger === "string" || typeof deger === "number" ? (
                <Typography
                    sx={{
                        zIndex: 1,
                        fontSize: { xs: "1.55rem", md: "1.75rem" },
                        fontWeight: 1100,
                        letterSpacing: "-0.03em",
                        lineHeight: 1.05,
                        color: valueColor,
                        whiteSpace: "nowrap",
                    }}
                >
                    {deger}
                </Typography>
            ) : (
                <Box sx={{ zIndex: 1 }}>{deger}</Box>
            )}

            {/* AÇIKLAMA */}
            {altMetin != null && altMetin !== "" && (
                <Typography
                    sx={{
                        zIndex: 1,
                        fontSize: "0.88rem",
                        fontWeight: 800,
                        color: subColor,
                        lineHeight: 1.35,
                        maxWidth: 220,

                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                    }}
                >
                    {altMetin}
                </Typography>
            )}
        </Box>
    );
};

export default memo(MiniIstatistik);
