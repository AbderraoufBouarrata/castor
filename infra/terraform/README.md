# castor infra/terraform

Creates the **k8s nodes**: clones the k8s node template (VMID 9000, built by Ansible) into one VM per entry in `k8s_nodes`, with its own size, static IP, login user and SSH key.

Terraform decides **which machines exist**. What runs inside them (k3s) is installed afterwards by Ansible. Ephemeral workers are not here: the dispatcher creates and destroys those per job.

| Key in `k8s_nodes` | VM name | VMID | Pool | Tags |
|---|---|---|---|---|
| `"01"` | `castor-k8s-node-01` | 201 | `castor` | `castor`, `k8s` |
| `"02"` (later) | `castor-k8s-node-02` | 202 | `castor` | `castor`, `k8s` |

Naming and VMID ranges: `docs/architecture.md`, "VMs and templates".

## Layout

| File | What |
|---|---|
| `versions.tf` | Terraform and `bpg/proxmox` provider versions |
| `variables.tf` | Every input, with defaults |
| `main.tf` | Provider and the k8s node VMs |
| `outputs.tf` | Each node's VMID, IP and SSH command |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` (git-ignored) and fill in |
| `secrets.auto.tfvars` | API token. Written by Ansible, git-ignored, never edit by hand. |

## Requirements

- Terraform 1.6 or newer: `brew install terraform` (or OpenTofu: `brew install opentofu`, use `tofu` instead of `terraform`)
- The k8s node template (VMID 9000): `infra/ansible`, `playbooks/k8s-node-template.yml`
- Terraform's Proxmox user, role and API token: `infra/ansible`, `playbooks/terraform-access.yml` (writes `secrets.auto.tfvars` here)
- An SSH key on your laptop, `~/.ssh/id_ed25519.pub` by default
- A free static IP on your LAN for each node, outside your router's DHCP range

## Permissions

Terraform logs in as `terraform@pve` with a privilege-separated API token. The role `CastorTerraform` applies only to:

| Path | Why |
|---|---|
| `/pool/castor` | Clone the template, create and manage Castor VMs |
| `/storage/local-lvm` | Disks and cloud-init drives |
| `/sdn/zones/localnetwork/vmbr0` | Plug the VM's network card into the bridge |
| `/nodes/pve` | Read node status |

It cannot see or touch any VM outside the `castor` pool. The exact privileges are in `infra/ansible/group_vars/proxmox.yml` (`terraform_privileges`).

## First run

1. Create Terraform's token (once). From `infra/ansible`:
   ```bash
   ansible-playbook playbooks/terraform-access.yml
   ```
   This writes `infra/terraform/secrets.auto.tfvars`.

2. Settings:
   ```bash
   cd infra/terraform
   cp terraform.tfvars.example terraform.tfvars
   ```
   Fill in `proxmox_endpoint`, `gateway` and each node's `ip_cidr`.

3. Download the provider (once):
   ```bash
   terraform init
   ```

4. See what will be created, then create it:
   ```bash
   terraform plan
   terraform apply
   ```

5. Log in:
   ```bash
   terraform output k8s_nodes
   ssh castor@192.168.1.201
   ```

## Commands

| Command | What it does |
|---|---|
| `terraform init` | Download the provider. Once, and after changing `versions.tf`. |
| `terraform plan` | Show what would change. Changes nothing. |
| `terraform apply` | Create or update the k8s nodes to match the files |
| `terraform output k8s_nodes` | VMID, IP and SSH command per node |
| `terraform destroy` | Delete every k8s node Terraform created. Asks first. |
| `terraform destroy -target='proxmox_virtual_environment_vm.k8s_node["02"]'` | Delete one node |

Change nodes only here, not in the Proxmox UI: a change made in the UI shows up as drift in the next `plan`, and `apply` puts it back.

## Adding a node

Add a key to `k8s_nodes` in `terraform.tfvars`:

```hcl
k8s_nodes = {
  "01" = { ip_cidr = "192.168.1.201/24" }
  "02" = { ip_cidr = "192.168.1.202/24" }
}
```

Then `terraform apply`.

## State

`terraform.tfstate` is Terraform's record of what it created. It lives here on your laptop, is git-ignored, and contains the API token and VM details: don't share it, and don't delete it (Terraform would forget the nodes exist). Moving it to a remote backend comes later, when more than one machine runs Terraform.

## Useful checks

On the Proxmox host:

```bash
qm list | grep castor-k8s-node
qm config 201
pvesh get /pools/castor
```

On the node:

```bash
ssh castor@192.168.1.201 'hostname; ip -br addr; systemctl is-active qemu-guest-agent'
```
