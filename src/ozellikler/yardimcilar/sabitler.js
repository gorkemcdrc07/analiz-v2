export const BASE_URL =
    process.env.REACT_APP_API_URL ||
    "https://tedarik-analiz-backend-clean.onrender.com";

export const PRINTS_BASE_URL = "https://tedarik-analiz-sho-api.onrender.com";


export const DURUM_HARITASI = {
    1: { label: "Bekliyor", color: "#64748b" },
    2: { label: "Onaylandı", color: "#0ea5e9" },
    3: { label: "Spot Araç Planlamada", color: "#f59e0b" },
    4: { label: "Araç Atandı", color: "#8b5cf6" },
    5: { label: "Araç Yüklendi", color: "#10b981" },
    6: { label: "Araç Yolda", color: "#3b82f6" },
    7: { label: "Teslim Edildi", color: "#059669" },
    8: { label: "Tamamlandı", color: "#0f172a" },
    200: { label: "İptal", color: "#b91c1c" },
};
