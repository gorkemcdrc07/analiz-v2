// src/ozellikler/analiz-paneli/bilesenler/ProjeSatiri.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Box, Chip, Collapse, Divider, Stack, Typography, alpha, Tooltip, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdLocalShipping,
    MdPinDrop,
    MdHistory,
    MdOutlineTimer,
    MdAssignment,
    MdPerson,
    MdCheckCircle,
    MdDoNotDisturbAlt,
    MdErrorOutline,
    MdContentCopy,
    MdCall,
    MdAccountCircle,
    MdBadge,
    MdPayments,
    MdDirectionsCar,
    MdShoppingCart,
} from "react-icons/md";

import DurumRozeti from "./DurumRozeti";
import MiniIstatistik from "./MiniIstatistik";

import { altDetaylariOlustur } from "../../yardimcilar/veriKurallari";
import { seferNoNormalizeEt } from "../../yardimcilar/metin";
import { tarihFormatla } from "../../yardimcilar/tarih";
import {
    ProjeKarti,
    KartBasligi,
    VurguCubugu,
    GenisletButonu,
    SevkiyatSarmal,
    SevkiyatKarti,
    SatirSekmeleri,
    SatirSekme,
} from "../../stiller/stilBilesenleri";

/* ------------------------ küçük yardımcılar ------------------------ */

// ✅ Tek tip pill/chip stili (alt detay chip'leri için)
const pillSX = ({ theme, isDark, color, solid = false }) => ({
    height: 24,
    borderRadius: 999,
    fontWeight: 950,
    px: 1,
    letterSpacing: 0.2,
    bgcolor: solid ? (isDark ? alpha(color, 0.28) : color) : alpha(color, isDark ? 0.18 : 0.12),
    color: solid ? "#fff" : isDark ? theme.palette.text.primary : color,
    border: `1px solid ${alpha(color, isDark ? 0.32 : 0.22)}`,
    transition: "background-color .15s ease, transform .15s ease",
    "&:hover": {
        bgcolor: solid ? (isDark ? alpha(color, 0.34) : alpha(color, 0.92)) : alpha(color, isDark ? 0.22 : 0.16),
        transform: "translateY(-1px)",
    },
});

