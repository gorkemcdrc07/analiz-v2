// src/sayfalar/CustomerTemplatePage.js
import React, { useMemo, useState, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
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
    TextField,
    Divider,
    Drawer,
    IconButton,
    Tooltip,
    Skeleton,
    LinearProgress,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
    RefreshRounded,
    Inventory2Rounded,
    DescriptionRounded,
    FileDownloadRounded,
    LocalShippingRounded,
    BarChartRounded,
    SearchRounded,
    CloseRounded,
    TuneRounded,
    LogoutRounded,
    AccountCircleRounded,
} from "@mui/icons-material";

import * as XLSX from "xlsx";

import { getUserFromSession } from "./Login";
import { BASE_URL } from "../ozellikler/yardimcilar/sabitler";
import { extractItems } from "../ozellikler/yardimcilar/backend";
import { toIsoLocalStart, toIsoLocalEnd } from "../ozellikler/yardimcilar/tarih";
import { supabase2 } from "../supabase2/supabaseClient2";

/* ------------------------ MÜŞTERİ/PROJE KONFİG ------------------------ */
const CUSTOMER_PROJECTS = {
    EKSUN: ["EKSUN GIDA FTL"],
    BUNGE: ["BUNGE LÜLEBURGAZ FTL", "BUNGE PALET", "BUNGE GEBZE FTL"],
};

const getCustomerConfig = (key) => {
    const k = String(key || "").trim().toUpperCase();
    const projects = CUSTOMER_PROJECTS[k] || [];
    return {
        key: k,
        projects,
        title: projects.length === 1 ? projects[0] : `${k} Sevkiyat Takip`,
        exportFileName: k ? `${k}_SEVKIYAT.xlsx` : "SEVKIYAT.xlsx",
    };
};

/* ------------------------ SESSION HELPERS ------------------------ */
const LS_KEY = "app_oturum_kullanici";
const clearUserSession = () => {
    try {
        localStorage.removeItem(LS_KEY);
    } catch { }
};

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
    return statusMap[s] || { label: status || "İşlemde", color: "#3b82f6", bg: "#eff6ff" };
};

const isFilo = (v) => {
    const x = String(v || "").trim().toUpperCase();
    return x === "FİLO" || x === "FILO";
};
const isSpot = (v) => String(v || "").trim().toUpperCase() === "SPOT";

const normalizeName = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
const hasVal = (v) => v !== null && v !== undefined && String(v).trim() !== "";

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
        YÜKLEMEDE: { color: "#0284c7", bg: "#e0f2fe" },
        YOLDA: { color: "#ea580c", bg: "#ffedd5" },
        BOŞALTMADA: { color: "#7c3aed", bg: "#f3e8ff" },
        "TESLİM EDİLDİ": { color: "#16a34a", bg: "#dcfce7" },
        BELİRSİZ: { color: "#475569", bg: "#f1f5f9" },
    };
    return map[label] || { color: "#334155", bg: "#f1f5f9" };
};

const calcStats = (items) => {
    const filoCount = items.filter((x) => isFilo(x.VehicleWorkingName)).length;
    const spotCount = items.filter((x) => isSpot(x.VehicleWorkingName)).length;
    const seferSet = new Set(items.map((x) => String(x.TMSDespatchDocumentNo || "").trim()).filter(Boolean));
    return { total: items.length, filoCount, spotCount, seferCount: seferSet.size };
};

const calcDashboard = (items) => {
    const base = calcStats(items);
    const filoOpCounts = { YÜKLEMEDE: 0, YOLDA: 0, BOŞALTMADA: 0, "TESLİM EDİLDİ": 0, BELİRSİZ: 0 };

    for (const r of items) {
        if (!isFilo(r.VehicleWorkingName)) continue;
        const op = getFiloOperationalStatus(r) || "BELİRSİZ";
        filoOpCounts[op] = (filoOpCounts[op] || 0) + 1;
    }
    return { ...base, filoOpCounts };
};

