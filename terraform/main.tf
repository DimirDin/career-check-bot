terraform {
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.112"
    }
  }
}

provider "yandex" {
  token     = var.yc_token
  cloud_id  = var.yc_cloud_id
  folder_id = var.yc_folder_id
  zone      = "ru-central1-a"
}

# Сеть
resource "yandex_vpc_network" "bot_network" {
  name = "career-bot-network"
}

resource "yandex_vpc_subnet" "bot_subnet" {
  name           = "career-bot-subnet"
  zone           = "ru-central1-a"
  network_id     = yandex_vpc_network.bot_network.id
  v4_cidr_blocks = ["192.168.10.0/24"]
}

# Самая дешёвая ВМ (burstable, preemptible)
resource "yandex_compute_instance" "bot_vm" {
  name        = "career-bot-vm"
  platform_id = "standard-v3"  # Intel Ice Lake, дешевле
  
  resources {
    cores  = 2
    memory = 2  # 2 GB RAM — минимум для бота + БД
    core_fraction = 5  # 5% CPU — достаточно для polling бота
  }

  boot_disk {
    initialize_params {
      image_id = "fd8ingbofbh3n5c40d3n"  # Ubuntu 22.04 LTS
      size     = 10  # GB — минимум
      type     = "network-hdd"  # HDD дешевле SSD
    }
  }

  network_interface {
    subnet_id = yandex_vpc_subnet.bot_subnet.id
    nat       = true  # Публичный IP для SSH
  }

  metadata = {
    ssh-keys = "ubuntu:${file(var.ssh_public_key_path)}"
    user-data = <<-EOF
      #cloud-config
      package_update: true
      packages:
        - docker.io
        - docker-compose
    EOF
  }

  scheduling_policy {
    preemptible = true  # Прерываемая ВМ — в 3 раза дешевле!
  }
}

# Вывод IP
output "vm_public_ip" {
  value = yandex_compute_instance.bot_vm.network_interface.0.nat_ip_address
}
