// yardimcilar/tarihIslemleri.js

// Supabase filtreleri için güvenli ISO üretimi
// - start: gün ba�Yı 00:00:00
// - end: gün sonu 23:59:59
// Not: toISOString() UTC döner. E�Yer Supabase tarafında timestamptz kullanıyorsan en problemsiz seçenek budur.
export function formatDate(date, end = false) {
    if (!date) return null;

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;

    if (end) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);

    // UTC ISO string (Supabase timestamptz ile uyumlu)
    return d.toISOString();
}

export function formatDateTR(dateString) {
    if (!dateString) return '-';

    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
}

// TR büyük harf dönü�Yümü + null safe + özel isim e�Yle�Ytirme
export function normalizeName(name) {
    if (!name) return '';

    const raw = name.toString().trim();
    if (!raw) return '';

    const lowered = raw.toLocaleLowerCase('tr-TR');

    if (lowered === 'alper ulu') return 'ALPER ULU';
    if (lowered === 'mert uluta�Y') return 'MERT ULUTAŞ';

    return raw.toLocaleUpperCase('tr-TR');
}
