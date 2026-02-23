// src/App.js
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

import Layout from "./bilesenler/Layout";
import SiparisAnaliz from "./sayfalar/SiparisAnaliz";
import VeriAktarim from "./sayfalar/VeriAktarim";
import BackendVeriEkrani from "./sayfalar/BackendVeriEkrani";
import AnalizPaneli from "./ozellikler/analiz-paneli";
import Login, { getUserFromSession } from "./sayfalar/Login";
import Anasayfa from "./sayfalar/Anasayfa";
import CustomerTemplatePage from "./sayfalar/CustomerTemplatePage";

/* 🔐 Login + müşteri sayfası kilidi */
function ProtectedRoute({ children }) {
    const user = getUserFromSession();
    const location = useLocation();
    const path = String(location.pathname || "").toLowerCase();

    if (!user?.kullanici_adi) return <Navigate to="/login" replace />;

    const ka = String(user.kullanici_adi).trim().toLowerCase();

    // eksun sadece /c/eksun
    if (ka === "eksun" && path.startsWith("/c/") && !path.startsWith("/c/eksun")) {
        return <Navigate to="/c/eksun" replace />;
    }

    // bunge sadece /c/bunge
    if (ka === "bunge" && path.startsWith("/c/") && !path.startsWith("/c/bunge")) {
        return <Navigate to="/c/bunge" replace />;
    }

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
                palette: { mode, primary: { main: "#2563eb" } },
            }),
        [mode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Müşteri sayfası (Layout yok) */}
                <Route
                    path="/c/:customerKey"
                    element={
                        <ProtectedRoute>
                            <CustomerTemplatePage />
                        </ProtectedRoute>
                    }
                />

                {/* Normal uygulama (Layout var) */}
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
        </ThemeProvider>
    );
}