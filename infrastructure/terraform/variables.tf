variable "enable_infrastructure" {
  description = "Safety switch. Keep false until the existing Azure infrastructure has been audited and import/recreate decisions are approved."
  type        = bool
  default     = false
}

variable "subscription_id" {
  description = "Azure subscription ID. Prefer ARM_SUBSCRIPTION_ID in CI or a local tfvars file."
  type        = string
  default     = null
  sensitive   = true
}

variable "location" {
  description = "Azure region for DevoRecruiter dev compute and network resources."
  type        = string
  default     = "spaincentral"
}

variable "resource_group_location" {
  description = "Azure region metadata of the existing resource group. Azure resource groups can have a different location from contained resources."
  type        = string
  default     = "francecentral"
}

variable "name_prefix" {
  description = "Short prefix used for Azure resource names."
  type        = string
  default     = "devorecruiter-dev"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,32}$", var.name_prefix))
    error_message = "name_prefix must contain 3 to 32 lowercase letters, numbers, or hyphens."
  }
}

variable "resource_group_name" {
  description = "Resource group name. Defaults to '<name_prefix>-rg'."
  type        = string
  default     = "rg-devorecruiter-dev"
}

variable "vm_name" {
  description = "Existing or desired Azure VM name."
  type        = string
  default     = "vm-devorecruiter-dev"
}

variable "virtual_network_name" {
  description = "Existing or desired virtual network name."
  type        = string
  default     = "vm-devorecruiter-devVNET"
}

variable "subnet_name" {
  description = "Existing or desired subnet name."
  type        = string
  default     = "vm-devorecruiter-devSubnet"
}

variable "network_security_group_name" {
  description = "Existing or desired network security group name."
  type        = string
  default     = "vm-devorecruiter-devNSG"
}

variable "public_ip_name" {
  description = "Existing or desired public IP name."
  type        = string
  default     = "vm-devorecruiter-devPublicIP"
}

variable "network_interface_name" {
  description = "Existing or desired network interface name."
  type        = string
  default     = "vm-devorecruiter-devVMNic"
}

variable "ip_configuration_name" {
  description = "Existing or desired NIC IP configuration name."
  type        = string
  default     = "ipconfigvm-devorecruiter-dev"
}

variable "address_space" {
  description = "Virtual network address space."
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_prefixes" {
  description = "Subnet CIDR blocks for the K3s VM."
  type        = list(string)
  default     = ["10.0.0.0/24"]
}

variable "admin_username" {
  description = "Admin SSH user for the Linux VM."
  type        = string
  default     = "azureuser"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_-]{2,31}$", var.admin_username))
    error_message = "admin_username must be a valid Linux user name."
  }
}

variable "ssh_public_key" {
  description = "SSH public key used for the Linux VM. Store locally, not in Git."
  type        = string
  default     = null
  sensitive   = true
}

variable "vm_size" {
  description = "Small Azure Student friendly VM size."
  type        = string
  default     = "Standard_B2als_v2"
}

variable "os_disk_size_gb" {
  description = "OS disk size in GiB."
  type        = number
  default     = 64

  validation {
    condition     = var.os_disk_size_gb >= 30 && var.os_disk_size_gb <= 128
    error_message = "os_disk_size_gb must stay between 30 and 128 for the dev budget."
  }
}

variable "allowed_ssh_cidrs" {
  description = "CIDR ranges allowed to reach SSH. Empty means no SSH rule is created."
  type        = list(string)
  default     = []
}

variable "allowed_http_cidrs" {
  description = "CIDR ranges allowed to reach HTTP and HTTPS ingress. Empty means no public web rules are created."
  type        = list(string)
  default     = []
}

variable "allowed_k3s_api_cidrs" {
  description = "CIDR ranges allowed to reach the K3s API port. Keep empty unless remote kubectl access is required."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Common Azure tags."
  type        = map(string)
  default = {
    project     = "devorecruiter"
    environment = "dev"
    owner       = "farah"
  }
}

variable "os_disk_storage_account_type" {
  description = "Existing or desired OS managed disk storage type."
  type        = string
  default     = "Premium_LRS"
}

variable "enable_system_assigned_identity" {
  description = "Attach a system-assigned managed identity to the VM. Keep false to match the existing manually-created VM."
  type        = bool
  default     = false
}
