output "key_ring_id" {
  value       = google_kms_key_ring.pii.id
  description = "Full resource ID of the KMS key ring"
}

output "key_ring_name" {
  value       = google_kms_key_ring.pii.name
  description = "Name of the KMS key ring"
}

output "crypto_key_ids" {
  value = {
    for tenant, key in google_kms_crypto_key.tenant : tenant => key.id
  }
  description = "Crypto key resource IDs per tenant"
}

# Ready-to-use env vars for nestjs-cipher configuration
output "app_env_vars" {
  value = {
    GCP_KMS_PROJECT_ID = var.project_id
    GCP_KMS_KEY_RING   = google_kms_key_ring.pii.name
    GCP_KMS_LOCATION   = var.location
  }
  description = "Environment variables to configure nestjs-cipher GCP_KMS provider"
}
