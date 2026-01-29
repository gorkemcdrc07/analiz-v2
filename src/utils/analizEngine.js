// src/ozellikler/analiz-paneli/analizEngine.js

/* ------------------------ Normalize & Parsers ------------------------ */
export const metniNormalizeEt = (v) => {
    const s = (v ?? "").toString().trim().toLocaleUpperCase("tr-TR");
    if (!s) return "";
    return s
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

export const seferNoNormalizeEt = (v) => {
    const s = (v ?? "")
        .toString()
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .trim();
    if (!s) return "";
    return s.toLocaleUpperCase("tr-TR").replace(/\s+/g, "");
};

export const sayiCevir = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

export const booleanCevir = (v) =>
    v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";

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

export const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

/* ------------------------ ✅ REGIONS (Senin dosyadan birebir) ------------------------ */
export const REGIONS = {
    TRAKYA: [
        "BUNGE LÜLEBURGAZ FTL",
        "BUNGE GEBZE FTL",
        "BUNGE PALET",
        "REKA FTL",
        "EKSUN GIDA FTL",
        "SARUHAN FTL",
        "PEPSİ FTL",
        "PEPSİ FTL ÇORLU",
        "TEKİRDAĞ UN FTL",
        "AYDINLI MODA FTL",
        "ADKOTURK FTL",
        "ADKOTURK FTL ENERJİ İÇECEĞİ",
        "SGS FTL",
        "BSH FTL",
        "ALTERNA GIDA FTL",
        "BİLEŞİM KİMYA FTL",
        "DERYA OFİS FTL",
        "SAPRO FTL",
        "MARMARA CAM FTL",
        "FAKİR FTL",
        "MODERN KARTON FTL",
        "KÜÇÜKBAY TRAKYA FTL",
        "MODERN BOBİN FTL",
        "SUDESAN FTL",
    ],
    GEBZE: [
        "HEDEF FTL",
        "HEDEF DIŞ TEDARİK",
        "PEPSİ FTL GEBZE",
        "EBEBEK FTL GEBZE",
        "FAKİR FTL GEBZE",
        "MİLHANS FTL",
        "AYDIN KURUYEMİŞ FTL",
        "AVANSAS FTL",
        "AVANSAS SPOT FTL",
        "DSV ERNAMAŞ FTL",
        "FLO FTL",
        "ÇİÇEKÇİ FTL",
        "ÇİZMECİ GIDA FTL",
        "OTTONYA (HEDEFTEN AÇILIYOR)",
        "GALEN ÇOCUK FTL",
        "ENTAŞ FTL",
        "NAZAR KİMYA FTL",
    ],
    DERİNCE: [
        "ARKAS PETROL OFİSİ DERİNCE FTL",
        "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL",
        "ARKAS TOGG",
        "ARKAS SPOT FTL",
    ],
    "İZMİR": [
        "EURO GIDA FTL",
        "EBEBEK FTL",
        "KİPAŞ SÖKE FTL",
        "CEYSU FTL",
        "TAT GIDA FTL",
        "ZER SALÇA",
        "ANKUTSAN FTL",
        "PELAGOS GIDA FTL",
        "KÜÇÜKBAY İZMİR FTL",
    ],
    ÇUKUROVA: [
        "PEKER FTL",
        "GDP FTL",
        "ÖZMEN UN FTL",
        "KİPAŞ MARAŞ FTL",
        "TÜRK OLUKLU FTL",
        "İLKON TEKSTİL FTL",
        "BİM / MERSİN",
    ],
    "ESKİŞEHİR": [
        "ES FTL",
        "ES GLOBAL FRİGO FTL",
        "KİPAŞ BOZÜYÜK FTL",
        "2A TÜKETİM FTL",
        "MODERN HURDA DÖNÜŞ FTL",
        "MODERN HURDA ZONGULDAK FTL",
        "ŞİŞECAM FTL",
        "DENTAŞ FTL",
        "MODERN AMBALAJ FTL",
    ],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
    DİĞER: ["DOĞTAŞ İNEGÖL FTL", "AKTÜL FTL"],
};

/* ------------------------ ✅ Senin altDetaylariOlustur (engine içine taşındı) ------------------------ */
export function altDetaylariOlustur(projeAdi, tumVeri) {
    const seen = new Set();
    const rowNorm = metniNormalizeEt(projeAdi);

    return (tumVeri || [])
        .filter((item) => {
            const pNorm = metniNormalizeEt(item.ProjectName);
            const isDirect = pNorm === rowNorm;

            const isPepsiCorlu =
                rowNorm === metniNormalizeEt("PEPSİ FTL ÇORLU") &&
                pNorm === metniNormalizeEt("PEPSİ FTL") &&
                metniNormalizeEt(item.PickupCityName) === metniNormalizeEt("TEKİRDAĞ") &&
                metniNormalizeEt(item.PickupCountyName) === metniNormalizeEt("ÇORLU");

            const isPepsiGebze =
                rowNorm === metniNormalizeEt("PEPSİ FTL GEBZE") &&
                pNorm === metniNormalizeEt("PEPSİ FTL") &&
                metniNormalizeEt(item.PickupCityName) === metniNormalizeEt("KOCAELİ") &&
                metniNormalizeEt(item.PickupCountyName) === metniNormalizeEt("GEBZE");

            const isEbebekGebze =
                rowNorm === metniNormalizeEt("EBEBEK FTL GEBZE") &&
                pNorm === metniNormalizeEt("EBEBEK FTL") &&
                metniNormalizeEt(item.PickupCityName) === metniNormalizeEt("KOCAELİ") &&
                metniNormalizeEt(item.PickupCountyName) === metniNormalizeEt("GEBZE");

            const isFakirGebze =
                rowNorm === metniNormalizeEt("FAKİR FTL GEBZE") &&
                pNorm === metniNormalizeEt("FAKİR FTL") &&
                metniNormalizeEt(item.PickupCityName) === metniNormalizeEt("KOCAELİ") &&
                metniNormalizeEt(item.PickupCountyName) === metniNormalizeEt("GEBZE");

            const isOttonya = rowNorm === metniNormalizeEt("OTTONYA (HEDEFTEN AÇILIYOR)") && pNorm === metniNormalizeEt("OTTONYA");

            const isKucukbayTrakya =
                rowNorm.includes("TRAKYA") &&
                pNorm === metniNormalizeEt("KÜÇÜKBAY FTL") &&
                new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(metniNormalizeEt)).has(metniNormalizeEt(item.PickupCityName));

            const match = isDirect || isPepsiCorlu || isPepsiGebze || isEbebekGebze || isFakirGebze || isOttonya || isKucukbayTrakya;
            if (!match) return false;

            const reqNo = item.TMSVehicleRequestDocumentNo;
            const despNo = (item.TMSDespatchDocumentNo || "").toString();
            const isValid = !despNo.toUpperCase().startsWith("BOS");
            const uniq = reqNo || despNo;

            if (uniq && isValid && !seen.has(uniq)) {
                seen.add(uniq);
                return true;
            }
            return false;
        })
        .slice(0, 50);
}

