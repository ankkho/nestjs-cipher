# GCP KMS Emulator Example with ADC

This example demonstrates using `nestjs-cipher` with **GCP Cloud KMS** via the **gcp-kms-emulator**, using Application Default Credentials (ADC).

## Prerequisites

1. **Docker** or **Podman** (for running the emulator)
2. **Node.js 24.15.0+** and **pnpm 10.32.0+**

## Setup

### 1. Start the GCP KMS Emulator

Using Docker:
```bash
docker run -d -p 9090:9090 \
  -e PUBSUB_PROJECT_ID=test-project \
  -e KMS_GCLOUD_SDK_COMPATIBILITY_MODE=true \
  gcr.io/gcloud-release/cloud-kms:latest
```

Or using Podman:
```bash
podman run -d -p 9090:9090 \
  -e PUBSUB_PROJECT_ID=test-project \
  -e KMS_GCLOUD_SDK_COMPATIBILITY_MODE=true \
  gcr.io/gcloud-release/cloud-kms:latest
```

Verify the emulator is running:
```bash
curl http://localhost:9090
```

### 2. Configure ADC

Point to the emulator using the `PUBSUB_EMULATOR_HOST` environment variable:

```bash
export PUBSUB_EMULATOR_HOST=localhost:9090
export PUBSUB_PROJECT_ID=test-project
export GCP_KMS_PROJECT_ID=test-project
export GCP_KMS_KEY_RING=pii-ring
export GCP_KMS_LOCATION=global
```

Or use the `.env.gcp` file:
```bash
cp .env.gcp.example .env.gcp
source .env.gcp
```

### 3. Create KMS Key Ring (One-time)

```bash
# Using gcloud CLI (requires setup)
gcloud kms keyrings create pii-ring --location=global --project=test-project

# Or use the emulator directly
curl -X POST http://localhost:9090/v1/projects/test-project/locations/global/keyRings \
  -H "Content-Type: application/json" \
  -d '{"id": "pii-ring"}'
```

### 4. Run the Example

```bash
# Build example
pnpm build:example

# Run with GCP KMS emulator
PUBSUB_EMULATOR_HOST=localhost:9090 \
  GCP_KMS_PROJECT_ID=test-project \
  GCP_KMS_KEY_RING=pii-ring \
  GCP_KMS_LOCATION=global \
  pnpm example:gcp
```

## What Happens

1. **Module initialization**: Connects to GCP KMS emulator via ADC
2. **Encryption**: Generates DEK, encrypts data locally, wraps DEK with KMS
3. **Logging**: Displays encrypted payload (v, ciphertext, wrappedDek, iv, tag)
4. **Decryption**: Unwraps DEK from KMS, decrypts payload
5. **Verification**: Confirms decrypted data matches original

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `PUBSUB_EMULATOR_HOST` | Emulator endpoint | `localhost:9090` |
| `GCP_KMS_PROJECT_ID` | GCP project ID | `test-project` |
| `GCP_KMS_KEY_RING` | KMS key ring name | `pii-ring` |
| `GCP_KMS_LOCATION` | KMS location | `global` or `us-central1` |

## References

- [gcp-kms-emulator](https://github.com/blackwell-systems/gcp-kms-emulator)
- [Google Cloud KMS](https://cloud.google.com/kms)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
