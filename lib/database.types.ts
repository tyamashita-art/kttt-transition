export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRole = "admin" | "member";
export type ItemStatus = "available" | "requested" | "borrowed" | "unavailable";
export type AvailableType = "anytime" | "period";
export type RentalStatus =
  | "requested"
  | "rejected"
  | "borrowed"
  | "return_requested"
  | "returned"
  | "overdue"
  | "cancelled";
export type EventParticipantStatus = "going" | "not_going" | "maybe";
export type RoomType = "team" | "event" | "rental";
export type NotificationKind = "rental_due_soon" | "rental_due_today" | "rental_overdue" | "system";
export type GearRequestStatus = "open" | "resolved";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          nickname: string | null;
          avatar_url: string | null;
          first_triathlon_date: string | null;
          yearly_goal: string | null;
          planned_races: string | null;
          bio: string | null;
          role: ProfileRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          first_triathlon_date?: string | null;
          yearly_goal?: string | null;
          planned_races?: string | null;
          bio?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      allowed_emails: {
        Row: {
          id: string;
          email: string;
          role: ProfileRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: ProfileRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["allowed_emails"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: string;
          category_group: string | null;
          category_item: string | null;
          description: string | null;
          image_url: string | null;
          condition: string | null;
          status: ItemStatus;
          is_lendable: boolean;
          is_sellable: boolean;
          sale_price: number | null;
          available_type: AvailableType;
          available_from: string | null;
          available_until: string | null;
          max_rental_months: number;
          transport_method: string;
          transport_note: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          category: string;
          category_group?: string | null;
          category_item?: string | null;
          description?: string | null;
          image_url?: string | null;
          condition?: string | null;
          status?: ItemStatus;
          is_lendable?: boolean;
          is_sellable?: boolean;
          sale_price?: number | null;
          available_type?: AvailableType;
          available_from?: string | null;
          available_until?: string | null;
          max_rental_months?: number;
          transport_method?: string;
          transport_note?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [];
      };
      rental_requests: {
        Row: {
          id: string;
          item_id: string;
          requester_id: string;
          owner_id: string;
          requested_start_date: string;
          requested_end_date: string;
          approved_start_date: string | null;
          approved_end_date: string | null;
          transport_method: string | null;
          message: string | null;
          owner_note: string | null;
          due_alert_sent_at: string | null;
          due_today_alert_sent_at: string | null;
          overdue_alert_sent_at: string | null;
          status: RentalStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          requester_id: string;
          owner_id: string;
          requested_start_date: string;
          requested_end_date: string;
          approved_start_date?: string | null;
          approved_end_date?: string | null;
          transport_method?: string | null;
          message?: string | null;
          owner_note?: string | null;
          due_alert_sent_at?: string | null;
          due_today_alert_sent_at?: string | null;
          overdue_alert_sent_at?: string | null;
          status?: RentalStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rental_requests"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_at: string;
          end_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          start_at: string;
          end_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: EventParticipantStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status: EventParticipantStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Insert"]>;
        Relationships: [];
      };
      chat_rooms: {
        Row: {
          id: string;
          room_type: RoomType;
          related_id: string | null;
          title: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          room_type: RoomType;
          related_id?: string | null;
          title?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["chat_rooms"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          message: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: NotificationKind;
          title: string;
          body: string | null;
          related_type: string | null;
          related_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: NotificationKind;
          title: string;
          body?: string | null;
          related_type?: string | null;
          related_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notices: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          body: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          body: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notices"]["Insert"]>;
        Relationships: [];
      };
      gear_requests: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          detail: string | null;
          desired_start_date: string | null;
          desired_end_date: string | null;
          status: GearRequestStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          detail?: string | null;
          desired_start_date?: string | null;
          desired_end_date?: string | null;
          status?: GearRequestStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["gear_requests"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      request_item: {
        Args: {
          p_item_id: string;
          p_requested_start_date: string;
          p_requested_end_date: string;
          p_message?: string;
          p_transport_method?: string;
        };
        Returns: string;
      };
      approve_rental_request: {
        Args: {
          p_request_id: string;
          p_approved_start_date: string;
          p_approved_end_date: string;
          p_owner_note?: string;
          p_transport_method?: string;
        };
        Returns: void;
      };
      reject_rental_request: {
        Args: {
          p_request_id: string;
          p_owner_note?: string;
        };
        Returns: void;
      };
      request_rental_return: {
        Args: {
          p_request_id: string;
        };
        Returns: void;
      };
      confirm_rental_return: {
        Args: {
          p_request_id: string;
        };
        Returns: void;
      };
      delete_item: {
        Args: {
          p_item_id: string;
        };
        Returns: void;
      };
      delete_event: {
        Args: {
          p_event_id: string;
        };
        Returns: void;
      };
      generate_rental_due_alerts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      profile_role: ProfileRole;
      item_status: ItemStatus;
      available_type: AvailableType;
      rental_status: RentalStatus;
      event_participant_status: EventParticipantStatus;
      room_type: RoomType;
      notification_kind: NotificationKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
