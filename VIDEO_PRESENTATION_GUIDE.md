# Guía de Presentación de Video: TimeKeeper

Este documento sirve como guía completa para grabar un video de presentación de **TimeKeeper** (anteriormente conocido como MeetKeeper). Incluye la estructura del guion, los puntos clave a destacar y el flujo de navegación recomendado.

## 1. Preparación

Antes de grabar, asegúrate de tener lo siguiente listo:

*   **Entorno Local**: La aplicación corriendo en `http://localhost:3000`.
*   **Base de Datos**: Asegúrate de que Supabase esté activo y conectado.
*   **Datos de Prueba**:
    *   Tener un usuario registrado y logueado.
    *   (Opcional) Tener algunos "Oradores" guardados en el Dashboard para mostrar la lista poblada.
*   **Resolución**: Graba se recomienda en 1080p (1920x1080) para mayor claridad.
*   **Limpieza**: Cierra otras pestañas del navegador y desactiva notificaciones.

---

## 2. Estructura del Video (Guion Sugerido)

Este guion está diseñado para un video de 2 a 3 minutos.

### Escena 1: El Gancho (Landing Page)
**Visual**: Navega a la Home (`/`). Haz scroll suavemente.
**Audio (Narración)**:
> "¿Alguna vez has sentido que estás quemando dinero en reuniones eternas y sin sentido? Te presento **TimeKeeper**, la herramienta definitiva para recuperar el control de tu tiempo y tu presupuesto."

### Escena 2: La Propuesta de Valor
**Visual**: Muestra las secciones de "Semáforo de Tiempo", "Calculadora de Costos" e "Invitaciones Inteligentes" en la Landing.
**Narración**:
> "TimeKeeper no es solo un cronómetro. Es un auditor de reuniones en tiempo real. Calcula costos, gestiona oradores y asegura que cada minuto tenga un retorno de inversión claro."

### Escena 3: El Dashboard
**Visual**: Haz clic en "Ir al Dashboard" (o Log in). Muestra las métricas (Reuniones Totales, Dinero Ahorrado).
**Narración**:
> "Desde tu panel de control, tienes una visión clara de tu historial. Aquí puedes ver a tus oradores frecuentes y, lo más importante, cuánto dinero has ahorrado optimizando tus sesiones."

### Escena 4: Creando una Reunión (El "Wow" Factor)
**Visual**: Clic en "Nueva Reunión". Llena el nombre ("Reunión de Estrategia Q3"). Abre el **Wizard de Costos**.
**Acción**:
1.  Clic en "Calcular Costos".
2.  Ingresa número de asistentes (ej. 8).
3.  Ingresa costo promedio empresa (ej. $1.500.000).
4.  Muestra el resultado final en el Wizard (¡El costo total!).
**Narración**:
> "Lo que no se mide, no se mejora. Con nuestra calculadora de impacto, puedes ver exactamente cuánto cuesta juntar a tu equipo antes de enviar la invitación. Esto obliga a definir un objetivo claro."

### Escena 5: Gestión de Oradores
**Visual**: Agrega un par de oradores en el formulario. Asigna tiempos (ej. 5 min a Juan, 10 min a Ana). Muestra el autocompletado si tienes oradores guardados.
**Narración**:
> "Asigna tiempos específicos a cada orador. Nada de monólogos infinitos. TimeKeeper estructura la agenda minuto a minuto."

### Escena 6: La Experiencia en Vivo (Teleprompter)
**Visual**: Lanza la reunión. Abre el enlace de "Oradores (Pantalla)" o el de Admin. Muestra la interfaz del **Teleprompter**.
**Acción**:
1.  Escribe o genera un guion rápido.
2.  Activa el micrófono y demuestra cómo el texto avanza con la voz (si es posible grabar audio del sistema).
3.  Cambia el tema a "Modern Glass" y ajusta el tamaño de letra.
**Narración**:
> "Y para tus presentaciones, incluimos un Teleprompter inteligente con reconocimiento de voz. El texto avanza automáticamente a medida que hablas, permitiéndote mantener contacto visual con tu audiencia sin perder el hilo. Totalmente personalizable."

### Escena 7: Cierre
**Visual**: Vuelve a la Landing Page o una pantalla con el logo.
**Narración**:
> "TimeKeeper. Deja de perder tiempo. Empieza a ganar productividad. Pruébalo gratis hoy."

---

## 3. Características Clave a Destacar

Asegúrate de mostrar o mencionar estas funcionalidades durante la demo:

*   **Calculadora de ROI**: El "dolor" de ver el costo en dinero real es muy efectivo.
*   **Diseño Premium**: Destaca la estética "Dark Mode", los gradientes y el efecto "Glassmorphism" del Teleprompter.
*   **Oradores Recurrentes**: La facilidad de no tener que escribir los nombres siempre.
*   **Invitaciones**: La generación automática de enlaces para moderador y oradores.

## 4. Ficha Técnica (Para la descripción del video o audiencia técnica)

Si tu audiencia es técnica, menciona el stack moderno que potencia la app:

*   **Framework**: Next.js 16 (App Router)
*   **Estilos**: Tailwind CSS 4
*   **Backend & Auth**: Supabase
*   **Iconos**: Lucide React
*   **Speech Recognition**: Web Speech API nativa

---

## 5. Tips de Navegación durante la Grabación

*   **Mouse**: Mueve el cursor suavemente. Evita movimientos bruscos.
*   **Transiciones**: Espera un segundo después de que cargue una página antes de empezar a moverte o hacer clic.
*   **Datos**: Usa nombres realistas para las reuniones y personas (ej. "Revisión Semanal", "Ana García") en lugar de "Test 1", "asdf".
