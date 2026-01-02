import React from 'react';
import { Box, Typography, CircularProgress, Backdrop, styled, keyframes } from '@mui/material';

// --- ANIMASYONLAR ---
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
`;

// --- STYLED COMPONENTS ---
const GlassContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(3),
    padding: theme.spacing(6),
    borderRadius: '40px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
    animation: `${float} 3s ease-in-out infinite`,
}));

const SpinnerWrapper = styled(Box)({
    position: 'relative',
    display: 'inline-flex',
    '&::after': {
        content: '""',
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: '50%',
        border: '2px dashed rgba(37, 99, 235, 0.1)',
        animation: 'spin 10s linear infinite',
    },
    '@keyframes spin': {
        '100%': { transform: 'rotate(360deg)' }
    }
});

export default function YukleniyorEkrani() {
    return (
        <Backdrop
            open={true}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 999,
                background: 'radial-gradient(circle at center, rgba(248, 250, 252, 0.8) 0%, rgba(226, 232, 240, 0.6) 100%)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <GlassContainer>
                <SpinnerWrapper>
                    {/* Arka plandaki yumuşak halka */}
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={70}
                        thickness={4.5}
                        sx={{ color: 'rgba(37, 99, 235, 0.08)' }}
                    />
                    {/* Ana hareketli halka */}
                    <CircularProgress
                        variant="indeterminate"
                        disableShrink
                        size={70}
                        thickness={4.5}
                        sx={{
                            color: '#2563eb',
                            animationDuration: '800ms',
                            position: 'absolute',
                            left: 0,
                            [`& .MuiCircularProgress-circle`]: {
                                strokeLinecap: 'round',
                                strokeDasharray: '120px, 200px !important', // Daha uzun ve zarif bir kuyruk
                            },
                        }}
                    />
                </SpinnerWrapper>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 900,
                            color: '#0f172a',
                            letterSpacing: '-1px',
                            mb: 1,
                        }}
                    >
                        Veriler Senkronize Ediliyor
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                width: 8, height: 8, bgcolor: '#2563eb', borderRadius: '50%',
                                animation: `${pulse} 1.5s infinite 0s`
                            }}
                        />
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#64748b',
                                fontWeight: 600,
                                letterSpacing: '0.2px'
                            }}
                        >
                            Lütfen bekleyiniz...
                        </Typography>
                        <Box
                            sx={{
                                width: 8, height: 8, bgcolor: '#2563eb', borderRadius: '50%',
                                animation: `${pulse} 1.5s infinite 0.5s`
                            }}
                        />
                    </Box>
                </Box>
            </GlassContainer>
        </Backdrop>
    );
}