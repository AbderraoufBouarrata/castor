# Build Service — Architecture and Glossary

Oct 20, 2026 · @Abderraouf

## Architecture

**Untrusted builds run in throwaway VMs, never on the cluster.**

```
┌─ Proxmox host — bare metal ──────────────────────────────────────────────────┐
│                                                                              │
│  ┌─ VM: k8s-node-01 (+ node-02, node-03) ─────────────────────────────────┐  │
│  │                                                                        │  │
│  │  Control plane: kube-apiserver · scheduler · controller-manager        │  │
│  │  etcd — every object in the cluster lives here                         │  │
│  │                                                                        │  │
│  │  Ingress controller ──> Ingress (rule) ──> Service — stable IP         │  │
│  │                                                                        │  │
│  │  ┌ Pod: job-api ─────┐  ┌ Pod: dispatcher ──┐  ┌ Pod: reaper ──────┐   │  │
│  │  │ container: fastify│  │ container:        │  │ container: reaper │   │  │
│  │  │ (API + status     │  │   dispatcher      │  │                   │   │  │
│  │  │  page)            │  │                   │  │                   │   │  │
│  │  └───────────────────┘  └───────────────────┘  └───────────────────┘   │  │
│  │                                                                        │  │
│  │  ┌ Pod: telegram-bot ┐  Secret: Proxmox token, mounted into the        │  │
│  │  │ container: bot    │  dispatcher only                                │  │
│  │  └───────────────────┘                                                 │  │
│  │  bot needs no Service and no Ingress — it polls outward                │  │
│  │                                                                        │  │
│  │  ┌ Pod: postgres-0 ──┐  ┌ Pod: minio-0 ─────┐  StatefulSet: PVC to PV   │  │
│  │  │ container:        │  │ container: minio  │  stable name, own volume, │  │
│  │  │   postgres        │  │                   │  outlives the pod         │  │
│  │  └───────────────────┘  └───────────────────┘                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ VM: job-7f3a (ephemeral, one job only) — UNTRUSTED ───────────────────┐  │
│  │  Docker daemon — no kubelet, no pod, never joins the cluster           │  │
│  │                                                                        │  │
│  │  [ container: their Dockerfile ]   [ container: metrics agent ]        │  │
│  │                                                                        │  │
│  │  no inbound · egress allowlist · CPU, memory and disk caps ·           │  │
│  │  destroyed at TTL                                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Build service architecture: 2 VM kinds, 6 pods.

Four layers nest on the cluster side: host, then a virtual machine, then pods, then containers. The job machine has no pod layer at all — if a stranger's container escapes, it lands inside a disposable virtual machine with no inbound route and a timer running.

---

## Machine layer

The hardest isolation boundary in the system lives here, which is why untrusted builds get a whole machine rather than a container.

| Term | What it is |
|---|---|
| Bare metal | Physical hardware with nothing virtualised on top. The Proxmox box itself. |
| Hypervisor | Software that divides one physical machine into several virtual ones. Proxmox is yours. |
| Virtual machine | A simulated computer with its own kernel, memory and disk. Escaping one means defeating the hypervisor. |
| Node | In Kubernetes, any machine that runs workloads. Here, each node is itself a virtual machine on Proxmox. |
| Ephemeral virtual machine | One created for a single job and destroyed afterwards. Never reused, never reset. |

## Container layer

Containers share the host kernel, which makes them a weaker boundary than a virtual machine and explains why they sit inside one here.

| Term | What it is |
|---|---|
| Container | An isolated process running on a shared kernel. Lighter than a virtual machine, and a weaker boundary. |
| Image | The built, frozen filesystem a container starts from. |
| Dockerfile | The recipe for building an image. It executes commands at build time, so building a stranger's Dockerfile is itself a risk. |
| Docker daemon | The background service that builds images and runs containers on a machine. |

## Kubernetes control plane

Every object in the cluster lives in etcd and nowhere else, which makes it the one component whose backups genuinely matter.

| Term | What it is |
|---|---|
| kube-apiserver | The single front door. Every tool, component and service talks to the cluster through it. Nothing bypasses it. |
| etcd | The database holding every object in the cluster. Lose it and you have lost the cluster. |
| Scheduler | Decides which node a new pod should run on. It records the decision; it does not start anything. |
| controller-manager | Runs the loops comparing what exists against what you declared, and acts to close the gap. |
| kubelet | The agent on each node that actually launches containers once a pod has been assigned there. |

Application data does not belong in etcd. That is why this system runs its own Postgres.

## Workload objects

You declare a Deployment or a StatefulSet; Kubernetes creates everything below it.

| Term | What it is |
|---|---|
| Pod | The smallest schedulable unit. Usually one container, sometimes several sharing a network address and lifecycle. |
| Replica | One running copy of a pod. |
| ReplicaSet | Keeps a stated number of identical pods alive. You rarely create one yourself. |
| Deployment | What you write for stateless services. Creates ReplicaSets and handles rollouts and rollbacks. |
| StatefulSet | The equivalent for workloads that own data. Stable names like postgres-0, each with its own volume. |

A rollout is a second ReplicaSet scaling up as the first scales down. The old one stays at zero replicas, which is why a rollback is instant.

## Storage

The claim outlives the pod. That is what lets postgres-0 be deleted and come back with its data intact.

| Term | What it is |
|---|---|
| PersistentVolumeClaim | A request for storage: how much, and what kind. Written alongside the workload. |
| PersistentVolume | The actual disk that satisfies a claim. |
| StorageClass | Defines who provisions volumes and how, so claims are fulfilled automatically rather than by hand. |

## Networking

An Ingress with no Ingress controller installed does nothing, silently. This catches almost everyone once.

| Term | What it is |
|---|---|
| Service | A stable address in front of a changing set of pods. Pods get new addresses constantly; this one does not move. |
| Ingress | A rule mapping a hostname and path to a Service. Only a rule, inert by itself. |
| Ingress controller | The pod that reads those rules and routes incoming traffic. Typically nginx or Traefik. |
| Long polling | The client opens an outbound connection and waits. Lets the bot receive messages with nothing connecting inward. |

The bot needs neither a Service nor an Ingress, because nothing ever connects to it. The job-api needs both, because it serves the status page.

## Configuration

| Term | What it is |
|---|---|
| Secret | A Kubernetes object for sensitive values, mounted into pods. Base64-encoded by default, not encrypted unless configured. |
| ConfigMap | The same idea for non-sensitive settings. |
| Namespace | A logical partition of the cluster, used to separate environments or tenants. |

Worth knowing before the Proxmox token goes into a Secret: encryption at rest is something you turn on, not something you get.

## Project components

Only the dispatcher holds Proxmox credentials. Everything else is deliberately powerless.

| Term | What it is |
|---|---|
| Job API | Accepts submissions, writes job records, exposes status, serves the status page. Owns no infrastructure powers. |
| Dispatcher | Claims queued jobs and calls Proxmox to create workers. The only component with Proxmox credentials. |
| Reaper | Destroys expired or orphaned virtual machines. Separate from the dispatcher so a crash there does not leak machines. |
| Telegram bot | Telegram client over long polling. Turns chat commands into Job API calls. |
| Proxmox API | The interface for creating, cloning and destroying virtual machines programmatically. |
| Metrics agent | The sidecar container watching the untrusted container and streaming its resource usage out. |
| MinIO | Self-hosted object storage, used here for logs and build artifacts. |
| Time-to-live | The lifespan granted to a worker, after which it is destroyed whether or not the job finished. |
