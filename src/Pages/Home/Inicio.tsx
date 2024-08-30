import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Header,
  MediaQuery,
  Navbar,
  NavLink,
} from "@mantine/core";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  IconUsers,
  IconBuildingStore,
  IconPackage,
  IconShoppingBagPlus,
  IconTruckDelivery,
  IconReport,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { supabase } from "../../supabase/client";

export function Inicio() {
  const [opened, setOpened] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    supabase.auth.signOut();
    navigate("/login");
  };
  const collections = [
    { icono: <IconUsers />, label: "Clientes", link: "/clientes" },
    { icono: <IconBuildingStore />, label: "Ventas", link: "/ventas" },
    { icono: <IconShoppingBagPlus />, label: "Compras", link: "/compras" },
    { icono: <IconPackage />, label: "Productos", link: "/productos" },
    { icono: <IconTruckDelivery />, label: "Proveedores", link: "/proveedor" },
    { icono: <IconReport />, label: "Reportes", link: "/reportes" },
    {
      icono: <IconSettings />,
      label: "Configuraciones",
      link: "/configuraciones",
    },
  ];
  const collectionLinks = collections.map((item, index) => (
    <NavLink
      key={index}
      label={item.label}
      icon={item.icono}
      component={Link}
      to={item.link}
      variant="filled"
      color="indigo"
      active={location.pathname === item.link}
    />
  ));
  return (
    <AppShell
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={
        <Navbar
          p="md"
          hiddenBreakpoint="sm"
          hidden={!opened}
          width={{ sm: 200, lg: 300 }}
        >
          {collectionLinks}
        </Navbar>
      }
      header={
        <Header height={80} px={10}>
          <Group position="apart" align="center" sx={{ height: "100%" }}>
            <MediaQuery largerThan="sm" styles={{ display: "none" }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                mr="xl"
              />
            </MediaQuery>
            <h1>POS React</h1>
            <Group>
              <Avatar
                src="ruta_a_la_foto_de_usuario"
                alt="Usuario"
                radius="xl"
                size="md"
              />
              <Button
                variant="filled"
                color="red"
                leftIcon={<IconLogout />}
                onClick={handleLogout}
              >
                Cerrar Sesión
              </Button>
            </Group>
          </Group>
        </Header>
      }
    >
      <Outlet />
    </AppShell>
  );
}
