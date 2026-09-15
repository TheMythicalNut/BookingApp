# run.ps1 (local dev)

$composeFiles = @("-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")

Write-Host "Stopping and removing containers, networks, and volumes..."
docker-compose @composeFiles down -v

$imagesToRemove = @("spletka-backend", "spletka-frontend")

foreach ($image in $imagesToRemove) {
    $imageExists = docker images -q $image
    if ($imageExists) {
        Write-Host "Removing image: $image"
        docker rmi -f $image
    } else {
        Write-Host "Image $image not found, skipping..."
    }
}

# Start containers
Write-Host "Starting containers..."
docker-compose @composeFiles up -d

Write-Host ""
Write-Host "App should be reachable at:"
Write-Host "  Frontend: http://localhost:8080"
Write-Host "  Backend:  http://localhost:3000"