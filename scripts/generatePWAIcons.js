// Script para generar iconos PWA desde el logo
// Uso: node scripts/generatePWAIcons.js

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  console.log('🎨 Generador de Iconos PWA\n');

  // Verificar si existe el logo
  const logoPath = path.join(__dirname, '../public/images/logo.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('❌ No se encontró el logo en /public/images/logo.png');
    console.log('\n📝 Pasos manuales:');
    console.log('1. Coloca tu logo en /public/images/logo.png');
    console.log('2. Vuelve a ejecutar este script');
    return;
  }

  // Intentar usar sharp si está instalado
  let sharp;
  try {
    sharp = require('sharp');
    console.log('✅ Sharp instalado, generando iconos...\n');
    
    const sizes = [192, 512];
    
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../public/images/icon-${size}.png`);
      
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: icon-${size}.png`);
    }
    
    console.log('\n🎉 ¡Iconos generados exitosamente!');
    console.log('\n📋 Archivos creados:');
    console.log('  - /public/images/icon-192.png (192x192)');
    console.log('  - /public/images/icon-512.png (512x512)');
    console.log('\n✅ Los iconos están listos para la PWA');
    
  } catch (error) {
    console.log('⚠️  Sharp no está instalado (opcional)\n');
    console.log('Puedes generar los iconos manualmente:\n');
    console.log('📝 OPCIÓN 1: Instalar Sharp y volver a ejecutar');
    console.log('  npm install sharp --save-dev');
    console.log('  node scripts/generatePWAIcons.js\n');
    console.log('📝 OPCIÓN 2: Herramientas online');
    console.log('  🌐 https://realfavicongenerator.net/');
    console.log('  🌐 https://favicon.io/favicon-converter/');
    console.log('  🌐 https://www.pwabuilder.com/imageGenerator\n');
    console.log('📝 OPCIÓN 3: Photoshop/Figma/Canva');
    console.log('  1. Abre /public/images/logo.png');
    console.log('  2. Redimensiona a 192x192 → Exportar como icon-192.png');
    console.log('  3. Redimensiona a 512x512 → Exportar como icon-512.png');
    console.log('  4. Guarda en /public/images/\n');
    console.log('🎯 Requisitos de los iconos:');
    console.log('  - Formato: PNG');
    console.log('  - Tamaños: 192x192 y 512x512 píxeles');
    console.log('  - Fondo: Transparente o blanco');
    console.log('  - Nombres: icon-192.png y icon-512.png');
    console.log('  - Ubicación: /public/images/');
  }
}

generateIcons().catch(console.error);
