# 🚀 Features Pendientes - Roadmap

**Prioridad:** Post-testing  
**Versión target:** 2.1+

---

## 🎯 Features de Alta Prioridad

### 1. **Notificaciones WhatsApp Automáticas** ⚡
**Estado:** Infraestructura lista, pendiente configuración final

**Implementar:**
- [ ] Notificación cuando admin aprueba negocio
  - Mensaje: "¡Felicidades! Tu negocio {name} ha sido aprobado y publicado"
  - Include link directo al perfil público
  
- [ ] Notificación cuando admin solicita más información
  - Mensaje: "Se requiere información adicional para {name}"
  - Incluir notas del admin
  - Link al dashboard
  
- [ ] Notificación cuando admin rechaza
  - Mensaje empático con motivo
  - Link a contactar soporte
  
- [ ] Reminder si completitud <50% después de 7 días
  - "Tu negocio está al X%, complétalo para publicar"

**Archivos involucrados:**
- `app/actions/adminBusinessActions.ts` - Agregar llamadas después de cada acción
- `lib/whatsapp/notificationService.ts` - Templates de mensajes
- `app/api/notify/approval/route.ts` - Crear endpoint

**Tiempo estimado:** 2-3 horas

---

### 2. **Sistema de Métricas y Analytics** 📊
**Estado:** Infraestructura parcial, falta completar

**Implementar:**
- [ ] Dashboard de métricas en `/admin/analytics`:
  - Total eventos por período
  - Negocios más vistos (top 10)
  - CTAs más clickeados (WhatsApp, Call, Maps)
  - Tasa de conversión (vistas → clicks)
  - Búsquedas más comunes
  - Horarios pico de actividad
  
- [ ] Métricas por negocio individual:
  - Vistas totales del perfil
  - Clicks en WhatsApp/Teléfono
  - Favoritos agregados
  - Reviews recibidas
  - Gráfica de actividad (últimos 30 días)
  
- [ ] Alertas automáticas:
  - Notificar dueño si negocio tiene >100 vistas/semana
  - Sugerir upgrade a plan Featured si tiene mucha actividad

**Archivos involucrados:**
- `app/api/telemetry/track/route.ts` - Mejorar tracking
- `app/admin/analytics/page.tsx` - Completar UI
- `components/BusinessAnalytics.tsx` - Dashboard individual

**Tiempo estimado:** 6-8 horas

---

### 3. **Plan Degradation System** 💳
**Estado:** No implementado

**Implementar:**
- [ ] Verificación automática de pagos vencidos (cron job):
  - Check diario de `nextPaymentDate`
  - Si vencido >7 días → marcar `paymentStatus: 'overdue'`
  - Si vencido >30 días → downgrade automático a plan free
  
- [ ] Notificaciones escalonadas:
  - 7 días antes: "Tu pago vence pronto"
  - Día del vencimiento: "Tu pago venció hoy"
  - 7 días después: "Tu plan será degradado en 23 días"
  - 30 días después: "Tu plan fue degradado a Free"
  
- [ ] UI en dashboard:
  - Badge "Pago vencido" si overdue
  - Banner de advertencia con botón "Renovar plan"
  - Historia de pagos (receipt uploads)

**Archivos involucrados:**
- `functions/src/scheduledTasks/checkPayments.ts` - Cloud Function diaria
- `app/actions/payments.ts` - Lógica de degradación
- `components/PaymentWarningBanner.tsx` - UI de advertencia

**Tiempo estimado:** 8-10 horas

---

## 🎨 Features de Media Prioridad

### 4. **Mejoras al Wizard de Registro** 🧙
- [ ] Paso adicional: "Vista previa de tu perfil"
  - Mostrar cómo se verá el negocio antes de enviar
  - Permitir editar desde la preview
  
- [ ] Auto-save cada 30 segundos
  - Guardar en localStorage adicional a Firestore
  - Recuperar automáticamente si se cierra la pestaña
  
- [ ] Validación en tiempo real de datos:
  - Verificar formato de teléfono mientras escribe
  - Validar URL de Facebook/Instagram
  - Sugerir categorías basadas en nombre

**Tiempo estimado:** 4-5 horas

---

