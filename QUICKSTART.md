# 🚀 Quick Start - Get Running in 30 Seconds

## For Local Use

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open browser
# Go to: http://localhost:8787
```

**That's it!** 🎉

---

## What You Can Do Now

### ✅ Validate Single Email

1. Click "Single Email" tab
2. Enter: `test@gmail.com`
3. Click "Validate Email"
4. See full analysis

### ✅ Bulk Validation

1. Click "Bulk Validation" tab
2. Paste emails (one per line):
   ```
   user1@gmail.com
   user2@outlook.com
   bad@invalid-domain.xyz
   ```
3. Click "Validate All Emails"
4. View results table

### ✅ Parse Bounce Messages

1. Click "Bounce Parser" tab
2. Paste:
   ```
   5.1.1 The email account that you tried to reach does not exist
   ```
3. Click "Parse Bounce Message"
4. See categorization

### ✅ CSV Upload

1. Click "CSV Upload" tab
2. Create CSV file:
   ```csv
   email,name
   john@example.com,John Doe
   jane@company.com,Jane Smith
   ```
3. Upload file
4. Export results

---

## Privacy Features 🔒

- ✅ All emails stored **only in your browser**
- ✅ Server **never sees email addresses** (only domains)
- ✅ No tracking, no logging, no database
- ✅ Works offline after first load

---

## Test It Out

### Valid Email

```
test@gmail.com
```

**Expected:** High score (80-85), "Likely Deliverable" recommendation (DNS checks passed)

### Invalid Email

```
invalid@
```

**Expected:** Syntax error, score 0

### Disposable Email

```
test@mailinator.com
```

**Expected:** Flagged as disposable, low score

### Typo Email

```
user@gmial.com
```

**Expected:** Suggests `gmail.com`

---

## Export Results

After validation:

1. Click "Export All" for complete results
2. Click "Export Clean Only" for send-ready emails
3. CSV file downloads automatically

---

## Suppression List

Mark emails to never send to:

1. Click "Settings" tab
2. Click "View Suppression List"
3. Add/remove emails
4. Stored locally in your browser

---

## Need Help?

- 📖 Full docs: See [README.md](README.md)
- 🚀 Deploy guide: See [DEPLOY.md](DEPLOY.md)
- 🔧 Issues: Check error console in browser (F12)

---

## Server Not Starting?

**Port 8787 already in use?**

Create `.env` file:

```env
PORT=8888
```

Then restart:

```bash
npm start
```

**Permission error?**

```bash
sudo chown -R $(whoami) ~/.npm
```

---

## What's Next?

1. ✅ Test with your email list
2. ✅ Export clean emails
3. ✅ Deploy to cloud (see DEPLOY.md)
4. ✅ Share with your team

---

**Enjoy validating! 📧**
