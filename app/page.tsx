// O proxy.ts redireciona "/" para /login, /m ou /g conforme a sessão.
// Este redirect só roda se o proxy não interceptar a rota.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
