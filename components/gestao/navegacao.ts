import {
  Building2,
  Container,
  Calculator,
  CircleDot,
  FileText,
  Fuel,
  HandCoins,
  LayoutDashboard,
  Route,
  Settings,
  Siren,
  Ticket,
  Store,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** false = tela ainda não construída: aparece como "em breve", sem link. */
  pronto: boolean;
};

export type GrupoMenu = { titulo?: string; itens: ItemMenu[] };

// Ao entregar uma tela, troque `pronto` para true.
export const menuGestao: GrupoMenu[] = [
  { itens: [{ href: '/g', rotulo: 'Painel', icone: LayoutDashboard, pronto: true }] },
  {
    titulo: 'Operação',
    itens: [
      { href: '/g/viagens', rotulo: 'Viagens', icone: Route, pronto: true },
      { href: '/g/abastecimentos', rotulo: 'Abastecimentos', icone: Fuel, pronto: true },
      { href: '/g/adiantamentos', rotulo: 'Adiantamentos', icone: HandCoins, pronto: true },
      { href: '/g/acertos', rotulo: 'Acertos', icone: Calculator, pronto: true },
      { href: '/g/manutencao', rotulo: 'Manutenção', icone: Wrench, pronto: true },
      { href: '/g/pneus', rotulo: 'Pneus', icone: CircleDot, pronto: true },
      { href: '/g/multas', rotulo: 'Multas', icone: Siren, pronto: true },
      { href: '/g/pedagio', rotulo: 'Pedágio', icone: Ticket, pronto: true },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { href: '/g/caminhoes', rotulo: 'Caminhões', icone: Truck, pronto: true },
      { href: '/g/carretas', rotulo: 'Carretas', icone: Container, pronto: true },
      { href: '/g/funcionarios', rotulo: 'Funcionários', icone: Users, pronto: true },
      { href: '/g/clientes', rotulo: 'Clientes', icone: Building2, pronto: true },
      { href: '/g/fornecedores', rotulo: 'Fornecedores', icone: Store, pronto: true },
      { href: '/g/documentos', rotulo: 'Documentos', icone: FileText, pronto: true },
    ],
  },
  { itens: [{ href: '/g/configuracoes', rotulo: 'Configurações', icone: Settings, pronto: true }] },
];
