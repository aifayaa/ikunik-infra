# Inventory Templates

Last updated: 2026-03-04

Copy these templates for each new target:
- `resource_inventory_template.csv`
- `secrets_inventory_template.csv`
- `db_inventory_template.csv`
- `dashboard_inventory_template.csv`

Suggested layout:
- `INVENTORY/<target_id>/resource_inventory.csv`
- `INVENTORY/<target_id>/secrets_inventory.csv`
- `INVENTORY/<target_id>/db_inventory.csv`
- `INVENTORY/<target_id>/dashboard_inventory.csv`

Minimum rule:
- no cutover without all four inventories populated and referenced in evidence.
