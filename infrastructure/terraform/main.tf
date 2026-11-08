resource "azurerm_resource_group" "this" {
  count = var.enable_infrastructure ? 1 : 0

  name     = local.resource_group_name
  location = var.resource_group_location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "this" {
  count = var.enable_infrastructure ? 1 : 0

  name                = var.virtual_network_name
  location            = var.location
  resource_group_name = azurerm_resource_group.this[0].name
  address_space       = var.address_space
  tags                = local.common_tags
}

resource "azurerm_subnet" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  name                 = var.subnet_name
  resource_group_name  = azurerm_resource_group.this[0].name
  virtual_network_name = azurerm_virtual_network.this[0].name
  address_prefixes     = var.subnet_prefixes
}

resource "azurerm_network_security_group" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  name                = var.network_security_group_name
  location            = var.location
  resource_group_name = azurerm_resource_group.this[0].name
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [security_rule]
  }
}

resource "azurerm_network_security_rule" "ssh" {
  count = var.enable_infrastructure && length(var.allowed_ssh_cidrs) > 0 ? 1 : 0

  name                        = "allow-ssh-approved-cidrs"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefixes     = var.allowed_ssh_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.this[0].name
  network_security_group_name = azurerm_network_security_group.k3s[0].name
}

resource "azurerm_network_security_rule" "http" {
  count = var.enable_infrastructure && length(var.allowed_http_cidrs) > 0 ? 1 : 0

  name                        = "allow-http-approved-cidrs"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefixes     = var.allowed_http_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.this[0].name
  network_security_group_name = azurerm_network_security_group.k3s[0].name
}

resource "azurerm_network_security_rule" "k3s_api" {
  count = var.enable_infrastructure && length(var.allowed_k3s_api_cidrs) > 0 ? 1 : 0

  name                        = "allow-k3s-api-approved-cidrs"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "6443"
  source_address_prefixes     = var.allowed_k3s_api_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.this[0].name
  network_security_group_name = azurerm_network_security_group.k3s[0].name
}

resource "azurerm_network_interface_security_group_association" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  network_interface_id      = azurerm_network_interface.k3s[0].id
  network_security_group_id = azurerm_network_security_group.k3s[0].id
}

resource "azurerm_public_ip" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  name                = var.public_ip_name
  location            = var.location
  resource_group_name = azurerm_resource_group.this[0].name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.common_tags
}

resource "azurerm_network_interface" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  name                = var.network_interface_name
  location            = var.location
  resource_group_name = azurerm_resource_group.this[0].name
  tags                = local.common_tags

  ip_configuration {
    name                          = var.ip_configuration_name
    subnet_id                     = azurerm_subnet.k3s[0].id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.k3s[0].id
  }
}

resource "azurerm_linux_virtual_machine" "k3s" {
  count = var.enable_infrastructure ? 1 : 0

  name                            = var.vm_name
  location                        = var.location
  resource_group_name             = azurerm_resource_group.this[0].name
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.k3s[0].id]
  tags                            = local.common_tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  dynamic "identity" {
    for_each = var.enable_system_assigned_identity ? [1] : []

    content {
      type = "SystemAssigned"
    }
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = var.os_disk_storage_account_type
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  lifecycle {
    ignore_changes = [admin_ssh_key]

    precondition {
      condition     = !var.enable_infrastructure || var.ssh_public_key != null
      error_message = "ssh_public_key is required when enable_infrastructure is true."
    }
  }
}
