// src/sayfalar/karsilastirma/components/KpiSection.jsx
import React from "react";
import { Box, Chip, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";

import { fmtRange } from "../utils/date";

/* ------------------------ KPI kart ------------------------ */
function KpiCard({ label, value, hint, color = "#6366f1" }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isPrimitive = typeof value === "string" || typeof value === "number";

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.2,
                borderRadius: 24,
                border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
                bgcolor: isDark ? alpha("#0b1220", 0.65) : "#fff",
                position: "relative",
                overflow: "hidden",
                minWidth: 190,
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: -40,
                    background: `radial-gradient(circle at 30% 20%, ${alpha(color, 0.18)} 0%, transparent 55%)`,
                    pointerEvents: "none",
                }}
            />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, letterSpacing: 0.9, color: "text.secondary" }}>
                {label}
            </Typography>

            {isPrimitive ? (
                <Typography sx={{ mt: 0.5, fontSize: "1.6rem", fontWeight: 1000, color: "text.primary", letterSpacing: -0.6 }}>
                    {value}
                </Typography>
            ) : (
                <Box sx={{ mt: 0.8 }}>{value}</Box>
            )}

            {hint ? (
                <Typography sx={{ mt: 0.6, fontSize: "0.75rem", fontWeight: 800, color: alpha(theme.palette.text.secondary, 0.9) }}>
                    {hint}
                </Typography>
            ) : null}
        </Paper>
    );
}

function TrendChip({ value }) {
    const v = Number(value || 0);
    const up = v > 0;
    const down = v < 0;
    const label = down ? `${v.toFixed(1)}% �?"` : up ? `+${v.toFixed(1)}% �?'` : "0%";
    const color = down ? "#ef4444" : up ? "#10b981" : "#94a3b8";

    return (
        <Chip
            size="small"
            label={label}
            sx={{
                height: 22,
                borderRadius: 999,
                fontWeight: 1000,
                bgcolor: alpha(color, 0.15),
                border: `1px solid ${alpha(color, 0.35)}`,
            }}
        />
    );
}

/* ------------------------ Section ------------------------ */
export default function KpiSection({ viewMode, trendKpis, forecastTotals, meta }) {
    return (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2.5, flexWrap: "wrap" }}>
            <KpiCard
                label="SON 4 HAFTA TREND"
                value={<TrendChip value={trendKpis?.w4trend} />}
                hint={`Son 28 gün: ${trendKpis?.w4 ?? 0} | �-nceki 28 gün: ${trendKpis?.prevW4 ?? 0}`}
                color="#22c55e"
            />

            <KpiCard
                label="AYDAN AYA (MoM)"
                value={<TrendChip value={trendKpis?.mom} />}
                hint={`Bu ay (to-date): ${trendKpis?.thisMonth ?? 0} | Geçen ay: ${trendKpis?.lastMonth ?? 0}`}
                color="#0ea5e9"
            />

            <KpiCard
                label="YILDAN YILA (YoY)"
                value={<TrendChip value={trendKpis?.yoy} />}
                hint={`Bu ay (to-date): ${trendKpis?.thisMonth ?? 0} | Geçen yıl aynı ay: ${trendKpis?.lastYearSame ?? 0}`}
                color="#8b5cf6"
            />

            {viewMode === "forecast" ? (
                <>
                    <KpiCard
                        label="BU HAFTA"
                        value={forecastTotals?.buHafta ?? 0}
                        hint={meta ? fmtRange(meta.week0Start, meta.week0End) : ""}
                        color="#0ea5e9"
                    />
                    <KpiCard
                        label="GELECEK HAFTA"
                        value={forecastTotals?.gelecekHafta ?? 0}
                        hint={meta ? fmtRange(meta.week1Start, meta.week1End) : ""}
                        color="#10b981"
                    />
                    <KpiCard
                        label="AY SONUNA KADAR"
                        value={forecastTotals?.aySonunaKadar ?? 0}
                        hint={meta ? fmtRange(meta.monthStart, meta.monthEnd) : ""}
                        color="#f59e0b"
                    />
                </>
            ) : null}
        </Stack>
    );
}
