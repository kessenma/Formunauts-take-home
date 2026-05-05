export * from './theme';

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type OrgType = 'npo' | 'fundraising_agency';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type PaymentMethod =
  | 'sepa_direct_debit'
  | 'credit_card'
  | 'google_pay'
  | 'apple_pay'
  | 'paypal'
  | 'bank_transfer'
  | 'cash';
export type DonationChannel =
  | 'street'
  | 'door_to_door'
  | 'event'
  | 'phone'
  | 'email'
  | 'social_media';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Organization {
  id: number;
  name: string;
  type: OrgType;
  country: string | null;
  website: string | null;
}

export interface Fundraiser {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface Donor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

export interface DonationLocation {
  id: number;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Campaign {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  goal: number;
  currency: string;
  status: CampaignStatus;
  totalRaised: number;
  donorCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface Donation {
  id: number;
  campaignId: number;
  // Spec-compliant flat fields
  donorName: string;
  email: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  // Extended fields
  channel: DonationChannel;
  isRecurring: boolean;
  isMock: boolean;
  ipAddress: string | null;
  donorFeedbackRating: number | null;
  donor: Donor;
  fundraiser: Fundraiser | null;
  location: DonationLocation | null;
}

// ─── API Request / Response shapes ────────────────────────────────────────────

// Spec uses 'card' | 'paypal' | 'sepa' — we accept those as aliases alongside our full enum
export type AnyPaymentMethod = PaymentMethod | 'card' | 'sepa';

export interface CreateDonationRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  amount: number;
  paymentMethod: AnyPaymentMethod;
  channel: DonationChannel;
  campaignId: number;
  fundraiserId?: number;
  city?: string;
  country?: string;
  currency?: string;
  isRecurring?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  // Spec-compliant nested pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Flat fields kept for internal Angular use
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DonationSortKey = 'date' | 'amount' | 'donorLastName';

export interface SortParams {
  sort: DonationSortKey;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  paymentMethod?: PaymentMethod;
  channel?: DonationChannel;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  campaignId?: number;
}

export interface DonorFilterParams {
  search?: string;
  country?: string;
}

export interface FundraiserFilterParams {
  search?: string;
  isActive?: boolean;
}

export interface CampaignFilterParams {
  search?: string;
  status?: CampaignStatus;
}

export interface OrganizationFilterParams {
  search?: string;
  type?: OrgType;
}

export interface CampaignSummary extends Campaign {
  organizationName: string;
}

export interface FundraiserStats {
  id: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  totalRaised: number;
  donationCount: number;
}

export interface DonorSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  totalDonated: number;
  donationCount: number;
  lastDonationAt: string | null;
}

export interface ChartBreakdownItem {
  label: string;
  value: number;
  count: number;
}

export interface DonationChartData {
  byDate: { date: string; total: number }[];
  byChannel: ChartBreakdownItem[];
  byPaymentMethod: ChartBreakdownItem[];
}

export interface WsDonationEvent {
  type: 'new_donation';
  payload: Donation;
}

export interface MockDataParams {
  count: number;
  minAmount: number;
  maxAmount: number;
  startDate: string;
  endDate: string;
}

export interface StreamStatus {
  running: boolean;
  config: { campaignId: number; intervalMs: number; minAmount: number; maxAmount: number } | null;
  totalGenerated: number;
  startedAt: string | null;
}

export interface ChatResponse {
  question: string;
  sql: string;
  results: Record<string, unknown>[];
}

export interface ChatResponseWithSession extends ChatResponse {
  sessionId: number;
}

export interface ChatSession {
  id: number;
  userId: string;
  userName: string;
  title: string;
  shareToken: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  text: string;
  sql: string | null;
  results: Record<string, unknown>[] | null;
  isError: boolean;
  createdAt: string;
}

export interface CreateSessionResponse {
  sessionId: number;
}

export interface ShareResponse {
  shareToken: string;
  shareUrl: string;
}

export interface SharedThreadResponse {
  title: string;
  userName: string;
  messages: ChatMessage[];
}

export type SlashCommandType =
  | 'organization' | 'campaign' | 'donor'
  | 'payment' | 'channel' | 'date';

export interface SlashMention {
  type: SlashCommandType;
  label: string;
  id: number | null;
  value?: string;
}

export interface ModelStatus {
  phase: 'idle' | 'downloading' | 'paused' | 'loading' | 'ready' | 'error';
  progress: number;
  detail: string;
  error: string;
  model_loaded: boolean;
  model_name?: string;
  model_url?: string;
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface ServerHealth {
  status: 'ok' | 'error';
  uptimeSeconds: number;
  memoryMb: { rss: number; heapUsed: number; heapTotal: number };
  wsConnections: number;
}

export interface DatabaseHealth {
  status: 'ok' | 'slow' | 'error';
  responseTimeMs: number;
}

export interface LlmHealth {
  status: 'ok' | 'error' | 'unreachable' | 'unknown';
  phase?: string;
  modelLoaded?: boolean;
  progress?: number;
}

export interface SystemHealth {
  timestamp: string;
  server: ServerHealth;
  database: DatabaseHealth;
  llm: LlmHealth;
}

export interface Spike {
  id: number;
  service: string;
  metric: string;
  value: number | null;
  threshold: number | null;
  severity: 'warning' | 'critical';
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}
