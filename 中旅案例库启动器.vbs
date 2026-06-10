' 中旅会展案例库启动器.vbs
' 双击此文件即可启动案例库

Dim objShell, objFSO, strDir

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
strDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' 切换到项目目录
objShell.CurrentDirectory = strDir

' 显示启动信息
MsgBox "中旅会展案例库管理系统" & vbCrLf & vbCrLf & "正在启动开发服务器..." & vbCrLf & "访问地址: http://localhost:5173", vbInformation, "中旅会展案例库"

' 启动pnpm dev
objShell.Run "cmd /k pnpm dev", 1, False

' 等待几秒让服务器启动
WScript.Sleep 6000

' 自动打开浏览器
objShell.Run "http://localhost:5173"

' 提示完成
MsgBox "✅ 启动完成！" & vbCrLf & "请稍等片刻，浏览器将自动打开。", vbInformation, "中旅会展案例库"

Set objShell = Nothing
Set objFSO = Nothing
