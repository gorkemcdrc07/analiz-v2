import React from 'react';
import CountUp from 'react-countup';
import { Box, Paper, Typography, Icon } from '@mui/material';
import {
    MdTrendingUp,
    MdErrorOutline,
    MdInfoOutline,
    MdCheckCircleOutline,
    MdHelpOutline
} from 'react-icons/md';

export default function IstatistikKarti({ baslik, deger, renk = 'neutral', onClick }) {

    // Renk konfigürasyonlarını modern pastel tonlara ve gradyanlara çekiyoruz
    const configs = {
        success: {
            bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            color: '#166534',
            icon: <MdCheckCircleOutline size={24} />,
            border: '#bbf7d0'
        },
        danger: {
            bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            color: '#991b1b',
            icon: <MdErrorOutline size={24} />,
            border: '#fecaca'
        },
        warning: {
            bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            color: '#92400e',
            icon: <MdTrendingUp size={24} />,
            border: '#fde68a'
        },
        info: {
            bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            color: '#1e40af',
            icon: <MdInfoOutline size={24} />,
            border: '#bfdbfe'
        },
        neutral: {
            bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            color: '#475569',
            icon: <MdHelpOutline size={24} />,
            border: '#e2e8f0'
        }
    };

    const activeConfig = configs[renk] || configs.neutral;

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                background: activeConfig.bg,
                padding: '1.5rem',
                borderRadius: '24px',
                border: '1px solid',
                borderColor: activeConfig.border,
                cursor: onClick ? 'pointer' : 'default',
                width: { xs: '100%', sm: '280px' },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                '&:hover': {
                    transform: onClick ? 'translateY(-8px)' : 'none',
                    boxShadow: onClick ? '0 12px 30px -10px rgba(0,0,0,0.1)' : 'none',
                    borderColor: activeConfig.color,
                },
                // Arka plana hafif bir dekoratif daire ekleyelim
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: '100px',
                    height: '100px',
                    background: activeConfig.color,
                    opacity: 0.03,
                    borderRadius: '50%',
                }
            }}
        >
            {/* Üst Kısım: İkon ve Başlık */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        color: activeConfig.color,
                        bgcolor: 'rgba(255,255,255,0.5)',
                        p: 1,
                        borderRadius: '12px',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {activeConfig.icon}
                </Box>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: activeConfig.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.75rem',
                        opacity: 0.8
                    }}
                >
                    {baslik}
                </Typography>
            </Box>

            {/* Alt Kısım: Değer */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        color: '#1e293b',
                        letterSpacing: '-1px'
                    }}
                >
                    <CountUp end={deger} duration={1.5} separator="." />
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ color: activeConfig.color, fontWeight: 600, opacity: 0.7 }}
                >
                    adet
                </Typography>
            </Box>

            {/* Tıklanabilirlik göstergesi (Sadece onClick varsa) */}
            {onClick && (
                <Typography
                    variant="caption"
                    sx={{
                        mt: 0.5,
                        color: activeConfig.color,
                        fontWeight: 500,
                        fontSize: '0.65rem',
                        textAlign: 'right',
                        fontStyle: 'italic'
                    }}
                >
                    Detayları gör →
                </Typography>
            )}
        </Paper>
    );
}