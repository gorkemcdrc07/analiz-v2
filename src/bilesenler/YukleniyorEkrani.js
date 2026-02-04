import React from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Backdrop,
    styled,
    keyframes,
    alpha,
} from "@mui/material";

/* --- ANIMASYONLAR --- */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
`;

/* --- STYLED COMPONENTS (theme-aware) --- */
const GlassContainer = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";

    return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: theme.spacing(3),
        padding: theme.spacing(6),
        borderRadius: "40px",

        // Cam efekt
        backgroundColor: isDark
            ? alpha("#0b1220", 0.72)
            : "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",

        border: isDark
            ? `1px solid ${alpha("#ffffff", 0.14)}`
            : "1px solid rgba(255, 255, 255, 0.4)",

        boxShadow: isDark
            ? "0 30px 70px rgba(0,0,0,0.55)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.08)",

        animation: `${float} 3s ease-in-out infinite`,
    };
});

const SpinnerWrapper = styled(Box)(({ theme }) => {
    const isDark = theme.palette.mode === "dark";
    const ring = theme.palette.primary.main;

    return {
        position: "relative",
        display: "inline-flex",
        "&::after": {
            content: '""',
            position: "absolute",
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: "50%",
            border: `2px dashed ${alpha(ring, isDark ? 0.22 : 0.12)}`,
            animation: "spin 10s linear infinite",
        },
        "@keyframes spin": {
            "100%": { transform: "rotate(360deg)" },
        },
    };
});

export default function YukleniyorEkrani() {
    return (
        <Backdrop
            open={true}
            sx={(theme) => {
                const isDark = theme.palette.mode === "dark";
                return {
                    zIndex: theme.zIndex.drawer + 999,
                    background: isDark
                        ? [
                            `radial-gradient(circle at center, ${alpha("#0b1220", 0.78)} 0%, ${alpha("#020617", 0.65)} 100%)`,
                        ].join(",")
                        : "radial-gradient(circle at center, rgba(248, 250, 252, 0.8) 0%, rgba(226, 232, 240, 0.6) 100%)",
                    backdropFilter: "blur(10px)",
                };
            }}
        >
            <GlassContainer>
                <SpinnerWrapper>
                    {/* Arka plandaki yumu�Yak halka */}
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={70}
                        thickness={4.5}
                        sx={(theme) => ({
                            color: alpha(
                                theme.palette.primary.main,
                                theme.palette.mode === "dark" ? 0.18 : 0.08
                            ),
                        })}
                    />

                    {/* Ana hareketli halka */}
                    <CircularProgress
                        variant="indeterminate"
                        disableShrink
                        size={70}
                        thickness={4.5}
                        sx={(theme) => ({
                            color: theme.palette.primary.main,
                            animationDuration: "800ms",
                            position: "absolute",
                            left: 0,
                            [`& .MuiCircularProgress-circle`]: {
                                strokeLinecap: "round",
                                strokeDasharray: "120px, 200px !important",
                            },
                        })}
                    />
                </SpinnerWrapper>

                <Box sx={{ textAlign: "center" }}>
                    <Typography
                        variant="h6"
                        sx={(theme) => ({
                            fontWeight: 900,
                            color: theme.palette.text.primary,
                            letterSpacing: "-1px",
                            mb: 1,
                        })}
                    >
                        Veriler Senkronize Ediliyor
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={(theme) => ({
                                width: 8,
                                height: 8,
                                bgcolor: theme.palette.primary.main,
                                borderRadius: "50%",
                                boxShadow:
                                    theme.palette.mode === "dark"
                                        ? `0 0 0 6px ${alpha(theme.palette.primary.main, 0.10)}`
                                        : "none",
                                animation: `${pulse} 1.5s infinite 0s`,
                            })}
                        />

                        <Typography
                            variant="body2"
                            sx={(theme) => ({
                                color: theme.palette.text.secondary,
                                fontWeight: 600,
                                letterSpacing: "0.2px",
                            })}
                        >
                            Lütfen bekleyiniz...
                        </Typography>

                        <Box
                            sx={(theme) => ({
                                width: 8,
                                height: 8,
                                bgcolor: theme.palette.primary.main,
                                borderRadius: "50%",
                                boxShadow:
                                    theme.palette.mode === "dark"
                                        ? `0 0 0 6px ${alpha(theme.palette.primary.main, 0.10)}`
                                        : "none",
                                animation: `${pulse} 1.5s infinite 0.5s`,
                            })}
                        />
                    </Box>
                </Box>
            </GlassContainer>
        </Backdrop>
    );
}
