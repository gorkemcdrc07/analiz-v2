// src/utils/compareEngine.js
// ✅ Güncel: "Aynı hafta" = takvim haftası (Pazartesi–Pazar) olacak şekilde düzeltildi.
// ✅ buildAnalysis artık UI (karsilastirma.js) ile aynı hafta mantığını kullanır.
// Not: date-fns yok, pure JS.

const norm = (s) =>
    (s ?? "")
        .toString()
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// dd.mm.yyyy / ISO parse
export const parseTRDateTime = (v) => {
    if (!v || v === "---") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

    const s = String(v).trim();
    if (!s) return null;

    // dd.mm.yyyy [HH:MI[:SS]]
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

    // ISO / other JS parse
    const d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
};

const hoursDiff = (a, b) => {
    const d1 = parseTRDateTime(a);
    const d2 = parseTRDateTime(b);
    if (!d1 || !d2) return null;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
};

// sefer_acilis_zamani(TMSDespatchCreatedDate) -> yukleme_tarihi(PickupDate)
const getTimingInfo = (seferAcilisZamani, yuklemeTarihi) => {
    const h = hoursDiff(seferAcilisZamani, yuklemeTarihi);
    if (h == null) return { level: "none", hours: null };
    if (h < 30) return { level: "ok", hours: h };
    return { level: "late", hours: h };
};

