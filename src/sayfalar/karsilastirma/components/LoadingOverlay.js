// src/sayfalar/karsilastirma/components/LoadingOverlay.jsx
import React from "react";
import { Box, Paper, Stack, Typography, LinearProgress, CircularProgress, alpha } from "@mui/material";

export default function LoadingOverlay({ loading, progress, isDark }) {
    if (!loading) return null;

    const done = progress?.done ?? 0;
    const total = progress?.total ?? 0;
    const failed = progress?.failed ?? 0;

    const pct = total > 0 ? (done / total) * 100 : 0;

    return (
        <Box
            sx={{
                position: "fixed",
                inset: 0,
                zIndex: 2500,
                display: "grid",
                placeItems: "center",
                bgcolor: isDark ? alpha("#000", 0.55) : alpha("#000", 0.25),
                backdropFilter: "blur(6px)",
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    px: 3,
                    py: 2.5,
                    borderRadius: 24,
                    border: `1px solid ${alpha("#fff", isDark ? 0.12 : 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.8) : alpha("#ffffff", 0.92),
                    minWidth: 340,
                    textAlign: "center",
                }}
            >
                <Stack spacing={1.1} alignItems="center">
                    <CircularProgress />
                    <Typography sx={{ fontWeight: 1000, fontSize: "1.05rem" }}>
                        Analiz yapılıyor, bekleyiniz…
                    </Typography>

                    <Typography sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.9rem" }}>
                        Haftalık yükleniyor: {done}/{total} {failed ? `• ${failed} hata` : ""}
                    </Typography>

                    {total > 0 ? (
                        <Box sx={{ width: "100%", mt: 0.5 }}>
                            <LinearProgress variant="determinate" value={pct} />
                        </Box>
                    ) : null}
                </Stack>
            </Paper>
        </Box>
    );
}
