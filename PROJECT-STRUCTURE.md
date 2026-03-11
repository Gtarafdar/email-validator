# Project Structure

```
Valid Email Checker/
│
├── 📄 package.json              # Dependencies and scripts
├── 📄 server.js                 # Backend API (DNS lookups only)
├── 📄 README.md                 # Complete documentation
├── 📄 QUICKSTART.md             # Get started in 30 seconds
├── 📄 DEPLOY.md                 # Deployment guide
├── 📄 .gitignore                # Git ignore rules
├── 📄 .env.example              # Environment variables template
├── 📄 netlify.toml              # Netlify configuration
│
└── 📁 public/                   # Frontend (static files)
    ├── 📄 index.html            # Main UI
    ├── 📄 app.js                # Validation engine (client-side)
    └── 📄 style.css             # Styling
```

---

## File Descriptions

### 📄 server.js (Backend)

**Purpose:** Minimal Node.js/Express server for DNS lookups only

**Features:**

- DNS/MX record checks
- SPF/DKIM/DMARC verification
- Provider detection
- Rate limiting
- CORS enabled
- **Privacy:** Zero data storage, no email logging

**Endpoints:**

- `GET /health` - Health check
- `POST /api/dns-lookup` - Single domain lookup
- `POST /api/batch-dns-lookup` - Batch domain lookup (max 50)

**Dependencies:**

- express
- cors
- express-rate-limit

---

### 📄 public/index.html (Frontend UI)

**Purpose:** Single-page application interface

**Sections:**

- Header with privacy badge
- Stats dashboard (5 metrics)
- Tabbed interface:
  - Single Email
  - Bulk Validation
  - CSV Upload
  - Bounce Parser
  - Settings
- Results table
- Suppression list modal

**Features:**

- Responsive design
- Drag & drop CSV upload
- Real-time search/filter
- Tab switching
- Modal dialogs

---

### 📄 public/app.js (Validation Engine)

**Purpose:** Complete client-side validation logic

**Components:**

#### 1. Storage Layer

```javascript
Storage.getResults(); // Get results from localStorage
Storage.setResults(); // Save results
Storage.getSuppression(); // Get suppression list
Storage.addToSuppression(); // Add email to suppress
Storage.removeFromSuppression(); // Remove from suppression
```

#### 2. Validation Data

```javascript
ValidationData.disposableDomains; // 19 disposable providers
ValidationData.rolePrefixes; // 27 role-based prefixes
ValidationData.typoMap; // 16 common typos
ValidationData.bouncePatterns; // 18 bounce patterns
```

#### 3. Validator

```javascript
Validator.normalizeEmail(); // Trim & lowercase
Validator.validateSyntax(); // RFC 5322 check
Validator.isDisposable(); // Check if disposable
Validator.isRoleBased(); // Check if role-based
Validator.detectTypo(); // Suggest correct domain
Validator.parseBounce(); // Parse bounce message
Validator.score(); // 0-100 scoring
Validator.recommend(); // send/review/suppress
Validator.checkDNS(); // Call backend API
Validator.validate(); // Full single validation
Validator.validateBulk(); // Batch validation
```

#### 4. CSV Utilities

```javascript
CSV.parse(); // Parse CSV content
CSV.stringify(); // Convert to CSV
CSV.download(); // Trigger download
```

#### 5. UI Controller

```javascript
UI.validateSingle(); // Handle single validation
UI.validateBulk(); // Handle bulk validation
UI.handleCSVUpload(); // Process CSV file
UI.exportResults(); // Export all results
UI.exportClean(); // Export send-ready only
UI.parseBounce(); // Parse bounce text
UI.renderResults(); // Display results table
UI.updateStats(); // Update dashboard
UI.showSuppression(); // Show suppression modal
UI.filterResults(); // Filter by criteria
UI.searchResults(); // Search by text
```

**Size:** ~1,200 lines
**Dependencies:** None (vanilla JavaScript)

---

### 📄 public/style.css (Styling)

**Purpose:** Modern, responsive styling

**Features:**

- CSS custom properties (variables)
- Gradient backgrounds
- Card-based layout
- Responsive grid system
- Color-coded badges
- Smooth transitions
- Mobile-first design
- Print styles

**Components styled:**

- Header & navigation
- Stats dashboard
- Tabbed interface
- Forms & inputs
- Tables
- Buttons (4 variants)
- Badges & labels
- Modals
- Notifications
- Loading spinner
- Upload area

**Size:** ~1,100 lines
**Dependencies:** None (pure CSS)

---

## Data Flow

### 1. User Input → Validation

```
User enters email
    ↓
[app.js] Validator.validate()
    ↓
Client-side checks:
- Syntax ✓
- Disposable ✓
- Role-based ✓
- Typo ✓
- Suppression ✓
    ↓
Extract domain from email
    ↓
[server.js] POST /api/dns-lookup
Body: { domain: "example.com" }
    ↓
Server checks DNS:
- MX records
- SPF records
- DKIM records
- DMARC records
- Provider detection
    ↓
Return to client
    ↓
[app.js] Combine all data
    ↓
Calculate score (0-100)
Determine recommendation
    ↓
Store in localStorage
    ↓
[index.html] Display results
```

---

### 2. CSV Upload → Export

```
User uploads CSV
    ↓
[app.js] CSV.parse()
    ↓
Extract emails from column
    ↓
[app.js] Validator.validateBulk()
    ↓
Batch DNS lookup (50 at a time)
    ↓
Validate each email
    ↓
Store results in localStorage
    ↓
[index.html] Render results table
    ↓
User clicks "Export All"
    ↓
[app.js] CSV.stringify()
    ↓
[app.js] CSV.download()
    ↓
CSV file downloaded
```

