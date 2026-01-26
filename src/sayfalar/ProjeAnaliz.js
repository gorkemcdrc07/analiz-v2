import { Fade, Box } from "@mui/material";
import { useOutletContext } from "react-router-dom";
import BilgiPanelleri from "../bilesenler/BilgiPanelleri";
import ProjeTablosu from "../components/ProjeTablosu/ProjeTablosu";

export default function ProjeAnaliz() {
    const { data, loading, startDate, endDate, setStartDate, setEndDate, handleFilter } =
        useOutletContext();

    return (
        <Fade in={!loading} timeout={500}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <BilgiPanelleri
                    data={data}
                    loading={loading}
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    handleFilter={handleFilter}
                />
                <ProjeTablosu data={data} />
            </Box>
        </Fade>
    );
}
