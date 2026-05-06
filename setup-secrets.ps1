# Run this script to set all GitHub Secrets for the uc-slot-checker repo.
# Prerequisites: gh CLI installed and authenticated (run 'gh auth login' first)

$repo = "SuyashMisra/uc-slot-checker"

Write-Host "`nSetting GitHub Secrets for $repo...`n" -ForegroundColor Cyan

# Twilio credentials
echo "YOUR_TWILIO_ACCOUNT_SID_HERE" | gh secret set TWILIO_ACCOUNT_SID -R $repo
Write-Host "[OK] TWILIO_ACCOUNT_SID" -ForegroundColor Green

echo "YOUR_TWILIO_AUTH_TOKEN_HERE" | gh secret set TWILIO_AUTH_TOKEN -R $repo
Write-Host "[OK] TWILIO_AUTH_TOKEN" -ForegroundColor Green

echo "YOUR_TWILIO_SANDBOX_NUMBER_HERE" | gh secret set TWILIO_WHATSAPP_FROM -R $repo
Write-Host "[OK] TWILIO_WHATSAPP_FROM" -ForegroundColor Green

echo "YOUR_PERSONAL_WHATSAPP_NUMBER_HERE" | gh secret set NOTIFY_PHONE_NUMBER -R $repo
Write-Host "[OK] NOTIFY_PHONE_NUMBER" -ForegroundColor Green

echo "YOUR_PERSONAL_WHATSAPP_NUMBER_HERE" | gh secret set UC_PHONE_NUMBER -R $repo
Write-Host "[OK] UC_PHONE_NUMBER" -ForegroundColor Green

# Checkout URL - user can update this later if it changes
echo "https://www.urbancompany.com/journey/checkout?city=city_hyderabad_v2&category=insta_maids&draftOrderId=69fb6bd877d0560027e71549&screen=tem_temkao" | gh secret set UC_CHECKOUT_URL -R $repo
Write-Host "[OK] UC_CHECKOUT_URL" -ForegroundColor Green

Write-Host "`nAll secrets set! Now run 'npm run login' to save your session, then:" -ForegroundColor Cyan
Write-Host "  gh secret set UC_SESSION -R $repo < auth/session.json" -ForegroundColor Yellow