// ✅ TR/ISO tarih parse (dd.mm.yyyy HH:MM:SS + ISO + "YYYY-MM-DD HH:mm[:ss]")
const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

    const s0 = String(v).trim();
    if (!s0) return null;

    // ✅ ISO ama fractional seconds 3'ten uzun ise 3 haneye kırp
    const isoFix = (s) => {
        const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([Zz]|([+-]\d{2}:\d{2}))?$/);
        if (!m) return s;

        const base = m[1];
        const frac = m[3] || "";
        const tz = m[4] || "";

        if (!frac) return base + tz;

        const ms3 = (frac + "000").slice(0, 3);
        return `${base}.${ms3}${tz}`;
    };

    const s = isoFix(s0);

    // ✅ dd.mm.yyyy [HH:MM[:SS]]
    const mTR = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (mTR) {
        const dd = Number(mTR[1]);
        const mm = Number(mTR[2]);
        const yyyy = Number(mTR[3]);
        const HH = Number(mTR[4] ?? 0);
        const MI = Number(mTR[5] ?? 0);
        const SS = Number(mTR[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // ✅ "YYYY-MM-DD HH:mm[:ss]" veya "YYYY-MM-DDTHH:mm[:ss]" (T şart değil)
    const mYMD = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (mYMD) {
        const yyyy = Number(mYMD[1]);
        const mm = Number(mYMD[2]);
        const dd = Number(mYMD[3]);
        const HH = Number(mYMD[4]);
        const MI = Number(mYMD[5]);
        const SS = Number(mYMD[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

// ✅ Geç tedarik: (Yükleme - Sefer Açılış) > 30 saat ise geç
const isGecTedarik30s = (seferAcilisDate, pickupDate) => {
    const o = parseTRDateTime(seferAcilisDate);
    const p = parseTRDateTime(pickupDate);
    if (!o || !p) return false;

    const diffHours = (o.getTime() - p.getTime()) / 36e5;
    return diffHours > 30;
};

const dakikaGecikme30s = (seferAcilisDate, pickupDate) => {
    const o = parseTRDateTime(seferAcilisDate);
    const p = parseTRDateTime(pickupDate);
    if (!o || !p) return null;

    const diffMs = o.getTime() - p.getTime();
    const limitMs = 30 * 60 * 60 * 1000;

    const lateMs = diffMs - limitMs;
    if (lateMs <= 0) return 0;

    return Math.floor(lateMs / (1000 * 60));
};

const acilisPickupZamanDurumu = (seferAcilisDate, pickupDate) => {
    const o = parseTRDateTime(seferAcilisDate);
    const p = parseTRDateTime(pickupDate);

    if (!o || !p) return { label: "Tarih yok", color: "#64748b", lateMinutes: null };

    const late = isGecTedarik30s(seferAcilisDate, pickupDate);
    const lateMinutes = late ? dakikaGecikme30s(seferAcilisDate, pickupDate) : 0;

    return {
        label: late ? "Geç Tedarik" : "Zamanında",
        color: late ? "#ef4444" : "#10b981",
        lateMinutes,
    };
};

const dakikaToSaatDakika = (mins) => {
    if (mins == null || !Number.isFinite(mins)) return null;
    const m = Math.max(0, Math.floor(mins));
    const h = Math.floor(m / 60);
    const r = m % 60;

    if (h <= 0) return `${r} dk`;
    if (r === 0) return `${h} saat`;
    return `${h} saat ${r} dk`;
};

// ✅ Zamanında yüzdesine göre kademeli renk
const zamanindaRenkFromPct = (pct) => {
    const p = Number(pct ?? 0);
    if (!Number.isFinite(p)) return "#64748b";

    if (p >= 95) return "#16a34a";
    if (p >= 90) return "#10b981";
    if (p >= 80) return "#3b82f6";
    if (p >= 70) return "#f59e0b";
    if (p >= 50) return "#f97316";
    return "#ef4444";
};

// ✅ TL format
const formatTL = (val) => {
    if (val == null || val === "") return null;
    const s = String(val).replace(/\./g, "").replace(",", ".").trim();
    const n = Number(s);
    if (!Number.isFinite(n)) return String(val);
    try {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
    } catch {
        return `${n.toLocaleString("tr-TR")} ₺`;
    }
};

const copyToClipboard = async (text) => {
    try {
        if (!text) return;
        await navigator.clipboard.writeText(String(text));
    } catch (e) {
        // sessiz
    }
};

/** ✅ Modern “stat pill” */
const StatPill = ({ icon, label, value, tone = "#0ea5e9" }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const bg = isDark ? alpha(tone, 0.18) : alpha(tone, 0.12);
    const bd = isDark ? alpha(tone, 0.30) : alpha(tone, 0.22);
    const fg = isDark ? theme.palette.text.primary : tone;

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.15,
                py: 0.75,
                borderRadius: 999,
                border: `1px solid ${bd}`,
                bgcolor: bg,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                transition: "transform .15s ease, background-color .15s ease",
                "&:hover": {
                    transform: "translateY(-1px)",
                    bgcolor: isDark ? alpha(tone, 0.22) : alpha(tone, 0.15),
                },
            }}
        >
            <Box
                sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#0f172a", 0.06),
                    border: isDark ? `1px solid ${alpha("#fff", 0.10)}` : `1px solid ${alpha("#0f172a", 0.06)}`,
                }}
            >
                <Box sx={{ color: fg, display: "grid", placeItems: "center" }}>{icon}</Box>
            </Box>

            <Box sx={{ lineHeight: 1.05 }}>
                <Typography sx={{ fontSize: "0.66rem", fontWeight: 900, color: theme.palette.text.secondary, letterSpacing: "0.4px" }}>
                    {label}
                </Typography>
                <Typography sx={{ fontSize: "0.92rem", fontWeight: 1000, color: theme.palette.text.primary, letterSpacing: "-0.2px" }}>
                    {value}
                </Typography>
            </Box>
        </Box>
    );
};

/* ------------------------ modern field bileşenleri ------------------------ */

const FieldItem = ({ icon, label, value, mono = false, copyable = false }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const val = value ?? "-";

    return (
        <Box
            sx={{
                borderRadius: 2.4,
                p: 1.25,
                border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.16 : 0.7)}`,
                bgcolor: isDark ? alpha("#ffffff", 0.03) : alpha("#0f172a", 0.02),
                transition: "transform .15s ease, border-color .15s ease, background-color .15s ease",
                "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: alpha(theme.palette.primary.main, isDark ? 0.35 : 0.25),
                    bgcolor: isDark ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.04),
                },
            }}
        >
            <Stack direction="row" spacing={1.1} alignItems="flex-start">
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2.2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#0f172a", 0.06),
                        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.12 : 0.45)}`,
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ color: theme.palette.text.secondary, display: "grid", placeItems: "center" }}>{icon}</Box>
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.5px" }}>
                        {label}
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.25,
                            fontSize: "0.92rem",
                            fontWeight: 1000,
                            color: theme.palette.text.primary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : "inherit",
                        }}
                        title={val}
                    >
                        {val}
                    </Typography>
                </Box>

                {copyable && value ? (
                    <Tooltip title="Kopyala">
                        <IconButton
                            size="small"
                            onClick={() => copyToClipboard(value)}
                            sx={{
                                mt: 0.2,
                                bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#0f172a", 0.04),
                                border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.12 : 0.45)}`,
                            }}
                        >
                            <MdContentCopy size={16} />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Stack>
        </Box>
    );
};

const VehicleCard = ({ vehicle, loading }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const safe = vehicle || {};
    const v = (x) => (x == null || x === "" ? null : x);

    const navlunTL = formatTL(v(safe.FreightAmount));

    const hasAny =
        !!v(safe.VehicleCurrentAccountTitle) ||
        !!v(safe.KasaTipi) ||
        !!v(safe.PlateNumber) ||
        !!v(safe.TrailerPlateNumber) ||
        !!v(safe.FullName) ||
        !!v(safe.PhoneNumber) ||
        !!v(safe.CitizenNumber) ||
        !!v(safe.FreightAmount);

    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 320,
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.16 : 0.65)}`,
                bgcolor: isDark ? alpha("#ffffff", 0.03) : "#fff",
                p: 2,
                position: "relative",
                overflow: "hidden",
                boxShadow: isDark ? "none" : "0 18px 45px rgba(2,6,23,0.06)",
            }}
        >
            {/* hafif gradient glow */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(600px circle at 20% 0%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 40%)`,
                }}
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ position: "relative" }}>
                <Stack direction="row" alignItems="center" spacing={1.1}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: isDark ? alpha("#fff", 0.06) : alpha(theme.palette.primary.main, 0.10),
                            border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.20 : 0.22)}`,
                            color: theme.palette.primary.main,
                        }}
                    >
                        <MdDirectionsCar size={20} />
                    </Box>

                    <Box>
                        <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "0.92rem", letterSpacing: "-0.2px" }}>
                            Araç Bilgileri
                        </Typography>
                        <Typography sx={{ fontWeight: 850, color: theme.palette.text.secondary, fontSize: "0.72rem" }}>
                            Prints/Search üzerinden eşleştirildi
                        </Typography>
                    </Box>
                </Stack>

                <Chip
                    size="small"
                    label={loading ? "Yükleniyor..." : hasAny ? "Mevcut" : "Bulunamadı"}
                    sx={pillSX({
                        theme,
                        isDark,
                        color: loading ? "#64748b" : hasAny ? "#10b981" : "#94a3b8",
                        solid: true,
                    })}
                />
            </Stack>

            <Divider sx={{ my: 1.4, opacity: isDark ? 0.18 : 0.6, position: "relative" }} />

            {loading ? (
                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary, fontSize: "0.9rem", position: "relative" }}>
                    Yükleniyor...
                </Typography>
            ) : (
                <Stack spacing={1.2} sx={{ position: "relative" }}>
                    {/* üst hızlı özet */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {v(safe.PlateNumber) ? (
                            <Chip
                                size="small"
                                label={`Plaka: ${safe.PlateNumber}`}
                                onClick={() => copyToClipboard(safe.PlateNumber)}
                                sx={pillSX({ theme, isDark, color: "#3b82f6" })}
                            />
                        ) : null}
                        {v(safe.TrailerPlateNumber) ? (
                            <Chip
                                size="small"
                                label={`Treyler: ${safe.TrailerPlateNumber}`}
                                onClick={() => copyToClipboard(safe.TrailerPlateNumber)}
                                sx={pillSX({ theme, isDark, color: "#8b5cf6" })}
                            />
                        ) : null}
                        {navlunTL ? <Chip size="small" label={`Navlun: ${navlunTL}`} sx={pillSX({ theme, isDark, color: "#10b981" })} /> : null}
                        {v(safe.KasaTipi) ? <Chip size="small" label={`Kasa: ${safe.KasaTipi}`} sx={pillSX({ theme, isDark, color: "#f59e0b" })} /> : null}
                    </Stack>

                    {/* grid alanlar */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1.1,
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                        }}
                    >
                        <FieldItem icon={<MdAccountCircle size={18} />} label="Ruhsat Sahibi" value={v(safe.VehicleCurrentAccountTitle) || "-"} />
                        <FieldItem icon={<MdBadge size={18} />} label="Şoför" value={v(safe.FullName) || "-"} />

                        <FieldItem icon={<MdLocalShipping size={18} />} label="Kasa Tipi" value={v(safe.KasaTipi) || "-"} />
                        <FieldItem icon={<MdPayments size={18} />} label="Navlun" value={navlunTL || "-"} mono />

                        <FieldItem icon={<MdDirectionsCar size={18} />} label="Plaka" value={v(safe.PlateNumber) || "-"} mono copyable />
                        <FieldItem icon={<MdDirectionsCar size={18} />} label="Treyler" value={v(safe.TrailerPlateNumber) || "-"} mono copyable />

                        <FieldItem
                            icon={<MdCall size={18} />}
                            label="Telefon"
                            value={v(safe.PhoneNumber) || "-"}
                            mono
                            copyable={!!v(safe.PhoneNumber)}
                        />

                        <FieldItem icon={<MdBadge size={18} />} label="TC" value={v(safe.CitizenNumber) || "-"} mono copyable={!!v(safe.CitizenNumber)} />
                    </Box>

                    {/* Telefon quick action */}
                    {v(safe.PhoneNumber) ? (
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Chip
                                icon={<MdCall />}
                                clickable
                                component="a"
                                href={`tel:${String(safe.PhoneNumber).replace(/\s+/g, "")}`}
                                label="Ara"
                                sx={pillSX({ theme, isDark, color: theme.palette.primary.main, solid: true })}
                            />
                        </Box>
                    ) : null}
                </Stack>
            )}
        </Box>
    );
};

