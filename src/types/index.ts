export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Restroom {
  id: string;
  name: string;
  location_name: string;
  latitude: number;
  longitude: number;
  type: 'Restaurant' | 'Petrol Pump' | 'Mall' | 'Railway / Bus Station' | 'Public Toilet' | 'Other';
  toilet_type: 'Indian' | 'European' | 'Both';
  gender_access: 'Men' | 'Women' | 'Unisex' | 'Both';
  is_accessible: boolean;
  
  // Cache of facilities
  has_soap: boolean;
  has_mirror: boolean;
  has_sanitary_disposal: boolean;
  
  // Cached ratings
  avg_cleanliness: number;
  avg_smell: number;
  avg_lighting: number;
  avg_women_safety: number;
  avg_water_availability: number;
  overall_score: number;
  verification_count: number;
  
  // Image paths/URLs
  public_image_url: string | null;
  backup_image_url: string | null;
  
  open_24_hours: 'Yes' | 'No' | 'Not Sure';
  is_hidden: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestroomVerification {
  id: string;
  restroom_id: string;
  user_id: string | null;
  cleanliness: number;
  smell: number;
  lighting: number;
  women_safety: number;
  water_availability: number;
  has_soap: boolean;
  has_mirror: boolean;
  has_sanitary_disposal: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  restroom_id: string;
  user_id: string | null;
  reason: 'wrong_image' | 'fake_restroom' | 'closed_restroom' | 'incorrect_information';
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}
