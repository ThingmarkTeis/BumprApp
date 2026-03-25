export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface ProfileResponse {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  language: string;
  preferred_currency: string;
  notification_preferences: NotificationPreferences;
  has_owner_role: boolean;
  created_at: string;
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
}
