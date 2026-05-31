#!/bin/bash
set -e

echo "=== Step 1: Terraform ==="
cd terraform
terraform init
terraform apply -auto-approve

VM_IP=$(terraform output -raw vm_public_ip)
echo "VM IP: $VM_IP"

cd ..

echo "=== Step 2: Generate Ansible inventory ==="
sed "s/{{ vm_ip }}/$VM_IP/g" ansible/inventory.ini.template > ansible/inventory.ini

echo "=== Step 3: Wait for VM to be ready ==="
sleep 30  # Docker installation via cloud-init

echo "=== Step 4: Ansible ==="
cd ansible
ansible-playbook -i inventory.ini playbook.yml

echo "=== Done! Bot is running on $VM_IP ==="
