# =============================================================================
# k8s nodes
#
# Terraform decides which machines exist; Ansible decides what's inside them.
# This file clones the k8s node template into one VM per entry in
# var.k8s_nodes, with its own size, static IP, user and SSH key (cloud-init).
# k3s is installed afterwards by Ansible.
# =============================================================================

provider "proxmox" {
  endpoint  = var.proxmox_endpoint
  api_token = var.proxmox_api_token
  insecure  = var.proxmox_insecure
}

resource "proxmox_virtual_environment_vm" "k8s_node" {
  for_each = var.k8s_nodes

  # ---------------------------------------------------------------------------
  # Identity (naming: docs/architecture.md, "VMs and templates")
  # ---------------------------------------------------------------------------

  name        = "castor-k8s-node-${each.key}"
  vm_id       = 200 + tonumber(each.key)
  node_name   = var.proxmox_node
  pool_id     = var.pool
  tags        = ["castor", "k8s"]
  description = "Castor k8s node. Managed by Terraform (infra/terraform): change it there, not in the UI."

  # Full clone: the node keeps working if the template is rebuilt or removed.
  clone {
    vm_id = var.k8s_node_template_vmid
    full  = true
  }

  started = true
  on_boot = true # start with the Proxmox host

  # ---------------------------------------------------------------------------
  # Hardware
  # ---------------------------------------------------------------------------

  cpu {
    cores = each.value.cores
    type  = "host"
  }

  memory {
    dedicated = each.value.memory_mb
  }

  # Same interface as the template's disk, so this resizes it.
  disk {
    datastore_id = var.storage
    interface    = "scsi0"
    size         = each.value.disk_gb
    discard      = "on"
  }

  network_device {
    bridge = var.bridge
  }

  # Baked into the template; lets Proxmox and Terraform read the VM's IP.
  agent {
    enabled = true
  }

  operating_system {
    type = "l26"
  }

  serial_device {}

  # ---------------------------------------------------------------------------
  # First boot (cloud-init)
  # ---------------------------------------------------------------------------

  initialization {
    datastore_id = var.storage

    ip_config {
      ipv4 {
        address = each.value.ip_cidr
        gateway = var.gateway
      }
    }

    dns {
      servers = var.dns_servers
    }

    user_account {
      username = var.ssh_user
      keys     = [trimspace(file(pathexpand(var.ssh_public_key_file)))]
    }
  }
}
