# castor infra/ansible

Builds the VM templates on the Proxmox host. Templates are built once and rebuilt only when they need to change (OS patches, new Docker version, new worker agent). Cloning them is someone else's job:

| Template | VMID | Contents | Built by | Cloned by |
|---|---|---|---|---|
| k8s node template, `castor-k8s-node-template` | 9000 | Ubuntu 24.04 + cloud-init + qemu-guest-agent | `playbooks/k8s-node-template.yml` | Terraform, for the k8s nodes |
| ephemeral worker template, `castor-ephemeral-worker-template` | 9001 | k8s node template + Docker + worker agent | Not written yet | The dispatcher, one ephemeral worker per job |

Terms, names, VMID ranges and tags follow `docs/architecture.md`, "VMs and templates".

## Layout

| Path | What |
|---|---|
| `ansible.cfg` | Points at `inventory.ini`, readable output |
| `inventory.example.ini` | Copy to `inventory.ini` (git-ignored) and set the Proxmox host address |
| `group_vars/proxmox.yml` | Settings: storage, bridge, template VMIDs and names, Ubuntu image URL |
| `playbooks/k8s-node-template.yml` | Builds the k8s node template |

## Requirements

On your laptop:

- `ansible-core` 2.15 or newer: `brew install ansible` (macOS) or `pipx install ansible-core`
- SSH access to the Proxmox host as root with your key: `ssh root@<host>` must work without a password

On the Proxmox host:

- Proxmox VE 8 (uses `qm set --scsi0 ...,import-from=`, available since 7.2)
- Internet access, to download the Ubuntu image and `libguestfs-tools`

## First run

```bash
cd infra/ansible
cp inventory.example.ini inventory.ini
```

Edit `inventory.ini`: set `ansible_host` to your Proxmox host's IP.

Check the storage and bridge names on the host match `group_vars/proxmox.yml`:

```bash
ssh root@<host> pvesm status             # storage, default local-lvm
ssh root@<host> 'ip -br link | grep vmbr' # bridge, default vmbr0
```

Check Ansible can reach the host:

```bash
ansible proxmox -m ping
```

Build the k8s node template:

```bash
ansible-playbook playbooks/k8s-node-template.yml
```

## What the k8s node template playbook does

1. Stops if VM `9000` already exists (unless `-e rebuild=true`).
2. Installs `libguestfs-tools` on the host (for `virt-customize`).
3. Downloads the Ubuntu 24.04 cloud image to `/var/lib/vz/template/cache/`, verified against Canonical's `SHA256SUMS`. Kept for rebuilds.
4. On a scratch copy: installs and enables `qemu-guest-agent`, empties `/etc/machine-id` so every clone gets its own identity (and DHCP lease).
5. Creates VM `9000` named `castor-k8s-node-template`, tagged `castor;template`: 2 cores, 2 GB, virtio NIC on `vmbr0`, serial console, guest agent on.
6. Imports the image as the boot disk, attaches a cloud-init drive (DHCP by default).
7. Converts the VM to a template and deletes the scratch copy.

Clones set their own CPU, memory, disk size, user, SSH key and IP through Terraform and cloud-init.

## Commands

| Command | What it does |
|---|---|
| `ansible proxmox -m ping` | Check SSH access to the host |
| `ansible-playbook playbooks/k8s-node-template.yml` | Build the k8s node template (skips if it exists) |
| `ansible-playbook playbooks/k8s-node-template.yml -e rebuild=true` | Destroy and rebuild it (fails if linked clones of it still exist) |
| `ansible-playbook playbooks/k8s-node-template.yml --check` | Dry run: show what would change. The `qm` steps are skipped in check mode. |
| `ansible-playbook playbooks/k8s-node-template.yml -e k8s_node_template_vmid=9100` | Override any setting from `group_vars/proxmox.yml` |

## Useful checks

On the Proxmox host:

```bash
qm config 9000                 # template settings: disk, cloud-init drive, agent, tags
qm list | grep castor          # templates and VMs
ls -lh /var/lib/vz/template/cache/
```

Test a throwaway clone (then delete it):

```bash
qm clone 9000 9999 --name castor-test-clone --full
qm set 9999 --ciuser ubuntu --sshkeys ~/.ssh/authorized_keys
qm start 9999
qm agent 9999 network-get-interfaces   # works once the guest agent is up
qm stop 9999 && qm destroy 9999 --purge
```
