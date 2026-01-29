import React, { memo } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";

/**
 * MiniIstatistik
 * - deger: string | number | ReactNode (örn JSX)
 * - altMetin: optional küçük açýklama (string | ReactNode)
 * - renk: vurgu rengi
 */
const MiniIstatistik = ({ etiket, deger, altMetin = null, renk = "#6366f1" }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    return (
        <Box
            component={motion.div}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            sx={{
                position: "relative",
                minWidth: { xs: 92, md: 120 },
                px: 2,
                py: 2.2,
                borderRadius: "24px",
                overflow: "hidden",
                cursor: "pointer",
                background: `linear-gradient(145deg, ${alpha(renk, 0.08)} 0%, ${alpha(renk, 0.02)} 100%)`,
                backdropFilter: "blur(10px)",
                border: "1px solid",
                borderColor: alpha(renk, 0.15),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,

                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: `radial-gradient(circle, ${alpha(renk, 0.1)} 0%, transparent 50%)`,
                    opacity: 0,
                    transition: "opacity 0.4s ease",
                },
                "&:hover::before": { opacity: 1 },
            }}
        >
            {/* Üst vurgu çizgisi */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    width: "40%",
                    height: "3px",
                    background: `linear-gradient(90deg, transparent, ${renk}, transparent)`,
                    boxShadow: `0 0 15px ${renk}`,
                    borderRadius: "0 0 100px 100px",
                }}
            />

            <Typography
                sx={{
                    fontSize: "0.6rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: alpha(theme.palette.text.primary, 0.5),
                    zIndex: 1,
                    textAlign: "center",
                    lineHeight: 1.2,
                }}
            >
                {etiket}
            </Typography>

            {/* deger artýk JSX de olabilir */}
            {typeof deger === "string" || typeof deger === "number" ? (
                <Typography
                    sx={{
                        fontSize: "1.5rem",
                        fontWeight: 1000,
                        color: isDark ? "#fff" : "#000",
                        lineHeight: 1,
                        letterSpacing: "-1px",
                        zIndex: 1,
                        textShadow: isDark ? `0 0 20px ${alpha(renk, 0.3)}` : "none",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}
                >
                    {deger}
                </Typography>
            ) : (
                <Box
                    sx={{
                        zIndex: 1,
                        display: "grid",
                        placeItems: "center",
                        lineHeight: 1,
                    }}
                >
                    {deger}
                </Box>
            )}

            {/* opsiyonel alt metin */}
            {altMetin != null && altMetin !== "" && (
                <Typography
                    sx={{
                        mt: 0.2,
                        fontSize: "0.72rem",
                        fontWeight: 900,
                        color: alpha(theme.palette.text.primary, isDark ? 0.65 : 0.55),
                        zIndex: 1,
                        textAlign: "center",
                        lineHeight: 1.1,
                    }}
                >
                    {altMetin}
                </Typography>
            )}

            {/* Alt dekoratif nokta */}
            <Box
                sx={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    backgroundColor: renk,
                    mt: altMetin ? 0.6 : 1,
                    boxShadow: `0 0 10px ${renk}`,
                }}
            />
        </Box>
    );
};

export default memo(MiniIstatistik);
