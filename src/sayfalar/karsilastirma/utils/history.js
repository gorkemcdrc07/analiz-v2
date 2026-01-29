// src/sayfalar/karsilastirma/utils/history.js

import { endOfMonth } from "./date";
import { getPickupDate, getProjectName, isInSelectedRegion } from "./domain";

/**
 * Son N ayın (default 13) tarihsel sipariş adetlerini üretir
 *
 * @param {Object} params
 * @param {Array}  params.data          - ham order listesi
 * @param {String} params.seciliBolge    - aktif bölge
 * @param {Number} params.monthsBack     - kaç ay geriye gidilecek
 * @param {Date}   params.anchorDate     - referans tarih (genelde today)
 */
export function buildMonthlyHistory({
    data,
    seciliBolge,
    monthsBack = 13,
    anchorDate = new Date(),
}) {
    const today = new Date(anchorDate);
    today.setHours(0, 0, 0, 0);

    // Başlangıç: N ay öncesinin 1'i
    const start = new Date(
        today.getFullYear(),
        today.getMonth() - (monthsBack - 1),
        1
    );

    // Bitiş: bu ayın son günü
    const end = endOfMonth(today);
    end.setHours(23, 59, 59, 999);

    // Bölge + pickupDate filtresi
    const filtered = (data || [])
        .filter((it) => isInSelectedRegion(it, seciliBolge))
        .map((it) => {
            const d = getPickupDate(it);
            if (!d) return null;
            return { ...it, __pickup: d };
        })
        .filter(Boolean);

    // Ay listesi (soldan sağa: eski → yeni)
    const months = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    }

    // Project bazlı ay-ay sayım
    const byProject = new Map();

    for (const it of filtered) {
        const d = it.__pickup;
        if (d < start || d > end) continue;

        const proje = String(getProjectName(it) ?? "—");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        if (!byProject.has(proje)) byProject.set(proje, {});
        byProject.get(proje)[key] = (byProject.get(proje)[key] || 0) + 1;
    }

    // Tablo satırları
    const rows = [];
    for (const [proje, countsByMonth] of byProject.entries()) {
        const counts = months.map((m) => {
            const k = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
            return countsByMonth[k] || 0;
        });

        const total = counts.reduce((a, b) => a + b, 0);

        rows.push({
            bolge: seciliBolge,
            proje,
            counts, // her ay için sayı
            total,  // satır toplamı
        });
    }

    return {
        months, // Date[] → header'da kullanılıyor
        rows,   // tablo verisi
    };
}

export default buildMonthlyHistory;
