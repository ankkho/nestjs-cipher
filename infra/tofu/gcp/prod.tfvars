# project_id — set via: export TF_VAR_project_id=<your-project-id>
environment         = "prod"
location            = "us-central1"  # Regional for data residency compliance

tenant_names = ["org-acme"]

# HSM: hardware-backed, FIPS 140-2 Level 3 — required for production PII
protection_level    = "HSM"
key_rotation_period = "7776000s"  # 90 days

labels = {
  team        = "platform"
  cost-center = "engineering"
}
