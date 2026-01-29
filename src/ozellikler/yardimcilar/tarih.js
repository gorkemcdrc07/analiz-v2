// src/ozellikler/analiz-paneli/yardimcilar/tarih.js
// AnalizPaneli.jsx bunu kullanýyor
export function toIsoLocalStart(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T00:00:00`;
}
export function toIsoLocalEnd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T23:59:59`;
}

// ProjeSatiri.jsx bunu kullanýyor
export const tarihFormatla = (dateStr) => {
    if (!dateStr || dateStr === "---") return "---";
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return String(dateStr);
        return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(
            2,
            "0"
        )}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;
    } catch {
        return String(dateStr);
    }
};

// dd.mm.yyyy / ISO parse
export const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s = String(v).trim();
    if (!s) return null;

    const m = s.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        const yyyy = Number(m[3]);
        const HH = Number(m[4] ?? 0);
        const MI = Number(m[5] ?? 0);
        const SS = Number(m[6] ?? 0);
        const d = new Date(yyyy, mm - 1, dd, HH, MI, SS);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

export const saatFarki = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

// Sefer açýlýþ -> yükleme (30 saat kuralý)
export const zamanDurumu = (seferAcilisZamani, yuklemeTarihi) => {
    const h = saatFarki(seferAcilisZamani, yuklemeTarihi);
    if (h == null) return { label: "Tarih yok", color: "#94a3b8", hours: null, level: "none" };
    if (h < 30) return { label: "Zamanýnda", color: "#10b981", hours: h, level: "ok" };
    return { label: "Gecikme", color: "#ef4444", hours: h, level: "late" };
};
