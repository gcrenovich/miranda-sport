# Guía de Gestión de Usuarios y Despliegue en Render.com para Miranda Sport

Este archivo contiene las instrucciones para desplegar Miranda Sport de forma gratuita y la información sobre cómo funciona la administración de usuarios.

---

## 1. Gestión de Usuarios (Panel Vendedor)

### Roles y Permisos:
1. **Administrador General (Rol: `admin`):**
   - Tiene acceso completo al sistema.
   - Es el **único** rol que puede visualizar y acceder a la pestaña **"Gestión de Usuarios"** en el menú lateral.
   - Puede crear nuevos usuarios, editar los existentes (cambiar nombres, roles, actualizar contraseñas) y eliminarlos.
   - *Seguridad:* El sistema impide eliminar al último administrador registrado para evitar bloqueos del sistema.
2. **Vendedor de Salón (Rol: `vendedor`):**
   - Tiene acceso restringido a la carga de stock (Inventario) y a la facturación de pedidos.
   - **No ve ni puede acceder** a la pestaña de "Gestión de Usuarios".

### Credenciales iniciales precargadas:
- **Administrador:** Usuario: `admin` | Clave: `admin`
- **Vendedor:** Usuario: `vendedor` | Clave: `vendedor`

---

## 2. Flexibilidad de Almacenamiento (Híbrido API / LocalStorage)

Para asegurar que el sistema sea 100% funcional tanto en un servidor en la nube como de forma offline, la aplicación cuenta con un **sistema de respaldo inteligente**:
- Si el servidor de Node.js está activo (producción en Render), guarda y consulta directamente la base de datos central en `database.json`.
- Si el servidor está apagado o se ejecuta el archivo `index.html` de manera local (`localStorage` de respaldo), el sistema sigue funcionando de manera idéntica guardando los productos, pedidos y usuarios directamente en la memoria del navegador.

---

## 3. Guía Paso a Paso: Cómo Subir el Proyecto a Render.com Gratis

Para hospedar tu sistema y obtener el dominio `mirandasport.onrender.com`, debes seguir estos sencillos pasos:

### Paso 1: Subir el código a GitHub
1. Si no tienes una cuenta de GitHub, créala en [github.com](https://github.com).
2. Crea un **Repositorio nuevo** (puede ser privado o público) con el nombre `miranda-sport`.
3. Sube los archivos del proyecto a ese repositorio (puedes usar Git o arrastrar los archivos directamente a la web de GitHub).
   - *Nota:* Ya hemos creado un archivo `.gitignore` en la carpeta raíz del proyecto para evitar que subas la carpeta pesada `node_modules`.

### Paso 2: Crear el servicio en Render.com
1. Ingresa a [render.com](https://render.com) e inicia sesión con tu cuenta de **GitHub**.
2. En el panel principal de Render, haz click en el botón **"New +"** (Nuevo) y selecciona **"Web Service"** (Servicio Web).
3. Selecciona la opción **"Build and deploy from a Git repository"** (Construir y desplegar desde un repositorio de Git) y presiona Siguiente.
4. Conecta tu cuenta de GitHub y selecciona el repositorio `miranda-sport` que acabas de subir.

### Paso 3: Configurar el despliegue gratuito
En el formulario de configuración de Render, completa los siguientes campos:
- **Name (Nombre del servicio):** Escribe `mirandasport` (esto definirá tu subdominio, dándote la dirección `mirandasport.onrender.com`).
- **Language (Lenguaje):** Selecciona `Node`.
- **Branch (Rama):** Selecciona `main` (o la rama donde subiste tus archivos).
- **Region (Región):** Selecciona cualquiera (por ejemplo, *Ohio* u *Oregon*).
- **Build Command (Comando de construcción):** Escribe `npm install` o déjalo por defecto.
- **Start Command (Comando de inicio):** Escribe `node server.js` (Render leerá automáticamente el archivo `package.json`).
- **Instance Type (Tipo de Instancia):** Selecciona el plan **"Free"** (Gratis).

Haz click en **"Create Web Service"** en la parte inferior.

### Paso 4: ¡Listo!
Render comenzará a descargar y compilar tu proyecto. En unos 2 o 3 minutos verás un mensaje que dice **"Your service is live"**. En la parte superior del panel de Render verás el enlace de tu sitio web: `https://mirandasport.onrender.com`.
