$content = Get-Content E:\projects\SCIP\src\server\app.ts -Raw -Encoding UTF8

$old = "const attachFrontend = options.attachFrontend !== false && process.env.NODE_ENV !== 'test';" + "`r`n" + 
"  if (attachFrontend) {" + "`r`n" + 
"    // Development: Vite Middleware Mode; Production: Static dist" + "`r`n" + 
"    if (process.env.NODE_ENV === 'production') {"

$new = "// Allow serving the production-built frontend (dist/) in test mode for E2E tests" + "`r`n" + 
"  // when explicitly requested via SCIP_SERVE_DIST=1." + "`r`n" + 
"  const serveDist = process.env.SCIP_SERVE_DIST === '1';" + "`r`n" + 
"  const attachFrontend = options.attachFrontend !== false && (process.env.NODE_ENV !== 'test' || serveDist);" + "`r`n" + 
"  if (attachFrontend) {" + "`r`n" + 
"    // Development: Vite Middleware Mode; Production: Static dist; Test+ServeDist: Static dist" + "`r`n" + 
"    if (process.env.NODE_ENV === 'production' || serveDist) {"

$content = $content.Replace($old, $new)

Set-Content E:\projects\SCIP\src\server\app.ts -Value $content -Encoding UTF8
Write-Host "Done"