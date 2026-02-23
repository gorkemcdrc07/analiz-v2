// src/sayfalar/Login.js
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Stack,
    Typography,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    Snackbar,
    Alert,
    Container,
    Fade,
} from "@mui/material";
import {
    Visibility,
    VisibilityOff,
    LockOutlined,
    PersonOutline,
} from "@mui/icons-material";
import { createClient } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { keyframes } from "@emotion/react";

// --- 🛠️ DIŞA AKTARILAN FONKSİYONLAR ---
const LS_KEY = "app_oturum_kullanici";

export const getUserFromSession = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setUserToSession = (user) => {
    localStorage.setItem(LS_KEY, JSON.stringify(user));
};

// --- 🎨 ANİMASYONLAR ---
const flowLine = keyframes`
  0% { stroke-dashoffset: 200; filter: drop-shadow(0 0 2px #60a5fa); }
  50% { filter: drop-shadow(0 0 8px #60a5fa); }
  100% { stroke-dashoffset: 0; filter: drop-shadow(0 0 2px #60a5fa); }
`;

const bgAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// 🔐 Supabase client
const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = useMemo(
        () => location.state?.from || "/siparis-analiz",
        [location.state]
    );

    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({
        open: false,
        msg: "",
        severity: "info",
    });

    // ✅ Session varsa otomatik yönlendirme (eksun/bunge dahil)
    useEffect(() => {
        const u = getUserFromSession();
        if (!u?.kullanici_adi) return;

        const ka = String(u.kullanici_adi).trim().toLowerCase();
        if (ka === "eksun") return navigate("/c/eksun", { replace: true });
        if (ka === "bunge") return navigate("/c/bunge", { replace: true });

        navigate(redirectTo, { replace: true });
    }, [navigate, redirectTo]);

    const handleLogin = async () => {
        setBusy(true);
        try {
            const ka = (kullaniciAdi || "").trim();
            const pw = (sifre || "").trim();
            if (!ka || !pw) throw new Error("Lütfen tüm alanları doldurun.");

            const { data, error } = await supabase
                .from("kullanicilar")
                .select("*")
                .eq("kullanici_adi", ka)
                .eq("sifre", pw)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Kullanıcı bulunamadı veya şifre yanlış.");
            if (data.onayli === false) throw new Error("Hesabınız onay bekliyor.");

            setUserToSession({ ...data, login_at: new Date().toISOString() });

            // ✅ Login sonrası eksun/bunge özel yönlendirme GERİ EKLENDİ
            const ka2 = String(data.kullanici_adi).trim().toLowerCase();
            if (ka2 === "eksun") return navigate("/c/eksun", { replace: true });
            if (ka2 === "bunge") return navigate("/c/bunge", { replace: true });

            navigate(redirectTo, { replace: true });
        } catch (e) {
            setToast({
                open: true,
                msg: String(e?.message || e),
                severity: "error",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "linear-gradient(-45deg, #020617, #0f172a, #1e1b4b, #020617)",
                backgroundSize: "400% 400%",
                animation: `${bgAnimation} 12s ease infinite`,
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Arka Plan Glow Efektleri */}
            <Box
                sx={{
                    position: "absolute",
                    top: "-10%",
                    left: "-10%",
                    width: "40%",
                    height: "40%",
                    background:
                        "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
                    filter: "blur(50px)",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    bottom: "-10%",
                    right: "-10%",
                    width: "50%",
                    height: "50%",
                    background:
                        "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
                    filter: "blur(50px)",
                }}
            />

            <Container maxWidth="xs" sx={{ zIndex: 10 }}>
                <Fade in timeout={1200}>
                    <Box>
                        {/* Dinamik Hareketli Logo */}
                        <Stack alignItems="center" spacing={1} sx={{ mb: 6 }}>
                            <Box sx={{ width: 120, height: 60 }}>
                                <svg width="120" height="60" viewBox="0 0 120 60">
                                    <path
                                        d="M10 40 L30 40 L45 15 L60 45 L75 25 L90 40 L110 40"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10 40 L30 40 L45 15 L60 45 L75 25 L90 40 L110 40"
                                        fill="none"
                                        stroke="#60a5fa"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray="200"
                                        strokeDashoffset="200"
                                        style={{ animation: `${flowLine} 3s linear infinite` }}
                                    />
                                </svg>
                            </Box>

                            <Typography
                                variant="h3"
                                sx={{
                                    color: "white",
                                    fontWeight: 900,
                                    letterSpacing: 6,
                                    fontSize: "2.5rem",
                                }}
                            >
                                FLOWLINE
                            </Typography>
                            <Box
                                sx={{ height: 2, width: 40, bgcolor: "#3b82f6", borderRadius: 1 }}
                            />
                        </Stack>

                        <Paper
                            sx={{
                                p: 4,
                                borderRadius: 5,
                                bgcolor: "rgba(15, 23, 42, 0.6)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                            }}
                        >
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    placeholder="Kullanıcı Adı"
                                    value={kullaniciAdi}
                                    onChange={(e) => setKullaniciAdi(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            color: "white",
                                            bgcolor: "rgba(255,255,255,0.03)",
                                            borderRadius: 3,
                                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                                            "&:hover fieldset": {
                                                borderColor: "rgba(255,255,255,0.2)",
                                            },
                                            "&.Mui-focused fieldset": {
                                                borderColor: "rgba(96,165,250,0.9)",
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutline sx={{ color: "#64748b" }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    type={showPass ? "text" : "password"}
                                    placeholder="Şifre"
                                    value={sifre}
                                    onChange={(e) => setSifre(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            color: "white",
                                            bgcolor: "rgba(255,255,255,0.03)",
                                            borderRadius: 3,
                                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                                            "&:hover fieldset": {
                                                borderColor: "rgba(255,255,255,0.2)",
                                            },
                                            "&.Mui-focused fieldset": {
                                                borderColor: "rgba(96,165,250,0.9)",
                                            },
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined sx={{ color: "#64748b" }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <IconButton
                                                onClick={() => setShowPass((s) => !s)}
                                                edge="end"
                                                sx={{ color: "#94a3b8" }}
                                                aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                                            >
                                                {showPass ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        ),
                                    }}
                                />

                                <Button
                                    fullWidth
                                    disabled={busy}
                                    onClick={handleLogin}
                                    variant="contained"
                                    sx={{
                                        py: 1.8,
                                        borderRadius: 3,
                                        bgcolor: "#2563eb",
                                        fontWeight: 800,
                                        fontSize: "1rem",
                                        textTransform: "none",
                                        boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
                                        "&:hover": { bgcolor: "#1d4ed8", transform: "translateY(-1px)" },
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {busy ? "Giriş Yapılıyor..." : "Sisteme Eriş"}
                                </Button>
                            </Stack>
                        </Paper>
                    </Box>
                </Fade>
            </Container>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
            >
                <Alert
                    severity={toast.severity}
                    variant="filled"
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    sx={{ borderRadius: 2 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}