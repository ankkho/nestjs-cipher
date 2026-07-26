# ─── nestjs-cipher KMS ────────────────────────────────────────────────────────
# Copy this file into your Tofu module. It provisions:
#   - KMS key ring
#   - One crypto key per tenant (pre-provisioned)
#   - IAM binding for runtime key creation (optional)
#
# Required variables from your module:
#   var.project_id   — GCP project ID
#   var.environment  — deployment environment (dev, test, stage, prod)
#   var.location     — KMS key ring location (e.g. 'us-central1' or 'global')
#
# The library auto-creates keys at runtime for any tenant not listed here.
# ──────────────────────────────────────────────────────────────────────────────

variable "tenant_names" {
  type        = list(string)
  description = "Tenant IDs to pre-provision keys for. One key per entry. Single-tenant apps use [\"default\"]."
  default     = ["default"]
}

variable "kms_service_account_emails" {
  type        = list(string)
  description = "Service account emails to grant cryptoKeyAdmin on the key ring. Required for runtime key creation. Leave empty if all tenants are pre-provisioned."
  default     = []
}

variable "kms_key_rotation_period" {
  type        = string
  description = "Key rotation period. Format: Ns (e.g. 7776000s = 90 days)."
  default     = "7776000s"
}

variable "kms_protection_level" {
  type        = string
  description = "SOFTWARE ($0.06/key/month) or HSM ($1.00/key/month)."
  default     = "SOFTWARE"

  validation {
    condition     = contains(["SOFTWARE", "HSM"], var.kms_protection_level)
    error_message = "Must be SOFTWARE or HSM."
  }
}

# ─── Key Ring ─────────────────────────────────────────────────────────────────

resource "google_kms_key_ring" "pii" {
  name     = "pii-${var.environment}"
  location = var.location
}

# ─── IAM: Key Ring Admin ──────────────────────────────────────────────────────
# Grants cryptoKeys.create so the library can auto-create keys for new tenants.
# No-op when kms_service_account_emails is empty.

resource "google_kms_key_ring_iam_member" "key_admin" {
  for_each = toset(var.kms_service_account_emails)

  key_ring_id = google_kms_key_ring.pii.id
  role        = "roles/cloudkms.cryptoKeyAdmin"
  member      = "serviceAccount:${each.value}"
}

# ─── Crypto Keys ──────────────────────────────────────────────────────────────
# One key per tenant. The library also auto-creates keys at runtime
# for any tenant not listed here.

resource "google_kms_crypto_key" "tenant" {
  for_each = toset(var.tenant_names)

  name            = "tenant-${each.value}"
  key_ring        = google_kms_key_ring.pii.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = var.kms_key_rotation_period

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = var.kms_protection_level
  }

  lifecycle {
    prevent_destroy = false  # Set to true for prod before applying
  }
}
