import {
  TextInput,
  PasswordInput,
  Anchor,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Button,
} from "@mantine/core";
import { useState } from "react";
import { supabase } from "../../supabase/client";
import { Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

export function Login() {
  const [islogin, setIsLogin] = useState(true);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacontrasena, setConfirmacontrasena] = useState("");
  const [erroremail, setErroremail] = useState("");
  const [errorpassword, setErrorpassword] = useState("");
  const [errorconfirmapassword, setErrorconfirmapassword] = useState("");
  const [correct, setCorrect] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [error, setError] = useState("");

  async function signUpNewUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.log(error);
      setIncorrect(true);
      setError(error.message);
    } else {
      console.log(data);
      setCorrect(true);
      setTimeout(() => {
        resetForm();
      }, 3000);
    }
  }
  const resetForm = () => {
    setIsLogin(true);
    setCorrect(false);
    setIncorrect(false);
    setError("");
    setErroremail("");
    setErrorpassword("");
    setErrorconfirmapassword("");
    setCorreo("");
    setContrasena("");
    setConfirmacontrasena("");
  };
  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.log(error);
      setIncorrect(true);
      setError(error.message);
    } else {
      console.log(data);
      setCorrect(true);
    }
  }
  const validateEmail = (value: string) => {
    // Expresión regular básica para validar correo electrónico
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      setErroremail("Correo electrónico no válido");
    } else {
      setErroremail("");
    }
  };
  const validatePassword = (password: string): string => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return `La contraseña debe tener al menos ${minLength} caracteres.`;
    }

    if (!hasUpperCase) {
      return "La contraseña debe contener al menos una letra mayúscula.";
    }

    if (!hasLowerCase) {
      return "La contraseña debe contener al menos una letra minúscula.";
    }

    if (!hasNumbers) {
      return "La contraseña debe contener al menos un número.";
    }

    if (!hasSpecialChars) {
      return "La contraseña debe contener al menos un carácter especial (e.g., !@#$%^&*).";
    }

    return "";
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    validateEmail(correo);
    setErrorpassword(validatePassword(contrasena));
    if (erroremail || errorpassword) {
      setTimeout(() => {
        setErroremail("");
        setErrorpassword("");
        setErrorconfirmapassword("");
      }, 4000);
      return;
    }
    if (!islogin) {
      if (contrasena !== confirmacontrasena) {
        setErrorconfirmapassword("Las contrasenas no coinciden");
        setTimeout(() => {
          setErroremail("");
          setErrorpassword("");
          setErrorconfirmapassword("");
        }, 4000);
        return;
      }
    }
    islogin
      ? signInWithEmail(correo, contrasena)
      : signUpNewUser(correo, contrasena);
  };
  function toggleLogin() {
    setIsLogin(!islogin);
  }
  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 900,
        })}
      >
        POS REACT
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        {islogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}
        <Anchor<"a"> href="#" pl={5} size="sm" onClick={toggleLogin}>
          {islogin ? "Crear Cuneta" : "Iniciar Sesion"}
        </Anchor>
      </Text>
      <form onSubmit={handleSubmit}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <TextInput
            label="Correo"
            placeholder="you@mail.com"
            required
            onChange={(e) => setCorreo(e.target.value)}
            error={erroremail}
            value={correo}
          />
          <PasswordInput
            label="Contraseña"
            placeholder="Tu contraseña"
            required
            mt="md"
            onChange={(e) => setContrasena(e.target.value)}
            error={errorpassword}
            value={contrasena}
          />
          {!islogin ? (
            <PasswordInput
              label="Confirmar Contraseña"
              placeholder="Tu contraseña"
              required={!islogin}
              mt="md"
              onChange={(e) => setConfirmacontrasena(e.target.value)}
              error={errorconfirmapassword}
              value={confirmacontrasena}
            />
          ) : null}
          {islogin ? (
            <Group position="apart" mt="md">
              <Anchor<"a">
                onClick={(event) => event.preventDefault()}
                href="#"
                size="sm"
              >
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>
          ) : null}
          <Button fullWidth mt="xl" type="submit">
            {islogin ? "Iniciar Sesion" : "Crear Cuenta"}
          </Button>
          <br />
          {correct ? (
            <Notification
              icon={<IconCheck size="1.1rem" />}
              color="teal"
              title={islogin ? "Login Correcto" : "Cuenta Creada Correctamente"}
              onClose={() => setCorrect(false)}
            >
              {islogin ? "Ingresando..." : "Inicia Sesion para Continuar"}
            </Notification>
          ) : null}

          {incorrect ? (
            <Notification
              icon={<IconX size="1.1rem" />}
              color="red"
              title="Error"
              onClose={() => setIncorrect(false)}
            >
              {error}
            </Notification>
          ) : null}
        </Paper>
      </form>
    </Container>
  );
}
