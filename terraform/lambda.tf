resource "null_resource" "lambda_npm_install" {
  triggers = {
    package_json = filemd5("${path.module}/../lambda/package.json")
  }

  provisioner "local-exec" {
    command     = "npm install --production"
    working_dir = "${path.module}/../lambda"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/lambda.zip"
  excludes    = ["node_modules/.cache"]

  depends_on = [null_resource.lambda_npm_install]
}

resource "aws_lambda_function" "main" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "wheres-laurent"
  role             = aws_iam_role.lambda_role.arn
  handler          = "src/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      JWT_SECRET                          = var.jwt_secret
      ADMIN_EMAIL                         = var.admin_email
      FRONTEND_URL                        = var.frontend_url
      DEV_MODE                            = var.dev_mode
      BREVO_API_KEY                       = var.brevo_api_key
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  tags = {
    Project = "WheresLaurent"
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy.lambda_dynamodb,
    aws_iam_role_policy.lambda_ses
  ]
}

resource "aws_lambda_function_url" "main" {
  function_name      = aws_lambda_function.main.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    max_age           = 86400
  }
}

resource "aws_lambda_permission" "allow_public_access" {
  statement_id           = "AllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.main.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "null_resource" "create_admin_user" {
  triggers = {
    admin_email = var.admin_email
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws dynamodb put-item \
        --table-name wl-users \
        --region eu-west-3 \
        --item '{"email": {"S": "${var.admin_email}"}, "role": {"S": "admin"}, "created_at": {"S": "${timestamp()}"}}'
    EOT
  }

  depends_on = [aws_dynamodb_table.users]
}
