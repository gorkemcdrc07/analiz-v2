// src/ozellikler/analiz-paneli/AnalizTablosu.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Chip,
    TextField,
    InputAdornment,
    Divider,
    Select,
    MenuItem,
    FormControl,
    Switch,
    FormControlLabel,
    Tooltip,
    IconButton,
    alpha,
    ButtonBase,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Mevcut import satırını bul ve bunları ekle:
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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import ProjeSatiri from "./bilesenler/ProjeSatiri";
import { REGIONS } from "../yardimcilar/veriKurallari";
import { metniNormalizeEt as norm, seferNoNormalizeEt } from "../yardimcilar/metin";
import { Root, Wide, TopBar, Grid, Grid2, KPI, CardList } from "../stiller/stilBilesenleri";

/* ------------------------ küçük yardımcılar (bu dosyada self-contained) ------------------------ */
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
    const s = String(v).trim();
    if (!s) return null;

    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
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

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

const isGecTedarik = (pickupDate, printedDate) => {
    const p = parseTRDateTime(pickupDate);
    const pr = parseTRDateTime(printedDate);
    if (!p || !pr) return false;

    // pickup'ın ertesi günü 10:30
    const cutoff = new Date(p.getFullYear(), p.getMonth(), p.getDate() + 1, 10, 30, 0, 0);
    return pr.getTime() > cutoff.getTime();
};


const pickColumn = (rowObj, possibleNames) => {
    const keys = Object.keys(rowObj || {});
    const normKeys = keys.map((k) => ({ raw: k, n: norm(k) }));

    for (const nm of possibleNames) {
        const target = norm(nm);

        // 1) birebir
        const exact = normKeys.find((x) => x.n === target);
        if (exact) return rowObj[exact.raw];

        // 2) içeriyor
        const contains = normKeys.find((x) => x.n.includes(target));
        if (contains) return rowObj[contains.raw];
    }
    return undefined;
};

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