### 5. **Sistema de Reviews Mejorado** ⭐
- [ ] Moderación automática de spam:
  - Detectar reviews duplicadas
  - Filtrar palabras prohibidas
  - Marcar automáticamente como pendiente si sospechoso
  
- [ ] Respuestas del dueño:
  - Permitir que negocio responda a cada review
  - Notificar al reviewer cuando recibe respuesta
  
- [ ] Incentivos para reviews:
  - Badge "Top Reviewer" para usuarios activos
  - Sorteos mensuales entre quienes dejan reviews

**Tiempo estimado:** 6-8 horas

---

### 6. **Búsqueda Avanzada con Algolia** 🔍
**Estado:** Infraestructura lista, falta integración

- [ ] Migrar búsqueda de Firestore → Algolia:
  - Indexar todos los negocios publicados
  - Campos: name, description, category, tags, address
  
- [ ] Features de búsqueda:
  - Typo tolerance
  - Búsqueda por ubicación (geolocation)
  - Faceted filters (categoría, plan, rating)
  - Instant search (as-you-type)
  
- [ ] UI:
  - Sugerencias de búsqueda
  - Destacar matches en resultados
  - Guardar búsquedas recientes

**Archivos involucrados:**
- `app/negocios-algolia/page.tsx` - Ya existe estructura base
- `lib/algolia.ts` - Configuración de índices
- `components/AlgoliaSearch.tsx` - UI de búsqueda

**Tiempo estimado:** 5-6 horas

---

## 🔧 Features de Baja Prioridad

### 7. **PWA Completo** 📱
- [ ] Manifest.json optimizado
- [ ] Service Worker con estrategias de cache
- [ ] Modo offline funcional
- [ ] Push notifications nativas
- [ ] Instalación en home screen

**Tiempo estimado:** 4-5 horas

---

### 8. **Sistema de Referidos** 🎁
- [ ] Código de referido único por negocio
- [ ] Descuento si traes X negocios nuevos
- [ ] Dashboard de referidos (cuántos has traído)
- [ ] Comisiones o créditos gratis

**Tiempo estimado:** 6-8 horas

---

### 9. **Multi-idioma (i18n)** 🌎
- [ ] Soporte para Inglés + Español
- [ ] Detección automática de idioma del navegador
- [ ] Selector manual en header
- [ ] Traducción de todas las strings

**Tiempo estimado:** 8-10 horas

---

### 10. **Integración con Google My Business** 🗺️
- [ ] Importar datos desde GMB automáticamente
- [ ] Sincronizar horarios, fotos, reviews
- [ ] Link bidireccional entre plataformas
- [ ] Actualizar GMB cuando se edita en YajaGon

**Tiempo estimado:** 10-12 horas

---

## 📊 Estimaciones Totales

| Prioridad | Features | Tiempo Total |
|-----------|----------|--------------|
| Alta | 3 features | 16-21 horas |
| Media | 3 features | 15-19 horas |
| Baja | 4 features | 28-35 horas |
| **Total** | **10 features** | **59-75 horas** |

---

## 🎯 Sprint Recomendado (Post-Testing)

**Sprint 1 (1 semana):**
- ✅ Testing completo del sistema actual
- 🚀 Feature #1: WhatsApp automático (2-3h)
- 🚀 Feature #2: Analytics básico (6-8h)

**Sprint 2 (1 semana):**
- 🚀 Feature #3: Plan degradation (8-10h)
- 🚀 Feature #4: Wizard mejorado (4-5h)

**Sprint 3 (1 semana):**
- 🚀 Feature #5: Reviews mejorado (6-8h)
- 🚀 Feature #6: Algolia integration (5-6h)

**Sprints futuros:**
- Features de baja prioridad según demanda

---

## 🔮 Visión a Largo Plazo

### Monetización
- Planes premium con features exclusivos
- Comisión por leads/conversiones
- Publicidad geolocalizada
- Marketplace de servicios

### Escala
- Expandir a más ciudades/regiones
- Sistema multi-tenant (White label)
- API pública para integraciones
- Mobile app nativa (React Native)

---

**Última actualización:** 10 de Febrero, 2026  
**Próxima revisión:** Post-testing exitoso
