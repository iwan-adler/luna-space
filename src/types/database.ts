
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"category": string,"created_at": string,"entity_id": string | null,"entity_type": string | null,"guest_visible": boolean,"id": number,"metadata": NonNullable<Json>,"project_id": string | null,"summary": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"category"?: string,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"guest_visible"?: boolean,"id"?: never,"metadata"?: NonNullable<Json>,"project_id"?: string | null,"summary": string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"category"?: string,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"guest_visible"?: boolean,"id"?: never,"metadata"?: NonNullable<Json>,"project_id"?: string | null,"summary"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"app_config": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"client_errors": {
                  Row: {
                    "app_version": string | null,"created_at": string,"error_id": string,"id": string,"message": string | null,"route": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string | null,"created_at"?: string,"error_id": string,"id"?: string,"message"?: string | null,"route"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "app_version"?: string | null,"created_at"?: string,"error_id"?: string,"id"?: string,"message"?: string | null,"route"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_errors_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability_status"],"avatar_path": string | null,"created_at": string,"display_name": string,"id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability_status"],"avatar_path"?: string | null,"created_at"?: string,"display_name": string,"id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability_status"],"avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limit_events": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workspace_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"created_by": string | null,"expires_at": string,"id": string,"revoked_at": string | null,"token_hash": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"token_hash": string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"token_hash"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_invitations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_invitations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_member_history": {
                  Row: {
                    "display_name": string,"id": string,"joined_at": string,"left_at": string | null,"seat": number,"user_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"id"?: string,"joined_at": string,"left_at"?: string | null,"seat": number,"user_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "display_name"?: string,"id"?: string,"joined_at"?: string,"left_at"?: string | null,"seat"?: number,"user_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_member_history_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "joined_at": string,"seat": number,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"seat": number,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "joined_at"?: string,"seat"?: number,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_workspace_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"create_workspace":
{ Args: { "p_name": string }; Returns: string
                           },
"create_workspace_invitation":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"report_client_error":
{ Args: { "p_app_version": string,"p_error_id": string,"p_message": string,"p_route": string }; Returns: undefined
                           },
"revoke_workspace_invitation":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            "availability_status": "available"|"busy"|"focus"|"away","credibility_level": "official"|"known_platform"|"unverified"|"caution","date_kind": "registration_open"|"registration_deadline"|"submission_deadline"|"event_start"|"event_end"|"result"|"other","event_kind": "meeting"|"deadline"|"milestone"|"assignment"|"exam"|"class"|"lab"|"travel"|"focus"|"personal"|"other","field_status": "confirmed"|"inferred"|"missing"|"conflicting","guest_role": "viewer"|"collaborator"|"project_admin","opportunity_status": "saved"|"interested"|"planning"|"registered"|"in_progress"|"submitted"|"awaiting_result"|"won"|"not_selected"|"withdrawn"|"missed"|"archived","opportunity_type": "hackathon"|"coding_competition"|"innovation_challenge"|"internship"|"scholarship"|"fellowship"|"research_programme"|"conference"|"workshop"|"summer_school"|"ambassador_programme"|"open_source_programme"|"exchange_programme"|"technical_event"|"other","participation_mode": "online"|"offline"|"hybrid"|"unknown","portfolio_kind": "project"|"hackathon"|"competition"|"award"|"certificate"|"internship"|"workshop"|"research"|"open_source"|"leadership"|"volunteering","project_category": "hackathon"|"competition"|"academic"|"practice"|"personal"|"research"|"other","project_stage": "idea"|"planning"|"building"|"testing"|"submitting"|"presenting"|"completed"|"archived","provenance_source": "manual"|"extraction"|"recheck","skill_stage": "not_started"|"learning"|"practicing"|"applied"|"confident","task_priority": "low"|"medium"|"high"|"urgent","task_status": "backlog"|"todo"|"in_progress"|"review"|"done","visibility": "shared"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "availability_status": ["available", "busy", "focus", "away"],"credibility_level": ["official", "known_platform", "unverified", "caution"],"date_kind": ["registration_open", "registration_deadline", "submission_deadline", "event_start", "event_end", "result", "other"],"event_kind": ["meeting", "deadline", "milestone", "assignment", "exam", "class", "lab", "travel", "focus", "personal", "other"],"field_status": ["confirmed", "inferred", "missing", "conflicting"],"guest_role": ["viewer", "collaborator", "project_admin"],"opportunity_status": ["saved", "interested", "planning", "registered", "in_progress", "submitted", "awaiting_result", "won", "not_selected", "withdrawn", "missed", "archived"],"opportunity_type": ["hackathon", "coding_competition", "innovation_challenge", "internship", "scholarship", "fellowship", "research_programme", "conference", "workshop", "summer_school", "ambassador_programme", "open_source_programme", "exchange_programme", "technical_event", "other"],"participation_mode": ["online", "offline", "hybrid", "unknown"],"portfolio_kind": ["project", "hackathon", "competition", "award", "certificate", "internship", "workshop", "research", "open_source", "leadership", "volunteering"],"project_category": ["hackathon", "competition", "academic", "practice", "personal", "research", "other"],"project_stage": ["idea", "planning", "building", "testing", "submitting", "presenting", "completed", "archived"],"provenance_source": ["manual", "extraction", "recheck"],"skill_stage": ["not_started", "learning", "practicing", "applied", "confident"],"task_priority": ["low", "medium", "high", "urgent"],"task_status": ["backlog", "todo", "in_progress", "review", "done"],"visibility": ["shared", "private"]
          }
        }
} as const
