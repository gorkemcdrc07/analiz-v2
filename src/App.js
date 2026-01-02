import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './bilesenler/Layout';
import Anasayfa from './sayfalar/Anasayfa';
import TedarikAnaliz from './sayfalar/TedarikAnaliz';
import SiparisAnaliz from './sayfalar/SiparisAnaliz';
import ProjeAnaliz from './sayfalar/ProjeAnaliz';

import VeriAktarim from './sayfalar/VeriAktarim';

const theme = createTheme({
    palette: {
        background: { default: '#f8fafc' },
        primary: { main: '#2563eb' },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", Arial, sans-serif',
    },
    shape: { borderRadius: 12 },
});

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Anasayfa />} />
                        <Route path="/tedarik-analiz" element={<TedarikAnaliz />} />
                        <Route path="/siparis-analiz" element={<SiparisAnaliz />} />
                        <Route path="/proje-analiz" element={<ProjeAnaliz />} />

                        <Route path="/veri-aktarim" element={<VeriAktarim />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
