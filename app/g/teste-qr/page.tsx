// S2-2 (spike): testar a leitura do QR da NFC-e em iPhone e Android com cupons reais.
// Página temporária, só para dono/admin; sai quando a tela Abastecer (S2-5) estiver pronta.
import type { Metadata } from 'next';
import { TesteQr } from './TesteQr';

export const metadata: Metadata = { title: 'Teste do QR · Gestão Frota' };

export default function PaginaTesteQr() {
  return (
    <>
      <div className="max-w-md">
        <h1 className="text-3xl">Teste de leitura do QR</h1>
        <p className="text-muted-foreground">
          Aponte para o QR de um cupom de abastecimento. Teste a câmera e a foto, com cupons de postos diferentes. Nada é
          salvo.
        </p>
      </div>
      <TesteQr />
    </>
  );
}
