output "resource_group_name" {
  description = "Resource group managed by this configuration."
  value       = try(azurerm_resource_group.this[0].name, null)
}

output "vm_name" {
  description = "K3s VM name."
  value       = try(azurerm_linux_virtual_machine.k3s[0].name, null)
}

output "vm_public_ip" {
  description = "K3s VM public IP."
  value       = try(azurerm_public_ip.k3s[0].ip_address, null)
}

output "vnet_name" {
  description = "Virtual network name."
  value       = try(azurerm_virtual_network.this[0].name, null)
}

output "subnet_name" {
  description = "K3s subnet name."
  value       = try(azurerm_subnet.k3s[0].name, null)
}
