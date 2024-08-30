import "./App.css";
import { MantineProvider } from "@mantine/core";
import { Login } from "./Pages/Auth/Login";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Inicio } from "./Pages/Home/Inicio";
import { NotFound } from "./Pages/NotFound";
import { useEffect } from "react";
import { supabase } from "./supabase/client";

function App() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/Login");
      } else {
        navigate("/");
      }
    });
  });
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="/" element={<Inicio />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MantineProvider>
  );
}

export default App;
