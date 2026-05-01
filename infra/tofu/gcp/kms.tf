
# ─── Key Ring ─────────────────────────────────────────────────────────────────
# Container that groups all KMS keys for this environment.
# Key rings cannot be deleted once created.

resource "google_kms_key_ring" "pii" {
  name     = "nestjs-cipher-${var.environment}"
  location = var.location

  depends_on = [google_project_service.kms]
}

# ─── Crypto Keys (Master Keys) ────────────────────────────────────────────────
# One key per tenant. The application wraps/unwraps its DEK against this key.
#
# Cost:
#   SOFTWARE — $0.06 / active key version / month  (dev, test, stage)
#   HSM      — $1.00 / active key version / month  (prod)
#
# Key versions created during rotation are billed until destroyed.

resource "google_kms_crypto_key" "tenant" {
  for_each = toset(var.tenant_names)

  name     = "tenant-${each.value}"
  key_ring = google_kms_key_ring.pii.id
  purpose  = "ENCRYPT_DECRYPT"

  rotation_period = var.key_rotation_period

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = var.protection_level
  }

  labels = local.labels

  lifecycle {
    prevent_destroy = false  # Set to true manually for prod before applying
  }
}
