# Step 1 – Launch the new EC2 box

IDs already filled in from your AWS account. Run each block in PowerShell
from the repo root. Stop and check if anything fails.

## Variables (paste first)

```powershell
$region   = "ap-south-1"
$vpcId    = "vpc-08765a36216b2cab8"          # arcado-vpc
$subnetId = "subnet-0c8442984c1647a99"        # arcado-subnet-public1 (ap-south-1a)
$rdsSgId  = "sg-070317728f69730e2"            # arcado-rds-DbSecurityGroup-*
$eipAlloc = "eipalloc-0f2d942c96a24c976"      # reuse orphaned EIP 13.200.208.112
$keyName  = "arcado-ec2"
$sgName   = "arcado-ec2-sg"
$myIp     = (Invoke-RestMethod https://api.ipify.org)
Write-Host "Your current public IP is $myIp (used to lock SSH)"
```

## 1. Look up the latest Ubuntu 24.04 AMI

```powershell
$amiId = aws ec2 describe-images --owners 099720109477 `
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
  --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region $region
Write-Host "AMI: $amiId"
```

If (and only if) that printed `None`, run this fallback. Otherwise **skip it** —
running it unconditionally will overwrite the good AMI ID with `None`:

```powershell
$amiId = aws ec2 describe-images --owners 099720109477 `
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
  --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region $region
Write-Host "AMI: $amiId"
```

## 2. Create an SSH key pair

```powershell
aws ec2 create-key-pair --key-name $keyName --region $region `
  --query "KeyMaterial" --output text | Out-File -Encoding ascii arcado-ec2.pem
icacls arcado-ec2.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

Already gitignored. Back up `arcado-ec2.pem` to your password manager — if you
lose it you'll have to rebuild the instance to recover SSH access.

## 3. Security group for the EC2 host

```powershell
$sgId = aws ec2 create-security-group `
  --group-name $sgName `
  --description "Arcado single-box: ssh + http + https" `
  --vpc-id $vpcId --region $region `
  --query "GroupId" --output text
Write-Host "EC2 SG: $sgId"

aws ec2 authorize-security-group-ingress --group-id $sgId --region $region `
  --ip-permissions `
    "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$myIp/32,Description=my-laptop}]" `
    "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=http}]" `
    "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=https}]"
```

## 4. Let the new SG reach RDS

```powershell
aws ec2 authorize-security-group-ingress --group-id $rdsSgId --region $region `
  --protocol tcp --port 5432 --source-group $sgId
```

This is additive — the existing tasks SG still has its rule, so the old ECS
stack keeps working until you tear it down.

## 5. Launch the instance

```powershell
$instanceId = aws ec2 run-instances `
  --region $region `
  --image-id $amiId `
  --instance-type t3.small `
  --key-name $keyName `
  --security-group-ids $sgId `
  --subnet-id $subnetId `
  --associate-public-ip-address `
  --user-data file://deploy/ec2/bootstrap.sh `
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}" `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=arcado}]" `
  --query "Instances[0].InstanceId" --output text
Write-Host "Instance: $instanceId"

aws ec2 wait instance-running --instance-ids $instanceId --region $region
Write-Host "Instance is running."
```

## 6. Attach the existing EIP (reuse the orphan)

```powershell
aws ec2 associate-address --instance-id $instanceId --allocation-id $eipAlloc --region $region
$eip = aws ec2 describe-addresses --allocation-ids $eipAlloc --region $region `
  --query "Addresses[0].PublicIp" --output text
Write-Host "EIP attached: $eip"
```

Save `$eip` somewhere — you'll use it for SSH and to update DNS later.

## 7. Wait for cloud-init to finish

`bootstrap.sh` takes about 2–3 minutes to install Docker, add the swapfile,
and open ufw. Watch it finish:

```powershell
# Wait 2 min then try to ssh; if it times out, wait another 30 s and retry.
ssh -o StrictHostKeyChecking=no -i arcado-ec2.pem ubuntu@$eip "cloud-init status --wait"
```

You want `status: done`.

---

Once this prints `done`, ping me and we move to Step 2 (deploy the app).
