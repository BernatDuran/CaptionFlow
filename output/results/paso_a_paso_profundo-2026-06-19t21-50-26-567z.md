# Guía Completa: Creación de un Sistema de Gestión y Reservas para Negocios con IA (Claude Code + Antigravity)

## Resumen Inicial
Este documento detalla el proceso paso a paso para construir un sistema digital completo y vendible para negocios físicos (en este caso, una clínica de estética), sin escribir código manualmente. Utilizando herramientas de IA agéntica como Claude Code, Google Antigravity o OpenAI Codex, se crea una landing page premium, un sistema de reservas público y un panel de gestión privado (CRM, agenda y dashboard). La arquitectura se apoya en tecnologías como Next.js, la librería de animación GSAP, Supabase para base de datos y autenticación, y Resend para el envío de correos electrónicos. El objetivo es demostrar cómo cualquier persona puede desarrollar, en una tarde, un software de alto valor que las agencias tradicionales cobran por miles de euros, y ponerlo a la venta.

---

## Explicación por Fases o Bloques Lógicos

### Fase 1: Preparación del Entorno y Herramientas
- **Qué se explica:** Instalación de los requisitos base (Node.js, Git) y elección de un entorno de desarrollo integrado (IDE). Se presenta Google Antigravity IDE como opción gratuita inicial, Visual Studio Code, y las extensiones necesarias para conectar con IAs (Claude Code, Codex).
- **Por qué es importante:** Establece el espacio de trabajo donde la IA podrá ejecutar comandos, leer archivos y construir el proyecto. Sin estas herramientas, la IA no tiene contexto ni permisos para operar en el sistema local.
- **Pasos concretos:**
  - Instalar Node.js y Git (siguiente, siguiente).
  - Descargar e instalar un IDE (Visual Studio Code o Google Antigravity).
  - En el IDE, instalar la extensión de la IA preferida (Claude Code o Codex de OpenAI).
  - En Claude Code, ir a *Settings* y marcar la opción para que no pida permisos continuamente.
- **Errores, riesgos o dependencias:** Se menciona que el modelo *Claude Fable 5* (probablemente un error de transcripción para *Claude 3.5 Sonnet* u otro modelo reciente) fue retirado, pero que no impide seguir el tutorial con los modelos disponibles (Opus, Sonnet, Gemini 3.5/3.1).

### Fase 2: Inyección de Conocimiento (Skills) y Diseño Inicial
- **Qué se explica:** Instalación de "skills" (habilidades) para que la IA entienda cómo usar ciertas librerías, específicamente GSAP para animaciones premium. Se lanza el primer *prompt* para planificar y construir el diseño de la landing page.
- **Por qué es importante:** Las IAs no siempre conocen las últimas actualizaciones de librerías de diseño. Al inyectar la skill de GSAP, se asegura un resultado visual de nivel "Awwwards" (premium), que es el principal argumento de venta visual.
- **Pasos concretos:**
  - Copiar un comando de instalación de skills desde el repositorio de la comunidad.
  - Abrir un nuevo terminal en el IDE, pegar el comando y pulsar enter.
  - Seleccionar todas las habilidades con la barra espaciadora.
  - Si se usa Claude Code, marcar la opción específica para ello. Instalar a nivel de proyecto.
  - Crear manualmente la carpeta `.claude` en la raíz si no se autogenera, y copiar la carpeta `skills` dentro de `.agents` a `.claude`.
  - Seleccionar el modelo **Opus** (ideal para planificar) en modo *Plan* y esfuerzo *High*.
  - Pegar el primer *prompt* indicando que actúe como *Senior Developer* nivel *Awwwards*, usando GSAP y Next.js.
  - Responder a las preguntas de la IA (ej. nombre del negocio: "Lumier").
  - Aceptar el plan y pedir que ejecute **solo la Parte 1** (interfaz visual).
- **Errores, riesgos o dependencias:** La carpeta `.claude` a veces no se autogenera por un fallo de la herramienta, requiriendo creación manual. Si se hace todo de golpe, la IA puede saturarse; por eso se pide ejecutar solo la Parte 1.

