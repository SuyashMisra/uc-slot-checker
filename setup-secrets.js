/**
 * Sets GitHub Actions secrets for the uc-slot-checker repo.
 * Uses libsodium-wrappers for the sealed-box encryption GitHub requires.
 *
 * Usage: GH_TOKEN=ghp_xxx node setup-secrets.js
 */
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
const REPO = 'SuyashMisra/uc-slot-checker';

const SECRETS = {
  TWILIO_ACCOUNT_SID: 'YOUR_TWILIO_ACCOUNT_SID_HERE',
  TWILIO_AUTH_TOKEN: 'YOUR_TWILIO_AUTH_TOKEN_HERE',
  TWILIO_WHATSAPP_FROM: 'YOUR_TWILIO_SANDBOX_NUMBER_HERE',
  NOTIFY_PHONE_NUMBER: 'YOUR_PERSONAL_WHATSAPP_NUMBER_HERE',
  UC_PHONE_NUMBER: 'YOUR_PERSONAL_WHATSAPP_NUMBER_HERE',
  UC_CHECKOUT_URL:
    'https://www.urbancompany.com/journey/checkout?city=city_hyderabad_v2&category=insta_maids&draftOrderId=69fb6bd877d0560027e71549&screen=tem_temkao',
};

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}${path}`,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'uc-slot-checker-setup',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (body) options.headers['Content-Type'] = 'application/json';
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
        else resolve(data ? JSON.parse(data) : {});
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  if (!TOKEN) {
    console.error('ERROR: Set GH_TOKEN environment variable first.');
    process.exit(1);
  }

  // Install libsodium-wrappers if needed
  let sodium;
  try {
    sodium = require('libsodium-wrappers');
  } catch {
    console.log('Installing libsodium-wrappers...');
    require('child_process').execSync('npm install libsodium-wrappers', { stdio: 'inherit' });
    sodium = require('libsodium-wrappers');
  }
  await sodium.ready;

  // Get repo public key
  const keyData = await apiRequest('GET', '/actions/secrets/public-key');
  const publicKey = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL);
  const keyId = keyData.key_id;
  console.log('Public key ID: ' + keyId + '\n');

  for (const [name, value] of Object.entries(SECRETS)) {
    const messageBytes = sodium.from_string(value);
    const encrypted = sodium.crypto_box_seal(messageBytes, publicKey);
    const encryptedB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);

    await apiRequest('PUT', `/actions/secrets/${name}`, {
      encrypted_value: encryptedB64,
      key_id: keyId,
    });
    console.log('[OK] ' + name);
  }

  console.log('\nAll secrets set successfully!');
  console.log('\nRemaining: Run "npm run login" to save session, then:');
  console.log('  Set UC_SESSION secret with the contents of auth/session.json');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
