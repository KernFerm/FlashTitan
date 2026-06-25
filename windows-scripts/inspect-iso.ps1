param(
  [Parameter(Mandatory = $true)]
  [string]$IsoPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Emit-Result {
  param([hashtable]$Data)
  $payload = @{
    type = "result"
    data = $Data
  } | ConvertTo-Json -Compress
  Write-Output "[FlashTitan]$payload"
}

function Test-AnyPath {
  param([string[]]$Paths)

  foreach ($candidate in $Paths) {
    if (Test-Path $candidate) {
      return $true
    }
  }

  return $false
}

$mountedImage = $null

try {
  $mountedImage = Mount-DiskImage -ImagePath $IsoPath -PassThru
  Start-Sleep -Milliseconds 300
  $driveLetter = ($mountedImage | Get-Volume | Where-Object DriveLetter | Select-Object -First 1 -ExpandProperty DriveLetter)
  if (-not $driveLetter) {
    throw "FlashTitan could not determine a drive letter for the mounted ISO."
  }

  $root = "$driveLetter`:"
  $installWim = Join-Path $root "sources\install.wim"
  $installEsd = Join-Path $root "sources\install.esd"
  $setupExe = Join-Path $root "setup.exe"
  $bootMgr = Join-Path $root "bootmgr"
  $bootMgrEfi = Join-Path $root "efi\boot\bootx64.efi"
  $bootMgrEfi32 = Join-Path $root "efi\boot\bootia32.efi"
  $bootSect = Join-Path $root "boot\bootsect.exe"
  $bcd = Join-Path $root "boot\bcd"
  $label = (Get-Volume -DriveLetter $driveLetter -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FileSystemLabel)
  $isolinuxBin = Join-Path $root "isolinux\isolinux.bin"
  $isolinuxCfg = Join-Path $root "isolinux\isolinux.cfg"
  $syslinuxCfg = Join-Path $root "syslinux\syslinux.cfg"
  $grubCfg = Join-Path $root "boot\grub\grub.cfg"
  $efiGrubCfg = Join-Path $root "efi\boot\grub.cfg"
  $liveDir = Join-Path $root "live"
  $casperDir = Join-Path $root "casper"
  $archDir = Join-Path $root "arch"
  $imagesDir = Join-Path $root "images"
  $antiXDir = Join-Path $root "antiX"
  $bootCatalog = Join-Path $root "boot.catalog"
  $bootCatalogAlt = Join-Path $root "boot\boot.catalog"

  $isWindowsInstaller = (Test-Path $setupExe) -and (Test-Path $bootMgr) -and ((Test-Path $installWim) -or (Test-Path $installEsd))
  $supportsBiosBoot = (Test-Path $bootMgr) -and (Test-Path $bootSect)
  $supportsUefiBoot = (Test-Path $bootMgrEfi) -or (Test-Path $bootMgrEfi32)
  $hasLinuxBootFiles = Test-AnyPath @(
    $isolinuxBin,
    $isolinuxCfg,
    $syslinuxCfg,
    $grubCfg,
    $efiGrubCfg,
    $bootCatalog,
    $bootCatalogAlt
  )
  $hasLinuxLayout = Test-AnyPath @(
    $liveDir,
    $casperDir,
    $archDir,
    $imagesDir,
    $antiXDir
  )
  $isLikelyLinuxIso = (-not $isWindowsInstaller) -and ($hasLinuxBootFiles -or $hasLinuxLayout -or $supportsUefiBoot)

  Emit-Result @{
    isWindowsInstaller = $isWindowsInstaller
    isLikelyLinuxIso = $isLikelyLinuxIso
    driveLetter = $driveLetter
    volumeLabel = $label
    hasInstallWim = (Test-Path $installWim)
    hasInstallEsd = (Test-Path $installEsd)
    hasBootSect = (Test-Path $bootSect)
    hasBootMgr = (Test-Path $bootMgr)
    hasBootBcd = (Test-Path $bcd)
    hasEfiBoot = (Test-Path $bootMgrEfi)
    hasEfiBoot32 = (Test-Path $bootMgrEfi32)
    hasIsolinuxBin = (Test-Path $isolinuxBin)
    hasIsolinuxCfg = (Test-Path $isolinuxCfg)
    hasSyslinuxCfg = (Test-Path $syslinuxCfg)
    hasGrubCfg = (Test-Path $grubCfg)
    hasEfiGrubCfg = (Test-Path $efiGrubCfg)
    hasLiveDir = (Test-Path $liveDir)
    hasCasperDir = (Test-Path $casperDir)
    hasArchDir = (Test-Path $archDir)
    hasImagesDir = (Test-Path $imagesDir)
    hasAntiXDir = (Test-Path $antiXDir)
    hasBootCatalog = (Test-Path $bootCatalog) -or (Test-Path $bootCatalogAlt)
    supportsBiosBoot = $supportsBiosBoot
    supportsUefiBoot = $supportsUefiBoot
    installWimSize = if (Test-Path $installWim) { (Get-Item $installWim).Length } else { 0 }
    installEsdSize = if (Test-Path $installEsd) { (Get-Item $installEsd).Length } else { 0 }
  }
}
finally {
  if ($mountedImage) {
    Dismount-DiskImage -ImagePath $IsoPath -ErrorAction SilentlyContinue | Out-Null
  }
}
