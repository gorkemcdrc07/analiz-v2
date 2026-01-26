// src/components/ProjeTablosu/excel.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { mergeKeepFilled, normalizeSeferKey, parseTRDateTime, norm } from "./utils";

/** Excel hücre değeri Date/number/string olabilir -> ISO string */
export const excelCellToISO = (cellVal) => {
    if (cellVal == null || cellVal === "") return null;

    if (cellVal instanceof Date && !Number.isNaN(cellVal.getTime())) return cellVal.toISOString();

    if (typeof cellVal === "number") {
        const dc = XLSX.SSF.parse_date_code(cellVal);
        if (dc) {
            const d = new Date(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, Math.floor(dc.S || 0));
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    }

    const d2 = parseTRDateTime(cellVal);
    return d2 ? d2.toISOString() : String(cellVal);
};

export const pickColumn = (rowObj, possibleNames) => {
    const keys = Object.keys(rowObj || {});
    const normKeys = keys.map((k) => ({ raw: k, n: norm(k) }));

    for (const nm of possibleNames) {
        const target = norm(nm);

        const exact = normKeys.find((x) => x.n === target);
        if (exact) return rowObj[exact.raw];

        const contains = normKeys.find((x) => x.n.includes(target));
        if (contains) return rowObj[contains.raw];
    }
    return undefined;
};

/**
 * Excel seçtirip okur, seferKey -> {6 tarih} map üretir.
 * setExcelTimesBySefer / setExcelImportInfo / setExcelSyncLoading dışarıdan verilir.
 */
export const importTimesFromExcel = async ({
    setExcelTimesBySefer,
    setExcelImportInfo,
    setExcelSyncLoading,
}) => {
    try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls";

        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setExcelSyncLoading(true);
            try {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: "array", cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

                const map = {};

                json.forEach((r) => {
                    const seferNoRaw = pickColumn(r, [
                        "Sefer Numarası",
                        "Sefer No",
                        "SeferNo",
                        "Sefer",
                        "Sefer Numarasi",
                    ]);

                    const seferKey = normalizeSeferKey(seferNoRaw);
                    if (!seferKey) return;

                    const nextObj = {
                        yukleme_varis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Varış Zamanı", "Yükleme Varış"])),
                        yukleme_giris: excelCellToISO(pickColumn(r, ["Yükleme Noktasına Giriş Zamanı", "Yükleme Giriş"])),
                        yukleme_cikis: excelCellToISO(pickColumn(r, ["Yükleme Noktası Çıkış Zamanı", "Yükleme Çıkış"])),
                        teslim_varis: excelCellToISO(pickColumn(r, ["Teslim Noktası Varış Zamanı", "Teslim Varış"])),
                        teslim_giris: excelCellToISO(pickColumn(r, ["Teslim Noktasına Giriş Zamanı", "Teslim Giriş"])),
                        teslim_cikis: excelCellToISO(pickColumn(r, ["Teslim Noktası Çıkış Zamanı", "Teslim Çıkış"])),
                    };

                    map[seferKey] = mergeKeepFilled(map[seferKey], nextObj);
                });

                const totalRows = json.length;
                const withSefer = Object.keys(map).length;

                const withAnyDate = Object.values(map).filter((t) =>
                    [t.yukleme_varis, t.yukleme_giris, t.yukleme_cikis, t.teslim_varis, t.teslim_giris, t.teslim_cikis].some(
                        (x) => x != null && x !== "" && x !== "---"
                    )
                ).length;

                setExcelImportInfo?.({ totalRows, withSefer, withAnyDate });
                setExcelTimesBySefer(map);
            } catch (err) {
                console.error("Excel okuma hatası:", err);
            } finally {
                setExcelSyncLoading(false);
            }
        };

        input.click();
    } catch (err) {
        console.error("Excel seçme hatası:", err);
        setExcelSyncLoading(false);
    }
};

export const exportRegionToExcel = ({ selectedRegion, processedData, REGIONS }) => {
    const regionList = REGIONS[selectedRegion] || [];

    const allRegionRows = regionList.map((pName) => {
        const s = processedData[norm(pName)] || {
            plan: new Set(),
            ted: new Set(),
            iptal: new Set(),
            filo: new Set(),
            spot: new Set(),
            sho_b: new Set(),
            sho_bm: new Set(),
            ontime_req: new Set(),
            late_req: new Set(),
        };

        const plan = s.plan.size;
        const ted = s.ted.size;
        const iptal = s.iptal.size;
        const edilmeyen = Math.max(0, plan - (ted + iptal));
        const zamaninda = s.ontime_req.size;
        const gec = s.late_req.size;
        const yuzde = plan > 0 ? Math.round((zamaninda / plan) * 100) : 0;

        return {
            Proje: pName,
            Talep: plan,
            Tedarik: ted,
            Edilmeyen: edilmeyen,
            Gecikme: gec,
            İptal: iptal,
            SPOT: s.spot.size,
            FİLO: s.filo.size,
            "Basım Var": s.sho_b.size,
            "Basım Yok": s.sho_bm.size,
            Zamanında: zamaninda,
            "Zamanında %": yuzde,
        };
    });

    const headers = [
        "Proje",
        "Talep",
        "Tedarik",
        "Edilmeyen",
        "Gecikme",
        "İptal",
        "SPOT",
        "FİLO",
        "Basım Var",
        "Basım Yok",
        "Zamanında",
        "Zamanında %",
    ];

    const aoa = [headers];
    allRegionRows.forEach((r) => aoa.push(headers.map((h) => r[h] ?? "")));

    const totals = allRegionRows.reduce(
        (acc, r) => {
            acc.Talep += Number(r["Talep"] || 0);
            acc.Tedarik += Number(r["Tedarik"] || 0);
            acc.Edilmeyen += Number(r["Edilmeyen"] || 0);
            acc.Gecikme += Number(r["Gecikme"] || 0);
            acc.İptal += Number(r["İptal"] || 0);
            acc.SPOT += Number(r["SPOT"] || 0);
            acc.FİLO += Number(r["FİLO"] || 0);
            acc.BasımVar += Number(r["Basım Var"] || 0);
            acc.BasımYok += Number(r["Basım Yok"] || 0);
            acc.Zamanında += Number(r["Zamanında"] || 0);
            return acc;
        },
        { Talep: 0, Tedarik: 0, Edilmeyen: 0, Gecikme: 0, İptal: 0, SPOT: 0, FİLO: 0, BasımVar: 0, BasımYok: 0, Zamanında: 0 }
    );

    const totalPerf = totals.Talep ? Math.round((totals.Zamanında / totals.Talep) * 100) : 0;

    aoa.push([
        "BÖLGE TOPLAM",
        totals.Talep,
        totals.Tedarik,
        totals.Edilmeyen,
        totals.Gecikme,
        totals.İptal,
        totals.SPOT,
        totals.FİLO,
        totals.BasımVar,
        totals.BasımYok,
        totals.Zamanında,
        totalPerf,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 42 }, ...headers.slice(1).map(() => ({ wch: 14 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedRegion);

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileName = `AnalizPanel_${selectedRegion}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
};
