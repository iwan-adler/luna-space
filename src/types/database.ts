
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
                },"extraction_fields": {
                  Row: {
                    "candidate_no": number,"evidence": string | null,"field_key": string,"id": string,"reason": string | null,"rule_id": string | null,"run_id": string,"status": Database["public"]['Enums']["field_status"],"value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_no"?: number,"evidence"?: string | null,"field_key": string,"id"?: string,"reason"?: string | null,"rule_id"?: string | null,"run_id": string,"status": Database["public"]['Enums']["field_status"],"value"?: Json | null
                  }
                  Update: {
                    "candidate_no"?: number,"evidence"?: string | null,"field_key"?: string,"id"?: string,"reason"?: string | null,"rule_id"?: string | null,"run_id"?: string,"status"?: Database["public"]['Enums']["field_status"],"value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "extraction_fields_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "extraction_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"extraction_runs": {
                  Row: {
                    "content_hash": string | null,"content_type": string | null,"error_code": string | null,"expires_at": string | null,"extractor_version": string,"final_url": string | null,"finished_at": string | null,"http_status": number | null,"id": string,"is_recheck": boolean,"opportunity_id": string | null,"requested_by": string | null,"source_url": string,"started_at": string,"status": string,"thin": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_hash"?: string | null,"content_type"?: string | null,"error_code"?: string | null,"expires_at"?: string | null,"extractor_version"?: string,"final_url"?: string | null,"finished_at"?: string | null,"http_status"?: number | null,"id"?: string,"is_recheck"?: boolean,"opportunity_id"?: string | null,"requested_by"?: string | null,"source_url": string,"started_at"?: string,"status"?: string,"thin"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "content_hash"?: string | null,"content_type"?: string | null,"error_code"?: string | null,"expires_at"?: string | null,"extractor_version"?: string,"final_url"?: string | null,"finished_at"?: string | null,"http_status"?: number | null,"id"?: string,"is_recheck"?: boolean,"opportunity_id"?: string | null,"requested_by"?: string | null,"source_url"?: string,"started_at"?: string,"status"?: string,"thin"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "extraction_runs_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "extraction_runs_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extraction_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunities": {
                  Row: {
                    "benefits": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"description": string | null,"eligibility_criteria": Json | null,"eligibility_text": string | null,"fee_amount": number | null,"fee_currency": string | null,"id": string,"is_free": boolean | null,"location": string | null,"mode": Database["public"]['Enums']["participation_mode"],"official_url": string | null,"organizer": string | null,"owner_id": string | null,"prizes": string | null,"registration_url": string | null,"required_documents": (string)[],"rules_text": string | null,"rules_url": string | null,"search": unknown,"status": Database["public"]['Enums']["opportunity_status"],"tags": (string)[],"team_max": number | null,"team_min": number | null,"title": string,"tracks": (string)[],"type": Database["public"]['Enums']["opportunity_type"],"updated_at": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "benefits"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"eligibility_criteria"?: Json | null,"eligibility_text"?: string | null,"fee_amount"?: number | null,"fee_currency"?: string | null,"id"?: string,"is_free"?: boolean | null,"location"?: string | null,"mode"?: Database["public"]['Enums']["participation_mode"],"official_url"?: string | null,"organizer"?: string | null,"owner_id"?: string | null,"prizes"?: string | null,"registration_url"?: string | null,"required_documents"?: (string)[],"rules_text"?: string | null,"rules_url"?: string | null,"search"?: never,"status"?: Database["public"]['Enums']["opportunity_status"],"tags"?: (string)[],"team_max"?: number | null,"team_min"?: number | null,"title": string,"tracks"?: (string)[],"type": Database["public"]['Enums']["opportunity_type"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "benefits"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"eligibility_criteria"?: Json | null,"eligibility_text"?: string | null,"fee_amount"?: number | null,"fee_currency"?: string | null,"id"?: string,"is_free"?: boolean | null,"location"?: string | null,"mode"?: Database["public"]['Enums']["participation_mode"],"official_url"?: string | null,"organizer"?: string | null,"owner_id"?: string | null,"prizes"?: string | null,"registration_url"?: string | null,"required_documents"?: (string)[],"rules_text"?: string | null,"rules_url"?: string | null,"search"?: never,"status"?: Database["public"]['Enums']["opportunity_status"],"tags"?: (string)[],"team_max"?: number | null,"team_min"?: number | null,"title"?: string,"tracks"?: (string)[],"type"?: Database["public"]['Enums']["opportunity_type"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_dates": {
                  Row: {
                    "all_day": boolean,"at_time": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["date_kind"],"label": string | null,"on_date": string | null,"opportunity_id": string,"source_timezone": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day": boolean,"at_time"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["date_kind"],"label"?: string | null,"on_date"?: string | null,"opportunity_id": string,"source_timezone"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "all_day"?: boolean,"at_time"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["date_kind"],"label"?: string | null,"on_date"?: string | null,"opportunity_id"?: string,"source_timezone"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_dates_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"opportunity_field_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"extraction_run_id": string | null,"field_key": string,"id": number,"new_value": Json | null,"old_value": Json | null,"opportunity_id": string,"source": Database["public"]['Enums']["provenance_source"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"extraction_run_id"?: string | null,"field_key": string,"id"?: never,"new_value"?: Json | null,"old_value"?: Json | null,"opportunity_id": string,"source": Database["public"]['Enums']["provenance_source"],"workspace_id": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"extraction_run_id"?: string | null,"field_key"?: string,"id"?: never,"new_value"?: Json | null,"old_value"?: Json | null,"opportunity_id"?: string,"source"?: Database["public"]['Enums']["provenance_source"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_field_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_field_history_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_field_history_run_fk"
      columns: ["extraction_run_id"]
isOneToOne: false
      referencedRelation: "extraction_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_field_provenance": {
                  Row: {
                    "evidence": string | null,"extraction_run_id": string | null,"field_key": string,"opportunity_id": string,"source": Database["public"]['Enums']["provenance_source"],"status_at_acceptance": Database["public"]['Enums']["field_status"] | null,"verified_at": string,"verified_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evidence"?: string | null,"extraction_run_id"?: string | null,"field_key": string,"opportunity_id": string,"source": Database["public"]['Enums']["provenance_source"],"status_at_acceptance"?: Database["public"]['Enums']["field_status"] | null,"verified_at"?: string,"verified_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "evidence"?: string | null,"extraction_run_id"?: string | null,"field_key"?: string,"opportunity_id"?: string,"source"?: Database["public"]['Enums']["provenance_source"],"status_at_acceptance"?: Database["public"]['Enums']["field_status"] | null,"verified_at"?: string,"verified_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_field_provenance_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "opportunity_field_provenance_run_fk"
      columns: ["extraction_run_id"]
isOneToOne: false
      referencedRelation: "extraction_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_field_provenance_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_sources": {
                  Row: {
                    "created_at": string,"credibility": Database["public"]['Enums']["credibility_level"] | null,"credibility_reason": string | null,"credibility_set_by": string | null,"domain": string,"id": string,"is_primary": boolean,"last_check_outcome": string | null,"last_checked_at": string | null,"last_content_hash": string | null,"monitor": boolean,"normalized_url": string,"opportunity_id": string,"url": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"credibility"?: Database["public"]['Enums']["credibility_level"] | null,"credibility_reason"?: string | null,"credibility_set_by"?: string | null,"domain": string,"id"?: string,"is_primary"?: boolean,"last_check_outcome"?: string | null,"last_checked_at"?: string | null,"last_content_hash"?: string | null,"monitor"?: boolean,"normalized_url": string,"opportunity_id": string,"url": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"credibility"?: Database["public"]['Enums']["credibility_level"] | null,"credibility_reason"?: string | null,"credibility_set_by"?: string | null,"domain"?: string,"id"?: string,"is_primary"?: boolean,"last_check_outcome"?: string | null,"last_checked_at"?: string | null,"last_content_hash"?: string | null,"monitor"?: boolean,"normalized_url"?: string,"opportunity_id"?: string,"url"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_sources_credibility_set_by_fkey"
      columns: ["credibility_set_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_sources_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
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
            "accept_extraction":
{ Args: { "p_accepted": Json,"p_dates": Json,"p_fields": Json,"p_run": string }; Returns: string
                           },
"accept_workspace_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"complete_extraction_run":
{ Args: { "p_content_hash_hex": string,"p_content_type": string,"p_error_code": string,"p_fields": Json,"p_final_url": string,"p_http_status": number,"p_run": string,"p_status": string,"p_thin": boolean }; Returns: undefined
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
                           },
"save_opportunity":
{ Args: { "p_dates"?: Json,"p_fields": Json,"p_id": string,"p_source_url"?: string }; Returns: string
                           },
"start_extraction_run":
{ Args: { "p_url": string }; Returns: Json
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
