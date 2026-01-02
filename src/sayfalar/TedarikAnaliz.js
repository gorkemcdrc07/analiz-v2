import { Fade, Box } from "@mui/material";
import { useOutletContext } from "react-router-dom";

import BilgiPanelleri from "../bilesenler/BilgiPanelleri";
import ProjeTablosu from "../bilesenler/ProjeTablosu";

export default function TedarikAnaliz() {
    const { data, loading, startDate, endDate, setStartDate, setEndDate, handleFilter } =
        useOutletContext();

    return (
        <Fade in={!loading} timeout={500}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <BilgiPanelleri
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    handleFilter={handleFilter}
                    showVeriAktarimButton={true}
                />

                <ProjeTablosu data={data} />
            </Box>
        </Fade>
    );
}
