import { Container, Title, Button, Text, Flex } from "@mantine/core";
import "./NotFound.css";
import { useNavigate } from "react-router-dom";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <Container className={"root"}>
      <div className={"label"}>404</div>
      <Title className={"title"}>Has encontrado un lugar secreto.</Title>
      <Text c="dimmed" size="lg" ta="center" className={"description"}>
        Desafortunadamente la página que estabas buscando no existe.
      </Text>
      <Flex justify={"center"} mt={30}>
        <Button variant="subtle" size="md" onClick={() => navigate("/")}>
          Llévame a la página de inicio
        </Button>
      </Flex>
    </Container>
  );
}
