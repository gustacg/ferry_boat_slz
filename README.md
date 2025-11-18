# Ferry Boat App

App mobile (Expo/React Native) integrado ao Supabase para compra de passagens, fila digital e embarque com QR Code.

## Visão Geral
- Backend: Supabase (Postgres, Auth, Realtime)
- Frontend: Expo Router + Zustand
- Docs técnicas: veja `explicacao.md` para o desenho completo do banco (tabelas, triggers, views e regras de negócio)

## Pré‑requisitos
- Node 18+
- Git
- Conta no Supabase
- Opcional para build: `eas-cli`

## Instalação
1. Clone e instale:
   ```bash
   git clone <url-do-repo>
   cd ferry-boat-app
   npm install
   ```
2. Configure as credenciais do Supabase:
   - Opção rápida: edite `services/supabase.ts` e ajuste `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os valores do seu projeto.
   - Opção recomendada (configuração via app.json):
     1. Adicione em `app.json` em `expo.extra`:
        ```json
        {
          "expo": {
            "extra": {
              "SUPABASE_URL": "https://xxxxx.supabase.co",
              "SUPABASE_ANON_KEY": "xxxxxxxx"
            }
          }
        }
        ```
     2. Altere o cliente em `services/supabase.ts` para ler de `expo-constants` (exemplo no fim deste README).

## Banco de Dados (Supabase)
1. Crie um projeto no Supabase e copie `Project URL` e `Anon Key`.
2. Aplique as migrações e seeds:
   - Editor SQL: execute, na ordem, os arquivos em `supabase/migrations` (`001_schema.sql`, `002_functions_triggers.sql`, `003_seed.sql`, `004_views.sql`).
   - CLI:
     ```bash
     npm i -g supabase
     supabase login
     supabase link --project-ref <seu-project-ref>
     supabase db push
     ```
3. Embarcador nativo (operador):
   - Crie o usuário em Auth com email `embarcador@ferry.com.br` e senha `Embarcador123!` pelo Dashboard.
   - Depois, execute `005_operator.sql` (ele vincula o usuário ao perfil e papel `operador`).
4. Seeds:
   - Rotas, embarcações e horários atuais
   - Viagens geradas para os próximos 30 dias automaticamente
5. Perfis e estatísticas: use `perfis` e a view `estatisticas_perfil` (soma de viagens e gasto).

## Rodar no Expo Go
- Inicie o servidor:
  ```bash
  npx expo start
  ```
- Escaneie o QR code com o app Expo Go no Android/iOS.
- Garanta que o celular e o PC estejam na mesma rede.

## Testes rápidos
- Login e cadastro na tela `login`/`signup`.
- Ver horários em `schedule`.
- Minhas passagens em `tickets`.
- Fila digital em `queue`.
- QR Code da passagem em `trip-qrcode`.

## Build de APK (Android)
1. Instale e configure:
   ```bash
   npm i -g eas-cli
   eas login
   ```
2. Gere um APK de preview:
   ```bash
   eas build -p android --profile preview
   ```
3. O link de download aparece no painel da EAS.

## Como trocar credenciais depois
- Alterar `services/supabase.ts` (rápido) ou usar `app.json` (`expo.extra`). Ajuste e reinicie o app.

## Vídeo de demonstração
- https://www.linkedin.com/posts/gustacg_apresento-o-ferry-boat-app-um-mvp-mobile-activity-7396555249051762688-gV8D?utm_source=share&utm_medium=member_desktop&rcm=ACoAAEMpu-sBCRvWwan-oDGPy6TNCmFi9VA-F8E

## Exemplo de cliente Supabase com `expo.extra`
```ts
// services/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'
import Constants from 'expo-constants'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = (Constants?.expoConfig?.extra as any) || {}
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})
```
