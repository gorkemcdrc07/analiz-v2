// src/sayfalar/karsilastirma/utils/domain.js

import { REGIONS } from "../../../ozellikler/yardimcilar/veriKurallari";
import { metniNormalizeEt } from "../../../ozellikler/yardimcilar/metin";

/**
 * Pickup tarihini item içinden güvenli şekilde alır
 * Backend alan adı değişse bile tek noktadan yönetilir
 */
export function getPickupDate(item) {
    const v =
        item?.PickupDate ??
        item?.pickupDate ??
        item?.pickup_date ??
        item?.pickup_datetime ??
        item?.pickupDatetime ??
        item?.pickup_time;

    if (!v) return null;

    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Proje / müşteri adını normalize ederek döner
 */
export function getProjectName(item) {
    return (
        item?.ProjectName ??
        item?.projectName ??
        item?.proje ??
        item?.Proje ??
        item?.Customer ??
        item?.customer ??
        item?.AccountName ??
        item?.accountName ??
        "—"
    );
}

/**
 * Bölge filtresi
 * REGIONS[bolge] → allow-list ise, sadece listedeki projeler dahil edilir
 */
export function isInSelectedRegion(item, seciliBolge) {
    const allow = REGIONS?.[seciliBolge];
    if (!Array.isArray(allow) || allow.length === 0) return true;

    const proje = getProjectName(item);
    const norm = metniNormalizeEt(String(proje));

    return allow.some(
        (x) => metniNormalizeEt(String(x)) === norm
    );
}

export default {
    getPickupDate,
    getProjectName,
    isInSelectedRegion,
};
