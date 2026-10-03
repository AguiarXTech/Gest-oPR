/** Link que abre o local no app de mapas do celular (Android e iPhone abrem o Google Maps ou o navegador). */
export function linkMapa(local: { nome: string; endereco: string | null }): string {
  const busca = local.endereco ? `${local.nome}, ${local.endereco}` : local.nome;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
}
