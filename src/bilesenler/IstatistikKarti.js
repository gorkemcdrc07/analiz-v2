import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import { Box, Paper, Typography, styled, alpha } from '@mui/material';
import {
    MdTrendingUp,
    MdErrorOutline,
    MdInfoOutline,
    MdCheckCircleOutline,
    MdHelpOutline,
    MdArrowForward
} from 'react-icons/md';

// --- MODERN STYLED COMPONENT ---
const StyledCard = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'renkConfig' && prop !== 'clickable'
})(({ theme, renkConfig, clickable }) => ({
    position: 'relative',
    overflow: 'hidden',
    background: '#ffffff', // Temiz beyaz arka plan
    padding: '20px',
    borderRadius: '20px',
    border: `1px solid ${alpha(renkConfig.color, 0.12)}`,
    cursor: clickable ? 'pointer' : 'default',
    width: '100%',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
    '&:hover': clickable ? {
        transform: 'translateY(-5px)',
        boxShadow: `0 12px 24px ${alpha(renkConfig.color, 0.08)}`,
        borderColor: renkConfig.color,
    } : {},
    // Sağ üst köşeye hafif bir renk dokunuşu
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '40px',
        height: '40px',
        background: `linear-gradient(225deg, ${alpha(renkConfig.color, 0.1)} 0%, transparent 50%)`,
    }
}));

export default function IstatistikKarti({ baslik, deger, renk = 'neutral', onClick }) {
    const configs = useMemo(() => ({
        success: { color: '#10b981', icon: <MdCheckCircleOutline size={20} /> },
        danger: { color: '#f43f5e', icon: <MdErrorOutline size={20} /> },
        warning: { color: '#f59e0b', icon: <MdTrendingUp size={20} /> },
        info: { color: '#3b82f6', icon: <MdInfoOutline size={20} /> },
        neutral: { color: '#64748b', icon: <MdHelpOutline size={20} /> }
    }), []);

    const activeConfig = configs[renk] || configs.neutral;
    const numericValue = Number(deger) || 0;
    const clickable = typeof onClick === 'function';

    return (
        <StyledCard
            elevation={0}
            onClick={clickable ? onClick : undefined}
            renkConfig={activeConfig}
            clickable={clickable}
        >
            {/* Üst Satır: Başlık ve İkon */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography
                    sx={{
                        fontWeight: 700,
                        color: '#64748b',
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
                        bgcolor: alpha(activeConfig.color, 0.1),
                        p: 0.8,
                        borderRadius: '10px',
                    }}
                >
                    {activeConfig.icon}
                </Box>
            </Box>

            {/* Orta Satır: Değer */}
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        color: '#1e293b',
                        lineHeight: 1
                    }}
                >
                    <CountUp end={numericValue} duration={1.5} separator="." />
                </Typography>
                <Typography
                    sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}
                >
                    adet
                </Typography>
            </Box>

            {/* Alt Satır: İnteraktif İpucu */}
            {clickable ? (
                <Box sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: `1px dashed ${alpha(activeConfig.color, 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography sx={{ color: activeConfig.color, fontWeight: 700, fontSize: '0.65rem' }}>
                        DETAYLARI İNCELE
                    </Typography>
                    <MdArrowForward size={14} color={activeConfig.color} />
                </Box>
            ) : (
                <Box sx={{ mt: 1.5, height: '14px' }} /> // Boşluk koruyucu
            )}
        </StyledCard>
    );
}