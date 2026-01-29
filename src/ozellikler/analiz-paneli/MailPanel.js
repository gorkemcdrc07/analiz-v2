import React, { useMemo, useState, useEffect } from "react";
import { Drawer, Box, Stack, Typography, TextField, Chip, Button, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { MdEmail, MdContentCopy, MdClose } from "react-icons/md";

const DEFAULT_TO = ["gorkem.cadirci@odaklojistik.com.tr"];

const buildDefaultSubject = ({ seciliBolge, dateStr }) =>
    `Analiz Paneli - ${seciliBolge} - ${dateStr}`;

const buildDefaultBody = ({ seciliBolge, satirlar }) => {
    const rows = Array.isArray(satirlar) ? satirlar : [];

    const header = [
        "Merhaba,",
        "",
        `${seciliBolge} bölgesi proje bazlı özet aşağıdadır:`,
        "",
        "Proje | Talep | Tedarik | Edilmeyen | Spot | Filo | Zamanında% | Gecikme",
        "----- | ----- | ------ | --------- | ---- | ---- | --------- | ------",
    ];

    const bodyRows = rows.map((r) => {
        const perf = `${r?.yuzde ?? 0}%`;
        return `${r?.name ?? "-"} | ${r?.plan ?? 0} | ${r?.ted ?? 0} | ${r?.edilmeyen ?? 0} | ${r?.spot ?? 0} | ${r?.filo ?? 0} | ${perf} | ${r?.gec ?? 0}`;
    });

    const footer = ["", "İyi çalışmalar."];

    return [...header, ...bodyRows, ...footer].join("\n");
};

export default function MailPanel({ open, onClose, seciliBolge = "BÖLGE", satirlar = [] }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const dateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [toList, setToList] = useState(DEFAULT_TO);
    const [subject, setSubject] = useState(buildDefaultSubject({ seciliBolge, dateStr }));
    const [body, setBody] = useState(buildDefaultBody({ seciliBolge, satirlar }));

    useEffect(() => {
        setSubject(buildDefaultSubject({ seciliBolge, dateStr }));
        setBody(buildDefaultBody({ seciliBolge, satirlar }));
    }, [seciliBolge, satirlar, dateStr]);

    const toString = useMemo(() => toList.filter(Boolean).join(", "), [toList]);

    const mailtoHref = useMemo(() => {
        const to = encodeURIComponent(toList.filter(Boolean).join(","));
        const s = encodeURIComponent(subject || "");
        const b = encodeURIComponent(body || "");
        return `mailto:${to}?subject=${s}&body=${b}`;
    }, [toList, subject, body]);

    const addEmail = (email) => {
        const e = String(email || "").trim();
        if (!e) return;
        if (toList.includes(e)) return;
        setToList((p) => [...p, e]);
    };

    const removeEmail = (email) => setToList((p) => p.filter((x) => x !== email));

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box
                sx={{
                    width: { xs: "92vw", sm: 520 },
                    p: 2.5,
                    height: "100%",
                    bgcolor: isDark ? "#0b1220" : "#fff",
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontWeight: 1000, fontSize: "1.05rem" }}>
                            Mail Paneli • {seciliBolge}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Button onClick={onClose} startIcon={<MdClose />} sx={{ fontWeight: 900 }}>
                            Kapat
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip label={`Proje: ${satirlar.length}`} size="small" sx={{ fontWeight: 900 }} />
                    </Stack>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: isDark ? alpha("#ffffff", 0.04) : alpha("#0f172a", 0.03),
                            border: `1px solid ${alpha("#0f172a", isDark ? 0.18 : 0.08)}`,
                        }}
                    >
                        <Typography sx={{ fontWeight: 900, mb: 1 }}>Alıcılar</Typography>

                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
                            {toList.map((e) => (
                                <Chip key={e} label={e} onDelete={() => removeEmail(e)} size="small" sx={{ fontWeight: 900 }} />
                            ))}
                        </Stack>

                        <TextField
                            size="small"
                            placeholder="mail@firma.com yazıp Enter..."
                            onKeyDown={(ev) => {
                                if (ev.key === "Enter") {
                                    ev.preventDefault();
                                    addEmail(ev.currentTarget.value);
                                    ev.currentTarget.value = "";
                                }
                            }}
                            fullWidth
                        />

                        <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "text.secondary" }}>
                            Şu an: {toString || "-"}
                        </Typography>
                    </Box>

                    <Stack spacing={1.4}>
                        <TextField
                            label="Konu"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            fullWidth
                            size="small"
                        />

                        <TextField
                            label="Mail İçeriği"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            fullWidth
                            multiline
                            minRows={14}
                        />
                    </Stack>

                    <Stack direction="row" spacing={1.2}>
                        <Button
                            variant="outlined"
                            startIcon={<MdContentCopy />}
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(body || "");
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            sx={{ borderRadius: 3, fontWeight: 900 }}
                        >
                            Kopyala
                        </Button>

                        <Button
                            component="a"
                            href={mailtoHref}
                            startIcon={<MdEmail />}
                            variant="contained"
                            sx={{ borderRadius: 3, fontWeight: 950, flex: 1 }}
                        >
                            Mail Uygulamasını Aç
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Drawer>
    );
}