/* ------------------------ ✅ EXCEL EXPORT (BOS FİLTRESİ DÜZELTİLDİ) ------------------------ */
// default: excludeBOS = false  (artık excel eksik atmayacak)
const exportToExcel = (rows, columns, fileName = "SEVKIYAT.xlsx", opts = { excludeBOS: false }) => {
    const EXCLUDED_KEYS = new Set(["ServiceName", "TMSVehicleRequestDocumentNo", "TMSOrderId", "DeliveryDate"]);
    const excludeBOS = Boolean(opts?.excludeBOS);

    const filteredRows = (rows || []).filter((r) => {
        if (!excludeBOS) return true;
        const sefer = String(r?.TMSDespatchDocumentNo || "").trim().toUpperCase();
        if (sefer.startsWith("BOS")) return false;
        return true;
    });

    const exportColumns = (columns || []).filter((c) => !EXCLUDED_KEYS.has(c.key));

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

    const data = filteredRows.map((r) => {
        const obj = {};
        for (const c of exportColumns) {
            const raw = getValueByPath(r, c.key);

            if (c.key === "OrderStatu") {
                const filoOp = getFiloOperationalStatus(r);
                obj[c.label] = filoOp || getStatusStyle(raw)?.label || "—";
                continue;
            }

            const val = c.type === "dt" ? formatDateTimeTR(raw) : raw ?? "—";
            obj[c.label] = val === "" ? "—" : val;
        }
        return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sevkiyat");
    XLSX.writeFile(wb, fileName);
};

/* ------------------------ EXCEL KOLONLARI ------------------------ */
const COLUMNS = [
    { key: "CustomerOrderNumber", label: "Sipariş No" },
    { key: "CustomerDocumentNumber", label: "Müşteri Referans No" },
    { key: "ProjectName", label: "Proje" },
    { key: "ServiceName", label: "Servis" },
    { key: "TMSVehicleRequestDocumentNo", label: "Pozisyon No" },
    { key: "TMSOrderId", label: "TMS ID" },
    { key: "VehicleTypeName", label: "Araç Tipi" },
    { key: "VehicleWorkingName", label: "Çalışma Tipi" },
    { key: "TMSDespatchDocumentNo", label: "Sefer No" },
    { key: "OrderStatu", label: "Durum" },
    { key: "PickupAddressCode", label: "Yükleme Nokta Kodu" },
    { key: "PickupCityName", label: "Yükleme İl" },
    { key: "PickupCountyName", label: "Yükleme İlçe" },
    { key: "DeliveryAddressCode", label: "Teslim Nokta Kodu" },
    { key: "DeliveryCityName", label: "Teslim İl" },
    { key: "DeliveryCountyName", label: "Teslim İlçe" },
    { key: "TMSDespatchCreatedDate", label: "Sefer Açılış", type: "dt" },
    { key: "PickupDate", label: "Yükleme Tarihi", type: "dt" },
    { key: "TMSDespatchVehicleDate", label: "Araç Yola Çıkış", type: "dt" },
    { key: "DeliveryDate", label: "Teslim Tarihi", type: "dt" },
    { key: "TMSDespatchDeliveryTime", label: "Teslim Zamanı", type: "dt" },
    { key: "FILO_PLAN.yukleme_varis", label: "Yükleme Varış", type: "dt" },
    { key: "FILO_PLAN.yukleme_cikis", label: "Yükleme Çıkış", type: "dt" },
    { key: "FILO_PLAN.teslim_varis", label: "Teslim Varış", type: "dt" },
    { key: "FILO_PLAN.teslim_cikis", label: "Teslim Çıkış", type: "dt" },
];

/* ------------------------ UI BİLEŞENLERİ ------------------------ */
const MetricCard = ({ icon, title, value, hint }) => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: "1px solid #eef2f7", bgcolor: "#fff" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 3,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "#f8fafc",
                        border: "1px solid #eef2f7",
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>{title}</Typography>
                    <Typography sx={{ fontSize: 22, color: "#0f172a", fontWeight: 1100, letterSpacing: -0.6, lineHeight: 1.1 }}>
                        {value}
                    </Typography>
                    {hint ? <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, mt: 0.3 }}>{hint}</Typography> : null}
                </Box>
            </Stack>
        </Paper>
    );
};

