variable "project_id" {
  type        = string
  nullable    = false
  description = "GCP project ID. Set via TF_VAR_project_id env var."
}

variable "region" {
  type        = string
  description = "GCP region for the provider"
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "test", "stage", "prod"], var.environment)
    error_message = "Must be one of: dev, test, stage, prod."
  }
}

variable "location" {
  type        = string
  description = "KMS key ring location. Use 'global' or a region (e.g. 'us-central1') for data residency."
  default     = "global"
}

variable "tenant_names" {
  type        = list(string)
  description = "Tenant identifiers. One crypto key is created per tenant. Use [\"default\"] for single-tenant apps."

  validation {
    condition     = length(var.tenant_names) > 0
    error_message = "tenant_names must contain at least one entry."
  }
}

variable "protection_level" {
  type        = string
  description = "SOFTWARE ($0.06/key/month) or HSM ($1.00/key/month, hardware-backed)."
  default     = "SOFTWARE"

  validation {
    condition     = contains(["SOFTWARE", "HSM"], var.protection_level)
    error_message = "Must be SOFTWARE or HSM."
  }
}

variable "key_rotation_period" {
  type        = string
  description = "Automatic rotation period. Old versions remain usable for decryption. Format: Ns (e.g. 7776000s = 90d)."
  default     = "7776000s"
}

variable "labels" {
  type        = map(string)
  description = "Additional labels to merge onto all resources (e.g. team, cost-center)."
  default     = {}
}
