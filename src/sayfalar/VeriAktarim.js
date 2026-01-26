import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    Divider,
    Alert,
    LinearProgress,
    Container,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    CloudUpload as UploadIcon,
    FileDownload as DownloadIcon,
    InfoOutlined as InfoIcon,
    CheckCircleOutline as SuccessIcon,
    ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../supabaseClient";
import LojistikKontrolMerkezi from "../bilesenler/BilgiPanelleri";


const KEY_COLS = ["tms_order_id", "siparis_numarasi"];

// ---------- Helpers (Mantık Değişmedi) ----------
const normalizeCell = (v) => (v === undefined || v === null ? null : typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v);
const normKey = (v) => (normalizeCell(v) ?? "").toString().trim();
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

const normalizeHeader = (h) => {
    if (!h) return "";
    return String(h).trim().toLowerCase()
        .replace(/[ıİ]/g, "i").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[çÇ]/g, "c")
        .replace(/[\s\-]+/g, "_").replace(/_+/g, "_");
};

const formatDateTR = (d) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
const excelSerialToTR = (num) => {
    const dc = XLSX.SSF.parse_date_code(num);
    return dc ? `${String(dc.d).padStart(2, "0")}.${String(dc.m).padStart(2, "0")}.${dc.y}` : String(num);
};

const normalizeMaybeDate = (v) => {
    if (v instanceof Date && !isNaN(v.getTime())) return formatDateTR(v);
    if (typeof v === "number" && v > 20000 && v < 90000) return excelSerialToTR(v);
    return normalizeCell(v);
};

