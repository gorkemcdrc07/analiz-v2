// src/ozellikler/analiz-paneli/bilesenler/ProjeSatiri.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
    Box, Collapse, Stack, Typography, alpha, Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    MdKeyboardArrowDown, MdLocalShipping, MdPinDrop,
    MdHistory, MdOutlineTimer, MdAssignment, MdPerson, MdCheckCircle,
    MdDoNotDisturbAlt, MdErrorOutline, MdContentCopy,
    MdCall, MdAccountCircle, MdBadge, MdPayments, MdDirectionsCar, MdShoppingCart,
} from "react-icons/md";
import { RiTruckLine, RiTimeLine, RiMapPinLine, RiMapPin2Line, RiShieldCheckLine } from "react-icons/ri";
import { TbRoute, TbClockHour4, TbFileInvoice } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";

import DurumRozeti from "./DurumRozeti";
import MiniIstatistik from "./MiniIstatistik";
import { altDetaylariOlustur } from "../../yardimcilar/veriKurallari";
import { seferNoNormalizeEt } from "../../yardimcilar/metin";
import { tarihFormatla } from "../../yardimcilar/tarih";
import {
    ProjeKarti, KartBasligi, VurguCubugu, GenisletButonu,
    SevkiyatSarmal, SevkiyatKarti, SatirSekmeleri, SatirSekme,
} from "../../stiller/stilBilesenleri";

