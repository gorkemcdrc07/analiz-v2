import React, { useMemo, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import {
    Box,
    Container,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Stack,
    Chip,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    TextField,
    Divider,
} from "@mui/material";
import {
    RefreshRounded,
    Inventory2Rounded,
    DescriptionRounded,
    FileDownloadRounded,
    LocalShippingRounded,
    BarChartRounded,
    SearchRounded,
} from "@mui/icons-material";

import * as XLSX from "xlsx";

import { getUserFromSession } from "./Login";
import { BASE_URL } from "../ozellikler/yardimcilar/sabitler";
import { extractItems } from "../ozellikler/yardimcilar/backend";
import { toIsoLocalStart, toIsoLocalEnd } from "../ozellikler/yardimcilar/tarih";

// ✅ 2. Supabase projesi client
import { supabase2 } from "../supabase2/supabaseClient2";

/* ------------------------ YARDIMCILAR ------------------------ */
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
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x;
};
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
        const a = new Date(Math.max(wStart.getTime(), s0.getTime()));
        const b = new Date(Math.min(wEnd.getTime(), new Date(endDate).getTime()));
        if (a <= b) out.push({ start: a, end: b });
        cur = addDays(cur, 7);
    }
    return out;
};

/* --------- TARİH FORMATLAMA (2026-02-10T15:00:40.68129 -> 10.02.2026 15:00) --------- */
const normalizeIsoMs = (s) => {
    if (!s || typeof s !== "string") return s;
    return s.replace(/(\.\d{3})\d+/, "$1");
};

const formatDateTimeTR = (value) => {
    if (!value) return "—";
    const raw = String(value).trim();
    const normalized = normalizeIsoMs(raw);

    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return raw;

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
};

const getStatusStyle = (status) => {
    const s = String(status);
    const statusMap = {
        "1": { label: "Bekliyor", color: "#64748b", bg: "#f1f5f9" },
        "2": { label: "Onaylandı", color: "#0891b2", bg: "#ecfeff" },
        "3": { label: "Spot Planlamada", color: "#d97706", bg: "#fffbeb" },
        "4": { label: "Araç Atandı", color: "#2563eb", bg: "#eff6ff" },
        "5": { label: "Araç Yüklendi", color: "#7c3aed", bg: "#f5f3ff" },
        "6": { label: "Araç Yolda", color: "#ea580c", bg: "#fff7ed" },
        "7": { label: "Teslim Edildi", color: "#16a34a", bg: "#f0fdf4" },
        "8": { label: "Tamamlandı", color: "#15803d", bg: "#dcfce7" },
        "10": { label: "Eksik Evrak", color: "#dc2626", bg: "#fef2f2" },
        "20": { label: "Teslim Edildi", color: "#16a34a", bg: "#f0fdf4" },
        "30": { label: "Tamamlandı", color: "#15803d", bg: "#dcfce7" },
        "40": { label: "Orjinal Evrak Geldi", color: "#059669", bg: "#ecfdf5" },
        "50": { label: "Evrak Arşivlendi", color: "#475569", bg: "#f8fafc" },
        "80": { label: "Araç Boşaltmada", color: "#9333ea", bg: "#faf5ff" },
        "90": { label: "Filo Planlamada", color: "#0369a1", bg: "#f0f9ff" },
        "200": { label: "İptal", color: "#b91c1c", bg: "#fef2f2" },
    };
    return (
        statusMap[s] || {
            label: status || "İşlemde",
            color: "#3b82f6",
            bg: "#eff6ff",
        }
    );
};

const isFilo = (v) => {
    const x = String(v || "").trim().toUpperCase();
    return x === "FİLO" || x === "FILO";
};

const isSpot = (v) => {
    const x = String(v || "").trim().toUpperCase();
    return x === "SPOT";
};

