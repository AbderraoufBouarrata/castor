# castor infra/ansible

Sets up the Proxmox host for Castor and builds what goes **inside** machines. Terraform (`infra/terraform`) decides which machines exist.

| Playbook | Does | Run |
|---|---|---|
| `playbooks/k8s-node-template.yml` | Builds the k8s node template (VMID 9000) | Once, and to rebuild the template |
| `playbooks/terraform-access.yml` | Gives Terraform its own Proxmox user, role and API token, scoped to Castor | Once, and after changing Terraform's privileges |

Templates are built once and rebuilt only when they need to change (OS patches, new Docker version, new worker agent). Cloning them is someone else's job:

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
| `group_vars/proxmox.yml` | Settings: storage, bridge, pool, template VMIDs and names, Terraform's privileges, Ubuntu image URL |
| `playbooks/k8s-node-template.yml` | Builds the k8s node template |
| `playbooks/terraform-access.yml` | Terraform's user, role, ACLs and API token |
| `playbooks/tasks/pool.yml` | Shared step: create the `castor` pool if missing |

## Requirements

On your laptop:

- `ansible-core` 2.15 or newer: `brew install ansible` (macOS) or `pipx install ansible-core`
- SSH access to the Proxmox host as root with your key: `ssh root@<host>` must work without a password

On the Proxmox host:

- Proxmox VE 8 (uses `qm set --scsi0 ...,import-from=`, available since 7.2)
- Internet access, to download the Ubuntu image and `libguestfs-tools`
- Working apt repositories: no `enterprise.proxmox.com` repo enabled without a subscription. See [Proxmox package repositories](#proxmox-package-repositories) below.

## Proxmox package repositories

The playbook installs `libguestfs-tools` with apt on the Proxmox host. If any enabled repository fails, apt fails and the playbook stops at that task:

```
Failed to fetch https://enterprise.proxmox.com/debian/pbs/dists/trixie/InRelease  401  Unauthorized
```

**Why.** A fresh Proxmox VE install, and a Proxmox Backup Server (PBS) installed on the same host, enable Proxmox's **enterprise** repositories. They only serve hosts with a paid subscription key. Without one, every request gets `401 Unauthorized`: the repo delivers no updates at all, only errors.

Proxmox has three repositories for each product (`pve`, `pbs`, `ceph`):

| Repo | For | What you get |
|---|---|---|
| enterprise | Paying subscribers | Stable releases, promoted after extra time in no-subscription |
| no-subscription | Everyone, free | The same stable releases, a little earlier. Proxmox's recommended choice without a subscription. |
| test (`pvetest`, `pbstest`) | Developers and testers | Unreleased packages. Not this one. |

**Fix, in the Proxmox UI:**

1. Node (e.g. `pve`) → **Updates** → **Repositories**.
2. Select every repository whose URI is `https://enterprise.proxmox.com/...` (`pve-enterprise`, `pbs-enterprise`, `ceph ... enterprise`) and click **Disable**.
3. **Add** → **No-Subscription** for each product you run: Proxmox VE, and Proxmox Backup Server if PBS is installed on this host.
4. **Updates** → **Refresh**: must finish without `401` errors.

**If you use PBS** (backups of your own VMs, game servers, anything): switching the repository does not touch PBS itself. A repository is only where updates come from. Your datastores, backup jobs, schedules and existing backups keep working exactly as before, and PBS starts receiving updates and security fixes again, which it was not getting from the enterprise repo without a subscription.

The UI shows a ⚠️ "The no-subscription repository is NOT production-ready" on these repos. That is Proxmox's standard notice for every non-subscription install; "production" there means business systems under a support contract. The packages are the same released versions.
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

1. Creates the `castor` resource pool if it is missing; uses it as-is if it exists (e.g. created by hand in the UI). Every Castor template and VM joins it.
2. Stops if VM `9000` already exists (unless `-e rebuild=true`).
3. Installs `libguestfs-tools` on the host (for `virt-customize`).
4. Downloads the Ubuntu 24.04 cloud image to `/var/lib/vz/template/cache/`, verified against Canonical's `SHA256SUMS`. Kept for rebuilds.
5. On a scratch copy: installs and enables `qemu-guest-agent`, empties `/etc/machine-id` so every clone gets its own identity (and DHCP lease).
6. Creates VM `9000` named `castor-k8s-node-template` in pool `castor`, tagged `castor;template`: 2 cores, 2 GB, virtio NIC on `vmbr0`, serial console, guest agent on.
7. Imports the image as the boot disk, attaches a cloud-init drive (DHCP by default).
8. Converts the VM to a template and deletes the scratch copy.

Clones set their own CPU, memory, disk size, user, SSH key and IP through Terraform and cloud-init.

## What the Terraform access playbook does

```bash
ansible-playbook playbooks/terraform-access.yml
```

1. Creates the `castor` pool if missing.
2. Creates (or updates) role `CastorTerraform` with exactly the privileges in `terraform_privileges` (Proxmox VE 9 names).
3. Creates user `terraform@pve`, with no password: it can only log in through its token.
4. Creates privilege-separated token `terraform@pve!castor`, and writes its secret to `infra/terraform/secrets.auto.tfvars` on your laptop (mode 0600, git-ignored). The secret never appears in the Ansible output.
5. Grants the role to the user and the token on Castor's paths only: `/pool/castor`, `/storage/local-lvm`, `/sdn/zones/localnetwork/vmbr0`, `/nodes/pve`. Terraform cannot see or touch your other VMs.

Proxmox shows a token secret only once, at creation. If the token already exists the playbook leaves it alone. To get a new secret:

```bash
ssh root@<host> pveum user token remove terraform@pve castor
ansible-playbook playbooks/terraform-access.yml
```

Check what Terraform can do:

```bash
ssh root@<host> pveum user permissions terraform@pve
ssh root@<host> "pveum user token permissions terraform@pve castor"
```

## Commands

| Command | What it does |
|---|---|
| `ansible proxmox -m ping` | Check SSH access to the host |
| `ansible-playbook playbooks/terraform-access.yml` | Create Terraform's user, role, ACLs and token |
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
