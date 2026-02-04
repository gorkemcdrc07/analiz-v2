// src/sayfalar/karsilastirma/components/HeaderBar.jsx
import React from "react";
import {
    Box,
    Stack,
    Typography,
    alpha,
    Paper,
    Select,
    MenuItem,
    Tooltip,
    IconButton,
    Button,
    LinearProgress,
} from "@mui/material";
import { RiRefreshLine, RiBarChart2Line, RiInformationLine } from "react-icons/ri";
import { motion } from "framer-motion";

export default function HeaderBar({
    loading,
    raw,
    dataLength,
    error,
    viewMode,
    setViewMode,
    onRefresh,
    isDark,
}) {
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2.2,
                    borderRadius: 28,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.62) : alpha("#ffffff", 0.85),
                    backdropFilter: "blur(16px)",
                    boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.35)" : "0 24px 80px rgba(2,6,23,0.08)",
                }}
            >
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={2}
                    alignItems={{ lg: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 18,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: isDark ? alpha("#fff", 0.08) : "#0f172a",
                                boxShadow: isDark ? "none" : "0 18px 45px rgba(2,6,23,0.22)",
                            }}
                        >
                            <RiBarChart2Line size={22} color={isDark ? "#e2e8f0" : "#fff"} />
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 1000, fontSize: "1.25rem", letterSpacing: "-0.7px" }}>
                                KARŞILAŞTIRMA �?� FORECAST + ANALİZ
                            </Typography>
                            <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
                                Haftalık kademeli yükleme �?� Bölge bazlı �?� Forecast + Son 13 ay tarihsel tablo
                            </Typography>
                        </Box>

                        <Tooltip title="Forecast: Son 28 gün seviye + son 12 hafta da�Yılımı ile hesaplanır. Tarihsel: son 13 ay gerçekle�Yen sipari�Y sayıları.">
                            <IconButton
                                size="small"
                                sx={{
                                    ml: "auto",
                                    bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#0f172a", 0.05),
                                    border: isDark ? `1px solid ${alpha("#fff", 0.1)}` : "none",
                                }}
                            >
                                <RiInformationLine />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                        <Select
                            size="small"
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            sx={{
                                minWidth: 220,
                                borderRadius: 18,
                                bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                "& fieldset": { border: "none" },
                                fontWeight: 900,
                                fontSize: "0.85rem",
                            }}
                        >
                            <MenuItem value="forecast">gY"� Forecast görünümü</MenuItem>
                            <MenuItem value="tarihsel">gY-"️ Tarihsel analiz (13 ay)</MenuItem>
                            <MenuItem value="haftalik">gY". Haftalık (3 Ay)</MenuItem>
                        </Select>

                        <Button
                            variant="contained"
                            disableElevation
                            onClick={onRefresh}
                            disabled={loading}
                            startIcon={loading ? null : <RiRefreshLine size={18} />}
                            sx={{
                                borderRadius: 18,
                                px: 3,
                                py: 1.2,
                                fontWeight: 900,
                                textTransform: "none",
                                background: `linear-gradient(45deg, #3b82f6, #1d4ed8)`,
                                boxShadow: `0 10px 24px ${alpha("#3b82f6", 0.28)}`,
                                "&:hover": { boxShadow: "none" },
                            }}
                        >
                            {loading ? "Analiz..." : "Yenile"}
                        </Button>
                    </Stack>
                </Stack>

                {/* İnce progress çizgisi (veri geldi / yükleme bitti gibi ufak feedback) */}
                {raw && !loading ? (
                    <Box sx={{ mt: 1.6 }}>
                        <LinearProgress sx={{ opacity: 0.15 }} />
                    </Box>
                ) : null}

                {/* Hata */}
                {error ? (
                    <Paper
                        elevation={0}
                        sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 18,
                            border: `1px solid ${alpha("#ef4444", 0.35)}`,
                            bgcolor: alpha("#ef4444", isDark ? 0.14 : 0.08),
                        }}
                    >
                        <Typography sx={{ fontWeight: 900, color: isDark ? "#fecaca" : "#b91c1c" }}>
                            {error}
                        </Typography>
                    </Paper>
                ) : null}
            </Paper>
        </motion.div>
    );
}
