import { useEffect, useMemo, useState, useRef } from "react";
import {
    Box,
    Fade,
    Paper,
    Stack,
    Typography,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Avatar,
    LinearProgress,
    Chip,
    Container,
    alpha,
    Grid,
    CardActionArea,
    CircularProgress,
    Tooltip,
    useTheme,
} from "@mui/material";
import {
    Search,
    Assignment,
    FilterAlt,
    Star,
    Groups,
    AutoFixHigh,
    TouchApp,
} from "@mui/icons-material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ---------------- BACKEND ---------------- */
const BASE_URL =
    process.env.REACT_APP_API_URL || "https://tedarik-analiz-backend-clean.onrender.com";

/** Backend şu formatı döndürebilir:
 * - { rid, ok, data }
 * - { rid, ok, items }
 * - Odak API: { Data: [...], Success: true }
 */
function extractItems(payload) {
    if (!payload) return [];

    const root = payload.items ?? payload.data ?? payload;
    const arr = root?.Data ?? root?.data ?? root?.items ?? root;

    return Array.isArray(arr) ? arr : [];
}

/* ---------------- CONST ---------------- */
const PEOPLE = ["HALİT BAKACAK", "IŞIL GÖKÇE KATRAN", "YASEMİN YILMAZ", "İDİL ÇEVİK"];
const normTR = (s) =>
    (s ?? "").toString().trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");

