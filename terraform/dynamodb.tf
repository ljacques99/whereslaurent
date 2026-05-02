resource "aws_dynamodb_table" "locations" {
  name         = "wl-locations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Project = "WhересLaurent"
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "wl-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Project = "WhересLaurent"
  }
}

resource "aws_dynamodb_table" "magic_links" {
  name         = "wl-magic-links"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token"

  attribute {
    name = "token"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Project = "WhересLaurent"
  }
}

resource "aws_dynamodb_table" "token_revocations" {
  name         = "wl-token-revocations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "revocation_id"

  attribute {
    name = "revocation_id"
    type = "S"
  }

  tags = {
    Project = "WhересLaurent"
  }
}
