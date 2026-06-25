param(
  [Parameter(Mandatory = $true)]
  [string]$IsoPath,
  [Parameter(Mandatory = $true)]
  [int]$DiskNumber,
  [Parameter(Mandatory = $false)]
  [ValidateSet("quick", "full")]
  [string]$VerifyMode = "full"
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
    throw "FlashTitan must be run as Administrator to create bootable Windows USB media."
  }
}

function Prepare-TargetDisk {
  param([int]$TargetDiskNumber)

  $diskpartScript = @"
select disk $TargetDiskNumber
attributes disk clear readonly noerr
online disk noerr
clean
convert mbr
create partition primary
format fs=fat32 quick label=FLASHTITAN
active
assign
exit
"@

  $scriptPath = Join-Path $env:TEMP ("flashtitan-diskpart-" + [guid]::NewGuid().ToString() + ".txt")
  Set-Content -LiteralPath $scriptPath -Value $diskpartScript -Encoding ascii
  try {
    & diskpart /s $scriptPath | Out-Null
  }
  finally {
    Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Seconds 1
  $partition = Get-Partition -DiskNumber $TargetDiskNumber | Where-Object DriveLetter | Select-Object -First 1
  if (-not $partition) {
    throw "FlashTitan could not determine the assigned USB drive letter after formatting."
  }

  return "$($partition.DriveLetter):"
}

function Export-And-SplitImage {
  param(
    [string]$SourceImage,
    [string]$TargetSwmPath,
    [switch]$FromEsd
  )

  $tempWimPath = Join-Path $env:TEMP ("flashtitan-" + [guid]::NewGuid().ToString() + ".wim")
  try {
    if ($FromEsd) {
      Emit-Event -Type "status" -Stage "image-conversion" -Message "Converting install.esd into a split-friendly WIM image."
      & Dism /Export-Image /SourceImageFile:$SourceImage /SourceIndex:1 /DestinationImageFile:$tempWimPath /Compress:max /CheckIntegrity | Out-Null
      $splitSource = $tempWimPath
    } else {
      $splitSource = $SourceImage
    }

    Emit-Event -Type "status" -Stage "image-splitting" -Message "Splitting Windows image into FAT32-safe SWM files."
    & Dism /Split-Image /ImageFile:$splitSource /SWMFile:$TargetSwmPath /FileSize:3800 | Out-Null
  }
  finally {
    if (Test-Path $tempWimPath) {
      Remove-Item -LiteralPath $tempWimPath -Force -ErrorAction SilentlyContinue
    }
  }
}

Assert-Administrator

$mountedImage = $null
$sourceRoot = $null
$targetRoot = $null

try {
  Emit-Event -Type "status" -Stage "mounting" -Message "Mounting Windows ISO."
  $mountedImage = Mount-DiskImage -ImagePath $IsoPath -PassThru
  Start-Sleep -Milliseconds 500
  $sourceLetter = ($mountedImage | Get-Volume | Where-Object DriveLetter | Select-Object -First 1 -ExpandProperty DriveLetter)
  if (-not $sourceLetter) {
    throw "FlashTitan could not read the mounted Windows ISO."
  }

  $sourceRoot = "$sourceLetter`:"
  Emit-Event -Type "status" -Stage "preparing-target" -Message "Formatting the USB drive for Windows Setup."
  $targetRoot = Prepare-TargetDisk -TargetDiskNumber $DiskNumber

  $installWim = Join-Path $sourceRoot "sources\install.wim"
  $installEsd = Join-Path $sourceRoot "sources\install.esd"
  $bootSect = Join-Path $sourceRoot "boot\bootsect.exe"
  $targetSources = Join-Path $targetRoot "sources"
  $usedSplitImage = $false

  if (Test-Path $installWim) {
    $wimSize = (Get-Item $installWim).Length
    if ($wimSize -gt 4GB) {
      $usedSplitImage = $true
      Emit-Event -Type "status" -Stage "copying" -Message "Copying Windows installation files while excluding install.wim for FAT32 splitting."
      & robocopy "$sourceRoot\" "$targetRoot\" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XF install.wim | Out-Null
      Export-And-SplitImage -SourceImage $installWim -TargetSwmPath (Join-Path $targetSources "install.swm")
    } else {
      Emit-Event -Type "status" -Stage "copying" -Message "Copying Windows installation files to the USB drive."
      & robocopy "$sourceRoot\" "$targetRoot\" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    }
  } elseif (Test-Path $installEsd) {
    $esdSize = (Get-Item $installEsd).Length
    if ($esdSize -gt 4GB) {
      $usedSplitImage = $true
      Emit-Event -Type "status" -Stage "copying" -Message "Copying Windows installation files while excluding install.esd for FAT32 splitting."
      & robocopy "$sourceRoot\" "$targetRoot\" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XF install.esd | Out-Null
      Export-And-SplitImage -SourceImage $installEsd -TargetSwmPath (Join-Path $targetSources "install.swm") -FromEsd
    } else {
      Emit-Event -Type "status" -Stage "copying" -Message "Copying Windows installation files to the USB drive."
      & robocopy "$sourceRoot\" "$targetRoot\" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    }
  } else {
    throw "FlashTitan could not find install.wim or install.esd inside the Windows ISO."
  }

  if (Test-Path $bootSect) {
    Emit-Event -Type "status" -Stage "boot-code" -Message "Applying BIOS boot code to the USB drive."
    & $bootSect /nt60 $targetRoot /force /mbr | Out-Null
  }

  if ($VerifyMode -eq "full") {
    Emit-Event -Type "status" -Stage "verifying" -Message "Verifying BIOS and UEFI boot files on the Windows USB."
    $requiredPaths = @(
      (Join-Path $targetRoot "bootmgr"),
      (Join-Path $targetRoot "setup.exe"),
      (Join-Path $targetRoot "efi\boot\bootx64.efi"),
      (Join-Path $targetRoot "boot\bcd")
    )

    foreach ($requiredPath in $requiredPaths) {
      if (-not (Test-Path $requiredPath)) {
        throw "Verification failed because required Windows boot file $requiredPath is missing."
      }
    }

    if (-not (Test-Path (Join-Path $targetRoot "sources\install.wim")) -and -not (Test-Path (Join-Path $targetRoot "sources\install.swm")) -and -not (Test-Path (Join-Path $targetRoot "sources\install.esd"))) {
      throw "Verification failed because no Windows installation image was found on the USB drive."
    }
  } else {
    Emit-Event -Type "status" -Stage "verifying" -Message "Quick verification complete. Required Windows boot files were staged."
  }

  Emit-Event -Type "complete" -Stage "complete" -Message "Windows installer USB creation completed."
  Emit-Result @{
    mode = "windows-installer-usb"
    targetRoot = $targetRoot
    verifyMode = $VerifyMode
    usedSplitImage = $usedSplitImage
    guidance = "Insert the USB into the target PC, open the boot menu, and choose the USB device to start Windows Setup."
  }
}
finally {
  if ($mountedImage) {
    Dismount-DiskImage -ImagePath $IsoPath -ErrorAction SilentlyContinue | Out-Null
  }
}
