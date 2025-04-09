import "./App.css";
import { MantineProvider } from "@mantine/core";
import { Login } from "./Pages/Auth/Login";
import { Route, Routes } from "react-router-dom";
import { Inicio } from "./Pages/Home/Inicio";
import { NotFound } from "./Pages/NotFound";
import { Clientes } from "./Pages/Clientes/Clientes";
import { Proveedores } from "./Pages/Proveedores/Proveedores";
import { Productos } from "./Pages/Productos/Productos";
import { Agregar as AgregarProducto } from "./Pages/Productos/Agregar";
import { Editar as EditarProducto } from "./Pages/Productos/Editar";
import { DetallesProducto } from "./Pages/Productos/DetallesProducto";
import ProtectedRoute from "./Pages/ProtectedRoute";
import { Agregar as AgregarCliente } from "./Pages/Clientes/Agregar";
import { Agregar as AgregarProveedor } from "./Pages/Proveedores/Agregar";
import { Editar as EditarCliente } from "./Pages/Clientes/Editar";
import { Editar as EditarProveedor } from "./Pages/Proveedores/Editar";
import { DetallesCliente } from "./Pages/Clientes/DetallesCliente";
import { DetallesProveedor } from "./Pages/Proveedores/DetallesProveedor";
import { Compras } from "./Pages/Compras/Compras";
import { NuevaCompra } from "./Pages/Compras/NuevaCompra";
import { DetalleCompra } from "./Pages/Compras/DetalleCompra";
// Importamos los nuevos componentes de Configuraciones
import Configuraciones from "./Pages/Configuraciones/Configuraciones";
import EditarConfiguracion  from "./Pages/Configuraciones/EditConfiguracion";
import NewConfiguracion from "./Pages/Configuraciones/NewConfiguracion";

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
            <Route path="proveedores" element={<Proveedores />}>
              <Route path="agregar" element={<AgregarProveedor />} />
              <Route path=":id/editar" element={<EditarProveedor />} />
              <Route path=":id" element={<DetallesProveedor />} />
            </Route>
            <Route path="productos" element={<Productos />}>
              <Route path="agregar" element={<AgregarProducto />} />
              <Route path=":id/editar" element={<EditarProducto />} />
              <Route path=":id" element={<DetallesProducto />} />
            </Route>
            <Route path="compras" element={<Compras />}>
              <Route path="nueva" element={<NuevaCompra />} />
              <Route path=":id" element={<DetalleCompra />} />
            </Route>
            {/* Nuevas rutas para Configuraciones */}
            <Route path="configuraciones" element={<Configuraciones />}>
              <Route path="nueva" element={<NewConfiguracion />} />
              <Route path=":id/editar" element={<EditarConfiguracion />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MantineProvider>
  );
}

export default App;