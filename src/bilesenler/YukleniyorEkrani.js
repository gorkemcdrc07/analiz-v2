import React from 'react';
import { Box, Typography, CircularProgress, Backdrop } from '@mui/material';

export default function YukleniyorEkrani() {
    return (
        <Backdrop
            open={true}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                // Yarı saydam cam efekti (Glassmorphism)
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    p: 5,
                    borderRadius: '32px',
                    // Hafif beyaz gölge ile derinlik
                    bgcolor: 'rgba(255, 255, 255, 0.4)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                {/* Modern Yükleme Çemberi */}
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    {/* Arka plandaki statik gri çember */}
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={60}
                        thickness={4}
                        sx={{ color: '#e2e8f0' }}
                    />
                    {/* Hareketli ana çember */}
                    <CircularProgress
                        variant="indeterminate"
                        disableShrink
                        size={60}
                        thickness={4}
                        sx={{
                            color: '#2563eb',
                            animationDuration: '600ms',
                            position: 'absolute',
                            left: 0,
                            [`& .MuiCircularProgress-circle`]: {
                                strokeLinecap: 'round',
                            },
                        }}
                    />
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            color: '#1e293b',
                            letterSpacing: '-0.5px',
                            mb: 0.5,
                        }}
                    >
                        Sistem Hazırlanıyor
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#64748b',
                            fontWeight: 500,
                            // Yanıp sönen animasyon efekti
                            animation: 'pulse 2s infinite ease-in-out',
                            '@keyframes pulse': {
                                '0%': { opacity: 0.5 },
                                '50%': { opacity: 1 },
                                '100%': { opacity: 0.5 },
                            },
                        }}
                    >
                        Lütfen bekleyiniz, veriler analiz ediliyor...
                    </Typography>
                </Box>
            </Box>
        </Backdrop>
    );
}