/** ✅ UltraProjeTablosu kuralları: ProjectName normalizasyonu */
export const normalizeProjectName = (item) => {
    let finalProjectName = item.ProjectName;
    const pNorm = norm(item.ProjectName);

    // KÜÇÜKBAY
    if (pNorm === norm("KÜÇÜKBAY FTL")) {
        const TRAKYA = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
        if (TRAKYA.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
        else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
        else return null; // senin kuralın
    }

    // PEPSİ
    if (pNorm === norm("PEPSİ FTL")) {
        const c = norm(item.PickupCityName);
        const d = norm(item.PickupCountyName);
        if (c === norm("TEKİRDAĞ") && d === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
        else if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
    }

    // EBEBEK
    if (pNorm === norm("EBEBEK FTL")) {
        const c = norm(item.PickupCityName);
        const d = norm(item.PickupCountyName);
        if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "EBEBEK FTL GEBZE";
    }

    // FAKİR
    if (pNorm === norm("FAKİR FTL")) {
        const c = norm(item.PickupCityName);
        const d = norm(item.PickupCountyName);
        if (c === norm("KOCAELİ") && d === norm("GEBZE")) finalProjectName = "FAKİR FTL GEBZE";
    }

    // OTTONYA
    if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

    return finalProjectName;
};

/** ✅ Tarih aralığı filtreleme */
export const filterByDateRange = (data, start, end, dateField = "OrderCreatedDate") => {
    const s = start instanceof Date ? start : parseTRDateTime(start);
    const e = end instanceof Date ? end : parseTRDateTime(end);
    if (!s || !e) return [];
    const sMs = s.getTime();
    const eMs = e.getTime();

    return (Array.isArray(data) ? data : []).filter((item) => {
        const d = parseTRDateTime(item?.[dateField]);
        if (!d) return false;
        const t = d.getTime();
        return t >= sMs && t <= eMs;
    });
};

/** ✅ KPI hesap */
export const calcKpi = ({
    data,
    start,
    end,
    dateField = "OrderCreatedDate",
    allowedProjects = null, // Set(normalizeProjectName)
}) => {
    const slice = filterByDateRange(data, start, end, dateField);

    const planReq = new Set(); // talep = VehicleRequest
    const tedDesp = new Set(); // tedarik = SFR despatch
    const iptalDesp = new Set(); // iptal = statu 200 (SFR içinde)
    const ontimeReq = new Set(); // zamanında = reqNo timing ok
    const lateReq = new Set(); // geç = reqNo timing late

    for (const item of slice) {
        // service scope kuralın
        const service = norm(item.ServiceName);
        const inScope =
            service === norm("YURTİÇİ FTL HİZMETLERİ") || service === norm("FİLO DIŞ YÜK YÖNETİMİ");
        if (!inScope) continue;

        // proje kuralı (normalize)
        const p = normalizeProjectName(item);
        if (!p) continue;
        if (allowedProjects && !allowedProjects.has(norm(p))) continue;

        // talep
        const reqNo = (item.TMSVehicleRequestDocumentNo || "").toString();
        if (reqNo && !reqNo.toUpperCase().startsWith("BOS")) planReq.add(reqNo);

        // despatch
        const despNo = (item.TMSDespatchDocumentNo || "").toString();
        const isSfr = despNo.startsWith("SFR") && !despNo.toUpperCase().startsWith("BOS");
        if (!isSfr) continue;

        const statu = toNum(item.OrderStatu);
        if (statu === 200) {
            iptalDesp.add(despNo);
            continue;
        }

        tedDesp.add(despNo);

        // timing (sefer açılış -> yükleme) üzerinden reqNo bazlı ok/late
        const timing = getTimingInfo(item.TMSDespatchCreatedDate, item.PickupDate);
        if (timing.hours != null && reqNo) {
            if (timing.level === "ok") ontimeReq.add(reqNo);
            if (timing.level === "late") lateReq.add(reqNo);
        }
    }

    const plan = planReq.size;
    const ted = tedDesp.size;
    const iptal = iptalDesp.size;
    const zamaninda = ontimeReq.size;
    const gec = lateReq.size;
    const perf = plan ? Math.round((zamaninda / plan) * 100) : 0;

    return { plan, ted, iptal, zamaninda, gec, perf };
};

/* ------------------------ Takvim haftası yardımcıları (Pazartesi–Pazar) ------------------------ */
export const startOfWeekMonday = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay(); // 0 Pazar, 1 Pzt...
    const diff = day === 0 ? -6 : 1 - day; // Pazartesi
    x.setDate(x.getDate() + diff);
    return x;
};

export const endOfWeekSunday = (d) => {
    const s = startOfWeekMonday(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
};

export const addMonths = (d, m) =>
    new Date(d.getFullYear(), d.getMonth() + m, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());

/* ------------------------ “İstediğim kadar analiz üret” ------------------------ */
export const buildAnalysis = ({
    data,
    regionProjects, // Array<string>
    dateField = "OrderCreatedDate",
    now = new Date(),
    lookbackMonths = [1, 2, 3, 6], // kaç ay geriye bakayım
    includeAverages = [3, 6], // ortalamalar
}) => {
    const allowed = regionProjects?.length ? new Set(regionProjects.map((p) => norm(p))) : null;

    // ✅ Bu hafta: takvim haftası (Pzt–Paz)
    const thisWeek = { start: startOfWeekMonday(now), end: endOfWeekSunday(now) };
    const kpiThisWeek = calcKpi({ data, ...thisWeek, dateField, allowedProjects: allowed });

    // ✅ Geçmiş ayların "aynı hafta"si: (now - m ay) tarihinin bulunduğu takvim haftası
    const seriesSameWeek = lookbackMonths.map((m) => {
        const md = addMonths(now, -m);
        const r = { start: startOfWeekMonday(md), end: endOfWeekSunday(md) };
        return {
            monthOffset: m,
            label: `${m} ay önce (aynı hafta)`,
            range: r,
            kpi: calcKpi({ data, ...r, dateField, allowedProjects: allowed }),
        };
    });

    // ✅ Ortalama: önceki N ayın (aynı hafta) KPI ortalaması
    const averages = includeAverages.map((n) => {
        const items = [];
        for (let i = 1; i <= n; i++) {
            const md = addMonths(now, -i);
            const r = { start: startOfWeekMonday(md), end: endOfWeekSunday(md) };
            items.push(calcKpi({ data, ...r, dateField, allowedProjects: allowed }));
        }

        const avg = (key) => Math.round(items.reduce((a, x) => a + (x[key] || 0), 0) / items.length);

        return {
            months: n,
            label: `Önceki ${n} ay ort. (aynı hafta)`,
            kpi: {
                plan: avg("plan"),
                ted: avg("ted"),
                iptal: avg("iptal"),
                zamaninda: avg("zamaninda"),
                gec: avg("gec"),
                perf: avg("perf"),
            },
        };
    });

    // ✅ Ek: Bu ayın ilk haftası (takvim haftasıyla değil, ayın 1'inin bulunduğu hafta)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisFirstWeek = { start: startOfWeekMonday(monthStart), end: endOfWeekSunday(monthStart) };

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastFirstWeek = { start: startOfWeekMonday(lastMonthStart), end: endOfWeekSunday(lastMonthStart) };

    const kpiThisFirst = calcKpi({ data, ...thisFirstWeek, dateField, allowedProjects: allowed });
    const kpiLastFirst = calcKpi({ data, ...lastFirstWeek, dateField, allowedProjects: allowed });

    return {
        meta: {
            dateField,
            weekType: "calendar_week_monday_sunday",
            thisYear: now.getFullYear(),
            thisMonth: now.getMonth() + 1,
        },
        comparisons: {
            // Ay başı haftası karşılaştırması
            firstWeek: {
                thisMonth: { range: thisFirstWeek, kpi: kpiThisFirst },
                lastMonth: { range: lastFirstWeek, kpi: kpiLastFirst },
            },

            // Bu hafta + geçmiş ayların aynı takvim haftası
            sameWeek: {
                thisWeek: { range: thisWeek, kpi: kpiThisWeek },
                history: seriesSameWeek,
                averages,
            },
        },
    };
};
