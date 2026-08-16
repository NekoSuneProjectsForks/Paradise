!include "MUI2.nsh"
!include "InstallOptions.nsh"
!include "x64.nsh"

!define INSTNAME "ParadiseServer"
!define VERSION "2.2.0"

Name "Paradise Server (Update ${VERSION})"
BrandingText "${U+A9} 2017, 2022-2026 Team FESTIVAL"
OutFile "..\..\.release\server\Paradise-server-win-aarch64.exe"
InstallDir "$PROGRAMFILES64\Paradise"
ShowInstDetails show
ShowUninstDetails show


; Installer Defines
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "banner.bmp"

!define MUI_ABORTWARNING_TEXT "Are you sure you want to quit the Paradise Server Setup?"
!define MUI_ABORTWARNING_CANCEL_DEFAULT
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Welcome to the Paradise Server Setup"
!define MUI_WELCOMEPAGE_TEXT "Setup will guide you through installing the Paradise Server (Update ${VERSION}).$\r$\n$\r$\nIf you are updating an existing installation, please make sure the Web Services and the Photon Realtime servers are not running while installing Paradise.$\r$\n$\r$\nClick Next to continue."

!define MUI_LICENSEPAGE_RADIOBUTTONS
!define MUI_LICENSEPAGE_TEXT_TOP "Please read the following license agreement carefully:"
!define MUI_LICENSEPAGE_TEXT_BOTTOM "To install the Paradise Server, you must accept the agreement. Click Next to continue."

!define MUI_DIRECTORYPAGE_TEXT_TOP "Setup will install the Paradise Server in the following folder. To install in a different folder, click Browse and select another folder. Click Next to continue."

!define MUI_COMPONENTSPAGE_TEXT_TOP "Check the components you want to install and uncheck those you don't want to install.$\r$\nIf you have installed the Paradise Server before, choose the $\"Upgrade$\" option. Click Install to start the installation."

!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_TITLE "Completing the Paradise Server Setup"
!define MUI_FINISHPAGE_TEXT "The Paradise Server (Update ${VERSION}) has been installed on your computer.$\r$\n$\r$\nFor more information on how to setup and customize Paradise, please visit the Wiki using the link below. If you need any help with running your Paradise server, feel free to join the official Paradise Discord.$\r$\n$\r$\nClick Finish to close Setup."

!define MUI_FINISHPAGE_LINK "Paradise Wiki"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/festivaldev/Paradise/wiki"
!define MUI_FINISHPAGE_LINK_COLOR "0088CC"

InstType "Full"
InstType "Upgrade"


; Installer Pages
!insertmacro MUI_PAGE_WELCOME

!define MUI_PAGE_HEADER_SUBTEXT "Please review the license terms before installing the Paradise Server."
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"

!define MUI_PAGE_HEADER_TEXT "Choose Install Location"
!define MUI_PAGE_HEADER_SUBTEXT "Choose the folder in which to install the Paradise Server."
!insertmacro MUI_PAGE_DIRECTORY

!define MUI_PAGE_HEADER_SUBTEXT "Choose which features of the Paradise Server you want to install."
!insertmacro MUI_PAGE_COMPONENTS

!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_PAGE_FINISH


; Uninstaller Defines
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "banner.bmp"

!undef MUI_UNABORTWARNING_TEXT

!define MUI_UNABORTWARNING_TEXT "${MUI_ABORTWARNING_TEXT}"
!define MUI_UNABORTWARNING_CANCEL_DEFAULT
!define MUI_UNABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Welcome to the Paradise Server Uninstaller"
!define MUI_WELCOMEPAGE_TEXT "Setup will guide you through uninstalling the Paradise Server.$\r$\n$\r$\nClick Next to continue."

!define MUI_PAGE_HEADER_TEXT "Uninstall Paradise"
!define MUI_PAGE_HEADER_SUBTEXT "Remove the Paradise Server from your computer."
!define MUI_UNCONFIRMPAGE_TEXT_TOP "The Paradise Server will be uninstalled from the following folder."