### Fase 3: Generación de Contexto y Preparación de Base de Datos
- **Qué se explica:** Guardado del contexto del proyecto creado hasta ahora y configuración de Supabase para la lógica de reservas y autenticación.
- **Por qué es importante:** El archivo de contexto evita que la IA "olvide" la estructura del proyecto al iniciar nuevas conversaciones. Supabase proporciona la infraestructura backend gratuita y escalable necesaria para el negocio.
- **Pasos concretos:**
  - Ejecutar el comando `init` en el chat de la IA para generar el archivo `claude.md` (o `agents.md` en Antigravity/Codex).
  - Crear una cuenta/organización en Supabase (plan gratuito).
  - Crear un proyecto (ej. "app estética") y guardar la contraseña.
  - Buscar "Supabase MCP" en el navegador, seleccionar el proyecto creado y copiar el comando de conexión.
  - Pegar el comando en la IA para instalar el MCP.
  - Abrir una nueva conversación en la IA, seleccionar el `claude.md` para dar contexto, y pedir probar la conexión con Supabase.
  - Autorizar la URL generada en el navegador.
- **Errores, riesgos o dependencias:** Es obligatorio abrir una nueva conversación tras instalar el MCP para que la IA detecte la conexión con Supabase.

### Fase 4: Implementación del Sistema de Reservas y Panel Básico
- **Qué se explica:** Mediante un nuevo *prompt*, la IA crea la lógica de reservas pública (sin login) y un panel de administración básico protegido, conectando con la base de datos.
- **Por qué es importante:** Convierte la web estática en una aplicación funcional. Permite a los clientes agendar y al dueño del negocio ver las citas.
- **Pasos concretos:**
  - Cambiar al modelo **Sonnet** para ahorrar tokens en la fase de desarrollo.
  - Activar *bypass permissions*.
  - Pegar el segundo *prompt*, indicando uso de `pnpm` (en lugar de npm por seguridad), conexión a Supabase vía MCP, reservas públicas y panel de gestión.
  - Acceder a la URL `/admin` para ver el login.
  - Usar las credenciales de prueba generadas por la IA para entrar al panel.
  - Verificar en Supabase (apartado *Table Editor*) que las reservas de prueba se han guardado.
- **Errores, riesgos o dependencias:** Se advierte sobre el uso de `npm` por riesgos de seguridad, forzando el uso de `pnpm`. La seguridad del login es básica (pendiente de validar si se requiere un sistema más robusto para producción).

### Fase 5: Automatización de Emails con Resend
- **Qué se explica:** Conexión con la API de Resend para enviar correos automáticos de solicitud y confirmación de citas.
- **Por qué es importante:** Cierra el ciclo de la experiencia del cliente. Sin el email, la reserva no tiene validez formal para el usuario.
- **Pasos concretos:**
  - Crear cuenta en Resend y generar una *API Key*.
  - Pegar la API Key en el archivo de variables de entorno que indica la IA (o pasársela directamente al chat).
  - Indicar a la IA que la clave se ha guardado.
  - Realizar una reserva de prueba en la web.
  - Confirmar la reserva desde el panel `/admin`.
  - Comprobar la recepción de los dos correos (solicitud y confirmación).
- **Errores, riesgos o dependencias:** En la capa gratuita de Resend, los correos solo se pueden enviar a la dirección de email con la que te registraste. Para producción, se debe añadir y verificar un dominio propio en Resend.

### Fase 6: Evolución a CRM y Dashboard Avanzado
- **Qué se explica:** Uso de un último *prompt* para transformar el panel básico en un software de gestión completo (CRM, control de horarios, vacaciones, dashboard de métricas y gestión de servicios).
- **Por qué es importante:** Eleva el producto de una "web con agenda" a un "software de gestión empresarial", justificando un cobro de miles de euros.
- **Pasos concretos:**
  - Pegar el tercer *prompt* en la IA para mejorar el panel.
  - Acceder a `/admin` y revisar las nuevas secciones: Dashboard (facturación, ticket medio), Citas (con estados: completada, no asistido), Servicios (editables, se sincronizan con la web), Horarios (vacaciones, días libres) y Clientes (historial completo).
- **Errores, riesgos o dependencias:** Depende totalmente de la correcta ejecución de las fases anteriores. La IA debe mantener la estética visual previamente definida.

