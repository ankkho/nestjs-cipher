# GCP KMS — OpenTofu

Provisions the Google Cloud KMS infrastructure used by `nestjs-cipher` for PII encryption. Each tenant gets a single KMS key that protects all of its resources (org, users, etc.).

## Quick Start

Copy `kms.tf` into your existing Tofu module. It assumes your module already defines:

- `var.project_id` — GCP project ID
- `var.environment` — deployment environment (dev, test, stage, prod)
- `var.location` — GCP region or `global`

That's it. The file declares its own variables with sensible defaults.

```hcl
# In your existing module
tofu plan
```

## What Gets Created

| Resource                                             | Purpose                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `google_kms_key_ring.pii`                            | Container for all tenant keys                                        |
| `google_kms_crypto_key.tenant`                       | One key per tenant — covers all tenant resources (default: `["default"]`) |
| `google_project_iam_member.kms_admin`                | Project-level IAM for runtime key creation (default: no-op)          |
| `google_kms_key_ring_iam_member.encrypter_decrypter` | Key ring-level IAM for encrypt/decrypt (default: no-op)              |

## Variables (all optional)

All variables have defaults. Override only what you need.

| Variable                     | Default            | Description                                                                                          |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `tenant_names`               | `["default"]`      | Tenant IDs to pre-provision. One key per tenant covers all its resources. Single-tenant apps keep the default. |
| `kms_service_account_emails` | `[]`               | Service account emails for KMS admin + encrypter/decrypter roles. Required for runtime key creation. |
| `kms_key_rotation_period`    | `"7776000s"` (90d) | Automatic rotation period.                                                                           |
| `kms_protection_level`       | `"SOFTWARE"`       | `SOFTWARE` ($0.06/key/mo) or `HSM` ($1.00/key/mo).                                                   |

## Single-Tenant vs Multi-Tenant

### Single-tenant (default)

No configuration needed. The library uses a single `default` key for all resources.

```hcl
# No overrides — defaults work
```

### Multi-tenant

Pre-provision known tenants. Each tenant gets one key that protects all its resources (org, users, etc.). New tenants are auto-created at runtime.

```hcl
# In your .tfvars
tenant_names = ["org-acme", "org-globex", "org-initech"]
```

### Runtime key creation (SaaS)

For apps where tenants are created at runtime, grant both roles so the library can create keys and encrypt/decrypt:

```hcl
# In your .tfvars
kms_service_account_emails = ["cipher@my-project.iam.gserviceaccount.com"]
```

This grants two roles:

| Role                                         | Scope    | Permission                                          |
| -------------------------------------------- | -------- | --------------------------------------------------- |
| `roles/cloudkms.admin`                       | Project  | `cloudkms.cryptoKeys.create` (runtime key creation) |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Key Ring | `useToEncrypt` / `useToDecrypt` (all keys in ring)  |

Without these, auto-creation fails with `PERMISSION_DENIED`.

## Outputs

```bash
tofu output key_ring_id    # Full resource ID of the key ring
tofu output key_ring_name  # Name of the key ring
tofu output crypto_key_ids # Map of tenant → key resource ID
```

## Cost

| Protection | Key / Month |
| ---------- | ----------- |
| SOFTWARE   | ~$0.06      |
| HSM        | ~$1.00      |

Key versions created during rotation are billed until destroyed.

## Notes

- Key ring cannot be deleted once created
- KMS keys are soft-deleted on `destroy` with a 30-day scheduled deletion
- Set `prevent_destroy = true` in the `lifecycle` block for production keys
