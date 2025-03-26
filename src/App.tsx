import "./App.css";
import { MantineProvider } from "@mantine/core";
import { Login } from "./Pages/Auth/Login";
import { Route, Routes } from "react-router-dom";
import { Inicio } from "./Pages/Home/Inicio";
import { NotFound } from "./Pages/NotFound";
import { Clientes } from "./Pages/Clientes/Clientes";
import ProtectedRoute from "./Pages/ProtectedRoute";
import { Agregar as AgregarCliente } from "./Pages/Clientes/Agregar";
import { Editar as EditarCliente } from "./Pages/Clientes/Editar";
import { DetallesCliente } from "./Pages/Clientes/DetallesCliente";

function App() {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Inicio />}>
            <Route path="clientes" element={<Clientes />}>
              <Route path="agregar" element={<AgregarCliente />} />
              <Route path=":id/editar" element={<EditarCliente />} />
              <Route path=":id" element={<DetallesCliente />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MantineProvider>
  );
}

export default App;