export default function ProjeSatiri({
    satir,
    tumVeri,
    excelTarihleriSeferBazli,
    printsMap = {},
    printsLoading = false,
    vehicleMap = {},
    vehicleLoading = false,
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [acik, setAcik] = useState(false);
    const [sekme, setSekme] = useState(0);

    // ✅ Tabs sayısı 2 (0,1) => state 2 kalırsa resetle
    useEffect(() => {
        if (sekme > 1) setSekme(0);
    }, [sekme]);

    const altDetaylar = useMemo(() => altDetaylariOlustur(satir.name, tumVeri), [satir.name, tumVeri]);

    // ✅ Proje bazlı "GEÇ TEDARİK" sayısı
    const gecTedarikSayisi = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? altDetaylar : [];
        let count = 0;

        for (const it of list) {
            const seferAcilisDate = it?.TMSDespatchCreatedDate;
            const pickupDate = it?.PickupDate;

            if (seferAcilisDate && pickupDate && isGecTedarik30s(seferAcilisDate, pickupDate)) count += 1;
        }

        return count;
    }, [altDetaylar]);

    // ✅ Talep (plan) ve Tedarik (ted) sayıları
    const talep = useMemo(() => {
        const p = Number(satir?.plan ?? 0);
        return Number.isFinite(p) ? Math.max(0, p) : 0;
    }, [satir?.plan]);

    const tedarikEdilen = useMemo(() => {
        const t = Number(satir?.ted ?? 0);
        return Number.isFinite(t) ? Math.max(0, t) : 0;
    }, [satir?.ted]);

    // ✅ Tedarik edilmeyen (plan - ted)
    const tedarikEdilmeyen = useMemo(() => {
        const diff = talep - tedarikEdilen;
        return Number.isFinite(diff) ? Math.max(0, diff) : 0;
    }, [talep, tedarikEdilen]);

    // ✅ “Zamanında” yüzdesi
    const zamanindaYuzde = useMemo(() => {
        if (!tedarikEdilen || tedarikEdilen <= 0) return 0;

        const zamaninda = Math.max(0, tedarikEdilen - gecTedarikSayisi);
        const pct = (zamaninda / tedarikEdilen) * 100;

        return Math.max(0, Math.min(100, Math.round(pct)));
    }, [tedarikEdilen, gecTedarikSayisi]);

    // ✅ Zamanında yüzdesine göre renk
    const zamanindaRenk = useMemo(() => zamanindaRenkFromPct(zamanindaYuzde), [zamanindaYuzde]);

    // ✅ Gecikenler en üstte, sonra gecikme dakikası büyük olan üstte
    const siraliAltDetaylar = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? [...altDetaylar] : [];

        list.sort((a, b) => {
            const aLate = isGecTedarik30s(a?.TMSDespatchCreatedDate, a?.PickupDate);
            const bLate = isGecTedarik30s(b?.TMSDespatchCreatedDate, b?.PickupDate);

            if (aLate !== bLate) return aLate ? -1 : 1;

            if (aLate && bLate) {
                const aMin = dakikaGecikme30s(a?.TMSDespatchCreatedDate, a?.PickupDate) ?? 0;
                const bMin = dakikaGecikme30s(b?.TMSDespatchCreatedDate, b?.PickupDate) ?? 0;
                if (aMin !== bMin) return bMin - aMin;
            }

            const aP = parseTRDateTime(a?.PickupDate)?.getTime?.() ?? 0;
            const bP = parseTRDateTime(b?.PickupDate)?.getTime?.() ?? 0;
            return bP - aP;
        });

        return list;
    }, [altDetaylar, printsMap]);

    const vurguRengi = zamanindaRenk;
    const gecTone = printsLoading ? "#64748b" : gecTedarikSayisi > 0 ? "#ef4444" : "#64748b";

    return (
        <ProjeKarti
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            whileHover={{ scale: 1.005 }}
        >
            <KartBasligi
                onClick={() => setAcik((s) => !s)}
                style={{ cursor: "pointer" }}
                sx={{
                    transition: "background-color .15s ease",
                    "&:hover": { bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#0f172a", 0.03) },
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <VurguCubugu color={vurguRengi} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 1000,
                                color: theme.palette.text.primary,
                                fontSize: { xs: "1.02rem", md: "1.08rem" },
                                letterSpacing: "-0.4px",
                                lineHeight: 1.15,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: { xs: 220, md: 560 },
                            }}
                        >
                            {satir.name}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                mt: 0.9,
                                flexWrap: "wrap",
                                rowGap: 0.9,
                                "& > *": { flexShrink: 0 },
                            }}
                        >
                            <StatPill icon={<MdShoppingCart size={18} />} label="Talep" value={talep} tone="#0ea5e9" />
                            <StatPill icon={<MdCheckCircle size={18} />} label="Tedarik Edilen" value={tedarikEdilen} tone="#10b981" />
                            <StatPill
                                icon={<MdDoNotDisturbAlt size={18} />}
                                label="Tedarik Edilmeyen"
                                value={tedarikEdilmeyen}
                                tone={tedarikEdilmeyen > 0 ? "#f59e0b" : "#64748b"}
                            />
                            <StatPill icon={<MdErrorOutline size={18} />} label="Geç Tedarik" value={gecTedarikSayisi} tone={gecTone} />
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
                        <MiniIstatistik etiket="SPOT" deger={satir.spot} renk="#3b82f6" />
                        <MiniIstatistik etiket="FİLO" deger={satir.filo} renk="#8b5cf6" />
                        <MiniIstatistik etiket="SHÖ Basım" deger={satir.sho_b} renk="#059669" />

                        <MiniIstatistik etiket="Tedarik Oranı" deger={`%${zamanindaYuzde}`} renk={zamanindaRenk} tone={zamanindaRenk} />
                    </Stack>

                    <GenisletButonu open={acik ? 1 : 0}>
                        {acik ? <MdKeyboardArrowUp size={22} /> : <MdKeyboardArrowDown size={22} />}
                    </GenisletButonu>
                </Stack>
            </KartBasligi>

            <Collapse in={acik} timeout={250} unmountOnExit>
                <SevkiyatSarmal>
                    {/* ✅ sadece 2 sekme */}
                    <SatirSekmeleri value={sekme} onChange={(e, v) => setSekme(v)} variant="scrollable" scrollButtons="auto">
                        <SatirSekme label="Genel Bakış" />
                        <SatirSekme label="Araç Bilgileri" />
                    </SatirSekmeleri>

                    <Box sx={{ mt: 1.5, display: "grid", gap: 12 }}>
                        {siraliAltDetaylar.map((item, idx) => {
                            const seferNo = item.TMSDespatchDocumentNo || "Planlanmadı";
                            const key = seferNoNormalizeEt(seferNo);

                            const excelKaydi = key ? excelTarihleriSeferBazli?.[key] : null;

                            const printedDate = key ? printsMap?.[key]?.PrintedDate : null;
                            const printedBy = key ? printsMap?.[key]?.PrintedBy : null;

                            const zaman = acilisPickupZamanDurumu(item.TMSDespatchCreatedDate, item.PickupDate);

                            const pickupCity = item.PickupCityName || "-";
                            const pickupCounty = item.PickupCountyName || "-";
                            const deliveryCity = item.DeliveryCityName || "-";
                            const deliveryCounty = item.DeliveryCountyName || "-";

                            const lateText =
                                zaman?.lateMinutes != null && zaman.lateMinutes > 0
                                    ? `${dakikaToSaatDakika(zaman.lateMinutes)} Geç Tedarik`
                                    : null;

                            const vehicle = key ? vehicleMap?.[key] : null;
                            const hasVehicle = !!vehicle;

                            return (
                                <SevkiyatKarti
                                    key={`${item.TMSVehicleRequestDocumentNo || idx}`}
                                    printed={printedDate ? 1 : 0}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.7rem",
                                                    fontWeight: 950,
                                                    color: theme.palette.text.secondary,
                                                    letterSpacing: "0.8px",
                                                }}
                                            >
                                                SEFER
                                            </Typography>

                                            <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary, fontSize: "1.05rem" }}>
                                                {seferNo}
                                            </Typography>

                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.9 }}>
                                                <DurumRozeti durumId={item.OrderStatu} />

                                                <Chip size="small" label={zaman.label} sx={pillSX({ theme, isDark, color: zaman.color, solid: true })} />

                                                {lateText && <Chip size="small" label={lateText} sx={pillSX({ theme, isDark, color: "#ef4444" })} />}

                                                {excelKaydi && <Chip size="small" label="Excel tarihleri var" sx={pillSX({ theme, isDark, color: "#0ea5e9" })} />}

                                                {/* ✅ araç chip */}
                                                <Chip
                                                    size="small"
                                                    label={vehicleLoading ? "Araç yükleniyor..." : hasVehicle ? "Araç bilgisi var" : "Araç bilgisi yok"}
                                                    sx={pillSX({
                                                        theme,
                                                        isDark,
                                                        color: vehicleLoading ? "#64748b" : hasVehicle ? "#10b981" : "#94a3b8",
                                                    })}
                                                />
                                            </Stack>
                                        </Box>

                                        <Chip
                                            size="small"
                                            label={`#${idx + 1}`}
                                            sx={{
                                                height: 26,
                                                borderRadius: 999,
                                                fontWeight: 1000,
                                                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                                color: theme.palette.text.primary,
                                                border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                            }}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 1.2, opacity: isDark ? 0.18 : 0.6 }} />

                                    {sekme === 0 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.6px" }}>
                                                    OPERASYON
                                                </Typography>
                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 999,
                                                            display: "grid",
                                                            placeItems: "center",
                                                            bgcolor: isDark ? alpha("#ffffff", 0.06) : "rgba(15,23,42,0.06)",
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                        }}
                                                    >
                                                        <MdPerson size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                                                    </Box>
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {item.OrderCreatedBy || "-"}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.6px" }}>
                                                    GEÇ TEDARİK HESABI
                                                </Typography>

                                                <Stack sx={{ mt: 1 }} spacing={0.8}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdOutlineTimer color="#10b981" />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Yükleme: {tarihFormatla(item.PickupDate)}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdAssignment color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            SHÖ Basım Tarihi: {printsLoading ? "..." : tarihFormatla(printedDate)}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdPerson color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            SHÖ Basan Kullanıcı: {printsLoading ? "..." : printedBy || "-"}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.6px" }}>
                                                    ZAMAN BİLGİLERİ
                                                </Typography>

                                                <Stack sx={{ mt: 1 }} spacing={0.8}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdHistory color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sefer açılış: {tarihFormatla(item.TMSDespatchCreatedDate)}
                                                        </Typography>
                                                    </Stack>

                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdAssignment color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sipariş: {tarihFormatla(item.OrderCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: "0.7rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.6px" }}>
                                                    ROTA ÖZETİ
                                                </Typography>

                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1 }}>
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {pickupCity} / {pickupCounty}
                                                    </Typography>
                                                </Stack>

                                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 0.6 }}>
                                                    <MdLocalShipping color="#3b82f6" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        {deliveryCity} / {deliveryCounty}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    )}

                                    {sekme === 1 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <VehicleCard vehicle={vehicle} loading={vehicleLoading} />
                                        </Stack>
                                    )}
                                </SevkiyatKarti>
                            );
                        })}
                    </Box>
                </SevkiyatSarmal>
            </Collapse>
        </ProjeKarti>
    );
}
