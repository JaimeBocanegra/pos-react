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
  const handleLinkClick = () => {
    setOpened(false); // Cierra el menú
  };
  const collectionLinks = collections.map((item, index) => (
    <NavLink
      key={index}
      label={item.label}
      icon={item.icono}
      component={Link}
      to={item.link}
      variant="filled"
      color="indigo"
      active={location.pathname.startsWith(item.link)}
      onClick={handleLinkClick}
    />
  ));
  return (
    <AppShell
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      styles={(theme) => ({
        main: {
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[1],
        },
      })}
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
            <MediaQuery smallerThan="sm" styles={{ fontSize: "1rem" }}>
              <h1>POS React</h1>
            </MediaQuery>
            <Group>
              <Avatar
                src="ruta_a_la_foto_de_usuario"
                alt="Usuario"
                radius="xl"
                size="md"
              />
              <MediaQuery
                smallerThan="sm"
                styles={{ fontSize: "0.8rem", padding: "0.5rem" }}
              >
                <Button
                  variant="filled"
                  color="red"
                  leftIcon={<IconLogout />}
                  onClick={handleLogout}
                >
                  <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
                    <span>Cerrar Sesión</span>
                  </MediaQuery>
                </Button>
              </MediaQuery>
            </Group>
          </Group>
        </Header>
      }
    >
      <Outlet />
    </AppShell>
  );
}
