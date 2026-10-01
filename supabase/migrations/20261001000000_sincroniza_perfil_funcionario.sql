-- S1-4/S1-5: o perfil de acesso (profiles) acompanha o cadastro do funcionário.
-- - nome: o "Olá, nome" do app usa profiles.nome, que só a service_role altera.
-- - ativo: desativar o funcionário desativa o perfil; papel_atual() passa a
--   retornar null e a RLS bloqueia todas as leituras (docs/05, checklist).
-- O bloqueio de login (ban no Auth) é feito pela server action, pois exige a API de Auth.

create or replace function public.sincronizar_perfil_funcionario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set nome = new.nome,
         ativo = new.ativo
   where funcionario_id = new.id
     and (nome is distinct from new.nome or ativo is distinct from new.ativo);
  return new;
end $$;

create trigger trg_funcionarios_sincroniza_perfil
after update of nome, ativo on public.funcionarios
for each row execute function public.sincronizar_perfil_funcionario();
