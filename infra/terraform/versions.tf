# =============================================================================
# Terraform and provider versions
#
# bpg/proxmox talks to the Proxmox VE API with an API token. Run
# `terraform init` once; it writes .terraform.lock.hcl (commit that file) so
# everyone gets the same provider version.
# =============================================================================

terraform {
  required_version = ">= 1.6"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = ">= 0.70.0"
    }
  }
}