---

### 3. Bounce Parsing

```
User pastes bounce text
    ↓
[app.js] Validator.parseBounce()
    ↓
Match against 18 patterns
    ↓
Extract status code (5.1.1, etc.)
    ↓
Categorize:
- invalid_mailbox
- recipient_not_accepted
- temp_failure_retry
- permanent_failure
- etc.
    ↓
Return categorization
    ↓
Display in UI
```

---

## Privacy Architecture

### ❌ What Server NEVER Sees:

- Email addresses
- Validation results
- User data
- Suppression lists
- Bounce messages
- CSV content

### ✅ What Server Sees:

- Domain names only (e.g., "example.com")
- DNS query results (public data)
- IP addresses (for rate limiting)

### 🔒 Data Storage:

- **Client:** Browser localStorage (~5KB per 100 validations)
- **Server:** None (zero persistence)

---

## Key Design Decisions

### Why Vanilla JavaScript?

- No framework overhead
- Faster load time
- Easier to audit for privacy
- No build step required
- Works offline

### Why localStorage?

- Client-side only
- No server storage needed
- Privacy guarantee
- Persistent across sessions
- Easy export/import

### Why Minimal Backend?

- Only for DNS (can't do from browser)
- No business logic on server
- Easy to audit
- Fast and lightweight
- Can run on any host

### Why No Database?

- Privacy first
- No data to leak
- No backup needed
- Simpler deployment
- Lower hosting costs

---

## Modification Guide

### Add More Disposable Domains

**File:** `public/app.js`
**Line:** ~86

```javascript
disposableDomains: new Set([
  'mailinator.com',
  'your-new-domain.com',  // Add here
]),
```

### Add Custom Typo Corrections

**File:** `public/app.js`
**Line:** ~108

```javascript
typoMap: {
  'gmial.com': 'gmail.com',
  'your-typo.com': 'correct.com',  // Add here
}
```

### Change Scoring Weights

**File:** `public/app.js`
**Line:** ~294

```javascript
if (result.syntaxValid) score += 20; // Change weight
if (result.mxFound) score += 20; // Change weight
if (result.disposable) score -= 40; // Change penalty
```

### Add New Bounce Patterns

**File:** `public/app.js`
**Line:** ~125

```javascript
bouncePatterns: [
  {
    pattern: /your pattern/i,
    category: "your_category",
    detail: "Description",
  },
];
```

### Change Rate Limits

**File:** `server.js`
**Line:** ~20

```javascript
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Change limit
});
```

### Customize UI Colors

**File:** `public/style.css`
**Line:** ~8

```css
:root {
  --primary: #2563eb; /* Change primary color */
  --success: #10b981; /* Change success color */
  --danger: #ef4444; /* Change danger color */
}
```

---

## Performance Specs

### Load Time

- **HTML:** < 50 KB
- **CSS:** < 40 KB
- **JS:** < 50 KB
- **Total:** < 150 KB (faster than most images!)

### Validation Speed

- **Single email:** ~200-500ms (DNS dependent)
- **Bulk (50 emails):** ~5-10 seconds
- **CSV (1000 emails):** ~1-2 minutes

### Memory Usage

- **Server:** < 50 MB RAM
- **Client:** < 10 MB browser memory
- **localStorage:** ~5 KB per 100 results

### Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

---

## Security Features

### Server

- ✅ Rate limiting (100 req/min)
- ✅ Input validation
- ✅ Email address rejection
- ✅ CORS enabled
- ✅ No data persistence
- ✅ No logging (optional)

### Client

- ✅ XSS prevention (escapeHtml)
- ✅ CSRF not needed (stateless)
- ✅ localStorage encryption (optional)
- ✅ No external scripts
- ✅ No tracking

---

## Testing

### Manual Test Checklist

- [ ] Single email validation works
- [ ] Bulk validation works
- [ ] CSV upload works
- [ ] CSV export works
- [ ] Bounce parser works
- [ ] Suppression list works
- [ ] Search works
- [ ] Filter works
- [ ] Mobile responsive
- [ ] Offline functionality

### Test Data

**Valid:**

```
test@gmail.com
user@outlook.com
```

**Invalid:**

```
invalid@
@example.com
```

**Disposable:**

```
test@mailinator.com
```

**Typo:**

```
user@gmial.com
```

**Bounce:**

```
5.1.1 The email account that you tried to reach does not exist
```

---

## File Sizes

```
server.js       ~9 KB   (backend)
index.html      ~12 KB  (UI)
app.js          ~50 KB  (validation engine)
style.css       ~30 KB  (styling)
README.md       ~35 KB  (docs)
DEPLOY.md       ~8 KB   (deploy guide)
QUICKSTART.md   ~3 KB   (quick start)
─────────────────────────
Total:          ~147 KB (entire app!)
```

---

## Extensions & Integrations

### Future Enhancements

1. **SMTP Verification** (advanced)
   - Requires self-host
   - High risk of rate limiting
   - Can detect mailbox existence

2. **API Key Authentication**
   - Protect server endpoint
   - Track usage per key

3. **Webhook Integration**
   - Send results to external service
   - Real-time notifications

4. **Team Collaboration**
   - Sync via cloud storage
   - Share suppression lists

5. **Advanced Reporting**
   - Charts & graphs
   - Historical trends
   - Deliverability score over time

---

**File structure designed for privacy, simplicity, and self-hosting.**

Last updated: 2026-03-11
