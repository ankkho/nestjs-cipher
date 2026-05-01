#!/bin/bash

##############################################################################
# GCP KMS ADC Setup Script
# 
# This script automates the complete GCP KMS infrastructure setup for
# nestjs-cipher encryption examples.
#
# Usage:
#   chmod +x setup-gcp-kms.sh
#   ./setup-gcp-kms.sh <project-id> [key-ring] [key-name]
#
# Example:
#   ./setup-gcp-kms.sh my-gcp-project pii-ring tenant-org-acme
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
KEY_RING=${2:-"pii-ring"}
KEY_NAME=${3:-"tenant-org-acme"}
LOCATION="global"

# Validate input
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Project ID is required${NC}"
    echo "Usage: $0 <project-id> [key-ring] [key-name]"
    echo "Example: $0 my-gcp-project pii-ring tenant-org-acme"
    exit 1
fi

PROJECT_ID=$1

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}GCP KMS Setup Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID:  $PROJECT_ID"
echo "  Key Ring:    $KEY_RING"
echo "  Key Name:    $KEY_NAME"
echo "  Location:    $LOCATION"
echo ""

# Step 1: Verify gcloud is authenticated
echo -e "${YELLOW}Step 1: Verifying gcloud authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated with gcloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
echo -e "${GREEN}✅ Authenticated as: $ACCOUNT${NC}"
echo ""

# Step 2: Set project
echo -e "${YELLOW}Step 2: Setting GCP project...${NC}"
gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✅ Project set to: $PROJECT_ID${NC}"
echo ""

# Step 3: Enable Cloud KMS API
echo -e "${YELLOW}Step 3: Enabling Cloud KMS API...${NC}"
if gcloud services enable cloudkms.googleapis.com --project="$PROJECT_ID" 2>/dev/null; then
    echo -e "${GREEN}✅ Cloud KMS API enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Cloud KMS API already enabled or pending activation${NC}"
fi
sleep 2
echo ""

# Step 4: Create key ring
echo -e "${YELLOW}Step 4: Creating key ring '${KEY_RING}'...${NC}"
if gcloud kms keyrings describe "$KEY_RING" --location="$LOCATION" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Key ring '${KEY_RING}' already exists${NC}"
else
    gcloud kms keyrings create "$KEY_RING" \
        --location="$LOCATION" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ Key ring '${KEY_RING}' created${NC}"
fi
echo ""

# Step 5: Create crypto key
echo -e "${YELLOW}Step 5: Creating crypto key '${KEY_NAME}'...${NC}"
if gcloud kms keys describe "$KEY_NAME" \
    --location="$LOCATION" \
    --keyring="$KEY_RING" \
    --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Crypto key '${KEY_NAME}' already exists${NC}"
else
    gcloud kms keys create "$KEY_NAME" \
        --location="$LOCATION" \
        --keyring="$KEY_RING" \
        --purpose=encryption \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ Crypto key '${KEY_NAME}' created${NC}"
fi
echo ""

# Step 6: Verify setup
echo -e "${YELLOW}Step 6: Verifying setup...${NC}"
echo "Keys in key ring '${KEY_RING}':"
gcloud kms keys list \
    --location="$LOCATION" \
    --keyring="$KEY_RING" \
    --project="$PROJECT_ID" \
    --format="table(name.basename(),state,purpose)"
echo ""

# Step 7: Display next steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ GCP KMS Infrastructure Ready!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next: Build and run the example${NC}"
echo ""
echo "  # Build the example"
echo "  pnpm build:example"
echo ""
echo "  # Run with your project"
echo "  GCP_KMS_PROJECT_ID=$PROJECT_ID \\"
echo "  GCP_KMS_KEY_RING=$KEY_RING \\"
echo "  GCP_KMS_LOCATION=$LOCATION \\"
echo "  pnpm example:gcp"
echo ""
