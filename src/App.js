import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

import Layout from './bilesenler/Layout';
import Anasayfa from './sayfalar/Anasayfa';
import TedarikAnaliz from './sayfalar/TedarikAnaliz';
import SiparisAnaliz from './sayfalar/SiparisAnaliz';
import ProjeAnaliz from './sayfalar/ProjeAnaliz';
import VeriAktarim from './sayfalar/VeriAktarim';
import BackendVeriEkrani from './sayfalar/BackendVeriEkrani';

export default function App() {
    const [mode, setMode] = useState('light');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    background: {
                        default: mode === 'light' ? '#f8fafc' : '#0f172a',
                        paper: mode === 'light' ? '#ffffff' : '#020617',
                    },
                    primary: {
                        main: '#2563eb',
                    },
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", "Helvetica", Arial, sans-serif',
                },
                shape: { borderRadius: 12 },
            }),
        [mode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout mode={mode} setMode={setMode} />}>
                        <Route path="/" element={<Anasayfa />} />
                        <Route path="/tedarik-analiz" element={<TedarikAnaliz />} />
                        <Route path="/siparis-analiz" element={<SiparisAnaliz />} />
                        <Route path="/proje-analiz" element={<ProjeAnaliz />} />
                        <Route path="/veri-aktarim" element={<VeriAktarim />} />
                        <Route path="/backend-veri" element={<BackendVeriEkrani />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
