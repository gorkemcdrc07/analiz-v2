// src/ozellikler/analiz-paneli/AnalizPaneli.jsx
import React, { useMemo, useState, useCallback } from "react";
import { Box, Stack, Typography, alpha, Avatar, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RiRefreshLine, RiCalendarCheckLine, RiFocus3Line, RiDatabaseLine } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";

import AnalizTablosu from "./AnalizTablosu";
import { BASE_URL } from "../yardimcilar/sabitler";
import { extractItems } from "../yardimcilar/backend";
import { toIsoLocalEnd, toIsoLocalStart } from "../yardimcilar/tarih";
import { seferNoNormalizeEt } from "../yardimcilar/metin";

// Print API
const PRINTS_BASE_URL = "https://tedarik-analiz-sho-api.onrender.com";

/* ------------------------ küçük tarih yardımcıları ------------------------ */
const clampDayStart = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

// Pazartesi başlangıçlı hafta
const startOfWeekMon = (d) => {
    const x = clampDayStart(d);
    const day = x.getDay(); // 0 pazar
    const diff = (day + 6) % 7; // pazartesi=0
    x.setDate(x.getDate() - diff);
    return x;
};

// Haftalık aralıkları üret (range içindeki haftaları kapsar)
const buildWeekRangesBetween = (startDate, endDate) => {
    const s0 = clampDayStart(new Date(startDate));
    const e0 = clampDayStart(new Date(endDate));

    const firstWeekStart = startOfWeekMon(s0);
    const out = [];

    let cur = new Date(firstWeekStart);
    while (cur <= e0) {
        const wStart = new Date(cur);
        const wEnd = addDays(wStart, 6);
        wEnd.setHours(23, 59, 59, 999);

        // range ile kesişim
        const a = new Date(Math.max(wStart.getTime(), s0.getTime()));
        const b = new Date(Math.min(wEnd.getTime(), new Date(endDate).getTime()));

        if (a <= b) out.push({ start: a, end: b });

        cur = addDays(cur, 7);
    }

    return out;
};

