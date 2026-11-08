locals {
  resource_group_name = coalesce(var.resource_group_name, "${var.name_prefix}-rg")
  common_tags         = var.tags
}
