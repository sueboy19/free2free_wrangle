export type SocialProvider = 'facebook' | 'instagram' | 'google' | 'line';
export type StoreBrand = '7-11' | 'familymart';

export interface User {
  id: number;
  social_id: string;
  social_provider: SocialProvider;
  name: string;
  email: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: number;
  updated_at: number;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Activity {
  id: number;
  title: string;
  target_count: number;
  location_id: number;
  description?: string;
  created_by: number;
  location?: Location;
  store_brand?: StoreBrand;
  metadata?: string;
}

export interface Match {
  id: number;
  activity_id: number;
  organizer_id: number;
  match_time: string;
  status: 'open' | 'completed' | 'cancelled';
  activity?: Activity;
  organizer?: User;
}

export interface MatchParticipant {
  id: number;
  match_id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  match?: Match;
  user?: User;
}

export interface Review {
  id: number;
  match_id: number;
  reviewer_id: number;
  reviewee_id: number;
  score: number;
  comment?: string;
  created_at: string;
  match?: Match;
  reviewer?: User;
  reviewee?: User;
}

export interface ReviewLike {
  id: number;
  review_id: number;
  user_id: number;
  is_like: boolean;
  review?: Review;
  user?: User;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface JWTPayload {
  user_id: number;
  user_name: string;
  is_admin: boolean;
  exp: number;
  iat: number;
}

export interface Session {
  id: string;
  user_id: number;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: TokenResponse;
  session_id: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
  session_id?: string;
}

export interface CoffeePromoItem {
  id: number;
  store_brand: string;
  product_name: string;
  deal_type: string;
  deal_category: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  source: string;
  is_recurring: number;
  recurring_pattern: string | null;
  source_url: string;
  scraped_at: string;
  created_at: string;
  updated_at: string;
  product_category: string;
}

export interface CoffeePromoResponse {
  data: Record<string, Record<string, { label: string; items: CoffeePromoItem[] }>>;
  total: number;
  limit: number;
  offset: number;
}
