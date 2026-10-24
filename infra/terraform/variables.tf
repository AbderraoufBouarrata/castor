# =============================================================================
# Inputs
#
# Set them in terraform.tfvars (copy terraform.tfvars.example). The API token
# comes from secrets.auto.tfvars, written by the Ansible terraform-access
# playbook. Both files are git-ignored.
# =============================================================================

# -----------------------------------------------------------------------------
# Proxmox connection
# -----------------------------------------------------------------------------

variable "proxmox_endpoint" {
  description = "Proxmox API URL, e.g. https://192.168.100.99:8006/"
  type        = string
}

variable "proxmox_api_token" {
  description = "API token as user@realm!tokenid=secret. Written to secrets.auto.tfvars by Ansible."
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Accept Proxmox's self-signed TLS certificate. Set false once it has a real certificate."
  type        = bool
  default     = true
}

variable "proxmox_node" {
  description = "Proxmox node (host) name, as shown in the UI tree."
  type        = string
  default     = "pve"
}

# -----------------------------------------------------------------------------
# Where Castor lives on Proxmox (docs/architecture.md, "VMs and templates")
# -----------------------------------------------------------------------------

variable "pool" {
  description = "Resource pool every Castor VM joins."
  type        = string
  default     = "castor"
}

variable "k8s_node_template_vmid" {
  description = "VMID of the k8s node template built by Ansible."
  type        = number
  default     = 9000
}

variable "storage" {
  description = "Storage for VM disks and cloud-init drives."
  type        = string
  default     = "local-lvm"
}

variable "bridge" {
  description = "Network bridge the k8s nodes attach to."
  type        = string
  default     = "vmbr0"
}

# -----------------------------------------------------------------------------
# k8s nodes
# -----------------------------------------------------------------------------

variable "k8s_nodes" {
  description = <<-EOT
    k8s nodes to create, keyed by two-digit number. Key "01" becomes
    castor-k8s-node-01 with VMID 201 (200 + number). Add a key to add a node.
  EOT
  type = map(object({
    ip_cidr   = string # static address with prefix, e.g. 192.168.1.201/24
    cores     = optional(number, 2)
    memory_mb = optional(number, 4096)
    disk_gb   = optional(number, 30)
  }))
}

variable "gateway" {
  description = "Default gateway for the k8s nodes (usually your router)."
  type        = string
}

variable "dns_servers" {
  description = "DNS servers for the k8s nodes."
  type        = list(string)
  default     = ["1.1.1.1", "9.9.9.9"]
}

variable "ssh_user" {
  description = "Login user cloud-init creates on each k8s node (passwordless sudo, SSH key only)."
  type        = string
  default     = "castor"
}

variable "ssh_public_key_file" {
  description = "Public key allowed to log in as ssh_user."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}
