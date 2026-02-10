# Fix Dependency Conflicts Script

Write-Host "Cleaning up old dependencies..."
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Write-Host "Installing compatible versions..."
# Install Hardhat 2.22.x (Safe CJS version) and Toolbox 5.0.0 (Compatible with Hardhat 2.x)
# We also install specific ethers version to match toolbox expectations
npm install --save-dev hardhat@2.22.10 @nomicfoundation/hardhat-toolbox@5.0.0 ethers@6.13.0

Write-Host "Installing remaining dependencies..."
npm install

Write-Host "Done! You can now run 'npm test'"
