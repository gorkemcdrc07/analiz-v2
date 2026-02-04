import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import { Box, Paper, Typography, styled, alpha } from '@mui/material';
import {
    MdTrendingUp,
    MdErrorOutline,
    MdInfoOutline,
    MdCheckCircleOutline,
    MdHelpOutline,
    MdArrowForward,
} from 'react-icons/md';

// --- MODERN THEME-AWARE STYLED COMPONENT ---
const StyledCard = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'renkConfig' && prop !== 'clickable',
})(({ theme, renkConfig, clickable }) => {
    const isDark = theme.palette.mode === 'dark';

    const cardBg = isDark ? '#0b1220' : '#ffffff';
    const baseBorder = isDark ? alpha('#ffffff', 0.08) : alpha(renkConfig.color, 0.12);

    const hoverShadow = isDark
        ? `0 18px 42px ${alpha('#000', 0.55)}`
        : `0 12px 24px ${alpha(renkConfig.color, 0.08)}`;

    return {
        position: 'relative',
        overflow: 'hidden',
        background: cardBg,
        padding: '20px',
        borderRadius: '20px',
        border: `1px solid ${baseBorder}`,
        cursor: clickable ? 'pointer' : 'default',
        width: '100%',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '120px',

        ...(clickable
            ? {
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: hoverShadow,
                    borderColor: renkConfig.color,
                },
            }
            : {}),

        // Sa�Y üst kö�Yeye hafif bir renk dokunu�Yu
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '44px',
            height: '44px',
            background: `linear-gradient(225deg, ${alpha(renkConfig.color, isDark ? 0.14 : 0.10)} 0%, transparent 55%)`,
        },
    };
});

export default function IstatistikKarti({ baslik, deger, renk = 'neutral', onClick }) {
    const configs = useMemo(
        () => ({
            success: { color: '#10b981', icon: <MdCheckCircleOutline size={20} /> },
            danger: { color: '#f43f5e', icon: <MdErrorOutline size={20} /> },
            warning: { color: '#f59e0b', icon: <MdTrendingUp size={20} /> },
            info: { color: '#3b82f6', icon: <MdInfoOutline size={20} /> },
            neutral: { color: '#64748b', icon: <MdHelpOutline size={20} /> },
        }),
        []
    );

    const activeConfig = configs[renk] || configs.neutral;
    const numericValue = Number(deger) || 0;
    const clickable = typeof onClick === 'function';

    return (
        <StyledCard elevation={0} onClick={clickable ? onClick : undefined} renkConfig={activeConfig} clickable={clickable}>
            {/* �ost Satır: Ba�Ylık ve İkon */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography
                    sx={{
                        fontWeight: 700,
                        color: (t) => t.palette.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        fontSize: '0.7rem',
                    }}
                >
                    {baslik}
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        color: activeConfig.color,
                        bgcolor: alpha(activeConfig.color, 0.12),
                        p: 0.8,
                        borderRadius: '10px',
                        border: (t) =>
                            `1px solid ${alpha(
                                activeConfig.color,
                                t.palette.mode === 'dark' ? 0.22 : 0.12
                            )}`,
                    }}
                >
                    {activeConfig.icon}
                </Box>
            </Box>

            {/* Orta Satır: De�Yer */}
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: (t) => t.palette.text.primary,
                        lineHeight: 1,
                    }}
                >
                    <CountUp end={numericValue} duration={1.5} separator="." />
                </Typography>

                <Typography
                    sx={{
                        color: (t) => alpha(t.palette.text.secondary, t.palette.mode === 'dark' ? 0.9 : 1),
                        fontWeight: 600,
                        fontSize: '0.75rem',
                    }}
                >
                    adet
                </Typography>
            </Box>

            {/* Alt Satır: İnteraktif İpucu */}
            {clickable ? (
                <Box
                    sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: (t) =>
                            `1px dashed ${t.palette.mode === 'dark'
                                ? alpha(t.palette.common.white, 0.14)
                                : alpha(activeConfig.color, 0.10)
                            }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography sx={{ color: activeConfig.color, fontWeight: 700, fontSize: '0.65rem' }}>
                        DETAYLARI İNCELE
                    </Typography>
                    <MdArrowForward size={14} color={activeConfig.color} />
                </Box>
            ) : (
                <Box sx={{ mt: 1.5, height: '14px' }} />
            )}
        </StyledCard>
    );
}