const FiloStatusBar = ({ counts }) => {
    const order = ["YÜKLEMEDE", "YOLDA", "BOŞALTMADA", "TESLİM EDİLDİ", "BELİRSİZ"];
    const total = order.reduce((acc, k) => acc + (counts?.[k] || 0), 0);

    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: "1px solid #eef2f7", bgcolor: "#fff" }}>
            <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>FİLO Operasyon Dağılımı</Typography>
                    <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 900 }}>{total ? `Toplam ${total}` : "—"}</Typography>
                </Stack>

                {order.map((k) => {
                    const v = counts?.[k] || 0;
                    const pct = total ? Math.round((v / total) * 100) : 0;
                    const st = getFiloOperationalChipStyle(k);

                    return (
                        <Box key={k}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: st.color }} />
                                    <Typography sx={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>{k}</Typography>
                                </Stack>
                                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                                    {v} ({pct}%)
                                </Typography>
                            </Stack>

                            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 999, bgcolor: st.bg }} />
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};

/* ------------------------ ANA SAYFA ------------------------ */
export default function CustomerTemplatePage() {
    const user = getUserFromSession();
    const params = useParams(); // /c/:customerKey
    const navigate = useNavigate();

    const cfg = useMemo(() => getCustomerConfig(params?.customerKey || user?.takip), [params?.customerKey, user?.takip]);

    const [range, setRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 3)),
        end: new Date(),
    });

    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const [q, setQ] = useState("");
    const [mode, setMode] = useState("ALL");

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const [filterOpen, setFilterOpen] = useState(false);

    // Navbar user menu
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const userMenuOpen = Boolean(userMenuAnchor);
    const openUserMenu = (e) => setUserMenuAnchor(e.currentTarget);
    const closeUserMenu = () => setUserMenuAnchor(null);

    const handleLogout = () => {
        closeUserMenu();
        clearUserSession();
        navigate("/login", { replace: true });
    };

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

            const allowedProjects = new Set(cfg.projects.map((p) => String(p).trim().toUpperCase()));

            const filteredBase = collected
                .filter((x) => {
                    const pn = String(x?.ProjectName || "").trim().toUpperCase();
                    const okProject = allowedProjects.size ? allowedProjects.has(pn) : true;
                    const notCancelled = String(x?.OrderStatu) !== "200";
                    return okProject && notCancelled;
                })
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
                    TMSDespatchDocumentNo: x.TMSDespatchDocumentNo,
                    VehicleWorkingName: x.VehicleWorkingName,
                    TMSVehicleRequestDocumentNo: x.TMSVehicleRequestDocumentNo,
                }));

            // ✅ Sadece FİLO için Supabase2 enrich
            const filoRows = filteredBase.filter((r) => isFilo(r.VehicleWorkingName) && r.TMSDespatchDocumentNo);
            const seferNos = Array.from(new Set(filoRows.map((r) => String(r.TMSDespatchDocumentNo).trim()).filter(Boolean)));

            if (seferNos.length > 0) {
                const { data: seferlerList } = await supabase2.from("seferler").select("id,sefer_no").in("sefer_no", seferNos);

                const seferIdByNo = new Map();
                for (const s of seferlerList || []) {
                    if (s?.sefer_no && s?.id) seferIdByNo.set(String(s.sefer_no).trim(), s.id);
                }

                const seferIds = Array.from(new Set(Array.from(seferIdByNo.values())));
                if (seferIds.length > 0) {
                    const { data: seferDetaylari } = await supabase2
                        .from("sefer_detaylari")
                        .select("sefer_id,yukleme_noktasi,teslim_noktasi,yukleme_varis,yukleme_cikis,teslim_varis,teslim_cikis,nokta_sirasi")
                        .in("sefer_id", seferIds);

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
                    setLastUpdated(new Date());
                    return;
                }
            }

            setRows(filteredBase);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
            setErr("Veriler alınırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [range, user, cfg]);

    const visibleRows = useMemo(() => {
        const query = normalizeName(q);

        return rows.filter((r) => {
            if (mode === "FILO" && !isFilo(r.VehicleWorkingName)) return false;
            if (mode === "SPOT" && !isSpot(r.VehicleWorkingName)) return false;

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
    }, [rows, q, mode]);

    const dashboard = useMemo(() => calcDashboard(visibleRows), [visibleRows]);

    const dateInputValue = (d) => {
        const x = new Date(d);
        const yyyy = x.getFullYear();
        const mm = String(x.getMonth() + 1).padStart(2, "0");
        const dd = String(x.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const openDetail = (r) => {
        setSelectedRow(r);
        setDetailOpen(true);
    };
    const closeDetail = () => {
        setDetailOpen(false);
        setSelectedRow(null);
    };

    const gridColumns = useMemo(() => {
        return [
            { field: "CustomerOrderNumber", headerName: "Sipariş No", width: 150 },
            { field: "TMSDespatchDocumentNo", headerName: "Sefer No", width: 140 },
            { field: "TMSVehicleRequestDocumentNo", headerName: "Pozisyon", width: 140 },
            {
                field: "VehicleWorkingName",
                headerName: "Tip",
                width: 110,
                renderCell: (params) => {
                    const v = params.value;
                    const isF = isFilo(v);
                    const isS = isSpot(v);
                    const bg = isF ? "#f0f9ff" : isS ? "#fff7ed" : "#f1f5f9";
                    const c = isF ? "#0369a1" : isS ? "#c2410c" : "#475569";
                    return (
                        <Chip size="small" label={String(v || "—")} sx={{ bgcolor: bg, color: c, fontWeight: 950, borderRadius: 2, border: `1px solid ${c}20` }} />
                    );
                },
            },
            {
                field: "OrderStatu",
                headerName: "Durum",
                width: 170,
                sortable: false,
                renderCell: (params) => {
                    const r = params.row;
                    const filoOp = getFiloOperationalStatus(r);
                    if (filoOp) {
                        const st2 = getFiloOperationalChipStyle(filoOp);
                        return (
                            <Tooltip arrow title={`Filo Operasyon: ${filoOp}`} placement="top">
                                <Chip size="small" label={filoOp} sx={{ bgcolor: st2.bg, color: st2.color, fontWeight: 1000, borderRadius: 2, border: `1px solid ${st2.color}20` }} />
                            </Tooltip>
                        );
                    }

                    const st = getStatusStyle(r?.OrderStatu);
                    return <Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, fontWeight: 1000, borderRadius: 2, border: `1px solid ${st.color}20` }} />;
                },
            },
            { field: "PickupAddressCode", headerName: "Yükleme Nokta", width: 140 },
            { field: "PickupCityName", headerName: "Yükleme İl", width: 130 },
            { field: "PickupCountyName", headerName: "Yükleme İlçe", width: 140 },
            { field: "DeliveryAddressCode", headerName: "Teslim Nokta", width: 140 },
            { field: "DeliveryCityName", headerName: "Teslim İl", width: 130 },
            { field: "DeliveryCountyName", headerName: "Teslim İlçe", width: 140 },
            { field: "PickupDate", headerName: "Yükleme Tarihi", width: 170, valueFormatter: (p) => formatDateTimeTR(p?.value) },
            { field: "DeliveryDate", headerName: "Teslim Tarihi", width: 170, valueFormatter: (p) => formatDateTimeTR(p?.value) },
            { field: "TMSDespatchCreatedDate", headerName: "Sefer Açılış", width: 180, valueFormatter: (p) => formatDateTimeTR(p?.value) },
        ];
    }, []);

    if (!user?.kullanici_adi) return <Navigate to="/login" replace />;

    const userName = String(user?.kullanici_adi || "").trim() || "Kullanıcı";
    const userSub = String(user?.takip || cfg.key || "").trim();
    const avatarText = userName ? userName.slice(0, 1).toUpperCase() : "U";

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fb", pb: 6 }}>
            {/* NAVBAR */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 30,
                    bgcolor: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(14px)",
                    borderBottom: "1px solid #e8edf4",
                }}
            >
                <Container maxWidth="xl" sx={{ py: 1.2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2.5,
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: "#0f172a",
                                    color: "white",
                                    fontWeight: 1000,
                                }}
                            >
                                F
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 1100, color: "#0f172a", lineHeight: 1.1 }}>Flowline</Typography>
                                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                                    {cfg.key ? `${cfg.key} paneli` : "Sevkiyat takip"}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                size="small"
                                label={cfg.key || "GENEL"}
                                sx={{
                                    bgcolor: "#fff",
                                    border: "1px solid #eef2f7",
                                    color: "#334155",
                                    fontWeight: 900,
                                    borderRadius: 2,
                                }}
                            />

                            <Button
                                onClick={openUserMenu}
                                variant="outlined"
                                startIcon={
                                    <Avatar sx={{ width: 22, height: 22, fontSize: 12, bgcolor: "#0f172a" }}>{avatarText}</Avatar>
                                }
                                endIcon={<AccountCircleRounded />}
                                sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                    fontWeight: 1000,
                                    borderColor: "#e8edf4",
                                    color: "#0f172a",
                                    bgcolor: "#fff",
                                    "&:hover": { bgcolor: "#f8fafc", borderColor: "#dbe3ef" },
                                }}
                            >
                                {userName}
                            </Button>

                            <Menu
                                anchorEl={userMenuAnchor}
                                open={userMenuOpen}
                                onClose={closeUserMenu}
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                transformOrigin={{ vertical: "top", horizontal: "right" }}
                                PaperProps={{
                                    sx: {
                                        borderRadius: 3,
                                        border: "1px solid #eef2f7",
                                        boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
                                        minWidth: 260,
                                        overflow: "hidden",
                                    },
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.4, bgcolor: "#f8fafc", borderBottom: "1px solid #eef2f7" }}>
                                    <Typography sx={{ fontWeight: 1100, color: "#0f172a", fontSize: 14 }}>{userName}</Typography>
                                    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{userSub ? `Takip: ${userSub}` : "—"}</Typography>
                                </Box>

                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon>
                                        <LogoutRounded fontSize="small" />
                                    </ListItemIcon>
                                    Çıkış Yap
                                </MenuItem>
                            </Menu>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* SAYFA HEADER */}
            <Box
                sx={{
                    position: "sticky",
                    top: 64,
                    zIndex: 10,
                    bgcolor: "rgba(246,248,251,0.9)",
                    backdropFilter: "blur(14px)",
                    borderBottom: "1px solid #e8edf4",
                }}
            >
                <Container maxWidth="xl" sx={{ py: 1.6 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                        <Stack spacing={0.3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <DescriptionRounded sx={{ color: "#3b82f6" }} />
                                <Typography sx={{ fontWeight: 1100, color: "#0f172a", fontSize: 18, letterSpacing: -0.4 }}>{cfg.title}</Typography>
                                <Chip size="small" label="Sevkiyat Takip" sx={{ bgcolor: "#fff", border: "1px solid #eef2f7", color: "#334155", fontWeight: 900, borderRadius: 2 }} />
                            </Stack>
                            <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                                Son güncelleme: {lastUpdated ? formatDateTimeTR(lastUpdated.toISOString()) : "—"}
                            </Typography>
                        </Stack>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>Başlangıç</Typography>
                                <input
                                    type="date"
                                    value={dateInputValue(range.start)}
                                    onChange={(e) => setRange((p) => ({ ...p, start: new Date(e.target.value) }))}
                                    style={{ border: "1px solid #e8edf4", borderRadius: 12, padding: "8px 10px", fontWeight: 900, color: "#0f172a", outline: "none", background: "#fff", height: 36 }}
                                />
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>Bitiş</Typography>
                                <input
                                    type="date"
                                    value={dateInputValue(range.end)}
                                    onChange={(e) => setRange((p) => ({ ...p, end: new Date(e.target.value) }))}
                                    style={{ border: "1px solid #e8edf4", borderRadius: 12, padding: "8px 10px", fontWeight: 900, color: "#0f172a", outline: "none", background: "#fff", height: 36 }}
                                />
                            </Stack>

                            <Button
                                onClick={fetchTemplateData}
                                disabled={loading}
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded />}
                                sx={{ borderRadius: 2.5, fontWeight: 1000, textTransform: "none", boxShadow: "none" }}
                            >
                                Yenile
                            </Button>

                            {/* ✅ Export artık eksik atmaz (excludeBOS:false) */}
                            <Button
                                onClick={() => exportToExcel(visibleRows, COLUMNS, cfg.exportFileName, { excludeBOS: false })}
                                disabled={!visibleRows.length}
                                variant="outlined"
                                startIcon={<FileDownloadRounded />}
                                sx={{ borderRadius: 2.5, fontWeight: 1000, textTransform: "none" }}
                            >
                                Excel
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: 2.4 }}>
                <Stack spacing={1.5}>
                    {/* KPI */}
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
                        <Box sx={{ flex: 1 }}>
                            <MetricCard icon={<BarChartRounded sx={{ color: "#0f172a" }} />} title="Görünen Kayıt" value={dashboard.total} hint="Arama + filtre sonrası" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <MetricCard icon={<LocalShippingRounded sx={{ color: "#0369a1" }} />} title="FİLO" value={dashboard.filoCount} hint="Çalışma tipi FİLO" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <MetricCard icon={<LocalShippingRounded sx={{ color: "#c2410c" }} />} title="SPOT" value={dashboard.spotCount} hint="Çalışma tipi SPOT" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <MetricCard icon={<Inventory2Rounded sx={{ color: "#6d28d9" }} />} title="Unique Sefer" value={dashboard.seferCount} hint="TMSDespatchDocumentNo" />
                        </Box>
                    </Stack>

                    <FiloStatusBar counts={dashboard.filoOpCounts} />

                    {/* Toolbar */}
                    <Paper elevation={0} sx={{ p: 1.2, borderRadius: 4, border: "1px solid #eef2f7", bgcolor: "#fff" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                            <TextField
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Ara: sipariş, sefer, pozisyon, il/ilçe, nokta kodu…"
                                size="small"
                                fullWidth
                                InputProps={{ startAdornment: <SearchRounded sx={{ mr: 1, color: "#94a3b8" }} /> }}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                            />

                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                                <Chip
                                    icon={<TuneRounded />}
                                    label="Tümü"
                                    clickable
                                    onClick={() => setMode("ALL")}
                                    sx={{
                                        fontWeight: 900,
                                        borderRadius: 2,
                                        bgcolor: mode === "ALL" ? "#0f172a" : "#f8fafc",
                                        color: mode === "ALL" ? "#fff" : "#475569",
                                        border: `1px solid ${mode === "ALL" ? "#0f172a" : "#e8edf4"}`,
                                        "& .MuiChip-icon": { color: mode === "ALL" ? "#fff" : "#64748b" },
                                    }}
                                />
                                <Chip
                                    label="FİLO"
                                    clickable
                                    onClick={() => setMode("FILO")}
                                    sx={{
                                        fontWeight: 900,
                                        borderRadius: 2,
                                        bgcolor: mode === "FILO" ? "#e0f2fe" : "#f8fafc",
                                        color: mode === "FILO" ? "#0369a1" : "#475569",
                                        border: `1px solid ${mode === "FILO" ? "#0369a120" : "#e8edf4"}`,
                                    }}
                                />
                                <Chip
                                    label="SPOT"
                                    clickable
                                    onClick={() => setMode("SPOT")}
                                    sx={{
                                        fontWeight: 900,
                                        borderRadius: 2,
                                        bgcolor: mode === "SPOT" ? "#ffedd5" : "#f8fafc",
                                        color: mode === "SPOT" ? "#c2410c" : "#475569",
                                        border: `1px solid ${mode === "SPOT" ? "#c2410c20" : "#e8edf4"}`,
                                    }}
                                />
                                <Chip
                                    label="Filtreler"
                                    clickable
                                    onClick={() => setFilterOpen(true)}
                                    sx={{ fontWeight: 900, borderRadius: 2, bgcolor: "#fff", color: "#0f172a", border: "1px solid #e8edf4" }}
                                />
                                <Chip
                                    label="Temizle"
                                    clickable
                                    onClick={() => {
                                        setQ("");
                                        setMode("ALL");
                                    }}
                                    sx={{ fontWeight: 900, borderRadius: 2, bgcolor: "#fff", color: "#0f172a", border: "1px solid #e8edf4" }}
                                />
                            </Stack>
                        </Stack>
                    </Paper>

                    {/* Content */}
                    {err ? (
                        <Alert severity="error" sx={{ borderRadius: 3 }}>{err}</Alert>
                    ) : loading && rows.length === 0 ? (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef2f7", bgcolor: "#fff", p: 3 }}>
                            <Stack spacing={1.2}>
                                <Skeleton variant="rounded" height={44} />
                                <Skeleton variant="rounded" height={44} />
                                <Skeleton variant="rounded" height={44} />
                                <Skeleton variant="rounded" height={44} />
                                <Typography sx={{ mt: 1, color: "#64748b", fontWeight: 900 }}>Veriler yükleniyor…</Typography>
                            </Stack>
                        </Paper>
                    ) : rows.length === 0 && !searched ? (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px dashed #dbe3ef", bgcolor: "#fff", p: 5, textAlign: "center" }}>
                            <Inventory2Rounded sx={{ fontSize: 70, color: "#e8edf4", mb: 1 }} />
                            <Typography sx={{ fontWeight: 1100, color: "#0f172a", mb: 1 }}>Başlamak için tarih aralığını seç</Typography>
                            <Typography sx={{ color: "#64748b", fontWeight: 800 }}>Üstten “Yenile” butonuna bas.</Typography>
                        </Paper>
                    ) : visibleRows.length === 0 ? (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px dashed #dbe3ef", bgcolor: "#fff", p: 5, textAlign: "center" }}>
                            <Inventory2Rounded sx={{ fontSize: 70, color: "#e8edf4", mb: 1 }} />
                            <Typography sx={{ fontWeight: 1100, color: "#0f172a", mb: 1 }}>Kayıt Bulunamadı</Typography>
                            <Typography sx={{ color: "#64748b", fontWeight: 800 }}>Aramayı/filtreleri temizleyip tekrar deneyebilirsin.</Typography>
                        </Paper>
                    ) : (
                        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef2f7", bgcolor: "#fff", overflow: "hidden" }}>
                            <Box sx={{ height: "70vh" }}>
                                <DataGrid
                                    rows={visibleRows.map((r, idx) => ({ id: r.TMSOrderId || `${r.TMSDespatchDocumentNo || "row"}-${idx}`, ...r }))}
                                    columns={gridColumns}
                                    disableRowSelectionOnClick
                                    onRowClick={(params) => openDetail(params.row)}
                                    pageSizeOptions={[25, 50, 100]}
                                    initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                                    sx={{
                                        border: "none",
                                        "& .MuiDataGrid-columnHeaders": { bgcolor: "#fff", borderBottom: "1px solid #eef2f7" },
                                        "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 1000, letterSpacing: "0.06rem", textTransform: "uppercase", fontSize: "0.72rem", color: "#64748b" },
                                        "& .MuiDataGrid-row": { borderBottom: "1px solid #f1f5f9" },
                                        "& .MuiDataGrid-row:hover": { bgcolor: "#f8fafc", cursor: "pointer" },
                                        "& .MuiDataGrid-cell": { color: "#0f172a", borderBottom: "1px solid #f1f5f9" },
                                    }}
                                />
                            </Box>
                        </Paper>
                    )}
                </Stack>
            </Container>

            {/* FILTER DRAWER */}
            <Drawer
                anchor="right"
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                PaperProps={{ sx: { width: { xs: "100%", md: 420 }, bgcolor: "#fff", borderLeft: "1px solid #eef2f7" } }}
            >
                <Box sx={{ p: 2.2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography sx={{ fontWeight: 1100, color: "#0f172a", fontSize: 16 }}>Filtreler</Typography>
                            <Typography sx={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Detay filtreler için alan.</Typography>
                        </Box>
                        <IconButton onClick={() => setFilterOpen(false)}><CloseRounded /></IconButton>
                    </Stack>

                    <Divider sx={{ my: 1.6 }} />

                    <Stack spacing={1.2}>
                        <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Tarih Aralığı</Typography>

                        <Stack direction="row" spacing={1}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 900, mb: 0.5 }}>Başlangıç</Typography>
                                <input
                                    type="date"
                                    value={dateInputValue(range.start)}
                                    onChange={(e) => setRange((p) => ({ ...p, start: new Date(e.target.value) }))}
                                    style={{ width: "100%", border: "1px solid #e8edf4", borderRadius: 12, padding: "10px 10px", fontWeight: 900, color: "#0f172a", outline: "none", background: "#fff" }}
                                />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 900, mb: 0.5 }}>Bitiş</Typography>
                                <input
                                    type="date"
                                    value={dateInputValue(range.end)}
                                    onChange={(e) => setRange((p) => ({ ...p, end: new Date(e.target.value) }))}
                                    style={{ width: "100%", border: "1px solid #e8edf4", borderRadius: 12, padding: "10px 10px", fontWeight: 900, color: "#0f172a", outline: "none", background: "#fff" }}
                                />
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        <Stack direction="row" spacing={1}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => { setFilterOpen(false); fetchTemplateData(); }}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded />}
                                sx={{ borderRadius: 3, fontWeight: 1000, textTransform: "none", boxShadow: "none" }}
                            >
                                Yenile
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => { setQ(""); setMode("ALL"); setFilterOpen(false); }}
                                sx={{ borderRadius: 3, fontWeight: 1000, textTransform: "none" }}
                            >
                                Temizle
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Drawer>

            {/* DETAIL DRAWER */}
            <Drawer
                anchor="right"
                open={detailOpen}
                onClose={closeDetail}
                PaperProps={{ sx: { width: { xs: "100%", md: 520 }, bgcolor: "#fff", borderLeft: "1px solid #eef2f7" } }}
            >
                <Box sx={{ p: 2.2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography sx={{ fontWeight: 1100, color: "#0f172a", fontSize: 16 }}>Sevkiyat Detayı</Typography>
                            <Typography sx={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Satıra tıklayarak açıldı</Typography>
                        </Box>
                        <IconButton onClick={closeDetail}><CloseRounded /></IconButton>
                    </Stack>

                    <Divider sx={{ my: 1.6 }} />

                    {!selectedRow ? (
                        <Typography sx={{ color: "#64748b", fontWeight: 800 }}>—</Typography>
                    ) : (
                        <Stack spacing={1.2}>
                            <Chip size="small" label={`Sipariş: ${selectedRow.CustomerOrderNumber || "—"}`} sx={{ bgcolor: "#f8fafc", border: "1px solid #e8edf4", fontWeight: 900, borderRadius: 2 }} />
                            <Chip size="small" label={`Sefer: ${selectedRow.TMSDespatchDocumentNo || "—"}`} sx={{ bgcolor: "#f8fafc", border: "1px solid #e8edf4", fontWeight: 900, borderRadius: 2 }} />
                            <Chip size="small" label={`Proje: ${selectedRow.ProjectName || "—"}`} sx={{ bgcolor: "#f8fafc", border: "1px solid #e8edf4", fontWeight: 900, borderRadius: 2 }} />
                            <Typography sx={{ color: "#64748b", fontWeight: 900, fontSize: 12 }}>
                                Yükleme: {selectedRow.PickupAddressCode || "—"} | Teslim: {selectedRow.DeliveryAddressCode || "—"}
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
}