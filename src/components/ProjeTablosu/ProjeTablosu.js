// src/components/ProjeTablosu/ProjeTablosu.jsx

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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { MdMonitor, MdSearch, MdTrendingUp, MdWarning, MdCancel, MdBolt, MdInfoOutline } from "react-icons/md";

// local imports
import ProjectRow from "./ProjectRow";
import { REGIONS } from "./constants";
import { importTimesFromExcel } from "./excel";
import { norm } from "./utils";
import { Root, Wide, TopBar, Grid, Grid2, KPI, RegionTabs, RegionTab, CardList } from "./styles";

/* ------------------------ ana bileşen ------------------------ */
export default function ProjeTablosu({ data }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [selectedRegion, setSelectedRegion] = useState("GEBZE");
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("perf"); // perf | plan | late
    const [onlyLate, setOnlyLate] = useState(false);

    // ✅ Excel’den okunacak zamanlar (Sefer Numarası -> 6 tarih alanı)
    const [excelTimesBySefer, setExcelTimesBySefer] = useState({});
    const [excelImportInfo, setExcelImportInfo] = useState(null);

    // ✅ sadece UI için loading
    const [excelSyncLoading, setExcelSyncLoading] = useState(false);

    // ✅ Excel import handler (Reel Tarihler / FTS Tarihler butonları bunu çağırıyor)
    const handleExcelImport = () => {
        if (excelSyncLoading) return;

        importTimesFromExcel({
            setExcelSyncLoading,
            setExcelImportInfo,
            setExcelTimesBySefer,
        });
    };

    const processedData = useMemo(() => {
        // Bu kısım orijinal dosyada (UltraProjeTablosu içinde) aynen var.
        // Burada "ayrı dosyaya bölündü" varsayımı yok: ProjeTablosu sadece UI + state yönetir.
        // processedData'nın oluşması için aynı hesaplama mantığını kullanıyoruz.

        const src = Array.isArray(data) ? data : [];
        const stats = {};

        // yardımcılar (orijinal kodla birebir)
        const toNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const toBool = (v) => {
            if (v === true || v === false) return v;
            if (v === 1 || v === "1") return true;
            if (v === 0 || v === "0") return false;
            if (typeof v === "string") {
                const s = v.trim().toLowerCase();
                if (s === "true") return true;
                if (s === "false") return false;
            }
            return false;
        };
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
        const normalizeSeferKey = (v) => {
            const s = (v ?? "")
                .toString()
                .replace(/\u00A0/g, " ")
                .replace(/\u200B/g, "")
                .replace(/\r?\n/g, " ")
                .trim();

            if (!s) return "";

            const up = s.toLocaleUpperCase("tr-TR");

            const m = up.match(/SFR\s*\d+/);
            if (m) return m[0].replace(/\s+/g, "");

            if (/^\d{8,}$/.test(up)) return `SFR${up}`;

            return up.split(/\s+/)[0];
        };

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
                    ontime_req: new Set(),
                    late_req: new Set(),
                };
            }

            const s = stats[key];

            const service = norm(item.ServiceName);
            const inScope =
                service === norm("YURTİÇİ FTL HİZMETLERİ") ||
                service === norm("FİLO DIŞ YÜK YÖNETİMİ") ||
                service === norm("YURTİÇİ FRİGO HİZMETLERİ");
            if (!inScope) return;

            // ✅ reqNo normalize (BOS kontrolü)
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

            // ✅ despNo tek format
            const despNoRaw = (item.TMSDespatchDocumentNo || "").toString();
            const despKey = normalizeSeferKey(despNoRaw);
            if (!despKey || !despKey.startsWith("SFR")) return;

            // İptal
            const statu = toNum(item.OrderStatu);
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

            // Basım
            if (toBool(item.IsPrint)) s.sho_b.add(despKey);
            else s.sho_bm.add(despKey);

            // ✅ 30 saat kuralı (req bazlı set’leri doldur)
            const h = hoursDiff(item.TMSDespatchCreatedDate, item.PickupDate);
            if (reqNoKey && !reqNoUp.startsWith("BOS") && h != null) {
                if (h < 30) s.ontime_req.add(reqNoUp);
                else s.late_req.add(reqNoUp);
            }
        });

        return stats;
    }, [data]);

    const rows = useMemo(() => {
        const q = norm(query);
        const regionList = REGIONS[selectedRegion] || [];

        const base = regionList
            .map((pName) => {
                const s = processedData[norm(pName)] || {
                    plan: new Set(),
                    ted: new Set(),
                    iptal: new Set(),
                    filo: new Set(),
                    spot: new Set(),
                    sho_b: new Set(),
                    sho_bm: new Set(),
                    ontime_req: new Set(),
                    late_req: new Set(),
                };

                const plan = s.plan.size;
                const ted = s.ted.size;
                const iptal = s.iptal.size;
                const edilmeyen = Math.max(0, plan - (ted + iptal));
                const zamaninda = s.ontime_req.size;
                const gec = s.late_req.size;
                const yuzde = plan > 0 ? Math.round((zamaninda / plan) * 100) : 0;

                return {
                    name: pName,
                    plan,
                    ted,
                    edilmeyen,
                    iptal,
                    spot: s.spot.size,
                    filo: s.filo.size,
                    sho_b: s.sho_b.size,
                    sho_bm: s.sho_bm.size,
                    zamaninda,
                    gec,
                    yuzde,
                };
            })
            .filter((r) => r.plan > 0)
            .filter((r) => (q ? norm(r.name).includes(q) : true))
            .filter((r) => (onlyLate ? r.gec > 0 : true));

        const sorted = [...base].sort((a, b) => {
            if (sortBy === "plan") return b.plan - a.plan;
            if (sortBy === "late") return b.gec - a.gec;
            return b.yuzde - a.yuzde; // performans
        });

        return sorted;
    }, [selectedRegion, processedData, query, sortBy, onlyLate]);

    const kpi = useMemo(() => {
        const sum = rows.reduce(
            (acc, r) => {
                acc.plan += r.plan;
                acc.ted += r.ted;
                acc.gec += r.gec;
                acc.iptal += r.iptal;
                acc.zamaninda += r.zamaninda;
                return acc;
            },
            { plan: 0, ted: 0, gec: 0, iptal: 0, zamaninda: 0 }
        );
        sum.perf = sum.plan ? Math.round((sum.zamaninda / sum.plan) * 100) : 0;
        return sum;
    }, [rows]);

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
                                            boxShadow: isDark ? "0 18px 45px rgba(0,0,0,0.55)" : "0 18px 45px rgba(2,6,23,0.22)",
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
                                    <KPI accent="#0ea5e9" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            TOPLAM TALEP
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: theme.palette.text.primary }}>
                                            {kpi.plan}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdTrendingUp color="#0ea5e9" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Bölge: {selectedRegion}</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#10b981" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            TEDARİK EDİLEN
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: "#10b981" }}>{kpi.ted}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdBolt color="#10b981" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Aktif seferler</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            ZAMANINDA ORANI
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 1000, color: kpi.perf >= 90 ? "#10b981" : "#f59e0b" }}>
                                            %{kpi.perf}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdWarning color={kpi.perf >= 90 ? "#10b981" : "#f59e0b"} />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>30 saat kuralı</Typography>
                                        </Stack>
                                    </KPI>

                                    <KPI accent="#ef4444" whileHover={{ scale: 1.01 }}>
                                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.8px" }}>
                                            RİSK: GECİKME / İPTAL
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.15rem", fontWeight: 1000, color: theme.palette.text.primary }}>
                                            <span style={{ color: "#ef4444" }}>{kpi.gec}</span> / <span style={{ color: "#b91c1c" }}>{kpi.iptal}</span>
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <MdCancel color="#ef4444" />
                                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>Takip alanı</Typography>
                                        </Stack>
                                    </KPI>
                                </Grid2>
                            </Stack>

                            {/* Sağ: Kontroller */}
                            <Stack spacing={1.5} alignItems="stretch" justifyContent="space-between">
                                <RegionTabs value={selectedRegion} onChange={(e, v) => setSelectedRegion(v)} variant="scrollable" scrollButtons="auto">
                                    {Object.keys(REGIONS).map((r) => (
                                        <RegionTab
                                            key={r}
                                            value={r}
                                            label={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <span>{r}</span>
                                                    <Chip
                                                        size="small"
                                                        label={REGIONS[r].length}
                                                        sx={{
                                                            height: 18,
                                                            fontWeight: 1000,
                                                            bgcolor: isDark ? alpha("#ffffff", 0.1) : alpha("#0f172a", 0.08),
                                                            color: theme.palette.text.primary,
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.12)}` : "none",
                                                        }}
                                                    />
                                                </Stack>
                                            }
                                        />
                                    ))}
                                </RegionTabs>

                                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems="center">
                                    <TextField
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Proje adıyla ara…"
                                        size="small"
                                        fullWidth
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                color: theme.palette.text.primary,
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                            },
                                            "& .MuiOutlinedInput-notchedOutline": {
                                                borderColor: isDark ? alpha("#ffffff", 0.12) : alpha("#0f172a", 0.12),
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MdSearch />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <Select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            sx={{
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                color: theme.palette.text.primary,
                                                "& .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: isDark ? alpha("#ffffff", 0.12) : alpha("#0f172a", 0.12),
                                                },
                                            }}
                                        >
                                            <MenuItem value="perf">Sırala: Performans</MenuItem>
                                            <MenuItem value="plan">Sırala: Talep (yüksek)</MenuItem>
                                            <MenuItem value="late">Sırala: Gecikme (yüksek)</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Tooltip title="Sadece gecikmesi olan projeleri göster">
                                        <FormControlLabel
                                            sx={{
                                                m: 0,
                                                px: 1.2,
                                                py: 0.3,
                                                borderRadius: 18,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                            }}
                                            control={<Switch checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} />}
                                            label={<Typography sx={{ fontWeight: 950, color: theme.palette.text.primary }}>Sadece gecikenler</Typography>}
                                        />
                                    </Tooltip>

                                    {/* ✅ Reel Tarihler */}
                                    <Tooltip title="Excel seçip reel sefer tarihlerini yükle">
                                        <Box
                                            onClick={handleExcelImport}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: excelSyncLoading ? "default" : "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {excelSyncLoading ? "Excel okunuyor..." : "Reel Tarihler"}
                                        </Box>
                                    </Tooltip>

                                    {/* ✅ FTS Tarihler */}
                                    <Tooltip title="Excel seçip FTS tarihlerini yükle">
                                        <Box
                                            onClick={handleExcelImport}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: excelSyncLoading ? "default" : "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {excelSyncLoading ? "Excel okunuyor..." : "FTS Tarihler"}
                                        </Box>
                                    </Tooltip>

                                    {/* ✅ Excel’e Aktar */}
                                    <Tooltip title="Bu sürümde Excel export ayrı dosyaya taşınmadı">
                                        <Box
                                            onClick={() => console.log("Excel export: bunu export dosyasına ayırabiliriz.")}
                                            sx={{
                                                px: 1.6,
                                                py: 1.1,
                                                borderRadius: 18,
                                                cursor: "pointer",
                                                userSelect: "none",
                                                fontWeight: 950,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(255,255,255,0.95)",
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                color: theme.palette.text.primary,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.8,
                                                "&:hover": { transform: "translateY(-1px)" },
                                                transition: "0.15s",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Excel’e Aktar
                                        </Box>
                                    </Tooltip>
                                </Stack>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 22,
                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                        bgcolor: isDark ? alpha("#0b1220", 0.7) : "rgba(255,255,255,0.85)",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, letterSpacing: "-0.4px" }}>
                                        Liste: {rows.length} proje
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.4 }}>
                                        Detay için kartlara tıkla (sefer listesi, zaman çizelgesi ve rota).
                                    </Typography>

                                    <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.6 }}>
                                        Excel eşleşen sefer sayısı: {Object.keys(excelTimesBySefer || {}).length}
                                    </Typography>

                                    {excelImportInfo && (
                                        <Typography sx={{ fontWeight: 800, color: theme.palette.text.secondary, mt: 0.35 }}>
                                            Excel satır: {excelImportInfo.totalRows} • Sefer bulunan: {excelImportInfo.withSefer} • Tarih dolu:{" "}
                                            {excelImportInfo.withAnyDate}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Grid>
                    </TopBar>

                    {/* İçerik */}
                    <CardList>
                        <AnimatePresence initial={false}>
                            {rows.map((row) => (
                                <ProjectRow key={row.name} row={row} allData={data} excelTimesBySefer={excelTimesBySefer} />
                            ))}
                        </AnimatePresence>

                        {rows.length === 0 && (
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
