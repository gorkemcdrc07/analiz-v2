import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, styled, Button, Tooltip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { FaSync, FaCalendarAlt, FaSlidersH, FaBalanceScale } from "react-icons/fa";
import { MdUploadFile } from "react-icons/md";
import { useNavigate } from "react-router-dom";

// �o. Panel (modal) bile�Yeni
import KarsilastirmaPanel from "../sayfalar/karsilastirma";

/**
 * NOTE:
 * styled() içinde theme'yi kullanabilmek için callback ( { theme } ) �Yeklinde yazıyoruz.
 */

const GlassHeader = styled(Box)(({ theme }) => ({
    width: "100%",
    padding: "20px 40px",
    background:
        theme.palette.mode === "light"
            ? "rgba(255, 255, 255, 0.6)"
            : "rgba(2, 6, 23, 0.55)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom:
        theme.palette.mode === "light"
            ? "1px solid rgba(0, 0, 0, 0.06)"
            : `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
    position: "sticky",
    top: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
}));

const DatePickerWrapper = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    background:
        theme.palette.mode === "light"
            ? "#f1f5f9"
            : alpha(theme.palette.common.white, 0.06),
    padding: "4px",
    borderRadius: "16px",
    gap: "4px",
    border:
        theme.palette.mode === "light"
            ? "1px solid #e2e8f0"
            : `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
}));

const StyledPicker = styled(Box)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        backgroundColor: "transparent",
        transition: "all 0.2s",
        fontSize: "0.85rem",
        width: "190px",
        border: "none",
        color: theme.palette.text.primary,

        "& fieldset": { border: "none" },

        "&:hover": {
            backgroundColor:
                theme.palette.mode === "light"
                    ? "#fff"
                    : alpha(theme.palette.common.white, 0.06),
            boxShadow:
                theme.palette.mode === "light"
                    ? "0 4px 12px rgba(0,0,0,0.04)"
                    : "0 4px 14px rgba(0,0,0,0.35)",
        },

        "&.Mui-focused": {
            backgroundColor:
                theme.palette.mode === "light"
                    ? "#fff"
                    : alpha(theme.palette.common.white, 0.08),
            boxShadow:
                theme.palette.mode === "light"
                    ? "0 4px 12px rgba(0,0,0,0.08)"
                    : "0 6px 18px rgba(0,0,0,0.45)",
        },
    },

    // Input / label / icon renkleri
    "& .MuiInputBase-input": {
        color: theme.palette.text.primary,
    },
    "& .MuiInputAdornment-root, & .MuiSvgIcon-root": {
        color: theme.palette.text.secondary,
    },
}));

const RefreshButton = styled(Button)(({ theme }) => ({
    borderRadius: "14px",
    padding: "10px 24px",
    textTransform: "none",
    fontWeight: 800,
    background: theme.palette.mode === "light" ? "#0f172a" : "#e2e8f0",
    color: theme.palette.mode === "light" ? "#fff" : "#0f172a",
    fontSize: "0.85rem",
    gap: "10px",
    boxShadow:
        theme.palette.mode === "light"
            ? "0 10px 20px -5px rgba(15, 23, 42, 0.2)"
            : "0 10px 20px -5px rgba(0,0,0,0.55)",
    "&:hover": {
        background: theme.palette.mode === "light" ? "#334155" : "#cbd5e1",
        transform: "translateY(-1px)",
        boxShadow:
            theme.palette.mode === "light"
                ? "0 12px 24px -5px rgba(15, 23, 42, 0.3)"
                : "0 14px 26px -6px rgba(0,0,0,0.6)",
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
    const theme = useTheme();
    const navigate = useNavigate();

    // �o. Kar�Yıla�Ytırma modal state
    const [compareOpen, setCompareOpen] = useState(false);

    // �o. Tarih seçimi otomatik veri çekmesin diye: draft state
    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);

    useEffect(() => setDraftStart(startDate), [startDate]);
    useEffect(() => setDraftEnd(endDate), [endDate]);

    const handleCompareClick = () => setCompareOpen(true);

    const handleApply = () => {
        setStartDate(draftStart);
        setEndDate(draftEnd);

        // handleFilter parametre almıyorsa handleFilter() bırak.
        // Parametre alıyorsa: handleFilter(draftStart, draftEnd)
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
                            color: theme.palette.text.primary,
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

                    <Typography
                        variant="caption"
                        sx={{
                            color: theme.palette.text.secondary,
                            fontWeight: 600,
                            ml: 3.5,
                        }}
                    >
                        Veriler otomatik olarak senkronize ediliyor
                    </Typography>
                </Stack>

                {/* Sa�Y */}
                <Stack direction="row" spacing={2} alignItems="center">
                    {!hideDate && (
                        <>
                            <DatePickerWrapper>
                                <Box sx={{ px: 2, color: theme.palette.text.secondary }}>
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

                                <Box
                                    sx={{
                                        width: 1,
                                        height: 20,
                                        bgcolor:
                                            theme.palette.mode === "light"
                                                ? "#e2e8f0"
                                                : alpha(theme.palette.common.white, 0.14),
                                    }}
                                />

                                <StyledPicker>
                                    <DateTimePicker
                                        label={null}
                                        value={draftEnd}
                                        onChange={setDraftEnd}
                                        slotProps={{ textField: { size: "small" } }}
                                    />
                                </StyledPicker>
                            </DatePickerWrapper>

                            <Tooltip title="Geli�Ymi�Y Filtreler">
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: "12px",
                                        color: theme.palette.text.secondary,
                                        cursor: "pointer",
                                        border:
                                            theme.palette.mode === "light"
                                                ? "1px solid #e2e8f0"
                                                : `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                                        display: "flex",
                                        background:
                                            theme.palette.mode === "light"
                                                ? "transparent"
                                                : alpha(theme.palette.common.white, 0.03),
                                        "&:hover": {
                                            bgcolor:
                                                theme.palette.mode === "light"
                                                    ? "#fff"
                                                    : alpha(theme.palette.common.white, 0.06),
                                            color: theme.palette.text.primary,
                                        },
                                    }}
                                >
                                    <FaSlidersH size={18} />
                                </Box>
                            </Tooltip>
                        </>
                    )}

                    {/* �o. Kar�Yıla�Ytırma butonu -> modal açar */}
                    {showCompareButton && (
                        <CompareButton startIcon={<FaBalanceScale />} onClick={handleCompareClick}>
                            Kar�Yıla�Ytırma Yap
                        </CompareButton>
                    )}

                    {/* �o. Veri Aktarım */}
                    {showVeriAktarimButton && (
                        <UploadButton startIcon={<MdUploadFile />} onClick={() => navigate("/veri-aktarim")}>
                            Veri Aktarım
                        </UploadButton>
                    )}

                    {uploadActions ? <Box sx={{ display: "flex", alignItems: "center" }}>{uploadActions}</Box> : null}

                    {/* �o. Artık sadece butona basınca uygular/çeker */}
                    {handleFilter ? (
                        <RefreshButton onClick={handleApply} startIcon={<FaSync size={12} />}>
                            Analizi Güncelle
                        </RefreshButton>
                    ) : null}
                </Stack>
            </GlassHeader>

            {/* �o. Modal panel */}
            <KarsilastirmaPanel
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                startDate={startDate}
                endDate={endDate}
            />
        </LocalizationProvider>
    );
}
