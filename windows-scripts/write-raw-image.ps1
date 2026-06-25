param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [Parameter(Mandatory = $true)]
  [int]$DiskNumber,
  [Parameter(Mandatory = $false)]
  [ValidateSet("quick", "full")]
  [string]$VerifyMode = "full",
  [Parameter(Mandatory = $false)]
  [int]$ChunkSizeMiB = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Emit-Event {
  param(
    [string]$Type,
    [string]$Stage,
    [string]$Message,
    [hashtable]$Extra = @{}
  )

  $payload = @{
    type = $Type
    stage = $Stage
    message = $Message
  } + $Extra

  Write-Output ("[FlashTitan]" + ($payload | ConvertTo-Json -Compress))
}

function Emit-Result {
  param([hashtable]$Data)
  Write-Output ("[FlashTitan]" + (@{ type = "result"; data = $Data } | ConvertTo-Json -Compress))
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "FlashTitan must be run as Administrator to write raw images."
  }
}

function Emit-ProgressEvent {
  param(
    [string]$Stage,
    [string]$Message,
    [long]$ProcessedBytes,
    [long]$TotalBytes,
    [datetime]$StartedAt
  )

  $elapsedSeconds = [Math]::Max(((Get-Date) - $StartedAt).TotalSeconds, 0.001)
  $speed = $ProcessedBytes / $elapsedSeconds
  Emit-Event -Type "progress" -Stage $Stage -Message $Message -Extra @{
    processedBytes = $ProcessedBytes
    totalBytes = $TotalBytes
    percent = if ($TotalBytes -gt 0) { [Math]::Min(($ProcessedBytes / $TotalBytes) * 100, 100) } else { 0 }
    speedBytesPerSecond = $speed
    etaSeconds = if ($ProcessedBytes -gt 0) { ($TotalBytes - $ProcessedBytes) / $speed } else { $null }
  }
}

function Compare-Streams {
  param(
    [string]$OriginalPath,
    [string]$DevicePath,
    [long]$BytesToCompare,
    [int]$BufferSize,
    [string]$Mode
  )

  $source = [System.IO.File]::Open($OriginalPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
  $target = [System.IO.File]::Open($DevicePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $sourceBuffer = New-Object byte[] $BufferSize
    $targetBuffer = New-Object byte[] $BufferSize
    [long]$compared = 0
    $startedAt = Get-Date
    $checkpoints = if ($Mode -eq "quick") {
      @(
        0,
        [Math]::Max([Math]::Floor($BytesToCompare / 2), 0),
        [Math]::Max($BytesToCompare - $BufferSize, 0)
      ) | Select-Object -Unique
    } else {
      @()
    }

    if ($Mode -eq "quick") {
      foreach ($checkpoint in $checkpoints) {
        $source.Position = $checkpoint
        $target.Position = $checkpoint
        $remaining = $BytesToCompare - $checkpoint
        $thisRead = [int][Math]::Min($BufferSize, $remaining)
        $sourceRead = $source.Read($sourceBuffer, 0, $thisRead)
        $targetRead = $target.Read($targetBuffer, 0, $thisRead)
        if ($sourceRead -ne $targetRead) {
          throw "Quick verification failed because the written device length does not match the source image."
        }
        for ($index = 0; $index -lt $sourceRead; $index++) {
          if ($sourceBuffer[$index] -ne $targetBuffer[$index]) {
            throw "Quick verification found a mismatch between the source image and the written device."
          }
        }
        $compared += $sourceRead
        Emit-ProgressEvent -Stage "verifying" -Message "Quick verification is sampling the written media." -ProcessedBytes $compared -TotalBytes ([Math]::Max($BytesToCompare, 1)) -StartedAt $startedAt
      }

      return @{
        mode = "quick"
        mismatchOffset = $null
      }
    }

    while ($compared -lt $BytesToCompare) {
      $remaining = $BytesToCompare - $compared
      $thisRead = [int][Math]::Min($BufferSize, $remaining)
      $sourceRead = $source.Read($sourceBuffer, 0, $thisRead)
      $targetRead = $target.Read($targetBuffer, 0, $thisRead)

      if ($sourceRead -ne $targetRead) {
        throw "Verification failed because the written device length does not match the source image."
      }

      for ($index = 0; $index -lt $sourceRead; $index++) {
        if ($sourceBuffer[$index] -ne $targetBuffer[$index]) {
          $mismatchOffset = $compared + $index
          throw "Verification failed at byte offset $mismatchOffset because the device contents differ from the source image."
        }
      }

      $compared += $sourceRead
      Emit-ProgressEvent -Stage "verifying" -Message "Verifying written image." -ProcessedBytes $compared -TotalBytes $BytesToCompare -StartedAt $startedAt
    }

    return @{
      mode = "full"
      mismatchOffset = $null
    }
  }
  finally {
    if ($source) { $source.Dispose() }
    if ($target) { $target.Dispose() }
  }
}

Assert-Administrator

$disk = Get-Disk -Number $DiskNumber -ErrorAction Stop
$devicePath = "\\.\PhysicalDrive$DiskNumber"
$sourceInfo = Get-Item -LiteralPath $SourcePath
[long]$totalBytes = $sourceInfo.Length
$bufferSize = [Math]::Max($ChunkSizeMiB, 1) * 1MB

if ($disk.IsReadOnly) {
  throw "The selected removable drive is read-only."
}

if ($disk.Size -lt $totalBytes) {
  throw "The selected removable drive is too small for the chosen image."
}

$mountedVolumes = Get-Partition -DiskNumber $DiskNumber -ErrorAction SilentlyContinue | Get-Volume -ErrorAction SilentlyContinue
if ($mountedVolumes) {
  Emit-Event -Type "warning" -Stage "preflight" -Message "The removable drive has mounted volumes. FlashTitan will overwrite them during raw write." -Extra @{
    volumes = @($mountedVolumes | ForEach-Object { $_.DriveLetter })
  }
}

Emit-Event -Type "status" -Stage "preflight" -Message "Preflight checks passed. Preparing removable media for raw write." -Extra @{
  diskHealth = [string]$disk.HealthStatus
  diskBusType = [string]$disk.BusType
  diskReadOnly = [bool]$disk.IsReadOnly
}

$sourceStream = [System.IO.File]::Open($SourcePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
$targetStream = [System.IO.File]::Open($devicePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::ReadWrite)
$written = 0L
$writeStartedAt = Get-Date

try {
  $buffer = New-Object byte[] $bufferSize

  while ($true) {
    $bytesRead = $sourceStream.Read($buffer, 0, $buffer.Length)
    if ($bytesRead -le 0) {
      break
    }

    $targetStream.Write($buffer, 0, $bytesRead)
    $written += $bytesRead
    Emit-ProgressEvent -Stage "flashing" -Message "Writing image to removable media." -ProcessedBytes $written -TotalBytes $totalBytes -StartedAt $writeStartedAt
  }

  $targetStream.Flush()
}
finally {
  if ($sourceStream) { $sourceStream.Dispose() }
  if ($targetStream) { $targetStream.Dispose() }
}

$verificationReport = Compare-Streams -OriginalPath $SourcePath -DevicePath $devicePath -BytesToCompare $totalBytes -BufferSize $bufferSize -Mode $VerifyMode

Emit-Event -Type "complete" -Stage "complete" -Message "Raw image write completed."
Emit-Result @{
  mode = "raw-write"
  devicePath = $devicePath
  verifyMode = $VerifyMode
  verificationReport = $verificationReport
  guidance = "Insert the flashed media into the target PC, open the boot menu, and select the removable drive to start the OS installer."
}
