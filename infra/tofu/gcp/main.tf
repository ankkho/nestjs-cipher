terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Remote state — recommended for team workflows
  # backend "gcs" {
  #   bucket = "<your-tf-state-bucket>"
  #   prefix = "nestjs-cipher/kms/${var.environment}"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── Shared Labels ────────────────────────────────────────────────────────────
# Base labels merged onto every resource. Extra labels (team, cost-center, etc.)
# come from var.labels and are used for GCP billing cost attribution.

locals {
  labels = merge(
    {
      application = "nestjs-cipher"
      environment = var.environment
      managed-by  = "opentofu"
    },
    var.labels,
  )
}

# ─── APIs ─────────────────────────────────────────────────────────────────────

resource "google_project_service" "kms" {
  project            = var.project_id
  service            = "cloudkms.googleapis.com"
  disable_on_destroy = false
}
