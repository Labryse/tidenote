!macro preInit
  ; Eski "noteapp" program dizinini temizle (Varsayılan: AppData\Local\Programs\noteapp)
  IfFileExists "$LOCALAPPDATA\Programs\noteapp" 0 +2
    RMDir /r "$LOCALAPPDATA\Programs\noteapp"

  ; Eski "noteapp" kullanıcı verileri (AppData\Roaming\noteapp) dizinini temizle
  IfFileExists "$APPDATA\noteapp" 0 +2
    RMDir /r "$APPDATA\noteapp"
!macroend
