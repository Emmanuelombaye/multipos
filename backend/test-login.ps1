# Test login and capture token
try {
    $body = '{"email":"cashier@tamasha.com","password":"@Kenya90!"}'
    $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "SUCCESS"
    Write-Host "Token start: $($r.token.Substring(0,40))"
    Write-Host "Role: $($r.user.role)"
    Write-Host "Name: $($r.user.name)"
    $r.token | Out-File -FilePath 'test-token.txt' -NoNewline
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd()
}
