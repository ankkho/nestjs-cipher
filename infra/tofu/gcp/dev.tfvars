# project_id — set via: export TF_VAR_project_id=<your-project-id>
environment         = "dev"
location            = "global"
tenant_names        = ["org-acme"]

# Cost-optimised: software-backed, slow rotation
protection_level    = "SOFTWARE"
key_rotation_period = "31536000s"  # 1 year

labels = {
  team        = "platform"
  cost-center = "engineering"
}
