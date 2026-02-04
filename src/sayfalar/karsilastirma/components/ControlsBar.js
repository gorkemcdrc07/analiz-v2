// src/sayfalar/karsilastirma/components/ControlsBar.jsx
import React from "react";
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    Paper,
    Select,
    MenuItem,
    Stack,
    TextField,
    alpha,
    useTheme,
} from "@mui/material";
import { RiSearch2Line } from "react-icons/ri";

import { REGIONS } from "../../../ozellikler/yardimcilar/veriKurallari";

export default function ControlsBar({
    seciliBolge,
    setSeciliBolge,
    arama,
    setArama,
    viewMode,
    sirala,
    setSirala,
    isDark,
}) {
    const theme = useTheme();

    return (
        <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            sx={{ mt: 2.5 }}
            alignItems={{ lg: "center" }}
            justifyContent="space-between"
        >
            {/* Bölge seçimi */}
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    borderRadius: 22,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.9),
                    backdropFilter: "blur(14px)",
                    overflowX: "auto",
                }}
            >
                <Stack direction="row" spacing={1}>
                    {Object.keys(REGIONS).map((r) => {
                        const selected = seciliBolge === r;
                        const count = REGIONS[r]?.length ?? 0;

                        return (
                            <Button
                                key={r}
                                onClick={() => setSeciliBolge(r)}
                                variant={selected ? "contained" : "text"}
                                disableElevation
                                sx={{
                                    borderRadius: 16,
                                    px: 2,
                                    py: 1,
                                    fontWeight: 900,
                                    textTransform: "none",
                                    whiteSpace: "nowrap",
                                    ...(selected
                                        ? { bgcolor: isDark ? "#fff" : "#0f172a", color: isDark ? "#000" : "#fff" }
                                        : { color: isDark ? alpha("#fff", 0.75) : alpha("#0f172a", 0.78) }),
                                }}
                                endIcon={
                                    <Chip
                                        size="small"
                                        label={String(count).padStart(2, "0")}
                                        sx={{
                                            height: 22,
                                            fontWeight: 1000,
                                            borderRadius: 999,
                                            bgcolor: selected
                                                ? alpha("#22c55e", 0.2)
                                                : alpha(theme.palette.primary.main, 0.12),
                                        }}
                                    />
                                }
                            >
                                {r}
                            </Button>
                        );
                    })}
                </Stack>
            </Paper>

            {/* Arama + Sıralama */}
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    borderRadius: 22,
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#0f172a", 0.08)}`,
                    bgcolor: isDark ? alpha("#0b1220", 0.58) : alpha("#fff", 0.9),
                    backdropFilter: "blur(14px)",
                }}
            >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                    <TextField
                        value={arama}
                        onChange={(e) => setArama(e.target.value)}
                        placeholder="Proje ara..."
                        size="small"
                        sx={{
                            minWidth: { xs: "100%", sm: 320 },
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 18,
                                bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                "& fieldset": { border: "none" },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <RiSearch2Line />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {viewMode === "forecast" ? (
                        <Select
                            size="small"
                            value={sirala}
                            onChange={(e) => setSirala(e.target.value)}
                            sx={{
                                minWidth: 220,
                                borderRadius: 18,
                                bgcolor: isDark ? alpha("#0f172a", 0.5) : alpha("#0f172a", 0.03),
                                "& fieldset": { border: "none" },
                                fontWeight: 800,
                                fontSize: "0.85rem",
                            }}
                        >
                            <MenuItem value="buHafta">gY"� Bu hafta</MenuItem>
                            <MenuItem value="gelecekHafta">➡️ Gelecek hafta</MenuItem>
                            <MenuItem value="digerHafta">⏭️ Di�Yer hafta</MenuItem>
                            <MenuItem value="aySonunaKadar">gY�� Ay sonuna kadar</MenuItem>
                            <MenuItem value="ayToplam">gY�� Ay toplam</MenuItem>
                        </Select>
                    ) : (
                        <Box sx={{ minWidth: 220 }} />
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}
