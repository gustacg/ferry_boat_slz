-- path: c:\Users\gusta\ferry-boat-app\supabase\migrations\005_operator.sql
-- Após criar o usuário em Auth com email embarcador@ferry.com.br,
-- vincule perfil e papel de operador

insert into perfis (id, nome_completo, cpf, telefone)
select u.id, 'Embarcador', '00000000000', null
from auth.users u
where u.email = 'embarcador@ferry.com.br'
on conflict (id) do nothing;

insert into papeis_usuario (usuario_id, papel)
select u.id, 'operador'
from auth.users u
where u.email = 'embarcador@ferry.com.br'
on conflict do nothing;