export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DonationLink = {
  details: {
    name: string;
    description: string;
    info_link?: string | null;
  }[];
  link: {
    name: string;
    url: string;
  };
};

export type EventAttendanceChoice = "in_person" | "livestream" | "unable" | "undecided";
export type EventSpeakingIntent = "yes" | "no" | "maybe";
export type EventSpeakingFormat = "in_person" | "livestream" | "pre_recorded" | "written_note";
export type EventRsvpStatus = "pending_review" | "confirmed" | "changed" | "cancelled" | "duplicate";

export type Database = {
  public: {
    Tables: {
      memorials: {
        Row: {
          id: string;
          slug: string;
          person_name: string;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
          full_name: string | null;
          birth_date: string | null;
          death_date: string | null;
          bio: string | null;
          tribute_paragraphs: string[];
          donation_links: DonationLink[];
          profile_photo_path: string | null;
          secondary_photo_path: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          person_name: string;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          full_name?: string | null;
          birth_date?: string | null;
          death_date?: string | null;
          bio?: string | null;
          tribute_paragraphs?: string[];
          donation_links?: DonationLink[];
          profile_photo_path?: string | null;
          secondary_photo_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          person_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
          full_name?: string | null;
          birth_date?: string | null;
          death_date?: string | null;
          bio?: string | null;
          tribute_paragraphs?: string[];
          donation_links?: DonationLink[];
          profile_photo_path?: string | null;
          secondary_photo_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          memorial_id: string;
          event_title: string | null;
          event_description: string | null;
          event_date: string | null;
          event_start_time: string | null;
          event_end_time: string | null;
          time_zone: string | null;
          location: string | null;
          location_notes: string | null;
          map_link: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          memorial_id: string;
          event_title?: string | null;
          event_description?: string | null;
          event_date?: string | null;
          event_start_time?: string | null;
          event_end_time?: string | null;
          time_zone?: string | null;
          location?: string | null;
          location_notes?: string | null;
          map_link?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          memorial_id?: string;
          event_title?: string | null;
          event_description?: string | null;
          event_date?: string | null;
          event_start_time?: string | null;
          event_end_time?: string | null;
          time_zone?: string | null;
          location?: string | null;
          location_notes?: string | null;
          map_link?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_private_details: {
        Row: {
          id: string;
          event_id: string;
          livestream_link: string | null;
          livestream_instructions: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          livestream_link?: string | null;
          livestream_instructions?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          livestream_link?: string | null;
          livestream_instructions?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          guest_name: string;
          email: string;
          phone: string | null;
          attendance_choice: EventAttendanceChoice;
          attendee_count: number;
          additional_attendee_names: string | null;
          wants_to_speak: EventSpeakingIntent;
          speaking_format: EventSpeakingFormat | null;
          message: string | null;
          message_share_permission: boolean;
          accessibility_needs: string | null;
          dietary_restrictions: string | null;
          wants_updates: boolean;
          private_note: string | null;
          status: EventRsvpStatus;
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_name: string;
          email: string;
          phone?: string | null;
          attendance_choice: EventAttendanceChoice;
          attendee_count: number;
          additional_attendee_names?: string | null;
          wants_to_speak: EventSpeakingIntent;
          speaking_format?: EventSpeakingFormat | null;
          message?: string | null;
          message_share_permission?: boolean;
          accessibility_needs?: string | null;
          dietary_restrictions?: string | null;
          wants_updates?: boolean;
          private_note?: string | null;
          status?: EventRsvpStatus;
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          guest_name?: string;
          email?: string;
          phone?: string | null;
          attendance_choice?: EventAttendanceChoice;
          attendee_count?: number;
          additional_attendee_names?: string | null;
          wants_to_speak?: EventSpeakingIntent;
          speaking_format?: EventSpeakingFormat | null;
          message?: string | null;
          message_share_permission?: boolean;
          accessibility_needs?: string | null;
          dietary_restrictions?: string | null;
          wants_updates?: boolean;
          private_note?: string | null;
          status?: EventRsvpStatus;
          admin_notes?: string | null;
          created_at?: string;
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
