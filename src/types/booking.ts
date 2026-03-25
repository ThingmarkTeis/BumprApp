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

export interface ExtendBookingRequest {
  new_check_out_date: string;
}
