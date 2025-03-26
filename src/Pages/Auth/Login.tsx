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
  Notification,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export function Login() {
  const [islogin, setIsLogin] = useState(true);
  const [usuario, setUsuario] = useState(""); // Campo compartido para correo o teléfono
  const [contrasena, setContrasena] = useState("");
  const [confirmacontrasena, setConfirmacontrasena] = useState("");
  const [erroremail, setErroremail] = useState("");
  const [errorpassword, setErrorpassword] = useState("");
  const [errorconfirmapassword, setErrorconfirmapassword] = useState("");
  const [correct, setCorrect] = useState(false);
  const [incorrect, setIncorrect] = useState(false); // Para controlar si hubo error
  const [error, setError] = useState(""); // Para mostrar el mensaje de error

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/"); // Redirige al home si ya está autenticado
      }
    };
    checkAuth();
  }, [navigate, correct]);

  // Validar si es un correo electrónico
  const isEmail = (value: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  };

  // Validar si es un número de teléfono
  const isPhone = (value: string) => {
    const phonePattern = /^[0-9]{10,14}$/; // Simple validación para 10 a 14 dígitos
    return phonePattern.test(value);
  };

  async function signUpNewUser() {
    let signUpData;
    if (isEmail(usuario)) {
      signUpData = await supabase.auth.signUp({
        email: usuario,
        password: contrasena,
      });
    } else if (isPhone(usuario)) {
      signUpData = await supabase.auth.signUp({
        phone: usuario,
        password: contrasena,
      });
    }

    if (signUpData) {
      const { data, error } = signUpData;

      if (error) {
        console.log(error);
        setIncorrect(true);
        setError(error.message); // Guardar el mensaje de error para mostrar
        setTimeout(() => {
         setIncorrect(false);
         setError(""); 
        }, 4000);
      } else if (data) {
        console.log(data);
        setCorrect(true);
        setTimeout(() => {
          resetForm();
        }, 3000);
      }
    }
  }

  async function signInWithEmailOrPhone() {
    let signInData;
    if (isEmail(usuario)) {
      signInData = await supabase.auth.signInWithPassword({
        email: usuario,
        password: contrasena,
      });
    } else if (isPhone(usuario)) {
      signInData = await supabase.auth.signInWithPassword({
        phone: usuario,
        password: contrasena,
      });
    }
  
    if (signInData) {
      const { data, error } = signInData;
  
      if (error) {
        console.log(error);
        setIncorrect(true);
        setError("Usuario o contraseña incorrectos"); // Mostrar error claro en caso de login fallido
        setTimeout(() => {
          setIncorrect(false);
          setError("");
        }, 4000);
      } else if (data) {
        console.log(data);
        setCorrect(true);
      }
    }
  }

  const validatePassword = (password: string): string => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "La contraseña debe tener al menos " + minLength + " caracteres.";
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

  const resetForm = () => {
    setIsLogin(true);
    setCorrect(false);
    setIncorrect(false);
    setError("");
    setErroremail("");
    setErrorpassword("");
    setErrorconfirmapassword("");
    setUsuario("");
    setContrasena("");
    setConfirmacontrasena("");
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
  
    // Limpiar los errores antes de comenzar la validación
    setErroremail("");
    setErrorpassword("");
    setErrorconfirmapassword("");
    setError(""); // Limpiar error general
  
    // Validación de correo o teléfono
    if (!isEmail(usuario) && !isPhone(usuario)) {
      setErroremail("Debe ingresar un correo electrónico válido o un número de teléfono.");
      setTimeout(() => {
        setErroremail("");
      }, 4000);
      return; // Evitar seguir si la validación de usuario falla
    }
  
    // Validación de contraseña en caso de registro
    if (!islogin) {
      const passwordError = validatePassword(contrasena);
      if (passwordError) {
        setErrorpassword(passwordError);
        return; // Detener si la contraseña no cumple
      }
  
      // Comprobar si las contraseñas coinciden
      if (contrasena !== confirmacontrasena) {
        setErrorconfirmapassword("Las contraseñas no coinciden.");
        return; // Detener si las contraseñas no coinciden
      }
    }
  
    // Proceder con login o registro si no hay errores
    islogin ? signInWithEmailOrPhone() : signUpNewUser();
  };

  function toggleLogin() {
    setIsLogin(!islogin);
  }

  return (
    <Container size={420} my={40}>
      {incorrect && (
        <Notification
          icon={<IconX size="1.1rem" />}
          color="red"
          title="Error"
          onClose={() => setIncorrect(false)} // Permitir cerrar la notificación
        >
          {error}
        </Notification>
      )}
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
          {islogin ? "Crear Cuenta" : "Iniciar Sesión"}
        </Anchor>
      </Text>
      <form onSubmit={handleSubmit}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <TextInput
            label="Correo o Teléfono"
            placeholder="Ingresa tu correo o número de teléfono"
            required
            onChange={(e) => setUsuario(e.target.value)}
            error={erroremail}
            value={usuario}
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
          <Button fullWidth mt="xl" type="submit">
            {islogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </Button>
        </Paper>
      </form>
    </Container>
  );
}
