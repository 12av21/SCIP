$content = Get-Content E:\projects\SCIP\src\server\app.ts -Raw -Encoding UTF8

# Find the exact location
$idx = $content.IndexOf("const attachFrontend = options.attachFrontend !== false")
if ($idx -ge 0) {
    Write-Host "Found at index: $idx"
    Write-Host "Context: [" + $content.Substring($idx, 300).Replace([Environment]::NewLine, "`n") + "]"
    
    # Find the end of the if block we want to replace
    $searchStart = $idx
    $line1End = $content.IndexOf([Environment]::NewLine, $searchStart)
    $line1 = $content.Substring($searchStart, $line1End - $searchStart + 1)
    Write-Host "Line 1: [$line1]"
    
    $line2Start = $line1End + 1
    $line2End = $content.IndexOf([Environment]::NewLine, $line2Start)
    $line2 = $content.Substring($line2Start, $line2End - $line2Start + 1)
    Write-Host "Line 2: [$line2]"
    
    $line3Start = $line2End + 1
    $line3End = $content.IndexOf([Environment]::NewLine, $line3Start)
    $line3 = $content.Substring($line3Start, $line3End - $line3Start + 1)
    Write-Host "Line 3: [$line3]"
    
    $line4Start = $line3End + 1
    $line4End = $content.IndexOf([Environment]::NewLine, $line4Start)
    $line4 = $content.Substring($line4Start, $line4End - $line4Start + 1)
    Write-Host "Line 4: [$line4]"
    
    $oldBlock = $line1 + $line2 + $line3 + $line4
    Write-Host "Old block length: " + $oldBlock.Length
    
    $newBlock = "// Allow serving the production-built frontend (dist/) in test mode for E2E tests" + [Environment]::NewLine + 
    "  // when explicitly requested via SCIP_SERVE_DIST=1." + [Environment]::NewLine + 
    "  const serveDist = process.env.SCIP_SERVE_DIST === '1';" + [Environment]::NewLine + 
    "  const attachFrontend = options.attachFrontend !== false && (process.env.NODE_ENV !== 'test' || serveDist);" + [Environment]::NewLine + 
    "  if (attachFrontend) {" + [Environment]::NewLine + 
    "    // Development: Vite Middleware Mode; Production: Static dist; Test+ServeDist: Static dist" + [Environment]::NewLine + 
    "    if (process.env.NODE_ENV === 'production' || serveDist) {" + [Environment]::NewLine
    
    Write-Host "New block: [" + $newBlock.Replace([Environment]::NewLine, "`n") + "]"
    
    $content = $content.Remove($idx, $oldBlock.Length).Insert($idx, $newBlock)
    Set-Content E:\projects\SCIP\src\server\app.ts -Value $content -Encoding UTF8
    Write-Host "Replacement successful"
} else {
    Write-Host "Not found"
}