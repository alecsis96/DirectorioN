# 0.2R.4 — Claim simplificado

Implementación local; no requiere migración de owners ni cambia el plazo de siete días del claim.

## Recorridos

- Nuevo usuario: correo → Confirmar y entrar → begin → prepare → custom token → complete → dashboard.
- Usuario existente con sesión válida: mismo recorrido, reutilizando su ID token; no se emite custom token.
- Usuario existente sin sesión: confirmación → /entrar → contraseña o enlace normal Firebase → complete automático → dashboard.
- Google se ofrece como vinculación opcional dentro del dashboard. /entrar?flow=login permite volver por correo sin claim, incluso si el owner omitió Google y no tiene contraseña.

## Fronteras de confianza

`begin` exige POST same-origin, JSON estricto, cabecera de la aplicación y `confirmed: true`. Guarda un intento de diez minutos y envía una continuación aleatoria en cookie `__Host-ownershipClaimAttempt`, HttpOnly, Secure, SameSite=Lax y Path=/.

Firestore conserva el hash de la continuación y el hash del claim, no los secretos. El fragmento del correo se captura una vez en memoria y se elimina de la navegación. No se usa Web Storage para conservar el claim.

La página inicial no crea usuarios ni consume invitaciones. Tras una confirmación previa, la cookie permite reanudar mediante POST desde una recarga u otra pestaña del mismo navegador. No se puede recuperar la continuación en otro navegador que no tenga esa cookie: allí debe abrirse la invitación original.

`ownershipClaimIdentities` reserva un UID aleatorio estable por correo canónico. Sólo la respuesta exitosa de `createUser` permite registrar `createdByAttemptId`, UID y fecha de creación. Un lookup, una colisión o un timeout no prueba creación: requieren login normal. La emisión de custom token exige esa procedencia del mismo intento, ausencia de proveedores y de actividad de autenticación posterior a la creación: `lastSignInTime` debe conservar su valor inicial y no debe existir `lastRefreshTime`. Se vuelve a comprobar la identidad antes de emitirlo.

Una reserva `reserved` sin llamada a Auth puede transferirse a otro intento cuando venza el anterior, manteniendo su UID. Una reserva `creating` con resultado desconocido no autoriza repetir creación ni emitir tokens: si aparece el usuario, se exige login; si sigue ausente, falla cerrado para revisión operativa. Nunca se borra una cuenta como compensación.

Se rechazan cuentas deshabilitadas, no verificadas, MFA, tenants, discrepancias de correos de proveedores, cualquier custom claim y correos con override administrativo. La configuración Auth se consulta sólo en lectura: duplicidad de email, multitenancy, MFA obligatorio o imposibilidad de consultar la política bloquean el recorrido. No se cambian roles, proveedores, contraseñas ni configuración Auth.

`complete` exige ID token verificado con revocación, UID objetivo, email verificado y cuenta actual con la misma fecha de creación. La transacción común vuelve a leer el intento, claim, guard, solicitud y negocio. Sólo ella asigna ownerId y consume claim/guard/intento junto con la auditoría. La presencia de ownerId u ownerUid, incluso vacíos, bloquea una asignación nueva.

Un reintento posterior al commit devuelve éxito únicamente para el mismo owner y consumo. Un claim consumido nunca permite emitir una nueva autenticación. El endpoint antiguo de redeem conserva el consumo autenticado, con las mismas restricciones de identidad, para clientes anteriores.

Auth y Firestore no son atómicos entre sí. Una sesión puede existir aunque el claim se revoque antes de complete; no obtiene ownership. La revocación de un claim no revoca sesiones Firebase. Las sesiones existentes del mismo UID mantienen los permisos de esa identidad.

## Login posterior independiente

`POST /api/login/email` envía un enlace Firebase normal sólo a cuentas existentes elegibles. Nunca crea usuarios, emite custom tokens ni lee/escribe ownership. Sus respuestas de envío no revelan existencia, bloqueo o entrega. Conserva el correo en un contexto servidor de diez minutos asociado a otra cookie HttpOnly, para no pedirlo otra vez al volver en otra pestaña. Tiene cooldown por correo. Contextos y límites son inaccesibles desde Firestore cliente.

## Compatibilidad y operación

El R4 anterior eliminaba `#token` de la URL y dependía de `sessionStorage` para recuperarlo. El enlace Firebase regresaba a `/reclamar-negocio`, sin ese fragmento; otra pestaña u otro origen no compartía el almacenamiento. Además, el cliente retiraba el valor guardado al montar. Por eso Firebase podía autenticar correctamente y, después, el cliente abortaba antes de llamar a redeem con «La autenticación terminó, pero falta la invitación». El test antiguo ocultaba el defecto añadiendo artificialmente `#token` al retorno Firebase. Ahora la continuidad depende del intento servidor y su cookie, después de la confirmación.

- Permanecen ownerId y UID de owners v1. No hay transferencias por email.
- Los enlaces de invitación existentes con fragmento funcionan en el recorrido nuevo.
- Un retorno antiguo de Firebase sin intento no contiene el claim: se indica abrir la invitación original. No se inventa un fragmento de retorno.
- La página/consumo ya no dependen del flag de Email Link; ese flag sólo habilita el método de acceso por enlace.
- Las nuevas colecciones tienen reglas deny-all. No se despliega ninguna regla automáticamente.
- No hay limpieza automática/TTL configurado. La expiración se comprueba en servidor; la retención operativa de intentos/contextos podrá configurarse por separado.
- Antes de habilitar en un entorno, la cuenta de servicio necesita lectura de configuración Auth y capacidad de firmar custom tokens. Si faltan, se falla cerrado.
- El service worker omite login, reclamación y dashboard; así no almacena respuestas de autenticación ni sustituye un dashboard lento por el fallback offline. PWAUpdater tampoco recarga automáticamente estas rutas cuando cambia el controller: hacerlo podía perder el fragmento en memoria o interrumpir begin antes de recibir la cookie.

## Verificación reproducible

Requisitos: Node/npm, Firebase CLI, Java 21 y Chromium de Playwright (`npx playwright install chromium`).

```powershell
npx tsc --noEmit --incremental false
npx vitest run test/ownership-claim-attempts.test.ts test/ownership-claim-http.test.ts test/ownership-claim-client.test.tsx test/ownership-claim-redeem.test.ts test/ownership-claim-redeem-route.test.ts test/claim-identity-policy.test.ts
npm run test:claim-e2e
```

El E2E arranca Auth y Firestore locales usando exclusivamente `demo-claim-e2e`. El servidor de pruebas vacía credenciales de producción, apunta los SDK a los emuladores y no entrega correos SMTP. Los enlaces OOB son los producidos por Firebase Auth Emulator y se abren realmente en Chromium; no se añade `#token` al retorno. Se comprueban nueva pestaña, recarga, storage vacío, sesión existente, concurrencia y acceso posterior sin Google.

Los emuladores no sustituyen una validación futura de entrega SMTP o IAM en staging. Ninguna prueba de este cambio contacta los datos de producción.
