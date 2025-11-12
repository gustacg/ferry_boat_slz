/**
 * TIPOS GLOBAIS DO FERRY BOAT APP
 * 
 * Este arquivo centraliza todas as definições de tipos TypeScript
 * usadas no aplicativo. Isso garante consistência e evita erros.
 */

// ==================== USUÁRIO E PERFIL ====================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  cpf: string;
  avatar_url?: string;
  trips_count: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// Tipo que bate com a tabela 'perfis' no Supabase
export interface Perfil {
  id: string;
  nome_completo: string;
  cpf: string;
  telefone: string | null;
  avatar_url: string | null;
  total_viagens: number;
  total_gasto: number;
  criado_em: string;
  atualizado_em: string;
}

// ==================== VIAGENS ====================

export type TripStatus = 
  | 'scheduled'    // Programada
  | 'boarding'     // Embarcando
  | 'active'       // Ativa/Em rota
  | 'full'         // Lotada
  | 'completed'    // Finalizada
  | 'cancelled';   // Cancelada

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  boarding_time: string;
  date: string;
  ferry_name: string;
  company: string;
  available_seats: number;
  total_seats: number;
  price_passenger: number;
  status: TripStatus;
  gate: string;
  duration_minutes: number;
  created_at: string;
}

export interface TripWithAvailability extends Trip {
  vehicles_available: {
    small_cars: number;
    large_cars: number;
    motorcycles: number;
    trucks: number;
    vans: number;
  };
}

// Interface que mapeia diretamente com a view viagens_disponiveis do banco
export interface ViagemDisponivel {
  id: string;
  data_viagem: string;
  horario_saida: string;
  status: 'agendada' | 'embarcando' | 'partiu' | 'chegou' | 'cancelada' | 'atrasada';
  origem: string;
  destino: string;
  embarcacao_nome: string;
  operadora: 'internacional_maritima' | 'henvil' | 'servi_porto';
  pedestres_atuais: number;
  capacidade_max_pedestres: number;
  percentual_ocupacao: number;
  preco_pedestre: number;
  preco_veiculo: number;
  vagas_disponiveis: number;
}

// ==================== PASSAGENS (TICKETS) ====================

export type TicketStatus = 
  | 'active'     // Ativa (não usada ainda)
  | 'used'       // Usada (embarcou)
  | 'cancelled'  // Cancelada
  | 'expired';   // Expirada

export interface Ticket {
  id: string;
  ticket_code: string;
  user_id: string;
  trip_id: string;
  passenger_name: string;
  passenger_cpf: string;
  passenger_category: PassengerCategory;
  boarding_time: string;
  qr_code: string;
  price: number;
  status: TicketStatus;
  created_at: string;
  used_at?: string | null;
  cancelled_at?: string | null;
  
  // Relacionamento com Trip
  trips?: Trip;
}

// Interface que mapeia diretamente com a view minhas_passagens do banco
export interface MinhaPassagem {
  id: string;
  numero_bilhete: string;
  tipo_passagem: 'pedestre' | 'veiculo';
  quantidade: number;
  preco_pago: number;
  status_pagamento: 'pendente' | 'pago' | 'reembolsado' | 'falhou';
  codigo_qr: string;
  comprado_em: string;
  usado_em: string | null;
  data_viagem: string;
  horario_saida: string;
  status_viagem: 'agendada' | 'embarcando' | 'partiu' | 'chegou' | 'cancelada';
  origem: string;
  destino: string;
  embarcacao_nome: string;
  posicao_fila: number | null;
  nome_passageiro?: string;
  cpf_passageiro?: string;
  categoria_passageiro?: string;
  cancelado_em?: string | null;
  viagem_id?: string;
  usuario_id?: string;
}

// ==================== PASSAGEIROS ====================

export type PassengerCategory = 
  | 'adult'      // Adulto
  | 'child'      // Criança (6-12 anos)
  | 'senior'     // Idoso (60+)
  | 'disabled'   // PCD
  | 'student';   // Estudante

export interface PassengerInfo {
  id: string;
  name: string;
  cpf: string;
  category: PassengerCategory;
  is_driver: boolean;
}

export const PASSENGER_PRICES: Record<PassengerCategory, number> = {
  adult: 15.00,
  child: 10.00,
  senior: 0,       // Gratuito
  disabled: 0,     // Gratuito
  student: 12.00,
};

// ==================== VEÍCULOS ====================

export type VehicleType = 
  | 'transport'  // Veículo de transporte
  | 'cargo';     // Veículo de carga

export type TransportVehicleCategory = 
  | 'small'       // Carro pequeno
  | 'large'       // Carro grande
  | 'pickup'      // Caminhonete
  | 'van'         // Van/Microônibus
  | 'motorcycle'; // Motocicleta

export type CargoVehicleCategory = 
  | 'truck_34'    // Caminhão 3/4
  | 'truck_toco'  // Caminhão Toco
  | 'truck_truck' // Caminhão Trucado
  | 'truck_semi'; // Carreta/Semi-reboque

export interface VehicleInfo {
  id: string;
  type: VehicleType;
  category: TransportVehicleCategory | CargoVehicleCategory;
  plate: string;
  price: number;
}

export const VEHICLE_PRICES = {
  transport: {
    small: 50.00,
    large: 60.00,
    pickup: 55.00,
    van: 70.00,
    motorcycle: 20.00,
  },
  cargo: {
    truck_34: 80.00,
    truck_toco: 100.00,
    truck_truck: 120.00,
    truck_semi: 150.00,
  },
};

// ==================== FILA DIGITAL ====================

export interface QueuePosition {
  user_id: string;
  ticket_id: string;
  position: number;
  total_in_queue: number;
  estimated_wait_minutes: number;
  next_trip_id: string;
  last_updated: string;
}

// ==================== CHECKOUT ====================

export interface CheckoutData {
  trip_id: string;
  passengers: PassengerInfo[];
  vehicles: VehicleInfo[];
  total_amount: number;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_method: 'pix' | 'credit_card' | 'debit_card';
  created_at: string;
}

// ==================== NOTIFICAÇÕES ====================

export type NotificationType = 
  | 'trip_reminder'     // Lembrete de viagem
  | 'boarding_soon'     // Embarque próximo
  | 'trip_cancelled'    // Viagem cancelada
  | 'trip_delayed'      // Viagem atrasada
  | 'queue_update'      // Atualização de fila
  | 'general';          // Geral

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  trip_id?: string;
}

// ==================== EMPRESAS E EMBARCAÇÕES ====================

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  email?: string;
}

export interface Ferry {
  id: string;
  name: string;
  company_id: string;
  passenger_capacity: number;
  vehicle_capacity: number;
  is_active: boolean;
}

// ==================== FORMULÁRIOS ====================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  cpf: string;
}

export interface ProfileUpdateFormData {
  full_name?: string;
  phone?: string;
  cpf?: string;
}

// ==================== NAVEGAÇÃO ====================

// Tipos para os parâmetros de navegação do Expo Router
export type RootStackParamList = {
  '(tabs)': undefined;
  'trip-details': { tripId: string };
  'trip-qrcode': { ticketId: string };
  'checkout': { tripId: string };
  'faq': undefined;
  'login': undefined;
  'signup': undefined;
};

// ==================== RESPOSTAS DE API ====================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total_pages: number;
  total_items: number;
}

// ==================== FILTROS E ORDENAÇÃO ====================

export interface TripFilters {
  date?: string;
  origin?: string;
  destination?: string;
  status?: TripStatus;
}

export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: string;
  order: SortOrder;
}

