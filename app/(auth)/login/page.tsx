import { Smartphone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import estrada from '@/public/fundo-estrada.jpg';
import fundo from '@/public/fundo-login.jpg';
import { FormLogin } from './FormLogin';
import { Marca } from '@/components/base/Marca';

export const metadata: Metadata = { title: 'Entrar · Gestão RPortugues' };

// Mesmo desenho em qualquer tela: foto dos caminhões no topo, formulário embaixo.
// No celular ocupa a tela toda; no PC vira um cartão centralizado no grafite
// (a foto tem 572 px de largura e não pode ser esticada sem perder nitidez),
// sobre a foto da estrada à noite, esmaecida. No celular o cartão cobre a tela e a estrada não aparece.
export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col bg-grafite text-white md:items-center md:justify-center md:p-8">
      <div className="absolute inset-0 hidden md:block">
        <Image src={estrada} alt="" fill placeholder="blur" sizes="100vw" className="object-cover opacity-40" />
      </div>

      <div className="relative flex w-full flex-1 flex-col bg-grafite md:max-w-md md:flex-none md:overflow-hidden md:rounded-3xl md:border md:border-white/10 md:shadow-2xl">
        <div className="relative aspect-square w-full shrink-0 md:aspect-[4/3]">
          <Image
            src={fundo}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover object-[center_20%] md:object-[center_30%]"
          />
          {/* Funde a foto no grafite do formulário. */}
          <div className="absolute inset-0 bg-linear-to-b from-transparent from-60% to-grafite" />
          {/* No canto da foto para ser visto sem rolar a tela (passo a passo em /instalar). */}
          <Link
            href="/instalar"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-black/55 px-4 text-sm font-semibold text-white backdrop-blur-sm hover:bg-black/70"
          >
            <Smartphone className="size-5" aria-hidden />
            Instalar no celular
          </Link>
        </div>

        <div className="relative mx-auto -mt-6 flex w-full max-w-sm flex-col gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-none md:px-8 md:pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl">
              <Marca comGestao />
            </h1>
            <p className="text-lg text-white/75">Entre com seu CPF ou e-mail e a senha que o escritório passou.</p>
          </div>
          <FormLogin />
          <p className="text-center text-white/75">Esqueceu a senha? Fale com o escritório.</p>
        </div>
      </div>
    </main>
  );
}
