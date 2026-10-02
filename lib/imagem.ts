// Compressão de imagem no navegador (AGENTS.md §4.8): maior lado ≤ 1600 px, ~300 KB.
import { dimensionar, TAMANHO_ALVO_BYTES } from '@/lib/domain/comprovante';

/** Redimensiona e reduz a qualidade até ficar perto de 300 KB. */
export async function comprimir(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url; // o navegador já aplica a rotação EXIF ao desenhar
    await imagem.decode();

    let { largura, altura } = dimensionar(imagem.naturalWidth, imagem.naturalHeight);
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      canvas.getContext('2d')!.drawImage(imagem, 0, 0, largura, altura);
      const qualidade = [0.7, 0.6, 0.5][Math.min(tentativa, 2)];
      const blob = await new Promise<Blob>((ok, falha) =>
        canvas.toBlob((b) => (b ? ok(b) : falha(new Error('toBlob'))), 'image/jpeg', qualidade),
      );
      if (blob.size <= TAMANHO_ALVO_BYTES || tentativa === 5) return blob;
      if (tentativa >= 2) ({ largura, altura } = { largura: Math.round(largura * 0.8), altura: Math.round(altura * 0.8) });
    }
    throw new Error('inalcançável');
  } finally {
    URL.revokeObjectURL(url);
  }
}
