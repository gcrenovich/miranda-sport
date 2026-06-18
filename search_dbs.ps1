$path = "C:\Users\German A. IT\.gemini\antigravity-ide\conversations"
$outFile = "c:\Users\German A. IT\.gemini\antigravity-ide\scratch\miranda-sport\search_results.txt"
"--- SEARCH START ---" | Out-File $outFile -Encoding utf8

Get-ChildItem $path -Filter *.db | ForEach-Object {
    $file = $_.FullName
    $name = $_.Name
    $size = $_.Length
    $mtime = $_.LastWriteTime
    "File: $name | Size: $size | Modified: $mtime" | Out-File $outFile -Append -Encoding utf8
    
    try {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::GetEncoding("latin1"))
        $matches = [regex]::Matches($content, '[\x20-\x7E\xA0-\xFF]{15,500}')
        $filtered = $matches | Where-Object { 
            $val = $_.Value.ToLower()
            ($val -like "*miranda*" -or $val -like "*vendedor*" -or $val -like "*pedido*" -or $val -like "*afip*" -or $val -like "*despliegue*" -or $val -like "*usuario*") -and
            -not ($val -like "*sqlite*") -and -not ($val -like "*table*") -and -not ($val -like "*index*")
        }
        
        "  Found $($filtered.Count) filtered matches." | Out-File $outFile -Append -Encoding utf8
        if ($filtered.Count -gt 0) {
            $seen = @{}
            $unique = @()
            for ($i = $filtered.Count - 1; $i -ge 0; $i--) {
                $m = $filtered[$i].Value.Trim() -replace '\s+', ' '
                if (-not $seen.ContainsKey($m) -and $m.Length -gt 25) {
                    $seen[$m] = $true
                    $unique += $m
                    if ($unique.Count -ge 20) { break }
                }
            }
            $unique | ForEach-Object { "    [Candidate] $_" | Out-File $outFile -Append -Encoding utf8 }
        }
    } catch {
        "  Error reading file: $_" | Out-File $outFile -Append -Encoding utf8
    }
}
"--- SEARCH END ---" | Out-File $outFile -Append -Encoding utf8
