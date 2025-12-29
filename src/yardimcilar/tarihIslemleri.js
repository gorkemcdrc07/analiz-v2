// yardimcilar/tarihIslemleri.js

export function formatDate(date, end = false) {
    const d = new Date(date);
    if (end) {
        d.setHours(23, 59, 59);
    } else {
        d.setHours(0, 0, 0);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function formatDateTR(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

export function normalizeName(name) {
    if (name.toLowerCase() === "alper ulu") return "ALPER ULU";
    if (name.toLowerCase() === "mert ulutaş") return "MERT ULUTAŞ";
    return name.toUpperCase();
}
