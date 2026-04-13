// src/ozellikler/analiz-paneli/AnalizPaneli.js
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    RiRefreshLine,
    RiDatabaseLine,
    RiTruckLine,
    RiPrinterLine,
    RiCheckLine,
    RiErrorWarningLine,
    RiLoader4Line,
} from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import AnalizTablosu from "./AnalizTablosu";
import { BASE_URL } from "../yardimcilar/sabitler";
import { supabase } from "../../supabaseClient";
import { extractItems } from "../yardimcilar/backend";
import { toIsoLocalEnd, toIsoLocalStart } from "../yardimcilar/tarih";
import { seferNoNormalizeEt } from "../yardimcilar/metin";
import { getRegions } from "../yardimcilar/regionsStore";

const PRINTS_BASE_URL = "https://tedarik-analiz-sho-api.onrender.com";

/* ─── tarih yardımcıları ─────────────────────────────────────────────────── */
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

const startOfWeekMon = (d) => {
    const x = clampDayStart(d);
    const diff = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x;
};

const buildWeekRangesBetween = (startDate, endDate) => {
    const s0 = clampDayStart(new Date(startDate));
    const e0 = clampDayStart(new Date(endDate));
    let cur = new Date(startOfWeekMon(s0));
    const out = [];

    while (cur <= e0) {
        const wStart = new Date(cur);
        const wEnd = addDays(wStart, 6);
        wEnd.setHours(23, 59, 59, 999);

        const a = new Date(Math.max(wStart.getTime(), s0.getTime()));
        const b = new Date(Math.min(wEnd.getTime(), new Date(endDate).getTime()));

        if (a <= b) out.push({ start: a, end: b });
        cur = addDays(cur, 7);
    }

    return out;
};

/* ─── küçük atom bileşenler ──────────────────────────────────────────────── */
function SpinnerIcon({ size = 18 }) {
    return (
        <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-flex" }}
        >
            <RiLoader4Line size={size} />
        </motion.span>
    );
}

function StatusPill({ color, icon, label }) {
    const colors = {
        green: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
        amber: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
        red: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
        blue: { bg: "rgba(99,102,241,0.12)", text: "#818cf8", border: "rgba(99,102,241,0.25)" },
    };

    const c = colors[color] || colors.blue;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 999,
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                fontSize: "0.72rem",
                fontWeight: 700,
            }}
        >
            {icon}
            {label}
        </motion.div>
    );
}

/* ─── tarih girdisi ──────────────────────────────────────────────────────── */
function DateInput({ label, value, onChange, isDark }) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
            <Typography
                sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    opacity: 0.45,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                }}
            >
                {label}
            </Typography>
            <input
                type="date"
                value={value}
                onChange={onChange}
                style={{
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 10,
                    padding: "7px 12px",
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    outline: "none",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = isDark
                        ? "rgba(99,102,241,0.5)"
                        : "rgba(99,102,241,0.4)";
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)";
                }}
            />
        </Box>
    );
}

/* ─── aksiyon butonu ─────────────────────────────────────────────────────── */
function ActionButton({
    onClick,
    disabled,
    loading,
    icon,
    label,
    loadingLabel,
    variant = "primary",
    isDark,
}) {
    const isPrimary = variant === "primary";

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            whileHover={!disabled ? { y: -1 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 20px",
                borderRadius: 12,
                border: isPrimary ? "none" : `1px solid rgba(99,102,241,0.35)`,
                background: isPrimary
                    ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                    : isDark
                        ? "rgba(99,102,241,0.08)"
                        : "rgba(99,102,241,0.06)",
                color: isPrimary ? "#fff" : isDark ? "#818cf8" : "#4f46e5",
                fontSize: "0.85rem",
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                transition: "all 0.2s",
                boxShadow: isPrimary && !disabled ? "0 4px 20px rgba(99,102,241,0.35)" : "none",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
            }}
        >
            {loading ? <SpinnerIcon size={16} /> : icon}
            {loading ? loadingLabel : label}
        </motion.button>
    );
}

