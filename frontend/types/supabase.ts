export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      platform_services: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          type: string
          icon_url: string | null
          subdomain_url: string | null
          ui_config: Record<string, any>
          created_at: string
          is_active: boolean
          is_visible_in_marketplace: boolean
          is_demo_allowed: boolean
          monthly_reset_enabled: boolean
          demo_limit_config: Record<string, any> | null
          marketplace_metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          type: string
          icon_url?: string | null
          subdomain_url?: string | null
          ui_config?: Record<string, any>
          created_at?: string
          is_active?: boolean
          is_visible_in_marketplace?: boolean
          is_demo_allowed?: boolean
          monthly_reset_enabled?: boolean
          demo_limit_config?: Record<string, any> | null
          marketplace_metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          type?: string
          icon_url?: string | null
          subdomain_url?: string | null
          ui_config?: Record<string, any>
          created_at?: string
          is_active?: boolean
          is_visible_in_marketplace?: boolean
          is_demo_allowed?: boolean
          monthly_reset_enabled?: boolean
          demo_limit_config?: Record<string, any> | null
          marketplace_metadata?: Record<string, any> | null
        }
        Relationships: []
      }
      service_events: {
        Row: {
          id: string
          user_id: string
          service_id: string
          status: string
          event_data: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          status: string
          event_data?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          status?: string
          event_data?: Record<string, any>
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "platform_services"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  ui_config: Record<string, any>
  created_at: string
  is_active: boolean
  is_visible_in_marketplace: boolean
  is_demo_allowed: boolean
  demo_limit_config: Record<string, any> | null
  marketplace_metadata: {
    tagline?: string
    features?: string[]
    pricing_tiers?: Array<{
      name: string
      limit: string
      price: number
    }>
    video_demo_url?: string
    analytics_chart_config?: any
  } | null
}

export interface ServiceEvent {
  id: string
  user_id: string
  service_id: string
  status: string
  event_data: Record<string, any>
  created_at: string
}
