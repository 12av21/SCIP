$content = Get-Content E:\projects\SCIP\src\server\app.ts -Raw -Encoding UTF8

$old = "const attachFrontend = options.attachFrontend !== false && process.env.NODE_ENV !== 'test';" + [Environment]::NewLine + 
"  if (attachFrontend) {" + [Environment]::NewLine + 
"    // Development: Vite Middleware Mode; Production: Static dist" + [Environment]::NewLine + 
"    if (process.env.NODE_ENV === 'production') {"

$new = "// Allow serving the production-built frontend (dist/) in test mode for E2E tests" + [Environment]::NewLine + 
"  // when explicitly requested via SCIP_SERVE_DIST=1." + [Environment]::NewLine + 
"  const serveDist = process.env.SCIP_SERVE_DIST === '1';" + [Environment]::NewLine + 
"  const attachFrontend = options.attachFrontend !== false && (process.env.NODE_ENV !== 'test' || serveDist);" + [Environment]::NewLine + 
"  if (attachFrontend) {" + [Environment]::NewLine + 
"    // Development: Vite Middleware Mode; Production: Static dist; Test+ServeDist: Static dist" + [Environment]::NewLine + 
"    if (process.env.NODE_ENV === 'production' || serveDist) {"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content E:\projects\SCIP\src\server\app.ts -Value $content -Encoding UTF8
    Write-Host "Replacement successful"
} else {
    Write-Host "Pattern not found!"
    # Debug: show what we're looking for
    $idx = $content.IndexOf("attachFrontend")
    if ($idx -ge 0) {
        Write-Host "Found at index: $idx"
        Write-Host "Context: " + $content.Substring($idx, 200)
    }
}