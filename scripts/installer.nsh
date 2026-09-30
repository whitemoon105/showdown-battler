!macro preInit
  ; 保留理由：本机遵循游戏仓库分类；没有 E 盘的电脑使用安装器支持的用户目录。
  IfFileExists "E:\*.*" 0 noGameDrive
    StrCpy $INSTDIR "E:\Games\Warehouse\ShowdownBattler"
    Goto installPathReady
  noGameDrive:
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\ShowdownBattler"
  installPathReady:
!macroend