// ---------- Component ----------
export default function VeriAktarim() {
    const [columns, setColumns] = useState([]);
    const [loadingCols, setLoadingCols] = useState(true);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from("siparisler_raw").select("*").limit(1);
                if (error) throw error;
                const row = data?.[0] || {};
                const cols = Object.keys(row);
                if (mounted) setColumns([...KEY_COLS, ...cols.filter(c => !KEY_COLS.includes(c))]);
            } catch (e) {
                if (mounted) setErr(e?.message || "Sütunlar yüklenemedi.");
            } finally {
                if (mounted) setLoadingCols(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const downloadTemplate = () => {
        const headers = columns;
        const ws = XLSX.utils.json_to_sheet([headers.reduce((acc, h) => ({ ...acc, [h]: "" }), {})], { header: headers });
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sablon");
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([out], { type: "application/octet-stream" }), "siparis_sablon.xlsx");
    };

    const onUpload = async (file) => {
        if (!file || !columns.length) return;
        setErr(null); setResult(null); setBusy(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array", cellDates: true });
                const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false, dateNF: "dd.mm.yyyy" });

                const excelHeaders = Object.keys(json?.[0] || {});
                const excelMap = new Map(excelHeaders.map(h => [normalizeHeader(h), h]));

                const cleaned = json.map(r => {
                    const out = {};
                    columns.forEach(dbCol => {
                        const excelH = excelMap.get(normalizeHeader(dbCol));
                        out[dbCol] = normalizeMaybeDate(excelH ? r[excelH] : null);
                    });
                    out.tms_order_id = normKey(out.tms_order_id);
                    out.siparis_numarasi = normKey(out.siparis_numarasi);
                    return out;
                }).filter(r => r.tms_order_id && r.siparis_numarasi);

                if (!cleaned.length) throw new Error("Geçerli veri bulunamadı.");

                let affected = 0;
                for (const b of chunk(cleaned, 300)) {
                    const { data: upData, error } = await supabase.from("siparisler_raw").upsert(b, { onConflict: "tms_order_id,siparis_numarasi" }).select("tms_order_id");
                    if (error) throw error;
                    affected += upData?.length || 0;
                }
                setResult({ fileRows: cleaned.length, affected });
            } catch (err) { setErr(err.message); } finally { setBusy(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
            {/* ✅ ÜST PANEL (butonlar burada) */}
            <LojistikKontrolMerkezi
                hideDate={true}
                handleFilter={null}
                uploadActions={
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Button
                            variant="outlined"
                            onClick={downloadTemplate}
                            disabled={busy || loadingCols}
                            startIcon={<DownloadIcon />}
                            sx={{
                                borderRadius: "14px",
                                textTransform: "none",
                                fontWeight: 800,
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                color: "#0f172a",
                                "&:hover": { borderColor: "#2563eb", color: "#2563eb", background: "#fff" },
                            }}
                        >
                            Şablon İndir
                        </Button>

                        <Button
                            component="label"
                            variant="contained"
                            disabled={busy || loadingCols}
                            startIcon={<UploadIcon />}
                            sx={{
                                borderRadius: "14px",
                                textTransform: "none",
                                fontWeight: 800,
                                boxShadow: "0 10px 20px -6px rgba(37, 99, 235, 0.35)",
                            }}
                        >
                            {busy ? "Yükleniyor…" : "Dosya Seç"}
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                hidden
                                onChange={(e) => onUpload(e.target.files?.[0])}
                            />
                        </Button>
                    </Stack>
                }
            />

            {/* ✅ SAYFA İÇERİĞİ */}
            <Container maxWidth="md" sx={{ py: 6 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                >
                    {/* Alert / Progress */}
                    {loadingCols && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

                    {err && (
                        <Alert
                            icon={<ErrorIcon fontSize="inherit" />}
                            severity="error"
                            sx={{ mb: 3, borderRadius: 3, fontWeight: 500 }}
                        >
                            {err}
                        </Alert>
                    )}

                    {result && (
                        <Alert
                            icon={<SuccessIcon fontSize="inherit" />}
                            severity="success"
                            sx={{
                                mb: 3,
                                borderRadius: 3,
                                bgcolor: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                            }}
                        >
                            İşlem tamamlandı! <strong>{result.fileRows}</strong> satır işlendi,{" "}
                            <strong>{result.affected}</strong> kayıt güncellendi.
                        </Alert>
                    )}

                    {/* İçerik başlık (mini) */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                        <Box>
                            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.15rem" }}>
                                Veri Aktarımı
                            </Typography>
                            <Typography sx={{ color: "#64748b", mt: 0.6, fontSize: "0.92rem" }}>
                                Excel ile toplu güncelleme/ekleme yapabilirsiniz.
                            </Typography>
                        </Box>
                        <Tooltip title="Sistem, tms_order_id + siparis_numarasi alanlarını benzersiz anahtar olarak kullanır.">
                            <IconButton>
                                <InfoIcon sx={{ color: "#94a3b8" }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {/* Dropzone (buton kaldırıldı, sadece sürükle-bırak) */}
                    <Box
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files?.[0];
                            if (f) onUpload(f);
                        }}
                        sx={{
                            border: "2px dashed #e2e8f0",
                            borderRadius: 5,
                            p: 4,
                            textAlign: "center",
                            bgcolor: "#fcfdfe",
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "#3b82f6", bgcolor: "#eff6ff" },
                        }}
                    >
                        <UploadIcon sx={{ fontSize: 46, color: "#3b82f6", mb: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.6 }}>
                            Dosyayı buraya sürükleyip bırakın
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
                            veya yukarıdan <b>Dosya Seç</b> butonunu kullanın (.xlsx / .xls)
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Bilgilendirme */}
                    <Box sx={{ p: 3, bgcolor: "#f1f5f9", borderRadius: 4 }}>
                        <Typography
                            sx={{
                                fontWeight: 900,
                                color: "#334155",
                                mb: 1,
                                fontSize: "0.9rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <InfoIcon sx={{ fontSize: 18 }} /> Bilgilendirme
                        </Typography>

                        <ul style={{ margin: 0, paddingLeft: 20, color: "#64748b", fontSize: "0.88rem", lineHeight: 1.7 }}>
                            <li>Kolon isimleri otomatik eşleştirilir (örn: "Sefer No" → "sefer_no").</li>
                            <li>Tarihler otomatik olarak <b>GG.AA.YYYY</b> formatına dönüştürülür.</li>
                            <li>Var olan kayıtlar güncellenir, olmayanlar yeni kayıt olarak eklenir.</li>
                        </ul>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}