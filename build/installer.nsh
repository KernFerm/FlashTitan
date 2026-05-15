; FlashTitan NSIS include script
; Loaded by electron-builder through build.nsis.include.
; This file extends the default assisted installer instead of replacing it.

!include "LogicLib.nsh"
!include "MUI2.nsh"

!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "Install FlashTitan"
  !define MUI_WELCOMEPAGE_TEXT "FlashTitan creates bootable USB and SD media for operating system installation.$\r$\n$\r$\nUse removable media only. Flashing erases the selected target device."
  !define MUI_FINISHPAGE_TITLE "FlashTitan installation complete"
  !define MUI_FINISHPAGE_TEXT "Open FlashTitan from the Start Menu or desktop, then run it as Administrator before creating real bootable media."
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customPageAfterChangeDir
  !define MUI_PAGE_HEADER_TEXT "FlashTitan Safety Acknowledgment"
  !define MUI_PAGE_HEADER_SUBTEXT "Review the FlashTitan safety terms before installation continues."
  !define MUI_LICENSEPAGE_TEXT_TOP "FlashTitan can erase removable media and should be used carefully. Please review this safety acknowledgment before proceeding."
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "If you accept these safety terms, click I Agree to continue."
  !define MUI_LICENSEPAGE_BUTTON "$(^NextBtn)"
  !define MUI_INNERTEXT_LICENSE_BOTTOM " "
  !insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\SAFETY_ACKNOWLEDGMENT.txt"
  !undef MUI_PAGE_HEADER_TEXT
  !undef MUI_PAGE_HEADER_SUBTEXT
  !undef MUI_LICENSEPAGE_TEXT_TOP
  !undef MUI_LICENSEPAGE_TEXT_BOTTOM
  !undef MUI_LICENSEPAGE_BUTTON
  !undef MUI_INNERTEXT_LICENSE_BOTTOM
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Remove FlashTitan"
  !define MUI_WELCOMEPAGE_TEXT "FlashTitan can be removed from this PC.$\r$\n$\r$\nApplication logs and support bundles are kept by default unless you choose the optional cleanup section."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\FlashTitan"
!macroend

!macro customInit
  SetRegView 64
  DetailPrint "Initializing FlashTitan installer..."

  ${ifNot} ${isUpdated}
    MessageBox MB_ICONINFORMATION|MB_OK \
      "FlashTitan prepares bootable USB and SD media.$\r$\n$\r$\nImportant:$\r$\n- Run FlashTitan as Administrator for real write operations.$\r$\n- Use removable media only.$\r$\n- Flashing erases the selected target device."
  ${endIf}

  UserInfo::GetAccountType
  Pop $0
  ${If} $0 != "admin"
    MessageBox MB_ICONEXCLAMATION|MB_OK \
      "Windows may prompt for elevation during installation. FlashTitan also requires Administrator rights later when writing to physical drives."
  ${EndIf}
!macroend

!macro customInstallMode
  SetShellVarContext all
!macroend

