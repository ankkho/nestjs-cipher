# project_id — set via: export TF_VAR_project_id=<your-project-id>
environment         = "stage"
location            = "global"
tenant_names        = ["org-acme"]

# Software-backed is fine for staging; 90-day rotation mirrors prod
protection_level    = "SOFTWARE"
key_rotation_period = "7776000s"  # 90 days

labels = {
  team        = "platform"
  cost-center = "engineering"
}
