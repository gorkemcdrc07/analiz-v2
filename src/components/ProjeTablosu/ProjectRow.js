import React, { useMemo, useState } from "react";
import {
    Box,
    Typography,
    Stack,
    Chip,
    Collapse,
    Divider,
    alpha,
} from "@mui/material";
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

import StatusPill from "./StatusPill";

import {
    buildSubDetails,
    formatDate,
    getTimingInfo,
    normalizeSeferKey,
    toBool,
} from "./utils";

import {
    ProjectCard,
    CardHeader,
    Accent,
    Pill,
    ExpandBtn,
    ShipmentWrap,
    ShipmentCard,
    RowTabs,
    RowTab,
    RouteBox,
} from "./styles";

/** MiniStat burada inline */
function MiniStat({ label, value, color = "#0f172a" }) {
    const theme = useTheme();
    return (
        <Box sx={{ textAlign: "center", minWidth: 92 }}>
            <Typography
                sx={{
                    fontSize: "0.62rem",
                    fontWeight: 950,
                    color: theme.palette.text.secondary,
                    letterSpacing: "0.6px",
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ fontSize: "1.08rem", fontWeight: 1000, color }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function ProjectRow({ row, allData, excelTimesBySefer }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState(0);

    const subDetails = useMemo(
        () => buildSubDetails(row.name, allData),
        [row.name, allData]
    );

    const accentColor =
        row.yuzde >= 90 ? "#10b981" : row.yuzde >= 70 ? "#3b82f6" : "#f59e0b";

    return (
        <ProjectCard
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            whileHover={{ y: -2 }}
        >
            <CardHeader
                onClick={() => setOpen((s) => !s)}
                style={{ cursor: "pointer" }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Accent color={accentColor} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 1000,
                                color: theme.palette.text.primary,
                                fontSize: "1.06rem",
                                letterSpacing: "-0.5px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: { xs: 220, md: 560 },
                            }}
                        >
                            {row.name}
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mt: 0.7, flexWrap: "wrap" }}
                        >
                            <Pill pillcolor="#0ea5e9" label={`Talep: ${row.plan}`} />
                            <Pill pillcolor="#10b981" label={`Tedarik: ${row.ted}`} />
                            <Pill pillcolor="#ef4444" label={`Gecikme: ${row.gec}`} />
                            <Pill pillcolor="#b91c1c" label={`İptal: ${row.iptal}`} />
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
                        <MiniStat label="SPOT" value={row.spot} color="#3b82f6" />
                        <MiniStat label="FİLO" value={row.filo} color="#8b5cf6" />
                        <MiniStat label="Basım" value={row.sho_b} color="#059669" />
                        <MiniStat
                            label="Zamanında"
                            value={`%${row.yuzde}`}
                            color={row.yuzde >= 90 ? "#10b981" : "#f59e0b"}
                        />
                    </Stack>

                    <ExpandBtn open={open ? 1 : 0}>
                        {open ? (
                            <MdKeyboardArrowUp size={22} />
                        ) : (
                            <MdKeyboardArrowDown size={22} />
                        )}
                    </ExpandBtn>
                </Stack>
            </CardHeader>

            <Collapse in={open} timeout={250} unmountOnExit>
                <ShipmentWrap>
                    <RowTabs
                        value={tab}
                        onChange={(e, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <RowTab label="Genel Bakış" />
                        <RowTab label="Zaman Çizelgesi" />
                        <RowTab label="Rota" />
                    </RowTabs>

                    <Box sx={{ mt: 1.5, display: "grid", gap: 12 }}>
                        {subDetails.map((item, idx) => {
                            const timing = getTimingInfo(
                                item.TMSDespatchCreatedDate,
                                item.PickupDate
                            );
                            const printed = toBool(item.IsPrint);

                            const seferNo = item.TMSDespatchDocumentNo || "Planlanmadı";
                            const excelTimes =
                                excelTimesBySefer?.[normalizeSeferKey(seferNo)];

                            const pickupCity = item.PickupCityName || "-";
                            const pickupCounty = item.PickupCountyName || "-";
                            const deliveryCity = item.DeliveryCityName || "-";
                            const deliveryCounty = item.DeliveryCountyName || "-";

                            return (
                                <ShipmentCard
                                    key={`${item.TMSVehicleRequestDocumentNo || idx}`}
                                    printed={printed ? 1 : 0}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        sx={{ mb: 1 }}
                                    >
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

                                            <Typography
                                                sx={{
                                                    fontWeight: 1000,
                                                    color: theme.palette.text.primary,
                                                    fontSize: "1.05rem",
                                                }}
                                            >
                                                {seferNo}
                                            </Typography>

                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                                sx={{ mt: 1, flexWrap: "wrap" }}
                                            >
                                                <StatusPill statusIdRaw={item.OrderStatu} />

                                                <Chip
                                                    size="small"
                                                    label={timing.label}
                                                    sx={{
                                                        height: 24,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark
                                                            ? alpha(timing.color, 0.28)
                                                            : timing.color,
                                                        color: "#fff",
                                                        border: isDark
                                                            ? `1px solid ${alpha(timing.color, 0.45)}`
                                                            : "none",
                                                    }}
                                                />

                                                {timing.hours != null && (
                                                    <Chip
                                                        size="small"
                                                        label={`${timing.hours.toFixed(1)} saat`}
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: alpha(
                                                                timing.color,
                                                                isDark ? 0.22 : 0.12
                                                            ),
                                                            color: isDark
                                                                ? theme.palette.text.primary
                                                                : timing.color,
                                                            border: `1px solid ${alpha(
                                                                timing.color,
                                                                isDark ? 0.32 : 0.22
                                                            )}`,
                                                        }}
                                                    />
                                                )}

                                                <Chip
                                                    size="small"
                                                    label={printed ? "Basım var" : "Basım yok"}
                                                    sx={{
                                                        height: 24,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: printed
                                                            ? alpha("#10b981", isDark ? 0.18 : 0.14)
                                                            : alpha("#64748b", isDark ? 0.18 : 0.12),
                                                        color: printed
                                                            ? isDark
                                                                ? theme.palette.text.primary
                                                                : "#059669"
                                                            : theme.palette.text.secondary,
                                                        border: `1px solid ${printed
                                                                ? alpha("#10b981", isDark ? 0.3 : 0.24)
                                                                : alpha("#64748b", isDark ? 0.28 : 0.2)
                                                            }`,
                                                    }}
                                                />

                                                {excelTimes && (
                                                    <Chip
                                                        size="small"
                                                        label="Excel tarihleri var"
                                                        sx={{
                                                            height: 24,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: alpha("#0ea5e9", isDark ? 0.18 : 0.12),
                                                            color: isDark
                                                                ? theme.palette.text.primary
                                                                : "#0ea5e9",
                                                            border: `1px solid ${alpha(
                                                                "#0ea5e9",
                                                                isDark ? 0.28 : 0.2
                                                            )}`,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>

                                        <Chip
                                            size="small"
                                            label={`#${idx + 1}`}
                                            sx={{
                                                height: 26,
                                                borderRadius: 999,
                                                fontWeight: 1000,
                                                bgcolor: isDark
                                                    ? alpha("#ffffff", 0.06)
                                                    : alpha("#0f172a", 0.06),
                                                color: theme.palette.text.primary,
                                                border: isDark
                                                    ? `1px solid ${alpha("#ffffff", 0.1)}`
                                                    : "none",
                                            }}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 1.2, opacity: isDark ? 0.18 : 0.6 }} />

                                    {tab === 0 && (
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            spacing={2}
                                            alignItems="stretch"
                                        >
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
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
                                                            bgcolor: isDark
                                                                ? alpha("#ffffff", 0.06)
                                                                : "rgba(15,23,42,0.06)",
                                                            border: isDark
                                                                ? `1px solid ${alpha("#ffffff", 0.1)}`
                                                                : "none",
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
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    ZAMAN BİLGİLERİ
                                                </Typography>
                                                <Stack sx={{ mt: 1 }} spacing={0.8}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdHistory color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sefer açılış: {formatDate(item.TMSDespatchCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdOutlineTimer color="#10b981" />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Yükleme: {formatDate(item.PickupDate)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <MdAssignment color={isDark ? "#94a3b8" : "#64748b"} />
                                                        <Typography sx={{ fontWeight: 900, color: theme.palette.text.primary }}>
                                                            Sipariş: {formatDate(item.OrderCreatedDate)}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 950,
                                                        color: theme.palette.text.secondary,
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
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

                                    {tab === 1 && (
                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 950,
                                                    color: theme.palette.text.secondary,
                                                    letterSpacing: "0.6px",
                                                }}
                                            >
                                                SEFER AÇILIŞ → YÜKLEME (30 saat kuralı)
                                            </Typography>

                                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                <Chip
                                                    icon={<MdHistory />}
                                                    label={formatDate(item.TMSDespatchCreatedDate)}
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
                                                    label={timing.hours == null ? "---" : `${timing.hours.toFixed(1)} saat`}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 1000,
                                                        bgcolor: alpha(timing.color, isDark ? 0.22 : 0.14),
                                                        color: isDark ? theme.palette.text.primary : timing.color,
                                                        border: `1px solid ${alpha(timing.color, isDark ? 0.32 : 0.22)}`,
                                                    }}
                                                />

                                                <Chip
                                                    icon={<MdOutlineTimer />}
                                                    label={formatDate(item.PickupDate)}
                                                    size="small"
                                                    sx={{
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: alpha("#10b981", isDark ? 0.16 : 0.1),
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#10b981", 0.2)}` : "none",
                                                    }}
                                                />
                                            </Stack>
                                        </Box>
                                    )}

                                    {tab === 2 && (
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                                            <RouteBox t="pickup">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <MdPinDrop color="#10b981" />
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        Yükleme Noktası
                                                    </Typography>
                                                </Stack>
                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: theme.palette.text.primary }}>
                                                    {pickupCity}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary }}>
                                                    {pickupCounty}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={`Kod: ${item.PickupAddressCode || "-"}`}
                                                    sx={{
                                                        mt: 1.2,
                                                        borderRadius: 999,
                                                        fontWeight: 950,
                                                        bgcolor: isDark ? alpha("#ffffff", 0.06) : "#fff",
                                                        color: theme.palette.text.primary,
                                                        border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                    }}
                                                />
                                            </RouteBox>

                                            <Box sx={{ display: "grid", placeItems: "center", px: 1 }}>
                                                <MdLocalShipping size={28} color="#3b82f6" />
                                            </Box>

                                            <RouteBox t="delivery">
                                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                                    <Typography sx={{ fontWeight: 1000, color: theme.palette.text.primary }}>
                                                        Teslimat Noktası
                                                    </Typography>
                                                    <MdPinDrop color="#ef4444" />
                                                </Stack>

                                                <Typography sx={{ mt: 0.8, fontWeight: 1000, color: theme.palette.text.primary, textAlign: "right" }}>
                                                    {deliveryCity}
                                                </Typography>

                                                <Typography sx={{ fontWeight: 900, color: theme.palette.text.secondary, textAlign: "right" }}>
                                                    {deliveryCounty}
                                                </Typography>

                                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                    <Chip
                                                        size="small"
                                                        label={`Kod: ${item.DeliveryAddressCode || "-"}`}
                                                        sx={{
                                                            mt: 1.2,
                                                            borderRadius: 999,
                                                            fontWeight: 950,
                                                            bgcolor: isDark ? alpha("#ffffff", 0.06) : "#fff",
                                                            color: theme.palette.text.primary,
                                                            border: isDark ? `1px solid ${alpha("#ffffff", 0.1)}` : "1px solid rgba(226,232,240,0.9)",
                                                        }}
                                                    />
                                                </Box>
                                            </RouteBox>
                                        </Stack>
                                    )}
                                </ShipmentCard>
                            );
                        })}
                    </Box>
                </ShipmentWrap>
            </Collapse>
        </ProjectCard>
    );
}
