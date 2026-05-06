/**
 * Notification script - sends WhatsApp/SMS via Twilio.
 * Reads result from auth/result.json written by check-slots.js.
 * Only notifies for: available slots, session expired, errors.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  const toNumber = process.env.NOTIFY_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not set');
    process.exit(1);
  }

  const resultPath = path.join(__dirname, '..', 'auth', 'result.json');
  if (!fs.existsSync(resultPath)) {
    console.log('No result file - nothing to notify.');
    return;
  }

  const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));

  // Only notify for these statuses
  const notifyStatuses = ['available', 'session_expired', 'error', 'unknown'];
  if (!notifyStatuses.includes(result.status)) {
    console.log('Status: ' + result.status + ' - no notification needed.');
    return;
  }

  let body;
  switch (result.status) {
    case 'available':
      body =
        'InstaHelp Slots Available!\n\n' +
        result.message +
        '\n\nBook now: ' +
        (result.url || 'Open UC app');
      break;
    case 'session_expired':
      body = 'UC Session Expired\n\n' + result.message;
      break;
    default:
      body = 'UC Slot Checker Alert\n\n' + result.message;
  }

  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  try {
    const msg = await client.messages.create({
      from: 'whatsapp:' + fromNumber,
      to: 'whatsapp:' + toNumber,
      body: body,
    });
    console.log('WhatsApp sent! SID: ' + msg.sid);
  } catch (err) {
    console.error('WhatsApp failed: ' + err.message);
    try {
      const sms = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: body,
      });
      console.log('SMS fallback sent! SID: ' + sms.sid);
    } catch (smsErr) {
      console.error('SMS also failed: ' + smsErr.message);
      process.exit(1);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
