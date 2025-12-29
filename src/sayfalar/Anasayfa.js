import { Box, Typography } from '@mui/material';

export default function Anasayfa() {
    return (
        <Box
            sx={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8'
            }}
        >
            <Typography sx={{ fontWeight: 700 }}>
                Anasayfa (boş)
            </Typography>
        </Box>
    );
}