/* ─── tarih yardımcıları ─────────────────────────────────────────────────── */
const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s0 = String(v).trim();
    if (!s0) return null;
    const isoFix = (s) => {
        const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([Zz]|([+-]\d{2}:\d{2}))?$/);
        if (!m) return s;
        const ms3 = m[3] ? (m[3] + "000").slice(0, 3) : "";
        return `${m[1]}${ms3 ? "." + ms3 : ""}${m[4] || ""}`;
    };
    const s = isoFix(s0);
    const mTR = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (mTR) {
        const d = new Date(+mTR[3], +mTR[2] - 1, +mTR[1], +mTR[4] ?? 0, +mTR[5] ?? 0, +mTR[6] ?? 0);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const mYMD = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (mYMD) {
        const d = new Date(+mYMD[1], +mYMD[2] - 1, +mYMD[3], +mYMD[4], +mYMD[5], +mYMD[6] ?? 0);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const truncateToMinute = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const x = new Date(d);
    x.setSeconds(0, 0);
    return x;
};

const isGecTedarik = (pickupDate, loadingDate) => {
    const yuklemeTarihi = truncateToMinute(parseTRDateTime(pickupDate));
    const noktayaGelis = truncateToMinute(parseTRDateTime(loadingDate));

    if (!yuklemeTarihi || !noktayaGelis) return false;

    const farkSaat = (noktayaGelis.getTime() - yuklemeTarihi.getTime()) / (1000 * 60 * 60);
    return farkSaat >= 30;
};

const dakikaGecikme = (pickupDate, loadingDate) => {
    const yuklemeTarihi = truncateToMinute(parseTRDateTime(pickupDate));
    const noktayaGelis = truncateToMinute(parseTRDateTime(loadingDate));
    if (!yuklemeTarihi || !noktayaGelis) return null;

    const diffMs = noktayaGelis.getTime() - yuklemeTarihi.getTime() - (30 * 60 * 60 * 1000);
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
};
const yuklemeGelisZamanDurumu = (pickupDate, loadingDate) => {
    const yuklemeTarihi = parseTRDateTime(pickupDate);
    const noktayaGelis = parseTRDateTime(loadingDate);

    if (!yuklemeTarihi || !noktayaGelis) {
        return { label: "Tarih yok", color: "#64748b", lateMinutes: null };
    }

    const late = isGecTedarik(pickupDate, loadingDate);

    return {
        label: late ? "Yüklemeye Geciken" : "Zamanında",
        color: late ? "#F87171" : "#34D399",
        lateMinutes: late ? dakikaGecikme(pickupDate, loadingDate) : 0,
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

const zamanindaRenkFromPct = (pct) => {
    const p = Number(pct ?? 0);
    if (!Number.isFinite(p)) return "#64748b";
    if (p >= 95) return "#00E5A0";
    if (p >= 90) return "#34D399";
    if (p >= 80) return "#60A5FA";
    if (p >= 70) return "#FBBF24";
    if (p >= 50) return "#FB923C";
    return "#F87171";
};

const formatTL = (val) => {
    if (val == null || val === "") return null;
    const n = Number(String(val).replace(/\./g, "").replace(",", ".").trim());
    if (!Number.isFinite(n)) return String(val);
    try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n); }
    catch { return `${n.toLocaleString("tr-TR")} ₺`; }
};

const copyToClipboard = async (text) => {
    try { if (text) await navigator.clipboard.writeText(String(text)); } catch { }
};

/* ══════════════════════════════════════════════════════════════════════════
   ATOM: MetricPill — kompakt istatistik hapı
══════════════════════════════════════════════════════════════════════════ */
function MetricPill({ icon, label, value, color, isDark }) {
    const acc = color || "#818CF8";
    return (
        <Box sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            px: 1.25, py: 0.65, borderRadius: "10px",
            background: `${acc}12`,
            border: `1px solid ${acc}22`,
            transition: "all 0.18s",
            "&:hover": { background: `${acc}1E`, borderColor: `${acc}35`, transform: "translateY(-1px)" },
        }}>
            <Box sx={{ color: `${acc}CC`, display: "flex", fontSize: 14 }}>{icon}</Box>
            <Box>
                <Typography sx={{
                    fontSize: "0.58rem", fontWeight: 700, lineHeight: 1,
                    color: `${acc}88`, letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                    {label}
                </Typography>
                <Typography sx={{
                    fontSize: "0.9rem", fontWeight: 900, lineHeight: 1.15,
                    color: isDark ? "#E8EEFF" : "#0F1729",
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                }}>
                    {value}
                </Typography>
            </Box>
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   ATOM: StatusBadge — durum etiketi
══════════════════════════════════════════════════════════════════════════ */
function StatusBadge({ label, color, filled = false, size = "md" }) {
    const isSmall = size === "sm";
    return (
        <Box component="span" sx={{
            display: "inline-flex", alignItems: "center",
            px: isSmall ? 0.75 : 1, py: isSmall ? 0.2 : 0.3,
            borderRadius: "6px",
            fontSize: isSmall ? "0.62rem" : "0.67rem",
            fontWeight: 800, letterSpacing: "0.04em",
            border: `0.5px solid ${color}40`,
            background: filled ? `${color}25` : `${color}12`,
            color: color,
            whiteSpace: "nowrap",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
        }}>
            {label}
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   ATOM: PerformanceRing — mini daire progress
══════════════════════════════════════════════════════════════════════════ */
function PerformanceRing({ value, color, size = 40 }) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const dash = circ * (1 - value / 100);
    return (
        <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}18`} strokeWidth={3} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: dash }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </svg>
            <Box sx={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Typography sx={{
                    fontSize: "0.58rem", fontWeight: 900, color,
                    letterSpacing: "-0.02em", lineHeight: 1,
                }}>
                    {value}%
                </Typography>
            </Box>
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   ATOM: DataField — tek satır bilgi alanı
══════════════════════════════════════════════════════════════════════════ */
function DataField({ icon, label, value, mono = false, copyable = false, accentColor, isDark }) {
    const acc = accentColor || "#818CF8";
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await copyToClipboard(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const empty = !value || value === "-";

    return (
        <Stack
            direction="row" alignItems="center" spacing={1}
            sx={{
                px: 1.25, py: 0.8, borderRadius: "9px",
                transition: "background 0.15s",
                "&:hover": {
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.025)",
                },
                "&:hover .cp-btn": { opacity: 1 },
            }}
        >
            <Box sx={{ color: `${acc}99`, display: "flex", fontSize: 14, flexShrink: 0 }}>{icon}</Box>
            <Typography sx={{
                fontSize: "0.68rem", fontWeight: 600, minWidth: 100, flexShrink: 0,
                color: isDark ? "rgba(160,170,200,0.5)" : "rgba(80,90,120,0.55)",
                letterSpacing: "0.02em",
            }}>
                {label}
            </Typography>
            <Box sx={{
                flex: 1, height: "1px",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                alignSelf: "center",
            }} />
            <Typography sx={{
                fontSize: "0.8rem", fontWeight: 800,
                color: empty
                    ? (isDark ? "rgba(160,170,200,0.2)" : "rgba(80,90,120,0.2)")
                    : (isDark ? "#E0E8FF" : "#0F1729"),
                fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
                letterSpacing: mono ? "0.02em" : "inherit",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 200,
            }} title={value}>
                {value || "—"}
            </Typography>
            {copyable && !empty && (
                <Box
                    className="cp-btn"
                    onClick={handleCopy}
                    sx={{
                        opacity: 0, cursor: "pointer", display: "flex",
                        color: copied ? "#34D399" : (isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)"),
                        transition: "all 0.15s",
                        "&:hover": { color: "#818CF8" },
                    }}
                >
                    {copied ? <MdCheckCircle size={13} /> : <MdContentCopy size={13} />}
                </Box>
            )}
        </Stack>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOLECULE: RouteBar — rota görselleştirmesi
══════════════════════════════════════════════════════════════════════════ */
function RouteBar({ pickupCity, pickupCounty, deliveryCity, deliveryCounty, isDark }) {
    return (
        <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 1.5, py: 1, borderRadius: "12px",
            background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
            border: `0.5px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
        }}>
            {/* Kalkış */}
            <Stack alignItems="flex-start" sx={{ minWidth: 0 }}>
                <Typography sx={{
                    fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em",
                    color: "#34D399", textTransform: "uppercase",
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                }}>
                    Yükleme
                </Typography>
                <Typography sx={{
                    fontSize: "0.82rem", fontWeight: 900, lineHeight: 1.2,
                    color: isDark ? "#E0E8FF" : "#0F1729", letterSpacing: "-0.02em",
                }}>
                    {pickupCity}
                </Typography>
                <Typography sx={{
                    fontSize: "0.65rem", fontWeight: 600,
                    color: isDark ? "rgba(160,170,200,0.45)" : "rgba(80,90,120,0.5)",
                }}>
                    {pickupCounty}
                </Typography>
            </Stack>

            {/* Çizgi */}
            <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                <Box sx={{
                    position: "absolute", inset: 0,
                    borderTop: `1.5px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                    top: "50%",
                }} />
                <Box sx={{
                    mx: "auto", width: 28, height: 28, borderRadius: "8px",
                    background: isDark ? "rgba(10,14,26,0.9)" : "rgba(248,250,255,0.95)",
                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", zIndex: 1,
                    backdropFilter: "blur(8px)",
                }}>
                    <RiTruckLine size={13} color={isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)"} />
                </Box>
            </Box>

            {/* Varış */}
            <Stack alignItems="flex-end" sx={{ minWidth: 0 }}>
                <Typography sx={{
                    fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em",
                    color: "#60A5FA", textTransform: "uppercase",
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                }}>
                    Teslimat
                </Typography>
                <Typography sx={{
                    fontSize: "0.82rem", fontWeight: 900, lineHeight: 1.2,
                    color: isDark ? "#E0E8FF" : "#0F1729", letterSpacing: "-0.02em",
                    textAlign: "right",
                }}>
                    {deliveryCity}
                </Typography>
                <Typography sx={{
                    fontSize: "0.65rem", fontWeight: 600, textAlign: "right",
                    color: isDark ? "rgba(160,170,200,0.45)" : "rgba(80,90,120,0.5)",
                }}>
                    {deliveryCounty}
                </Typography>
            </Stack>
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOLECULE: TimingCard — zaman bilgileri bloğu
══════════════════════════════════════════════════════════════════════════ */
function TimingCard({ label, accent, rows, isDark }) {
    const acc = accent || "#818CF8";
    return (
        <Box sx={{
            flex: 1, borderRadius: "14px", overflow: "hidden",
            border: `1px solid ${acc}18`,
            background: isDark ? "rgba(10,14,26,0.5)" : "rgba(255,255,255,0.7)",
        }}>
            <Box sx={{
                px: 1.5, py: 0.85,
                borderBottom: `1px solid ${acc}12`,
                background: `${acc}08`,
                display: "flex", alignItems: "center", gap: 0.75,
            }}>
                <Box sx={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: acc, boxShadow: `0 0 6px ${acc}`,
                }} />
                <Typography sx={{
                    fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: `${acc}CC`,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                }}>
                    {label}
                </Typography>
            </Box>
            <Box sx={{ px: 0.5, py: 0.5 }}>
                {rows.map((row, i) => (
                    <DataField
                        key={i}
                        icon={row.icon}
                        label={row.label}
                        value={row.value}
                        mono={row.mono}
                        copyable={row.copyable}
                        isDark={isDark}
                        accentColor={row.color || acc}
                    />
                ))}
            </Box>
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOLECULE: VehiclePanel — araç bilgi kartı
══════════════════════════════════════════════════════════════════════════ */
function VehiclePanel({ vehicle, loading, isDark }) {
    const safe = vehicle || {};
    const v = (x) => (x == null || x === "" ? null : x);
    const navlunTL = formatTL(v(safe.FreightAmount));
    const hasAny = !!v(safe.PlateNumber) || !!v(safe.FullName) || !!v(safe.VehicleCurrentAccountTitle);

    return (
        <Box sx={{
            borderRadius: "14px", overflow: "hidden",
            border: `1px solid ${isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)"}`,
            background: isDark ? "rgba(10,14,26,0.5)" : "rgba(248,250,255,0.8)",
        }}>
            {/* Header */}
            <Box sx={{
                px: 1.75, py: 1.1,
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                background: "rgba(99,102,241,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{
                        width: 26, height: 26, borderRadius: "8px",
                        background: "rgba(99,102,241,0.15)",
                        border: "0.5px solid rgba(99,102,241,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#818CF8",
                    }}>
                        <MdDirectionsCar size={14} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: "-0.01em", color: isDark ? "#C7D2FE" : "#3730A3" }}>
                        Araç Bilgileri
                    </Typography>
                </Stack>
                <StatusBadge
                    label={loading ? "Yükleniyor" : hasAny ? "✓ Mevcut" : "Bulunamadı"}
                    color={loading ? "#64748b" : hasAny ? "#34D399" : "#94A3B8"}
                    filled
                />
            </Box>

            {/* İçerik */}
            {loading ? (
                <Box sx={{ p: 1.5 }}>
                    {[1, 2, 3].map(i => (
                        <Box key={i} sx={{
                            height: 34, borderRadius: "9px", mb: 0.75,
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                            animation: "shimmer 1.4s ease-in-out infinite",
                            "@keyframes shimmer": {
                                "0%, 100%": { opacity: 0.5 },
                                "50%": { opacity: 1 },
                            },
                        }} />
                    ))}
                </Box>
            ) : (
                <Box sx={{ p: 0.75 }}>
                    {/* Plaka + Treyler chips */}
                    {(v(safe.PlateNumber) || v(safe.TrailerPlateNumber) || navlunTL || v(safe.KasaTipi)) && (
                        <Box sx={{
                            display: "flex", flexWrap: "wrap", gap: 0.75,
                            px: 0.75, py: 0.75, mb: 0.5,
                        }}>
                            {v(safe.PlateNumber) && (
                                <Box
                                    onClick={() => copyToClipboard(safe.PlateNumber)}
                                    sx={{
                                        display: "inline-flex", alignItems: "center", gap: 0.5,
                                        px: 1.25, py: 0.5, borderRadius: "8px", cursor: "pointer",
                                        background: "rgba(96,165,250,0.1)",
                                        border: "0.5px solid rgba(96,165,250,0.25)",
                                        color: "#60A5FA",
                                        fontSize: "0.75rem", fontWeight: 900,
                                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                                        letterSpacing: "0.04em",
                                        transition: "all 0.15s",
                                        "&:hover": { background: "rgba(96,165,250,0.18)", transform: "scale(1.02)" },
                                    }}
                                >
                                    <MdDirectionsCar size={12} />
                                    {safe.PlateNumber}
                                </Box>
                            )}
                            {v(safe.TrailerPlateNumber) && (
                                <Box
                                    onClick={() => copyToClipboard(safe.TrailerPlateNumber)}
                                    sx={{
                                        display: "inline-flex", alignItems: "center", gap: 0.5,
                                        px: 1.25, py: 0.5, borderRadius: "8px", cursor: "pointer",
                                        background: "rgba(167,139,250,0.1)",
                                        border: "0.5px solid rgba(167,139,250,0.25)",
                                        color: "#A78BFA",
                                        fontSize: "0.75rem", fontWeight: 900,
                                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                                        letterSpacing: "0.04em",
                                        transition: "all 0.15s",
                                        "&:hover": { background: "rgba(167,139,250,0.18)", transform: "scale(1.02)" },
                                    }}
                                >
                                    <MdLocalShipping size={12} />
                                    {safe.TrailerPlateNumber}
                                </Box>
                            )}
                            {navlunTL && <StatusBadge label={navlunTL} color="#34D399" filled />}
                            {v(safe.KasaTipi) && <StatusBadge label={safe.KasaTipi} color="#FBBF24" />}
                        </Box>
                    )}

                    {/* Data Alanları */}
                    <Box>
                        <DataField icon={<MdAccountCircle />} label="Ruhsat Sahibi" value={v(safe.VehicleCurrentAccountTitle)} isDark={isDark} accentColor="#818CF8" />
                        <DataField icon={<MdBadge />} label="Şoför" value={v(safe.FullName)} isDark={isDark} accentColor="#60A5FA" />
                        <DataField icon={<MdPayments />} label="Navlun" value={navlunTL} mono isDark={isDark} accentColor="#34D399" />
                        <DataField icon={<MdCall />} label="Telefon" value={v(safe.PhoneNumber)} mono copyable isDark={isDark} accentColor="#60A5FA" />
                        <DataField icon={<MdBadge />} label="TC Kimlik" value={v(safe.CitizenNumber)} mono copyable isDark={isDark} accentColor="#A78BFA" />
                    </Box>

                    {/* Arama Butonu */}
                    {v(safe.PhoneNumber) && (
                        <Box sx={{ px: 0.75, pt: 0.75, pb: 0.25 }}>
                            <Box
                                component="a"
                                href={`tel:${String(safe.PhoneNumber).replace(/\s+/g, "")}`}
                                sx={{
                                    display: "inline-flex", alignItems: "center", gap: 0.75,
                                    px: 1.5, py: 0.65, borderRadius: "9px", textDecoration: "none",
                                    background: "rgba(96,165,250,0.1)",
                                    border: "0.5px solid rgba(96,165,250,0.25)",
                                    color: "#60A5FA",
                                    fontSize: "0.73rem", fontWeight: 800, letterSpacing: "0.02em",
                                    transition: "all 0.15s",
                                    "&:hover": { background: "rgba(96,165,250,0.18)", boxShadow: "0 0 12px rgba(96,165,250,0.2)" },
                                }}
                            >
                                <MdCall size={13} />
                                Şoförü Ara
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   ORGANISM: SeferKarti — tek sefer detay kartı
══════════════════════════════════════════════════════════════════════════ */
function SeferKarti({ item, idx, sekme, excelTarihleriSeferBazli, printsLoading, vehicleMap, vehicleLoading, isDark }) {
    const seferNo = item.TMSDespatchDocumentNo || "Planlanmadı";
    const key = seferNoNormalizeEt(seferNo);
    const excelKaydi = key ? excelTarihleriSeferBazli?.[key] : null;
    const zaman = yuklemeGelisZamanDurumu(
        item?.PickupDate,
        item?.TMSLoadingDocumentPrintedDate
    );
    const lateText = zaman?.lateMinutes > 0 ? `+${dakikaToSaatDakika(zaman.lateMinutes)}` : null;
    const vehicle = key ? vehicleMap?.[key] : null;
    const hasVehicle = !!vehicle;
    const loadingDate = item?.TMSLoadingDocumentPrintedDate || null;
    const loadingUser = item?.TMSLoadingDocumentPrintedBy || null;
    const isLate = zaman.label === "Geç Tedarik";

    const LATE_RED = "#F87171";
    const borderAcc = isLate ? LATE_RED : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)");

    return (
        <motion.div
            key={item.TMSVehicleRequestDocumentNo || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.05 }}
        >
            <Box sx={{
                borderRadius: "16px", overflow: "hidden",
                border: `1px solid ${borderAcc}`,
                background: isDark
                    ? (isLate ? "rgba(248,113,113,0.04)" : "rgba(12,16,28,0.5)")
                    : (isLate ? "rgba(248,113,113,0.02)" : "rgba(255,255,255,0.8)"),
                backdropFilter: "blur(12px)",
                boxShadow: isLate
                    ? `0 0 0 0.5px ${LATE_RED}18, 0 4px 24px rgba(248,113,113,0.08)`
                    : `0 2px 16px rgba(0,0,0,${isDark ? 0.25 : 0.04})`,
                position: "relative",
            }}>
                {/* Geç tedarik sol vurgu çizgisi */}
                {isLate && (
                    <Box sx={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
                        background: `linear-gradient(180deg, transparent, ${LATE_RED}, transparent)`,
                        borderRadius: "16px 0 0 16px",
                    }} />
                )}

                {/* ── SEFER BAŞLIK ALANI ─────────────────────────────────── */}
                <Box sx={{
                    px: isLate ? 2.5 : 2, py: 1.25,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                    background: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 1,
                }}>
                    <Stack direction="row" alignItems="center" spacing={1.75} flexWrap="wrap" gap={0.75}>
                        {/* Sefer No */}
                        <Box>
                            <Typography sx={{
                                fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.12em",
                                color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)",
                                textTransform: "uppercase",
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                            }}>
                                Sefer No
                            </Typography>
                            <Typography sx={{
                                fontWeight: 900, fontSize: "0.95rem", letterSpacing: "-0.02em",
                                color: isDark ? "#E0E8FF" : "#0F1729",
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                            }}>
                                {seferNo}
                            </Typography>
                        </Box>

                        {/* Dikey ayraç */}
                        <Box sx={{
                            width: "1px", height: 28, flexShrink: 0,
                            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                            display: { xs: "none", sm: "block" },
                        }} />

                        {/* Etiketler */}
                        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" gap={0.5}>
                            <DurumRozeti durumId={item.OrderStatu} />
                            <StatusBadge label={zaman.label} color={zaman.color} filled />
                            {lateText && <StatusBadge label={lateText} color={LATE_RED} />}
                            {excelKaydi && <StatusBadge label="Excel" color="#60A5FA" />}
                            <StatusBadge
                                label={vehicleLoading ? "..." : hasVehicle ? "Araç ✓" : "Araç —"}
                                color={vehicleLoading ? "#64748b" : hasVehicle ? "#34D399" : "#94A3B8"}
                            />
                            {loadingDate && <StatusBadge label="Basıldı" color="#34D399" filled />}
                        </Stack>
                    </Stack>

                    {/* Sıra numarası */}
                    <Box sx={{
                        width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                        border: `0.5px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)"}`,
                        color: isDark ? "rgba(160,170,200,0.5)" : "rgba(80,90,120,0.5)",
                        fontSize: "0.72rem", fontWeight: 900,
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                        {idx + 1}
                    </Box>
                </Box>

                {/* ── İÇERİK ALANI ──────────────────────────────────────── */}
                <Box sx={{ px: isLate ? 2.5 : 2, py: 1.5 }}>
                    {/* Rota */}
                    <Box sx={{ mb: 1.5 }}>
                        <RouteBar
                            pickupCity={item.PickupCityName || "-"}
                            pickupCounty={item.PickupCountyName || "-"}
                            deliveryCity={item.DeliveryCityName || "-"}
                            deliveryCounty={item.DeliveryCountyName || "-"}
                            isDark={isDark}
                        />
                    </Box>

                    {/* Sekme 0: Genel Bakış */}
                    {sekme === 0 && (
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                            <TimingCard
                                label="Geç Tedarik Hesabı"
                                accent="#818CF8"
                                isDark={isDark}
                                rows={[
                                    { icon: <MdAssignment size={14} />, label: "Yükleme Tarihi", value: tarihFormatla(item?.PickupDate), color: "#818CF8" },
                                    { icon: <TbClockHour4 size={14} />, label: "Noktaya Geliş", value: tarihFormatla(loadingDate), color: "#34D399" },
                                    { icon: <MdOutlineTimer size={14} />, label: "Tahmini Varış Zamanı", value: tarihFormatla(item?.EstimatedArrivalTime), color: "#FBBF24" },
                                    { icon: <MdPerson size={14} />, label: "Oluşturan", value: loadingUser || "-" },
                                ]}
                            />
                            <TimingCard
                                label="Zaman Bilgileri"
                                accent="#60A5FA"
                                isDark={isDark}
                                rows={[
                                    { icon: <MdHistory size={14} />, label: "Sefer Açılış", value: tarihFormatla(item.TMSDespatchCreatedDate), color: "#A78BFA" },
                                    { icon: <TbFileInvoice size={14} />, label: "Sipariş", value: tarihFormatla(item.OrderCreatedDate) },
                                    { icon: <MdPerson size={14} />, label: "Operasyon", value: item.OrderCreatedBy || "-" },
                                ]}
                            />
                        </Stack>
                    )}

                    {/* Sekme 1: Araç Bilgileri */}
                    {sekme === 1 && (
                        <VehiclePanel vehicle={vehicle} loading={vehicleLoading} isDark={isDark} />
                    )}
                </Box>
            </Box>
        </motion.div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE: ProjeSatiri — ANA BİLEŞEN
══════════════════════════════════════════════════════════════════════════ */
export default function ProjeSatiri({
    satir, tumVeri, excelTarihleriSeferBazli,
    printsMap = {}, printsLoading = false,
    vehicleMap = {}, vehicleLoading = false,
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [acik, setAcik] = useState(false);
    const [sekme, setSekme] = useState(0);

    useEffect(() => { if (sekme > 1) setSekme(0); }, [sekme]);

    const altDetaylar = useMemo(() => altDetaylariOlustur(satir.name, tumVeri), [satir.name, tumVeri]);

    const gecTedarikSayisi = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? altDetaylar : [];
        return list.filter(it =>
            it?.EstimatedArrivalTime &&
            it?.TMSLoadingDocumentPrintedDate &&
            isGecTedarik(it?.PickupDate, it?.TMSLoadingDocumentPrintedDate)
        ).length;
    }, [altDetaylar]);

    const talep = useMemo(() => Math.max(0, Number(satir?.plan ?? 0) || 0), [satir?.plan]);
    const tedarikEdilen = useMemo(() => Math.max(0, Number(satir?.ted ?? 0) || 0), [satir?.ted]);
    const tedarikEdilmeyen = useMemo(() => Math.max(0, talep - tedarikEdilen), [talep, tedarikEdilen]);

    const zamanindaYuzde = useMemo(() => {
        if (!tedarikEdilen) return 0;
        return Math.max(0, Math.min(100, Math.round(((tedarikEdilen - gecTedarikSayisi) / tedarikEdilen) * 100)));
    }, [tedarikEdilen, gecTedarikSayisi]);

    const tedarikOraniYuzde = useMemo(() => {
        if (!talep) return 0;
        return Math.max(0, Math.min(100, Math.round((tedarikEdilen / talep) * 100)));
    }, [talep, tedarikEdilen]);

    const zamanindaRenk = useMemo(() => zamanindaRenkFromPct(zamanindaYuzde), [zamanindaYuzde]);
    const tedarikOraniRenk = useMemo(() => zamanindaRenkFromPct(tedarikOraniYuzde), [tedarikOraniYuzde]);

    const siraliAltDetaylar = useMemo(() => {
        const list = Array.isArray(altDetaylar) ? [...altDetaylar] : [];
        list.sort((a, b) => {
            const aLate = isGecTedarik(a?.PickupDate, a?.TMSLoadingDocumentPrintedDate);
            const bLate = isGecTedarik(b?.PickupDate, b?.TMSLoadingDocumentPrintedDate);
            if (aLate !== bLate) return aLate ? -1 : 1;
            if (aLate && bLate) {
                const aMin = dakikaGecikme(a?.PickupDate, a?.TMSLoadingDocumentPrintedDate) ?? 0;
                const bMin = dakikaGecikme(b?.PickupDate, b?.TMSLoadingDocumentPrintedDate) ?? 0;
                if (aMin !== bMin) return bMin - aMin;
            }
            return (parseTRDateTime(b?.EstimatedArrivalTime)?.getTime?.() ?? 0) - (parseTRDateTime(a?.EstimatedArrivalTime)?.getTime?.() ?? 0);
        });
        return list;
    }, [altDetaylar]);

    /* ── render ─────────────────────────────────────────────────────────── */
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, type: "spring", stiffness: 260, damping: 24 }}
        >
            <Box sx={{
                borderRadius: "18px", overflow: "hidden",
                border: `1px solid ${acik
                    ? (isDark ? `${zamanindaRenk}25` : `${zamanindaRenk}18`)
                    : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)")}`,
                background: isDark
                    ? "linear-gradient(135deg, rgba(12,16,28,0.85), rgba(16,20,36,0.9))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(248,250,255,0.95))",
                backdropFilter: "blur(20px)",
                boxShadow: acik
                    ? `0 0 0 0.5px ${zamanindaRenk}15, 0 8px 40px rgba(0,0,0,${isDark ? 0.35 : 0.08})`
                    : `0 2px 12px rgba(0,0,0,${isDark ? 0.2 : 0.04})`,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                    boxShadow: `0 0 0 0.5px ${zamanindaRenk}20, 0 6px 28px rgba(0,0,0,${isDark ? 0.3 : 0.07})`,
                    borderColor: isDark ? `${zamanindaRenk}20` : `${zamanindaRenk}15`,
                },
            }}>

                {/* ══ BAŞLIK SATIRI ══════════════════════════════════════ */}
                <Box
                    onClick={() => setAcik(s => !s)}
                    sx={{
                        px: 2, py: 1.5, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 1.5,
                        transition: "background 0.15s",
                        "&:hover": {
                            background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.015)",
                        },
                    }}
                >
                    {/* Sol vurgu çizgisi */}
                    <Box sx={{
                        width: "3px", alignSelf: "stretch", borderRadius: "999px", flexShrink: 0,
                        background: `linear-gradient(180deg, transparent, ${zamanindaRenk}, transparent)`,
                        boxShadow: `0 0 8px ${zamanindaRenk}40`,
                    }} />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* Proje adı + sağ metrikler */}
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            alignItems={{ md: "center" }}
                            justifyContent="space-between"
                            spacing={{ xs: 0.75, md: 1.5 }}
                            sx={{ mb: 1.25 }}
                        >
                            <Typography sx={{
                                fontWeight: 900,
                                fontSize: { xs: "0.95rem", md: "1rem" },
                                letterSpacing: "-0.03em",
                                color: isDark ? "#E8EEFF" : "#0F1729",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                maxWidth: { xs: "100%", md: 500 },
                            }}>
                                {satir.name}
                            </Typography>

                            {/* Desktop istatistik pill'leri */}
                            <Stack direction="row" spacing={1} sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }} alignItems="center">
                                <Box sx={{
                                    px: 1, py: 0.4, borderRadius: "8px",
                                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                                    display: "flex", gap: 1.5, alignItems: "center",
                                }}>
                                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)" }}>SPOT</Typography>
                                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: "#60A5FA" }}>{satir.spot}</Typography>
                                    </Box>
                                    <Box sx={{ width: "1px", height: 12, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }} />
                                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)" }}>FİLO</Typography>
                                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: "#A78BFA" }}>{satir.filo}</Typography>
                                    </Box>
                                    <Box sx={{ width: "1px", height: 12, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }} />
                                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)" }}>SHÖ</Typography>
                                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 900, color: "#34D399" }}>{satir.sho_b}</Typography>
                                    </Box>
                                </Box>

                                {/* Progress halkaları */}
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Tooltip title={`Zamanında Tedarik: %${zamanindaYuzde}`}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                                            <PerformanceRing value={zamanindaYuzde} color={zamanindaRenk} size={38} />
                                            <Typography sx={{ fontSize: "0.52rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.35)" : "rgba(80,90,120,0.35)", letterSpacing: "0.06em" }}>ZAMANINDA</Typography>
                                        </Box>
                                    </Tooltip>
                                    <Tooltip title={`Tedarik Oranı: %${tedarikOraniYuzde}`}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                                            <PerformanceRing value={tedarikOraniYuzde} color={tedarikOraniRenk} size={38} />
                                            <Typography sx={{ fontSize: "0.52rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.35)" : "rgba(80,90,120,0.35)", letterSpacing: "0.06em" }}>TEDARİK</Typography>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            </Stack>
                        </Stack>

                        {/* Metrik pilleri */}
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                            <MetricPill icon={<MdShoppingCart size={14} />} label="Talep" value={talep} color="#60A5FA" isDark={isDark} />
                            <MetricPill icon={<MdCheckCircle size={14} />} label="Tedarik" value={tedarikEdilen} color="#34D399" isDark={isDark} />
                            <MetricPill
                                icon={<MdDoNotDisturbAlt size={14} />}
                                label="Edilmeyen"
                                value={tedarikEdilmeyen}
                                color={tedarikEdilmeyen > 0 ? "#FBBF24" : "#64748B"}
                                isDark={isDark}
                            />
                            <MetricPill
                                icon={<MdErrorOutline size={14} />}
                                label="Geç Tedarik"
                                value={printsLoading ? "..." : gecTedarikSayisi}
                                color={printsLoading ? "#64748B" : gecTedarikSayisi > 0 ? "#F87171" : "#64748B"}
                                isDark={isDark}
                            />
                        </Stack>
                    </Box>

                    {/* Expand Butonu */}
                    <motion.div animate={{ rotate: acik ? 180 : 0 }} transition={{ duration: 0.22, type: "spring", stiffness: 300, damping: 22 }}>
                        <Box sx={{
                            width: 32, height: 32, borderRadius: "10px", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: acik ? `${zamanindaRenk}15` : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                            border: `0.5px solid ${acik ? `${zamanindaRenk}30` : (isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)")}`,
                            color: acik ? zamanindaRenk : (isDark ? "rgba(160,170,200,0.5)" : "rgba(80,90,120,0.5)"),
                            transition: "all 0.2s",
                        }}>
                            <MdKeyboardArrowDown size={18} />
                        </Box>
                    </motion.div>
                </Box>

                {/* ══ DETAY PANELİ ══════════════════════════════════════ */}
                <Collapse in={acik} timeout={240} unmountOnExit>
                    <Box sx={{
                        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                        background: isDark ? "rgba(8,12,22,0.5)" : "rgba(248,250,255,0.5)",
                    }}>
                        {/* Sekme Çubuğu */}
                        <Box sx={{
                            px: 2, pt: 1.5, pb: 1,
                            display: "flex", gap: 0.5,
                            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                        }}>
                            {["Genel Bakış", "Araç Bilgileri"].map((tab, i) => (
                                <Box
                                    key={tab}
                                    onClick={() => setSekme(i)}
                                    sx={{
                                        px: 1.5, py: 0.65, borderRadius: "9px", cursor: "pointer",
                                        transition: "all 0.18s",
                                        background: sekme === i
                                            ? (isDark ? "rgba(129,140,248,0.15)" : "rgba(129,140,248,0.1)")
                                            : "transparent",
                                        border: `0.5px solid ${sekme === i
                                            ? "rgba(129,140,248,0.3)"
                                            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")}`,
                                        "&:hover": {
                                            background: sekme === i
                                                ? undefined
                                                : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                                        },
                                    }}
                                >
                                    <Typography sx={{
                                        fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.01em",
                                        color: sekme === i
                                            ? "#818CF8"
                                            : (isDark ? "rgba(160,170,200,0.45)" : "rgba(80,90,120,0.5)"),
                                    }}>
                                        {tab}
                                    </Typography>
                                </Box>
                            ))}

                            {/* Sağ: aktif sefer sayısı */}
                            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px #34D399", animation: "pulse 2s ease-in-out infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }} />
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: isDark ? "rgba(160,170,200,0.4)" : "rgba(80,90,120,0.4)" }}>
                                    {siraliAltDetaylar.length} sefer
                                </Typography>
                            </Box>
                        </Box>

                        {/* Sefer Kartları */}
                        <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
                            {siraliAltDetaylar.map((item, idx) => (
                                <SeferKarti
                                    key={item.TMSVehicleRequestDocumentNo || idx}
                                    item={item}
                                    idx={idx}
                                    sekme={sekme}
                                    excelTarihleriSeferBazli={excelTarihleriSeferBazli}
                                    printsLoading={printsLoading}
                                    vehicleMap={vehicleMap}
                                    vehicleLoading={vehicleLoading}
                                    isDark={isDark}
                                />
                            ))}

                            {siraliAltDetaylar.length === 0 && (
                                <Box sx={{
                                    py: 4, textAlign: "center",
                                    borderRadius: "12px",
                                    border: `1px dashed ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                                }}>
                                    <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(160,170,200,0.35)" : "rgba(80,90,120,0.35)", fontWeight: 600 }}>
                                        Sefer verisi bulunamadı
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Collapse>
            </Box>
        </motion.div>
    );
}