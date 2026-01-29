// src/sayfalar/karsilastirma/components/ResultsTable.jsx
import React from "react";
import {
    Box,
    Chip,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
    useTheme,
} from "@mui/material";

import { monthLabelTR } from "../utils/date";

export default function ResultsTable({
    seciliBolge,
    viewMode,
    raw,
    dataLength,
    forecast,
    history,
    forecastRows,
    forecastTotals,
    historyRows,
    isDark,
}) {
    const theme = useTheme();

    return (
        <>
            <Divider sx={{ my: 2.5, opacity: isDark ? 0.2 : 0.35 }} />

            <Paper
                elevation={0}
                sx={{
                    borderRadius: 28,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.92),
                    overflow: "visible",
                }}
            >
                <Box sx={{ position: "relative", mt: 2 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: "24px",
                            border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.05)}`,
                            bgcolor: isDark ? alpha("#0f172a", 0.4) : alpha("#fff", 0.8),
                            backdropFilter: "blur(12px)",
                            overflow: "hidden",
                            boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.4)" : "0 20px 40px rgba(15, 23, 42, 0.06)",
                        }}
                    >
                        {/* HEADER */}
                        <Box
                            sx={{
                                px: 3,
                                py: 2.5,
                                borderBottom: `1px solid ${isDark ? alpha("#fff", 0.05) : alpha("#0f172a", 0.05)}`,
                                background: isDark
                                    ? `linear-gradient(90deg, ${alpha("#1e293b", 0.3)}, transparent)`
                                    : `linear-gradient(90deg, ${alpha("#f8fafc", 0.7)}, transparent)`,
                            }}
                        >
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{ width: 6, height: 24, bgcolor: "primary.main", borderRadius: 4 }} />
                                    <Typography sx={{ fontWeight: 900, letterSpacing: "-0.02em", fontSize: "1.1rem" }}>
                                        {seciliBolge}
                                        <Box component="span" sx={{ opacity: 0.4, mx: 1.5, fontWeight: 300 }}>
                                            |
                                        </Box>
                                        <Box component="span" sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
                                            {viewMode === "forecast" ? "Forecast Analizi" : "Tarihsel Trend (13 Ay)"}
                                        </Box>
                                    </Typography>
                                </Stack>

                                <Chip
                                    label={!raw || dataLength === 0 ? "Veri Yok" : `${viewMode === "forecast" ? forecastRows.length : historyRows.length} Aktif Kayıt`}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: isDark ? alpha("#38bdf8", 0.1) : alpha("#0284c7", 0.05),
                                        color: isDark ? "#7dd3fc" : "#0369a1",
                                        borderRadius: "8px",
                                        border: `1px solid ${isDark ? alpha("#38bdf8", 0.2) : alpha("#0284c7", 0.1)}`,
                                    }}
                                />
                            </Stack>
                        </Box>

                        {/* BODY */}
                        {!raw || dataLength === 0 ? (
                            <Box sx={{ py: 12, textAlign: "center" }}>
                                <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: "text.secondary", opacity: 0.5 }}>
                                    Görüntülenecek veri bulunamadı.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer
                                sx={{
                                    maxHeight: 640,
                                    overflow: "auto",
                                    "&::-webkit-scrollbar": { width: 8, height: 8 },
                                    "&::-webkit-scrollbar-thumb": { bgcolor: alpha("#94a3b8", 0.2), borderRadius: 8 },
                                }}
                            >
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            {/* Sticky Header: Bölge / Proje */}
                                            {["Bölge", "Proje"].map((head, i) => (
                                                <TableCell
                                                    key={head}
                                                    sx={{
                                                        fontWeight: 800,
                                                        bgcolor: isDark ? "#0f172a" : "#f8fafc",
                                                        zIndex: 11,
                                                        left: i === 0 ? 0 : 100,
                                                        position: "sticky",
                                                        borderBottom: `2px solid ${alpha("#94a3b8", 0.1)}`,
                                                        fontSize: "0.85rem",
                                                        textTransform: "uppercase",
                                                        letterSpacing: 0.5,
                                                    }}
                                                >
                                                    {head}
                                                </TableCell>
                                            ))}

                                            {/* Dinamik Header */}
                                            {(viewMode === "forecast"
                                                ? ["Bu Hafta", "Haftaya", "Diğer", "Ay Sonu", "Toplam"]
                                                : [...(history?.months || []), "Toplam"]
                                            ).map((col, idx) => (
                                                <TableCell
                                                    key={idx}
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 800,
                                                        bgcolor: isDark ? "#0f172a" : "#f8fafc",
                                                        borderBottom: `2px solid ${alpha("#94a3b8", 0.1)}`,
                                                        fontSize: "0.85rem",
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {typeof col === "string" ? col : monthLabelTR(col)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {(viewMode === "forecast" ? forecastRows : historyRows).map((r, idx) => {
                                            const isHot = viewMode === "forecast" && (r.ayToplam > 0);

                                            return (
                                                <TableRow
                                                    key={idx}
                                                    hover
                                                    sx={{
                                                        transition: "all 0.2s",
                                                        "&:hover": { bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01) },
                                                    }}
                                                >
                                                    {/* Sticky: Bölge */}
                                                    <TableCell
                                                        sx={{
                                                            position: "sticky",
                                                            left: 0,
                                                            zIndex: 5,
                                                            bgcolor: isDark ? "#0b1220" : "#fff",
                                                            borderRight: `1px solid ${alpha("#94a3b8", 0.05)}`,
                                                            width: 100,
                                                            minWidth: 100,
                                                            maxWidth: 100,
                                                        }}
                                                    >
                                                        <Chip label={seciliBolge} size="small" sx={{ fontWeight: 900, fontSize: "0.7rem", height: 20 }} />
                                                    </TableCell>

                                                    {/* Sticky: Proje */}
                                                    <TableCell
                                                        sx={{
                                                            position: "sticky",
                                                            left: 100,
                                                            zIndex: 5,
                                                            bgcolor: isDark ? "#0b1220" : "#fff",
                                                            borderRight: `1px solid ${alpha("#94a3b8", 0.05)}`,
                                                            whiteSpace: "nowrap",
                                                            minWidth: 240,
                                                        }}
                                                    >
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{r.proje}</Typography>
                                                    </TableCell>

                                                    {/* Cells */}
                                                    {viewMode === "forecast" ? (
                                                        <>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{r.buHafta}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{r.gelecekHafta}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{r.digerHafta}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{r.aySonunaKadar}</TableCell>
                                                            <TableCell align="right">
                                                                <Box
                                                                    sx={{
                                                                        display: "inline-block",
                                                                        px: 1.2,
                                                                        py: 0.4,
                                                                        borderRadius: "6px",
                                                                        bgcolor: isHot ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                                                                        color: isHot ? "primary.main" : "text.primary",
                                                                        fontWeight: 900,
                                                                    }}
                                                                >
                                                                    {r.ayToplam}
                                                                </Box>
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {r.counts.map((c, i) => (
                                                                <TableCell key={i} align="right" sx={{ fontWeight: 600, opacity: c === 0 ? 0.3 : 1 }}>
                                                                    {c}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell align="right" sx={{ fontWeight: 900, color: "primary.main" }}>
                                                                {r.total}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            );
                                        })}

                                        {/* TOPLAM SATIRI */}
                                        <TableRow sx={{ bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02) }}>
                                            <TableCell
                                                colSpan={2}
                                                sx={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 6,
                                                    bgcolor: isDark ? "#161d2b" : "#f1f5f9",
                                                    fontWeight: 900,
                                                    color: "primary.main",
                                                    fontSize: "0.9rem",
                                                }}
                                            >
                                                GENEL TOPLAM
                                            </TableCell>

                                            {viewMode === "forecast" ? (
                                                <>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>{forecastTotals.buHafta}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>{forecastTotals.gelecekHafta}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>{forecastTotals.digerHafta}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>{forecastTotals.aySonunaKadar}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 1000, fontSize: "1rem", color: "primary.main" }}>
                                                        {forecastTotals.ayToplam}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <TableCell align="right" colSpan={(history?.months?.length || 0) + 1} sx={{ fontWeight: 900 }}>
                                                    {/* İstersen buraya tarihsel genel toplamları da ekleriz */}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </Box>
            </Paper>
        </>
    );
}