export default function AnalizPaneli() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [loading, setLoading] = useState(false);
    const [raw, setRaw] = useState(null);
    const [error, setError] = useState("");
    const [userId] = useState(1);

    // prints state
    const [printsMap, setPrintsMap] = useState({});
    const [printsLoading, setPrintsLoading] = useState(false);
    const [printsError, setPrintsError] = useState("");

    const [range, setRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 1)),
        end: new Date(),
    });

    // ✅ TMS verisi çek (MANUEL) — /tmsorders yerine /tmsorders/week kullan
    const handleFetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        setPrintsError("");
        setPrintsMap({});
        setRaw({ items: [] }); // UI hemen başlasın

        // AnalizPaneli.jsx içindeki satırı şuna çevir:
        const TMS_WEEK_URL = `${BASE_URL}/tmsorders/week`;
        try {
            const weeks = buildWeekRangesBetween(range.start, range.end);

            const collected = [];

            for (let i = 0; i < weeks.length; i++) {
                const w = weeks[i];

                const body = {
                    startDate: toIsoLocalStart(w.start),
                    endDate: toIsoLocalEnd(w.end),
                    userId: Number(userId),
                };

                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), 35_000);

                try {
                    const res = await fetch(TMS_WEEK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });

                    const text = await res.text();
                    let payload = null;
                    try {
                        payload = text ? JSON.parse(text) : null;
                    } catch {
                        payload = text;
                    }

                    if (!res.ok) {
                        console.error("TMS WEEK ERROR", { url: TMS_WEEK_URL, status: res.status, bodySent: body, response: payload });
                        // tek hafta patlarsa devam
                        continue;
                    }

                    const items = extractItems(payload);
                    collected.push(...items);

                    // kademeli UI update
                    setRaw({ items: [...collected] });
                } catch (e) {
                    console.warn("TMS WEEK FAILED", i, e?.message);
                } finally {
                    clearTimeout(t);
                }
            }

            if (collected.length === 0) {
                throw new Error("TMS verisi çekilemedi. (Endpoint /tmsorders/week yanıt vermedi)");
            }
        } catch (e) {
            setError(e?.message || "Bağlantı hatası");
            setRaw(null);
        } finally {
            setLoading(false);
        }
    }, [range.start, range.end, userId]);

    const data = useMemo(() => (raw?.items ? raw.items : extractItems(raw)), [raw]);

    // TMS içinden SFR listesi
    const docNos = useMemo(() => {
        const items = Array.isArray(data) ? data : [];
        const set = new Set();
        for (const x of items) {
            const key = seferNoNormalizeEt(x?.TMSDespatchDocumentNo);
            if (key && key.startsWith("SFR")) set.add(key);
        }
        return Array.from(set);
    }, [data]);

    // ✅ Prints çek (MANUEL BUTON)
    const handleFetchPrints = useCallback(async () => {
        setPrintsLoading(true);
        setPrintsError("");

        try {
            if (!raw) throw new Error("Önce TMS verisini çekmelisiniz.");

            const body = {
                startDate: toIsoLocalStart(range.start),
                endDate: toIsoLocalEnd(range.end),
                userId: Number(userId),
                CustomerId: 0,
                SupplierId: 0,
                DriverId: 0,
                TMSDespatchId: 0,
                VehicleId: 0,
                DocumentPrint: "1",
                WorkingTypesId: [],
            };

            const url = `${PRINTS_BASE_URL}/prints/search`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(body),
            });

            const text = await res.text();
            let payload = null;
            try {
                payload = text ? JSON.parse(text) : null;
            } catch {
                payload = text;
            }

            if (!res.ok) {
                console.error("PRINT API ERROR", { url, status: res.status, bodySent: body, response: payload, responseText: text });

                const msg =
                    payload?.message ||
                    payload?.error ||
                    (typeof payload === "string" ? payload : null) ||
                    `Print API hata: ${res.status}`;

                throw new Error("Basım servisi (Odak) hata veriyor. Detay: " + msg);
            }

            const list = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
            const docNoSet = new Set(docNos);

            const map = {};
            for (const p of list) {
                const key = seferNoNormalizeEt(p?.DocumentNo || p?.documentNo || p?.DOCUMENTNO);
                if (!key) continue;

                // sadece ekrandaki seferler
                if (docNoSet.size && !docNoSet.has(key)) continue;

                map[key] = {
                    PrintedDate: p?.PrintedDate ?? p?.printedDate ?? null,
                    PrintedBy: p?.PrintedBy ?? p?.printedBy ?? null,
                };
            }

            setPrintsMap(map);
        } catch (e) {
            setPrintsError(e?.message || "Print bilgisi çekilemedi");
            setPrintsMap({});
        } finally {
            setPrintsLoading(false);
        }
    }, [raw, range.start, range.end, userId, docNos]);

    return (
        <Box
            sx={{
                width: "100%",
                p: { xs: 2, md: 4 },
                minHeight: "100vh",
                background: isDark
                    ? `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`
                    : `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%)`,
            }}
        >
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={3}
                    sx={{
                        mb: 6,
                        p: 2,
                        borderRadius: "24px",
                        bgcolor: isDark ? alpha("#1e293b", 0.4) : alpha("#ffffff", 0.6),
                        backdropFilter: "blur(20px)",
                        border: "1px solid",
                        borderColor: isDark ? alpha("#ffffff", 0.08) : alpha("#e2e8f0", 0.5),
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main", width: 42, height: 42, boxShadow: 3 }}>
                            <RiFocus3Line size={24} />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                                Operasyon Paneli
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Tarih seçip analizi başlatın
                            </Typography>

                            {error && (
                                <Typography sx={{ mt: 0.7, fontSize: "0.78rem", fontWeight: 800, color: "#ef4444" }}>
                                    {error}
                                </Typography>
                            )}

                            {printsError && (
                                <Typography sx={{ mt: 0.2, fontSize: "0.78rem", fontWeight: 800, color: "#f59e0b" }}>
                                    Print: {printsError}
                                </Typography>
                            )}

                            {!!Object.keys(printsMap || {}).length && !printsError && (
                                <Typography sx={{ mt: 0.2, fontSize: "0.78rem", fontWeight: 800, color: "#10b981" }}>
                                    Print eşleşme: {Object.keys(printsMap).length}
                                </Typography>
                            )}
                        </Box>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                        {/* Tarih */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                px: 2.5,
                                py: 1.2,
                                borderRadius: "16px",
                                bgcolor: isDark ? alpha("#000", 0.2) : "#fff",
                                border: "1px solid",
                                borderColor: isDark ? alpha("#fff", 0.05) : alpha("#e2e8f0", 0.8),
                            }}
                        >
                            <RiCalendarCheckLine size={20} color={theme.palette.primary.main} />
                            <input
                                type="date"
                                value={range.start.toISOString().split("T")[0]}
                                onChange={(e) => setRange((prev) => ({ ...prev, start: new Date(e.target.value) }))}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    color: isDark ? "#fff" : "#000",
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    fontFamily: "inherit",
                                }}
                            />
                            <Typography sx={{ opacity: 0.3, fontWeight: 300 }}>—</Typography>
                            <input
                                type="date"
                                value={range.end.toISOString().split("T")[0]}
                                onChange={(e) => setRange((prev) => ({ ...prev, end: new Date(e.target.value) }))}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    color: isDark ? "#fff" : "#000",
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    fontFamily: "inherit",
                                }}
                            />
                        </Box>

                        {/* TMS Buton */}
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={handleFetchData}
                            disabled={loading}
                            startIcon={loading ? null : <RiRefreshLine size={20} />}
                            sx={{
                                borderRadius: "16px",
                                px: 4,
                                py: 1.5,
                                fontWeight: 800,
                                textTransform: "none",
                                fontSize: "0.95rem",
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                "&:hover": { boxShadow: "none" },
                            }}
                        >
                            {loading ? "Veriler Çekiliyor..." : "Verileri Analiz Et"}
                        </Button>

                        {/* Prints Buton */}
                        <Button
                            variant="outlined"
                            onClick={handleFetchPrints}
                            disabled={printsLoading || !raw}
                            sx={{
                                borderRadius: "16px",
                                px: 3,
                                py: 1.5,
                                fontWeight: 900,
                                textTransform: "none",
                                fontSize: "0.9rem",
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                            }}
                        >
                            {printsLoading ? "SHÖ Çekiliyor..." : "SHÖ Verisini Getir"}
                        </Button>
                    </Stack>
                </Stack>
            </motion.div>

            {/* İçerik */}
            <AnimatePresence mode="wait">
                {!raw && !loading ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <Stack alignItems="center" justifyContent="center" sx={{ py: 15, opacity: 0.6 }}>
                            <RiDatabaseLine size={80} style={{ marginBottom: 20, opacity: 0.2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                Analiz İçin Hazırız
                            </Typography>
                            <Typography variant="body2">Tarih aralığı seçin ve "Verileri Analiz Et" butonuna tıklayın.</Typography>
                        </Stack>
                    </motion.div>
                ) : (
                    <motion.div key="data-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Box
                            sx={{
                                borderRadius: "32px",
                                overflow: "hidden",
                                bgcolor: isDark ? alpha("#0f172a", 0.4) : "#fff",
                                border: "1px solid",
                                borderColor: isDark ? alpha("#ffffff", 0.05) : alpha("#e2e8f0", 0.7),
                                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.08)",
                            }}
                        >
                            <AnalizTablosu data={data} loading={loading} printsMap={printsMap} printsLoading={printsLoading} />
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}

