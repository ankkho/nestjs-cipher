# ─── nestjs-cipher KMS ────────────────────────────────────────────────────────
# Copy this file into your Tofu module. It provisions:
#   - KMS key ring
#   - One crypto key per tenant (pre-provisioned)
#   - Project-level IAM for runtime key creation (optional)
#   - Key ring-level IAM for encrypt/decrypt (optional)
#
# Required variables from your root module:
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
  description = "Service account emails to grant KMS permissions. Required for runtime key creation and encrypt/decrypt. Leave empty if all tenants are pre-provisioned."
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

# ─── Crypto Keys ──────────────────────────────────────────────────────────────
# One key per tenant. The library also auto-creates keys at runtime
# for any tenant not listed here (requires kms_service_account_emails).

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
    prevent_destroy = false # Set to true for prod before applying
  }
}

# ─── IAM: Project-level KMS Admin (for runtime key creation) ──────────────────
# Required because the library creates per-tenant crypto keys dynamically.
# KeyRing IAM only supports: viewer, cryptoKeyEncrypterDecrypter, signerVerifier.
# roles/cloudkms.cryptoKeyAdmin is NOT a valid KeyRing IAM role.
# roles/cloudkms.admin at the project level grants cryptoKeys.create.
# No-op when kms_service_account_emails is empty.

resource "google_project_iam_member" "kms_admin" {
  for_each = toset(var.kms_service_account_emails)

  project = var.project_id
  role    = "roles/cloudkms.admin"
  member  = "serviceAccount:${each.value}"
}

# ─── IAM: Key Ring Encrypter/Decrypter ────────────────────────────────────────
# Grants useToEncrypt/useToDecrypt on ALL crypto keys in the ring — including
# dynamically created per-tenant keys (tenant-<uuid>).
# roles/cloudkms.cryptoKeyEncrypterDecrypter at the key ring level covers:
#   - cloudkms.cryptoKeyVersions.useToEncrypt
#   - cloudkms.cryptoKeyVersions.useToDecrypt
#   - cloudkms.cryptoKeys.get
# No-op when kms_service_account_emails is empty.

resource "google_kms_key_ring_iam_member" "encrypter_decrypter" {
  for_each = toset(var.kms_service_account_emails)

  key_ring_id = google_kms_key_ring.pii.id
  role        = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member      = "serviceAccount:${each.value}"
}
