# Documento de Especificación de Requisitos

## Proyecto: "FinDash - Billetera Digital" 💳

## 🏢 Contexto del Negocio

FinDash es una FinTech en pleno crecimiento que ofrece servicios de billetera digital. La base de usuarios es muy diversa: desde personas naturales que envían dinero a sus amigos, hasta pequeños comercios y grandes corporaciones que pagan sus nóminas.

El modelo de monetización principal se basa en el cobro de comisiones dinámicas por transferencia, las cuales varían radicalmente según el perfil del cliente. Actualmente, el equipo de Producto y Marketing está diseñando nuevos niveles de cuenta con reglas tarifarias completamente nuevas que se lanzarán en el futuro.

**Tu misión:** No se busca solo un código que "funcione hoy". Se necesita que diseñes una arquitectura lo suficientemente robusta, limpia y desacoplada para que, cuando el negocio exige integrar esas nuevas reglas mañana, el sistema pueda escalar sin necesidad de reescribir ni romper el código base existente.

---

## 1. Requisitos Funcionales (RF)

### 1.1. Módulo de Seguridad y Accesos

- **RF-01: Autenticación y Autorización:** Integración de un esquema de validación de identidad seguro mediante JWT.
- **RF-02: Control de Roles (RBAC):** La plataforma debe gestionar rigurosamente dos perfiles:
  - **Administrador:** Acceso global. Puede visualizar todas las cuentas, auditar transacciones y acceder al panel de métricas financieras.
  - **Cliente:** Acceso restringido. Solo puede visualizar su propio saldo, realizar transferencias y ver su historial de movimientos. Bloqueo total a métricas globales.

### 1.2. Módulo de Cuentas de Usuario

- **RF-03: Listado Paginado:** El administrador debe poder listar las cuentas existentes mediante paginación desde el backend y filtrarlas por Documento o Estado.
- **RF-04: Representación Visual (UX/UI):** El listado de cuentas y el historial no deben ser texto plano. Cada usuario debe mostrar un avatar. Restricción: El sistema debe interceptar imágenes rotas o ausentes y cargar un placeholder (o Skeleton loader durante la carga) sin romper la maqueta visual.

### 1.3. Módulo de Transacciones (Core)

- **RF-05: Formulario de Transferencia:** Interfaz que permita a un Cliente ingresar el número de cuenta destino y el monto a transferir.
- **RF-06: Procesamiento Financiero:** Registro de la transacción con actualización atómica de los saldos (origen y destino).

### 1.4. Módulo de Dashboard (Métricas)

- **RF-07: Bloque de KPIs:** El dashboard (solo para Administradores) debe mostrar en tiempo real el volumen total de dinero transaccionado y la cantidad de transacciones fallidas/rechazadas.
- **RF-08: Gráfico Estadístico:** Representación gráfica (barras o líneas) del volumen de transacciones agrupadas por tipo de cuenta.

---

## 2. Requisitos No Funcionales y de Arquitectura (RNF)

### 2.1. Backend (Node.js + TypeScript)

- **RNF-01: Persistencia y Concurrencia (ACID):** Elección justificada de base de datos. El diseño debe prevenir de forma absoluta las "condiciones de carrera" (ej. evitar que dos retiros simultáneos dejen una cuenta en negativo) mediante bloqueos (locks) o aislamiento transaccional.

### 2.2. Frontend (Angular)

- **RNF-03: Aislamiento del Estado (Clean UI):** Todo el flujo de datos debe estar orquestado mediante un estado centralizado para no hacer inyección de servicios HTTP dentro de los componentes presentacionales.
- **RNF-04: Rendimiento y Memoria:** La carga del Dashboard y sus gráficos debe estar aislada para no penalizar el tiempo de carga del Cliente.

### 2.3. Cloud [PLUS]

- **RNF-05:** Despliegue de la solución en la nube (AWS o GCP).

---

## 3. Reglas de Negocio y Restricciones de Diseño (RN)

- **RN-01: Idempotencia Transaccional:** La API debe exigir la cabecera `X-Idempotency-Key` en la creación de transferencias. Si la misma llave se envía dos veces (ej. doble clic por latencia), la base de datos debe rechazar el duplicado sin fallar estrepitosamente, devolviendo el estado de la transacción original.
- **RN-02: Integración y Tolerancia a Fallos (Simulada):** Antes de confirmar la transferencia, el sistema debe consultar un "Servicio Anti-Fraude Externo" (una función asíncrona simulada que demore aleatoriamente entre 1 y 10 segundos). Si la respuesta demora más de 3 segundos, el sistema debe abortar la operación limpiamente.
- **RN-03: Escalabilidad Tarifaria:** Cuando un Cliente realiza una transferencia, el sistema debe calcular una comisión extra que se descontará de su saldo original. Este cobro depende estrictamente del nivel de cuenta asignado al usuario que envía el dinero:
  - **Cuenta Básica:** Se cobra una comisión del 2% sobre el monto transferido.
  - **Cuenta Premium:** Se cobra una comisión del 0% (transferencias gratuitas).
  - **Cuenta Corporativa:** Se cobra una comisión plana de $5 fijos, sin importar el monto transferido.
- **RN-04: Orquestación de la Transacción:** Para que una transferencia sea válida antes de guardarse, el sistema debe orquestar validaciones de fondos, cálculos de comisiones y estampar códigos de autorización. Restricción de Diseño: La lógica paso a paso para ensamblar esta estructura compleja no debe existir dentro de los Controladores ni acoplarse en la secuencia principal del Caso de Uso.

---

## 4. EVALUACIÓN Y CRITERIOS

Se considerarán los siguientes pilares técnicos durante la revisión:

- Buenas prácticas de desarrollo
- Implementación de los principios SOLID y DRY
- Sustentación
- Pruebas unitarias cobertura superior al 80%
- La prueba durará 15 minutos, 10 min sustentación, 5 de preguntas (optimizar el tiempo adecuadamente)
- Envío de link público de github para realizar la revisión del código
