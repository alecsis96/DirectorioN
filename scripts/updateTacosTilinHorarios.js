// Script para actualizar Tacos Tilin con horarios estructurados
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function updateTacosTilin() {
  try {
    const businessId = 'xR6y70Lm6O1qtb4UcA5'; // ID de Tacos Tilin
    
    const horarios = {
      lunes: { abierto: true, desde: '09:00', hasta: '18:00' },
      martes: { abierto: true, desde: '09:00', hasta: '18:00' },
      miercoles: { abierto: true, desde: '09:00', hasta: '18:00' },
      jueves: { abierto: true, desde: '09:00', hasta: '18:00' },
      viernes: { abierto: true, desde: '09:00', hasta: '18:00' },
      sabado: { abierto: true, desde: '09:00', hasta: '14:00' },
      domingo: { abierto: false, desde: '09:00', hasta: '18:00' }
    };
    
    const hours = 'Lun 09:00-18:00; Mar 09:00-18:00; Mie 09:00-18:00; Jue 09:00-18:00; Vie 09:00-18:00; Sab 09:00-14:00';
    
    await db.collection('businesses').doc(businessId).update({
      horarios,
      hours
    });
    
    console.log('✅ Tacos Tilin actualizado con horarios estructurados');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateTacosTilin();