/** Nokta adlarında çoklu boşluk, case vb. normalize */
const normalizeName = (v) =>
    String(v || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

const hasVal = (v) => v !== null && v !== undefined && String(v).trim() !== "";

/**
 * ✅ İSTEDİĞİN FİLO OPERASYON DURUMU
 * - yukleme_varis varsa => YÜKLEMEDE
 * - yukleme_varis + yukleme_cikis varsa => YOLDA
 * - yukleme_varis + yukleme_cikis + teslim_varis varsa => BOŞALTMADA
 * - yukleme_varis + yukleme_cikis + teslim_varis + teslim_cikis varsa => TESLİM EDİLDİ
 */
const getFiloOperationalStatus = (row) => {
    if (!isFilo(row?.VehicleWorkingName)) return null;
    const p = row?.FILO_PLAN;
    if (!p) return null;

    const yv = hasVal(p.yukleme_varis);
    const yc = hasVal(p.yukleme_cikis);
    const tv = hasVal(p.teslim_varis);
    const tc = hasVal(p.teslim_cikis);

    if (yv && yc && tv && tc) return "TESLİM EDİLDİ";
    if (yv && yc && tv) return "BOŞALTMADA";
    if (yv && yc) return "YOLDA";
    if (yv) return "YÜKLEMEDE";
    return null;
};

const getFiloOperationalChipStyle = (label) => {
    const map = {
        YÜKLEMEDE: { color: "#0ea5e9", bg: "#e0f2fe" },
        YOLDA: { color: "#f97316", bg: "#ffedd5" },
        BOŞALTMADA: { color: "#a855f7", bg: "#f3e8ff" },
        "TESLİM EDİLDİ": { color: "#16a34a", bg: "#dcfce7" },
        BELİRSİZ: { color: "#475569", bg: "#f1f5f9" },
    };
    return map[label] || { color: "#334155", bg: "#f1f5f9" };
};

/** ✅ Sayfa istatistiği */
const calcStats = (items) => {
    const filoCount = items.filter((x) => isFilo(x.VehicleWorkingName)).length;
    const spotCount = items.filter((x) => isSpot(x.VehicleWorkingName)).length;

    const seferSet = new Set(
        items.map((x) => String(x.TMSDespatchDocumentNo || "").trim()).filter(Boolean)
    );

    return {
        total: items.length,
        filoCount,
        spotCount,
        seferCount: seferSet.size,
    };
};

const calcDashboard = (items) => {
    const base = calcStats(items);
    const filoOpCounts = {
        YÜKLEMEDE: 0,
        YOLDA: 0,
        BOŞALTMADA: 0,
        "TESLİM EDİLDİ": 0,
        BELİRSİZ: 0,
    };

    for (const r of items) {
        if (!isFilo(r.VehicleWorkingName)) continue;
        const op = getFiloOperationalStatus(r) || "BELİRSİZ";
        filoOpCounts[op] = (filoOpCounts[op] || 0) + 1;
    }

    return { ...base, filoOpCounts };
};

/* ------------------------ TABLO KOLONLARI (TR) ------------------------ */
const COLUMNS = [
    { key: "CustomerOrderNumber", label: "Sipariş No" },
    { key: "CustomerDocumentNumber", label: "Müşteri Referans No" },

    { key: "ProjectName", label: "Proje" },
    { key: "ServiceName", label: "Servis" },

    { key: "TMSVehicleRequestDocumentNo", label: "Pozisyon No" },
    { key: "TMSOrderId", label: "TMS ID" },

    { key: "VehicleTypeName", label: "Araç Tipi" },
    { key: "VehicleWorkingName", label: "Araç Çalışma Tipi (Filo/Spot)" },

    { key: "TMSDespatchDocumentNo", label: "Sefer No" },
    { key: "OrderStatu", label: "Durum" },

    { key: "PickupAddressCode", label: "Yükleme Nokta Kodu" },
    { key: "PickupCityName", label: "Yükleme İl" },
    { key: "PickupCountyName", label: "Yükleme İlçe" },

    { key: "DeliveryAddressCode", label: "Teslim Nokta Kodu" },
    { key: "DeliveryCityName", label: "Teslim İl" },
    { key: "DeliveryCountyName", label: "Teslim İlçe" },

    { key: "TMSDespatchCreatedDate", label: "Sefer Açılış Zamanı", type: "dt" },
    { key: "PickupDate", label: "Yükleme Tarihi", type: "dt" },
    { key: "TMSDespatchVehicleDate", label: "Araç Yola Çıkış", type: "dt" },
    { key: "DeliveryDate", label: "Teslim Tarihi", type: "dt" },
    { key: "TMSDespatchDeliveryTime", label: "Teslim Zamanı", type: "dt" },

    // FILO_PLAN
    { key: "FILO_PLAN.yukleme_varis", label: "Yükleme Varış", type: "dt" },
    { key: "FILO_PLAN.yukleme_cikis", label: "Yükleme Çıkış", type: "dt" },
    { key: "FILO_PLAN.teslim_varis", label: "Teslim Varış", type: "dt" },
    { key: "FILO_PLAN.teslim_cikis", label: "Teslim Çıkış", type: "dt" },
];

const getValueByPath = (obj, path) => {
    if (!path.includes(".")) return obj?.[path];
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        cur = cur?.[p];
        if (cur === undefined || cur === null) return cur;
    }
    return cur;
};

