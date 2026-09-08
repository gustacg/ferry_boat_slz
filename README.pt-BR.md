# Ferry Boat SLZ

**MVP mobile de balsa: reserva de passagem e de veículo, fila digital com posição e embarque conferido por QR Code.**

[In English](README.md) · [Os nove módulos em vídeo](https://www.gustacg.com/projetos/ferry-boat-slz)

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)
![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81-20232A?logo=react&logoColor=61DAFB)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)

<p align="center">
  <img src=".github/readme/ferry-telas.png" alt="Tela de compra, fila ao vivo e scanner de embarque" width="900">
</p>

## O problema

A capacidade de uma balsa não é uma contagem só. Pedestre ocupa assento, veículo ocupa área, e a conferência do embarque precisa de um bilhete que não dê para duplicar. Este MVP põe a passagem, a fila e a conferência do embarque no celular.

## O que ele faz

**Passageiro**

- Vê as saídas dos próximos cinco dias, com vagas e aviso de poucas vagas.
- Compra passageiros e veículos numa compra só: o app valida nome, CPF, placa e modelo, deixa dizer qual passageiro dirige cada veículo, e confere vagas e área livre antes de fechar.
- Recebe um QR Code por passagem, ou uma tela com o grupo inteiro.
- Entra na fila digital da viagem e vê a posição, quantos estão na frente e o tempo estimado. A tela atualiza a cada 25 segundos.
- Cancela uma passagem, ou a compra inteira, até uma janela mínima antes da partida. A vaga volta sozinha.
- Perfil com histórico de viagens e total gasto, notificações, ajuda com contatos de suporte.

**Operador embarcador**

- Viagens de hoje, cada uma com o tamanho da fila.
- Controle de embarque: iniciar embarque, marcar partida, cancelar viagem com motivo.
- Scanner: a câmera lê o QR, o banco valida (código desconhecido, passagem cancelada, passagem já usada) e o app confere se o bilhete é daquela viagem antes de marcar o embarque.

## Decisões de desenho

- **Capacidade em três eixos.** Pedestres, veículos e área do convés em metros quadrados. A tela de compra bloqueia quando qualquer um dos três acaba.
- **Tarifa em tabela.** Categoria, preço e área vêm do banco a cada abertura de tela, então mudar de preço não pede versão nova do app. A prioridade na fila é por categoria: idoso e PCD primeiro, depois criança, estudante e adulto. O seed traz duas categorias, adulto e estudante; as outras entram como linhas.
- **O banco é dono das invariantes.** Numeração do bilhete, hash do QR e recontagem de vagas são gatilhos. Cancelar uma passagem devolve a vaga sem o app fazer conta.
- **Papéis.** `usuario`, `operador` e `admin`. Operador e admin caem no painel de embarque; ainda não existe tela própria de admin.

## Stack

React Native 0.81 · Expo SDK 54 com expo-router · TypeScript · Zustand · React Native Paper · expo-camera · PostgreSQL 17 (auth, RPCs e gatilhos via Supabase)

## Rodando do zero

Requisitos: Node 18+, a [CLI do Supabase](https://supabase.com/docs/guides/local-development), Docker (para o banco local) e o Expo Go no celular.

```bash
git clone https://github.com/gustacg/ferry_boat_slz.git
cd ferry_boat_slz
npm install
cp .env.example .env
```

Preencha as duas variáveis do `.env` com os valores que o próximo passo imprime:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Suba o banco local e aplique as migrations. A `003` é o seed: rotas, três embarcações, três horários, viagens dos próximos 30 dias e as tarifas.

```bash
supabase start
supabase db reset
```

Crie o operador: adicione um usuário no painel de Auth local (o Studio roda na porta 54423), coloque o e-mail dele em `supabase/migrations/005_operator.sql` e rode o arquivo. Ele liga o perfil e o papel `operador` pelo e-mail, então o usuário precisa existir antes.

Rode o app:

```bash
npx expo start
```

Leia o QR com o Expo Go. Celular e computador na mesma rede. O scanner de embarque precisa de câmera de verdade.

Para apontar para um projeto hospedado, `supabase link` e depois `supabase db push`, e coloque a URL e a chave anon desse projeto no `.env`.

## Estrutura

```
app/          telas: (tabs)/ do passageiro, operator/ do embarque, login e cadastro
components/   Button, TicketCard, TripCard, QueueIndicator, LoadingSpinner
services/     cliente supabase, boardingService, queueService
stores/       auth, trips, tickets, queue, notifications (Zustand)
supabase/     config.toml e migrations 000 a 007
types/        tipos compartilhados
utils/        datas (fuso de São Paulo) e validadores (CPF, placa)
```

Cerca de 10.000 linhas de TypeScript e 550 de SQL.

## Situação

MVP. Apresentado a representantes de inovação do Porto do Itaqui. Não está em operação comercial.

## Licença

MIT, ver [LICENSE](LICENSE).

## Autor

Gustavo Calixto · [gustacg.com](https://www.gustacg.com) · [LinkedIn](https://www.linkedin.com/in/gustacg/)