// YYYY-MM-DD (local) üret
const toInputDate = (d) => {
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// date input string -> Date (local) başlangıç/bitiş
const startOfDay = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00`);
const endOfDay = (yyyyMmDd) => new Date(`${yyyyMmDd}T23:59:59.999`);

function toIsoLocalStartFromInput(yyyyMmDd) {
    return `${yyyyMmDd}T00:00:00`;
}
function toIsoLocalEndFromInput(yyyyMmDd) {
    return `${yyyyMmDd}T23:59:59`;
}

/* ---------------- KPI KARTI ---------------- */
function PersonKPICard({ name, data, isSelected, onClick, diffDays }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const { total, manualCount, autoCount } = data;
    const safeDays = Math.max(Number(diffDays) || 1, 1);
    const manualDailyAvg = (manualCount / safeDays).toFixed(1);

    const getStatusColor = () => {
        if (Number(manualDailyAvg) > 35) return "#10b981";
        if (Number(manualDailyAvg) > 15) return "#3b82f6";
        return "#f59e0b";
    };

    const color = getStatusColor();

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: "24px",
                border: "1px solid",
                borderColor: isSelected ? color : alpha(theme.palette.divider, isDark ? 0.65 : 1),
                bgcolor: isSelected ? alpha(color, isDark ? 0.10 : 0.02) : theme.palette.background.paper,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isSelected ? "translateY(-5px)" : "none",
                boxShadow: isSelected
                    ? `0 20px 25px -5px ${alpha(color, isDark ? 0.25 : 0.15)}`
                    : isDark
                        ? "0 10px 30px rgba(0,0,0,0.35)"
                        : "0 1px 3px rgba(0,0,0,0.05)",
            }}
        >
            <CardActionArea onClick={onClick} sx={{ p: 3, borderRadius: "24px" }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Avatar
                        sx={{
                            bgcolor: alpha(color, isDark ? 0.20 : 0.10),
                            color: color,
                            width: 56,
                            height: 56,
                            fontWeight: "bold",
                            fontSize: "1.2rem",
                            border: `2px solid ${alpha(color, isDark ? 0.35 : 0.2)}`,
                        }}
                    >
                        {name.charAt(0)}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 800,
                                fontSize: "1.1rem",
                                color: theme.palette.text.primary,
                                lineHeight: 1.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {name}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "0.7rem",
                                color: theme.palette.text.secondary,
                                fontWeight: 700,
                                mt: 0.5,
                                letterSpacing: 1,
                            }}
                        >
                            OPERATÖR SKORU
                        </Typography>
                    </Box>

                    {isSelected && <Star sx={{ color }} />}
                </Stack>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Box
                            sx={{
                                p: 1.5,
                                bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.03),
                                borderRadius: "16px",
                                textAlign: "center",
                                border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: "0.6rem",
                                    color: theme.palette.text.secondary,
                                    fontWeight: 900,
                                    mb: 0.5,
                                }}
                            >
                                MANUEL GÜNLÜK
                            </Typography>
                            <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary, fontSize: "1.2rem" }}>
                                {manualDailyAvg}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={6}>
                        <Box
                            sx={{
                                p: 1.5,
                                bgcolor: alpha(color, isDark ? 0.18 : 0.05),
                                borderRadius: "16px",
                                textAlign: "center",
                                border: `1px solid ${alpha(color, isDark ? 0.35 : 0.15)}`,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: "0.6rem",
                                    color: color,
                                    fontWeight: 900,
                                    mb: 0.5,
                                }}
                            >
                                GERÇEK VERİM
                            </Typography>
                            <Typography sx={{ fontWeight: 900, color: color, fontSize: "1.2rem" }}>
                                %{Math.min(100, (Number(manualDailyAvg) / 40) * 100).toFixed(0)}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Stack spacing={1} sx={{ mt: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: theme.palette.text.secondary }}>
                            Efor Dağılımı
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: theme.palette.text.primary }}>
                            {manualCount} Manuel / {autoCount} Oto
                        </Typography>
                    </Stack>

                    <Box
                        sx={{
                            height: 8,
                            bgcolor: alpha(theme.palette.text.primary, isDark ? 0.10 : 0.06),
                            borderRadius: 4,
                            overflow: "hidden",
                            display: "flex",
                            border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                        }}
                    >
                        <Box
                            sx={{
                                width: `${total ? (manualCount / total) * 100 : 0}%`,
                                bgcolor: color,
                                transition: "0.5s",
                            }}
                        />
                        <Box
                            sx={{
                                width: `${total ? (autoCount / total) * 100 : 0}%`,
                                bgcolor: alpha(theme.palette.text.primary, isDark ? 0.18 : 0.12),
                                transition: "0.5s",
                            }}
                        />
                    </Box>
                </Stack>
            </CardActionArea>
        </Paper>
    );
}

/* ---------------- ANA SAYFA ---------------- */
export default function SiparisAnaliz() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // ✅ Date input’lar string tutuluyor (UTC bug yok)
    const [startStr, setStartStr] = useState(() => toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
    const [endStr, setEndStr] = useState(() => toInputDate(new Date()));

    const [rows, setRows] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(PEOPLE[0]);
    const [searchTerm, setSearchTerm] = useState("");

    const [error, setError] = useState("");

    const reportRef = useRef(null);

    // ✅ diffDays artık string tarihlerden hesaplanıyor
    const diffDays = useMemo(() => {
        const s = startOfDay(startStr);
        const e = endOfDay(endStr);
        const diff = Math.abs(e.getTime() - s.getTime());
        return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
    }, [startStr, endStr]);

    const fetchSiparis = async () => {
        setLoading(true);
        setError("");
        try {
            // ✅ backend’in beklediği format:
            // startDate: "YYYY-MM-DDT00:00:00"
            // endDate:   "YYYY-MM-DDT23:59:59"
            const body = {
                startDate: toIsoLocalStartFromInput(startStr),
                endDate: toIsoLocalEndFromInput(endStr),
                userId: 1,
            };

            const res = await fetch(`${BASE_URL}/tmsorders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const text = await res.text();
            let payload;
            try {
                payload = text ? JSON.parse(text) : null;
            } catch {
                payload = text;
            }

            if (!res.ok) {
                throw new Error(typeof payload === "string" ? payload : JSON.stringify(payload));
            }

            const items = extractItems(payload);
            setRows(items);
        } catch (e) {
            setRows([]);
            setError(e?.message || "Bilinmeyen hata");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSiparis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ilk yükleme

    // --- MANUEL VS OTOMASYON ANALİZİ ---
    const personAnalysis = useMemo(() => {
        const data = Object.fromEntries(
            PEOPLE.map((p) => [p, { total: 0, manualCount: 0, autoCount: 0, projects: {} }])
        );

        const sortedRows = [...rows].sort(
            (a, b) => new Date(a.OrderCreatedDate) - new Date(b.OrderCreatedDate)
        );
        const lastActionTimes = {};

        sortedRows.forEach((r) => {
            const who = normTR(r.OrderCreatedBy);
            const personKey = PEOPLE.find((p) => normTR(p) === who);

            if (personKey) {
                const project = (r.ProjectName ?? "").trim() || "TANIMSIZ PROJE";
                const currentTime = new Date(r.OrderCreatedDate).getTime();
                const lastTime = lastActionTimes[who] || 0;

                // aynı kişi 10 saniye içinde ardışık kayıt girdiyse "oto" kabul
                const isAuto = currentTime - lastTime < 10000;
                lastActionTimes[who] = currentTime;

                data[personKey].total += 1;
                if (isAuto) data[personKey].autoCount += 1;
                else data[personKey].manualCount += 1;

                if (!data[personKey].projects[project]) {
                    data[personKey].projects[project] = { total: 0, manual: 0, auto: 0 };
                }
                data[personKey].projects[project].total += 1;
                data[personKey].projects[project][isAuto ? "auto" : "manual"] += 1;
            }
        });

        return data;
    }, [rows]);

    const selectedPersonProjects = useMemo(() => {
        const projects = personAnalysis[selectedPerson]?.projects || {};
        return Object.entries(projects)
            .map(([name, stats]) => ({ name, ...stats }))
            .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.manual - a.manual);
    }, [personAnalysis, selectedPerson, searchTerm]);

    // PDF Export
    const handleExportAllPDF = async () => {
        setExporting(true);
        try {
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();

            for (let i = 0; i < PEOPLE.length; i++) {
                setSelectedPerson(PEOPLE[i]);
                await new Promise((r) => setTimeout(r, 600));

                const canvas = await html2canvas(reportRef.current, {
                    scale: 2,
                    backgroundColor: isDark ? "#0b1220" : "#f8fafc",
                    useCORS: true,
                });

                if (i !== 0) pdf.addPage();

                pdf.addImage(
                    canvas.toDataURL("image/png"),
                    "PNG",
                    0,
                    0,
                    pdfWidth,
                    (canvas.height * pdfWidth) / canvas.width
                );
            }

            pdf.save(`Performans_Analizi_${new Date().toLocaleDateString("tr-TR")}.pdf`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Fade in timeout={800}>
            <Box
                sx={{
                    p: { xs: 2, md: 4 },
                    bgcolor: theme.palette.background.default,
                    minHeight: "100vh",
                }}
            >
                <Container maxWidth="xl">
                    {/* Header */}
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 4 }}
                    >
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight: 1000,
                                    fontSize: "2rem",
                                    color: theme.palette.text.primary,
                                    letterSpacing: "-1px",
                                }}
                            >
                                INSIGHT{" "}
                                <span style={{ color: isDark ? "#a5b4fc" : "#6366f1" }}>
                                    PERFORMANS
                                </span>
                            </Typography>
                            <Typography
                                sx={{
                                    color: theme.palette.text.secondary,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <TouchApp fontSize="small" /> Manuel vs Otomasyon Bazlı Analiz
                            </Typography>

                            <Typography sx={{ mt: 0.8, fontSize: "0.75rem", color: theme.palette.text.secondary, fontWeight: 700 }}>
                                Base URL: <b>{BASE_URL}</b> — Endpoint: <b>POST /tmsorders</b>
                            </Typography>

                            {error ? (
                                <Typography sx={{ mt: 0.6, fontSize: "0.8rem", color: "tomato", fontWeight: 800 }}>
                                    Hata: {error}
                                </Typography>
                            ) : null}
                        </Box>

                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                onClick={handleExportAllPDF}
                                disabled={exporting || loading}
                                startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Groups />}
                                sx={{
                                    borderRadius: "14px",
                                    bgcolor: isDark ? "#e2e8f0" : "#0f172a",
                                    color: isDark ? "#0b1220" : "#fff",
                                    px: 3,
                                    py: 1.5,
                                    textTransform: "none",
                                    fontWeight: 800,
                                    "&:hover": { bgcolor: isDark ? "#f1f5f9" : "#111827" },
                                }}
                            >
                                {exporting ? "Raporlanıyor..." : "Tüm Ekip Analizini İndir"}
                            </Button>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 0.5,
                                    borderRadius: "16px",
                                    border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.65 : 1)}`,
                                    display: "flex",
                                    bgcolor: theme.palette.background.paper,
                                }}
                            >
                                <TextField
                                    type="date"
                                    size="small"
                                    value={startStr}
                                    onChange={(e) => setStartStr(e.target.value)}
                                    sx={{ "& fieldset": { border: "none" } }}
                                />
                                <TextField
                                    type="date"
                                    size="small"
                                    value={endStr}
                                    onChange={(e) => setEndStr(e.target.value)}
                                    sx={{ "& fieldset": { border: "none" } }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={fetchSiparis}
                                    disabled={loading || exporting}
                                    sx={{
                                        borderRadius: "12px",
                                        bgcolor: isDark ? "#e2e8f0" : "#0f172a",
                                        color: isDark ? "#0b1220" : "#fff",
                                        minWidth: 45,
                                        "&:hover": { bgcolor: isDark ? "#f1f5f9" : "#111827" },
                                    }}
                                >
                                    {loading ? <CircularProgress size={16} color="inherit" /> : <FilterAlt fontSize="small" />}
                                </Button>
                            </Paper>
                        </Stack>
                    </Stack>

                    <Box ref={reportRef} sx={{ p: 1 }}>
                        <Grid container spacing={3} sx={{ mb: 6 }}>
                            {PEOPLE.map((p) => (
                                <Grid item xs={12} sm={6} lg={3} key={p}>
                                    <PersonKPICard
                                        name={p}
                                        data={personAnalysis[p]}
                                        isSelected={selectedPerson === p}
                                        onClick={() => setSelectedPerson(p)}
                                        diffDays={diffDays}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        {/* Detay Tablosu */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: "32px",
                                border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.65 : 1)}`,
                                bgcolor: theme.palette.background.paper,
                                overflow: "hidden",
                                boxShadow: isDark
                                    ? "0 18px 50px rgba(0,0,0,0.45)"
                                    : "0 4px 6px -1px rgba(0,0,0,0.1)",
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                                    gap: 2,
                                    flexWrap: "wrap",
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar
                                        sx={{
                                            bgcolor: isDark ? alpha("#a5b4fc", 0.18) : "#6366f1",
                                            color: isDark ? "#a5b4fc" : "#fff",
                                        }}
                                    >
                                        <Assignment />
                                    </Avatar>
                                    <Box>
                                        <Typography sx={{ fontWeight: 950, color: theme.palette.text.primary }}>
                                            {selectedPerson} - PROJE AYRIMI
                                        </Typography>
                                        <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.secondary, fontWeight: 700 }}>
                                            Proje bazlı manuel efor ve otomasyon tespiti
                                        </Typography>
                                    </Box>
                                </Stack>

                                <TextField
                                    placeholder="Proje ara..."
                                    size="small"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: <Search sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                                        sx: { borderRadius: "12px", width: 250 },
                                    }}
                                />
                            </Box>

                            <Table>
                                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.03) }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900, pl: 4, color: theme.palette.text.secondary }}>
                                            PROJE ADI
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                            MANUEL İŞLEM
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                            OTOMASYON
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                            TÜR
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 900, pr: 4, color: theme.palette.text.secondary }}>
                                            VERİMLİLİK
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {selectedPersonProjects.map((proj) => {
                                        const manualPct = proj.total ? (proj.manual / proj.total) * 100 : 0;

                                        return (
                                            <TableRow
                                                key={proj.name}
                                                hover
                                                sx={{
                                                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04) },
                                                }}
                                            >
                                                <TableCell sx={{ pl: 4, fontWeight: 800, color: theme.palette.text.primary }}>
                                                    {proj.name}
                                                </TableCell>

                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${proj.manual} Adet`}
                                                        size="small"
                                                        icon={<TouchApp />}
                                                        sx={{
                                                            bgcolor: alpha("#3b82f6", isDark ? 0.18 : 0.1),
                                                            color: isDark ? "#93c5fd" : "#3b82f6",
                                                            fontWeight: 800,
                                                            border: `1px solid ${alpha("#3b82f6", isDark ? 0.22 : 0.16)}`,
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${proj.auto} Adet`}
                                                        size="small"
                                                        icon={<AutoFixHigh />}
                                                        sx={{
                                                            bgcolor: alpha(theme.palette.text.secondary, isDark ? 0.18 : 0.1),
                                                            color: theme.palette.text.secondary,
                                                            fontWeight: 800,
                                                            border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.55 : 1)}`,
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell align="center">
                                                    {proj.auto > proj.manual ? (
                                                        <Tooltip title="Bu projede yoğun otomasyon algılandı">
                                                            <Chip
                                                                label="SİSTEMSEL"
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: isDark ? alpha("#e2e8f0", 0.12) : "#0f172a",
                                                                    color: isDark ? "#e2e8f0" : "#fff",
                                                                    fontSize: "0.6rem",
                                                                    fontWeight: 900,
                                                                    border: isDark ? `1px solid ${alpha("#e2e8f0", 0.22)}` : "none",
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    ) : (
                                                        <Chip
                                                            label="MANUEL"
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                fontSize: "0.6rem",
                                                                fontWeight: 900,
                                                                borderColor: alpha(theme.palette.divider, isDark ? 0.7 : 1),
                                                                color: theme.palette.text.secondary,
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>

                                                <TableCell sx={{ pr: 4, width: 220 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={manualPct}
                                                            sx={{
                                                                flex: 1,
                                                                height: 6,
                                                                borderRadius: 3,
                                                                bgcolor: alpha(theme.palette.text.primary, isDark ? 0.12 : 0.06),
                                                                "& .MuiLinearProgress-bar": { bgcolor: theme.palette.primary.main },
                                                            }}
                                                        />
                                                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 900, color: theme.palette.text.primary }}>
                                                            %{Math.round(manualPct)} Mnl
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {selectedPersonProjects.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                sx={{
                                                    py: 6,
                                                    textAlign: "center",
                                                    color: theme.palette.text.secondary,
                                                    fontWeight: 900,
                                                }}
                                            >
                                                Sonuç bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Box>
                </Container>
            </Box>
        </Fade>
    );
}
