export type BookingStatus =
  | "requested"
  | "approved"
  | "confirmed"
  | "active"
  | "bumping"
  | "bumped"
  | "completed"
  | "cancelled"
  | "expired"
  | "pre_checkin_cancelled";

export type BumpStatus = "active" | "resolved" | "admin_review";

export type RenterResponse = "rebooking" | "accepted_deadline" | "left_early";

export type VillaStatus = "draft" | "active" | "paused" | "delisted";

export type IcalSyncStatus = "ok" | "pending" | "error";

export type PaymentType = "charge" | "refund" | "payout";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed";

export type NotificationChannel = "whatsapp" | "in_app" | "email";

export type NotificationStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          preferred_currency: string;
          is_admin: boolean;
          language: string;
          notification_preferences: Record<string, boolean>;
          status: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          is_admin?: boolean;
          language?: string;
          notification_preferences?: Record<string, boolean>;
          status?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          is_admin?: boolean;
          language?: string;
          notification_preferences?: Record<string, boolean>;
          status?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      owner_profiles: {
        Row: {
          id: string;
          business_name: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          xendit_customer_id: string | null;
          id_type: string | null;
          id_number: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_name?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          xendit_customer_id?: string | null;
          id_type?: string | null;
          id_number?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          xendit_customer_id?: string | null;
          id_type?: string | null;
          id_number?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "owner_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      villas: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          area: string;
          location: unknown | null;
          address: string | null;
          bedrooms: number;
          bathrooms: number | null;
          max_guests: number;
          standby_rate_idr: number;
          bump_notice_hours: number;
          check_in_by: string | null;
          earliest_check_in: string | null;
          check_out_time: string | null;
          house_rules: string | null;
          amenities: string[];
          status: VillaStatus;
          ical_url: string | null;
          ical_last_synced_at: string | null;
          ical_sync_status: IcalSyncStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          area: string;
          location?: unknown | null;
          address?: string | null;
          bedrooms: number;
          bathrooms?: number | null;
          max_guests: number;
          standby_rate_idr: number;
          bump_notice_hours?: number;
          check_in_by?: string | null;
          earliest_check_in?: string | null;
          check_out_time?: string | null;
          house_rules?: string | null;
          amenities?: string[];
          status?: VillaStatus;
          ical_url?: string | null;
          ical_last_synced_at?: string | null;
          ical_sync_status?: IcalSyncStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          area?: string;
          location?: unknown | null;
          address?: string | null;
          bedrooms?: number;
          bathrooms?: number | null;
          max_guests?: number;
          standby_rate_idr?: number;
          bump_notice_hours?: number;
          check_in_by?: string | null;
          earliest_check_in?: string | null;
          check_out_time?: string | null;
          house_rules?: string | null;
          amenities?: string[];
          status?: VillaStatus;
          ical_url?: string | null;
          ical_last_synced_at?: string | null;
          ical_sync_status?: IcalSyncStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "villas_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      villa_photos: {
        Row: {
          id: string;
          villa_id: string;
          url: string;
          sort_order: number;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          villa_id: string;
          url: string;
          sort_order?: number;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          villa_id?: string;
          url?: string;
          sort_order?: number;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "villa_photos_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          villa_id: string;
          renter_id: string;
          check_in: string;
          check_out: string;
          nights: number;
          guests: number | null;
          arrival_today: boolean | null;
          arrival_time: string | null;
          house_rules_accepted: boolean | null;
          payment_method: string;
          nightly_rate_idr: number;
          total_amount_idr: number;
          service_fee_idr: number;
          total_charged_idr: number;
          fx_rate_to_renter: number | null;
          renter_currency: string;
          status: BookingStatus;
          checked_in_at: string | null;
          protection_ends_at: string | null;
          is_rebook: boolean;
          original_booking_id: string | null;
          approved_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          auto_bump_scheduled_at: string | null;
          auto_bump_triggered_by: string | null;
          bumped_at: string | null;
          switched_to_booking_id: string | null;
          switched_from_booking_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          villa_id: string;
          renter_id: string;
          check_in: string;
          check_out: string;
          nights: number;
          guests?: number | null;
          arrival_today?: boolean | null;
          arrival_time?: string | null;
          house_rules_accepted?: boolean | null;
          payment_method?: string;
          nightly_rate_idr: number;
          total_amount_idr: number;
          service_fee_idr: number;
          total_charged_idr: number;
          fx_rate_to_renter?: number | null;
          renter_currency?: string;
          status?: BookingStatus;
          checked_in_at?: string | null;
          protection_ends_at?: string | null;
          is_rebook?: boolean;
          original_booking_id?: string | null;
          approved_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          auto_bump_scheduled_at?: string | null;
          auto_bump_triggered_by?: string | null;
          bumped_at?: string | null;
          switched_to_booking_id?: string | null;
          switched_from_booking_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          villa_id?: string;
          renter_id?: string;
          check_in?: string;
          check_out?: string;
          nights?: number;
          guests?: number | null;
          arrival_today?: boolean | null;
          arrival_time?: string | null;
          house_rules_accepted?: boolean | null;
          payment_method?: string;
          nightly_rate_idr?: number;
          total_amount_idr?: number;
          service_fee_idr?: number;
          total_charged_idr?: number;
          fx_rate_to_renter?: number | null;
          renter_currency?: string;
          status?: BookingStatus;
          checked_in_at?: string | null;
          protection_ends_at?: string | null;
          is_rebook?: boolean;
          original_booking_id?: string | null;
          approved_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          auto_bump_scheduled_at?: string | null;
          auto_bump_triggered_by?: string | null;
          bumped_at?: string | null;
          switched_to_booking_id?: string | null;
          switched_from_booking_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_original_booking_id_fkey";
            columns: ["original_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bumps: {
        Row: {
          id: string;
          booking_id: string;
          villa_id: string;
          owner_id: string;
          renter_id: string;
          triggered_at: string;
          external_platform: string | null;
          ical_verified: boolean;
          ical_verified_at: string | null;
          deadline: string;
          nights_stayed: number | null;
          nights_refunded: number | null;
          renter_response: RenterResponse | null;
          renter_responded_at: string | null;
          replacement_booking_id: string | null;
          status: BumpStatus;
          resolved_at: string | null;
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          villa_id: string;
          owner_id: string;
          renter_id: string;
          triggered_at?: string;
          external_platform?: string | null;
          ical_verified?: boolean;
          ical_verified_at?: string | null;
          deadline: string;
          nights_stayed?: number | null;
          nights_refunded?: number | null;
          renter_response?: RenterResponse | null;
          renter_responded_at?: string | null;
          replacement_booking_id?: string | null;
          status?: BumpStatus;
          resolved_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          villa_id?: string;
          owner_id?: string;
          renter_id?: string;
          triggered_at?: string;
          external_platform?: string | null;
          ical_verified?: boolean;
          ical_verified_at?: string | null;
          deadline?: string;
          nights_stayed?: number | null;
          nights_refunded?: number | null;
          renter_response?: RenterResponse | null;
          renter_responded_at?: string | null;
          replacement_booking_id?: string | null;
          status?: BumpStatus;
          resolved_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bumps_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bumps_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bumps_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bumps_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bumps_replacement_booking_id_fkey";
            columns: ["replacement_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          type: PaymentType;
          amount_idr: number;
          description: string | null;
          xendit_payment_id: string | null;
          xendit_status: string | null;
          status: PaymentStatus;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          type: PaymentType;
          amount_idr: number;
          description?: string | null;
          xendit_payment_id?: string | null;
          xendit_status?: string | null;
          status?: PaymentStatus;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          type?: PaymentType;
          amount_idr?: number;
          description?: string | null;
          xendit_payment_id?: string | null;
          xendit_status?: string | null;
          status?: PaymentStatus;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          id: string;
          owner_id: string;
          booking_id: string;
          payment_id: string | null;
          amount_idr: number;
          nights_paid: number;
          status: PaymentStatus;
          xendit_disbursement_id: string | null;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          booking_id: string;
          payment_id?: string | null;
          amount_idr: number;
          nights_paid: number;
          status?: PaymentStatus;
          xendit_disbursement_id?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          booking_id?: string;
          payment_id?: string | null;
          amount_idr?: number;
          nights_paid?: number;
          status?: PaymentStatus;
          xendit_disbursement_id?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      external_availability: {
        Row: {
          id: string;
          villa_id: string;
          source: string;
          blocked_start: string;
          blocked_end: string;
          summary: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          villa_id: string;
          source: string;
          blocked_start: string;
          blocked_end: string;
          summary?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          villa_id?: string;
          source?: string;
          blocked_start?: string;
          blocked_end?: string;
          summary?: string | null;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_availability_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          bump_id: string | null;
          channel: NotificationChannel;
          template: string;
          message_body: string | null;
          status: NotificationStatus;
          twilio_message_sid: string | null;
          error_message: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          bump_id?: string | null;
          channel: NotificationChannel;
          template: string;
          message_body?: string | null;
          status?: NotificationStatus;
          twilio_message_sid?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          booking_id?: string | null;
          bump_id?: string | null;
          channel?: NotificationChannel;
          template?: string;
          message_body?: string | null;
          status?: NotificationStatus;
          twilio_message_sid?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_bump_id_fkey";
            columns: ["bump_id"];
            isOneToOne: false;
            referencedRelation: "bumps";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          id: string;
          currency_code: string;
          rate_from_idr: number;
          source: string;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          currency_code: string;
          rate_from_idr: number;
          source?: string;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          currency_code?: string;
          rate_from_idr?: number;
          source?: string;
          fetched_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          booking_id: string;
          villa_id: string;
          renter_id: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          villa_id: string;
          renter_id: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          villa_id?: string;
          renter_id?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_villas: {
        Row: {
          id: string;
          user_id: string;
          villa_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          villa_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          villa_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_villas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_villas_villa_id_fkey";
            columns: ["villa_id"];
            isOneToOne: false;
            referencedRelation: "villas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_villa: {
        Args: { villa_uuid: string };
        Returns: boolean;
      };
      get_villas_in_viewport: {
        Args: {
          min_lng: number;
          min_lat: number;
          max_lng: number;
          max_lat: number;
        };
        Returns: unknown[];
      };
      count_active_bookings: {
        Args: { renter_uuid: string };
        Returns: number;
      };
      check_villa_availability: {
        Args: {
          villa_uuid: string;
          desired_check_in: string;
          desired_check_out: string;
        };
        Returns: {
          conflict_source: string;
          conflict_start: string;
          conflict_end: string;
        }[];
      };
      search_villas: {
        Args: {
          search_lat?: number | null;
          search_lng?: number | null;
          search_radius_km?: number;
          bounds_sw_lat?: number | null;
          bounds_sw_lng?: number | null;
          bounds_ne_lat?: number | null;
          bounds_ne_lng?: number | null;
          filter_check_in?: string | null;
          filter_check_out?: string | null;
          filter_min_price?: number | null;
          filter_max_price?: number | null;
          filter_bedrooms?: number | null;
          filter_guests?: number | null;
          filter_amenities?: string[] | null;
          sort_by?: string | null;
          page_number?: number;
          page_limit?: number;
        };
        Returns: {
          villa_id: string;
          villa_title: string;
          villa_area: string;
          standby_rate: number;
          villa_bedrooms: number;
          villa_bathrooms: number;
          villa_max_guests: number;
          lat: number;
          lng: number;
          villa_amenities: string[];
          villa_owner_id: string;
          owner_name: string;
          owner_verified: boolean;
          images: { url: string; alt: string }[];
          distance_meters: number | null;
          total_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
