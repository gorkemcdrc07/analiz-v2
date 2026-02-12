// src/App.js
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import Layout from "./bilesenler/Layout";
import SiparisAnaliz from "./sayfalar/SiparisAnaliz";
import VeriAktarim from "./sayfalar/VeriAktarim";
import BackendVeriEkrani from "./sayfalar/BackendVeriEkrani";
import AnalizPaneli from "./ozellikler/analiz-paneli";
import Login, { getUserFromSession } from "./sayfalar/Login";
import Anasayfa from "./sayfalar/Anasayfa";

// ✅ Yeni: Müşteri template tek sayfa (Layout’suz)
import CustomerTemplatePage from "./sayfalar/CustomerTemplatePage";

/* 🔐 Login kontrol */
function ProtectedRoute({ children }) {
    const user = getUserFromSession();
    if (!user?.kullanici_adi) return <Navigate to="/login" replace />;
    return children;
}

/* 🔐 Admin */
function AdminRoute({ children }) {
    const user = getUserFromSession();
    if (!user?.kullanici_adi) return <Navigate to="/login" replace />;
    if (user?.rol !== "admin") return <Navigate to="/siparis-analiz" replace />;
    return children;
}

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
                    <Route path="/login" element={<Login />} />

                    {/* ✅ Müşteri Template Route (SIDEBAR / LAYOUT YOK) */}
                    <Route
                        path="/c/:customerKey"
                        element={
                            <ProtectedRoute>
                                <CustomerTemplatePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* ✅ Normal Uygulama (Layout + Sidebar) */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <Layout mode={mode} setMode={setMode} />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<Anasayfa />} />
                        <Route path="/siparis-analiz" element={<SiparisAnaliz />} />
                        <Route path="/backend-veri" element={<BackendVeriEkrani />} />
                        <Route path="/analiz-paneli" element={<AnalizPaneli />} />

                        <Route
                            path="/veri-aktarim"
                            element={
                                <AdminRoute>
                                    <VeriAktarim />
                                </AdminRoute>
                            }
                        />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
