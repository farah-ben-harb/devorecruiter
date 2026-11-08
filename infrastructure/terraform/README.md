# DevoRecruiter Terraform

This directory contains the conservative Azure infrastructure definition for the DevoRecruiter development platform.

Terraform owns Azure infrastructure only. Kubernetes application deployment remains owned by GitOps, Helm, and Argo CD.

## Scope

The current module can describe a small Azure Student friendly K3s host:

- resource group;
- virtual network and subnet;
- network security group;
- public IP;
- network interface;
- Linux virtual machine;
- system-assigned managed identity;
- OS disk;
- restricted inbound rules.

The default variable `enable_infrastructure = false` prevents accidental planning or creation of resources before the existing Azure estate has been audited. Set it to `true` only after comparing the live Azure resources with this desired model.

## State

Local state is acceptable only for early learning and must not be committed.

Recommended target state is Azure Blob Storage with locking and consistency checks through the `azurerm` backend.

The active configuration does not enable the remote backend by default so local validation and pull-request plans can run before the backend exists. To migrate to Azure Blob state, copy `backend.azurerm.tf.example` to `backend.tf`, then run `terraform init -migrate-state` with reviewed backend settings.

Example backend initialization, after creating a storage account and container:

```powershell
terraform init `
  -backend-config="resource_group_name=<state-rg>" `
  -backend-config="storage_account_name=<state-storage-account>" `
  -backend-config="container_name=tfstate" `
  -backend-config="key=devorecruiter/dev.tfstate"
```

Never commit:

- `terraform.tfstate`;
- `terraform.tfstate.*`;
- `terraform.tfvars`;
- `.terraform/`;
- `*.tfplan`.

## Workflow

```powershell
terraform fmt -recursive
terraform init -backend=false
terraform validate
tflint --init
tflint --recursive
checkov -d .
trivy config .
terraform plan -input=false -out dev.tfplan
terraform show -no-color dev.tfplan
```

Review the plan before any apply.

## Safe Start

Copy the example values:

```powershell
Copy-Item terraform.tfvars.example terraform.tfvars
```

Then edit `terraform.tfvars` locally. Keep `enable_infrastructure = false` until the Azure audit is complete.
