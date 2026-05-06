# UC InstaHelp Slot Checker

Automatically checks Urban Company InstaHelp slot availability every 15 minutes and sends you a WhatsApp notification when any slots become available.

## How It Works

1. **You log in once** locally — a Playwright browser opens, you log into UC manually (handles Captcha + OTP)
2. **Session is saved** and stored as a GitHub Secret
3. **GitHub Actions runs every 15 min** (24/7), loads your session, and navigates through the InstaHelp booking flow
4. **If slots appear** → you get a WhatsApp message via Twilio
5. **If session expires** → you get notified to re-login

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/SuyashMisra/uc-slot-checker.git
cd uc-slot-checker
npm install
npx playwright install chromium
```

### 2. Login and Save Session

```bash
npm run login
```

A browser window opens. Log into Urban Company manually, then press ENTER in the terminal.

### 3. Set GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|--------|-------|
| `UC_SESSION` | Use `node setup-secrets.js` locally to auto-encrypt and push this, or manually format the `auth/session.json` contents using libsodium. |
| `TWILIO_ACCOUNT_SID` | From [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_WHATSAPP_FROM` | Twilio Sandbox number, e.g. `+14151234567` |
| `NOTIFY_PHONE_NUMBER` | Your WhatsApp number, e.g. `+919876543210` |

### 4. Set Up Twilio WhatsApp Sandbox

1. Go to [Twilio Console → Messaging → Try it out → WhatsApp](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Send the join code from your WhatsApp to the sandbox number
3. You're connected! (Re-send the join message every 72 hours to keep it active)

### 5. Test It

Trigger the workflow manually: **Actions → Check InstaHelp Slots → Run workflow**

## When Session Expires

You'll get a WhatsApp message saying the session expired. Run `npm run login` again and use `node setup-secrets.js` to update the `UC_SESSION` secret.

## Cost

- **GitHub Actions**: Free (unlimited minutes because the repository is public)
- **Twilio WhatsApp Sandbox**: Free
- **Total**: $0/month