/* ------------------------ AnalizTablosu kuralları ------------------------ */
export const projeAdiNormalizeKural = (item) => {
    let finalProjectName = item?.ProjectName;
    const pNorm = metniNormalizeEt(finalProjectName);

    // KÜÇÜKBAY
    if (pNorm === metniNormalizeEt("KÜÇÜKBAY FTL")) {
        const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(metniNormalizeEt));
        if (TRAKYA.has(metniNormalizeEt(item?.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
        else if (metniNormalizeEt(item?.PickupCityName) === metniNormalizeEt("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
        else return null;
    }

    // PEPSİ
    if (pNorm === metniNormalizeEt("PEPSİ FTL")) {
        const c = metniNormalizeEt(item?.PickupCityName);
        const d = metniNormalizeEt(item?.PickupCountyName);
        if (c === metniNormalizeEt("TEKİRDAĞ") && d === metniNormalizeEt("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
        else if (c === metniNormalizeEt("KOCAELİ") && d === metniNormalizeEt("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
    }

    // EBEBEK
    if (pNorm === metniNormalizeEt("EBEBEK FTL")) {
        const c = metniNormalizeEt(item?.PickupCityName);
        const d = metniNormalizeEt(item?.PickupCountyName);
        if (c === metniNormalizeEt("KOCAELİ") && d === metniNormalizeEt("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
    }

    // FAKİR
    if (pNorm === metniNormalizeEt("FAKİR FTL")) {
        const c = metniNormalizeEt(item?.PickupCityName);
        const d = metniNormalizeEt(item?.PickupCountyName);
        if (c === metniNormalizeEt("KOCAELİ") && d === metniNormalizeEt("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
    }

    // OTTONYA
    if (pNorm === metniNormalizeEt("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

    return finalProjectName;
};

export const isInScope = (item) => {
    const service = metniNormalizeEt(item?.ServiceName);
    return (
        service === metniNormalizeEt("YURTİÇİ FTL HİZMETLERİ") ||
        service === metniNormalizeEt("FİLO DIŞ YÜK YÖNETİMİ") ||
        service === metniNormalizeEt("YURTİÇİ FRİGO HİZMETLERİ")
    );
};

export const buildProjectStats = (data) => {
    const src = Array.isArray(data) ? data : [];
    const stats = {};

    src.forEach((item) => {
        if (!isInScope(item)) return;

        const finalProjectName = projeAdiNormalizeKural(item);
        if (!finalProjectName) return;

        const key = metniNormalizeEt(finalProjectName);

        if (!stats[key]) {
            stats[key] = {
                plan: new Set(),
                ted: new Set(),
                iptal: new Set(),
                filo: new Set(),
                spot: new Set(),
                sho_b: new Set(),
                sho_bm: new Set(),
                ontime_req: new Set(),
                late_req: new Set(),
                pickupDates: [],
            };
        }

        const s = stats[key];

        // reqNo normalize (BOS kontrolü)
        const reqNoRaw = (item?.TMSVehicleRequestDocumentNo || "").toString();
        const reqNoKey = reqNoRaw
            .replace(/\u00A0/g, " ")
            .replace(/\u200B/g, "")
            .replace(/\r?\n/g, " ")
            .trim();
        const reqNoUp = reqNoKey.toLocaleUpperCase("tr-TR");
        if (reqNoKey && !reqNoUp.startsWith("BOS")) s.plan.add(reqNoUp);

        // despNo normalize + SFR kontrol
        const despNoRaw = (item?.TMSDespatchDocumentNo || "").toString();
        const despKey = seferNoNormalizeEt(despNoRaw);
        if (!despKey || !despKey.startsWith("SFR")) return;

        // iptal
        const statu = sayiCevir(item?.OrderStatu);
        if (statu === 200) {
            s.iptal.add(despKey);
            return;
        }

        // ted
        s.ted.add(despKey);

        // filo/spot
        const vw = metniNormalizeEt(item?.VehicleWorkingName);
        const isFilo =
            vw === metniNormalizeEt("FİLO") ||
            vw === metniNormalizeEt("ÖZMAL") ||
            vw === metniNormalizeEt("MODERN AMBALAJ FİLO");
        if (isFilo) s.filo.add(despKey);
        else s.spot.add(despKey);

        // basım
        if (booleanCevir(item?.IsPrint)) s.sho_b.add(despKey);
        else s.sho_bm.add(despKey);

        // 30 saat kuralı (req bazlı)
        const h = hoursDiff(item?.TMSDespatchCreatedDate, item?.PickupDate);
        if (reqNoKey && !reqNoUp.startsWith("BOS") && h != null) {
            if (h < 30) s.ontime_req.add(reqNoUp);
            else s.late_req.add(reqNoUp);
        }

        // forecast için pickupDate
        const pd = parseTRDateTime(item?.PickupDate);
        if (pd) s.pickupDates.push(pd);
    });

    return stats;
};

/* ------------------------ Forecast Helpers ------------------------ */
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
export const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const startOfWeekMon = (d) => {
    const x = startOfDay(d);
    const day = x.getDay(); // 0 pazar
    const diff = (day === 0 ? -6 : 1) - day;
    x.setDate(x.getDate() + diff);
    return x;
};

export const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

export const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);

export const countInRange = (dates, from, to) => {
    const a = from.getTime();
    const b = to.getTime();
    let c = 0;
    for (const d of dates || []) {
        const t = d.getTime();
        if (t >= a && t <= b) c++;
    }
    return c;
};

export const buildForecast = (stats, regionKey, now = new Date()) => {
    const regionProjects = REGIONS[regionKey] || [];

    const week0Start = startOfWeekMon(now);
    const week0End = endOfDay(addDays(week0Start, 6));

    const week1Start = addDays(week0Start, 7);
    const week1End = endOfDay(addDays(week1Start, 6));

    const week2Start = addDays(week0Start, 14);
    const week2End = endOfDay(addDays(week2Start, 6));

    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const untilEomStart = startOfDay(now);
    const untilEomEnd = mEnd;

    const rows = regionProjects.map((p) => {
        const s = stats[metniNormalizeEt(p)] || { pickupDates: [] };
        const dts = s.pickupDates || [];
        return {
            proje: p,
            buHafta: countInRange(dts, week0Start, week0End),
            gelecekHafta: countInRange(dts, week1Start, week1End),
            digerHafta: countInRange(dts, week2Start, week2End),
            aySonunaKadar: countInRange(dts, untilEomStart, untilEomEnd),
            ayToplam: countInRange(dts, mStart, mEnd),
        };
    });

    const totals = rows.reduce(
        (acc, r) => {
            acc.buHafta += r.buHafta;
            acc.gelecekHafta += r.gelecekHafta;
            acc.digerHafta += r.digerHafta;
            acc.aySonunaKadar += r.aySonunaKadar;
            acc.ayToplam += r.ayToplam;
            return acc;
        },
        { buHafta: 0, gelecekHafta: 0, digerHafta: 0, aySonunaKadar: 0, ayToplam: 0 }
    );

    return {
        meta: {
            regionKey,
            week0Start,
            week0End,
            week1Start,
            week1End,
            week2Start,
            week2End,
            monthStart: mStart,
            monthEnd: mEnd,
        },
        rows,
        totals,
    };
};
