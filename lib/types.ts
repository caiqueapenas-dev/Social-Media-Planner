export type UserRole = "admin" | "client";

export type PostStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "published"
  | "refactor";

// ... (resto do arquivo sem alterações)
export type PostType = "photo" | "carousel" | "reel" | "story";
export type Platform = "instagram" | "facebook";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  user_id: string;
  brand_color: string;
  is_active: boolean;
  avatar_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  client_id: string;
  caption: string;
  scheduled_date: string;
  status: PostStatus;
  post_type: PostType;
  platforms: Platform[];
  media_urls: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  edit_history?: EditHistory[];
}

export interface EditHistory {
  id: string;
  post_id: string;
  edited_by: string;
  changes: Record<string, any>;
  created_at: string;
}

export interface CaptionTemplate {
  id: string;
  admin_id: string;
  client_id?: string;
  client?: Client;
  title: string;
  content: string;
  created_at: string;
}

export interface HashtagGroup {
  id: string;
  admin_id: string;
  client_id?: string;
  client?: Client;
  title: string;
  hashtags: string[];
  created_at: string;
}

export interface SpecialDate {
  id: string;
  client_id: string;
  title: string;
  date: string;
  description?: string;
  recurrent?: boolean;
  created_at: string;
}

export interface Insight {
  id: string;
  client_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
  type?: "comment" | "alteration_request";
  status?: "pending" | "completed";
}
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  company_name?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}
