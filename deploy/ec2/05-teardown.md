# Step 5 – Tear down the old ECS/ALB/NAT stack

**Only run this after the new box has been serving prod for 24 hours with no
issues.** Deletions here are reversible for VPC/subnets/RDS but permanent
for ECR images, log groups, and Secrets Manager entries.

Variables:

```powershell
$region = "ap-south-1"
```

## 1. Stop the ECS services

```powershell
aws ecs update-service --cluster arcado --service arcado-client --desired-count 0 --region $region
aws ecs update-service --cluster arcado --service arcado-server --desired-count 0 --region $region
```

Wait ~60 s for tasks to stop.

```powershell
aws ecs delete-service --cluster arcado --service arcado-client --force --region $region
aws ecs delete-service --cluster arcado --service arcado-server --force --region $region
aws ecs delete-cluster --cluster arcado --region $region
```

Deregister every task-definition revision (optional but tidy):

```powershell
foreach ($family in @("arcado-client","arcado-server","arcado-db-migrate","arcado-db-precheck")) {
  $revs = aws ecs list-task-definitions --family-prefix $family --status ACTIVE `
            --region $region --query "taskDefinitionArns[]" --output text
  foreach ($r in $revs.Split()) {
    if ($r) { aws ecs deregister-task-definition --task-definition $r --region $region | Out-Null }
  }
}
```

## 2. Delete the ALB + target groups + listeners

```powershell
$albArn = "arn:aws:elasticloadbalancing:ap-south-1:052380405321:loadbalancer/app/arcado-alb/9b60c774a99ed119"
$clientTg = "arn:aws:elasticloadbalancing:ap-south-1:052380405321:targetgroup/arcado-client-tg/8f831b4e4721a363"
$serverTg = "arn:aws:elasticloadbalancing:ap-south-1:052380405321:targetgroup/arcado-server-tg/ebc43f1606d4eb60"

# Listeners are deleted automatically when the ALB is deleted.
aws elbv2 delete-load-balancer --load-balancer-arn $albArn --region $region

# Target groups have to be deleted separately.
aws elbv2 delete-target-group --target-group-arn $clientTg --region $region
aws elbv2 delete-target-group --target-group-arn $serverTg --region $region
```

## 3. Delete the NAT gateway (biggest savings — ~\$32/mo)

```powershell
aws ec2 delete-nat-gateway --nat-gateway-id nat-045e69b918b59093f --region $region
# wait until state=deleted (~90 s) before releasing the EIP
aws ec2 release-address --allocation-id eipalloc-0f9e76a1cdcc6e0cb --region $region
```

Release the other orphan EIP too (it's the one we didn't reuse):

```powershell
aws ec2 release-address --allocation-id eipalloc-02dc08a8e662cf26e --region $region
```

Leave `eipalloc-0f2d942c96a24c976` alone — it's attached to the new EC2.

## 4. Clean up VPC routes

After the NAT is gone, the private-subnet route tables still reference it
(broken route). Either leave them as-is (private subnets are now unused) or
delete the 0.0.0.0/0 entry if you'd prefer the CFN stack to update cleanly.

For a side project, leave them — the CFN stack delete in the next step
handles it.

## 5. Delete the CloudFormation stacks

The original deploy used these templates: `vpc.cfn.yml`, `rds.cfn.yml`,
`alb.cfn.yml`, `ecs.cfn.yml`, `secrets.cfn.yml`. Since you're keeping RDS,
**do not delete the `arcado-rds` stack**.

```powershell
aws cloudformation list-stacks --region $region `
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE `
  --query "StackSummaries[?starts_with(StackName,'arcado-')].[StackName,StackStatus]" `
  --output table
```

Expected stacks to delete: `arcado-ecs`, `arcado-alb`, `arcado-secrets`,
`arcado-vpc`. Keep: `arcado-rds`.

Delete them in this order (dependencies matter):

```powershell
aws cloudformation delete-stack --stack-name arcado-ecs     --region $region
aws cloudformation wait stack-delete-complete --stack-name arcado-ecs --region $region

aws cloudformation delete-stack --stack-name arcado-alb     --region $region
aws cloudformation wait stack-delete-complete --stack-name arcado-alb --region $region

aws cloudformation delete-stack --stack-name arcado-secrets --region $region
aws cloudformation wait stack-delete-complete --stack-name arcado-secrets --region $region
```

Now the VPC. **Skip this if you want to keep the VPC** (it costs nothing to
keep, and RDS still lives in it). If you do delete, first move the new EC2
out, which is a whole migration on its own — so recommend keeping the VPC.

If you still want to delete the VPC after moving everything:

```powershell
aws cloudformation delete-stack --stack-name arcado-vpc --region $region
```

(This will fail until the EC2, its SG, and the RDS ingress rule referencing
the old tasks SG are all gone. Easier: keep the VPC.)

## 6. Delete ECR repositories

```powershell
aws ecr delete-repository --repository-name arcado-client  --force --region $region
aws ecr delete-repository --repository-name arcado-server  --force --region $region
aws ecr delete-repository --repository-name arcado-migrate --force --region $region
```

`--force` is needed because the repos still have image layers.

## 7. Delete Secrets Manager entries

```powershell
aws secretsmanager delete-secret --secret-id arcado/client `
  --force-delete-without-recovery --region $region
```

`--force-delete-without-recovery` skips the 7–30 day recovery window. Only
use this once you've confirmed `.env.prod` on the EC2 box has everything.

## 8. Delete the ACM certificate

Caddy has its own Let's Encrypt cert now.

```powershell
aws acm delete-certificate `
  --certificate-arn arn:aws:acm:ap-south-1:052380405321:certificate/987b857d-f338-4217-a00e-1a7747bcf253 `
  --region $region
```

## 9. Delete CloudWatch log groups

```powershell
foreach ($lg in @("/ecs/arcado-client","/ecs/arcado-server","/ecs/arcado-db-migrate","/ecs/arcado-db-precheck")) {
  aws logs delete-log-group --log-group-name $lg --region $region 2>$null
}
```

Missing groups fail silently — fine.

## 10. Remove the old ECS tasks SG reference from RDS SG

Your RDS SG still has ingress allowing traffic from the old
`arcado-alb-TasksSecurityGroup-*` (`sg-0b7320940dd0fb10c`). With that SG
gone (it was part of `arcado-alb` stack), the rule becomes orphaned. Clean
it up:

```powershell
aws ec2 describe-security-groups --group-ids sg-070317728f69730e2 --region $region `
  --query "SecurityGroups[0].IpPermissions" --output json
# Identify any UserIdGroupPair referencing sg-0b7320940dd0fb10c and run:
aws ec2 revoke-security-group-ingress --group-id sg-070317728f69730e2 --region $region `
  --protocol tcp --port 5432 --source-group sg-0b7320940dd0fb10c
```

## 11. Final state

Keep these:

- `arcado-rds` CloudFormation stack
- RDS instance `arcado-db`
- RDS SG `sg-070317728f69730e2` (now only allows the new EC2 SG)
- `arcado-vpc` (recommended to keep)
- New EC2, its SG, and EIP
- CloudFormation stack `arcado-rds`

Delete this file after cutover — it contains ARNs that will be stale.
