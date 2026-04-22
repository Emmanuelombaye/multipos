$token = Get-Content 'test-token.txt'
$headers = @{ Authorization = "Bearer $token" }
$baseUrl = 'http://localhost:5000'

try {
    Write-Host "Checking branches..."
    $branches = Invoke-RestMethod -Uri "$baseUrl/api/branches" -Method GET -Headers $headers
    $branchId = $branches[0].id
    Write-Host "Checking products for branch $branchId..."
    $products = Invoke-RestMethod -Uri "$baseUrl/api/products/branch/$branchId" -Method GET -Headers $headers
    Write-Host "Product Sample:"
    $products[0] | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