---

## Procedimiento Paso a Paso

1. **Instalación base:** Descarga e instala Node.js y Git. Instala un IDE (Visual Studio Code o Google Antigravity).
2. **Configuración de la IA:** Abre el IDE, instala la extensión de Claude Code (o Codex). En ajustes, activa la opción para evitar que pida permisos constantemente.
3. **Skills de diseño:** Abre un terminal en el IDE, pega el comando de instalación de skills de la comunidad, selecciona todas con la barra espaciadora, marca la opción de Claude Code si aplica, e instala a nivel de proyecto. Si no se crea la carpeta `.claude`, créala a mano y mueve la carpeta `skills` de `.agents` a `.claude`.
4. **Planificación:** Selecciona el modelo Opus, modo *Plan*, esfuerzo *High*. Pega el primer *prompt* (Senior Developer, nivel Awwwards, GSAP, Next.js). Responde a las preguntas de la IA (nombre: Lumier). Acepta el plan.
5. **Primer desarrollo:** Cambia al modelo Sonnet para ahorrar tokens. Pide a la IA que ejecute **solo la Parte 1** del plan (interfaz). Activa *bypass permissions*. Revisa el diseño web generado.
6. **Contexto:** Ejecuta el comando `init` en el chat para generar el archivo `claude.md`.
7. **Base de Datos:** Crea una cuenta y proyecto en Supabase (plan free). Busca "Supabase MCP" en Google, selecciona tu proyecto, copia el comando e instálalo en tu IDE. Abre una nueva conversación en la IA, selecciona el `claude.md`, pega el comando y autoriza la URL en tu navegador.
8. **Reservas y Panel:** Pega el segundo *prompt* (usar pnpm, conectar a Supabase, reservas públicas, panel gestión). Entra en `tu-url/admin`, inicia sesión con las credenciales de prueba y verifica las citas de prueba en Supabase.
9. **Emails:** Crea una cuenta en Resend, genera una API Key. Pégala en el archivo indicado por la IA o pásasela por el chat. Haz una reserva en la web, confírmala en el panel `/admin` y revisa tu correo.
10. **CRM Final:** Pega el tercer y último *prompt* para mejorar el panel. Deja que la IA construya el dashboard, CRM de clientes, gestión de servicios y horarios. Verifica las nuevas funciones en `/admin`.

---

## Puntos Críticos a Recordar

- **Gestión de Modelos:** Usa **Opus** para planificar (mayor capacidad de análisis) y **Sonnet** para programar/ejecutar (ahorro de tokens y velocidad).
- **Seguridad de Dependencias:** Obliga a la IA a usar siempre `pnpm` en lugar de `npm` para evitar la instalación de paquetes maliciosos.
- **Contexto de la IA:** Cada vez que abras una conversación nueva en Claude Code, asegúrate de que tiene seleccionado el archivo `claude.md` para que sepa la estructura del proyecto.
- **Limitaciones de Resend:** En modo prueba, Resend solo envía correos a tu propio email registrado. Para entregarlo a un cliente real, debes configurar un dominio propio en Resend.
- **Ejecución por Fases:** No pidas a la IA que haga la web, la base de datos y el panel de golpe. Hazlo en fases (Diseño -> Reservas -> CRM) para evitar errores y bloqueos de contexto.
- **Ubicación de Skills:** Claude Code usa `.claude`, mientras que Antigravity, Codex y Open Code usan `.agents`. Si una herramienta no detecta las skills, revisa esta estructura de carpetas.

---

## Conclusión Final
La metodología mostrada demuestra que el desarrollo de software complejo y vendible ha cambiado radicalmente. Dividiendo el proyecto en fases lógicas (entorno, diseño, backend, lógica de negocio y mejora iterativa) y utilizando herramientas agénticas como Claude Code junto a plataformas SaaS gratuitas (Supabase, Resend), es posible construir un sistema empresarial completo en un día. El valor real no reside en programar, sino en saber orquestar a la IA mediante *prompts* estructurados, inyectar conocimiento técnico (skills/MCPs) y entender el flujo de un negocio real para ofrecer una solución lista para producción y lista para vender a agencias o negocios locales.