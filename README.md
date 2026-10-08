# Surfi Box payment watcher

> **Two sites, one watcher.** The `watch` job confirms **Surfi Box** payments (secret `FIREBASE_SERVICE_ACCOUNT`, from the *surfibox* Firebase project). The `surfitools` job approves **SurfiTools** payments (secret `SURFITOOLS_SERVICE_ACCOUNT`, from the *surfitools-31a16* project — same steps as below, in that project). A job whose secret is missing is simply skipped. SurfiTools approves automatically only while **Admin → Payments → Approve payments automatically** is on.

Confirms Surfi Box payments around the clock, even when no dashboard is open. It works like the VB timer:
- every 30 seconds it checks each open payment on the blockchain
- once the payment has its confirmations (3 by default for BTC, ETH, LTC and DOGE), it marks the payment paid
- in the same step it takes the 1% fee from the merchant's balance and writes the ledger and activity entries.

Only real transfers of the exact amount are ever confirmed, and each blockchain transaction can pay only one order.

It runs free on GitHub Actions. GitHub starts it every 5 minutes, and each run keeps checking for about 4.5 minutes.

## Files

| File | What it is |
|---|---|
| `watcher.mjs` | The watcher (built from `SurfiBox/scripts/watcher/watcher.ts`) |
| `package.json`, `package-lock.json` | Its one dependency: `firebase-admin` |
| `.github/workflows/watch.yml` | Runs the watcher every 5 minutes |
| `.github/workflows/keepalive.yml` | One tiny commit a month, so GitHub never pauses the schedule (it pauses schedules after 60 days without activity) |

Don't upload `node_modules`.

## Setup (about 10 minutes)

### 1. Download a Firebase admin key
1. Open https://console.firebase.google.com and choose the **surfibox** project.
2. Click the **gear icon** next to *Project Overview*, then **Project settings**.
3. Open the **Service accounts** tab.
4. Under *Firebase Admin SDK*, click **Generate new private key**, then **Generate key**.
5. A `.json` file downloads (named like `surfibox-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`).

> **This file is the master key to your database.** Never upload it to the repository, email it or share it. It only goes into GitHub's encrypted Secrets (step 4).

### 2. Create the repository
1. On https://github.com, click **+** (top right), then **New repository**.
2. Owner: your account (e.g. `surfitools`). Name: `surfibox-watcher`.
3. Choose **Public**. Public repositories get unlimited free Actions minutes; a private one would use far more than the free 2,000 minutes a month. The code holds no secrets: the key lives only in Secrets, which the public can't see.
4. Leave *Add a README* unticked, then click **Create repository**.

### 3. Upload the files
1. On the new, empty repository page, click the **uploading an existing file** link.
2. From `D:\Surfi\SurfiBox-Watcher`, drag in **`watcher.mjs`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`** and the **`.github` folder** (drag the folder itself, so its structure is kept).
3. Click **Commit changes**.
4. Check that the repository now shows `.github/workflows/watch.yml` and `.github/workflows/keepalive.yml`.

### 4. Add the key as a secret
1. In the repository, open **Settings**, then **Secrets and variables → Actions** in the left menu.
2. Click **New repository secret**.
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Secret: open the downloaded `.json` file in Notepad, select all (Ctrl+A), copy, and paste it here.
5. Click **Add secret**.
6. Move the `.json` file out of *Downloads* to a safe place, or delete it. You can always generate a new one.

### 5. Allow the monthly keep-alive commit
1. Go to **Settings → Actions → General**.
2. Under **Workflow permissions**, choose **Read and write permissions**, then **Save**.

### 6. Test it
1. Open the **Actions** tab, click **Payment watcher** on the left, then **Run workflow → Run workflow**.
2. After a few seconds, click the new run, then the **watch** job, then the **Check payments** step.
3. You should see lines like `checked 2 open payment(s), 0 confirmed` or `no open payments` every 30 seconds. A run lasts about 5 minutes.
4. A red ❌ with `Set FIREBASE_SERVICE_ACCOUNT` means the secret is missing or misnamed. Redo step 4.

From now on it starts by itself every 5 minutes. GitHub sometimes starts scheduled runs 5–15 minutes late at busy times. The first scheduled run can take up to about 30 minutes to appear.

### 7. Real-payment test
1. Create a small payment link (e.g. $1) on surfibox.com and open it in a private window.
2. Pay it with the exact amount, then **close the checkout and every dashboard**.
3. Within a few minutes after the required confirmations, open your dashboard: the payment shows **Paid · confirmed by Surfi Box**, and the 1% fee appears in *Balance*.

## Updating the watcher

When the watcher code changes:
1. In `D:\Surfi\SurfiBox`, run `npm run watcher:build`. This rewrites `D:\Surfi\SurfiBox-Watcher\watcher.mjs`.
2. In the repository, click **Add file → Upload files**, upload the new `watcher.mjs`, and commit.

## If the key ever leaks
1. Open the **Service accounts** tab in Firebase (step 1) and click **Manage service account permissions**.
2. Find the `firebase-adminsdk` account, open **Keys**, and delete the old key.
3. Generate a new key and paste it into the GitHub secret again.
