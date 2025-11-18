# 📋 Documentação Completa do Sistema Ferry Boat App

## 📑 Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura e Tecnologias](#2-arquitetura-e-tecnologias)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [Regras de Negócio](#4-regras-de-negócio)
5. [Funções e Triggers do Banco](#5-funções-e-triggers-do-banco)
6. [Views do Sistema](#6-views-do-sistema)
7. [Lógica de Negócio no Código](#7-lógica-de-negócio-no-código)
8. [Fluxos Principais](#8-fluxos-principais)
9. [Sistema de Fila Digital](#9-sistema-de-fila-digital)
10. [Sistema de Embarque](#10-sistema-de-embarque)
11. [Sistema de Tarifas](#11-sistema-de-tarifas)
12. [Segurança e Permissões](#12-segurança-e-permissões)

---

## 1. Visão Geral do Sistema

### 1.1 O que é o Sistema?

O **Ferry Boat App** é um sistema completo de gestão de passagens e embarque para balsas/ferry boats. O sistema permite que passageiros comprem passagens online, acompanhem sua posição na fila de embarque em tempo real, e que operadores controlem o processo de embarque através de leitura de QR codes.

### 1.2 Principais Funcionalidades

- **Compra de Passagens**: Passageiros podem comprar passagens para pedestres e veículos
- **Fila Digital**: Sistema de fila inteligente com prioridades (PCD, idosos, crianças)
- **Controle de Embarque**: Operadores escaneiam QR codes para validar embarques
- **Gestão de Viagens**: Controle completo de viagens, horários e embarcações
- **Sistema de Tarifas**: Tarifas diferenciadas por categoria de passageiro e tipo de veículo
- **Notificações**: Sistema de notificações para usuários sobre viagens

---

## 2. Arquitetura e Tecnologias

### 2.1 Stack Tecnológico

**Frontend (Mobile App):**
- **React Native** com **Expo** - Framework para desenvolvimento mobile
- **TypeScript** - Linguagem tipada para maior segurança
- **Expo Router** - Sistema de navegação baseado em arquivos
- **Zustand** - Gerenciamento de estado global
- **React Native Paper** - Biblioteca de componentes UI
- **Expo Camera** - Leitura de QR codes

**Backend:**
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL como banco de dados
  - Autenticação integrada
  - Row Level Security (RLS) para segurança
  - Real-time subscriptions

### 2.2 Estrutura do Projeto

```
ferry-boat-app/
├── app/                    # Telas do aplicativo (Expo Router)
│   ├── (tabs)/            # Telas principais com navegação por tabs
│   │   ├── index.tsx      # Tela inicial
│   │   ├── schedule.tsx   # Horários de viagens
│   │   ├── tickets.tsx    # Minhas passagens
│   │   ├── queue.tsx      # Fila digital
│   │   └── ...
│   └── operator/          # Área do operador
│       ├── boarding.tsx   # Controle de embarque
│       └── scanner.tsx    # Scanner de QR codes
├── components/            # Componentes reutilizáveis
├── services/             # Serviços de integração
│   ├── supabase.ts      # Cliente Supabase
│   ├── queueService.ts  # Serviços de fila
│   └── boardingService.ts # Serviços de embarque
├── stores/               # Estado global (Zustand)
│   ├── authStore.ts     # Autenticação
│   ├── ticketsStore.ts  # Passagens
│   ├── tripsStore.ts    # Viagens
│   └── queueStore.ts    # Fila
├── types/               # Definições TypeScript
└── utils/               # Funções utilitárias
```

---

## 3. Estrutura do Banco de Dados

### 3.1 Tabelas Principais

#### 3.1.1 `perfis` (Perfis de Usuário)
Armazena informações dos usuários do sistema.

**Campos:**
- `id` (UUID, PK) - ID do usuário (relacionado com auth.users)
- `nome_completo` (TEXT) - Nome completo do usuário
- `cpf` (TEXT, UNIQUE) - CPF do usuário
- `telefone` (TEXT, NULLABLE) - Telefone de contato
- `avatar_url` (TEXT, NULLABLE) - URL do avatar
- `total_viagens` (INTEGER, DEFAULT 0) - Contador de viagens realizadas
- `total_gasto` (NUMERIC, DEFAULT 0.00) - Total gasto em passagens
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Um perfil pode ter múltiplas passagens (`passagens.usuario_id`)
- Um perfil pode ter múltiplas entradas na fila (`fila_digital.usuario_id`)
- Um perfil pode receber múltiplas notificações (`notificacoes.usuario_id`)

#### 3.1.2 `rotas` (Rotas de Viagem)
Define as rotas disponíveis no sistema.

**Campos:**
- `id` (UUID, PK) - ID da rota
- `origem` (TEXT) - Cidade/porto de origem
- `destino` (TEXT) - Cidade/porto de destino
- `distancia_km` (NUMERIC, NULLABLE) - Distância em quilômetros
- `duracao_base_minutos` (INTEGER) - Duração estimada da viagem
- `ativa` (BOOLEAN, DEFAULT true) - Se a rota está ativa
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma rota pode ter múltiplos horários (`horarios.rota_id`)
- Uma rota pode ter múltiplas viagens (`viagens.rota_id`)

#### 3.1.3 `embarcacoes` (Embarcações)
Cadastro das embarcações disponíveis.

**Campos:**
- `id` (UUID, PK) - ID da embarcação
- `nome` (TEXT, UNIQUE) - Nome da embarcação
- `operadora` (ENUM) - Operadora responsável:
  - `internacional_maritima`
  - `henvil`
  - `servi_porto`
- `capacidade_max_pedestres` (INTEGER, CHECK > 0) - Capacidade máxima de pedestres
- `capacidade_max_veiculos` (INTEGER, CHECK >= 0) - Capacidade máxima de veículos
- `ativa` (BOOLEAN, DEFAULT true) - Se a embarcação está ativa
- `ultima_manutencao` (DATE, NULLABLE) - Data da última manutenção
- `proxima_manutencao` (DATE, NULLABLE) - Data da próxima manutenção
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma embarcação pode ter múltiplos horários (`horarios.embarcacao_id`)
- Uma embarcação pode realizar múltiplas viagens (`viagens.embarcacao_id`)

#### 3.1.4 `horarios` (Horários de Viagem)
Define os horários disponíveis para cada rota e embarcação.

**Campos:**
- `id` (UUID, PK) - ID do horário
- `rota_id` (UUID, FK → rotas.id) - Rota associada
- `embarcacao_id` (UUID, FK → embarcacoes.id) - Embarcação associada
- `horario_saida` (TIME) - Horário de saída
- `dias_semana` (INTEGER[]) - Array com dias da semana (0=Domingo, 6=Sábado)
- `preco_pedestre` (NUMERIC, CHECK >= 0) - Preço para pedestre
- `preco_veiculo` (NUMERIC, CHECK >= 0) - Preço para veículo
- `ativo` (BOOLEAN, DEFAULT true) - Se o horário está ativo
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Um horário pode gerar múltiplas viagens (`viagens.horario_id`)

#### 3.1.5 `viagens` (Viagens Agendadas)
Representa uma viagem específica em uma data e horário.

**Campos:**
- `id` (UUID, PK) - ID da viagem
- `horario_id` (UUID, FK → horarios.id) - Horário base
- `rota_id` (UUID, FK → rotas.id) - Rota da viagem
- `embarcacao_id` (UUID, FK → embarcacoes.id) - Embarcação utilizada
- `data_viagem` (DATE) - Data da viagem
- `horario_saida` (TIME) - Horário de saída
- `horario_chegada_estimado` (TIME, NULLABLE) - Horário estimado de chegada
- `horario_saida_real` (TIMESTAMP, NULLABLE) - Horário real de saída
- `horario_chegada_real` (TIMESTAMP, NULLABLE) - Horário real de chegada
- `status` (ENUM) - Status da viagem:
  - `agendada` - Viagem programada
  - `embarcando` - Em processo de embarque
  - `partiu` - Viagem iniciada
  - `chegou` - Viagem finalizada
  - `cancelada` - Viagem cancelada
  - `atrasada` - Viagem atrasada
- `pedestres_atuais` (INTEGER, DEFAULT 0, CHECK >= 0) - Pedestres embarcados
- `veiculos_atuais` (INTEGER, DEFAULT 0, CHECK >= 0) - Veículos embarcados
- `capacidade_max_pedestres` (INTEGER) - Capacidade máxima de pedestres
- `capacidade_max_veiculos` (INTEGER) - Capacidade máxima de veículos
- `percentual_ocupacao` (NUMERIC, GENERATED) - Percentual de ocupação (calculado)
- `area_ocupada_m2` (NUMERIC, DEFAULT 0) - Área ocupada por veículos em m²
- `area_total_m2` (NUMERIC, NULLABLE) - Área total disponível para veículos em m²
- `motivo_cancelamento` (TEXT, NULLABLE) - Motivo do cancelamento
- `minutos_atraso` (INTEGER, NULLABLE) - Minutos de atraso
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma viagem pode ter múltiplas passagens (`passagens.viagem_id`)
- Uma viagem pode ter múltiplas entradas na fila (`fila_digital.viagem_id`)
- Uma viagem pode gerar múltiplas notificações (`notificacoes.viagem_relacionada_id`)

#### 3.1.6 `tarifas` (Tarifas de Passagens)
Sistema flexível de tarifas para diferentes categorias.

**Campos:**
- `id` (UUID, PK) - ID da tarifa
- `tipo` (TEXT, CHECK) - Tipo: `'passageiro'` ou `'veiculo'`
- `descricao` (TEXT, UNIQUE) - Descrição da tarifa (ex: "Adulto", "Carro Pequeno")
- `codigo` (TEXT, UNIQUE) - Código único da tarifa
- `valor_vazio` (NUMERIC, DEFAULT 0) - Valor base (para veículos vazios)
- `valor_carregado` (NUMERIC, NULLABLE, DEFAULT 0) - Valor quando carregado
- `peso_m2` (NUMERIC, DEFAULT 0) - Área ocupada em m² (para veículos)
- `requer_idade` (BOOLEAN, DEFAULT false) - Se requer idade
- `requer_documento` (BOOLEAN, DEFAULT true) - Se requer documento
- `requer_placa` (BOOLEAN, DEFAULT false) - Se requer placa (veículos)
- `requer_modelo` (BOOLEAN, DEFAULT false) - Se requer modelo (veículos)
- `idade_minima` (INTEGER, NULLABLE) - Idade mínima
- `idade_maxima` (INTEGER, NULLABLE) - Idade máxima
- `observacao` (TEXT, NULLABLE) - Observações
- `ativo` (BOOLEAN, DEFAULT true) - Se a tarifa está ativa
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma tarifa pode ser usada em múltiplas passagens (`passagens.tarifa_id`)

#### 3.1.7 `passagens` (Passagens Compradas)
Armazena todas as passagens compradas pelos usuários.

**Campos:**
- `id` (UUID, PK) - ID da passagem
- `numero_bilhete` (TEXT, UNIQUE) - Número único do bilhete (ex: "FB-2024-000001")
- `usuario_id` (UUID, FK → perfis.id) - Usuário que comprou
- `viagem_id` (UUID, FK → viagens.id) - Viagem associada
- `tipo_passagem` (ENUM) - Tipo: `'pedestre'` ou `'veiculo'`
- `nome_passageiro` (TEXT) - Nome do passageiro
- `cpf_passageiro` (TEXT) - CPF do passageiro
- `placa_veiculo` (TEXT, NULLABLE) - Placa do veículo (se aplicável)
- `quantidade` (INTEGER, DEFAULT 1, CHECK > 0) - Quantidade de passageiros
- `preco_pago` (NUMERIC, CHECK >= 0) - Preço pago pela passagem
- `status_pagamento` (ENUM, DEFAULT 'pendente') - Status do pagamento:
  - `pendente` - Aguardando pagamento
  - `pago` - Pagamento confirmado
  - `reembolsado` - Reembolsado
  - `falhou` - Pagamento falhou
- `metodo_pagamento` (ENUM, NULLABLE) - Método: `'cartao'`, `'pix'`, `'boleto'`
- `id_pagamento_externo` (TEXT, NULLABLE) - ID do pagamento no gateway
- `codigo_qr` (TEXT, UNIQUE) - Código QR único para embarque
- `comprado_em` (TIMESTAMP, DEFAULT now()) - Data da compra
- `usado_em` (TIMESTAMP, NULLABLE) - Data/hora do embarque
- `cancelado_em` (TIMESTAMP, NULLABLE) - Data do cancelamento
- `motivo_cancelamento` (TEXT, NULLABLE) - Motivo do cancelamento
- `valor_reembolso` (NUMERIC, NULLABLE) - Valor reembolsado
- `categoria_passageiro` (TEXT, DEFAULT 'adulto') - Categoria:
  - `'adulto'`, `'crianca'`, `'idoso'`, `'pcd'`, `'estudante'`
- `idade` (INTEGER, NULLABLE) - Idade do passageiro
- `modelo_veiculo` (TEXT, NULLABLE) - Modelo do veículo
- `categoria_veiculo` (TEXT, NULLABLE) - Categoria do veículo
- `peso_veiculo_m2` (NUMERIC, DEFAULT 0) - Área ocupada pelo veículo em m²
- `grupo_id` (UUID, NULLABLE) - ID do grupo (para passagens compradas juntas)
- `tarifa_id` (UUID, FK → tarifas.id, NULLABLE) - Tarifa aplicada
- `eh_carregado` (BOOLEAN, DEFAULT false) - Se o veículo está carregado
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma passagem pertence a um usuário (`usuario_id`)
- Uma passagem pertence a uma viagem (`viagem_id`)
- Uma passagem pode ter uma tarifa (`tarifa_id`)
- Uma passagem pode ter uma entrada na fila (`fila_digital.passagem_id`)

#### 3.1.8 `fila_digital` (Fila de Embarque)
Sistema de fila digital com prioridades.

**Campos:**
- `id` (UUID, PK) - ID da entrada na fila
- `passagem_id` (UUID, FK → passagens.id, UNIQUE) - Passagem associada
- `viagem_id` (UUID, FK → viagens.id) - Viagem associada
- `usuario_id` (UUID, FK → perfis.id) - Usuário na fila
- `posicao` (INTEGER, CHECK > 0) - Posição na fila
- `horario_embarque_estimado` (TIMESTAMP, NULLABLE) - Horário estimado de embarque
- `entrou_fila_em` (TIMESTAMP, DEFAULT now()) - Quando entrou na fila
- `saiu_fila_em` (TIMESTAMP, NULLABLE) - Quando saiu da fila
- `status` (ENUM, DEFAULT 'aguardando') - Status na fila:
  - `aguardando` - Aguardando embarque
  - `embarcando` - Sendo embarcado
  - `embarcou` - Já embarcou
  - `perdeu` - Perdeu a viagem
  - `cancelou` - Cancelou
- `prioridade` (INTEGER, DEFAULT 5) - Prioridade na fila:
  - `1` - Máxima (PCD, Idoso, Criança)
  - `3` - Média (Estudante)
  - `5` - Normal (Adulto)
- `criado_em` (TIMESTAMP) - Data de criação
- `atualizado_em` (TIMESTAMP) - Data de atualização

**Relacionamentos:**
- Uma entrada na fila pertence a uma passagem (`passagem_id`)
- Uma entrada na fila pertence a uma viagem (`viagem_id`)
- Uma entrada na fila pertence a um usuário (`usuario_id`)

#### 3.1.9 `notificacoes` (Notificações)
Sistema de notificações para usuários.

**Campos:**
- `id` (UUID, PK) - ID da notificação
- `usuario_id` (UUID, FK → perfis.id, NULLABLE) - Usuário destinatário (NULL = todos)
- `tipo` (ENUM) - Tipo de notificação:
  - `viagem_cancelada` - Viagem cancelada
  - `viagem_atrasada` - Viagem atrasada
  - `embarque_proximo` - Embarque próximo
  - `embarque_agora` - Embarque agora
  - `lotacao_alta` - Lotação alta
  - `promocao` - Promoção
  - `sistema` - Notificação do sistema
- `titulo` (TEXT) - Título da notificação
- `mensagem` (TEXT) - Mensagem da notificação
- `viagem_relacionada_id` (UUID, FK → viagens.id, NULLABLE) - Viagem relacionada
- `dados_extras` (JSONB, NULLABLE) - Dados extras em JSON
- `lida` (BOOLEAN, DEFAULT false) - Se foi lida
- `enviada_em` (TIMESTAMP, DEFAULT now()) - Data de envio
- `lida_em` (TIMESTAMP, NULLABLE) - Data de leitura
- `prioridade` (ENUM, DEFAULT 'media') - Prioridade:
  - `baixa`, `media`, `alta`
- `criado_em` (TIMESTAMP) - Data de criação

**Relacionamentos:**
- Uma notificação pode ser para um usuário específico (`usuario_id`)
- Uma notificação pode estar relacionada a uma viagem (`viagem_relacionada_id`)

#### 3.1.10 `papeis_usuario` (Papéis e Permissões)
Sistema de roles para controle de acesso.

**Campos:**
- `id` (UUID, PK) - ID do papel
- `usuario_id` (UUID, FK → auth.users.id) - Usuário
- `papel` (ENUM) - Papel do usuário:
  - `admin` - Administrador
  - `operador` - Operador de embarque
  - `usuario` - Usuário comum
- `criado_em` (TIMESTAMP) - Data de criação

---

## 4. Regras de Negócio

### 4.1 Compra de Passagens

#### 4.1.1 Regras Gerais
- Uma passagem só pode ser comprada se a viagem tiver vagas disponíveis
- O sistema verifica capacidade de pedestres e veículos separadamente
- Para veículos, o sistema calcula a área ocupada em m² baseado na categoria
- Passagens podem ser compradas em grupo (mesmo `grupo_id`) para viagens familiares

#### 4.1.2 Geração de Número de Bilhete
- Formato: `FB-{ANO}-{SEQUENCIA}` (ex: "FB-2024-000001")
- Gerado automaticamente por trigger no banco
- Garante unicidade através de sequence

#### 4.1.3 Geração de QR Code
- Cada passagem recebe um QR code único
- QR code é um hash SHA-256 gerado com:
  - UUID aleatório
  - Timestamp atual
  - ID do usuário
  - ID da passagem
- Garante segurança e impossibilidade de duplicação

#### 4.1.4 Cálculo de Preço
- Preço baseado na tarifa selecionada
- Para veículos: pode ter preço diferente se estiver carregado
- Preço é armazenado no momento da compra (`preco_pago`)

### 4.2 Sistema de Fila Digital

#### 4.2.1 Entrada na Fila
- Passageiros entram automaticamente na fila quando:
  - A viagem muda para status `'embarcando'`
  - A passagem está paga (`status_pagamento = 'pago'`)
  - A passagem não foi cancelada
  - A passagem ainda não foi usada

#### 4.2.2 Prioridades na Fila
- **Prioridade 1 (Máxima)**: PCD, Idosos (60+), Crianças
- **Prioridade 3 (Média)**: Estudantes
- **Prioridade 5 (Normal)**: Adultos

#### 4.2.3 Ordenação da Fila
- Ordenada por:
  1. Prioridade (menor número = maior prioridade)
  2. Tempo de entrada na fila (`entrou_fila_em`)
- Posição é recalculada automaticamente quando alguém embarca ou cancela

#### 4.2.4 Grupos na Fila
- Passagens com mesmo `grupo_id` compartilham a mesma entrada na fila
- Quando uma passagem do grupo entra na fila, as outras não criam entradas separadas
- Útil para famílias que viajam juntas

### 4.3 Controle de Capacidade

#### 4.3.1 Pedestres
- Contador `pedestres_atuais` é incrementado quando:
  - Passagem é criada com `status_pagamento = 'pago'`
  - Status de pagamento muda para `'pago'`
- Contador é decrementado quando:
  - Passagem é cancelada
  - Status de pagamento muda para `'reembolsado'` ou `'falhou'`

#### 4.3.2 Veículos
- Contador `veiculos_atuais` é incrementado quando:
  - Passagem de veículo é criada com `status_pagamento = 'pago'`
- Área ocupada (`area_ocupada_m2`) é incrementada com o `peso_veiculo_m2` da passagem
- Sistema verifica se há área disponível antes de permitir compra

#### 4.3.3 Percentual de Ocupação
- Calculado automaticamente: `(pedestres_atuais / capacidade_max_pedestres) * 100`
- Campo gerado automaticamente pelo banco (GENERATED)

### 4.4 Cancelamento de Passagens

#### 4.4.1 Regras de Cancelamento
- Passagens podem ser canceladas se:
  - Faltam mais de 3 horas para a partida
  - A viagem ainda não partiu
  - A passagem não foi usada

#### 4.4.2 Efeitos do Cancelamento
- `cancelado_em` é preenchido com timestamp atual
- `status_pagamento` muda para `'reembolsado'`
- Contador de capacidade é decrementado
- Passagem é removida da fila digital
- Fila é reordenada automaticamente

#### 4.4.3 Cancelamento em Grupo
- Usuário pode cancelar apenas sua passagem ou todas do grupo
- Se cancelar todas, todas as passagens do grupo são canceladas

### 4.5 Embarque

#### 4.5.1 Validação de QR Code
- QR code é validado através da função `validar_qr_code`
- Verifica se:
  - QR code existe
  - Passagem não foi usada
  - Passagem não foi cancelada
  - Viagem não foi cancelada
  - Viagem ainda não partiu
  - QR code pertence à viagem correta

#### 4.5.2 Marcação como Usado
- Função `marcar_passagem_como_usada`:
  - Marca `usado_em` com timestamp atual
  - Atualiza status na fila para `'embarcou'`
  - Remove da fila (ou marca como embarcado)
  - Reordena a fila restante

#### 4.5.3 Status da Viagem
- **agendada**: Viagem programada, ainda não iniciou embarque
- **embarcando**: Embarque iniciado, passageiros podem embarcar
- **partiu**: Embarcação partiu, não aceita mais embarques
- **chegou**: Viagem finalizada
- **cancelada**: Viagem cancelada
- **atrasada**: Viagem atrasada

### 4.6 Sistema de Tarifas

#### 4.6.1 Tipos de Tarifa
- **Passageiro**: Para pessoas
  - Adulto, Criança, Idoso, PCD, Estudante
- **Veículo**: Para veículos
  - Carro Pequeno, Carro Grande, Motocicleta, Caminhão, etc.

#### 4.6.2 Cálculo de Preço
- Baseado na tarifa selecionada
- Para veículos: pode ter `valor_vazio` e `valor_carregado`
- Campo `eh_carregado` na passagem determina qual valor usar

#### 4.6.3 Área Ocupada (m²)
- Cada veículo tem um `peso_m2` definido na tarifa
- Sistema soma todas as áreas ocupadas para verificar capacidade
- Área total disponível pode ser definida por embarcação ou usar padrão (4 m² por veículo)

---

## 5. Funções e Triggers do Banco

### 5.1 Funções Principais

#### 5.1.1 `gerar_numero_bilhete()`
**Tipo**: Trigger Function (BEFORE INSERT)
**Tabela**: `passagens`

Gera número único de bilhete no formato `FB-{ANO}-{SEQUENCIA}`.

**Lógica:**
- Usa sequence `passagens_numero_seq` para garantir unicidade
- Formato: `FB-{ANO}-{SEQUENCIA}` (ex: "FB-2024-000001")
- Verifica se já existe antes de atribuir
- Máximo de 10 tentativas para evitar loop infinito

#### 5.1.2 `gerar_qr_code()`
**Tipo**: Trigger Function (BEFORE INSERT)
**Tabela**: `passagens`

Gera código QR único para cada passagem.

**Lógica:**
- Combina: UUID aleatório + timestamp + user_id + passagem_id
- Aplica hash SHA-256
- Codifica em hexadecimal
- Garante unicidade absoluta

#### 5.1.3 `calcular_prioridade_fila(categoria TEXT)`
**Tipo**: Function
**Retorna**: INTEGER

Calcula prioridade na fila baseado na categoria do passageiro.

**Valores de Retorno:**
- `1` - PCD, Idoso, Criança (prioridade máxima)
- `3` - Estudante (prioridade média)
- `5` - Adulto (prioridade normal)

#### 5.1.4 `validar_qr_code(qr_code_hash TEXT)`
**Tipo**: Function
**Retorna**: JSON

Valida um QR code e retorna informações da passagem.

**Retorno:**
```json
{
  "success": true/false,
  "message": "Mensagem de erro (se houver)",
  "data": {
    "id": "uuid",
    "numero_bilhete": "FB-2024-000001",
    "nome_passageiro": "Nome",
    "tipo_passagem": "pedestre/veiculo",
    "usado_em": null/timestamp,
    "cancelado_em": null/timestamp,
    "viagem": {
      "id": "uuid",
      "data_viagem": "2024-01-01",
      "horario_saida": "08:00:00",
      "status": "embarcando",
      "origem": "Origem",
      "destino": "Destino",
      "embarcacao": "Nome da Embarcação"
    }
  }
}
```

#### 5.1.5 `marcar_passagem_como_usada(passagem_uuid UUID)`
**Tipo**: Function
**Retorna**: JSON

Marca uma passagem como usada (embarcada).

**Lógica:**
1. Verifica se passagem existe e está válida
2. Verifica se não foi usada/cancelada
3. Marca `usado_em` com timestamp atual
4. Atualiza fila digital (status = 'embarcou')
5. Reordena fila restante
6. Retorna JSON com sucesso/erro

#### 5.1.6 `atualizar_contador_viagem_com_peso()`
**Tipo**: Trigger Function (AFTER INSERT/UPDATE)
**Tabela**: `passagens`

Atualiza contadores de capacidade da viagem.

**Lógica:**
- **INSERT com pagamento confirmado:**
  - Se pedestre: incrementa `pedestres_atuais`
  - Se veículo: incrementa `veiculos_atuais` e `area_ocupada_m2`
- **UPDATE: pagamento confirmado:**
  - Mesma lógica do INSERT
- **UPDATE: reembolso/falha:**
  - Decrementa contadores correspondentes
  - Usa `GREATEST(0, ...)` para evitar valores negativos

#### 5.1.7 `criar_entrada_fila_com_grupo()`
**Tipo**: Trigger Function (AFTER INSERT/UPDATE)
**Tabela**: `passagens`

Cria entrada na fila digital quando passagem é paga.

**Lógica:**
1. Verifica se passagem está paga e não cancelada
2. Verifica se viagem está `'agendada'` ou `'embarcando'`
3. Se tem `grupo_id`, verifica se já existe alguém do grupo na fila
4. Se já existe, não cria nova entrada (compartilha fila)
5. Calcula prioridade baseada na categoria
6. Insere na fila com posição inicial
7. Reordena fila por prioridade e tempo

#### 5.1.8 `adicionar_passagens_na_fila_ao_embarcar()`
**Tipo**: Trigger Function (AFTER UPDATE)
**Tabela**: `viagens`

Adiciona todas as passagens pagas na fila quando viagem muda para `'embarcando'`.

**Lógica:**
1. Detecta mudança de status para `'embarcando'`
2. Busca todas as passagens pagas e não canceladas da viagem
3. Calcula prioridade para cada uma
4. Insere na fila com posição baseada em prioridade e tempo de compra
5. Evita duplicatas (ON CONFLICT DO NOTHING)

#### 5.1.9 `processar_cancelamento_passagem_com_peso()`
**Tipo**: Trigger Function (AFTER UPDATE)
**Tabela**: `passagens`

Processa cancelamento de passagem e atualiza capacidade.

**Lógica:**
1. Detecta quando `cancelado_em` é preenchido
2. Devolve capacidade (decrementa contadores)
3. Remove da fila digital
4. Reordena fila restante

#### 5.1.10 `criar_perfil_automatico()`
**Tipo**: Trigger Function (AFTER INSERT)
**Tabela**: `auth.users`

Cria perfil automaticamente quando usuário se registra.

**Lógica:**
- Extrai dados de `raw_user_meta_data`:
  - `full_name` → `nome_completo`
  - `cpf` → `cpf`
  - `telefone` → `telefone`
  - `avatar_url` → `avatar_url`
- Cria registro na tabela `perfis`
- Usa `ON CONFLICT DO NOTHING` para evitar erros

#### 5.1.11 `criar_papel_usuario()`
**Tipo**: Trigger Function (AFTER INSERT)
**Tabela**: `auth.users`

Cria papel padrão 'usuario' para novos usuários.

**Lógica:**
- Insere em `papeis_usuario` com papel `'usuario'`
- Admin e operador devem ser atribuídos manualmente

#### 5.1.12 `atualizar_timestamp()`
**Tipo**: Trigger Function (BEFORE UPDATE)
**Tabelas**: Múltiplas

Atualiza campo `atualizado_em` automaticamente.

**Lógica:**
- Define `atualizado_em = NOW()` antes de qualquer UPDATE

### 5.2 Triggers Principais

#### 5.2.1 Triggers em `passagens`
- **BEFORE INSERT**: `gerar_numero_bilhete`, `gerar_qr_code`
- **AFTER INSERT/UPDATE**: `atualizar_contador_viagem_com_peso`, `criar_entrada_fila_com_grupo`
- **AFTER UPDATE**: `processar_cancelamento_passagem_com_peso`
- **BEFORE UPDATE**: `atualizar_timestamp`

#### 5.2.2 Triggers em `viagens`
- **AFTER UPDATE**: `adicionar_passagens_na_fila_ao_embarcar`
- **BEFORE UPDATE**: `atualizar_timestamp`

#### 5.2.3 Triggers em `auth.users`
- **AFTER INSERT**: `criar_perfil_automatico`, `criar_papel_usuario`

---

## 6. Views do Sistema

### 6.1 `viagens_disponiveis`
**Propósito**: Lista viagens disponíveis para compra

**Campos:**
- Dados da viagem (id, data, horário, status)
- Rota (origem, destino)
- Embarcação (nome, operadora)
- Capacidade e ocupação (pedestres, veículos, área)
- Preços (pedestre, veículo)
- Vagas disponíveis

**Filtros:**
- Apenas viagens futuras (`data_viagem >= CURRENT_DATE`)
- Apenas status `'agendada'`, `'embarcando'` ou `'atrasada'`
- Apenas com vagas disponíveis (`vagas_disponiveis > 0`)

**Ordenação:**
- Por data e horário de saída

### 6.2 `minhas_passagens`
**Propósito**: Lista passagens do usuário com informações completas

**Campos:**
- Dados da passagem (id, número, tipo, preço, status)
- Dados da viagem (data, horário, status, rota)
- Posição na fila (se estiver na fila)
- Embarcação

**Joins:**
- `passagens` → `viagens` → `rotas` → `embarcacoes`
- LEFT JOIN com `fila_digital` para pegar posição

### 6.3 `fila_tempo_real`
**Propósito**: Visualização da fila em tempo real

**Campos:**
- Dados da fila (id, posição, status, horário estimado)
- Dados do passageiro (nome, tipo de passagem)
- Dados da viagem (data, horário, rota)

**Filtros:**
- Apenas status `'aguardando'`

**Ordenação:**
- Por viagem e posição

### 6.4 `profiles`
**Propósito**: View em inglês para compatibilidade com app

**Campos:**
- Mapeia campos de `perfis` para nomes em inglês
- Inclui email de `auth.users`

### 6.5 `trips`
**Propósito**: View em inglês de viagens

**Campos:**
- Mapeia campos de `viagens` para nomes em inglês
- Calcula `available_seats`
- Converte status para inglês

### 6.6 `tickets`
**Propósito**: View em inglês de passagens

**Campos:**
- Mapeia campos de `passagens` para nomes em inglês
- Calcula status baseado em `usado_em` e `cancelado_em`

### 6.7 `estatisticas_perfil`
**Propósito**: Estatísticas calculadas do perfil

**Campos:**
- Dados do perfil
- `total_viagens`: Conta viagens distintas com passagens pagas
- `total_gasto`: Soma de preços pagos

**Lógica:**
- Usa subqueries para calcular estatísticas
- Considera apenas passagens pagas e não canceladas

### 6.8 `viagens_disponibilidade_area`
**Propósito**: Cálculo de disponibilidade de área para veículos

**Campos:**
- Todos os campos de `viagens`
- `area_total`: Área total disponível (ou padrão 4 m² por veículo)
- `area_ocupada`: Área ocupada atual
- `area_disponivel`: Área disponível (total - ocupada)
- `percentual_area_ocupada`: Percentual de ocupação

---

## 7. Lógica de Negócio no Código

### 7.1 Stores (Gerenciamento de Estado)

#### 7.1.1 `authStore` (Autenticação)
**Arquivo**: `stores/authStore.ts`

**Estado:**
- `user`: Usuário autenticado
- `profile`: Perfil do usuário
- `role`: Papel do usuário (admin, operador, usuario)
- `isAuthenticated`: Se está autenticado
- `isLoading`: Estado de carregamento

**Ações:**
- `signIn(email, password)`: Login
- `signUp(data)`: Registro
- `signOut()`: Logout
- `loadProfile()`: Carrega perfil do usuário
- `updateProfile(data)`: Atualiza perfil

#### 7.1.2 `ticketsStore` (Passagens)
**Arquivo**: `stores/ticketsStore.ts`

**Estado:**
- `tickets`: Lista de passagens do usuário
- `filter`: Filtro atual ('all', 'active', 'used', 'cancelled')
- `isLoading`: Estado de carregamento
- `error`: Mensagem de erro

**Ações:**
- `fetchTickets(userId)`: Busca passagens do usuário
- `setFilter(filter)`: Define filtro
- `getTicketById(id)`: Busca passagem específica
- `refreshTickets(userId)`: Recarrega passagens

**Lógica:**
- Busca passagens da tabela `passagens` com joins
- Mapeia dados do banco para formato do app
- Calcula horário de chegada baseado em duração padrão (90 min)

#### 7.1.3 `tripsStore` (Viagens)
**Arquivo**: `stores/tripsStore.ts`

**Estado:**
- `trips`: Lista de viagens disponíveis
- `selectedDate`: Data selecionada
- `isLoading`: Estado de carregamento
- `error`: Mensagem de erro

**Ações:**
- `fetchTrips(date?)`: Busca viagens disponíveis
- `setSelectedDate(date)`: Define data e busca viagens
- `refreshTrips()`: Recarrega viagens
- `getTripById(id)`: Busca viagem específica

**Lógica:**
- Busca da view `viagens_disponiveis`
- Filtra por data (hoje até 7 dias à frente)
- Inclui viagens canceladas para mostrar status
- Mapeia dados para formato do app

#### 7.1.4 `queueStore` (Fila Digital)
**Arquivo**: `stores/queueStore.ts`

**Estado:**
- `queueData`: Dados da posição na fila
- `totalInQueue`: Total de pessoas na fila
- `isLoading`: Estado de carregamento
- `error`: Mensagem de erro

**Ações:**
- `loadQueuePosition(userId)`: Carrega posição do usuário
- `loadQueueByTicket(ticketId)`: Carrega fila por passagem
- `refresh(userId, ticketId?)`: Atualiza dados da fila
- `clear()`: Limpa dados da fila

**Lógica:**
- Busca da tabela `fila_digital` com joins
- Considera grupos (passagens com mesmo `grupo_id`)
- Calcula total na fila para mesma viagem
- Atualiza automaticamente a cada 25 segundos na tela

### 7.2 Serviços

#### 7.2.1 `queueService` (Serviços de Fila)
**Arquivo**: `services/queueService.ts`

**Funções:**
- `getUserQueuePosition(userId)`: Busca posição do usuário na fila
- `getQueueCount(tripId)`: Conta total de pessoas na fila
- `getUserTicketsWithTrips(userId)`: Busca passagens com viagens

#### 7.2.2 `boardingService` (Serviços de Embarque)
**Arquivo**: `services/boardingService.ts`

**Funções:**
- `validateQRCode(qrCodeHash)`: Valida QR code
- `markTicketAsUsed(ticketId)`: Marca passagem como usada
- `getBoardingStats(tripId)`: Busca estatísticas de embarque
- `startBoarding(tripId)`: Inicia processo de embarque
- `markTripDeparted(tripId)`: Marca viagem como partiu
- `cancelTrip(tripId, reason)`: Cancela viagem

### 7.3 Telas Principais

#### 7.3.1 Tela de Horários (`schedule.tsx`)
**Funcionalidades:**
- Lista viagens disponíveis
- Filtro por data (hoje + 4 dias)
- Mostra status, vagas, preços
- Navegação para detalhes da viagem

**Lógica:**
- Usa `tripsStore` para buscar viagens
- Filtra por data selecionada
- Atualiza com pull-to-refresh

#### 7.3.2 Tela de Passagens (`tickets.tsx`)
**Funcionalidades:**
- Lista passagens do usuário
- Filtros: Ativas, Utilizadas, Canceladas
- Visualização de QR code
- Cancelamento de passagens

**Lógica:**
- Usa `ticketsStore` para buscar passagens
- Agrupa passagens do mesmo grupo
- Valida regras de cancelamento (3 horas antes)
- Permite cancelar individual ou grupo inteiro

#### 7.3.3 Tela de Fila (`queue.tsx`)
**Funcionalidades:**
- Mostra posição na fila
- Tempo estimado de embarque
- Informações da viagem
- Atualização automática (25 segundos)

**Lógica:**
- Usa `queueStore` para buscar posição
- Calcula tempo estimado (2 min por pessoa)
- Redireciona para seleção se múltiplas passagens ativas
- Atualiza automaticamente com intervalo

#### 7.3.4 Tela de Scanner (`operator/scanner.tsx`)
**Funcionalidades:**
- Escaneia QR codes de passagens
- Valida passagem antes de embarcar
- Marca passagem como usada

**Lógica:**
- Usa `expo-camera` para leitura
- Chama `validar_qr_code` para validar
- Verifica se:
  - QR code é válido
  - Passagem não foi usada
  - Passagem não foi cancelada
  - Viagem não foi cancelada
  - Viagem ainda não partiu
  - QR code é da viagem correta
- Chama `marcar_passagem_como_usada` para confirmar embarque

#### 7.3.5 Tela de Controle de Embarque (`operator/boarding.tsx`)
**Funcionalidades:**
- Visualiza estatísticas da viagem
- Inicia processo de embarque
- Marca viagem como partiu
- Cancela viagem

**Lógica:**
- Busca dados da viagem
- Conta passageiros embarcados
- Conta pessoas na fila
- Permite mudar status da viagem
- Valida que viagem é do dia atual

---

## 8. Fluxos Principais

### 8.1 Fluxo de Compra de Passagem

1. **Usuário seleciona viagem** (tela `schedule.tsx`)
2. **Visualiza detalhes** (tela `trip-details.tsx`)
3. **Adiciona passageiros/veículos ao carrinho**
4. **Seleciona tarifas** apropriadas
5. **Confirma compra**
6. **Sistema cria passagens**:
   - Trigger `gerar_numero_bilhete` gera número único
   - Trigger `gerar_qr_code` gera QR code único
   - Trigger `atualizar_contador_viagem_com_peso` atualiza capacidade
   - Trigger `criar_entrada_fila_com_grupo` adiciona na fila (se viagem embarcando)
7. **Passagens aparecem** na tela `tickets.tsx`

### 8.2 Fluxo de Embarque

1. **Operador acessa controle de embarque** (`operator/boarding.tsx`)
2. **Seleciona viagem do dia**
3. **Inicia embarque** (muda status para `'embarcando'`)
4. **Trigger `adicionar_passagens_na_fila_ao_embarcar`** adiciona todas as passagens pagas na fila
5. **Passageiros veem posição na fila** (`queue.tsx`)
6. **Operador escaneia QR code** (`operator/scanner.tsx`)
7. **Sistema valida QR code** (`validar_qr_code`)
8. **Sistema marca como usada** (`marcar_passagem_como_usada`)
9. **Fila é reordenada** automaticamente
10. **Operador marca viagem como partiu** quando termina

### 8.3 Fluxo de Cancelamento

1. **Usuário acessa passagens** (`tickets.tsx`)
2. **Seleciona passagem para cancelar**
3. **Sistema valida regras**:
   - Faltam mais de 3 horas?
   - Viagem ainda não partiu?
   - Passagem não foi usada?
4. **Se passagem tem grupo**, oferece cancelar só ela ou todo grupo
5. **Sistema atualiza passagem**:
   - Preenche `cancelado_em`
   - Muda `status_pagamento` para `'reembolsado'`
6. **Trigger `processar_cancelamento_passagem_com_peso`**:
   - Devolve capacidade
   - Remove da fila
   - Reordena fila

### 8.4 Fluxo de Fila Digital

1. **Passagem é comprada e paga**
2. **Se viagem está `'embarcando'`**, trigger adiciona na fila
3. **Se viagem muda para `'embarcando'`**, trigger adiciona todas as passagens pagas
4. **Fila é ordenada** por prioridade e tempo
5. **Usuário vê posição** na tela `queue.tsx`
6. **Posição atualiza automaticamente** a cada 25 segundos
7. **Quando alguém embarca**, fila é reordenada
8. **Quando alguém cancela**, fila é reordenada

---

## 9. Sistema de Fila Digital

### 9.1 Conceito

A fila digital é um sistema inteligente que organiza o embarque de passageiros considerando:
- **Prioridades legais**: PCD, idosos e crianças têm prioridade
- **Ordem de chegada**: Dentro da mesma prioridade, quem comprou primeiro embarca primeiro
- **Grupos familiares**: Famílias que compraram juntas compartilham a mesma posição

### 9.2 Como Funciona

#### 9.2.1 Entrada na Fila
- Automática quando:
  - Passagem é paga E viagem está `'embarcando'` OU `'agendada'`
  - Passagem não foi cancelada
  - Passagem não foi usada

#### 9.2.2 Cálculo de Prioridade
```sql
calcular_prioridade_fila(categoria):
  - 'pcd' → 1
  - 'idoso' → 1
  - 'crianca' → 1
  - 'estudante' → 3
  - 'adulto' → 5
```

#### 9.2.3 Ordenação
```sql
ORDER BY prioridade ASC, entrou_fila_em ASC
```

Isso significa:
1. Primeiro: quem tem prioridade 1 (PCD, idosos, crianças)
2. Depois: quem tem prioridade 3 (estudantes)
3. Por último: quem tem prioridade 5 (adultos)
4. Dentro de cada prioridade: quem entrou primeiro

#### 9.2.4 Grupos
- Passagens com mesmo `grupo_id` compartilham a mesma entrada na fila
- Útil para famílias: todos embarcam juntos
- Quando uma passagem do grupo entra na fila, as outras não criam entradas separadas

### 9.3 Atualização da Fila

#### 9.3.1 Quando Alguém Embarca
1. Passagem é marcada como usada
2. Entrada na fila muda status para `'embarcou'`
3. Fila é reordenada (posições são recalculadas)
4. Próxima pessoa sobe na posição

#### 9.3.2 Quando Alguém Cancela
1. Passagem é cancelada
2. Entrada na fila é removida
3. Fila é reordenada
4. Todos avançam uma posição

#### 9.3.3 Reordenação Automática
A reordenação acontece através de uma CTE (Common Table Expression):

```sql
WITH fila_ordenada AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY prioridade ASC, entrou_fila_em ASC
    ) as nova_posicao
  FROM fila_digital
  WHERE viagem_id = ...
  AND status = 'aguardando'
)
UPDATE fila_digital f
SET posicao = fo.nova_posicao
FROM fila_ordenada fo
WHERE f.id = fo.id;
```

### 9.4 Visualização no App

- **Tela `queue.tsx`**: Mostra posição atual, total na fila, tempo estimado
- **Atualização automática**: A cada 25 segundos
- **Pull-to-refresh**: Usuário pode atualizar manualmente

---

## 10. Sistema de Embarque

### 10.1 Processo de Embarque

#### 10.1.1 Início do Embarque
1. Operador acessa `operator/boarding.tsx`
2. Seleciona viagem do dia
3. Clica em "Iniciar Embarque"
4. Status da viagem muda para `'embarcando'`
5. Trigger `adicionar_passagens_na_fila_ao_embarcar` adiciona todas as passagens pagas na fila

#### 10.1.2 Validação de QR Code
Quando operador escaneia QR code:

1. **Validação inicial** (`validar_qr_code`):
   - Verifica se QR code existe
   - Retorna dados da passagem e viagem

2. **Validações no app**:
   - Passagem não foi usada? (`usado_em IS NULL`)
   - Passagem não foi cancelada? (`cancelado_em IS NULL`)
   - Viagem não foi cancelada?
   - Viagem ainda não partiu?
   - QR code é da viagem correta?

3. **Se todas validações passam**: Prossegue para embarque

#### 10.1.3 Confirmação de Embarque
1. Chama função `marcar_passagem_como_usada`
2. Função:
   - Marca `usado_em = NOW()`
   - Atualiza fila: `status = 'embarcou'`, `saiu_fila_em = NOW()`
   - Reordena fila restante
3. Retorna sucesso/erro

#### 10.1.4 Finalização
1. Quando termina embarque, operador marca viagem como `'partiu'`
2. `horario_saida_real` é preenchido
3. Não aceita mais embarques

### 10.2 Controle de Capacidade

#### 10.2.1 Pedestres
- Contador `pedestres_atuais` é atualizado automaticamente por triggers
- Não pode exceder `capacidade_max_pedestres`

#### 10.2.2 Veículos
- Contador `veiculos_atuais` e `area_ocupada_m2` são atualizados
- Sistema verifica área disponível antes de permitir compra
- Cada veículo tem `peso_veiculo_m2` definido na tarifa

### 10.3 Estatísticas de Embarque

A tela de controle mostra:
- **Embarcados**: Passagens com `usado_em` preenchido
- **Na Fila**: Entradas na fila com status `'aguardando'`
- **Pedestres**: `pedestres_atuais / capacidade_max_pedestres`
- **Veículos**: `veiculos_atuais / capacidade_max_veiculos`

---

## 11. Sistema de Tarifas

### 11.1 Estrutura de Tarifas

#### 11.1.1 Tipos
- **Passageiro**: Para pessoas
  - Requer: nome, CPF, categoria
  - Pode requerer: idade
- **Veículo**: Para veículos
  - Requer: placa, modelo, categoria
  - Pode ter: preço vazio e carregado

#### 11.1.2 Categorias de Passageiro
- **Adulto**: Preço padrão
- **Criança**: Preço reduzido (geralmente 6-12 anos)
- **Idoso**: Gratuito ou reduzido (60+)
- **PCD**: Gratuito ou reduzido
- **Estudante**: Preço reduzido (com documento)

#### 11.1.3 Categorias de Veículo
- **Carro Pequeno**: Até 4 m²
- **Carro Grande**: 4-6 m²
- **Motocicleta**: 1-2 m²
- **Caminhão**: 8-12 m²
- **Van/Microônibus**: 6-8 m²

### 11.2 Cálculo de Preço

#### 11.2.1 Passageiros
- Preço baseado na tarifa selecionada
- Valor único (`valor_vazio`)

#### 11.2.2 Veículos
- **Vazio**: Usa `valor_vazio` da tarifa
- **Carregado**: Usa `valor_carregado` da tarifa (se definido)
- Campo `eh_carregado` na passagem determina qual usar

### 11.3 Área Ocupada (m²)

#### 11.3.1 Conceito
- Cada veículo ocupa uma área no ferry
- Área é definida na tarifa (`peso_m2`)
- Sistema soma todas as áreas para verificar capacidade

#### 11.3.2 Cálculo
- `area_ocupada_m2` = soma de todos os `peso_veiculo_m2` das passagens pagas
- `area_total_m2` = definida por embarcação ou padrão (4 m² × capacidade_max_veiculos)
- `area_disponivel_m2` = `area_total_m2` - `area_ocupada_m2`

#### 11.3.3 Validação
- Antes de permitir compra, sistema verifica se há área disponível
- Se `area_disponivel_m2 < peso_veiculo_m2`, não permite compra

---

## 12. Segurança e Permissões

### 12.1 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Isso significa que:
- Usuários só veem seus próprios dados
- Operadores veem dados relacionados às viagens que controlam
- Admins veem tudo

### 12.2 Políticas de Segurança

#### 12.2.1 `perfis`
- **SELECT**: Usuário vê apenas seu próprio perfil
- **UPDATE**: Usuário atualiza apenas seu próprio perfil
- **INSERT**: Apenas sistema (via trigger)

#### 12.2.2 `passagens`
- **SELECT**: Usuário vê apenas suas próprias passagens
- **INSERT**: Usuário cria apenas para si mesmo
- **UPDATE**: Usuário atualiza apenas suas próprias passagens (com restrições)

#### 12.2.3 `fila_digital`
- **SELECT**: Usuário vê apenas suas próprias entradas na fila
- **INSERT**: Apenas sistema (via trigger)
- **UPDATE**: Apenas sistema (via função)

#### 12.2.4 `viagens`
- **SELECT**: Todos podem ver viagens disponíveis
- **UPDATE**: Apenas operadores e admins podem atualizar

### 12.3 Papéis de Usuário

#### 12.3.1 `usuario` (Padrão)
- Pode comprar passagens
- Pode ver suas próprias passagens
- Pode ver fila digital
- Pode cancelar suas passagens (com regras)

#### 12.3.2 `operador`
- Todas as permissões de `usuario`
- Pode acessar área de operador
- Pode iniciar embarque
- Pode escanear QR codes
- Pode marcar viagem como partiu
- Pode cancelar viagens

#### 12.3.3 `admin`
- Todas as permissões de `operador`
- Acesso total ao sistema
- Pode gerenciar usuários
- Pode gerenciar tarifas
- Pode gerenciar embarcações e rotas

### 12.4 Validações de Segurança

#### 12.4.1 QR Code
- Hash único e não previsível
- Validação no servidor (não pode ser falsificado)
- Verifica múltiplas condições antes de permitir embarque

#### 12.4.2 Cancelamento
- Validação de tempo (3 horas antes)
- Validação de status da viagem
- Validação de uso da passagem

#### 12.4.3 Capacidade
- Validação no servidor (triggers)
- Não permite exceder capacidade
- Atualização automática e consistente

---

## 📊 Resumo Técnico

### Tecnologias Utilizadas
- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Estado**: Zustand
- **Navegação**: Expo Router
- **UI**: React Native Paper

### Principais Funcionalidades
1. ✅ Compra de passagens (pedestres e veículos)
2. ✅ Sistema de fila digital com prioridades
3. ✅ Controle de embarque com QR codes
4. ✅ Sistema de tarifas flexível
5. ✅ Gestão de capacidade (pedestres e área de veículos)
6. ✅ Cancelamento de passagens com regras
7. ✅ Notificações
8. ✅ Estatísticas de perfil

### Tabelas Principais
- `perfis` - Usuários
- `rotas` - Rotas disponíveis
- `embarcacoes` - Embarcações
- `horarios` - Horários de viagem
- `viagens` - Viagens agendadas
- `tarifas` - Tarifas
- `passagens` - Passage