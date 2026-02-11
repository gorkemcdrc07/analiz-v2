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
    GlobalStyles,
    Container,
    Divider,
    Snackbar,
    Alert,
} from "@mui/material";
import {
    Visibility,
    VisibilityOff,
    LockOutlined,
    AlternateEmailOutlined,
    LocalShipping,
    TrendingUp,
    RouteOutlined,
    SecurityOutlined,
    SpeedOutlined,
    Search,
    DataUsage,
    VerifiedUser,
    Bolt,
    PersonOutline,
    PhoneOutlined,
    MailOutline,
} from "@mui/icons-material";
import { createClient } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";

// 🔐 Supabase client
const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
);

const ADMIN_APPROVAL_EMAIL = "gorkem.cadirci@odaklojistik.com.tr";

// ✅ Takip seçenekleri
const TAKIP_LISTESI = ["genel", "EKSUN"];

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

function FeatureCard({ icon, title, desc }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.4,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.86)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
                height: "100%",
            }}
        >
            <Stack direction="row" spacing={1.6} alignItems="flex-start">
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.4,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(14, 165, 233, 0.12)",
                        border: "1px solid rgba(14, 165, 233, 0.18)",
                        color: "#0284c7",
                        flex: "0 0 auto",
                    }}
                >
                    {React.cloneElement(icon, { sx: { fontSize: 22 } })}
                </Box>
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 950,
                            fontSize: 14.5,
                            lineHeight: 1.2,
                            color: "#0f172a",
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 0.8,
                            fontSize: 12.5,
                            lineHeight: 1.55,
                            color: "rgba(15,23,42,0.68)",
                        }}
                    >
                        {desc}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