/* ─── ana bileşen ────────────────────────────────────────────────────────── */
export default function AnalizPaneli() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [loading, setLoading] = useState(false);
    const [raw, setRaw] = useState(null);
    const [error, setError] = useState("");
    const [userId] = useState(1);

    const [printsMap, setPrintsMap] = useState({});
    const [printsLoading, setPrintsLoading] = useState(false);
    const [printsError, setPrintsError] = useState("");

    const [vehicleMap, setVehicleMap] = useState({});
    const [vehicleLoading, setVehicleLoading] = useState(false);
    const [vehicleError, setVehicleError] = useState("");

    const [range, setRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 1)),
        end: new Date(),
    });

    const [regionsMap, setRegionsMap] = useState(() => getRegions());

    useEffect(() => {
        const refresh = () => setRegionsMap(getRegions());
        window.addEventListener("regions:changed", refresh);
        window.addEventListener("storage", refresh);

        return () => {
            window.removeEventListener("regions:changed", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    /* ── ortak yardımcılar ──────────────────────────────────────────────── */
    const getPrintsRequestBody = useCallback(
        () => ({
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
        }),
        [range.start, range.end, userId]
    );

    const buildDocNosFromItems = useCallback((items) => {
        const set = new Set();

        for (const x of Array.isArray(items) ? items : []) {
            const key = seferNoNormalizeEt(x?.TMSDespatchDocumentNo);
            if (key && key.startsWith("SFR")) set.add(key);
        }

        return Array.from(set);
    }, []);

    /* ── TMS veri çekimi ────────────────────────────────────────────────── */
    const fetchTmsItems = useCallback(async () => {
        const TMS_WEEK_URL = `${BASE_URL}/tmsorders/week`;
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
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
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
                    console.error("TMS WEEK ERROR", {
                        url: TMS_WEEK_URL,
                        status: res.status,
                        bodySent: body,
                        response: payload,
                    });
                    continue;
                }

                const extracted = extractItems(payload);
                collected.push(...extracted);
                setRaw({ items: [...collected] });
            } catch (e) {
                console.warn("TMS WEEK FAILED", i, e?.message);
            } finally {
                clearTimeout(t);
            }
        }

        if (collected.length === 0) {
            throw new Error("TMS verisi çekilemedi. (/tmsorders/week yanıt vermedi)");
        }

        return collected;
    }, [range.start, range.end, userId]);

    /* ── SHÖ / prints veri çekimi ───────────────────────────────────────── */
    const fetchPrintsForDocNos = useCallback(
        async (sourceDocNos) => {
            const docNos = Array.isArray(sourceDocNos) ? sourceDocNos : [];
            if (!docNos.length) return {};

            const body = getPrintsRequestBody();
            const url = `${PRINTS_BASE_URL}/prints/search`;

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
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
                const msg =
                    payload?.message ||
                    payload?.error ||
                    (typeof payload === "string" ? payload : null) ||
                    `Print API hata: ${res.status}`;

                throw new Error("Basım servisi hata veriyor. Detay: " + msg);
            }

            const list = Array.isArray(payload)
                ? payload
                : payload?.items || payload?.data || [];

            const docNoSet = new Set(docNos);
            const map = {};

            for (const p of list) {
                const key = seferNoNormalizeEt(
                    p?.DocumentNo || p?.documentNo || p?.DOCUMENTNO
                );

                if (!key || !docNoSet.has(key)) continue;

                map[key] = {
                    PrintedDate: p?.PrintedDate ?? p?.printedDate ?? null,
                    PrintedBy: p?.PrintedBy ?? p?.printedBy ?? null,
                    EstimatedArrivalTime:
                        p?.EstimatedArrivalTime ??
                        p?.estimatedArrivalTime ??
                        p?.ETA ??
                        p?.eta ??
                        null,
                    TMSLoadingDocumentPrintedDate:
                        p?.TMSLoadingDocumentPrintedDate ??
                        p?.tmsLoadingDocumentPrintedDate ??
                        null,
                    TMSLoadingDocumentPrintedBy:
                        p?.TMSLoadingDocumentPrintedBy ??
                        p?.tmsLoadingDocumentPrintedBy ??
                        null,
                };
            }

            return map;
        },
        [getPrintsRequestBody]
    );

    /* ── araç veri çekimi ───────────────────────────────────────────────── */
    const fetchVehiclesForDocNos = useCallback(
        async (sourceDocNos) => {
            const docNos = Array.isArray(sourceDocNos) ? sourceDocNos : [];
            if (!docNos.length) return {};

            const body = getPrintsRequestBody();
            const url = `${PRINTS_BASE_URL}/prints/search`;

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
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
                const msg =
                    payload?.message ||
                    payload?.error ||
                    (typeof payload === "string" ? payload : null) ||
                    `Print API hata: ${res.status}`;

                throw new Error("Araç bilgileri servisi hata veriyor. Detay: " + msg);
            }

            const list = Array.isArray(payload)
                ? payload
                : payload?.items || payload?.data || [];

            const docNoSet = new Set(docNos);
            const pick = (obj, keys) => {
                for (const k of keys) {
                    const v = obj?.[k];
                    if (v != null && v !== "") return v;
                }
                return null;
            };

            const map = {};

            for (const p of list) {
                const key = seferNoNormalizeEt(
                    p?.DocumentNo || p?.documentNo || p?.DOCUMENTNO
                );

                if (!key || !docNoSet.has(key)) continue;

                map[key] = {
                    VehicleCurrentAccountTitle: pick(p, [
                        "VehicleCurrentAccountTitle",
                        "vehicleCurrentAccountTitle",
                        "VEHICLECURRENTACCOUNTTITLE",
                        "VehicleAccountTitle",
                        "vehicleAccountTitle",
                    ]),
                    KasaTipi: pick(p, [
                        "KasaTipi",
                        "kasaTipi",
                        "KASATIPI",
                        "BodyType",
                        "bodyType",
                    ]),
                    FreightAmount: pick(p, [
                        "FreightAmount",
                        "freightAmount",
                        "FREIGHTAMOUNT",
                        "Navlun",
                        "navlun",
                    ]),
                    PlateNumber: pick(p, [
                        "PlateNumber",
                        "plateNumber",
                        "PLATENUMBER",
                        "Plate",
                        "plate",
                    ]),
                    TrailerPlateNumber: pick(p, [
                        "TrailerPlateNumber",
                        "trailerPlateNumber",
                        "TRAILERPLATENUMBER",
                        "TrailerPlate",
                        "trailerPlate",
                    ]),
                    FullName: pick(p, [
                        "FullName",
                        "fullName",
                        "FULLNAME",
                        "DriverName",
                        "driverName",
                        "Sofor",
                        "sofor",
                    ]),
                    PhoneNumber: pick(p, [
                        "PhoneNumber",
                        "phoneNumber",
                        "PHONENUMBER",
                        "DriverPhone",
                        "driverPhone",
                        "Telefon",
                        "telefon",
                    ]),
                    CitizenNumber: pick(p, [
                        "CitizenNumber",
                        "citizenNumber",
                        "CITIZENNUMBER",
                        "TC",
                        "tc",
                        "TCKN",
                        "tckn",
                        "IdentityNumber",
                        "identityNumber",
                    ]),
                };
            }

            return map;
        },
        [getPrintsRequestBody]
    );

    /* ── ayrı kullanım için buton handler'ları ──────────────────────────── */
    const handleFetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        setPrintsError("");
        setPrintsMap({});
        setVehicleError("");
        setVehicleMap({});
        setRaw({ items: [] });

        try {
            const items = await fetchTmsItems();
            setRaw({ items });
        } catch (e) {
            setError(e?.message || "Bağlantı hatası");
            setRaw(null);
        } finally {
            setLoading(false);
        }
    }, [fetchTmsItems]);

    const rawData = useMemo(
        () => (raw?.items ? raw.items : extractItems(raw)),
        [raw]
    );

    const data = useMemo(() => {
        const items = Array.isArray(rawData) ? rawData : [];

        return items.map((item) => {
            const seferKey = seferNoNormalizeEt(item?.TMSDespatchDocumentNo);

            return {
                ...item,
                EstimatedArrivalTime:
                    item?.EstimatedArrivalTime ??
                    item?.estimatedArrivalTime ??
                    (seferKey ? printsMap?.[seferKey]?.EstimatedArrivalTime ?? null : null),

                TMSLoadingDocumentPrintedDate:
                    item?.TMSLoadingDocumentPrintedDate ??
                    (seferKey
                        ? printsMap?.[seferKey]?.TMSLoadingDocumentPrintedDate ?? null
                        : null),

                TMSLoadingDocumentPrintedBy:
                    item?.TMSLoadingDocumentPrintedBy ??
                    (seferKey
                        ? printsMap?.[seferKey]?.TMSLoadingDocumentPrintedBy ?? null
                        : null),
            };
        });
    }, [rawData, printsMap]);

    const docNos = useMemo(() => buildDocNosFromItems(data), [data, buildDocNosFromItems]);

    const handleFetchPrints = useCallback(async () => {
        setPrintsLoading(true);
        setPrintsError("");

        try {
            if (!docNos.length) throw new Error("Önce TMS verisini çekmelisiniz.");
            const map = await fetchPrintsForDocNos(docNos);
            setPrintsMap(map);
        } catch (e) {
            setPrintsError(e?.message || "Print bilgisi çekilemedi");
            setPrintsMap({});
        } finally {
            setPrintsLoading(false);
        }
    }, [docNos, fetchPrintsForDocNos]);

    const handleFetchVehicles = useCallback(async () => {
        setVehicleLoading(true);
        setVehicleError("");

        try {
            if (!docNos.length) throw new Error("Önce TMS verisini çekmelisiniz.");
            const map = await fetchVehiclesForDocNos(docNos);
            setVehicleMap(map);
        } catch (e) {
            setVehicleError(e?.message || "Araç bilgileri çekilemedi");
            setVehicleMap({});
        } finally {
            setVehicleLoading(false);
        }
    }, [docNos, fetchVehiclesForDocNos]);

    /* ── TEK BUTON: tüm verileri çek ────────────────────────────────────── */
    const handleFetchAll = useCallback(async () => {
        setLoading(true);
        setPrintsLoading(true);
        setVehicleLoading(true);

        setError("");
        setPrintsError("");
        setVehicleError("");
        setPrintsMap({});
        setVehicleMap({});
        setRaw({ items: [] });

        try {
            const items = await fetchTmsItems();
            const nextDocNos = buildDocNosFromItems(items);

            setRaw({ items });

            const [printsResult, vehiclesResult] = await Promise.allSettled([
                fetchPrintsForDocNos(nextDocNos),
                fetchVehiclesForDocNos(nextDocNos),
            ]);

            if (printsResult.status === "fulfilled") {
                setPrintsMap(printsResult.value || {});
            } else {
                setPrintsError(
                    printsResult.reason?.message || "Print bilgisi çekilemedi"
                );
                setPrintsMap({});
            }

            if (vehiclesResult.status === "fulfilled") {
                setVehicleMap(vehiclesResult.value || {});
            } else {
                setVehicleError(
                    vehiclesResult.reason?.message || "Araç bilgileri çekilemedi"
                );
                setVehicleMap({});
            }
        } catch (e) {
            setError(e?.message || "Bağlantı hatası");
            setRaw(null);
            setPrintsMap({});
            setVehicleMap({});
        } finally {
            setLoading(false);
            setPrintsLoading(false);
            setVehicleLoading(false);
        }
    }, [
        fetchTmsItems,
        buildDocNosFromItems,
        fetchPrintsForDocNos,
        fetchVehiclesForDocNos,
    ]);

    /* ── durum pill'leri ─────────────────────────────────────────────────── */
    const statusPills = useMemo(() => {
        const pills = [];

        if (error) {
            pills.push({
                color: "red",
                icon: <RiErrorWarningLine size={11} />,
                label: error.slice(0, 60),
            });
        }

        if (printsError) {
            pills.push({
                color: "amber",
                icon: <RiErrorWarningLine size={11} />,
                label: `SHÖ: ${printsError.slice(0, 50)}`,
            });
        }

        if (vehicleError) {
            pills.push({
                color: "amber",
                icon: <RiErrorWarningLine size={11} />,
                label: `Araç: ${vehicleError.slice(0, 50)}`,
            });
        }

        if (!printsError && Object.keys(printsMap).length) {
            pills.push({
                color: "green",
                icon: <RiCheckLine size={11} />,
                label: `${Object.keys(printsMap).length} SHÖ eşleşti`,
            });
        }

        if (!vehicleError && Object.keys(vehicleMap).length) {
            pills.push({
                color: "green",
                icon: <RiCheckLine size={11} />,
                label: `${Object.keys(vehicleMap).length} araç eşleşti`,
            });
        }

        if (!error && raw && data.length) {
            pills.push({
                color: "blue",
                icon: <RiCheckLine size={11} />,
                label: `${data.length} sefer yüklendi`,
            });
        }

        return pills;
    }, [error, printsError, vehicleError, printsMap, vehicleMap, raw, data]);

    /* ── render ──────────────────────────────────────────────────────────── */
    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100vh",
                p: { xs: 2, md: 3 },
                background: isDark
                    ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.08) 0%, transparent 70%)"
                    : "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.06) 0%, transparent 70%)",
            }}
        >
            <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <Box
                    sx={{
                        mb: 3,
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: "20px",
                        background: isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(24px)",
                        border: "1px solid",
                        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                        boxShadow: isDark
                            ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -12px rgba(0,0,0,0.4)"
                            : "0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -12px rgba(0,0,0,0.06)",
                    }}
                >
                    <Stack
                        direction={{ xs: "column", lg: "row" }}
                        spacing={2}
                        alignItems={{ lg: "center" }}
                        justifyContent="space-between"
                    >
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ flexShrink: 0 }}
                        >
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "12px",
                                    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                                    flexShrink: 0,
                                }}
                            >
                                <RiDatabaseLine size={19} color="#fff" />
                            </Box>

                            <Box>
                                <Typography
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: "1rem",
                                        lineHeight: 1.2,
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    Operasyon Paneli
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ opacity: 0.45, fontWeight: 500 }}
                                >
                                    TMS · SHÖ · Araç bilgileri
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ sm: "flex-end" }}
                            flexWrap="wrap"
                        >
                            <Stack direction="row" spacing={1.5} alignItems="flex-end">
                                <DateInput
                                    label="Başlangıç"
                                    value={range.start.toISOString().split("T")[0]}
                                    onChange={(e) =>
                                        setRange((p) => ({
                                            ...p,
                                            start: new Date(e.target.value),
                                        }))
                                    }
                                    isDark={isDark}
                                />
                                <Box sx={{ pb: "9px", opacity: 0.3 }}>
                                    <Typography sx={{ fontSize: "0.8rem" }}>→</Typography>
                                </Box>
                                <DateInput
                                    label="Bitiş"
                                    value={range.end.toISOString().split("T")[0]}
                                    onChange={(e) =>
                                        setRange((p) => ({
                                            ...p,
                                            end: new Date(e.target.value),
                                        }))
                                    }
                                    isDark={isDark}
                                />
                            </Stack>

                            <Box
                                sx={{
                                    display: { xs: "none", sm: "block" },
                                    width: "1px",
                                    height: 38,
                                    background: isDark
                                        ? "rgba(255,255,255,0.07)"
                                        : "rgba(0,0,0,0.07)",
                                    alignSelf: "flex-end",
                                    mb: "1px",
                                }}
                            />

                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="flex-end"
                                flexWrap="wrap"
                            >
                                <ActionButton
                                    onClick={handleFetchAll}
                                    disabled={loading || printsLoading || vehicleLoading}
                                    loading={loading || printsLoading || vehicleLoading}
                                    icon={<RiRefreshLine size={16} />}
                                    label="Verileri Çek"
                                    loadingLabel="Tüm veriler çekiliyor..."
                                    variant="primary"
                                    isDark={isDark}
                                />
                            </Stack>
                        </Stack>
                    </Stack>

                    <AnimatePresence>
                        {statusPills.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}
                                >
                                    {statusPills.map((p, i) => (
                                        <StatusPill key={i} {...p} />
                                    ))}
                                </Stack>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            </motion.div>

            <AnimatePresence mode="wait">
                {!raw && !loading ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Stack
                            alignItems="center"
                            justifyContent="center"
                            spacing={2}
                            sx={{
                                py: { xs: 10, md: 16 },
                                borderRadius: "20px",
                                border: "1px dashed",
                                borderColor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.07)",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: "22px",
                                    background: isDark
                                        ? "rgba(99,102,241,0.08)"
                                        : "rgba(99,102,241,0.06)",
                                    border: "1px solid",
                                    borderColor: isDark
                                        ? "rgba(99,102,241,0.15)"
                                        : "rgba(99,102,241,0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <RiDatabaseLine
                                    size={32}
                                    color={
                                        isDark
                                            ? "rgba(99,102,241,0.5)"
                                            : "rgba(99,102,241,0.4)"
                                    }
                                />
                            </Box>

                            <Box sx={{ textAlign: "center" }}>
                                <Typography
                                    sx={{ fontWeight: 800, fontSize: "1.05rem", mb: 0.5 }}
                                >
                                    Analiz için hazır
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.45 }}>
                                    Tarih aralığını seçin ve "Verileri Çek" butonuna tıklayın
                                </Typography>
                            </Box>
                        </Stack>
                    </motion.div>
                ) : (
                    <motion.div
                        key="data-view"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <Box
                            sx={{
                                borderRadius: "20px",
                                overflow: "hidden",
                                border: "1px solid",
                                borderColor: isDark
                                    ? "rgba(255,255,255,0.05)"
                                    : "rgba(0,0,0,0.07)",
                                background: isDark ? "rgba(15,23,42,0.6)" : "#fff",
                                backdropFilter: "blur(20px)",
                                boxShadow: isDark
                                    ? "0 20px 60px -20px rgba(0,0,0,0.5)"
                                    : "0 20px 60px -20px rgba(0,0,0,0.06)",
                            }}
                        >
                                <AnalizTablosu
                                    data={data}
                                    loading={loading}
                                    printsMap={printsMap}
                                    printsLoading={printsLoading}
                                    regionsMap={regionsMap}
                                    vehicleMap={vehicleMap}
                                    vehicleLoading={vehicleLoading}
                                    range={range}
                                    userId={userId}
                                />
                            </Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
}