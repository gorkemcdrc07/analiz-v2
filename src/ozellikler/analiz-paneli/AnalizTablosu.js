// src/ozellikler/analiz-paneli/AnalizTablosu.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    Switch,
    Tooltip,
    IconButton,
    alpha,
    ButtonBase,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
    MdMonitor,
    MdSearch,
    MdHistory,
    MdDownload,
    MdTrendingUp,
    MdBolt,
    MdWarning,
    MdCancel,
    MdInfoOutline,
} from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";

// Excel import/export
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import ProjeSatiri from "./bilesenler/ProjeSatiri";
import { REGIONS } from "../yardimcilar/veriKurallari";
import { metniNormalizeEt as norm, seferNoNormalizeEt } from "../yardimcilar/metin";
import { Root, Wide, TopBar, Grid, CardList } from "../stiller/stilBilesenleri";

/* ------------------------ küçük yardımcılar ------------------------ */
const mergeKeepFilled = (prev, next) => {
    const out = { ...(prev || {}) };
    for (const k of Object.keys(next || {})) {
        const v = next[k];
        if (v != null && v !== "" && v !== "---") out[k] = v;
    }
    return out;
};

const booleanCevir = (v) => v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
const sayiCevir = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// dd.mm.yyyy / ISO parse (Excel stringleri için)
const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

    const s0 = String(v).trim();
    if (!s0) return null;

    // ✅ ISO ama fractional seconds 3'ten uzun (örn .7643056) ise 3 haneye kırp
    // 2026-02-02T09:26:13.7643056  -> 2026-02-02T09:26:13.764
    // 2026-02-02T09:26:13.7        -> 2026-02-02T09:26:13.700 (opsiyonel)
    const isoFix = (s) => {
        const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([Zz]|([+-]\d{2}:\d{2}))?$/);
        if (!m) return s;

        const base = m[1];
        const frac = m[3] || "";
        const tz = m[4] || ""; // Z / +03:00 / boş

        if (!frac) return base + tz;

        // 1-2 hane geldiyse 3'e pad et, 4+ geldiyse 3'e kırp
        const ms3 = (frac + "000").slice(0, 3);
        return `${base}.${ms3}${tz}`;
    };

    const s = isoFix(s0);

    // ✅ dd.mm.yyyy [HH:MM[:SS]] (Excel/TR)
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        const yyyy = Number(m[3]);
        const HH = Number(m[4] ?? 0);
        const MI = Number(m[5] ?? 0);
        const SS = Number(m[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // ✅ ISO / diğer
    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const isGecTedarik = (seferAcilisTarihi, yuklemeTarihi) => {
    const open = parseTRDateTime(seferAcilisTarihi);
    const load = parseTRDateTime(yuklemeTarihi);
    if (!open || !load) return false;

    const diffMs = open.getTime() - load.getTime(); // ✅ açılış - yükleme
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 30;
};

const pickColumn = (rowObj, possibleNames) => {
    const keys = Object.keys(rowObj || {});
    const normKeys = keys.map((k) => ({ raw: k, n: norm(k) }));

    for (const nm of possibleNames) {
        const target = norm(nm);
        const exact = normKeys.find((x) => x.n === target);
        if (exact) return rowObj[exact.raw];

        const contains = normKeys.find((x) => x.n.includes(target));
        if (contains) return rowObj[contains.raw];
    }
    return undefined;
};

/* ------------------------ UI TOKENS (tek yerden tema) ------------------------ */
const uiTokens = (isDark) => ({
    pageBg: isDark ? "#070B14" : "#F6F8FC",
    surface: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)",
    surface2: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)",
    surface3: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.98)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.10)",
    borderSoft: isDark ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.08)",

    text: isDark ? "rgba(255,255,255,0.94)" : "rgba(2,6,23,0.92)",
    subtext: isDark ? "rgba(255,255,255,0.62)" : "rgba(2,6,23,0.58)",
    muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.06)",

    accent: "#38bdf8",
    good: "#34d399",
    warn: "#fbbf24",
    bad: "#fb7185",

    shadow: isDark ? "0 18px 60px rgba(0,0,0,0.55)" : "0 18px 60px rgba(2,6,23,0.10)",
    shadowSoft: isDark ? "0 10px 30px rgba(0,0,0,0.45)" : "0 10px 30px rgba(2,6,23,0.08)",
});

