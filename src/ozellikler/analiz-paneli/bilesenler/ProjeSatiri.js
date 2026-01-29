// src/ozellikler/analiz-paneli/bilesenler/ProjeSatiri.jsx
import React, { useMemo, useState } from "react";
import { Box, Chip, Collapse, Divider, Stack, Typography, alpha } from "@mui/material";
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
    MdBolt,
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
    Hap,
    GenisletButonu,
    SevkiyatSarmal,
    SevkiyatKarti,
    SatirSekmeleri,
    SatirSekme,
    RotaKutusu,
} from "../../stiller/stilBilesenleri";

// ✅ Tek tip pill/chip stili
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

// ✅ Cutoff: PickupDate’in ertesi günü 10:30
const cutoffFromPickup = (pickupDate) => {
    const p = pickupDate ? new Date(pickupDate) : null;
    if (!p || Number.isNaN(p.getTime())) return null;
    return new Date(p.getFullYear(), p.getMonth(), p.getDate() + 1, 10, 30, 0, 0);
};

// ✅ Geç tedarik: PrintedDate, PickupDate’in ertesi günü 10:30’dan SONRA ise geç
const isGecTedarik = (pickupDate, printedDate) => {
    const pr = printedDate ? new Date(printedDate) : null;
    const cutoff = cutoffFromPickup(pickupDate);
    if (!pr || !cutoff) return false;
    if (Number.isNaN(pr.getTime())) return false;
    return pr.getTime() > cutoff.getTime();
};

const dakikaGecikme = (pickupDate, printedDate) => {
    const pr = printedDate ? new Date(printedDate) : null;
    const cutoff = cutoffFromPickup(pickupDate);
    if (!pr || !cutoff) return null;
    if (Number.isNaN(pr.getTime())) return null;

    const diffMs = pr.getTime() - cutoff.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60));
};

