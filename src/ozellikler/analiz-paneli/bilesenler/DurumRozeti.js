import { Chip, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DURUM_HARITASI } from "../../yardimcilar/sabitler";
import { sayiCevir } from "../../yardimcilar/metin";

export default function DurumRozeti({ durumId }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const id = sayiCevir(durumId);

    const durum = DURUM_HARITASI[id] || {
        label: "Belirsiz",
        color: "#94a3b8",
    };

    const baseColor = durum.color;

    return (
        <Chip
            size="small"
            label={durum.label}
            sx={{
                height: 26,
                px: 1,
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: 0.3,
                borderRadius: "999px",

                bgcolor: alpha(baseColor, isDark ? 0.25 : 0.15),
                color: isDark
                    ? theme.palette.getContrastText(baseColor)
                    : baseColor,

                border: `1px solid ${alpha(baseColor, 0.35)}`,
                backdropFilter: "blur(6px)",

                transition: "all 0.2s ease",
                "&:hover": {
                    bgcolor: alpha(baseColor, isDark ? 0.35 : 0.25),
                    transform: "translateY(-1px)",
                },
            }}
        />
    );
}
