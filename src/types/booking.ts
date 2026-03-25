export interface BookingInfo {
  villa_id: string;
  villa_title: string;
  standby_rate: number;
  earliest_check_in_time: string;
  check_out_time: string;
  max_guests: number;
  house_rules: string | null;
  owner: {
    id: string;
    display_name: string;
  };
  images: { url: string; alt: string }[];
}

export interface CreateBookingRequest {
  villa_id: string;
  check_in_date: string;
  arrival_time?: string;
  check_out_date: string;
  num_guests: number;
  house_rules_accepted?: boolean;
  payment_method?: string;
}

export interface BookingResponse {
  id: string;
  villa_id: string;
  villa_title: string;
  check_in_date: string;
  arrival_time: string | null;
  check_out_date: string;
  check_out_time: string;
  num_guests: number | null;
  nightly_rate: number;
  nights: number;
  total_amount: number;
  service_fee: number;
  total_charged: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface BookingDetail {
  id: string;
  villa: {
    id: string;
    title: string;
    images: { url: string; alt: string }[];
    location: {
      lat: number | null;
      lng: number | null;
      address: string | null;
      area: string;
    };
    house_rules: string | null;
    check_out_time: string;
    owner: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
  check_in_date: string;
  arrival_time: string | null;
  check_out_date: string;
  num_guests: number | null;
  nights: number;
  standby_rate: number;
  total_amount: number;
  service_fee: number;
  total_charged: number;
  payment_method: string;
  status: string;
  protection: {
    is_protected: boolean;
    protected_until: string | null;
    bump_deadline_if_bumped_now: string | null;
  };
  bump: {
    is_bumped: boolean;
    bumped_at: string | null;
    must_leave_by: string | null;
  } | null;
  created_at: string;
}

export interface ExtendBookingRequest {
  new_check_out_date: string;
}
