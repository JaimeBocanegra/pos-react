# Etapa 1: Construcción de la aplicación React
FROM node:18-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:stable-alpine

# Copiar los archivos de construcción desde la etapa anterior
COPY --from=build /app/build /usr/share/nginx/html

# Copiar una configuración personalizada de Nginx (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Exponer el puerto 3000
EXPOSE 3000

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
