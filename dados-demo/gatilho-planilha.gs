// Gatilho do relatório de abastecimento (Google Apps Script, dentro da planilha).
// Quando alguém adiciona ou muda uma linha, avisa a GestãoRP para reler a planilha.
//
// Como instalar (uma vez):
// 1. Na planilha: Extensões → Apps Script. Apague o que tiver e cole este arquivo.
// 2. Troque ENDERECO e SEGREDO abaixo (o segredo é o mesmo RELATORIO_SEGREDO da Vercel).
// 3. Relógio (Acionadores) → Adicionar acionador → função "avisarGestao",
//    origem "Da planilha", evento "Ao alterar". Salvar e autorizar.

const ENDERECO = 'https://SEU-APP.vercel.app/api/relatorio/atualizar';
const SEGREDO = 'troque-pelo-segredo';

function avisarGestao() {
  const resposta = UrlFetchApp.fetch(ENDERECO, {
    method: 'post',
    headers: { 'x-segredo': SEGREDO },
    muteHttpExceptions: true,
  });
  console.log('GestãoRP respondeu ' + resposta.getResponseCode() + ': ' + resposta.getContentText());
}
