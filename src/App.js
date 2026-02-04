import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import Layout from "./bilesenler/Layout";
import Anasayfa from "./sayfalar/Anasayfa";
import SiparisAnaliz from "./sayfalar/SiparisAnaliz";
import VeriAktarim from "./sayfalar/VeriAktarim";
import BackendVeriEkrani from "./sayfalar/BackendVeriEkrani";

import AnalizPaneli from "./ozellikler/analiz-paneli";

export default function App() {
    const [mode, setMode] = useState("light");

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: { main: "#2563eb" },
                },
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
                        <Route path="/siparis-analiz" element={<SiparisAnaliz />} />
                        <Route path="/veri-aktarim" element={<VeriAktarim />} />
                        <Route path="/backend-veri" element={<BackendVeriEkrani />} />
                        <Route path="/analiz-paneli" element={<AnalizPaneli />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