const exportToExcel = (rows, columns, fileName = "EKSUN_GIDA_FTL.xlsx") => {
    const data = rows.map((r) => {
        const obj = {};
        for (const c of columns) {
            const raw = getValueByPath(r, c.key);
            const val = c.type === "dt" ? formatDateTimeTR(raw) : raw ?? "—";
            obj[c.label] = val === "" ? "—" : val;
        }

        const filoOp = getFiloOperationalStatus(r);
        if (filoOp) obj["FİLO Operasyon Durumu"] = filoOp;

        return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sevkiyat");
    XLSX.writeFile(wb, fileName);
};

/* ------------------------ MODERN METRIC CARD ------------------------ */
const MetricCard = ({ icon, title, value, hint }) => (
    <Paper
        elevation={0}
        sx={{
            p: 2,
            borderRadius: 4,
            border: "1px solid #e8edf4",
            bgcolor: "#fff",
            boxShadow: "0px 10px 30px rgba(2, 6, 23, 0.04)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0px 16px 40px rgba(2, 6, 23, 0.08)",
            },
            minWidth: 220,
        }}
    >
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#f1f5f9",
                    border: "1px solid #e8edf4",
                }}
            >
                {icon}
            </Box>

            <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: 22, color: "#0f172a", fontWeight: 1100, letterSpacing: -0.5 }}>
                    {value}
                </Typography>
                {hint ? (
                    <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>
                        {hint}
                    </Typography>
                ) : null}
            </Box>
        </Stack>
    </Paper>
);