/* ------------------------ Ana UI ------------------------ */
export default function AnalizTablosu({ data, printsMap = {}, printsLoading = false }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [seciliBolge, setSeciliBolge] = useState("GEBZE");
    const [arama, setArama] = useState("");
    const [sirala, setSirala] = useState("perf"); // perf | plan | late
    const [sadeceGecikenler, setSadeceGecikenler] = useState(false);

    // Excel’den okunacak zamanlar (Sefer No -> 6 tarih alanı)
    const [excelTarihleriSeferBazli, setExcelTarihleriSeferBazli] = useState({});
    const [excelIcerikBilgisi, setExcelIcerikBilgisi] = useState(null);
    const [excelOkunuyor, setExcelOkunuyor] = useState(false);

    // ✅ Excel seç -> oku -> sefer no’ya göre map
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
                        const seferNoRaw = pickColumn(r, [
                            "Sefer Numarası",
                            "Sefer No",
                            "SeferNo",
                            "Sefer",
                            "Sefer Numarasi",
                        ]);
                        const seferKey = seferNoNormalizeEt(seferNoRaw);
                        if (!seferKey) return;

                        const nextObj = {
                            yukleme_varis: excelCellToISO(
                                pickColumn(r, ["Yükleme Noktası Varış Zamanı", "Yükleme Varış"])
                            ),
                            yukleme_giris: excelCellToISO(
                                pickColumn(r, ["Yükleme Noktasına Giriş Zamanı", "Yükleme Giriş"])
                            ),
                            yukleme_cikis: excelCellToISO(
                                pickColumn(r, ["Yükleme Noktası Çıkış Zamanı", "Yükleme Çıkış"])
                            ),
                            teslim_varis: excelCellToISO(
                                pickColumn(r, ["Teslim Noktası Varış Zamanı", "Teslim Varış"])
                            ),
                            teslim_giris: excelCellToISO(
                                pickColumn(r, ["Teslim Noktasına Giriş Zamanı", "Teslim Giriş"])
                            ),
                            teslim_cikis: excelCellToISO(
                                pickColumn(r, ["Teslim Noktası Çıkış Zamanı", "Teslim Çıkış"])
                            ),
                        };

                        map[seferKey] = mergeKeepFilled(map[seferKey], nextObj);
                    });

                    const totalRows = json.length;
                    const withSefer = Object.keys(map).length;

                    const withAnyDate = Object.values(map).filter((t) =>
                        [t.yukleme_varis, t.yukleme_giris, t.yukleme_cikis, t.teslim_varis, t.teslim_giris, t.teslim_cikis].some(
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

            // KÜÇÜKBAY
            if (pNorm === norm("KÜÇÜKBAY FTL")) {
                const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
                if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
                else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
                else return;
            }

            // PEPSİ
            if (pNorm === norm("PEPSİ FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
                else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
            }

            // EBEBEK
            if (pNorm === norm("EBEBEK FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
            }

            // FAKİR
            if (pNorm === norm("FAKİR FTL")) {
                const c = norm(item.PickupCityName);
                const d = norm(item.PickupCountyName);
                if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
            }

            // OTTONYA
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
                    gec_tedarik: new Set(), // ✅ geç tedarik sayacağımız set
                };
            }

            const s = stats[key];

            // kapsam filtresi
            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                service === norm("YURTİÇİ FRİGO HİZMETLERİ");
            if (!inScope) return;

            // reqNo normalize (BOS kontrolü)
            const reqNoRaw = (item.TMSVehicleRequestDocumentNo || "").toString();
            const reqNoKey = reqNoRaw
                .replace(/\u00A0/g, " ")
                .replace(/\u200B/g, "")
                .replace(/\r?\n/g, " ")
                .trim();
            const reqNoUp = reqNoKey.toLocaleUpperCase("tr-TR");

            if (reqNoKey && !reqNoUp.startsWith("BOS")) {
                s.plan.add(reqNoUp);
            }

            // despNo tek format
            const despNoRaw = (item.TMSDespatchDocumentNo || "").toString();
            const despKey = seferNoNormalizeEt(despNoRaw);
            if (!despKey || !despKey.startsWith("SFR")) return;

            // İptal
            const statu = sayiCevir(item.OrderStatu);
            if (statu === 200) {
                s.iptal.add(despKey);
                return;
            }

            // Ted
            s.ted.add(despKey);

            // Filo/Spot
            const vw = norm(item.VehicleWorkingName);
            const isFilo = vw === norm("FİLO") || vw === norm("ÖZMAL") || vw === norm("MODERN AMBALAJ FİLO");
            if (isFilo) s.filo.add(despKey);
            else s.spot.add(despKey);

            // Basım var/yok (TMS flag)
            if (booleanCevir(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            // ✅ GEÇ TEDARİK: PickupDate vs Prints(PrintedDate)
            const pr = printsMap?.[despKey]?.PrintedDate;
            if (pr && isGecTedarik(item.PickupDate, pr)) {
                s.gec_tedarik.add(despKey);
            }
        });

        return stats;
    }, [data, printsMap]);

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
                const edilmeyen = Math.max(0, plan - (ted + iptal));

                // ✅ GECIKME = GEÇ TEDARİK sayısı
                const gec = s.gec_tedarik?.size ?? 0;

                // istersen performansı “tedarik bazlı” hesapla:
                const zamaninda = Math.max(0, ted - gec);
                const yuzde = ted > 0 ? Math.round((zamaninda / ted) * 100) : 0;

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
            .filter((r) => (sadeceGecikenler ? r.gec > 0 : true));

        const sorted = [...base].sort((a, b) => {
            if (sirala === "plan") return b.plan - a.plan;
            if (sirala === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde;
        });

        return sorted;
    }, [seciliBolge, islenmisVeri, arama, sirala, sadeceGecikenler]);

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

        // Zamanında oranı: "tedarik edilenler içinde zamanında" (en net olanı bu)
        sum.perf = sum.ted ? Math.round((sum.zamaninda / sum.ted) * 100) : 0;

        return sum;
    }, [satirlar]);
    const printsCount = useMemo(() => Object.keys(printsMap || {}).length, [printsMap]);


    // ✅ Excel export: seçili bölgedeki TÜM projeler (filtrelerden bağımsız)
    // ✅ Tam, renkli + modern Excel export (TÜM bölgeler tek dosyada, her bölge ayrı sheet)
    // İstenen değişiklikler:
    // - "Zamanında" ve "Zamanında %" kaldırıldı
    // - "İptal" kaldırıldı
    // - "Gecikme" yerine "Geç Tedarik" kullanıldı

    const bolgeyiExceleAktar = () => {
        const toSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

        // --- küçük stil helper'ları (xlsx cell style) ---
        const font = (bold = false, color = "FF0F172A") => ({ bold, color: { rgb: color } });
        const fill = (rgb) => ({ patternType: "solid", fgColor: { rgb } });
        const borderAll = {
            top: { style: "thin", color: { rgb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
            left: { style: "thin", color: { rgb: "FFE5E7EB" } },
            right: { style: "thin", color: { rgb: "FFE5E7EB" } },
        };
        const align = (horizontal = "center") => ({ vertical: "center", horizontal, wrapText: true });

        // "Geç Tedarik" için renkler
        const lateFill = (lateCount) => {
            const n = Number(lateCount) || 0;
            if (n >= 10) return fill("FFB91C1C"); // koyu kırmızı
            if (n >= 1) return fill("FFF97316");  // turuncu
            return fill("FF0EA5E9");              // 0 ise mavi
        };

        const setCellStyle = (ws, addr, style) => {
            if (!ws[addr]) return;
            ws[addr].s = { ...(ws[addr].s || {}), ...style };
        };

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

        const wb = XLSX.utils.book_new();

        // ✅ Yeni header seti (Zamanında + % yok, İptal yok)
        const headers = [
            "Proje",
            "Talep",
            "Tedarik",
            "Edilmeyen",
            "Geç Tedarik",
            "SPOT",
            "FİLO",
            "SHÖ Var",
            "SHÖ Yok",
        ];

        Object.keys(REGIONS).forEach((bolge) => {
            const bolgeListesi = REGIONS[bolge] || [];

            const rows = bolgeListesi.map((projeAdi) => {
                const raw = islenmisVeri[norm(projeAdi)] || {};

                const plan = toSet(raw.plan).size;
                const ted = toSet(raw.ted).size;

                const spot = toSet(raw.spot).size;
                const filo = toSet(raw.filo).size;
                const shoVar = toSet(raw.sho_b).size;
                const shoYok = toSet(raw.sho_bm).size;

                const gecTedarik = toSet(raw.gec_tedarik).size;

                // ✅ İptal kalktı: edilmeyen = plan - tedarik
                const edilmeyen = Math.max(0, plan - ted);

                return {
                    Proje: projeAdi,
                    Talep: plan,
                    Tedarik: ted,
                    Edilmeyen: edilmeyen,
                    "Geç Tedarik": gecTedarik,
                    SPOT: spot,
                    FİLO: filo,
                    "SHÖ Var": shoVar,
                    "SHÖ Yok": shoYok,
                };
            });

            // üst meta satırları
            const today = new Date();
            const meta1 = [`Bölge: ${bolge}`, ...Array(headers.length - 1).fill("")];
            const meta2 = [`Oluşturma: ${today.toLocaleString("tr-TR")}`, ...Array(headers.length - 1).fill("")];
            const blank = Array(headers.length).fill("");

            const aoa = [meta1, meta2, blank, headers];
            rows.forEach((r) => aoa.push(headers.map((h) => r[h] ?? "")));

            // totals
            const totals = rows.reduce(
                (acc, r) => {
                    acc.Talep += Number(r["Talep"] || 0);
                    acc.Tedarik += Number(r["Tedarik"] || 0);
                    acc.Edilmeyen += Number(r["Edilmeyen"] || 0);
                    acc.GecTedarik += Number(r["Geç Tedarik"] || 0);
                    acc.SPOT += Number(r["SPOT"] || 0);
                    acc.FİLO += Number(r["FİLO"] || 0);
                    acc.ShoVar += Number(r["SHÖ Var"] || 0);
                    acc.ShoYok += Number(r["SHÖ Yok"] || 0);
                    return acc;
                },
                {
                    Talep: 0,
                    Tedarik: 0,
                    Edilmeyen: 0,
                    GecTedarik: 0,
                    SPOT: 0,
                    FİLO: 0,
                    ShoVar: 0,
                    ShoYok: 0,
                }
            );

            aoa.push(blank);
            aoa.push([
                "BÖLGE TOPLAM",
                totals.Talep,
                totals.Tedarik,
                totals.Edilmeyen,
                totals.GecTedarik,
                totals.SPOT,
                totals.FİLO,
                totals.ShoVar,
                totals.ShoYok,
            ]);

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            // Kolon genişlikleri (Proje geniş)
            ws["!cols"] = [
                { wch: 44 }, // Proje
                { wch: 10 }, // Talep
                { wch: 10 }, // Tedarik
                { wch: 12 }, // Edilmeyen
                { wch: 12 }, // Geç Tedarik
                { wch: 10 }, // SPOT
                { wch: 10 }, // FİLO
                { wch: 10 }, // SHÖ Var
                { wch: 10 }, // SHÖ Yok
            ];

            // Freeze: ilk 4 satır (meta/meta/blank/header)
            ws["!freeze"] = { xSplit: 0, ySplit: 4 };

            // AutoFilter: header satırı
            ws["!autofilter"] = { ref: `A4:${colLetter(headers.length - 1)}4` };

            // ---- Stil uygulama ----

            // Meta satırları
            for (let c = 0; c < headers.length; c++) {
                const a1 = `${colLetter(c)}1`;
                const a2 = `${colLetter(c)}2`;

                setCellStyle(ws, a1, {
                    font: font(true, "FFFFFFFF"),
                    fill: fill("FF0F172A"),
                    alignment: align("left"),
                    border: borderAll,
                });

                setCellStyle(ws, a2, {
                    font: font(true, "FF0F172A"),
                    fill: fill("FFDBEAFE"),
                    alignment: align("left"),
                    border: borderAll,
                });
            }

            // Header
            for (let c = 0; c < headers.length; c++) {
                const addr = `${colLetter(c)}4`;
                setCellStyle(ws, addr, {
                    font: font(true, "FFFFFFFF"),
                    fill: fill("FF111827"),
                    alignment: align("center"),
                    border: borderAll,
                });
            }

            // Data satırları
            const dataStart = 5;
            const dataEnd = 4 + rows.length;

            // "Geç Tedarik" kolon index'i
            const lateColIndex = headers.indexOf("Geç Tedarik");

            for (let r = dataStart; r <= dataEnd; r++) {
                const isAlt = (r - dataStart) % 2 === 1;
                const rowFill = isAlt ? "FFF8FAFC" : "FFFFFFFF";

                for (let c = 0; c < headers.length; c++) {
                    const addr = `${colLetter(c)}${r}`;

                    setCellStyle(ws, addr, {
                        fill: fill(rowFill),
                        border: borderAll,
                        alignment: align(c === 0 ? "left" : "center"),
                        font: font(false, "FF0F172A"),
                    });

                    // sayı formatları (binlik) -> Proje hariç hepsi
                    if (c >= 1) {
                        if (ws[addr]) ws[addr].z = "#,##0";
                    }

                    // Geç Tedarik sütunu renkli vurgu
                    if (c === lateColIndex) {
                        const lateCount = ws[addr]?.v ?? 0;
                        setCellStyle(ws, addr, {
                            fill: lateFill(lateCount),
                            font: font(true, "FFFFFFFF"),
                            alignment: align("center"),
                            border: borderAll,
                        });
                    }
                }
            }

            // Total satırı
            const totalRowIdx = 4 + rows.length + 2;

            for (let c = 0; c < headers.length; c++) {
                const addr = `${colLetter(c)}${totalRowIdx}`;

                setCellStyle(ws, addr, {
                    font: font(true, "FFFFFFFF"),
                    fill: fill("FF111827"),
                    alignment: align(c === 0 ? "left" : "center"),
                    border: borderAll,
                });

                if (c >= 1) {
                    if (ws[addr]) ws[addr].z = "#,##0";
                }

                // Total Geç Tedarik renklendirme
                if (c === lateColIndex) {
                    const lateCount = ws[addr]?.v ?? 0;
                    setCellStyle(ws, addr, {
                        fill: lateFill(lateCount),
                        font: font(true, "FFFFFFFF"),
                        alignment: align("center"),
                        border: borderAll,
                    });
                }
            }

            const safeSheetName = String(bolge).slice(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });

        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const fileName = `AnalizPanel_MODERN_RENKLI_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
                                            boxShadow: isDark
                                                ? "0 18px 45px rgba(0,0,0,0.55)"
                                                : "0 18px 45px rgba(2,6,23,0.22)",
                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "none",
                                        }}
                                    >
                                        <MdMonitor size={24} color={isDark ? "#e2e8f0" : "#fff"} />
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 1000,
                                                color: theme.palette.text.primary,
                                                fontSize: "1.25rem",
                                                letterSpacing: "-0.7px",
                                            }}
                                        >
                                            ANALİZ PANELİ
                                        </Typography>
                                        <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
                                            Kart görünümü • Filtreleme • Zaman analizi • Rota
                                        </Typography>
                                    </Box>

                                    <Tooltip title="Bu panel, sefer açılışından yüklemeye kadar geçen süreyi (30 saat kuralı) baz alır.">
                                        <IconButton
                                            size="small"
                                            sx={{
                                                ml: "auto",
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.05),
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                color: theme.palette.text.primary,
                                            }}
                                        >
                                            <MdInfoOutline />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                <Grid2>
                                    {/* 1) TOPLAM TALEP */}
                                    <KPI accent="#0ea5e9" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            TOPLAM TALEP
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "1.55rem",
                                                fontWeight: 1000,
                                                color: theme.palette.text.primary,
                                            }}
                                        >
                                            {kpi.plan}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdTrendingUp color="#0ea5e9" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Bölge: {seciliBolge}
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 2) TEDARİK EDİLEN */}
                                    <KPI accent="#10b981" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            TEDARİK EDİLEN
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#10b981" }}>
                                            {kpi.ted}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdBolt color="#10b981" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Aktif seferler
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 3) TEDARİK EDİLMEYEN */}
                                    <KPI accent="#ef4444" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            TEDARİK EDİLMEYEN
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#ef4444" }}>
                                            {kpi.edilmeyen}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdCancel color="#ef4444" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Plan - (Tedarik + İptal)
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 4) TOPLAM SPOT */}
                                    <KPI accent="#a855f7" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            TOPLAM SPOT
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: theme.palette.text.primary }}>
                                            {kpi.spot}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdTrendingUp color="#a855f7" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Spot seferler
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 5) TOPLAM FİLO */}
                                    <KPI accent="#0ea5e9" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            TOPLAM FİLO
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: theme.palette.text.primary }}>
                                            {kpi.filo}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdMonitor color="#0ea5e9" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Filo / ÖZmal
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 6) ZAMANINDA ORANI (tedarik bazlı) */}
                                    <KPI accent={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            ZAMANINDA ORANI
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "1.55rem",
                                                fontWeight: 1000,
                                                color: kpi.perf >= 90 ? "#10b981" : "#f59e0b",
                                            }}
                                        >
                                            %{kpi.perf}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdWarning color={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Zamanında / Tedarik
                                            </Typography>
                                        </Stack>
                                    </KPI>

                                    {/* 7) GECİKME */}
                                    <KPI accent="#f59e0b" whileHover={{ scale: 1.01 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "0.62rem",
                                                fontWeight: 950,
                                                color: theme.palette.text.secondary,
                                                letterSpacing: "0.8px",
                                            }}
                                        >
                                            GECİKME
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#f59e0b" }}>
                                            {kpi.gec}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdWarning color="#f59e0b" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                Geç tedarik (cutoff: +1 gün 10:30)
                                            </Typography>
                                        </Stack>
                                    </KPI>
                                </Grid2>

                            </Stack>

                            {/* Sağ: Kontroller */}
                            <Stack spacing={1.5} alignItems="stretch" justifyContent="space-between">
                                {/* Minimalist & High-Contrast Region Selector */}
                                <Box
                                    sx={{
                                        position: "relative",
                                        display: "inline-flex",
                                        p: "6px",
                                        borderRadius: "20px",
                                        bgcolor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.7)",
                                        backdropFilter: "blur(20px)",
                                        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}`,
                                        boxShadow: isDark ? "0 10px 30px -10px rgba(0,0,0,0.5)" : "0 10px 30px -10px rgba(0,0,0,0.05)",
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
                                                                backgroundColor: isDark ? "#ffffff" : "#0f172a", // Tam zıt renkler (Okunabilirlik anahtarı)
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
                                                            // Renkler tam kontrastlı: Seçiliyse zıt renk, değilse ana metin rengi
                                                            color: selected
                                                                ? (isDark ? "#000000" : "#ffffff")
                                                                : (isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.6)"),
                                                            "&:hover": {
                                                                color: selected ? null : (isDark ? "#fff" : "#000"),
                                                            }
                                                        }}
                                                    >
                                                        <Typography sx={{
                                                            fontWeight: 800, // Kalın yazı tipi (Okunabilirlik)
                                                            fontSize: "0.85rem",
                                                            letterSpacing: "-0.01em"
                                                        }}>
                                                            {r}
                                                        </Typography>

                                                        {/* Sayılar: Net, temiz ve ayrıştırılmış */}
                                                        <Box
                                                            sx={{
                                                                fontSize: "0.75rem",
                                                                fontWeight: 900,
                                                                opacity: selected ? 1 : 0.6,
                                                                // Seçiliyken sayının altına çok hafif bir çizgi veya farklılık ekleyerek netleştirelim
                                                                paddingLeft: "8px",
                                                                borderLeft: `1px solid ${selected
                                                                    ? (isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)")
                                                                    : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
                                                                    }`,
                                                            }}
                                                        >
                                                            {String(count).padStart(2, '0')} {/* 01, 02 gibi göstererek teknik bir hava katar */}
                                                        </Box>
                                                    </ButtonBase>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    spacing={1.5}
                                    alignItems="center"
                                    sx={{
                                        p: 1,
                                        borderRadius: "24px",
                                        bgcolor: isDark ? alpha("#1e293b", 0.4) : "#f8fafc",
                                        backdropFilter: "blur(8px)",
                                        border: `1px solid ${isDark ? alpha("#ffffff", 0.05) : "#e2e8f0"}`
                                    }}
                                >
                                    {/* Arama Alanı - Daha Soft */}
                                    <TextField
                                        value={arama}
                                        onChange={(e) => setArama(e.target.value)}
                                        placeholder="Proje ara..."
                                        size="small"
                                        fullWidth
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "18px",
                                                bgcolor: isDark ? alpha("#0f172a", 0.4) : "#fff",
                                                transition: "0.2s",
                                                "& fieldset": { border: "none" },
                                                "&:hover": { bgcolor: isDark ? alpha("#0f172a", 0.6) : "#fff" },
                                                "&.Mui-focused": {
                                                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                                                    bgcolor: isDark ? alpha("#0f172a", 0.8) : "#fff"
                                                }
                                            }
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MdSearch size={20} color={theme.palette.text.secondary} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    {/* Sıralama - Minimalist */}
                                    <Select
                                        value={sirala}
                                        onChange={(e) => setSirala(e.target.value)}
                                        size="small"
                                        sx={{
                                            minWidth: 180,
                                            borderRadius: "18px",
                                            bgcolor: isDark ? alpha("#0f172a", 0.4) : "#fff",
                                            "& fieldset": { border: "none" },
                                            fontWeight: 600,
                                            fontSize: "0.85rem"
                                        }}
                                    >
                                        <MenuItem value="perf">⚡ Performans</MenuItem>
                                        <MenuItem value="plan">📊 Talep</MenuItem>
                                        <MenuItem value="late">⚠️ Gecikme</MenuItem>
                                    </Select>

                                    {/* Switch Alanı - Buton Görünümlü */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: "18px",
                                            bgcolor: sadeceGecikenler ? alpha("#ef4444", 0.1) : "transparent",
                                            border: `1px solid ${sadeceGecikenler ? alpha("#ef4444", 0.2) : "transparent"}`,
                                            transition: "0.3s"
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", color: sadeceGecikenler ? "#ef4444" : "text.secondary" }}>
                                            Gecikenler
                                        </Typography>
                                        <Switch
                                            size="small"
                                            checked={sadeceGecikenler}
                                            onChange={(e) => setSadeceGecikenler(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#ef4444" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#ef4444" }
                                            }}
                                        />
                                    </Box>

                                    {/* İşlem Butonları - Ghost Style */}
                                    <Stack direction="row" spacing={1}>
                                        {[
                                            { label: "Reel Tarihler", icon: <MdHistory />, action: exceldenTarihleriIceriAl, loading: excelOkunuyor },
                                            { label: "Dışa Aktar", icon: <MdDownload />, action: bolgeyiExceleAktar }
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
                                                        fontWeight: 800,
                                                        color: theme.palette.text.primary,
                                                        bgcolor: isDark ? alpha("#ffffff", 0.05) : "#fff",
                                                        border: `1px solid ${isDark ? alpha("#ffffff", 0.1) : "#e2e8f0"}`,
                                                        transition: "0.2s",
                                                        "&:hover": {
                                                            bgcolor: theme.palette.primary.main,
                                                            color: "#fff",
                                                            transform: "translateY(-1px)",
                                                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                                                        }
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
                                            ? `linear-gradient(145deg, ${alpha("#1e293b", 0.9)}, ${alpha("#0f172a", 0.9)})`
                                            : `linear-gradient(145deg, #ffffff, #f8fafc)`,
                                        border: `1px solid ${isDark ? alpha("#ffffff", 0.08) : "#e2e8f0"}`,
                                        boxShadow: isDark ? "none" : "0 4px 20px -5px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    {/* Sol Taraf: Ana Bilgi */}
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                                            <Typography sx={{ fontWeight: 1000, fontSize: "1.1rem", color: theme.palette.text.primary, letterSpacing: "-0.5px" }}>
                                                {satirlar.length} Aktif Proje
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ fontWeight: 600, fontSize: "0.75rem", color: theme.palette.text.secondary, opacity: 0.8 }}>
                                            Detaylar için kart etkileşimlerini kullanın • Sefer & Rota
                                        </Typography>
                                    </Stack>

                                    {/* Sağ Taraf: Excel Durum Hapları */}
                                    <Stack direction={{ xs: "row", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.8,
                                                borderRadius: "12px",
                                                bgcolor: isDark ? alpha("#0ea5e9", 0.1) : alpha("#0ea5e9", 0.05),
                                                border: `1px solid ${alpha("#0ea5e9", 0.2)}`,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.8,
                                                    borderRadius: "12px",
                                                    bgcolor: isDark ? alpha("#10b981", 0.10) : alpha("#10b981", 0.06),
                                                    border: `1px solid ${alpha("#10b981", 0.20)}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                }}
                                            >
                                                <MdBolt size={16} color="#10b981" />
                                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: isDark ? "#34d399" : "#059669" }}>
                                                    {printsLoading ? "Basım: Yükleniyor..." : `Basım: ${printsCount} bulundu`}
                                                </Typography>
                                            </Box>

                                            <MdDownload size={16} color="#0ea5e9" />
                                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: isDark ? "#38bdf8" : "#0284c7" }}>
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
                                                        bgcolor: isDark ? alpha("#f59e0b", 0.1) : alpha("#f59e0b", 0.05),
                                                        border: `1px solid ${alpha("#f59e0b", 0.2)}`,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        cursor: "help"
                                                    }}
                                                >
                                                    <Box component="span" sx={{ fontSize: "0.75rem", fontWeight: 800, color: isDark ? "#fbbf24" : "#b45309" }}>
                                                        Excel: {excelIcerikBilgisi.withSefer} Sefer Bulundu
                                                    </Box>
                                                </Box>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </Box>                            </Stack>
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
                                    border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                    background: isDark ? alpha("#0b1220", 0.72) : "rgba(255,255,255,0.85)",
                                    p: 6,
                                    textAlign: "center",
                                    boxShadow: isDark ? "0 18px 65px rgba(0,0,0,0.55)" : "0 16px 55px rgba(2,6,23,0.07)",
                                }}
                            >
                                <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "1.2rem" }}>
                                    Sonuç bulunamadı
                                </Typography>
                                <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.6 }}>
                                    Arama kriterini değiştir veya “Sadece gecikenler” filtresini kapat.
                                </Typography>
                            </Paper>
                        )}
                    </CardList>
                </Wide>
            </Root>
        </Box>
    );
}
