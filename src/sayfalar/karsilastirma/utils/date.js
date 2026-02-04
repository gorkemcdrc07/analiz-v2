// src/sayfalar/karsilastirma/utils/date.js

/* ------------------------ temel yardımcılar ------------------------ */

/** Gün ba�Ylangıcına çeker (00:00:00.000) */
export function clampDayStart(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/** Gün ekler / çıkarır */
export function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

/* ------------------------ hafta yardımcıları ------------------------ */

/**
 * Pazartesi ba�Ylangıçlı hafta
 * Pazartesi = 0, Pazar = 6
 */
export function startOfWeekMon(d) {
    const x = clampDayStart(d);
    const day = x.getDay(); // 0 = pazar
    const diff = (day + 6) % 7; // pazartesi=0
    x.setDate(x.getDate() - diff);
    return x;
}

/** Pazar biti�Yli hafta */
export function endOfWeekSun(d) {
    const s = startOfWeekMon(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
}

/** 0..6 (Pzt..Paz) */
export function weekdayMon0(d) {
    return (d.getDay() + 6) % 7;
}

/* ------------------------ ay yardımcıları ------------------------ */

/** Ayın ilk günü */
export function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Ayın son günü */
export function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/* ------------------------ range & iterasyon ------------------------ */

/** İki tarih arasındaki her günü üretir (dahil) */
export function eachDay(a, b) {
    const out = [];
    let cur = clampDayStart(a);
    const end = clampDayStart(b);

    while (cur <= end) {
        out.push(new Date(cur));
        cur = addDays(cur, 1);
    }
    return out;
}

/* ------------------------ format yardımcıları ------------------------ */

/** YYYY-MM anahtarı */
export function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Türkçe ay etiketi */
export function monthLabelTR(d) {
    return d.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
    });
}

/** Gün formatı (TR) */
export function fmtTR(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/** Tarih aralı�Yı (uzun) */
export function fmtRange(a, b) {
    return `${fmtTR(a)} �?" ${fmtTR(b)}`;
}

/** Tarih aralı�Yı (kısa) */
export function fmtRangeShort(a, b) {
    return `${new Date(a).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
    })}�?"${new Date(b).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
    })}`;
}

/* ------------------------ ISO yardımcıları ------------------------ */

/** Gün ba�Ylangıcı ISO (UTC/Z) */
export function isoStartOfDayZ(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
}

/** Gün biti�Yi ISO (UTC/Z) */
export function isoEndOfDayZ(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x.toISOString();
}

/* ------------------------ haftalık range builder ------------------------ */

/**
 * Son N haftanın tarih aralıklarını üretir (eski �?' yeni)
 */
export function buildWeekRanges({ weeksBack = 12, anchorDate = new Date() }) {
    const t0 = clampDayStart(anchorDate);
    const week0Start = startOfWeekMon(t0);

    const out = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
        const s = addDays(week0Start, -7 * i);
        const e = addDays(s, 6);
        e.setHours(23, 59, 59, 999);
        out.push({ start: s, end: e });
    }
    return out;
}

/**
 * �o. (startDate-endDate) aralı�Yını kapsayan haftaları üretir.
 * /tmsorders/week endpoint'i için "son 7 gün" gibi aralık çekiminde kullanılır.
 *
 * �?ıktı: [{start, end}] (kesi�Yimli) �?" eski �?' yeni
 */
export function buildWeekRangesBetween({ startDate, endDate }) {
    const s0 = clampDayStart(new Date(startDate));
    const e0 = clampDayStart(new Date(endDate));

    const firstWeekStart = startOfWeekMon(s0);
    const out = [];

    let cur = new Date(firstWeekStart);
    while (cur <= e0) {
        const wStart = new Date(cur);
        const wEnd = addDays(wStart, 6);
        wEnd.setHours(23, 59, 59, 999);

        // aralık kesi�Yimi
        const a = new Date(Math.max(wStart.getTime(), s0.getTime()));
        const b = new Date(Math.min(wEnd.getTime(), new Date(endDate).getTime()));

        if (a <= b) out.push({ start: a, end: b });

        cur = addDays(cur, 7);
    }

    return out;
}

export default {
    clampDayStart,
    addDays,
    startOfWeekMon,
    endOfWeekSun,
    weekdayMon0,
    startOfMonth,
    endOfMonth,
    eachDay,
    monthKey,
    monthLabelTR,
    fmtTR,
    fmtRange,
    fmtRangeShort,
    isoStartOfDayZ,
    isoEndOfDayZ,
    buildWeekRanges,
    buildWeekRangesBetween,
};
