# Desplegar Índices de Firestore

Para que funcione la consulta de comprobantes pendientes, necesitas desplegar los índices:

```bash
firebase deploy --only firestore:indexes
```

Este comando desplegará el índice para `paymentReceipts` (status + createdAt) que ya está configurado en `firestore.indexes.json`.

## Verificar que Firestore Rules estén actualizadas

También puedes actualizar las reglas de seguridad si es necesario:

```bash
firebase deploy --only firestore:rules
```

## Desplegar todo junto

O desplegar índices y reglas al mismo tiempo:

```bash
firebase deploy --only firestore
```

---

**Nota:** Ya tienes el índice configurado en `firestore.indexes.json`, solo necesitas ejecutar el comando de deploy.
