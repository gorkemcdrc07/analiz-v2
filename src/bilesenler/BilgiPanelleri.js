import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, styled, Button, Tooltip } from "@mui/material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { FaSync, FaCalendarAlt, FaSlidersH, FaBalanceScale } from "react-icons/fa";
import { MdUploadFile } from "react-icons/md";
import { useNavigate } from "react-router-dom";

// ✅ Panel (modal) bileşeni
import KarsilastirmaPanel from "../sayfalar/karsilastirma";

const GlassHeader = styled(Box)(() => ({
    width: "100%",
    padding: "20px 40px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
}));

const DatePickerWrapper = styled(Box)(() => ({
    display: "flex",
    alignItems: "center",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "16px",
    gap: "4px",
}));

const StyledPicker = styled(Box)(() => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        backgroundColor: "transparent",
        transition: "all 0.2s",
        fontSize: "0.85rem",
        width: "190px",
        border: "none",
        "& fieldset": { border: "none" },
        "&:hover": {
            backgroundColor: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        },
        "&.Mui-focused": {
            backgroundColor: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
    },
}));

const RefreshButton = styled(Button)(() => ({
    borderRadius: "14px",
    padding: "10px 24px",
    textTransform: "none",
    fontWeight: 800,
    background: "#0f172a",
    color: "#fff",
    fontSize: "0.85rem",
    gap: "10px",
    boxShadow: "0 10px 20px -5px rgba(15, 23, 42, 0.2)",
    "&:hover": {
        background: "#334155",
        transform: "translateY(-1px)",
        boxShadow: "0 12px 24px -5px rgba(15, 23, 42, 0.3)",
    },
    "&:active": { transform: "translateY(0)" },
}));

const UploadButton = styled(Button)(() => ({
    borderRadius: "14px",
    padding: "10px 16px",
    textTransform: "none",
    fontWeight: 900,
    background: "#2563eb",
    color: "#fff",
    fontSize: "0.85rem",
    boxShadow: "0 10px 20px -6px rgba(37, 99, 235, 0.35)",
    "&:hover": {
        background: "#1d4ed8",
        transform: "translateY(-1px)",
        boxShadow: "0 14px 24px -8px rgba(37, 99, 235, 0.45)",
    },
    "&:active": { transform: "translateY(0)" },
}));

const CompareButton = styled(Button)(() => ({
    borderRadius: "14px",
    padding: "10px 16px",
    textTransform: "none",
    fontWeight: 900,
    background: "#0ea5e9",
    color: "#fff",
    fontSize: "0.85rem",
    boxShadow: "0 10px 20px -6px rgba(14, 165, 233, 0.35)",
    "&:hover": {
        background: "#0284c7",
        transform: "translateY(-1px)",
        boxShadow: "0 14px 24px -8px rgba(14, 165, 233, 0.45)",
    },
    "&:active": { transform: "translateY(0)" },
}));

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
    const navigate = useNavigate();

    // ✅ Karşılaştırma modal state
    const [compareOpen, setCompareOpen] = useState(false);

    // ✅ Tarih seçimi otomatik veri çekmesin diye: draft state
    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);

    // Parent tarihleri değişirse (örn. reset) draft’ı senkronla
    useEffect(() => setDraftStart(startDate), [startDate]);
    useEffect(() => setDraftEnd(endDate), [endDate]);

    const handleCompareClick = () => setCompareOpen(true);

    // ✅ Sadece butona basınca uygula + (istersen) çek
    const handleApply = () => {
        setStartDate(draftStart);
        setEndDate(draftEnd);

        // handleFilter parametre almıyorsa handleFilter() bırak.
        // Parametre alıyorsa üstte ona göre kullan:
        if (handleFilter) handleFilter(draftStart, draftEnd);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
            <GlassHeader>
                {/* Sol */}
                <Stack spacing={0.5}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 850,
                            color: "#0f172a",
                            letterSpacing: "-1px",
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                bgcolor: "#10b981",
                                borderRadius: "50%",
                                boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.2)",
                            }}
                        />
                        Canlı Operasyon Paneli
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, ml: 3.5 }}>
                        Veriler otomatik olarak senkronize ediliyor
                    </Typography>
                </Stack>

                {/* Sağ */}
                <Stack direction="row" spacing={2} alignItems="center">
                    {!hideDate && (
                        <>
                            <DatePickerWrapper>
                                <Box sx={{ px: 2, color: "#94a3b8" }}>
                                    <FaCalendarAlt size={14} />
                                </Box>

                                <StyledPicker>
                                    <DateTimePicker
                                        label={null}
                                        value={draftStart}
                                        onChange={setDraftStart}
                                        slotProps={{ textField: { size: "small" } }}
                                    />
                                </StyledPicker>

                                <Box sx={{ width: 1, height: 20, bgcolor: "#e2e8f0" }} />

                                <StyledPicker>
                                    <DateTimePicker
                                        label={null}
                                        value={draftEnd}
                                        onChange={setDraftEnd}
                                        slotProps={{ textField: { size: "small" } }}
                                    />
                                </StyledPicker>
                            </DatePickerWrapper>

                            <Tooltip title="Gelişmiş Filtreler">
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: "12px",
                                        color: "#64748b",
                                        cursor: "pointer",
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        "&:hover": { bgcolor: "#fff", color: "#0f172a" },
                                    }}
                                >
                                    <FaSlidersH size={18} />
                                </Box>
                            </Tooltip>
                        </>
                    )}

                    {/* ✅ Karşılaştırma butonu -> modal açar */}
                    {showCompareButton && (
                        <CompareButton startIcon={<FaBalanceScale />} onClick={handleCompareClick}>
                            Karşılaştırma Yap
                        </CompareButton>
                    )}

                    {/* ✅ Veri Aktarım */}
                    {showVeriAktarimButton && (
                        <UploadButton startIcon={<MdUploadFile />} onClick={() => navigate("/veri-aktarim")}>
                            Veri Aktarım
                        </UploadButton>
                    )}

                    {uploadActions ? <Box sx={{ display: "flex", alignItems: "center" }}>{uploadActions}</Box> : null}

                    {/* ✅ Artık sadece butona basınca uygular/çeker */}
                    {handleFilter ? (
                        <RefreshButton onClick={handleApply} startIcon={<FaSync size={12} />}>
                            Analizi Güncelle
                        </RefreshButton>
                    ) : null}
                </Stack>
            </GlassHeader>

            {/* ✅ Modal panel */}
            <KarsilastirmaPanel
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                startDate={startDate}
                endDate={endDate}
            />
        </LocalizationProvider>
    );
}
