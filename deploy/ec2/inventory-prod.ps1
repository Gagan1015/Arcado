# Read-only inventory of every AWS resource the current Arcado stack uses.
# Run this BEFORE teardown so you can sanity-check what will be deleted later.
#
#   .\deploy\ec2\inventory-prod.ps1 -Region ap-south-1 | Tee-Object inventory.txt

[CmdletBinding()]
param(
  [string] $Region  = "ap-south-1",
  [string] $Cluster = "arcado"
)

$ErrorActionPreference = "Continue"
# NOTE: do not name this `H` — PowerShell has `h` as a built-in alias for
# Get-History, and function-vs-alias resolution is inconsistent.
function Section($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }

Section "ECS cluster + services"
aws ecs describe-clusters --clusters $Cluster --region $Region `
  --query "clusters[].{name:clusterName,status:status,services:activeServicesCount,tasks:runningTasksCount}" `
  --output table

aws ecs list-services --cluster $Cluster --region $Region --output table

Section "ECS task definitions (families)"
aws ecs list-task-definition-families --region $Region --status ACTIVE --output table

Section "ECR repositories"
aws ecr describe-repositories --region $Region `
  --query "repositories[].{name:repositoryName,uri:repositoryUri}" --output table

Section "Load balancers"
aws elbv2 describe-load-balancers --region $Region `
  --query "LoadBalancers[].{name:LoadBalancerName,dns:DNSName,arn:LoadBalancerArn,vpc:VpcId}" `
  --output table

Section "Target groups"
aws elbv2 describe-target-groups --region $Region `
  --query "TargetGroups[].{name:TargetGroupName,port:Port,arn:TargetGroupArn}" --output table

Section "NAT gateways"
aws ec2 describe-nat-gateways --region $Region `
  --filter "Name=state,Values=available,pending" `
  --query "NatGateways[].{id:NatGatewayId,vpc:VpcId,subnet:SubnetId,eip:NatGatewayAddresses[0].PublicIp}" `
  --output table

Section "Elastic IPs"
aws ec2 describe-addresses --region $Region `
  --query "Addresses[].{ip:PublicIp,alloc:AllocationId,assoc:AssociationId,instance:InstanceId}" --output table

Section "VPCs"
aws ec2 describe-vpcs --region $Region `
  --query "Vpcs[].{id:VpcId,cidr:CidrBlock,default:IsDefault,name:Tags[?Key=='Name']|[0].Value}" `
  --output table

Section "Security groups (arcado-*)"
aws ec2 describe-security-groups --region $Region `
  --filters "Name=group-name,Values=arcado-*" `
  --query "SecurityGroups[].{id:GroupId,name:GroupName,vpc:VpcId}" --output table

Section "Secrets Manager (arcado/*)"
aws secretsmanager list-secrets --region $Region `
  --filters "Key=name,Values=arcado/" `
  --query "SecretList[].{name:Name,arn:ARN}" --output table

Section "ACM certificates"
aws acm list-certificates --region $Region `
  --query "CertificateSummaryList[].{arn:CertificateArn,domain:DomainName,status:Status}" --output table

Section "CloudWatch log groups (/ecs/arcado*)"
aws logs describe-log-groups --region $Region --log-group-name-prefix "/ecs/arcado" `
  --query "logGroups[].{name:logGroupName,bytes:storedBytes}" --output table

Section "RDS instances"
aws rds describe-db-instances --region $Region `
  --query "DBInstances[].{id:DBInstanceIdentifier,endpoint:Endpoint.Address,engine:Engine,class:DBInstanceClass,public:PubliclyAccessible,vpc:DBSubnetGroup.VpcId}" `
  --output table

Section "Route53 hosted zones"
aws route53 list-hosted-zones --query "HostedZones[].{name:Name,id:Id}" --output table

Write-Host "`nDone." -ForegroundColor Green
