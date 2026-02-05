// src/ozellikler/analiz-paneli/yardimcilar/veriKurallari.js
import { metniNormalizeEt as norm } from "./metin";

// �o. Bölge listeleri (aynı içerik)
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
        "MODERN BOBİN TEKİRDAĞ FTL",
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
        "ÇİÇEKCİ FTL",
        "ÇİZMECİ GIDA FTL",
        "OTTONYA (HEDEFTEN ALINIYOR)",
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
    İZMİR: [
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
    ESKİŞEHİR: [
        "ES FTL",
        "ES GLOBAL FRİGO FTL",
        "KİPAŞ BOZÜYÜK FTL",
        "2A TÜKETİM FTL",
        "MODERN HURDA DÖNÜŞ FTL",
        "MODERN HURDA ZONGULDAK FTL",
        "ŞİŞECAM FTL",
        "DENTAŞ FTL",
        "MODERN AMBALAJ FTL",
        "MODERN BOBİN ZONGULDAK FTL",

    ],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
    DİĞER: ["DOĞTAŞ İNEGÖL FTL", "AKTÜL FTL"],
};

// �o. Eski buildSubDetails -> Türkçe isim
export function altDetaylariOlustur(projeAdi, tumVeri) {
    const seen = new Set();
    const rowNorm = norm(projeAdi);

    return (tumVeri || [])
        .filter((item) => {
            const pNorm = norm(item.ProjectName);
            const isDirect = pNorm === rowNorm;

            const isPepsiCorlu =
                rowNorm === norm("PEPSİ FTL �?ORLU") &&
                pNorm === norm("PEPSİ FTL") &&
                norm(item.PickupCityName) === norm("TEKİRDAĞ") &&
                norm(item.PickupCountyName) === norm("�?ORLU");

            const isPepsiGebze =
                rowNorm === norm("PEPSİ FTL GEBZE") &&
                pNorm === norm("PEPSİ FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isEbebekGebze =
                rowNorm === norm("EBEBEK FTL GEBZE") &&
                pNorm === norm("EBEBEK FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isFakirGebze =
                rowNorm === norm("FAKİR FTL GEBZE") &&
                pNorm === norm("FAKİR FTL") &&
                norm(item.PickupCityName) === norm("KOCAELİ") &&
                norm(item.PickupCountyName) === norm("GEBZE");

            const isModernBobinZonguldak =
                rowNorm === norm("MODERN BOBİN ZONGULDAK FTL") &&
                pNorm === norm("MODERN BOBİN FTL") &&
                norm(item.PickupCityName) === norm("ZONGULDAK");

            const isModernBobinTekirdag =
                rowNorm === norm("MODERN BOBİN TEKİRDAĞ FTL") &&
                pNorm === norm("MODERN BOBİN FTL") &&
                norm(item.PickupCityName) === norm("TEKİRDAĞ");


            const isOttonya = rowNorm === norm("OTTONYA (HEDEFTEN A�?ILIYOR)") && pNorm === norm("OTTONYA");

            const isKucukbayTrakya =
                rowNorm.includes("TRAKYA") &&
                pNorm === norm("KÜÇÜKBAY FTL") &&
                new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm)).has(norm(item.PickupCityName));

            const match =
                isDirect ||
                isPepsiCorlu ||
                isPepsiGebze ||
                isEbebekGebze ||
                isFakirGebze ||
                isOttonya ||
                isKucukbayTrakya ||
                isModernBobinZonguldak ||
                isModernBobinTekirdag;

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

