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
