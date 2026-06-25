Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Emit-Result {
  param([object]$Data)
  Write-Output ("[FlashTitan]" + (@{ type = "result"; data = $Data } | ConvertTo-Json -Compress -Depth 6))
}

$disks = Get-Disk | ForEach-Object {
  $disk = $_
  $partitions = Get-Partition -DiskNumber $disk.Number -ErrorAction SilentlyContinue
  $volumes = @()
  if ($partitions) {
    $volumes = $partitions | ForEach-Object {
      $partition = $_
      $volume = $partition | Get-Volume -ErrorAction SilentlyContinue
      if ($volume) {
        [PSCustomObject]@{
          driveLetter = $volume.DriveLetter
          fileSystem = $volume.FileSystem
          label = $volume.FileSystemLabel
          healthStatus = $volume.HealthStatus
        }
      }
    }
  }

  [PSCustomObject]@{
    number = $disk.Number
    path = "\\.\PhysicalDrive$($disk.Number)"
    friendlyName = $disk.FriendlyName
    serialNumber = $disk.SerialNumber
    busType = [string]$disk.BusType
    healthStatus = [string]$disk.HealthStatus
    operationalStatus = ($disk.OperationalStatus | ForEach-Object { [string]$_ }) -join ", "
    isReadOnly = [bool]$disk.IsReadOnly
    isBoot = [bool]$disk.IsBoot
    isSystem = [bool]$disk.IsSystem
    size = [int64]$disk.Size
    partitionStyle = [string]$disk.PartitionStyle
    volumes = $volumes
  }
}

Emit-Result $disks