const pickupPrintedZamanDurumu = (pickupDate, printedDate) => {
    const p = pickupDate ? new Date(pickupDate) : null;
    const pr = printedDate ? new Date(printedDate) : null;

    if (!p || !pr) return { label: "Basım yok", color: "#64748b", lateMinutes: null };
    if (Number.isNaN(p.getTime()) || Number.isNaN(pr.getTime())) return { label: "Basım yok", color: "#64748b", lateMinutes: null };

    const late = isGecTedarik(pickupDate, printedDate);
    const lateMinutes = late ? dakikaGecikme(pickupDate, printedDate) : 0;

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


export default function ProjeSatiri({
    satir,
    tumVeri,
    excelTarihleriSeferBazli,
    printsMap = {},
    printsLoading = false,
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [acik, setAcik] = useState(false);
    const [sekme, setSekme] = useState(0);

    const altDetaylar = useMemo(() => altDetaylariOlustur(satir.name, tumVeri), [satir.name, tumVeri]);

    // ✅ Proje bazlı "GEÇ TEDARİK" sayısı (ana satırdaki Gecikme)
    const gecTedarikSayisi = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? altDetaylar : [];
        let count = 0;

        for (const it of list) {
            const seferNo = it?.TMSDespatchDocumentNo;
            const key = seferNoNormalizeEt(seferNo);
            if (!key) continue;

            const printedDate = printsMap?.[key]?.PrintedDate;
            const pickupDate = it?.PickupDate;

            if (printedDate && pickupDate && isGecTedarik(pickupDate, printedDate)) count += 1;
        }
        return count;
    }, [altDetaylar, printsMap]);

    // ✅ Her zaman: gecikenler en üstte, sonra gecikme dakikası büyük olan üstte
    const siraliAltDetaylar = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? [...altDetaylar] : [];

        const getKey = (it) => seferNoNormalizeEt(it?.TMSDespatchDocumentNo);

        list.sort((a, b) => {
            const aKey = getKey(a);
            const bKey = getKey(b);

            const aPrinted = aKey ? printsMap?.[aKey]?.PrintedDate : null;
            const bPrinted = bKey ? printsMap?.[bKey]?.PrintedDate : null;

            const aLate = isGecTedarik(a?.PickupDate, aPrinted);
            const bLate = isGecTedarik(b?.PickupDate, bPrinted);

            if (aLate !== bLate) return aLate ? -1 : 1;

            if (aLate && bLate) {
                const aMin = dakikaGecikme(a?.PickupDate, aPrinted) ?? 0;
                const bMin = dakikaGecikme(b?.PickupDate, bPrinted) ?? 0;
                if (aMin !== bMin) return bMin - aMin;
            }

            const aP = a?.PickupDate ? new Date(a.PickupDate).getTime() : 0;
            const bP = b?.PickupDate ? new Date(b.PickupDate).getTime() : 0;
            return bP - aP;
        });

        return list;
    }, [altDetaylar, printsMap]);

    const vurguRengi = satir.yuzde >= 90 ? "#10b981" : satir.yuzde >= 70 ? "#3b82f6" : "#f59e0b";

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

                        {/* ✅ Ana satır chip'leri: Talep / Tedarik / Gecikme */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.7, flexWrap: "wrap", rowGap: 0.8 }}>
                            <Hap pillcolor="#0ea5e9" label={`Talep: ${satir.plan}`} />
                            <Hap pillcolor="#10b981" label={`Tedarik: ${satir.ted}`} />
                            <Hap
                                pillcolor={gecTedarikSayisi > 0 ? "#ef4444" : "#64748b"}
                                label={printsLoading ? "Geç Tedarik: ..." : `Geç Tedarik: ${gecTedarikSayisi}`}
                            />
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
                        <MiniIstatistik etiket="SPOT" deger={satir.spot} renk="#3b82f6" />
                        <MiniIstatistik etiket="FİLO" deger={satir.filo} renk="#8b5cf6" />
                        <MiniIstatistik etiket="SHÖ Basım" deger={satir.sho_b} renk="#059669" />
                        <MiniIstatistik etiket="Zamanında" deger={`%${satir.yuzde}`} renk={satir.yuzde >= 90 ? "#10b981" : "#f59e0b"} />
                    </Stack>

                    <GenisletButonu open={acik ? 1 : 0}>
                        {acik ? <MdKeyboardArrowUp size={22} /> : <MdKeyboardArrowDown size={22} />}
                    </GenisletButonu>
                </Stack>
            </KartBasligi>

            <Collapse in={acik} timeout={250} unmountOnExit>
                <SevkiyatSarmal>
                    <SatirSekmeleri value={sekme} onChange={(e, v) => setSekme(v)} variant="scrollable" scrollButtons="auto">
                        <SatirSekme label="Genel Bakış" />
                        <SatirSekme label="Zaman Çizelgesi" />
                        <SatirSekme label="Rota" />
                    </SatirSekmeleri>

                    <Box sx={{ mt: 1.5, display: "grid", gap: 12 }}>
                        {siraliAltDetaylar.map((item, idx) => {
                            const seferNo = item.TMSDespatchDocumentNo || "Planlanmadı";
                            const key = seferNoNormalizeEt(seferNo);

                            const excelKaydi = excelTarihleriSeferBazli?.[key];

                            const printedDate = key ? printsMap?.[key]?.PrintedDate : null;
                            const printedBy = key ? printsMap?.[key]?.PrintedBy : null;

                            const zaman = pickupPrintedZamanDurumu(item.PickupDate, printedDate);

                            const pickupCity = item.PickupCityName || "-";
                            const pickupCounty = item.PickupCountyName || "-";
                            const deliveryCity = item.DeliveryCityName || "-";
                            const deliveryCounty = item.DeliveryCountyName || "-";

                            const lateText =
                                zaman?.lateMinutes != null && zaman.lateMinutes > 0
                                    ? `${dakikaToSaatDakika(zaman.lateMinutes)} Geç Tedarik`
                                    : null;

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

                                            {/* ✅ Üst chip satırı: (kırmızı dairedekiler kaldırıldı)
                          - Saat chip'i KALDIRILDI
                          - "Basım var/yok" chip'i KALDIRILDI
                      */}
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.9 }}>
                                                <DurumRozeti durumId={item.OrderStatu} />

                                                <Chip size="small" label={zaman.label} sx={pillSX({ theme, isDark, color: zaman.color, solid: true })} />

                                                {lateText && (
                                                    <Chip size="small" label={lateText} sx={pillSX({ theme, isDark, color: "#ef4444" })} />
                                                )}

                                                {excelKaydi && <Chip size="small" label="Excel tarihleri var" sx={pillSX({ theme, isDark, color: "#0ea5e9" })} />}
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
                                            {/* OPERASYON */}
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

                                            {/* ✅ Yeni: GEÇ TEDARİK HESABI (Zaman Bilgileri'nin SOLUNDA) */}
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

                                            {/* ZAMAN BİLGİLERİ (artık sadece sefer açılış + sipariş) */}
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

                                            {/* ROTA ÖZETİ */}
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
                                        <Box>
                                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 950, color: theme.palette.text.secondary, letterSpacing: "0.6px" }}>
                                                YÜKLEME → BASIM (ertesi gün 10:30 kuralı)
                                            </Typography>

                                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                <Chip
                                                    icon={<MdOutlineTimer />}
                                                    label={tarihFormatla(item.PickupDate)}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.06),
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "none",
                                                    }}
                                                />

                                                <Chip
                                                    icon={<MdBolt />}
                                                    label={lateText ? lateText : zaman.label}
                                                    size="small"
                                                    sx={pillSX({ theme, isDark, color: zaman.color })}
                                                />

                                                <Chip
                                                    icon={<MdAssignment />}
                                                    label={printsLoading ? "..." : tarihFormatla(printedDate)}
                                                    size="small"
                                                    sx={pillSX({ theme, isDark, color: "#3b82f6" })}
                                                />
                                            </Stack>
                                        </Box>
                                    )}

                                    {sekme === 2 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <RotaKutusu t="pickup">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>Yükleme Noktası</Typography>
                                                </Stack>

                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: theme.palette.text.primary }}>
                                                    {pickupCity}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                    {pickupCounty}
                                                </Typography>
                                            </RotaKutusu>

                                            <Box sx={{ display: "grid", placeItems: "center", px: 1 }}>
                                                <MdLocalShipping size={28} color="#3b82f6" />
                                            </Box>

                                            <RotaKutusu t="delivery">
                                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>Teslimat Noktası</Typography>
                                                    <MdPinDrop color="#ef4444" />
                                                </Stack>

                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: theme.palette.text.primary, textAlign: "right" }}>
                                                    {deliveryCity}
                                                </Typography>

                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary, textAlign: "right" }}>
                                                    {deliveryCounty}
                                                </Typography>
                                            </RotaKutusu>
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

