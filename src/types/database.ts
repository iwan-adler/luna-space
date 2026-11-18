
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
                },"calendar_events": {
                  Row: {
                    "all_day": boolean,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"description": string | null,"end_date": string | null,"ends_at": string | null,"exdates": (string)[],"id": string,"kind": Database["public"]['Enums']["event_kind"],"location": string | null,"opportunity_id": string | null,"owner_id": string | null,"project_id": string | null,"reminder_offsets": (number)[],"rrule": string | null,"start_date": string | null,"starts_at": string | null,"timezone": string | null,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"end_date"?: string | null,"ends_at"?: string | null,"exdates"?: (string)[],"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"opportunity_id"?: string | null,"owner_id"?: string | null,"project_id"?: string | null,"reminder_offsets"?: (number)[],"rrule"?: string | null,"start_date"?: string | null,"starts_at"?: string | null,"timezone"?: string | null,"title": string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"end_date"?: string | null,"ends_at"?: string | null,"exdates"?: (string)[],"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"opportunity_id"?: string | null,"owner_id"?: string | null,"project_id"?: string | null,"reminder_offsets"?: (number)[],"rrule"?: string | null,"start_date"?: string | null,"starts_at"?: string | null,"timezone"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "calendar_events_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "calendar_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_feed_tokens": {
                  Row: {
                    "created_at": string,"last_used_at": string | null,"token_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"last_used_at"?: string | null,"token_hash": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"last_used_at"?: string | null,"token_hash"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_feed_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_read_state": {
                  Row: {
                    "last_read_at": string,"last_read_message_id": string | null,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "last_read_at"?: string,"last_read_message_id"?: string | null,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "last_read_at"?: string,"last_read_message_id"?: string | null,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_read_state_last_read_message_id_fkey"
      columns: ["last_read_message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_read_state_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_read_state_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_items": {
                  Row: {
                    "assignee_id": string | null,"checklist_id": string,"client_id": string | null,"done_at": string | null,"done_by": string | null,"due_date": string | null,"for_user_id": string | null,"id": string,"is_done": boolean,"label": string,"position": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"checklist_id": string,"client_id"?: string | null,"done_at"?: string | null,"done_by"?: string | null,"due_date"?: string | null,"for_user_id"?: string | null,"id"?: string,"is_done"?: boolean,"label": string,"position"?: number,"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"checklist_id"?: string,"client_id"?: string | null,"done_at"?: string | null,"done_by"?: string | null,"due_date"?: string | null,"for_user_id"?: string | null,"id"?: string,"is_done"?: boolean,"label"?: string,"position"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_items_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_items_checklist_id_workspace_id_fkey"
      columns: ["checklist_id","workspace_id"]
isOneToOne: false
      referencedRelation: "checklists"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "checklist_items_done_by_fkey"
      columns: ["done_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_items_for_user_id_fkey"
      columns: ["for_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"checklists": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"guest_visible": boolean,"id": string,"project_id": string | null,"template_id": string | null,"title": string,"trip_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"guest_visible"?: boolean,"id"?: string,"project_id"?: string | null,"template_id"?: string | null,"title": string,"trip_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"guest_visible"?: boolean,"id"?: string,"project_id"?: string | null,"template_id"?: string | null,"title"?: string,"trip_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklists_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "checklists_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklists_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
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
                },"files": {
                  Row: {
                    "bucket": string,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"file_name": string,"guest_visible": boolean,"id": string,"message_id": string | null,"mime_type": string,"owner_id": string | null,"project_id": string | null,"sha256": string | null,"size_bytes": number,"storage_path": string,"task_id": string | null,"upload_state": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket"?: string,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"file_name": string,"guest_visible"?: boolean,"id"?: string,"message_id"?: string | null,"mime_type": string,"owner_id"?: string | null,"project_id"?: string | null,"sha256"?: string | null,"size_bytes": number,"storage_path": string,"task_id"?: string | null,"upload_state"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"file_name"?: string,"guest_visible"?: boolean,"id"?: string,"message_id"?: string | null,"mime_type"?: string,"owner_id"?: string | null,"project_id"?: string | null,"sha256"?: string | null,"size_bytes"?: number,"storage_path"?: string,"task_id"?: string | null,"upload_state"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_message_id_workspace_id_fkey"
      columns: ["message_id","workspace_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "files_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "files_task_id_workspace_id_fkey"
      columns: ["task_id","workspace_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "files_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"message_reactions": {
                  Row: {
                    "created_at": string,"emoji": string,"message_id": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"emoji": string,"message_id": string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"emoji"?: string,"message_id"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_reactions_message_id_workspace_id_fkey"
      columns: ["message_id","workspace_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "message_reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"client_id": string | null,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"kind": string,"metadata": NonNullable<Json>,"project_id": string | null,"reply_to_id": string | null,"search": unknown,"sender_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"client_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: string,"metadata"?: NonNullable<Json>,"project_id"?: string | null,"reply_to_id"?: string | null,"search"?: never,"sender_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "body"?: string | null,"client_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: string,"metadata"?: NonNullable<Json>,"project_id"?: string | null,"reply_to_id"?: string | null,"search"?: never,"sender_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "messages_reply_to_id_workspace_id_fkey"
      columns: ["reply_to_id","workspace_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "body_md": string,"client_id": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"folder_id": string | null,"guest_visible": boolean,"id": string,"kind": string,"owner_id": string | null,"pinned": boolean,"project_id": string | null,"search": unknown,"tags": (string)[],"title": string,"updated_at": string,"updated_by": string | null,"version": number,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md"?: string,"client_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"folder_id"?: string | null,"guest_visible"?: boolean,"id"?: string,"kind"?: string,"owner_id"?: string | null,"pinned"?: boolean,"project_id"?: string | null,"search"?: never,"tags"?: (string)[],"title": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "body_md"?: string,"client_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"folder_id"?: string | null,"guest_visible"?: boolean,"id"?: string,"kind"?: string,"owner_id"?: string | null,"pinned"?: boolean,"project_id"?: string | null,"search"?: never,"tags"?: (string)[],"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "notes_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "deadline_reminder_days": (number)[],"email_enabled": boolean,"lockscreen_details": boolean,"push_enabled": boolean,"quiet_end": string,"quiet_start": string,"timed_reminder_minutes": (number)[],"type_settings": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deadline_reminder_days"?: (number)[],"email_enabled"?: boolean,"lockscreen_details"?: boolean,"push_enabled"?: boolean,"quiet_end"?: string,"quiet_start"?: string,"timed_reminder_minutes"?: (number)[],"type_settings"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "deadline_reminder_days"?: (number)[],"email_enabled"?: boolean,"lockscreen_details"?: boolean,"push_enabled"?: boolean,"quiet_end"?: string,"quiet_start"?: string,"timed_reminder_minutes"?: (number)[],"type_settings"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"created_at": string,"dedupe_key": string,"entity_id": string | null,"entity_type": string | null,"id": string,"link_path": string | null,"pushed_at": string | null,"read_at": string | null,"recipient_id": string,"title": string,"type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"dedupe_key": string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link_path"?: string | null,"pushed_at"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string,"type": string,"workspace_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"dedupe_key"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"link_path"?: string | null,"pushed_at"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_workspace_id_fkey"
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
                },"project_guest_invitations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"expires_at": string,"id": string,"label": string | null,"last_used_at": string | null,"max_uses": number | null,"project_id": string,"revoked_at": string | null,"revoked_by": string | null,"role": Database["public"]['Enums']["guest_role"],"token_hash": string,"use_count": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at": string,"id"?: string,"label"?: string | null,"last_used_at"?: string | null,"max_uses"?: number | null,"project_id": string,"revoked_at"?: string | null,"revoked_by"?: string | null,"role"?: Database["public"]['Enums']["guest_role"],"token_hash": string,"use_count"?: number,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"id"?: string,"label"?: string | null,"last_used_at"?: string | null,"max_uses"?: number | null,"project_id"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null,"role"?: Database["public"]['Enums']["guest_role"],"token_hash"?: string,"use_count"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_guest_invitations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_guest_invitations_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "project_guest_invitations_revoked_by_fkey"
      columns: ["revoked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"project_guest_memberships": {
                  Row: {
                    "id": string,"invitation_id": string | null,"joined_at": string,"project_id": string,"removal_reason": string | null,"removed_at": string | null,"removed_by": string | null,"role": Database["public"]['Enums']["guest_role"],"role_changed_at": string | null,"role_changed_by": string | null,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"invitation_id"?: string | null,"joined_at"?: string,"project_id": string,"removal_reason"?: string | null,"removed_at"?: string | null,"removed_by"?: string | null,"role": Database["public"]['Enums']["guest_role"],"role_changed_at"?: string | null,"role_changed_by"?: string | null,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "id"?: string,"invitation_id"?: string | null,"joined_at"?: string,"project_id"?: string,"removal_reason"?: string | null,"removed_at"?: string | null,"removed_by"?: string | null,"role"?: Database["public"]['Enums']["guest_role"],"role_changed_at"?: string | null,"role_changed_by"?: string | null,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_guest_memberships_invitation_id_fkey"
      columns: ["invitation_id"]
isOneToOne: false
      referencedRelation: "project_guest_invitations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_guest_memberships_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "project_guest_memberships_removed_by_fkey"
      columns: ["removed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_guest_memberships_role_changed_by_fkey"
      columns: ["role_changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_guest_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"project_guest_settings": {
                  Row: {
                    "collaborators_can_create_tasks": boolean,"collaborators_can_schedule": boolean,"collaborators_can_upload_files": boolean,"guests_see_activity": boolean,"max_guests": number,"project_id": string,"updated_at": string,"viewers_can_comment": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collaborators_can_create_tasks"?: boolean,"collaborators_can_schedule"?: boolean,"collaborators_can_upload_files"?: boolean,"guests_see_activity"?: boolean,"max_guests"?: number,"project_id": string,"updated_at"?: string,"viewers_can_comment"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "collaborators_can_create_tasks"?: boolean,"collaborators_can_schedule"?: boolean,"collaborators_can_upload_files"?: boolean,"guests_see_activity"?: boolean,"max_guests"?: number,"project_id"?: string,"updated_at"?: string,"viewers_can_comment"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_guest_settings_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "project_id": string,"role_label": string | null,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "project_id": string,"role_label"?: string | null,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "project_id"?: string,"role_label"?: string | null,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "project_members_workspace_id_user_id_fkey"
      columns: ["workspace_id","user_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "category": Database["public"]['Enums']["project_category"],"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"end_date": string | null,"id": string,"links": NonNullable<Json>,"name": string,"opportunity_id": string | null,"owner_id": string | null,"repo_urls": (string)[],"search": unknown,"stage": Database["public"]['Enums']["project_stage"],"start_date": string | null,"summary": string | null,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["project_category"],"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"end_date"?: string | null,"id"?: string,"links"?: NonNullable<Json>,"name": string,"opportunity_id"?: string | null,"owner_id"?: string | null,"repo_urls"?: (string)[],"search"?: never,"stage"?: Database["public"]['Enums']["project_stage"],"start_date"?: string | null,"summary"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["project_category"],"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"end_date"?: string | null,"id"?: string,"links"?: NonNullable<Json>,"name"?: string,"opportunity_id"?: string | null,"owner_id"?: string | null,"repo_urls"?: (string)[],"search"?: never,"stage"?: Database["public"]['Enums']["project_stage"],"start_date"?: string | null,"summary"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_opportunity_id_workspace_id_fkey"
      columns: ["opportunity_id","workspace_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "projects_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"failure_count": number,"id": string,"last_success_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"failure_count"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"failure_count"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"reminders": {
                  Row: {
                    "attempts": number,"checklist_item_id": string | null,"created_at": string,"dedupe_key": string,"event_id": string | null,"id": string,"last_error": string | null,"link_path": string,"opportunity_date_id": string | null,"origin": string,"remind_at": string,"sent_at": string | null,"status": string,"task_id": string | null,"title": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"checklist_item_id"?: string | null,"created_at"?: string,"dedupe_key": string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"link_path": string,"opportunity_date_id"?: string | null,"origin": string,"remind_at": string,"sent_at"?: string | null,"status"?: string,"task_id"?: string | null,"title": string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "attempts"?: number,"checklist_item_id"?: string | null,"created_at"?: string,"dedupe_key"?: string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"link_path"?: string,"opportunity_date_id"?: string | null,"origin"?: string,"remind_at"?: string,"sent_at"?: string | null,"status"?: string,"task_id"?: string | null,"title"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_checklist_item_id_fkey"
      columns: ["checklist_item_id"]
isOneToOne: false
      referencedRelation: "checklist_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "calendar_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_opportunity_date_id_fkey"
      columns: ["opportunity_date_id"]
isOneToOne: false
      referencedRelation: "opportunity_dates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"task_comments": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"task_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"task_id": string,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"task_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_comments_task_id_workspace_id_fkey"
      columns: ["task_id","workspace_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"client_id": string | null,"completed_at": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"description": string | null,"due_at": string | null,"due_date": string | null,"due_timezone": string | null,"guest_visible": boolean,"id": string,"owner_id": string | null,"parent_task_id": string | null,"position": number,"priority": Database["public"]['Enums']["task_priority"],"project_id": string | null,"search": unknown,"status": Database["public"]['Enums']["task_status"],"tags": (string)[],"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"client_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"due_at"?: string | null,"due_date"?: string | null,"due_timezone"?: string | null,"guest_visible"?: boolean,"id"?: string,"owner_id"?: string | null,"parent_task_id"?: string | null,"position"?: number,"priority"?: Database["public"]['Enums']["task_priority"],"project_id"?: string | null,"search"?: never,"status"?: Database["public"]['Enums']["task_status"],"tags"?: (string)[],"title": string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"client_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"due_at"?: string | null,"due_date"?: string | null,"due_timezone"?: string | null,"guest_visible"?: boolean,"id"?: string,"owner_id"?: string | null,"parent_task_id"?: string | null,"position"?: number,"priority"?: Database["public"]['Enums']["task_priority"],"project_id"?: string | null,"search"?: never,"status"?: Database["public"]['Enums']["task_status"],"tags"?: (string)[],"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_parent_task_id_workspace_id_fkey"
      columns: ["parent_task_id","workspace_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "tasks_project_id_workspace_id_fkey"
      columns: ["project_id","workspace_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "tasks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"templates": {
                  Row: {
                    "body": NonNullable<Json>,"created_at": string,"created_by": string | null,"id": string,"is_builtin": boolean,"kind": string,"title": string,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_builtin"?: boolean,"kind": string,"title": string,"workspace_id"?: string | null
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_builtin"?: boolean,"kind"?: string,"title"?: string,"workspace_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "templates_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
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
            "calendar_feed": {
                  Row: {
                    "all_day": boolean | null,"end_date": string | null,"ends_at": string | null,"exdates": (string)[] | null,"kind": string | null,"owner_id": string | null,"parent_id": string | null,"rrule": string | null,"source_id": string | null,"source_type": string | null,"start_date": string | null,"starts_at": string | null,"timezone": string | null,"title": string | null,"visibility": Database["public"]['Enums']["visibility"] | null,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "accept_extraction":
{ Args: { "p_accepted": Json,"p_dates": Json,"p_fields": Json,"p_run": string }; Returns: string
                           },
"accept_project_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"accept_workspace_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"calendar_feed_for_token":
{ Args: { "p_token": string }; Returns: {
              "all_day": boolean,"description": string,"end_date": string,"ends_at": string,"exdates": (string)[],"kind": string,"location": string,"parent_id": string,"rrule": string,"source_id": string,"source_type": string,"start_date": string,"starts_at": string,"timezone": string,"title": string,"updated_at": string
            }[]
                           },
"claim_push_batch":
{ Args: { "p_limit"?: number }; Returns: {
              "body": string,"link_path": string,"notification_id": string,"recipient_id": string,"show_details": boolean,"subscriptions": Json,"title": string
            }[]
                           },
"complete_extraction_run":
{ Args: { "p_content_hash_hex": string,"p_content_type": string,"p_error_code": string,"p_fields": Json,"p_final_url": string,"p_http_status": number,"p_run": string,"p_status": string,"p_thin": boolean }; Returns: undefined
                           },
"confirm_upload":
{ Args: { "p_file": string }; Returns: undefined
                           },
"convert_opportunity_to_project":
{ Args: { "p_opportunity": string }; Returns: string
                           },
"create_calendar_feed_token":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"create_checklist_from_template":
{ Args: { "p_project": string,"p_template": string }; Returns: string
                           },
"create_project_invitation":
{ Args: { "p_expires_hours": number,"p_label": string,"p_max_uses": number,"p_project": string,"p_role": Database["public"]['Enums']["guest_role"] }; Returns: Json
                           },
"create_workspace":
{ Args: { "p_name": string }; Returns: string
                           },
"create_workspace_invitation":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"leave_project":
{ Args: { "p_project": string }; Returns: Json
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"mark_chat_read":
{ Args: { "p_message": string }; Returns: undefined
                           },
"project_directory":
{ Args: { "p_project": string }; Returns: {
              "avatar_path": string,"display_name": string,"kind": string,"role": string,"user_id": string
            }[]
                           },
"remove_project_guest":
{ Args: { "p_membership": string }; Returns: Json
                           },
"report_client_error":
{ Args: { "p_app_version": string,"p_error_id": string,"p_message": string,"p_route": string }; Returns: undefined
                           },
"revoke_calendar_feed_token":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"revoke_project_invitation":
{ Args: { "p_invitation": string }; Returns: Json
                           },
"revoke_workspace_invitation":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"save_checklist_as_template":
{ Args: { "p_checklist": string,"p_title": string }; Returns: string
                           },
"save_note":
{ Args: { "p_body": string,"p_id": string,"p_title": string,"p_version": number }; Returns: Json
                           },
"save_opportunity":
{ Args: { "p_dates"?: Json,"p_fields": Json,"p_id": string,"p_source_url"?: string }; Returns: string
                           },
"save_push_subscription":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string,"p_user_agent": string }; Returns: undefined
                           },
"send_test_notification":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"set_guest_role":
{ Args: { "p_membership": string,"p_role": Database["public"]['Enums']["guest_role"] }; Returns: Json
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