!macro customInstall
  SetShellVarContext all
  SetRegView 64

  DetailPrint "Installing FlashTitan bootable media utility..."
  DetailPrint "Applying system-wide shortcuts, safety notes, and support links..."

  CreateDirectory "$SMPROGRAMS\FlashTitan"

  FileOpen $0 "$INSTDIR\FlashTitan Safety Notes.txt" w
  FileWrite $0 "FlashTitan Safety Notes$\r$\n"
  FileWrite $0 "=======================$\r$\n$\r$\n"
  FileWrite $0 "1. Run FlashTitan as Administrator before creating bootable media.$\r$\n"
  FileWrite $0 "2. Flash only removable USB drives and SD cards.$\r$\n"
  FileWrite $0 "3. Flashing erases the selected target device.$\r$\n"
  FileWrite $0 "4. Review all warnings before continuing.$\r$\n"
  FileWrite $0 "5. Use verification after write completion whenever possible.$\r$\n$\r$\n"
  FileWrite $0 "After installation:$\r$\n"
  FileWrite $0 "- Launch FlashTitan from the Start Menu or desktop shortcut.$\r$\n"
  FileWrite $0 "- On first real use, run the app with Administrator rights.$\r$\n"
  FileWrite $0 "- Open the logs helper if you need troubleshooting output.$\r$\n"
  FileClose $0

  FileOpen $1 "$INSTDIR\Open FlashTitan Logs.cmd" w
  FileWrite $1 "@echo off$\r$\n"
  FileWrite $1 "set LOG1=%APPDATA%\flashtitan\logs$\r$\n"
  FileWrite $1 "set LOG2=%LOCALAPPDATA%\FlashTitan\logs$\r$\n"
  FileWrite $1 "if exist $\"%LOG1%$\" explorer $\"%LOG1%$\"$\r$\n"
  FileWrite $1 "if not exist $\"%LOG1%$\" if exist $\"%LOG2%$\" explorer $\"%LOG2%$\"$\r$\n"
  FileWrite $1 "if not exist $\"%LOG1%$\" if not exist $\"%LOG2%$\" explorer $\"%APPDATA%$\"$\r$\n"
  FileClose $1

  WriteINIStr "$INSTDIR\FlashTitan Support.url" "InternetShortcut" "URL" "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-device-boot-mode"
  WriteINIStr "$INSTDIR\FlashTitan Support.url" "InternetShortcut" "IconFile" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteINIStr "$INSTDIR\FlashTitan Support.url" "InternetShortcut" "IconIndex" "0"

  CreateShortCut "$SMPROGRAMS\FlashTitan\FlashTitan Safety Notes.lnk" "$WINDIR\notepad.exe" '$\"$INSTDIR\FlashTitan Safety Notes.txt$\"'
  CreateShortCut "$SMPROGRAMS\FlashTitan\Open FlashTitan Logs.lnk" "$INSTDIR\Open FlashTitan Logs.cmd"
  CreateShortCut "$SMPROGRAMS\FlashTitan\FlashTitan Support.lnk" "$INSTDIR\FlashTitan Support.url"

  WriteRegStr HKLM "Software\FlashTitan" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\FlashTitan" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\FlashTitan" "ProductName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\FlashTitan" "SupportUrl" "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-device-boot-mode"
  WriteRegStr HKLM "Software\FlashTitan" "LogHelper" "$INSTDIR\Open FlashTitan Logs.cmd"

  ${ifNot} ${isUpdated}
    MessageBox MB_ICONINFORMATION|MB_OK \
      "FlashTitan has been installed.$\r$\n$\r$\nNext steps:$\r$\n- Open FlashTitan from the Start Menu or desktop.$\r$\n- Run it as Administrator before writing real bootable media.$\r$\n- Review the installed Safety Notes and Logs helper shortcuts if needed."
  ${endIf}
!macroend

!macro customRemoveFiles
  Delete "$INSTDIR\FlashTitan Safety Notes.txt"
  Delete "$INSTDIR\Open FlashTitan Logs.cmd"
  Delete "$INSTDIR\FlashTitan Support.url"
!macroend

!macro customUnInit
  MessageBox MB_ICONINFORMATION|MB_OK \
    "FlashTitan logs and support bundles can remain after uninstall unless you choose the optional cleanup section."
!macroend

!macro customUnInstall
  SetShellVarContext all
  SetRegView 64

  DetailPrint "Removing FlashTitan..."
  DetailPrint "Cleaning installer-created shortcuts and registry entries..."

  Delete "$SMPROGRAMS\FlashTitan\FlashTitan Safety Notes.lnk"
  Delete "$SMPROGRAMS\FlashTitan\Open FlashTitan Logs.lnk"
  Delete "$SMPROGRAMS\FlashTitan\FlashTitan Support.lnk"
  RMDir "$SMPROGRAMS\FlashTitan"

  Delete "$INSTDIR\FlashTitan Safety Notes.txt"
  Delete "$INSTDIR\Open FlashTitan Logs.cmd"
  Delete "$INSTDIR\FlashTitan Support.url"

  DeleteRegKey HKLM "Software\FlashTitan"
!macroend

!macro customUnInstallSection
  Section /o "un.Remove FlashTitan logs and support bundles"
    RMDir /r "$APPDATA\flashtitan\logs"
    RMDir /r "$LOCALAPPDATA\FlashTitan\logs"
    RMDir /r "$APPDATA\flashtitan\Support"
    RMDir /r "$LOCALAPPDATA\FlashTitan\Support"
  SectionEnd
!macroend
