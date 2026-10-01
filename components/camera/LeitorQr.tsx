'use client';

// Leitura do QR do cupom (docs/02-ARQUITETURA.md §4): ZXing, sem depender da
// BarcodeDetector API (não existe no iOS Safari). Dois caminhos:
// - câmera ao vivo (exige HTTPS no celular);
// - foto do cupom (plano B; funciona até sem HTTPS).
import type { IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, ImageUp, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export type MetodoLeitura = 'camera' | 'foto';
export type Leitura = { texto: string; metodo: MetodoLeitura; ms: number };

const DICAS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
]);

async function criarLeitor() {
  // import dinâmico: a ZXing só é baixada quando o leitor é usado
  const { BrowserQRCodeReader } = await import('@zxing/browser');
  return new BrowserQRCodeReader(DICAS);
}

/** Desenha a imagem num canvas com o maior lado limitado (fotos de 12 MP travam a leitura). */
function paraCanvas(imagem: HTMLImageElement, maiorLado: number): HTMLCanvasElement {
  const escala = Math.min(1, maiorLado / Math.max(imagem.naturalWidth, imagem.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imagem.naturalWidth * escala);
  canvas.height = Math.round(imagem.naturalHeight * escala);
  canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function LeitorQr({ onLeitura }: { onLeitura: (leitura: Leitura) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controles = useRef<IScannerControls | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => () => controles.current?.stop(), []);

  async function abrirCamera() {
    setErro(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErro('A câmera ao vivo só funciona em site seguro (https). Use "Ler de uma foto".');
      return;
    }
    try {
      const leitor = await criarLeitor();
      const inicio = performance.now();
      setLendo(true);
      controles.current = await leitor.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false },
        video.current!,
        (resultado, _erro, ctrl) => {
          if (!resultado) return; // ainda procurando o QR no quadro
          ctrl.stop();
          setLendo(false);
          onLeitura({ texto: resultado.getText(), metodo: 'camera', ms: Math.round(performance.now() - inicio) });
        },
      );
    } catch (e) {
      setLendo(false);
      const nome = (e as Error).name;
      setErro(
        nome === 'NotAllowedError'
          ? 'Permissão da câmera negada. Libere a câmera para este site nas configurações do navegador.'
          : 'Não foi possível abrir a câmera. Use "Ler de uma foto".',
      );
    }
  }

  function pararCamera() {
    controles.current?.stop();
    setLendo(false);
  }

  async function lerFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    const inicio = performance.now();
    const url = URL.createObjectURL(arquivo);
    try {
      const imagem = new Image();
      imagem.src = url;
      await imagem.decode();
      const leitor = await criarLeitor();
      // tenta em dois tamanhos: QR pequeno no cupom às vezes só sai na resolução maior
      for (const maiorLado of [1600, 2400]) {
        try {
          const resultado = leitor.decodeFromCanvas(paraCanvas(imagem, maiorLado));
          onLeitura({ texto: resultado.getText(), metodo: 'foto', ms: Math.round(performance.now() - inicio) });
          return;
        } catch {
          // não achou neste tamanho; tenta o próximo
        }
      }
      setErro('Não encontrei o QR na foto. Tire outra mais perto, com o QR inteiro e sem reflexo.');
    } catch {
      setErro('Não foi possível abrir a foto.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <video
        ref={video}
        muted
        playsInline
        className={lendo ? 'aspect-square w-full rounded-xl bg-black object-cover' : 'hidden'}
      />
      {lendo ? (
        <Button type="button" variant="outline" onClick={pararCamera} className="h-12 text-base">
          <Square className="size-5" aria-hidden /> Parar câmera
        </Button>
      ) : (
        <Button type="button" onClick={abrirCamera} className="h-14 text-lg">
          <Camera className="size-6" aria-hidden /> Ler QR com a câmera
        </Button>
      )}
      <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium hover:bg-muted">
        <ImageUp className="size-5" aria-hidden />
        Ler de uma foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            void lerFoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {erro && (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
