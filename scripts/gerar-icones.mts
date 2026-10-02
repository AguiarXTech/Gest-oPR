// Gera os ícones do app instalado (PWA) a partir do logo: logo centralizado sobre o
// fundo grafite do app, com margem para a "zona segura" dos ícones adaptáveis do Android.
// Uso: npx tsx scripts/gerar-icones.mts (rodar de novo se o logo mudar)
import sharp from 'sharp';

const GRAFITE = '#1c2023';
const LOGO = 'public/logo-rportugues.png';

async function icone(lado: number, destino: string, larguraLogo = 0.72) {
  const logo = await sharp(LOGO).resize({ width: Math.round(lado * larguraLogo) }).toBuffer();
  await sharp({ create: { width: lado, height: lado, channels: 4, background: GRAFITE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(destino);
  console.log('✓', destino);
}

await icone(192, 'public/icones/icone-192.png');
await icone(512, 'public/icones/icone-512.png');
// "maskable": o Android pode recortar em círculo; o logo fica dentro dos 80% centrais
await icone(512, 'public/icones/icone-maskable-512.png', 0.62);
// iPhone: arquivo de convenção do Next (vira <link rel="apple-touch-icon">)
await icone(180, 'app/apple-icon.png');
