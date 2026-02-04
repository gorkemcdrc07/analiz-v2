// src/sayfalar/karsilastirma/index.js
import React, { useEffect, useMemo, useState } from "react";
import { Box, alpha, useTheme } from "@mui/material";

import LoadingOverlay from "./components/LoadingOverlay";
import HeaderBar from "./components/HeaderBar";
import ControlsBar from "./components/ControlsBar";
import KpiSection from "./components/KpiSection";
import ResultsTable from "./components/ResultsTable";

import useKarsilastirmaFetch from "./hooks/useKarsilastirmaFetch";
import useKarsilastirmaData from "./hooks/useKarsilastirmaData";

export default function Karsilastirma() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [seciliBolge, setSeciliBolge] = useState("GEBZE");
    const [arama, setArama] = useState("");
    const [sirala, setSirala] = useState("buHafta");
    const [viewMode, setViewMode] = useState("forecast"); // forecast | tarihsel
    const [userId] = useState(1);

    // �o. viewMode'a göre veri kapsamı
    // forecast: hızlı (son ~3 ay)
    // tarihsel: 13 ay için ~56 hafta + buffer
    const weeksBack = useMemo(() => {
        return viewMode === "tarihsel" ? 60 : 12;
    }, [viewMode]);

    const { raw, loading, error, progress, refetch } = useKarsilastirmaFetch({
        userId,
        weeksBack,
    });

    const {
        data,
        forecast,
        history,
        forecastRows,
        forecastTotals,
        historyRows,
        trendKpis,
        meta,
    } = useKarsilastirmaData({
        raw,
        seciliBolge,
        arama,
        sirala,
    });

    // �o. İlk açılı�Y + viewMode de�Yi�Yince otomatik yenile
    useEffect(() => {
        refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, weeksBack, userId]);

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100vh",
                p: { xs: 2, md: 4 },
                background: isDark
                    ? `radial-gradient(circle at 50% 0%, ${alpha(
                        theme.palette.primary.main,
                        0.12
                    )} 0%, transparent 52%)`
                    : `radial-gradient(circle at 50% 0%, ${alpha(
                        theme.palette.primary.main,
                        0.06
                    )} 0%, transparent 52%)`,
            }}
        >
            {/* FULLSCREEN ANALİZ OVERLAY */}
            <LoadingOverlay loading={loading} progress={progress} isDark={isDark} />

            {/* �ost Ba�Ylık + ViewMode + Yenile + Hata */}
            <HeaderBar
                loading={loading}
                raw={raw}
                dataLength={data?.length || 0}
                error={error}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onRefresh={refetch}
                isDark={isDark}
            />

            {/* Kontroller: Bölge + Arama + Sıralama */}
            <ControlsBar
                seciliBolge={seciliBolge}
                setSeciliBolge={setSeciliBolge}
                arama={arama}
                setArama={setArama}
                viewMode={viewMode}
                sirala={sirala}
                setSirala={setSirala}
                isDark={isDark}
            />

            {/* KPI */}
            <KpiSection
                viewMode={viewMode}
                trendKpis={trendKpis}
                forecastTotals={forecastTotals}
                meta={meta}
                isDark={isDark}
            />

            {/* Tablo */}
            <ResultsTable
                seciliBolge={seciliBolge}
                viewMode={viewMode}
                raw={raw}
                dataLength={data?.length || 0}
                forecast={forecast}
                history={history}
                forecastRows={forecastRows}
                forecastTotals={forecastTotals}
                historyRows={historyRows}
                isDark={isDark}
            />
        </Box>
    );
}