!define MUI_UNFINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_TITLE "Completing the Paradise Server Uninstall"
!define MUI_FINISHPAGE_TEXT "The Paradise Server has been uninstalled successfully from computer.$\r$\n$\r$\nClick Finish to close Setup."

!define MUI_FINISHPAGE_LINK "Paradise Wiki"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/festivaldev/Paradise/wiki"
!define MUI_FINISHPAGE_LINK_COLOR "0088CC"


; Uninstaller Pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH


!insertmacro MUI_LANGUAGE "English"


; Sections
Section "Paradise Server Runtime" ParadiseServerRuntime
	SectionIn RO

	SetOutPath "$INSTDIR\Paradise.Realtime"
	File /r /x "logs" /x "UnityEngine.dll" /x paradise-realtime.yml "..\..\.release\server\_pak\Paradise.Realtime\*.*"

	SetOutPath "$INSTDIR\Paradise.WebServices"
	File /r /x "logs" /x "updates" /x "paradise-*" /x "Paradise.WebServices_x64.exe" /x paradise.yml "..\..\.release\server\_pak\Paradise.WebServices\*.*"
SectionEnd

SectionGroup /e "Setup Windows Services" Services
	Section "Web Services" WSService
		SectionIn 1

		InitPluginsDir

		SetOutPath "$PLUGINSDIR"
		DetailPrint 'Downloading NSSM'
        NSISdl::download "https://nssm.cc/ci/nssm-2.24-103-gdee49fc.zip" "$PLUGINSDIR\nssm-2.24-103-gdee49fc.zip"

        DetailPrint 'Extracting NSSM'
        ; Nsis7z::Extract "$PLUGINSDIR\nssm-2.24-103-gdee49fc.zip"

        Var /GLOBAL NSSMPath

        ${If} ${RunningX64}
            StrCpy $NSSMPath "nssm-2.24-103-gdee49fc\win64\nssm.exe"
        ${Else}
            StrCpy $NSSMPath "nssm-2.24-103-gdee49fc\win32\nssm.exe"
        ${EndIf}

        nsisunz::Unzip /noextractpath /file "$NSSMPath" "$PLUGINSDIR\nssm-2.24-103-gdee49fc.zip" "$INSTDIR"

        ;DetailPrint "$PLUGINSDIR\$NSSMPath"
        ;DetailPrint "$INSTDIR"
        ;CopyFiles /SILENT "$PLUGINSDIR\$NSSMPath" "$INSTDIR"

        DetailPrint "Creating service for Paradise.WebServices"

        Var /GLOBAL ParadiseExe

        ${If} ${RunningX64}
            StrCpy $ParadiseExe "Paradise.WebServices_x64.exe"
        ${Else}
            StrCpy $ParadiseExe "Paradise.WebServices.exe"
        ${EndIf}

        nsExec::Exec "$INSTDIR\nssm.exe install Paradise.WebServices $INSTDIR\Paradise.WebServices\$ParadiseExe"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.WebServices DisplayName $\"Paradise Web Services$\""
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.WebServices Description $\"Service for running the Web Services API and File Server used by Paradise, a UberStrike Server implementation.$\""
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.WebServices AppParameters --service"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.WebServices AppEnvironmentExtra NODE_ENV=$\"production$\""

		; DetailPrint 'Starting service "Paradise Web Services" (this might take a moment)'
		; nsExec::Exec 'net start NewParadise.WebServices'

		SetOutPath "$INSTDIR"
	SectionEnd

    Section "Realtime: Comm Server" RTCommService
        SectionIn 1
        DetailPrint "Creating service for Paradise.Realtime.Comm"
        nsExec::Exec "$INSTDIR\nssm.exe install Paradise.Realtime.Comm $INSTDIR\Paradise.Realtime\Paradise.Realtime.Host.exe"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Comm DisplayName $\"Paradise Comm Server$\""
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Comm AppParameters comm"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Comm DependsOnService Paradise.WebServices"

        ; DetailPrint 'Starting service "Paradise Comm Server$" (this might take a moment)'
        ; nsExec::Exec "$INSTDIR\nssm.exe start Paradise.Realtime.Comm"
    SectionEnd

    Section "Realtime: Game Server" RTGameService
        SectionIn 1
        DetailPrint "Creating service for Paradise.Realtime.Game"
        nsExec::Exec "$INSTDIR\nssm.exe install Paradise.Realtime.Game $INSTDIR\Paradise.Realtime\Paradise.Realtime.Host.exe"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Game DisplayName $\"Paradise Game Server$\""
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Game AppParameters game"
        nsExec::Exec "$INSTDIR\nssm.exe set Paradise.Realtime.Game DependsOnService Paradise.WebServices"

        ; DetailPrint 'Starting service "Paradise Game Server$" (this might take a moment)'
        ; nsExec::Exec "$INSTDIR\nssm.exe start Paradise.Realtime.Game"
    SectionEnd
