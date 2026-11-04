@echo off
chcp 65001 >nul
title Excel 一鍵轉 PDF 工具 (零安裝免權限)

echo ========================================================
echo   Excel 轉 PDF 工具 (Windows 原生微型腳本)
echo   100%% 完整保留圖表 (Charts)、流程圖 (SmartArt) 與版面
echo ========================================================
echo.

if "%~1"=="" (
    echo [提示] 請直接將 .xlsx 或 .xls 檔案「拖曳放置到此 .bat 檔案圖示上」即可自動轉檔！
    echo.
    echo 正在搜尋當前目錄下的 Excel 檔案進行轉換...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
        $excel = New-Object -ComObject Excel.Application;
        $excel.Visible = $false;
        $excel.DisplayAlerts = $false;
        $excel.AutomationSecurity = 3;
        $files = Get-ChildItem -Path . -Include *.xlsx,*.xls -Recurse;
        if ($files.Count -eq 0) {
            Write-Host '當前目錄未找到任何 Excel 檔案，開啟檔案選擇視窗...' -ForegroundColor Yellow;
            Add-Type -AssemblyName System.Windows.Forms;
            $dialog = New-Object System.Windows.Forms.OpenFileDialog;
            $dialog.Filter = 'Excel 檔案 (*.xlsx;*.xls)|*.xlsx;*.xls';
            $dialog.Multiselect = $true;
            $dialog.Title = '選擇要轉換的 Excel 檔案';
            if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                foreach ($f in $dialog.FileNames) {
                    $pdfPath = [System.IO.Path]::ChangeExtension($f, '.pdf');
                    Write-Host ('[轉換中] ' + [System.IO.Path]::GetFileName($f) + ' -> ' + [System.IO.Path]::GetFileName($pdfPath)) -ForegroundColor Cyan;
                    try {
                        $wb = $excel.Workbooks.Open($f);
                        $wb.ExportAsFixedFormat(0, $pdfPath);
                        $wb.Close($false);
                        Write-Host ('[完成] ' + [System.IO.Path]::GetFileName($pdfPath)) -ForegroundColor Green;
                    } catch {
                        Write-Host ('[錯誤] ' + $_.Exception.Message) -ForegroundColor Red;
                    }
                }
            } else {
                Write-Host '未選擇任何檔案，取消轉換。' -ForegroundColor Yellow;
            }
        } else {
            foreach ($file in $files) {
                $pdfPath = [System.IO.Path]::ChangeExtension($file.FullName, '.pdf');
                Write-Host ('[轉換中] ' + $file.Name + ' -> ' + [System.IO.Path]::GetFileName($pdfPath)) -ForegroundColor Cyan;
                try {
                    $wb = $excel.Workbooks.Open($file.FullName);
                    $wb.ExportAsFixedFormat(0, $pdfPath);
                    $wb.Close($false);
                    Write-Host ('[完成] ' + [System.IO.Path]::GetFileName($pdfPath)) -ForegroundColor Green;
                } catch {
                    Write-Host ('[錯誤] ' + $_.Exception.Message) -ForegroundColor Red;
                }
            }
        }
        $excel.Quit();
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null;
    }"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
        $excel = New-Object -ComObject Excel.Application;
        $excel.Visible = $false;
        $excel.DisplayAlerts = $false;
        $excel.AutomationSecurity = 3;
        foreach ($arg in $args) {
            if (Test-Path -Path $arg -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($arg).ToLower();
                if ($ext -eq '.xlsx' -or $ext -eq '.xls') {
                    $pdfPath = [System.IO.Path]::ChangeExtension($arg, '.pdf');
                    Write-Host ('[轉換中] ' + [System.IO.Path]::GetFileName($arg)) -ForegroundColor Cyan;
                    try {
                        $wb = $excel.Workbooks.Open((Resolve-Path $arg).Path);
                        $wb.ExportAsFixedFormat(0, $pdfPath);
                        $wb.Close($false);
                        Write-Host ('[成功輸出] ' + $pdfPath) -ForegroundColor Green;
                    } catch {
                        Write-Host ('[錯誤] ' + $_.Exception.Message) -ForegroundColor Red;
                    }
                }
            }
        }
        $excel.Quit();
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null;
    }" %*
)

echo.
echo ========================================================
echo 處理完畢，按任意鍵關閉視窗...
pause >nul
