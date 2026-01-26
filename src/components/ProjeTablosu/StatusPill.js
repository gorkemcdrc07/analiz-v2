// src/components/ProjeTablosu/StatusPill.js
import { Chip, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { STATUS_MAP } from "./constants";
import { toNum } from "./utils";

export default function StatusPill({ statusIdRaw }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const id = toNum(statusIdRaw);
    const s = id != null && STATUS_MAP[id] ? STATUS_MAP[id] : { label: "Belirsiz", color: "#94a3b8" };

    return (
        <Chip
            size="small"
            label={s.label}
            sx={{
                height: 24,
                fontWeight: 950,
                borderRadius: "999px",
                bgcolor: isDark ? alpha(s.color, 0.28) : s.color,
                color: "#fff",
                px: 1,
                border: isDark ? `1px solid ${alpha(s.color, 0.45)}` : "none",
            }}
        />
    );
}