// Excel hücre değeri Date / number / string olabilir -> ISO string'e çevir
const excelCellToISO = (cellVal) => {
    if (cellVal == null || cellVal === "") return null;

    if (cellVal instanceof Date && !Number.isNaN(cellVal.getTime())) {
        return cellVal.toISOString();
    }

    if (typeof cellVal === "number") {
        const dc = XLSX.SSF.parse_date_code(cellVal);
        if (dc) {
            const d = new Date(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, Math.floor(dc.S || 0));
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    }

    const d2 = parseTRDateTime(cellVal);
    return d2 ? d2.toISOString() : String(cellVal);
};

/* ------------------------ KPI Kartı ------------------------ */
const ModernKPI = ({ t, accent, title, value, subtitle, leftMeta, rightMeta, icon }) => {
    const a = accent || t.accent;

    return (
        <Box
            component={motion.div}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.995 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 4,
                p: 2,
                minWidth: 0,
                bgcolor: t.surface,
                border: `1px solid ${t.border}`,
                backdropFilter: "blur(14px)",
                boxShadow: t.shadow,
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    padding: "1px",
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${a}40, transparent 55%, ${a}18)`,
                    pointerEvents: "none",
                    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    maskComposite: "exclude",
                    WebkitMaskComposite: "xor",
                    opacity: 0.55,
                }}
            />

            <Box
                component={motion.div}
                initial={{ x: "-120%" }}
                whileHover={{ x: "120%" }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                sx={{
                    position: "absolute",
                    top: -40,
                    left: 0,
                    width: "55%",
                    height: "160%",
                    background: `linear-gradient(90deg, transparent, ${a}12, transparent)`,
                    transform: "skewX(-18deg)",
                    pointerEvents: "none",
                    filter: "blur(1px)",
                    opacity: 0.8,
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    width: 170,
                    height: 170,
                    right: -80,
                    top: -80,
                    background: `${a}18`,
                    filter: "blur(26px)",
                    borderRadius: "999px",
                    pointerEvents: "none",
                }}
            />

            <Stack spacing={1.1} sx={{ position: "relative" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography
                        sx={{
                            fontSize: "0.66rem",
                            fontWeight: 950,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: t.subtext,
                        }}
                    >
                        {title}
                    </Typography>

                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2.2,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: t.muted,
                            border: `1px solid ${t.borderSoft}`,
                            boxShadow: `0 10px 24px ${a}18`,
                            color: a,
                        }}
                    >
                        {icon}
                    </Box>
                </Stack>

                <Typography
                    sx={{
                        fontSize: "1.85rem",
                        fontWeight: 1000,
                        lineHeight: 1.05,
                        letterSpacing: "-0.02em",
                        color: t.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {value}
                </Typography>

                {(leftMeta || rightMeta) && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.1, flexWrap: "wrap" }}>
                        {leftMeta && (
                            <Box
                                sx={{
                                    px: 1.1,
                                    py: 0.55,
                                    borderRadius: 999,
                                    bgcolor: t.muted,
                                    border: `1px solid ${t.borderSoft}`,
                                    fontSize: "0.78rem",
                                    fontWeight: 900,
                                    color: t.subtext,
                                }}
                            >
                                {leftMeta}
                            </Box>
                        )}

                        {rightMeta && (
                            <Box
                                sx={{
                                    px: 1.1,
                                    py: 0.55,
                                    borderRadius: 999,
                                    bgcolor: t.muted,
                                    border: `1px solid ${t.borderSoft}`,
                                    fontSize: "0.78rem",
                                    fontWeight: 900,
                                    color: t.subtext,
                                }}
                            >
                                {rightMeta}
                            </Box>
                        )}
                    </Stack>
                )}

                {subtitle && (
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 850, color: t.subtext, opacity: 0.95 }}>
                        {subtitle}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
};

/* ------------------------ Ana UI ------------------------ */
export default function AnalizTablosu({ data, printsMap = {}, printsLoading = false }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const t = uiTokens(isDark);

    const [seciliBolge, setSeciliBolge] = useState("GEBZE");
    const [arama, setArama] = useState("");
    const [sirala, setSirala] = useState("perf"); // perf | plan | late
    const [sadeceGecikenler, setSadeceGecikenler] = useState(false);

    // ✅ yeni: tedarik edilmeyenler filtresi
    const [sadeceTedarikEdilmeyenler, setSadeceTedarikEdilmeyenler] = useState(false);

    const [excelTarihleriSeferBazli, setExcelTarihleriSeferBazli] = useState({});
    const [excelIcerikBilgisi, setExcelIcerikBilgisi] = useState(null);
    const [excelOkunuyor, setExcelOkunuyor] = useState(false);

    const exceldenTarihleriIceriAl = async () => {
        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xlsx,.xls";

            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setExcelOkunuyor(true);
                try {
                    const buf = await file.arrayBuffer();
                    const wb = XLSX.read(buf, { type: "array", cellDates: true });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

                    const map = {};

                    json.forEach((r) => {
                        const seferNoRaw = pickColumn(r, ["Sefer Numarası", "Sefer No", "SeferNo", "Sefer", "Sefer Numarasi"]);
                        const seferKey = seferNoNormalizeEt(seferNoRaw);
                        if (!seferKey) return;

                        const nextObj = {
                            yukleme_varis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Varış Zamanı", "Yükleme Varış"])),
                            yukleme_giris: excelCellToISO(pickColumn(r, ["Yükleme Noktasına Giriş Zamanı", "Yükleme Giriş"])),
                            yukleme_cikis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Çıkış Zamanı", "Yükleme Çıkış"])),
                            teslim_varis: excelCellToISO(pickColumn(r, ["Teslim Noktası Varış Zamanı", "Teslim Varış"])),
                            teslim_giris: excelCellToISO(pickColumn(r, ["Teslim Noktasına Giriş Zamanı", "Teslim Giriş"])),
                            teslim_cikis: excelCellToISO(pickColumn(r, ["Teslim Noktası Çıkış Zamanı", "Teslim Çıkış"])),
                        };

                        map[seferKey] = mergeKeepFilled(map[seferKey], nextObj);
                    });

                    const totalRows = json.length;
                    const withSefer = Object.keys(map).length;
                    const withAnyDate = Object.values(map).filter((tt) =>
                        [tt.yukleme_varis, tt.yukleme_giris, tt.yukleme_cikis, tt.teslim_varis, tt.teslim_giris, tt.teslim_cikis].some(
                            (x) => x != null && x !== "" && x !== "---"
                        )
                    ).length;

                    setExcelIcerikBilgisi({ totalRows, withSefer, withAnyDate });
                    setExcelTarihleriSeferBazli(map);
                } catch (err) {
                    console.error("Excel okuma hatası:", err);
                } finally {
                    setExcelOkunuyor(false);
                }
            };

            input.click();
        } catch (err) {
            console.error("Excel seçme hatası:", err);
        }
    };

    const islenmisVeri = useMemo(() => {
        const src = Array.isArray(data) ? data : [];
        const stats = {};

        src.forEach((item) => {
            let finalProjectName = item.ProjectName;
            const pNorm = norm(item.ProjectName);

            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                else return;
            }

            if (pNorm === norm("PEPSİ FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
                else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
            }

            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
            }

            if (pNorm === norm("FAKİR FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
            }

            // ✅ MODERN BOBİN FTL split kuralı
            if (pNorm === norm("MODERN BOBİN FTL")) {
                const c = norm(item.PickupCityName);

                if (c === norm("ZONGULDAK")) finalProjectName = "MODERN BOBİN ZONGULDAK FTL";
                else if (c === norm("TEKİRDAĞ")) finalProjectName = "MODERN BOBİN TEKİRDAĞ FTL";
                else return; // bu iki şehir dışındaysa panelde sayma (istersen kaldırırız)
            }


            if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

            const key = norm(finalProjectName);

            if (!stats[key]) {
                stats[key] = {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    gec_tedarik: new Set(),
                };
            }

            const s = stats[key];

            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                service === norm("YURTİÇİ FRİGO HİZMETLERİ");
            if (!inScope) return;

            const reqNoRaw = (item.TMSVehicleRequestDocumentNo || "").toString();
            const reqNoKey = reqNoRaw.replace(/\u00A0/g, " ").replace(/\u200B/g, "").replace(/\r?\n/g, " ").trim();
            const reqNoUp = reqNoKey.toLocaleUpperCase("tr-TR");

            if (reqNoKey && !reqNoUp.startsWith("BOS")) {
                s.plan.add(reqNoUp);
            }

            const despNoRaw = (item.TMSDespatchDocumentNo || "").toString();
            const despKey = seferNoNormalizeEt(despNoRaw);
            if (!despKey || !despKey.startsWith("SFR")) return;

            const statu = sayiCevir(item.OrderStatu);
            if (statu === 200) {
                s.iptal.add(despKey);
                return;
            }

            s.ted.add(despKey);

            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm("ÖZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despKey);
            else s.spot.add(despKey);

            if (booleanCevir(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            // ✅ Sefer açılış = TMSDespatchCreatedDate
            const seferAcilis = item.TMSDespatchCreatedDate;

            // ✅ Yükleme = PickupDate
            const yukleme = item.PickupDate;

            if (isGecTedarik(seferAcilis, yukleme)) {
                s.gec_tedarik.add(despKey);
            }
        });

        return stats;
    }, [data]);

    const satirlar = useMemo(() => {
        const q = norm(arama);
        const bolgeListesi = REGIONS[seciliBolge] || [];

        const base = bolgeListesi
            .map((projeAdi) => {
                const s = islenmisVeri[norm(projeAdi)] || {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    gec_tedarik: new Set(),
                };

                const plan = s.plan?.size ?? 0;
                const ted = s.ted?.size ?? 0;
                const iptal = s.iptal?.size ?? 0;

                // ✅ tedarik edilmeyen = talep - (tedarik + iptal)
                const edilmeyen = Math.max(0, plan - (ted + iptal));

                // gec / zamaninda bilgileri aynen kalsın (kart içi geç tedarik vs için)
                const gec = s.gec_tedarik?.size ?? 0;
                const zamaninda = Math.max(0, ted - gec);

                // ✅ YENİ yüzde: talep bazlı, "edilmeyen oranı"
                // yüzde = 100 - (edilmeyen / plan)*100
                const yuzde =
                    plan > 0 ? Math.max(0, Math.min(100, Math.round(100 - (edilmeyen / plan) * 100))) : 0;

                return {
                    name: projeAdi,
                    plan,
                    ted,
                    edilmeyen,
                    iptal,
                    spot: s.spot?.size ?? 0,
                    filo: s.filo?.size ?? 0,
                    sho_b: s.sho_b?.size ?? 0,
                    sho_bm: s.sho_bm?.size ?? 0,
                    zamaninda,
                    gec,
                    yuzde,
                };
            })
            .filter((r) => r.plan > 0)
            .filter((r) => (q ? norm(r.name).includes(q) : true))
            .filter((r) => (sadeceGecikenler ? r.gec > 0 : true))
            .filter((r) => (sadeceTedarikEdilmeyenler ? r.edilmeyen > 0 : true));

        const sorted = [...base].sort((a, b) => {
            if (sadeceGecikenler) return b.gec - a.gec;
            if (sadeceTedarikEdilmeyenler) return b.edilmeyen - a.edilmeyen;

            if (sirala === "plan") return b.plan - a.plan;
            if (sirala === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde;
        });

        return sorted;
    }, [seciliBolge, islenmisVeri, arama, sirala, sadeceGecikenler, sadeceTedarikEdilmeyenler]);

    const kpi = useMemo(() => {
        const sum = satirlar.reduce(
            (acc, r) => {
                acc.plan += r.plan;
                acc.ted += r.ted;
                acc.edilmeyen += r.edilmeyen;
                acc.spot += r.spot;
                acc.filo += r.filo;
                acc.gec += r.gec;
                acc.zamaninda += r.zamaninda;
                return acc;
            },
            { plan: 0, ted: 0, edilmeyen: 0, spot: 0, filo: 0, gec: 0, zamaninda: 0 }
        );

        // ✅ KPI Tedarik Oranı da talep bazlı olsun:
        sum.perf = sum.plan ? Math.max(0, Math.min(100, Math.round(100 - (sum.edilmeyen / sum.plan) * 100))) : 0;

        return sum;
    }, [satirlar]);

    const printsCount = useMemo(() => Object.keys(printsMap || {}).length, [printsMap]);

    const bolgeyiExceleAktar = () => {
        const toSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

        /* ---------------------- helpers ---------------------- */
        const colLetter = (n) => {
            let s = "";
            let x = n + 1;
            while (x > 0) {
                const m = (x - 1) % 26;
                s = String.fromCharCode(65 + m) + s;
                x = Math.floor((x - 1) / 26);
            }
            return s;
        };

        const setCellStyle = (ws, addr, style) => {
            if (!ws[addr]) return;
            ws[addr].s = { ...(ws[addr].s || {}), ...style };
        };

        const font = (bold = false, color = "FF0F172A") => ({
            bold,
            color: { rgb: color },
            name: "Calibri",
        });

        const fill = (rgb) => ({ patternType: "solid", fgColor: { rgb } });

        const borderAll = {
            top: { style: "thin", color: { rgb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
            left: { style: "thin", color: { rgb: "FFE5E7EB" } },
            right: { style: "thin", color: { rgb: "FFE5E7EB" } },
        };

        const align = (horizontal = "center") => ({
            vertical: "center",
            horizontal,
            wrapText: true,
        });

        const headerStyle = {
            font: font(true, "FFFFFFFF"),
            fill: fill("FF2563EB"),
            alignment: align("center"),
            border: borderAll,
        };

        const metaStyleDark = {
            font: font(true, "FFFFFFFF"),
            fill: fill("FF0F172A"),
            alignment: align("left"),
            border: borderAll,
        };

        const metaStyleSoft = {
            font: font(true, "FF0F172A"),
            fill: fill("FFDBEAFE"),
            alignment: align("left"),
            border: borderAll,
        };

        const rowFillA = fill("FFFFFFFF");
        const rowFillB = fill("FFF8FAFC");

        const lateFill = (lateCount) => {
            const n = Number(lateCount) || 0;
            if (n >= 10) return fill("FFDC2626");
            if (n >= 1) return fill("FFF97316");
            return fill("FF60A5FA");
        };

        const perfFill = (pct) => {
            const p = Number(pct) || 0;
            if (p >= 95) return fill("FF16A34A");
            if (p >= 90) return fill("FF10B981");
            if (p >= 80) return fill("FF3B82F6");
            if (p >= 70) return fill("FFF59E0B");
            if (p >= 50) return fill("FFF97316");
            return fill("FFEF4444");
        };

        const perfFrom = (plan, edilmeyen) => {
            const p = Number(plan) || 0;
            const e = Number(edilmeyen) || 0;
            if (p <= 0) return "TALEP YOK";
            return Math.max(0, Math.min(100, Math.round(100 - (e / p) * 100)));
        };

        /* ---------------------- workbook ---------------------- */
        const wb = XLSX.utils.book_new();

        const headers = [
            "PROJE",
            "TALEP",
            "TEDARİK",
            "EDİLMEYEN",
            "GEÇ TEDARİK",
            "SPOT",
            "FİLO",
            "SHÖ VAR",
            "SHÖ YOK",
            "TEDARİK ORANI (%)",
        ];

        const buildRowsFromProjectList = (projeListesi) => {
            return (projeListesi || []).map((projeAdi) => {
                const raw = islenmisVeri[norm(projeAdi)] || {};
                const plan = toSet(raw.plan).size;
                const ted = toSet(raw.ted).size;
                const iptal = toSet(raw.iptal).size;
                const spot = toSet(raw.spot).size;
                const filo = toSet(raw.filo).size;
                const shoVar = toSet(raw.sho_b).size;
                const shoYok = toSet(raw.sho_bm).size;
                const gecTedarik = toSet(raw.gec_tedarik).size;

                const edilmeyen = Math.max(0, plan - (ted + iptal));
                const perf = perfFrom(plan, edilmeyen);

                return {
                    "PROJE": projeAdi,
                    "TALEP": plan,
                    "TEDARİK": ted,
                    "EDİLMEYEN": edilmeyen,
                    "GEÇ TEDARİK": gecTedarik,
                    "SPOT": spot,
                    "FİLO": filo,
                    "SHÖ VAR": shoVar,
                    "SHÖ YOK": shoYok,
                    "TEDARİK ORANI (%)": perf,
                };
            });
        };

        const applySheetStyling = (ws, dataRowCount, customCols = null, perfColName = "TEDARİK ORANI (%)") => {
            ws["!cols"] =
                customCols ||
                [
                    { wch: 46 },
                    { wch: 10 },
                    { wch: 10 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 10 },
                    { wch: 10 },
                    { wch: 10 },
                    { wch: 10 },
                    { wch: 16 },
                ];

            ws["!freeze"] = { xSplit: 0, ySplit: 4 };
            ws["!autofilter"] = { ref: `A4:${colLetter((ws["!cols"]?.length || headers.length) - 1)}4` };

            const colCount = ws["!cols"]?.length || headers.length;

            for (let c = 0; c < colCount; c++) {
                setCellStyle(ws, `${colLetter(c)}1`, metaStyleDark);
                setCellStyle(ws, `${colLetter(c)}2`, metaStyleSoft);
                setCellStyle(ws, `${colLetter(c)}3`, { fill: fill("FFFFFFFF"), border: borderAll });
            }

            // header satırı
            for (let c = 0; c < colCount; c++) {
                setCellStyle(ws, `${colLetter(c)}4`, headerStyle);
            }

            const dataStart = 5;
            const dataEnd = 4 + dataRowCount;

            // performans sütunu sheet'e göre bulunur
            const localHeaders = [];
            for (let c = 0; c < colCount; c++) {
                const addr = `${colLetter(c)}4`;
                localHeaders.push(ws[addr]?.v);
            }

            const lateColIndex = localHeaders.indexOf("GEÇ TEDARİK");
            const perfColIndex = localHeaders.indexOf(perfColName);

            for (let r = dataStart; r <= dataEnd; r++) {
                const zebra = (r - dataStart) % 2 === 1 ? rowFillB : rowFillA;

                for (let c = 0; c < colCount; c++) {
                    const addr = `${colLetter(c)}${r}`;

                    setCellStyle(ws, addr, {
                        fill: zebra,
                        border: borderAll,
                        alignment: align(c === 0 ? "left" : "center"),
                        font: font(false, "FF0F172A"),
                    });

                    if (c >= 1 && c !== perfColIndex && ws[addr]) ws[addr].z = "#,##0";

                    // late renklendirme
                    if (c === lateColIndex && ws[addr]) {
                        const lateCount = ws[addr].v ?? 0;
                        setCellStyle(ws, addr, {
                            fill: lateFill(lateCount),
                            font: font(true, "FFFFFFFF"),
                            alignment: align("center"),
                            border: borderAll,
                        });
                    }

                    // perf renklendirme (TALEP YOK renksiz)
                    if (c === perfColIndex && ws[addr]) {
                        const v = ws[addr].v;
                        if (typeof v !== "number") {
                            setCellStyle(ws, addr, {
                                fill: zebra,
                                border: borderAll,
                                alignment: align("center"),
                                font: font(true, "FF64748B"),
                            });
                            delete ws[addr].z;
                        } else {
                            setCellStyle(ws, addr, {
                                fill: perfFill(v),
                                font: font(true, "FFFFFFFF"),
                                alignment: align("center"),
                                border: borderAll,
                            });
                            ws[addr].z = '0"%"';
                        }
                    }
                }
            }
        };

        const buildRegionSheet = (sheetName, rows, metaLeftText) => {
            const today = new Date();
            const meta1 = [metaLeftText, ...Array(headers.length - 1).fill("")];
            const meta2 = [`Oluşturma: ${today.toLocaleString("tr-TR")}`, ...Array(headers.length - 1).fill("")];
            const blank = Array(headers.length).fill("");

            const aoa = [meta1, meta2, blank, headers];
            rows.forEach((r) => aoa.push(headers.map((h) => r[h] ?? "")));

            // totals
            const totals = rows.reduce(
                (acc, r) => {
                    acc.TALEP += Number(r["TALEP"] || 0);
                    acc.TEDARİK += Number(r["TEDARİK"] || 0);
                    acc.EDİLMEYEN += Number(r["EDİLMEYEN"] || 0);
                    acc.GEC += Number(r["GEÇ TEDARİK"] || 0);
                    acc.SPOT += Number(r["SPOT"] || 0);
                    acc.FILO += Number(r["FİLO"] || 0);
                    acc.SHO_VAR += Number(r["SHÖ VAR"] || 0);
                    acc.SHO_YOK += Number(r["SHÖ YOK"] || 0);
                    return acc;
                },
                { TALEP: 0, TEDARİK: 0, EDİLMEYEN: 0, GEC: 0, SPOT: 0, FILO: 0, SHO_VAR: 0, SHO_YOK: 0 }
            );

            const totalPerf = perfFrom(totals.TALEP, totals.EDİLMEYEN);

            aoa.push(blank);
            aoa.push([
                "TOPLAM",
                totals.TALEP,
                totals.TEDARİK,
                totals.EDİLMEYEN,
                totals.GEC,
                totals.SPOT,
                totals.FILO,
                totals.SHO_VAR,
                totals.SHO_YOK,
                totalPerf,
            ]);

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            applySheetStyling(ws, rows.length);

            // totals row özel
            const totalRowIdx = 4 + rows.length + 2;
            const perfColIndex = headers.indexOf("TEDARİK ORANI (%)");
            const lateColIndex = headers.indexOf("GEÇ TEDARİK");

            for (let c = 0; c < headers.length; c++) {
                const addr = `${colLetter(c)}${totalRowIdx}`;
                if (!ws[addr]) continue;

                setCellStyle(ws, addr, {
                    font: font(true, "FFFFFFFF"),
                    fill: fill("FF0F172A"),
                    alignment: align(c === 0 ? "left" : "center"),
                    border: borderAll,
                });

                if (c >= 1 && c !== perfColIndex) ws[addr].z = "#,##0";

                if (c === lateColIndex) {
                    const lateCount = ws[addr].v ?? 0;
                    setCellStyle(ws, addr, { fill: lateFill(lateCount), font: font(true, "FFFFFFFF") });
                }

                if (c === perfColIndex) {
                    const v = ws[addr].v;
                    if (typeof v === "number") {
                        setCellStyle(ws, addr, { fill: perfFill(v), font: font(true, "FFFFFFFF") });
                        ws[addr].z = '0"%"';
                    } else {
                        delete ws[addr].z;
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
        };

        /* ---------------------- 1) region sheets ---------------------- */
        Object.keys(REGIONS).forEach((bolge) => {
            const bolgeListesi = REGIONS[bolge] || [];
            const rows = buildRowsFromProjectList(bolgeListesi);
            buildRegionSheet(bolge, rows, `Bölge: ${bolge}`);
        });

        /* ---------------------- 2) TÜM PROJELER sheet ---------------------- */
        const tumProjelerListesi = Array.from(new Set(Object.values(REGIONS).flatMap((arr) => (Array.isArray(arr) ? arr : []))));
        tumProjelerListesi.sort((a, b) => String(a).localeCompare(String(b), "tr"));

        const allRows = buildRowsFromProjectList(tumProjelerListesi);
        buildRegionSheet("TÜM PROJELER", allRows, "Tüm Bölgeler: TÜM PROJELER");

        /* ---------------------- 3) ANALİZ sheet (grafik gibi bar) ---------------------- */
        const buildAnalizSheet = (rows) => {
            // Sadece lazım olan kolonlar + bar kolonu
            const ANALIZ_HEADERS = ["PROJE", "TALEP", "TEDARİK", "EDİLMEYEN", "TEDARİK ORANI (%)", "GRAFİK"];

            // sıralama: önce performans (TALEP YOK en alta), sonra talep
            const sorted = [...rows].sort((a, b) => {
                const ap = typeof a["TEDARİK ORANI (%)"] === "number" ? a["TEDARİK ORANI (%)"] : -1;
                const bp = typeof b["TEDARİK ORANI (%)"] === "number" ? b["TEDARİK ORANI (%)"] : -1;
                if (bp !== ap) return bp - ap;
                return (b["TALEP"] || 0) - (a["TALEP"] || 0);
            });

            const today = new Date();
            const meta1 = ["ANALİZ: TÜM PROJELER (ORAN GRAFİĞİ)", ...Array(ANALIZ_HEADERS.length - 1).fill("")];
            const meta2 = [`Oluşturma: ${today.toLocaleString("tr-TR")}`, ...Array(ANALIZ_HEADERS.length - 1).fill("")];
            const blank = Array(ANALIZ_HEADERS.length).fill("");

            const aoa = [meta1, meta2, blank, ANALIZ_HEADERS];

            sorted.forEach((r) => {
                aoa.push([
                    r["PROJE"],
                    r["TALEP"],
                    r["TEDARİK"],
                    r["EDİLMEYEN"],
                    r["TEDARİK ORANI (%)"],
                    "", // GRAFİK (formülle dolduracağız)
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            // kol genişlikleri
            ws["!cols"] = [
                { wch: 46 },
                { wch: 10 },
                { wch: 10 },
                { wch: 12 },
                { wch: 16 },
                { wch: 34 }, // bar
            ];

            // header satır stilleri
            applySheetStyling(ws, sorted.length, ws["!cols"], "TEDARİK ORANI (%)");

            // Grafik bar formülleri:
            // Oran E kolonu, Bar F kolonu: =IF(E5="TALEP YOK","",REPT("█",ROUND(E5/5,0))&REPT("░",20-ROUND(E5/5,0)))
            const startRow = 5;
            const endRow = 4 + sorted.length;

            for (let r = startRow; r <= endRow; r++) {
                const perfCell = `E${r}`;
                const barCell = `F${r}`;

                // Formül
                ws[barCell] = ws[barCell] || {};
                ws[barCell].f =
                    `IF(${perfCell}="TALEP YOK","",REPT("█",ROUND(${perfCell}/5,0))&REPT("░",20-ROUND(${perfCell}/5,0)))`;

                // Bar görünümü (font monospaced gibi olsun)
                ws[barCell].s = {
                    font: { name: "Consolas", bold: true, color: { rgb: "FF0F172A" } },
                    alignment: align("left"),
                    border: borderAll,
                    fill: ((r - startRow) % 2 === 1 ? rowFillB : rowFillA),
                };
            }

            XLSX.utils.book_append_sheet(wb, ws, "ANALİZ");
        };

        buildAnalizSheet(allRows);

        /* ---------------------- write ---------------------- */
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
        const fileName = `AnalizPanel_MODERN_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
    };



    return (
        <Box sx={{ width: "100%" }}>
            <Root>
                <Wide>
                    <TopBar elevation={0}>
                        <Grid>
                            {/* Sol: Başlık + KPI */}
                            <Stack spacing={1.2}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 18,
                                            bgcolor: isDark ? alpha("#ffffff", 0.08) : "#0f172a",
                                            display: "grid",
                                            placeItems: "center",
                                            boxShadow: t.shadowSoft,
                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "none",
                                        }}
                                    >
                                        <MdMonitor size={24} color={isDark ? "#e2e8f0" : "#fff"} />
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 1000, color: t.text, fontSize: "1.25rem", letterSpacing: "-0.7px" }}>
                                            ANALİZ PANELİ
                                        </Typography>
                                        <Typography sx={{ fontWeight: 800, color: t.subtext }}>
                                            Kart görünümü • Filtreleme • Zaman analizi • Rota
                                        </Typography>
                                    </Box>

                                    <Tooltip title="Bu panel, sefer açılışından yüklemeye kadar geçen süreyi (30 saat kuralı) baz alır.">
                                        <IconButton
                                            size="small"
                                            sx={{
                                                ml: "auto",
                                                bgcolor: t.muted,
                                                border: `1px solid ${t.borderSoft}`,
                                                color: t.text,
                                            }}
                                        >
                                            <MdInfoOutline />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                {/* KPI GRID */}
                                <Box
                                    sx={{
                                        mt: 0.4,
                                        display: "grid",
                                        gap: 1.2,
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            sm: "repeat(2, 1fr)",
                                            md: "repeat(5, 1fr)",
                                        },
                                    }}
                                >
                                    <ModernKPI
                                        t={t}
                                        accent={t.accent}
                                        title="Toplam Talep"
                                        value={kpi.plan}
                                        leftMeta={`Bölge: ${seciliBolge}`}
                                        icon={<MdTrendingUp size={18} />}
                                    />
                                    <ModernKPI
                                        t={t}
                                        accent={t.good}
                                        title="Tedarik Edilen"
                                        value={kpi.ted}
                                        leftMeta={`SPOT: ${kpi.spot}`}
                                        rightMeta={`FİLO: ${kpi.filo}`}
                                        icon={<MdBolt size={18} />}
                                    />
                                    <ModernKPI
                                        t={t}
                                        accent={t.bad}
                                        title="Tedarik Edilmeyen"
                                        value={kpi.edilmeyen}
                                        subtitle="Tedarik Edilmeyen"
                                        icon={<MdCancel size={18} />}
                                    />
                                    <ModernKPI
                                        t={t}
                                        accent={t.warn}
                                        title="Geç Tedarik"
                                        value={kpi.gec}
                                        subtitle="Geç tedarik"
                                        icon={<MdWarning size={18} />}
                                    />
                                    <ModernKPI
                                        t={t}
                                        accent={kpi.perf >= 90 ? t.good : kpi.perf >= 70 ? t.accent : t.warn}
                                        title="Tedarik Oranı"
                                        value={`%${kpi.perf}`}
                                        subtitle=""
                                        icon={<MdTrendingUp size={18} />}
                                    />
                                </Box>
                            </Stack>

                            {/* Sağ: Kontroller */}
                            <Stack spacing={1.5} alignItems="stretch" justifyContent="space-between">
                                {/* Region Selector */}
                                <Box
                                    sx={{
                                        position: "relative",
                                        display: "inline-flex",
                                        p: "6px",
                                        borderRadius: "20px",
                                        bgcolor: t.surface2,
                                        backdropFilter: "blur(20px)",
                                        border: `1px solid ${t.border}`,
                                        boxShadow: t.shadowSoft,
                                    }}
                                >
                                    <Box sx={{ display: "flex", gap: "4px", position: "relative" }}>
                                        {Object.keys(REGIONS).map((r) => {
                                            const selected = seciliBolge === r;
                                            const count = REGIONS[r]?.length ?? 0;

                                            return (
                                                <Box key={r} sx={{ position: "relative" }}>
                                                    {selected && (
                                                        <motion.div
                                                            layoutId="elegantActiveTab"
                                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                            style={{
                                                                position: "absolute",
                                                                inset: 0,
                                                                borderRadius: "14px",
                                                                backgroundColor: isDark ? "#ffffff" : "#0f172a",
                                                                boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                                                                zIndex: 0,
                                                            }}
                                                        />
                                                    )}

                                                    <ButtonBase
                                                        onClick={() => setSeciliBolge(r)}
                                                        sx={{
                                                            px: 2.5,
                                                            py: 1.2,
                                                            borderRadius: "14px",
                                                            zIndex: 1,
                                                            transition: "0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 1.5,
                                                            color: selected ? (isDark ? "#000" : "#fff") : t.subtext,
                                                            "&:hover": { color: selected ? undefined : t.text },
                                                        }}
                                                    >
                                                        <Typography sx={{ fontWeight: 900, fontSize: "0.85rem", letterSpacing: "-0.01em" }}>{r}</Typography>
                                                        <Box
                                                            sx={{
                                                                fontSize: "0.75rem",
                                                                fontWeight: 900,
                                                                opacity: selected ? 1 : 0.7,
                                                                paddingLeft: "8px",
                                                                borderLeft: `1px solid ${selected
                                                                        ? isDark
                                                                            ? "rgba(0,0,0,0.18)"
                                                                            : "rgba(255,255,255,0.22)"
                                                                        : t.borderSoft
                                                                    }`,
                                                            }}
                                                        >
                                                            {String(count).padStart(2, "0")}
                                                        </Box>
                                                    </ButtonBase>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>

                                {/* Search + Sort + Actions */}
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1.5}
                                    alignItems="center"
                                    sx={{
                                        p: 1,
                                        borderRadius: "24px",
                                        bgcolor: t.surface2,
                                        backdropFilter: "blur(10px)",
                                        border: `1px solid ${t.border}`,
                                        boxShadow: isDark ? "none" : t.shadowSoft,
                                    }}
                                >
                                    <TextField
                                        value={arama}
                                        onChange={(e) => setArama(e.target.value)}
                                        placeholder="Proje ara..."
                                        size="small"
                                        fullWidth
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "18px",
                                                bgcolor: t.surface3,
                                                transition: "0.2s",
                                                border: `1px solid ${t.borderSoft}`,
                                                "& fieldset": { border: "none" },
                                                "&:hover": { borderColor: t.border },
                                                "&.Mui-focused": {
                                                    boxShadow: `0 0 0 3px ${alpha(t.accent, 0.18)}`,
                                                    borderColor: alpha(t.accent, 0.45),
                                                },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MdSearch size={20} color={t.subtext} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Select
                                        value={sirala}
                                        onChange={(e) => setSirala(e.target.value)}
                                        size="small"
                                        sx={{
                                            minWidth: 180,
                                            borderRadius: "18px",
                                            bgcolor: t.surface3,
                                            border: `1px solid ${t.borderSoft}`,
                                            "& fieldset": { border: "none" },
                                            fontWeight: 800,
                                            fontSize: "0.85rem",
                                            color: t.text,
                                        }}
                                    >
                                        <MenuItem value="perf">⚡ Performans</MenuItem>
                                        <MenuItem value="plan">📊 Talep</MenuItem>
                                        <MenuItem value="late">⚠️ Gecikme</MenuItem>
                                    </Select>

                                    {/* ✅ Gecikenler */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: "18px",
                                            bgcolor: sadeceGecikenler ? alpha(t.bad, 0.12) : "transparent",
                                            border: `1px solid ${sadeceGecikenler ? alpha(t.bad, 0.22) : "transparent"}`,
                                            transition: "0.3s",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, whiteSpace: "nowrap", color: sadeceGecikenler ? t.bad : t.subtext }}>
                                            Gecikenler
                                        </Typography>
                                        <Switch
                                            size="small"
                                            checked={sadeceGecikenler}
                                            onChange={(e) => setSadeceGecikenler(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: t.bad },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: t.bad },
                                            }}
                                        />
                                    </Box>

                                    {/* ✅ Tedarik Edilmeyenler */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: "18px",
                                            bgcolor: sadeceTedarikEdilmeyenler ? alpha(t.warn, 0.14) : "transparent",
                                            border: `1px solid ${sadeceTedarikEdilmeyenler ? alpha(t.warn, 0.24) : "transparent"}`,
                                            transition: "0.3s",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, whiteSpace: "nowrap", color: sadeceTedarikEdilmeyenler ? t.warn : t.subtext }}>
                                            Tedarik Edilmeyenler
                                        </Typography>
                                        <Switch
                                            size="small"
                                            checked={sadeceTedarikEdilmeyenler}
                                            onChange={(e) => setSadeceTedarikEdilmeyenler(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: t.warn },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: t.warn },
                                            }}
                                        />
                                    </Box>

                                    <Stack direction="row" spacing={1}>
                                        {[
                                            { label: "Reel Tarihler", icon: <MdHistory />, action: exceldenTarihleriIceriAl, loading: excelOkunuyor },
                                            { label: "Dışa Aktar", icon: <MdDownload />, action: bolgeyiExceleAktar },
                                        ].map((btn, i) => (
                                            <Tooltip key={i} title={btn.label}>
                                                <Box
                                                    onClick={btn.loading ? undefined : btn.action}
                                                    sx={{
                                                        px: 2,
                                                        py: 1,
                                                        borderRadius: "16px",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        fontSize: "0.8rem",
                                                        fontWeight: 900,
                                                        color: t.text,
                                                        bgcolor: t.surface3,
                                                        border: `1px solid ${t.borderSoft}`,
                                                        transition: "0.2s",
                                                        "&:hover": {
                                                            bgcolor: alpha(t.accent, 0.16),
                                                            borderColor: alpha(t.accent, 0.35),
                                                            transform: "translateY(-1px)",
                                                            boxShadow: `0 10px 24px ${alpha(t.accent, 0.12)}`,
                                                        },
                                                    }}
                                                >
                                                    {btn.loading ? "..." : btn.icon}
                                                    <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>
                                                        {btn.loading ? "Yükleniyor" : btn.label}
                                                    </Box>
                                                </Box>
                                            </Tooltip>
                                        ))}
                                    </Stack>
                                </Stack>

                                {/* Info bar */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: "24px",
                                        display: "flex",
                                        flexDirection: { xs: "column", md: "row" },
                                        alignItems: { md: "center" },
                                        justifyContent: "space-between",
                                        gap: 2,
                                        background: isDark
                                            ? `linear-gradient(145deg, ${alpha("#111827", 0.75)}, ${alpha("#0B1220", 0.75)})`
                                            : `linear-gradient(145deg, #ffffff, #f8fafc)`,
                                        border: `1px solid ${t.border}`,
                                        boxShadow: isDark ? "none" : t.shadowSoft,
                                    }}
                                >
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.good, boxShadow: `0 0 10px ${alpha(t.good, 0.6)}` }} />
                                            <Typography sx={{ fontWeight: 1000, fontSize: "1.1rem", color: t.text, letterSpacing: "-0.5px" }}>
                                                {satirlar.length} Aktif Proje
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: t.subtext, opacity: 0.9 }}>
                                            Detaylar için kart etkileşimlerini kullanın • Sefer & Rota
                                        </Typography>
                                    </Stack>

                                    <Stack direction={{ xs: "row", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.8,
                                                borderRadius: "12px",
                                                bgcolor: alpha(t.accent, 0.10),
                                                border: `1px solid ${alpha(t.accent, 0.22)}`,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.8,
                                                    borderRadius: "12px",
                                                    bgcolor: alpha(t.good, 0.10),
                                                    border: `1px solid ${alpha(t.good, 0.22)}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                }}
                                            >
                                                <MdBolt size={16} color={t.good} />
                                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: t.good }}>
                                                    {printsLoading ? "Basım: Yükleniyor..." : `Basım: ${printsCount} bulundu`}
                                                </Typography>
                                            </Box>

                                            <MdDownload size={16} color={t.accent} />
                                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: t.accent }}>
                                                {Object.keys(excelTarihleriSeferBazli || {}).length} Eşleşme
                                            </Typography>
                                        </Box>

                                        {excelIcerikBilgisi && (
                                            <Tooltip title={`Toplam: ${excelIcerikBilgisi.totalRows} satır / Tarih dolu: ${excelIcerikBilgisi.withAnyDate}`}>
                                                <Box
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.8,
                                                        borderRadius: "12px",
                                                        bgcolor: alpha(t.warn, 0.10),
                                                        border: `1px solid ${alpha(t.warn, 0.22)}`,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        cursor: "help",
                                                    }}
                                                >
                                                    <Box component="span" sx={{ fontSize: "0.75rem", fontWeight: 900, color: t.warn }}>
                                                        Excel: {excelIcerikBilgisi.withSefer} Sefer Bulundu
                                                    </Box>
                                                </Box>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </Box>
                            </Stack>
                        </Grid>
                    </TopBar>

                    {/* İçerik */}
                    <CardList>
                        <AnimatePresence initial={false}>
                            {satirlar.map((satir) => (
                                <ProjeSatiri
                                    key={satir.name}
                                    satir={satir}
                                    tumVeri={data}
                                    excelTarihleriSeferBazli={excelTarihleriSeferBazli}
                                    printsMap={printsMap}
                                    printsLoading={printsLoading}
                                />
                            ))}
                        </AnimatePresence>

                        {satirlar.length === 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: 26,
                                    border: `1px solid ${t.border}`,
                                    background: t.surface2,
                                    p: 6,
                                    textAlign: "center",
                                    boxShadow: t.shadowSoft,
                                }}
                            >
                                <Typography sx={{ fontWeight: 1000, color: t.text, fontSize: "1.2rem" }}>Sonuç bulunamadı</Typography>
                                <Typography sx={{ fontWeight: 800, color: t.subtext, mt: 0.6 }}>
                                    Arama kriterini değiştir veya filtreleri kapat.
                                </Typography>
                            </Paper>
                        )}
                    </CardList>
                </Wide>
            </Root>
        </Box>
    );
}
