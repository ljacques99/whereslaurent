variable "jwt_secret" {
  description = "Secret for JWT signing"
  type        = string
  sensitive   = true
  default     = "wl-super-secret-jwt-key-change-in-prod-2026"
}

variable "admin_email" {
  description = "Initial admin email"
  type        = string
  default     = "laurent.jacques79@gmail.com"
}

variable "frontend_url" {
  description = "Frontend URL for CORS and magic links"
  type        = string
  default     = "https://whereslaurent.vercel.app"
}

variable "dev_mode" {
  description = "If true, magic link is returned in API response instead of sent by email"
  type        = string
  default     = "true"
}
