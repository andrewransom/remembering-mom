export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DonationLink = {
  organizationName: string;
  description: string;
  url: string;
};

export type Database = {
  public: {
    Tables: {
      memorials: {
        Row: {
          id: string;
          slug: string;
          person_name: string;
          birth_date: string | null;
          death_date: string | null;
          tribute_paragraphs: string[];
          donation_links: DonationLink[];
          profile_photo_path: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          person_name: string;
          birth_date?: string | null;
          death_date?: string | null;
          tribute_paragraphs?: string[];
          donation_links?: DonationLink[];
          profile_photo_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          person_name?: string;
          birth_date?: string | null;
          death_date?: string | null;
          tribute_paragraphs?: string[];
          donation_links?: DonationLink[];
          profile_photo_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          memorial_id: string;
          author_name: string;
          message: string;
          photo_path: string | null;
          photo_paths: string[];
          is_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          memorial_id: string;
          author_name: string;
          message: string;
          photo_path?: string | null;
          photo_paths?: string[];
          is_approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          memorial_id?: string;
          author_name?: string;
          message?: string;
          photo_path?: string | null;
          photo_paths?: string[];
          is_approved?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      condolences: {
        Row: {
          id: string;
          memorial_id: string;
          from_name: string;
          source: string | null;
          date_received: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          memorial_id: string;
          from_name: string;
          source?: string | null;
          date_received?: string | null;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          memorial_id?: string;
          from_name?: string;
          source?: string | null;
          date_received?: string | null;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
