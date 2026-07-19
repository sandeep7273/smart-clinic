###############################################################################
# Redis Module — Amazon ElastiCache (Redis 7)
###############################################################################

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-redis-subnet-group"
  subnet_ids = var.database_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description          = "Redis cache for ${var.project} ${var.environment}"

  engine             = "redis"
  engine_version     = "7.1"
  node_type          = var.node_type
  num_cache_clusters = 2 # Primary + 1 replica for HA

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.databases_sg_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  auto_minor_version_upgrade = true

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  tags = { Name = "${var.project}-${var.environment}-redis" }
}