/* ------------------------ ANA SAYFA ------------------------ */
export default function CustomerTemplatePage() {
    const user = getUserFromSession();

    const [range, setRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 3)),
        end: new Date(),
    });

    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState("");

    // ✅ Modern filtreler
    const [q, setQ] = useState("");
    const [onlyFilo, setOnlyFilo] = useState(false);
    const [onlySpot, setOnlySpot] = useState(false);

    const fetchTemplateData = useCallback(async () => {
        if (!user?.kullanici_adi) return;

        setSearched(true);
        setLoading(true);
        setErr("");

        try {
            const weeks = buildWeekRangesBetween(range.start, range.end);
            const collected = [];

            for (const w of weeks) {
                const res = await fetch(`${BASE_URL}/tmsorders/week`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        startDate: toIsoLocalStart(w.start),
                        endDate: toIsoLocalEnd(w.end),
                        userId: 1,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    collected.push(...extractItems(data));
                }
            }

            const filteredBase = collected
                .filter(
                    (x) =>
                        String(x?.ProjectName || "").trim().toUpperCase() === "EKSUN GIDA FTL" &&
                        String(x?.OrderStatu) !== "200"
                )
                .map((x) => ({
                    ProjectName: x.ProjectName,
                    ServiceName: x.ServiceName,
                    PickupDate: x.PickupDate,
                    PickupAddressCode: x.PickupAddressCode,
                    PickupCityName: x.PickupCityName,
                    PickupCountyName: x.PickupCountyName,
                    CustomerDocumentNumber: x.CustomerDocumentNumber,
                    CustomerOrderNumber: x.CustomerOrderNumber,
                    DeliveryAddressCode: x.DeliveryAddressCode,
                    DeliveryCityName: x.DeliveryCityName,
                    DeliveryCountyName: x.DeliveryCountyName,
                    OrderStatu: x.OrderStatu,
                    TMSDespatchVehicleDate: x.TMSDespatchVehicleDate,
                    TMSDespatchCreatedDate: x.TMSDespatchCreatedDate,
                    DeliveryDate: x.DeliveryDate,
                    TMSDespatchDeliveryTime: x.TMSDespatchDeliveryTime,
                    TMSOrderId: x.TMSOrderId,
                    VehicleTypeName: x.VehicleTypeName,
                    TMSDespatchDocumentNo: x.TMSDespatchDocumentNo, // sefer_no
                    VehicleWorkingName: x.VehicleWorkingName, // FİLO / SPOT
                    TMSVehicleRequestDocumentNo: x.TMSVehicleRequestDocumentNo, // pozisyon
                }));

            // ✅ SADECE FİLO OLANLAR İÇİN SUPABASE2’DEN EK DETAY ÇEK (sefer_id)
            const filoRows = filteredBase.filter(
                (r) => isFilo(r.VehicleWorkingName) && r.TMSDespatchDocumentNo
            );

            const seferNos = Array.from(
                new Set(filoRows.map((r) => String(r.TMSDespatchDocumentNo).trim()).filter(Boolean))
            );

            if (seferNos.length > 0) {
                // 1) sefer_no -> sefer_id
                const { data: seferlerList, error: seferlerErr } = await supabase2
                    .from("seferler")
                    .select("id,sefer_no")
                    .in("sefer_no", seferNos);

                if (seferlerErr) console.log("seferlerErr:", seferlerErr);

                const seferIdByNo = new Map();
                for (const s of seferlerList || []) {
                    if (s?.sefer_no && s?.id) seferIdByNo.set(String(s.sefer_no).trim(), s.id);
                }

                const seferIds = Array.from(new Set(Array.from(seferIdByNo.values())));
                if (seferIds.length > 0) {
                    // 2) sefer_detaylari: sefer_id ile çek
                    const { data: seferDetaylari, error: detayErr } = await supabase2
                        .from("sefer_detaylari")
                        .select(
                            "sefer_id,yukleme_noktasi,teslim_noktasi,yukleme_varis,yukleme_cikis,teslim_varis,teslim_cikis,nokta_sirasi"
                        )
                        .in("sefer_id", seferIds);

                    if (detayErr) console.log("sefer_detaylari error:", detayErr);

                    const planByKey = new Map();
                    const planBySefer = new Map();

                    const buildKey = (seferId, yuklemeNoktasi, teslimNoktasi) =>
                        `${seferId}|${normalizeName(yuklemeNoktasi)}|${normalizeName(teslimNoktasi)}`;

                    const toTimes = (d) => ({
                        yukleme_varis: d?.yukleme_varis,
                        yukleme_cikis: d?.yukleme_cikis,
                        teslim_varis: d?.teslim_varis,
                        teslim_cikis: d?.teslim_cikis,
                    });

                    for (const d of seferDetaylari || []) {
                        const sid = d?.sefer_id;
                        if (!sid) continue;

                        if (!planBySefer.has(String(sid))) planBySefer.set(String(sid), toTimes(d));

                        if (d?.yukleme_noktasi && d?.teslim_noktasi) {
                            planByKey.set(buildKey(sid, d.yukleme_noktasi, d.teslim_noktasi), toTimes(d));
                        }
                    }

                    const enriched = filteredBase.map((r) => {
                        if (!isFilo(r.VehicleWorkingName) || !r.TMSDespatchDocumentNo) return r;

                        const sid = seferIdByNo.get(String(r.TMSDespatchDocumentNo).trim());
                        if (!sid) return r;

                        const key = buildKey(sid, r.PickupAddressCode, r.DeliveryAddressCode);

                        return {
                            ...r,
                            FILO_PLAN: planByKey.get(key) || planBySefer.get(String(sid)) || null,
                            FILO_DONE: null,
                        };
                    });

                    setRows(enriched);
                    return;
                }
            }

            setRows(filteredBase);
        } catch (e) {
            console.error(e);
            setErr("Veriler alınırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [range, user]);

    const visibleRows = useMemo(() => {
        const query = normalizeName(q);
        return rows.filter((r) => {
            if (onlyFilo && !isFilo(r.VehicleWorkingName)) return false;
            if (onlySpot && !isSpot(r.VehicleWorkingName)) return false;

            if (!query) return true;

            const hay = [
                r.CustomerOrderNumber,
                r.CustomerDocumentNumber,
                r.TMSDespatchDocumentNo,
                r.TMSVehicleRequestDocumentNo,
                r.PickupAddressCode,
                r.DeliveryAddressCode,
                r.PickupCityName,
                r.DeliveryCityName,
                r.PickupCountyName,
                r.DeliveryCountyName,
            ]
                .map((x) => normalizeName(x))
                .join(" | ");

            return hay.includes(query);
        });
    }, [rows, q, onlyFilo, onlySpot]);

    const dashboard = useMemo(() => calcDashboard(visibleRows), [visibleRows]);

    if (!user?.kullanici_adi) return <Navigate to="/login" replace />;

    const renderCell = (r, col) => {
        if (col.key === "OrderStatu") {
            // ✅ FİLO ise: yeni operasyon durumu öncelikli
            const filoOp = getFiloOperationalStatus(r);
            if (filoOp) {
                const st2 = getFiloOperationalChipStyle(filoOp);
                return (
                    <Chip
                        size="small"
                        label={filoOp}
                        sx={{
                            bgcolor: st2.bg,
                            color: st2.color,
                            fontWeight: 1000,
                            borderRadius: 2,
                            border: `1px solid ${st2.color}20`,
                        }}
                    />
                );
            }

            const st = getStatusStyle(r?.OrderStatu);
            return (
                <Chip
                    size="small"
                    label={st.label}
                    sx={{
                        bgcolor: st.bg,
                        color: st.color,
                        fontWeight: 1000,
                        borderRadius: 2,
                        border: `1px solid ${st.color}20`,
                    }}
                />
            );
        }

        const v = getValueByPath(r, col.key);
        if (col.type === "dt") return formatDateTimeTR(v);

        if (v === null || v === undefined || v === "") return "—";
        return String(v);
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fb", pb: 8 }}>
            {/* Header */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    bgcolor: "rgba(246,248,251,0.92)",
                    backdropFilter: "blur(14px)",
                    borderBottom: "1px solid #e8edf4",
                }}
            >
                <Container maxWidth="xl" sx={{ py: 2.2 }}>
                    <Stack spacing={1.6}>
                        <Stack
                            direction={{ xs: "column", lg: "row" }}
                            spacing={2}
                            alignItems={{ xs: "stretch", lg: "center" }}
                            justifyContent="space-between"
                        >
                            <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DescriptionRounded sx={{ color: "#3b82f6" }} />
                                    <Typography
                                        sx={{
                                            fontWeight: 1100,
                                            color: "#0f172a",
                                            fontSize: 22,
                                            letterSpacing: -0.6,
                                        }}
                                    >
                                        EKSUN GIDA FTL
                                    </Typography>
                                </Stack>

                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800 }}>
                                    Sevkiyat Takip • Modern Dashboard
                                </Typography>

                                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.6 }}>
                                    <Chip
                                        size="small"
                                        label={`FİLO: ${dashboard.filoCount}`}
                                        sx={{
                                            bgcolor: "#f0f9ff",
                                            color: "#0369a1",
                                            fontWeight: 900,
                                            borderRadius: 2,
                                            border: "1px solid #0369a120",
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`SPOT: ${dashboard.spotCount}`}
                                        sx={{
                                            bgcolor: "#fff7ed",
                                            color: "#c2410c",
                                            fontWeight: 900,
                                            borderRadius: 2,
                                            border: "1px solid #c2410c20",
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`SEFER: ${dashboard.seferCount}`}
                                        sx={{
                                            bgcolor: "#f5f3ff",
                                            color: "#6d28d9",
                                            fontWeight: 900,
                                            borderRadius: 2,
                                            border: "1px solid #6d28d920",
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`TOPLAM: ${dashboard.total}`}
                                        sx={{
                                            bgcolor: "#f1f5f9",
                                            color: "#0f172a",
                                            fontWeight: 900,
                                            borderRadius: 2,
                                            border: "1px solid #0f172a10",
                                        }}
                                    />
                                </Stack>
                            </Stack>

                            {/* Filter Bar */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.2,
                                    borderRadius: 4,
                                    border: "1px solid #e8edf4",
                                    bgcolor: "#fff",
                                    boxShadow: "0px 12px 30px rgba(2, 6, 23, 0.04)",
                                }}
                            >
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1}
                                    alignItems={{ xs: "stretch", md: "center" }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
                                            Başlangıç
                                        </Typography>
                                        <input
                                            type="date"
                                            value={range.start.toISOString().split("T")[0]}
                                            onChange={(e) => setRange((p) => ({ ...p, start: new Date(e.target.value) }))}
                                            style={{
                                                border: "1px solid #e8edf4",
                                                borderRadius: 10,
                                                padding: "8px 10px",
                                                fontWeight: 900,
                                                color: "#0f172a",
                                                outline: "none",
                                            }}
                                        />
                                    </Stack>

                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
                                            Bitiş
                                        </Typography>
                                        <input
                                            type="date"
                                            value={range.end.toISOString().split("T")[0]}
                                            onChange={(e) => setRange((p) => ({ ...p, end: new Date(e.target.value) }))}
                                            style={{
                                                border: "1px solid #e8edf4",
                                                borderRadius: 10,
                                                padding: "8px 10px",
                                                fontWeight: 900,
                                                color: "#0f172a",
                                                outline: "none",
                                            }}
                                        />
                                    </Stack>

                                    <Button
                                        onClick={fetchTemplateData}
                                        disabled={loading}
                                        variant="contained"
                                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded />}
                                        sx={{
                                            borderRadius: 2.5,
                                            fontWeight: 1000,
                                            px: 2,
                                            textTransform: "none",
                                        }}
                                    >
                                        Seferleri Gör
                                    </Button>

                                    <Button
                                        onClick={() => exportToExcel(visibleRows, COLUMNS)}
                                        disabled={!visibleRows.length}
                                        variant="outlined"
                                        startIcon={<FileDownloadRounded />}
                                        sx={{
                                            borderRadius: 2.5,
                                            fontWeight: 1000,
                                            px: 2,
                                            textTransform: "none",
                                        }}
                                    >
                                        Excel’e Aktar
                                    </Button>
                                </Stack>

                                <Divider sx={{ my: 1.2 }} />

                                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                                    <TextField
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Ara: sipariş, sefer, pozisyon, il/ilçe, nokta kodu…"
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <SearchRounded sx={{ mr: 1, color: "#94a3b8" }} />,
                                        }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": { borderRadius: 3 },
                                        }}
                                    />

                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                                        <Chip
                                            clickable
                                            onClick={() => {
                                                setOnlyFilo((p) => !p);
                                                setOnlySpot(false);
                                            }}
                                            label="Sadece FİLO"
                                            sx={{
                                                fontWeight: 900,
                                                borderRadius: 2,
                                                bgcolor: onlyFilo ? "#e0f2fe" : "#f8fafc",
                                                color: onlyFilo ? "#0369a1" : "#475569",
                                                border: `1px solid ${onlyFilo ? "#0369a120" : "#e8edf4"}`,
                                            }}
                                        />
                                        <Chip
                                            clickable
                                            onClick={() => {
                                                setOnlySpot((p) => !p);
                                                setOnlyFilo(false);
                                            }}
                                            label="Sadece SPOT"
                                            sx={{
                                                fontWeight: 900,
                                                borderRadius: 2,
                                                bgcolor: onlySpot ? "#ffedd5" : "#f8fafc",
                                                color: onlySpot ? "#c2410c" : "#475569",
                                                border: `1px solid ${onlySpot ? "#c2410c20" : "#e8edf4"}`,
                                            }}
                                        />
                                        <Chip
                                            clickable
                                            onClick={() => {
                                                setQ("");
                                                setOnlyFilo(false);
                                                setOnlySpot(false);
                                            }}
                                            label="Filtreyi Sıfırla"
                                            sx={{
                                                fontWeight: 900,
                                                borderRadius: 2,
                                                bgcolor: "#f1f5f9",
                                                color: "#0f172a",
                                                border: "1px solid #0f172a10",
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Stack>

                        {/* KPI Cards */}
                        <Stack
                            direction={{ xs: "column", lg: "row" }}
                            spacing={1.5}
                            sx={{ overflowX: "auto", pb: 0.2 }}
                        >
                            <MetricCard
                                icon={<BarChartRounded sx={{ color: "#0f172a" }} />}
                                title="Görünen Kayıt"
                                value={dashboard.total}
                                hint="Arama + filtre sonrası"
                            />
                            <MetricCard
                                icon={<LocalShippingRounded sx={{ color: "#0369a1" }} />}
                                title="FİLO"
                                value={dashboard.filoCount}
                                hint={`Yüklemede ${dashboard.filoOpCounts["YÜKLEMEDE"]} • Yolda ${dashboard.filoOpCounts["YOLDA"]}`}
                            />
                            <MetricCard
                                icon={<LocalShippingRounded sx={{ color: "#c2410c" }} />}
                                title="SPOT"
                                value={dashboard.spotCount}
                                hint="Çalışma tipi SPOT"
                            />
                            <MetricCard
                                icon={<Inventory2Rounded sx={{ color: "#6d28d9" }} />}
                                title="Sefer (Unique)"
                                value={dashboard.seferCount}
                                hint="TMSDespatchDocumentNo"
                            />
                            <MetricCard
                                icon={<LocalShippingRounded sx={{ color: "#16a34a" }} />}
                                title="FİLO Teslim Edildi"
                                value={dashboard.filoOpCounts["TESLİM EDİLDİ"]}
                                hint={`Boşaltmada ${dashboard.filoOpCounts["BOŞALTMADA"]}`}
                            />
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* Content */}
            <Container maxWidth="xl" sx={{ mt: 3 }}>
                {err ? (
                    <Alert severity="error" sx={{ borderRadius: 3 }}>
                        {err}
                    </Alert>
                ) : loading && rows.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 12 }}>
                        <CircularProgress thickness={5} size={54} />
                        <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 900 }}>
                            Veriler yükleniyor…
                        </Typography>
                    </Box>
                ) : rows.length === 0 && !searched ? (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: "1px dashed #dbe3ef",
                            bgcolor: "#fff",
                            p: 5,
                            textAlign: "center",
                        }}
                    >
                        <Inventory2Rounded sx={{ fontSize: 70, color: "#e8edf4", mb: 1 }} />
                        <Typography sx={{ fontWeight: 1100, color: "#0f172a", mb: 1 }}>
                            Başlamak için tarih aralığını seç
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontWeight: 800 }}>
                            Sonra “Seferleri Gör” butonuna bas.
                        </Typography>
                    </Paper>
                ) : visibleRows.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: "1px dashed #dbe3ef",
                            bgcolor: "#fff",
                            p: 5,
                            textAlign: "center",
                        }}
                    >
                        <Inventory2Rounded sx={{ fontSize: 70, color: "#e8edf4", mb: 1 }} />
                        <Typography sx={{ fontWeight: 1100, color: "#0f172a", mb: 1 }}>
                            Kayıt Bulunamadı
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontWeight: 800 }}>
                            Tarih aralığını değiştirip veya aramayı temizleyip tekrar deneyebilirsin.
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: "1px solid #eef2f7",
                            boxShadow: "0px 14px 45px rgba(2, 6, 23, 0.05)",
                            maxHeight: "72vh",
                            overflow: "auto",
                            "&::-webkit-scrollbar": { width: "6px", height: "6px" },
                            "&::-webkit-scrollbar-thumb": { backgroundColor: "#e2e8f0", borderRadius: "10px" },
                        }}
                    >
                        <Table stickyHeader size="medium">
                            <TableHead>
                                <TableRow>
                                    {COLUMNS.map((c) => (
                                        <TableCell
                                            key={c.key}
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: "0.78rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06rem",
                                                color: "#64748b",
                                                bgcolor: "rgba(255, 255, 255, 0.92)",
                                                backdropFilter: "blur(10px)",
                                                borderBottom: "2px solid #f1f5f9",
                                                whiteSpace: "nowrap",
                                                py: 2,
                                            }}
                                        >
                                            {c.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {visibleRows.map((r, idx) => (
                                    <TableRow
                                        key={r.TMSOrderId || idx}
                                        hover
                                        sx={{
                                            "&:last-child td, &:last-child th": { border: 0 },
                                            "&:nth-of-type(even)": { bgcolor: "#fafbfc" },
                                            transition: "all 0.18s ease",
                                            "&:hover": {
                                                bgcolor: "#f8fafc !important",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        {COLUMNS.map((c) => (
                                            <TableCell
                                                key={c.key}
                                                sx={{
                                                    fontSize: "0.9rem",
                                                    color: "#1e293b",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 320,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    borderBottom: "1px solid #f1f5f9",
                                                    py: 2,
                                                }}
                                                title={
                                                    typeof getValueByPath(r, c.key) === "string"
                                                        ? String(getValueByPath(r, c.key))
                                                        : undefined
                                                }
                                            >
                                                {renderCell(r, c)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>
        </Box>
    );
}