SectionGroupEnd

Section "Add Firewall Rules" Firewall
	SectionIn 1
	DetailPrint "Adding Firewall rules"
	nsExec::Exec 'netsh advfirewall firewall add rule name="Paradise Server" dir=in localport="8080,8081,8082,5055,5155" protocol=TCP action=allow'
	nsExec::Exec 'netsh advfirewall firewall add rule name="Paradise Server" dir=in localport="8080,8081,8082,5055,5155" protocol=UDP action=allow'
SectionEnd

Section
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "DisplayName" "Paradise Server"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "DisplayIcon" '"$INSTDIR\uninstall.exe"'
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "DisplayVersion" "${VERSION}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "Publisher" "Team FESTIVAL"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "URLInfoAbout" "https://github.com/festivaldev/Paradise/"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "URLUpdateInfo" "https://github.com/festivaldev/Paradise/releases"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "HelpLink" "https://github.com/festivaldev/Paradise/wiki"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}" "NoRepair" 1

	WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
	DetailPrint "Removing service for Paradise.Realtime.Comm"
	nsExec::Exec "$INSTDIR\nssm.exe stop Paradise.Realtime.Comm"
	nsExec::Exec "$INSTDIR\nssm.exe remove Paradise.Realtime.Comm confirm"

    DetailPrint "Removing service for Paradise.Realtime.Game"
	nsExec::Exec "$INSTDIR\nssm.exe stop Paradise.Realtime.Game"
	nsExec::Exec "$INSTDIR\nssm.exe remove Paradise.Realtime.Game confirm"

	DetailPrint "Removing service for Paradise.WebServices"
	nsExec::Exec "$INSTDIR\nssm.exe stop NewParadise.WebServices"
	nsExec::Exec "$INSTDIR\nssm.exe remove NewParadise.WebServices confirm"

	RMDir /r "$INSTDIR"

	DetailPrint "Deleting Firewall rules"
	nsExec::Exec 'netsh advfirewall firewall delete rule name="Paradise Server" protocol=TCP'
	nsExec::Exec 'netsh advfirewall firewall delete rule name="Paradise Server" protocol=UDP'

	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${INSTNAME}"
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
!insertmacro MUI_DESCRIPTION_TEXT ${ParadiseServerRuntime} "Installs the Paradise Server."
!insertmacro MUI_DESCRIPTION_TEXT ${Services} "Create Windows services."
!insertmacro MUI_DESCRIPTION_TEXT ${WSService} "Create a Windows service for the Web Services that is started automatically after the system has booted."
!insertmacro MUI_DESCRIPTION_TEXT ${RTCommService} "Create a Windows service for the Realtime Comm Server that is started automatically after the system has booted."
!insertmacro MUI_DESCRIPTION_TEXT ${RTGameService} "Create a Windows service for the Realtime Game Server that is started automatically after the system has booted."
!insertmacro MUI_DESCRIPTION_TEXT ${Firewall} "Adds Firewall rules to allow incoming connections to the Paradise servers."
!insertmacro MUI_FUNCTION_DESCRIPTION_END
