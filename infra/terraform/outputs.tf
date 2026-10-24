# =============================================================================
# Outputs: how to reach each k8s node
# =============================================================================

output "k8s_nodes" {
  description = "Each k8s node's VMID, IP and SSH command."
  value = {
    for key, vm in proxmox_virtual_environment_vm.k8s_node : vm.name => {
      vmid = vm.vm_id
      ip   = split("/", var.k8s_nodes[key].ip_cidr)[0]
      ssh  = "ssh ${var.ssh_user}@${split("/", var.k8s_nodes[key].ip_cidr)[0]}"
    }
  }
}