function InfoPill({ icon, title, desc }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.6,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
            }}
        >
            <Stack direction="row" spacing={1.8} alignItems="center">
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.4,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(99,102,241,0.10)",
                        border: "1px solid rgba(99,102,241,0.16)",
                        color: "#4f46e5",
                    }}
                >
                    {React.cloneElement(icon, { sx: { fontSize: 22 } })}
                </Box>
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 950,
                            fontSize: 14.5,
                            color: "#0f172a",
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12.5, color: "rgba(15,23,42,0.62)" }}>
                        {desc}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const [mode, setMode] = useState("login"); // "login" | "register"

    // login
    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");

    // register (onay talebi)
    const [regKullaniciAdi, setRegKullaniciAdi] = useState("");
    const [regSifre, setRegSifre] = useState("");
    const [regAdSoyad, setRegAdSoyad] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regTelefon, setRegTelefon] = useState("");
    const [regTakip, setRegTakip] = useState("");

    const [showPass, setShowPass] = useState(false);
    const [busy, setBusy] = useState(false);

    const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });

    const redirectTo = useMemo(() => location.state?.from || "/forecast/yukle", [location.state]);

    useEffect(() => {
        const u = getUserFromSession();
        if (u?.kullanici_adi) navigate(redirectTo, { replace: true });
    }, [navigate, redirectTo]);

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

    const handleLogin = async () => {
        setBusy(true);
        try {
            const ka = (kullaniciAdi || "").trim();
            const pw = (sifre || "").trim();
            if (!ka || !pw) throw new Error("Eksik bilgi.");

            const { data, error } = await supabase
                .from("kullanicilar")
                .select("*")
                .eq("kullanici_adi", ka)
                .eq("sifre", pw)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Hatalı giriş.");

            // ✅ admin onayı zorunlu
            if (data.onayli === false) {
                throw new Error("Hesabınız onay bekliyor. Lütfen admin onayını bekleyin.");
            }

            setUserToSession({ ...data, login_at: new Date().toISOString() });
            navigate(redirectTo, { replace: true });
        } catch (e) {
            setToast({ open: true, msg: String(e?.message || e), severity: "error" });
        } finally {
            setBusy(false);
        }
    };

    const sendApprovalEmailToAdmin = async (payload) => {
        const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/onay-mail`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        if (!res.ok) {
            throw new Error(`Mail gönderilemedi: ${text || res.status}`);
        }

        try {
            return JSON.parse(text);
        } catch {
            return { ok: true };
        }
    };

    const handleRegister = async () => {
        setBusy(true);
        try {
            const ka = (regKullaniciAdi || "").trim();
            const pw = (regSifre || "").trim();
            const ad_soyad = (regAdSoyad || "").trim();
            const email = (regEmail || "").trim();
            const telefon = (regTelefon || "").trim();
            const takip = (regTakip || "").trim();

            if (!ka || !pw || !ad_soyad || !email || !takip) {
                throw new Error("Lütfen zorunlu alanları doldurun (Ad Soyad, Email, Kullanıcı Adı, Şifre, Takip).");
            }
            if (!validateEmail(email)) throw new Error("Email formatı hatalı.");

            // kullanıcı adı kontrol
            const { data: exists, error: exErr } = await supabase
                .from("kullanicilar")
                .select("id")
                .eq("kullanici_adi", ka)
                .maybeSingle();

            if (exErr) throw exErr;
            if (exists) throw new Error("Bu kullanıcı adı zaten kullanılıyor.");

            // email kontrol
            const { data: emailExists, error: emErr } = await supabase
                .from("kullanicilar")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (emErr) throw emErr;
            if (emailExists) throw new Error("Bu email ile daha önce kayıt oluşturulmuş.");

            const created_at = new Date().toISOString();

            // ✅ Token üret (mail onay linkleri için)
            const onay_token =
                (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);

            const token_son_kullanma = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 gün

            const { data: inserted, error: insErr } = await supabase
                .from("kullanicilar")
                .insert([
                    {
                        kullanici_adi: ka,
                        sifre: pw,
                        takip,
                        birim: "BEKLEME",
                        onayli: false,
                        durum: "BEKLEME",
                        ad_soyad,
                        email,
                        telefon: telefon || null,
                        talep_tarihi: created_at,
                        onay_token,
                        token_son_kullanma,
                    },
                ])
                .select("*")
                .single();

            if (insErr) throw insErr;

            // ✅ Admin’e mail gönder (Edge Function)
            try {
                await sendApprovalEmailToAdmin({
                    admin_email: ADMIN_APPROVAL_EMAIL,
                    ad_soyad,
                    email,
                    telefon: telefon || "",
                    kullanici_adi: ka,
                    takip,
                    talep_tarihi: created_at,
                    kullanici_id: inserted?.id ?? null,
                    onay_token, // ✅ önemli
                });

                setToast({
                    open: true,
                    severity: "success",
                    msg: "Kayıt alındı ve admin’e onay maili gönderildi. Onay sonrası giriş yapabilirsiniz.",
                });
            } catch (mailErr) {
                setToast({
                    open: true,
                    severity: "warning",
                    msg: `Kayıt alındı fakat admin maili gönderilemedi. (IT kontrol etsin) | ${String(
                        mailErr?.message || mailErr
                    )}`,
                });
            }

            // form temizle + login moduna al
            setRegKullaniciAdi("");
            setRegSifre("");
            setRegAdSoyad("");
            setRegEmail("");
            setRegTelefon("");
            setRegTakip("");
            setMode("login");
        } catch (e) {
            setToast({ open: true, msg: String(e?.message || e), severity: "error" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                position: "relative",
                overflow: "hidden",
                bgcolor: "#f6f8fb",
                color: "#0f172a",
                fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial",
            }}
        >
            <GlobalStyles
                styles={{
                    body: { margin: 0, padding: 0, backgroundColor: "#f6f8fb" },
                    "@keyframes truckMove": {
                        "0%": { transform: "translateX(-10px)", opacity: 0 },
                        "10%": { opacity: 1 },
                        "90%": { opacity: 1 },
                        "100%": { transform: "translateX(360px)", opacity: 0 },
                    },
                }}
            />

            {/* Background */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "radial-gradient(1200px 700px at 18% 30%, rgba(56,189,248,0.20), transparent 60%)," +
                        "radial-gradient(1100px 650px at 86% 30%, rgba(99,102,241,0.12), transparent 58%)," +
                        "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(246,248,251,1))",
                    pointerEvents: "none",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                        "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                    opacity: 0.035,
                    pointerEvents: "none",
                }}
            />

            {/* TOP BAR */}
            <Container
                maxWidth="xl"
                sx={{
                    position: "relative",
                    zIndex: 2,
                    py: 2.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Stack direction="row" spacing={4} alignItems="center">
                    <Box>
                        <Typography sx={{ fontWeight: 950, fontSize: 14.5, letterSpacing: 0.35 }}>
                            <Box component="span" sx={{ color: "#0284c7" }}>
                                #
                            </Box>
                            FLOWLINE
                        </Typography>
                        <Box
                            sx={{
                                mt: 1,
                                height: 3,
                                width: 130,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, rgba(2,132,199,1), rgba(2,132,199,0.12))",
                            }}
                        />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: "rgba(15,23,42,0.62)" }}>
                        {mode === "login" ? "Login" : "Kayıt"}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: "rgba(15,23,42,0.62)" }}>imOnct</Typography>
                </Stack>

                <Search sx={{ fontSize: 22, color: "rgba(15,23,42,0.55)" }} />
            </Container>

            {/* MAIN */}
            <Container
                maxWidth="xl"
                sx={{
                    position: "relative",
                    zIndex: 2,
                    minHeight: "calc(100vh - 76px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    pb: 6,
                    pt: 2,
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 0.9fr",
                        gap: 8,
                        alignItems: "center",
                    }}
                >
                    {/* LEFT */}
                    <Box>
                        <Typography sx={{ fontSize: 88, fontWeight: 980, letterSpacing: -2, lineHeight: 1 }}>
                            FLOWLINE
                        </Typography>

                        <Box sx={{ mt: 2.4, display: "flex", alignItems: "center", gap: 1.4 }}>
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                                <Box sx={{ width: 20, height: 4, borderRadius: 2, bgcolor: "#0284c7" }} />
                                <Box sx={{ width: 14, height: 4, borderRadius: 2, bgcolor: "rgba(2,132,199,0.7)" }} />
                                <Box sx={{ width: 10, height: 4, borderRadius: 2, bgcolor: "rgba(2,132,199,0.45)" }} />
                            </Stack>

                            <Box
                                sx={{
                                    position: "relative",
                                    height: 3,
                                    width: 380,
                                    borderRadius: 999,
                                    background: "linear-gradient(90deg, rgba(2,132,199,1), rgba(2,132,199,0.22), transparent)",
                                }}
                            >
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: -20,
                                        left: 0,
                                        animation: "truckMove 5.4s linear infinite",
                                        color: "rgba(15,23,42,0.82)",
                                    }}
                                >
                                    <LocalShipping sx={{ fontSize: 24 }} />
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: "50%",
                                    bgcolor: "#0284c7",
                                    boxShadow: "0 0 10px rgba(2,132,199,0.22)",
                                }}
                            />
                        </Box>

                        <Typography
                            sx={{
                                mt: 4.2,
                                fontSize: 38,
                                fontWeight: 950,
                                lineHeight: 1.12,
                                maxWidth: 820,
                            }}
                        >
                            Tedarik yolculuğunuzu daha hızlı ve daha akıllı yönetin.
                        </Typography>

                        <Typography
                            sx={{
                                mt: 1.8,
                                fontSize: 14.5,
                                lineHeight: 1.8,
                                color: "rgba(15,23,42,0.70)",
                                maxWidth: 900,
                            }}
                        >
                            Operasyonel görünürlük, rota optimizasyonu ve güvenlik odaklı izleme ile süreçlerinizi tek bir panelden
                            yönetin. Veriye dayalı kararlarla hız kazanın.
                        </Typography>

                        <Divider sx={{ my: 3.4, opacity: 0.35, maxWidth: 980 }} />

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                gap: 2.2,
                                maxWidth: 1100,
                            }}
                        >
                            <FeatureCard icon={<TrendingUp />} title="Trending Up" desc="Performans metrikleri ve trend analizi" />
                            <FeatureCard icon={<RouteOutlined />} title="Route Optimized" desc="Rota takibi ve operasyon optimizasyonu" />
                            <FeatureCard icon={<SecurityOutlined />} title="Security" desc="Yetkilendirme ve güvenlik denetimleri" />
                            <FeatureCard icon={<SpeedOutlined />} title="Speed Monitor" desc="Hız ve gecikme görünürlüğü" />
                        </Box>
                    </Box>

                    {/* RIGHT */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Paper
                            elevation={0}
                            sx={{
                                width: 520,
                                borderRadius: 5,
                                p: 5,
                                bgcolor: "rgba(255,255,255,0.88)",
                                border: "1px solid rgba(15,23,42,0.10)",
                                boxShadow: "0 22px 70px rgba(15,23,42,0.14)",
                                position: "relative",
                                overflow: "hidden",
                                "&:before": {
                                    content: '""',
                                    position: "absolute",
                                    inset: 0,
                                    background: "radial-gradient(600px 260px at 78% 18%, rgba(99,102,241,0.14), transparent 55%)",
                                    pointerEvents: "none",
                                },
                            }}
                        >
                            <Typography sx={{ fontWeight: 980, fontSize: 20 }}>Flowline Portal</Typography>
                            <Typography sx={{ mt: 0.7, fontSize: 13, color: "rgba(15,23,42,0.65)" }}>
                                {mode === "login"
                                    ? "Devam etmek için giriş yapın."
                                    : "Onay doldurunuz. Admin onayı sonrası giriş açılacaktır."}
                            </Typography>

                            {/* MODE SWITCH */}
                            <Stack direction="row" spacing={1} sx={{ mt: 2.2 }}>
                                <Button
                                    onClick={() => setMode("login")}
                                    variant={mode === "login" ? "contained" : "text"}
                                    sx={{
                                        borderRadius: 999,
                                        fontWeight: 950,
                                        textTransform: "none",
                                        px: 2.2,
                                        boxShadow: "none",
                                        bgcolor: mode === "login" ? "#0f172a" : "transparent",
                                        color: mode === "login" ? "#fff" : "rgba(15,23,42,0.72)",
                                        "&:hover": { bgcolor: mode === "login" ? "#0b1220" : "rgba(15,23,42,0.04)" },
                                    }}
                                >
                                    Giriş Yap
                                </Button>

                                <Button
                                    onClick={() => setMode("register")}
                                    variant={mode === "register" ? "contained" : "text"}
                                    sx={{
                                        borderRadius: 999,
                                        fontWeight: 950,
                                        textTransform: "none",
                                        px: 2.2,
                                        boxShadow: "none",
                                        bgcolor: mode === "register" ? "#0284c7" : "transparent",
                                        color: mode === "register" ? "#fff" : "rgba(15,23,42,0.72)",
                                        "&:hover": { bgcolor: mode === "register" ? "#0369a1" : "rgba(15,23,42,0.04)" },
                                    }}
                                >
                                    Kayıt Ol
                                </Button>
                            </Stack>

                            {/* FORM */}
                            <Stack spacing={2.0} sx={{ mt: 3.0 }}>
                                {mode === "login" ? (
                                    <>
                                        <TextField
                                            fullWidth
                                            placeholder="Kullanıcı Adı"
                                            value={kullaniciAdi}
                                            onChange={(e) => setKullaniciAdi(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <AlternateEmailOutlined sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            type={showPass ? "text" : "password"}
                                            placeholder="Şifre"
                                            value={sifre}
                                            onChange={(e) => setSifre(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockOutlined sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPass((s) => !s)} size="small">
                                                            {showPass ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disabled={busy}
                                            onClick={handleLogin}
                                            sx={{
                                                height: 52,
                                                borderRadius: 3,
                                                fontWeight: 980,
                                                textTransform: "none",
                                                fontSize: 15,
                                                bgcolor: "#0284c7",
                                                boxShadow: "0 18px 36px rgba(2,132,199,0.22)",
                                                "&:hover": { bgcolor: "#0369a1" },
                                            }}
                                        >
                                            Giriş Yap
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <TextField
                                            fullWidth
                                            placeholder="Ad Soyad *"
                                            value={regAdSoyad}
                                            onChange={(e) => setRegAdSoyad(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonOutline sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            placeholder="Email *"
                                            value={regEmail}
                                            onChange={(e) => setRegEmail(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <MailOutline sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            placeholder="Telefon (opsiyonel)"
                                            value={regTelefon}
                                            onChange={(e) => setRegTelefon(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PhoneOutlined sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            placeholder="Kullanıcı Adı *"
                                            value={regKullaniciAdi}
                                            onChange={(e) => setRegKullaniciAdi(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <AlternateEmailOutlined sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            type={showPass ? "text" : "password"}
                                            placeholder="Şifre *"
                                            value={regSifre}
                                            onChange={(e) => setRegSifre(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockOutlined sx={{ fontSize: 18, color: "#0284c7" }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPass((s) => !s)} size="small">
                                                            {showPass ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 3, height: 52, bgcolor: "#fff" },
                                            }}
                                        />

                                        {/* Takip */}
                                        <TextField
                                            select
                                            fullWidth
                                            value={regTakip}
                                            onChange={(e) => setRegTakip(e.target.value)}
                                            SelectProps={{ native: true }}
                                            InputProps={{ sx: { borderRadius: 3, height: 52, bgcolor: "#fff" } }}
                                        >
                                            <option value="" disabled>
                                                Takip seçin *
                                            </option>
                                            {TAKIP_LISTESI.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </TextField>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disabled={busy}
                                            onClick={handleRegister}
                                            sx={{
                                                height: 52,
                                                borderRadius: 3,
                                                fontWeight: 980,
                                                textTransform: "none",
                                                fontSize: 15,
                                                bgcolor: "#0f172a",
                                                boxShadow: "0 18px 36px rgba(15,23,42,0.18)",
                                                "&:hover": { bgcolor: "#0b1220" },
                                            }}
                                        >
                                            Onaya Gönder
                                        </Button>

                                        <Typography sx={{ mt: 0.6, fontSize: 12.5, color: "rgba(15,23,42,0.58)" }}>
                                            * Zorunlu alanlar. Birim admin tarafından atanacaktır.
                                        </Typography>
                                    </>
                                )}
                            </Stack>

                            <Typography sx={{ mt: 3, fontSize: 12.5, color: "rgba(15,23,42,0.55)" }}>
                                Sorun mu yaşıyorsunuz? IT ile iletişime geçin.
                            </Typography>
                        </Paper>
                    </Box>
                </Box>

                {/* Bottom band */}
                <Box sx={{ mt: 5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 2.2 }}>
                        <InfoPill icon={<Bolt />} title="Hızlı Kurulum" desc="Dakikalar içinde kullanıma hazır, minimum konfigürasyon." />
                        <InfoPill icon={<VerifiedUser />} title="Güvenli Erişim" desc="Rol bazlı yetkilendirme ve denetlenebilir oturumlar." />
                        <InfoPill icon={<DataUsage />} title="Veri Odaklı" desc="Tek ekranda raporlar, KPI’lar ve operasyonel görünürlük." />
                    </Box>

                    <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", opacity: 0.7 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>© {new Date().getFullYear()} Flowline</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 0.4 }}>LOGISTICS DATA V4.2</Typography>
                    </Box>
                </Box>
            </Container>

            <Snackbar
                open={toast.open}
                autoHideDuration={4200}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ borderRadius: 3, fontWeight: 900 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
