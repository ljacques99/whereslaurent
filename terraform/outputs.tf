output "lambda_url" {
  description = "Lambda Function URL (direct)"
  value       = aws_lambda_function_url.main.function_url
}

output "api_gateway_url" {
  description = "API Gateway URL (recommended endpoint)"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "admin_email" {
  description = "Admin email address"
  value       = var.admin_email
}
