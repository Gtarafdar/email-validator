/**
 * Client-Side Email Validation Engine
 * All email data stays in browser localStorage
 * Privacy-first: emails never sent to server
 */

// ============================================
// Data Storage Layer (localStorage)
// ============================================

const Storage = {
  KEYS: {
    RESULTS: "emailValidationResults",
    SUPPRESSION: "suppressionList",
    HISTORY: "validationHistory",
    SETTINGS: "validatorSettings",
  },

  db: null,
  dbReady: false,

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("EmailValidatorDB", 1);

      request.onerror = () => {
        console.warn("IndexedDB not available, falling back to localStorage");
        this.dbReady = false;
        resolve(false);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.dbReady = true;
        console.log("IndexedDB initialized");
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains("results")) {
          const resultsStore = db.createObjectStore("results", {
            keyPath: "id",
            autoIncrement: true,
          });
          resultsStore.createIndex("email", "email", { unique: false });
          resultsStore.createIndex("timestamp", "checkedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains("suppression")) {
          const suppressionStore = db.createObjectStore("suppression", {
            keyPath: "email",
          });
          suppressionStore.createIndex("addedAt", "addedAt", { unique: false });
        }
      };
    });
  },

  // Get from IndexedDB or localStorage
  async getFromDB(storeName) {
    if (!this.dbReady || !this.db) {
      return this.get(this.KEYS[storeName.toUpperCase()]);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.warn("IndexedDB read failed, falling back to localStorage");
        resolve(this.get(this.KEYS[storeName.toUpperCase()]));
      };
    });
  },

  // Save to IndexedDB or localStorage
  async saveToDB(storeName, data) {
    // Always save to localStorage as backup
    this.set(this.KEYS[storeName.toUpperCase()], data);

    if (!this.dbReady || !this.db) return true;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      // Clear existing data
      store.clear();

      // Add new data
      data.forEach((item) => {
        store.add(item);
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => {
        console.warn("IndexedDB write failed");
        resolve(false);
      };
    });
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    Object.values(this.KEYS).forEach((key) => this.remove(key));
  },

  async getResults() {
    if (this.dbReady) {
      return await this.getFromDB("results");
    }
    return this.get(this.KEYS.RESULTS) || [];
  },

  async setResults(results) {
    if (this.dbReady) {
      return await this.saveToDB("results", results);
    }
    return this.set(this.KEYS.RESULTS, results);
  },

  getSuppression() {
    return this.get(this.KEYS.SUPPRESSION) || [];
  },

  setSuppression(list) {
    return this.set(this.KEYS.SUPPRESSION, list);
  },

  addToSuppression(email, reason = "manual") {
    const list = this.getSuppression();
    const normalized = email.toLowerCase().trim();

    if (!list.some((item) => item.email === normalized)) {
      list.push({
        email: normalized,
        reason,
        addedAt: new Date().toISOString(),
      });
      this.setSuppression(list);
    }
    return list;
  },

  removeFromSuppression(email) {
    const list = this.getSuppression();
    const normalized = email.toLowerCase().trim();
    const filtered = list.filter((item) => item.email !== normalized);
    this.setSuppression(filtered);
    return filtered;
  },

  isSupressed(email) {
    const list = this.getSuppression();
    const normalized = email.toLowerCase().trim();
    return list.some((item) => item.email === normalized);
  },

  addHistory(entry) {
    const history = this.get(this.KEYS.HISTORY) || [];
    history.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 entries
    if (history.length > 100) history.pop();
    this.set(this.KEYS.HISTORY, history);
  },
};

// ============================================
// Validation Data
// ============================================

const ValidationData = {
  disposableDomains: new Set([
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "10minutemail.com",
    "yopmail.com",
    "sharklasers.com",
    "trashmail.com",
    "getnada.com",
    "maildrop.cc",
    "throwaway.email",
    "mintemail.com",
    "temp-mail.org",
    "fakeinbox.com",
    "mailnesia.com",
    "dispostable.com",
    "mailsac.com",
    "mohmal.com",
    "emailondeck.com",
    "throwawaymail.com",
  ]),

  rolePrefixes: new Set([
    "admin",
    "administrator",
    "billing",
    "contact",
    "desk",
    "finance",
    "hello",
    "hr",
    "info",
    "jobs",
    "legal",
    "mail",
    "marketing",
    "noreply",
    "no-reply",
    "office",
    "postmaster",
    "privacy",
    "sales",
    "security",
    "support",
    "team",
    "webmaster",
    "help",
    "service",
    "abuse",
    "hostmaster",
    "root",
    "mailer-daemon",
  ]),

  // Free email providers (consumer emails, not corporate)
  freeEmailProviders: new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "live.com",
    "msn.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "mail.com",
    "gmx.com",
    "gmx.net",
    "yandex.com",
    "mail.ru",
    "qq.com",
    "163.com",
    "126.com",
    "sina.com",
    "naver.com",
    "hanmail.net",
    "daum.net",
    "rediffmail.com",
    "inbox.com",
    "fastmail.com",
    "tutanota.com",
    "hushmail.com",
  ]),

  // Known spam traps and honeypots
  spamTraps: new Set([
    "spamtrap.com",
    "honeypot.com",
    "trap.email",
    "blackhole.email",
    "testmail.com",
    "example.com",
    "example.net",
    "example.org",
    "test.com",
    "localhost",
  ]),

  typoMap: {
    // Gmail variations
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmali.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmailc.om": "gmail.com",
    "gmaill.com": "gmail.com",
    "gnail.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmil.com": "gmail.com",

    // Outlook variations
    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "otlook.com": "outlook.com",
    "outlook.co": "outlook.com",
    "outlookc.om": "outlook.com",
    "outlok.con": "outlook.com",
    "outloook.com": "outlook.com",

    // Hotmail variations
    "hotnail.com": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmailc.om": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "hotmil.com": "hotmail.com",

    // Yahoo variations
    "yaho.com": "yahoo.com",
    "yahho.com": "yahoo.com",
    "yaoo.com": "yahoo.com",
    "yahoo.co": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yhoo.com": "yahoo.com",
    "yaho.con": "yahoo.com",
    "yahoo.con": "yahoo.com",

    // Other common typos
    "aol.co": "aol.com",
    "aoll.com": "aol.com",
    "protonmai.com": "protonmail.com",
    "protonmail.co": "protonmail.com",
    "iclod.com": "icloud.com",
    "icloud.co": "icloud.com",
    "liev.com": "live.com",
    "live.co": "live.com",
    "compuserve.co": "compuserve.com",
  },

  bouncePatterns: [
    {
      pattern: /5\.1\.1/i,
      category: "invalid_mailbox",
      detail: "Hard bounce - mailbox does not exist",
    },
    {
      pattern: /no such user/i,
      category: "invalid_mailbox",
      detail: "User does not exist",
    },
    {
      pattern: /does not exist/i,
      category: "invalid_mailbox",
      detail: "Address does not exist",
    },
    {
      pattern: /no such recipient/i,
      category: "invalid_mailbox",
      detail: "Recipient not found",
    },
    {
      pattern: /user unknown/i,
      category: "invalid_mailbox",
      detail: "Unknown user",
    },
    {
      pattern: /5\.4\.1/i,
      category: "recipient_not_accepted",
      detail: "Recipient rejected by policy",
    },
    {
      pattern: /recipient address rejected/i,
      category: "recipient_not_accepted",
      detail: "Address rejected",
    },
    {
      pattern: /access denied/i,
      category: "recipient_not_accepted",
      detail: "Access denied by server",
    },
    {
      pattern: /4\.4\.4/i,
      category: "temp_failure_retry",
      detail: "Temporary delivery issue",
    },
    {
      pattern: /unauthenticated/i,
      category: "auth_issue",
      detail: "Authentication problem",
    },
    {
      pattern: /no mail-enabled subscriptions/i,
      category: "tenant_config_issue",
      detail: "Tenant configuration issue",
    },
    {
      pattern: /mailbox full/i,
      category: "mailbox_full",
      detail: "Mailbox quota exceeded",
    },
    {
      pattern: /over quota/i,
      category: "mailbox_full",
      detail: "Over storage quota",
    },
    {
      pattern: /4\.\d\.\d/i,
      category: "temp_failure_retry",
      detail: "Temporary failure - retry later",
    },
    {
      pattern: /5\.\d\.\d/i,
      category: "permanent_failure",
      detail: "Permanent delivery failure",
    },
    {
      pattern: /2\.\d\.\d/i,
      category: "accepted",
      detail: "Accepted by server",
    },
    {
      pattern: /spamhaus/i,
      category: "blacklisted",
      detail: "Sender IP blacklisted",
    },
    { pattern: /blacklist/i, category: "blacklisted", detail: "Blacklisted" },
  ],
};

// ============================================
// API Configuration
// ============================================

const ApiConfig = {
  apiKey: localStorage.getItem("emailValidatorApiKey") || "",

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem("emailValidatorApiKey", key);
  },

  getApiKey() {
    return this.apiKey || localStorage.getItem("emailValidatorApiKey") || "";
  },

  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const key = this.getApiKey();
    if (key) {
      headers["X-API-Key"] = key;
    }
    return headers;
  },

  isConfigured() {
    return !!this.getApiKey();
  },
};

// ============================================
// Email Validation Engine
// ============================================

const Validator = {
  normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  },

  // Get canonical email (normalized for duplicate detection)
  getCanonicalEmail(email) {
    const normalized = this.normalizeEmail(email);
    if (!normalized.includes("@")) return normalized;

    let [localPart, domain] = normalized.split("@");

    // Gmail: ignore dots and plus addressing
    if (domain === "gmail.com" || domain === "googlemail.com") {
      localPart = localPart.replace(/\./g, ""); // Remove all dots
      if (localPart.includes("+")) {
        localPart = localPart.split("+")[0]; // Remove plus addressing
      }
      domain = "gmail.com"; // Normalize googlemail to gmail
    }

    // Yahoo: ignore case and dash variations (yahoo doesn't use plus addressing)
    if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) {
      localPart = localPart.toLowerCase();
      if (localPart.includes("-")) {
        localPart = localPart.split("-")[0];
      }
    }

    // Outlook/Hotmail/Live: plus addressing support
    if (
      domain === "outlook.com" ||
      domain === "hotmail.com" ||
      domain === "live.com"
    ) {
      if (localPart.includes("+")) {
        localPart = localPart.split("+")[0];
      }
      // Normalize all to outlook.com
      if (domain === "hotmail.com" || domain === "live.com") {
        domain = "outlook.com";
      }
    }

    // FastMail: plus addressing
    if (domain === "fastmail.com" || domain === "fastmail.fm") {
      if (localPart.includes("+")) {
        localPart = localPart.split("+")[0];
      }
    }

    // ProtonMail: plus addressing
    if (
      domain === "protonmail.com" ||
      domain === "proton.me" ||
      domain === "pm.me"
    ) {
      if (localPart.includes("+")) {
        localPart = localPart.split("+")[0];
      }
      domain = "protonmail.com"; // Normalize variations
    }

    return localPart + "@" + domain;
  },

  // Convert internationalized domain names (IDN) to ASCII (Punycode)
  convertIDN(domain) {
    try {
      // Simple IDN detection and conversion
      // Modern browsers support URL.domainToASCII
      if (domain.match(/[^\x00-\x7F]/)) {
        // Contains non-ASCII characters
        if (typeof URL !== "undefined" && URL.domainToASCII) {
          return URL.domainToASCII(domain);
        }
      }
      return domain;
    } catch (e) {
      return domain; // Return original if conversion fails
    }
  },

  validateSyntax(email) {
    // RFC 5322 simplified
    const regex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return regex.test(email);
  },

  getDomain(email) {
    const parts = email.split("@");
    return parts.length === 2 ? parts[1] : "";
  },

  getLocalPart(email) {
    const parts = email.split("@");
    return parts.length === 2 ? parts[0] : "";
  },

  isDisposable(domain) {
    return ValidationData.disposableDomains.has(domain);
  },

  isFreeEmail(domain) {
    return ValidationData.freeEmailProviders.has(domain);
  },

  isSpamTrap(domain) {
    return ValidationData.spamTraps.has(domain);
  },

  isRoleBased(localPart) {
    const lower = localPart.toLowerCase();
    return ValidationData.rolePrefixes.has(lower);
  },

  // Enhanced role detection with scoring
  getRoleScore(localPart) {
    const lower = localPart.toLowerCase();

    // High-risk roles (usually automated or shared)
    const highRisk = [
      "noreply",
      "no-reply",
      "mailer-daemon",
      "postmaster",
      "abuse",
    ];
    if (highRisk.some((role) => lower === role || lower.startsWith(role))) {
      return { isRole: true, risk: "high", penalty: 25 };
    }

    // Medium-risk roles (generic business emails)
    const mediumRisk = ["info", "admin", "support", "sales", "contact", "help"];
    if (mediumRisk.some((role) => lower === role || lower.startsWith(role))) {
      return { isRole: true, risk: "medium", penalty: 15 };
    }

    // Low-risk roles (department emails, but still not personal)
    const lowRisk = ["team", "office", "hr", "legal", "finance", "marketing"];
    if (lowRisk.some((role) => lower === role || lower.startsWith(role))) {
      return { isRole: true, risk: "low", penalty: 10 };
    }

    // Check if local part contains common personal name patterns
    if (this.hasPersonalNamePattern(lower)) {
      return { isRole: false, risk: "none", penalty: 0, bonus: 5 };
    }

    return { isRole: false, risk: "none", penalty: 0 };
  },

  hasPersonalNamePattern(localPart) {
    // Check for patterns like firstname.lastname, first_last, firstlast
    // Personal emails often have dots or underscores separating names
    if (/^[a-z]+[._][a-z]+$/.test(localPart)) return true;

    // Check for initials (j.smith, jd.smith)
    if (/^[a-z]{1,2}\.[a-z]+$/.test(localPart)) return true;

    return false;
  },

  detectTypo(domain) {
    return ValidationData.typoMap[domain] || null;
  },

  // Check if email has avatar on Gravatar (indicates real/active email)
  async checkGravatar(email) {
    try {
      // Calculate MD5 hash of email (Gravatar uses MD5)
      const hash = await this.md5(email.toLowerCase().trim());
      const url = `https://www.gravatar.com/avatar/${hash}?d=404`;

      // Try to fetch avatar (d=404 returns 404 if no avatar exists)
      const response = await fetch(url, { method: "HEAD" });
      return response.status === 200; // True if avatar exists
    } catch (e) {
      return null; // Unable to check (network error, CORS, etc.)
    }
  },

  // Simple MD5 hash for Gravatar (client-side)
  async md5(string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(string);

    // Use SubtleCrypto if available
    if (window.crypto && window.crypto.subtle) {
      try {
        const hashBuffer = await crypto.subtle.digest("MD5", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        // MD5 might not be available in SubtleCrypto, fallback
      }
    }

    // Simple MD5 implementation fallback
    return this.simpleMD5(string);
  },

  // Simple MD5 implementation
  simpleMD5(str) {
    function md5cycle(x, k) {
      var a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function add32(a, b) {
      return (a + b) & 0xffffffff;
    }

    function md51(s) {
      var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878],
        i;
      for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++)
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function md5blk(s) {
      var md5blks = [],
        i;
      for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] =
          s.charCodeAt(i) +
          (s.charCodeAt(i + 1) << 8) +
          (s.charCodeAt(i + 2) << 16) +
          (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }
    var hex_chr = "0123456789abcdef".split("");
    function rhex(n) {
      var s = "",
        j = 0;
      for (; j < 4; j++)
        s +=
          hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
      return s;
    }
    function hex(x) {
      for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]);
      return x.join("");
    }
    return hex(md51(str));
  },

  // Enhanced Pattern Detection
  analyzeLocalPart(localPart) {
    const analysis = {
      isGibberish: false,
      isSuspicious: false,
      hasExcessiveNumbers: false,
      hasConsecutiveSpecialChars: false,
      isRandomPattern: false,
      warnings: [],
    };

    if (!localPart || localPart.length === 0) return analysis;

    // Check for gibberish (no vowels in long strings)
    if (localPart.length >= 8) {
      const vowelCount = (localPart.match(/[aeiou]/gi) || []).length;
      const vowelRatio = vowelCount / localPart.length;
      if (vowelRatio < 0.15) {
        analysis.isGibberish = true;
        analysis.warnings.push("Local part appears to be random characters");
      }
    }

    // Check for excessive numbers (>60% numbers)
    const numberCount = (localPart.match(/\d/g) || []).length;
    const numberRatio = numberCount / localPart.length;
    if (numberRatio > 0.6) {
      analysis.hasExcessiveNumbers = true;
      analysis.warnings.push("Unusual number of digits in email");
    }

    // Check for consecutive special characters
    if (/[\.\-\_]{2,}/.test(localPart)) {
      analysis.hasConsecutiveSpecialChars = true;
      analysis.warnings.push("Consecutive special characters detected");
    }

    // Check for random pattern (repeating characters or keyboard mash)
    if (/(.)\1{3,}/.test(localPart)) {
      analysis.isRandomPattern = true;
      analysis.warnings.push("Repeating character pattern detected");
    }

    // Check for keyboard patterns
    const keyboardPatterns = ["qwerty", "asdfgh", "zxcvbn", "123456", "abcdef"];
    const lowerLocal = localPart.toLowerCase();
    for (const pattern of keyboardPatterns) {
      if (lowerLocal.includes(pattern)) {
        analysis.isRandomPattern = true;
        analysis.warnings.push("Keyboard pattern detected");
        break;
      }
    }

    // Overall suspicion flag
    analysis.isSuspicious =
      analysis.isGibberish ||
      analysis.hasExcessiveNumbers ||
      analysis.hasConsecutiveSpecialChars ||
      analysis.isRandomPattern;

    return analysis;
  },

  // Provider-specific validation
  validateProviderConfig(result) {
    const warnings = [];
    const provider = result.provider.toLowerCase();

    // Microsoft 365 / Office 365 should have DMARC
    if (
      (provider.includes("microsoft") || provider.includes("office 365")) &&
      !result.dmarc
    ) {
      warnings.push("Office 365 domains typically have DMARC configured");
    }

    // Google Workspace should have all three
    if (
      (provider.includes("google") || provider.includes("gmail")) &&
      (!result.spf || !result.dmarc)
    ) {
      warnings.push("Google Workspace domains typically have SPF and DMARC");
    }

    // Major providers should have MX records
    if (
      provider !== "unknown" &&
      provider !== "unknown provider" &&
      !result.mxFound
    ) {
      warnings.push("Known provider but no MX records found");
    }

    return warnings;
  },

  // Calculate confidence score (separate from quality score)
  calculateConfidence(result) {
    // Start at 85 max because we're NOT doing SMTP verification
    // We can only verify domain/DNS, not actual mailbox existence
    let confidence = 85;

    // Reduce confidence for missing authentication
    if (!result.spf) confidence -= 10;
    if (!result.dkim) confidence -= 10;
    if (!result.dmarc) confidence -= 10;

    // Reduce confidence for unknown provider
    if (
      result.provider === "Unknown" ||
      result.provider === "Unknown Provider"
    ) {
      confidence -= 15;
    }

    // Reduce confidence for suspicious patterns
    if (result.patternAnalysis && result.patternAnalysis.isSuspicious) {
      confidence -= 20;
    }

    // Increase confidence for known good providers
    const knownGoodProviders = [
      "google workspace",
      "gmail",
      "microsoft 365",
      "outlook",
      "protonmail",
    ];
    if (
      knownGoodProviders.some((p) => result.provider.toLowerCase().includes(p))
    ) {
      confidence = Math.min(85, confidence + 5);
    }

    // Confidence can't be negative
    return Math.max(0, confidence);
  },

  parseBounce(text) {
    if (!text) return { code: null, category: null, detail: null };

    const textLower = text.toLowerCase();

    // Extract status code
    const codeMatch = text.match(/\b([245]\.\d\.\d)\b/);
    const code = codeMatch ? codeMatch[1] : null;

    // Match patterns
    for (const { pattern, category, detail } of ValidationData.bouncePatterns) {
      if (pattern.test(textLower)) {
        return { code, category, detail };
      }
    }

    // Default categorization by code
    if (code) {
      if (code.startsWith("5.")) {
        return {
          code,
          category: "permanent_failure",
          detail: "Permanent failure",
        };
      }
      if (code.startsWith("4.")) {
        return {
          code,
          category: "temp_failure_retry",
          detail: "Temporary failure",
        };
      }
      if (code.startsWith("2.")) {
        return { code, category: "accepted", detail: "Accepted" };
      }
    }

    return { code, category: "unknown", detail: "Unknown response" };
  },

  score(result) {
    let score = 0;

    // Core validation (60 points possible)
    if (result.syntaxValid) score += 20;
    if (result.domain) score += 10;
    if (result.mxFound) score += 25; // MX records are critical but don't guarantee mailbox exists

    // Email authentication (25 points possible)
    if (result.spf) score += 8;
    if (result.dkim) score += 8;
    if (result.dmarc) score += 9;

    // Provider reputation (10 points possible)
    if (result.provider && result.provider !== "Unknown") score += 10;

    // BONUSES for positive signals
    if (result.hasGravatar) score += 5; // Email has Gravatar = likely real person
    if (result.isCorporateEmail) score += 5; // Corporate email = higher quality
    if (result.roleScore && result.roleScore.bonus)
      score += result.roleScore.bonus; // Personal name pattern

    // Domain age bonuses/penalties (corporate domains only)
    if (result.domainAge) {
      if (result.domainAge.days < 30) {
        score -= 20; // Very new domain (<30 days) = very high risk
      } else if (result.domainAge.days < 90) {
        score -= 10; // Young domain (<3 months) = medium risk
      } else if (result.domainAge.years >= 1 && result.domainAge.years < 3) {
        score += 5; // Established domain (1-3 years) = small bonus
      } else if (result.domainAge.years >= 3) {
        score += 10; // Mature domain (3+ years) = good bonus
      }
    }

    // Website accessibility bonus (corporate domains only)
    if (result.websiteActive === true) {
      score += 8; // Active website = strong indicator of legitimate business
      if (result.websiteProtocol === "https") {
        score += 2; // HTTPS = extra trust (total +10 for active HTTPS site)
      }
    } else if (result.websiteActive === false && result.isCorporateEmail) {
      score -= 5; // Corporate domain with no website = suspicious
    }

    // PENALTIES for issues
    if (result.isSpamTrap) score -= 100; // Critical: spam trap
    if (result.disposable) score -= 40;
    if (result.typoSuggestion) score -= 20;
    if (result.suppressed) score -= 100;
    if (result.isDuplicate) score -= 15; // Duplicate in this batch

    // Enhanced role-based penalty (variable based on risk)
    if (result.roleScore && result.roleScore.isRole) {
      score -= result.roleScore.penalty; // High: -25, Medium: -15, Low: -10
    }

    // Bounce penalties
    if (result.bounceCategory === "invalid_mailbox") score -= 100;
    if (result.bounceCategory === "recipient_not_accepted") score -= 70;
    if (result.bounceCategory === "permanent_failure") score -= 80;
    if (result.bounceCategory === "temp_failure_retry") score -= 15;
    if (result.bounceCategory === "mailbox_full") score -= 30;
    if (result.bounceCategory === "blacklisted") score -= 90;

    // Enhanced pattern penalties
    if (result.patternAnalysis) {
      if (result.patternAnalysis.isGibberish) score -= 25;
      if (result.patternAnalysis.hasExcessiveNumbers) score -= 10;
      if (result.patternAnalysis.isRandomPattern) score -= 15;
      if (result.patternAnalysis.hasConsecutiveSpecialChars) score -= 5;
    }

    // Provider mismatch penalty
    if (result.providerWarnings && result.providerWarnings.length > 0) {
      score -= 5 * result.providerWarnings.length;
    }

    // CAP SCORE: Without SMTP verification, we cannot guarantee mailbox exists
    // Max score is 85 to reflect this limitation (not 100)
    const maxScoreWithoutSMTP = 85;
    score = Math.max(0, Math.min(maxScoreWithoutSMTP, score));

    return score;
  },

  recommend(score) {
    if (score >= 80) return "likely_deliverable"; // High confidence: 80-85 (DNS only)
    if (score >= 60) return "review"; // Medium confidence: 60-79
    return "suppress"; // Low confidence: 0-59
  },

  getConfidenceLevel(confidence) {
    // Adjusted for max 85% confidence (no SMTP verification)
    if (confidence >= 75)
      return {
        level: "high",
        label: "High Confidence (DNS Only)",
        emoji: "✅",
      };
    if (confidence >= 60)
      return { level: "medium", label: "Medium Confidence", emoji: "⚠️" };
    if (confidence >= 40)
      return { level: "low", label: "Low Confidence", emoji: "❓" };
    return { level: "very-low", label: "Very Low Confidence", emoji: "🚫" };
  },

  async checkDNS(domain) {
    try {
      const response = await fetch("/api/dns-lookup", {
        method: "POST",
        headers: ApiConfig.getHeaders(),
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        return {
          error: true,
          mx: [],
          spf: false,
          dkim: false,
          dmarc: false,
          provider: "Unknown",
        };
      }

      return await response.json();
    } catch {
      return {
        error: true,
        mx: [],
        spf: false,
        dkim: false,
        dmarc: false,
        provider: "Unknown",
      };
    }
  },

  async checkWhois(domain) {
    try {
      const response = await fetch("/api/whois-lookup", {
        method: "POST",
        headers: ApiConfig.getHeaders(),
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        return { error: true, domainAge: null };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("WHOIS lookup failed:", error);
      return { error: true, domainAge: null };
    }
  },

  async checkWebsite(domain) {
    try {
      const response = await fetch("/api/website-check", {
        method: "POST",
        headers: ApiConfig.getHeaders(),
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        return { error: true, websiteActive: false };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("Website check failed:", error);
      return { error: true, websiteActive: false };
    }
  },

  async checkSMTP(email) {
    try {
      const response = await fetch("/api/smtp-verify", {
        method: "POST",
        headers: ApiConfig.getHeaders(),
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        return { error: true, exists: "unknown" };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("SMTP verification failed:", error);
      return { error: true, exists: "unknown" };
    }
  },

  async validate(
    email,
    bounceText = "",
    existingEmails = [],
    validationLevel = "standard",
  ) {
    const normalized = this.normalizeEmail(email);
    const syntaxValid = this.validateSyntax(normalized);
    let domain = syntaxValid ? this.getDomain(normalized) : "";
    const localPart = syntaxValid ? this.getLocalPart(normalized) : "";

    // Convert international domain to ASCII (Punycode)
    if (domain) {
      domain = this.convertIDN(domain);
    }

    const result = {
      email: normalized,
      canonicalEmail: this.getCanonicalEmail(normalized),
      syntaxValid,
      domain,
      localPart,
      mxFound: false,
      mxRecords: [],
      provider: "Unknown",
      spf: false,
      dkim: false,
      dmarc: false,
      disposable: false,
      roleBased: false,
      roleScore: null,
      isFreeEmail: false,
      isCorporateEmail: false,
      isSpamTrap: false,
      hasGravatar: null,
      domainAge: null,
      websiteActive: null,
      websiteProtocol: null,
      smtpVerified: false,
      mailboxExists: "unknown",
      smtpCode: null,
      isDuplicate: false,
      duplicateOf: null,
      typoSuggestion: null,
      suppressed: false,
      bounceCode: null,
      bounceCategory: null,
      bounceDetail: null,
      score: 0,
      recommendation: "suppress",
      status: "invalid",
      patternAnalysis: null,
      providerWarnings: [],
      confidence: 0,
      confidenceLevel: null,
      allWarnings: [],
      validationLevel: validationLevel,
      checkedAt: new Date().toISOString(),
    };

    if (!syntaxValid) {
      result.status = "invalid_syntax";
      result.score = 0;
      return result;
    }

    // QUICK LEVEL: Only syntax and basic checks
    if (validationLevel === "quick") {
      result.disposable = this.isDisposable(domain);
      result.isSpamTrap = this.isSpamTrap(domain);
      result.isFreeEmail = this.isFreeEmail(domain);
      result.typoSuggestion = this.detectTypo(domain);
      result.roleScore = this.getRoleScore(localPart);
      result.roleBased = result.roleScore.isRole;

      if (result.isSpamTrap) {
        result.allWarnings.push("⚠️ CRITICAL: Known spam trap/honeypot domain");
      }
      if (result.roleScore.isRole) {
        result.allWarnings.push(
          `Role-based email (${result.roleScore.risk} risk)`,
        );
      }

      result.score = this.score(result);
      result.recommendation = this.recommend(result.score);
      result.confidence = 50;
      result.confidenceLevel = this.getConfidenceLevel(result.confidence);
      result.status = this.getStatus(result);
      return result;
    }

    // Check for duplicates using canonical email
    if (existingEmails.length > 0) {
      const canonical = result.canonicalEmail;
      const duplicate = existingEmails.find(
        (e) =>
          this.getCanonicalEmail(e) === canonical &&
          e.toLowerCase() !== normalized,
      );
      if (duplicate) {
        result.isDuplicate = true;
        result.duplicateOf = duplicate;
        result.allWarnings.push(`Duplicate of ${duplicate}`);
      }
    }

    // Client-side checks (no server needed)
    result.disposable = this.isDisposable(domain);
    result.isFreeEmail = this.isFreeEmail(domain);
    result.isCorporateEmail = !result.isFreeEmail && !result.disposable;
    result.isSpamTrap = this.isSpamTrap(domain);

    // Enhanced role detection with scoring
    result.roleScore = this.getRoleScore(localPart);
    result.roleBased = result.roleScore.isRole;

    result.typoSuggestion = this.detectTypo(domain);
    result.suppressed = Storage.isSupressed(normalized);

    // Add warnings for new checks
    if (result.isSpamTrap) {
      result.allWarnings.push("⚠️ CRITICAL: Known spam trap/honeypot domain");
    }
    if (result.isFreeEmail) {
      result.allWarnings.push("Free email provider (consumer email)");
    }
    if (result.roleScore.isRole) {
      result.allWarnings.push(
        `Role-based email (${result.roleScore.risk} risk)`,
      );
    }

    // Enhanced pattern analysis
    result.patternAnalysis = this.analyzeLocalPart(localPart);
    if (result.patternAnalysis.warnings.length > 0) {
      result.allWarnings.push(...result.patternAnalysis.warnings);
    }

    // Parse bounce if provided
    if (bounceText) {
      const bounce = this.parseBounce(bounceText);
      result.bounceCode = bounce.code;
      result.bounceCategory = bounce.category;
      result.bounceDetail = bounce.detail;
    }

    // DNS checks (requires server) - STANDARD and DEEP levels
    if (
      (validationLevel === "standard" || validationLevel === "deep") &&
      domain
    ) {
      const dnsData = await this.checkDNS(domain);

      if (!dnsData.error) {
        result.mxFound = dnsData.mx && dnsData.mx.length > 0;
        result.mxRecords = dnsData.mx || [];
        result.provider = dnsData.provider || "Unknown";
        result.spf = dnsData.spf || false;
        result.dkim = dnsData.dkim || false;
        result.dmarc = dnsData.dmarc || false;
      }

      // WHOIS check for domain age (corporate domains only, no free providers)
      // Skip free providers (gmail, yahoo, etc.) and disposable domains
      if (
        result.isCorporateEmail &&
        !result.disposable &&
        !result.isSpamTrap &&
        result.mxFound
      ) {
        try {
          const whoisData = await this.checkWhois(domain);
          if (whoisData.domainAge) {
            result.domainAge = whoisData.domainAge;

            // Add warnings based on domain age
            if (whoisData.domainAge.days < 30) {
              result.allWarnings.push(
                `⚠️ Very new domain (${whoisData.domainAge.days} days old) - High risk`,
              );
            } else if (whoisData.domainAge.days < 90) {
              result.allWarnings.push(
                `⚠️ Young domain (${Math.floor(whoisData.domainAge.days / 30)} months old) - Medium risk`,
              );
            } else if (whoisData.domainAge.years >= 3) {
              result.allWarnings.push(
                `✓ Established domain (${whoisData.domainAge.years} years old)`,
              );
            }
          }
        } catch (e) {
          // WHOIS check failed, continue without domain age
          console.warn("WHOIS check failed for", domain, e);
        }

        // Website accessibility check (checks if domain has active website)
        try {
          const websiteData = await this.checkWebsite(domain);
          result.websiteActive = websiteData.websiteActive || false;
          result.websiteProtocol = websiteData.protocol || null;

          if (websiteData.websiteActive) {
            result.allWarnings.push(
              `✓ Active website detected (${websiteData.protocol.toUpperCase()}) - Higher deliverability confidence`,
            );
          } else {
            result.allWarnings.push(
              `⚠️ No active website found - Domain may be inactive or mail-only`,
            );
          }
        } catch (e) {
          // Website check failed, continue without status
          console.warn("Website check failed for", domain, e);
        }
      }
    }

    // Gravatar check (async, non-blocking) - DEEP level only
    // Only check if not disposable/spam trap to save resources
    if (
      validationLevel === "deep" &&
      !result.disposable &&
      !result.isSpamTrap &&
      result.mxFound
    ) {
      try {
        result.hasGravatar = await this.checkGravatar(normalized);
        if (result.hasGravatar === true) {
          result.allWarnings.push(
            "✓ Has Gravatar profile (likely active email)",
          );
        }
      } catch (e) {
        result.hasGravatar = null; // Unable to check
      }
    }

    // SMTP Mailbox Verification - DEEP level only
    // Real inbox checking - use sparingly (rate limited to 20/min)
    if (
      validationLevel === "deep" &&
      !result.disposable &&
      !result.isSpamTrap &&
      result.mxFound &&
      result.isCorporateEmail // Only for corporate emails, avoid free providers
    ) {
      try {
        const smtpResult = await this.checkSMTP(normalized);
        result.smtpVerified = true;
        result.mailboxExists = smtpResult.exists;
        result.smtpCode = smtpResult.smtpCode;

        if (smtpResult.exists === true) {
          result.allWarnings.push("✅ Mailbox verified via SMTP (inbox exists)");
          result.score += 15; // Bonus for confirmed mailbox
        } else if (smtpResult.exists === false) {
          result.allWarnings.push("❌ Mailbox does not exist (SMTP verification failed)");
          result.score -= 30; // Penalty for non-existent mailbox
        } else if (smtpResult.exists === "unknown") {
          result.allWarnings.push("⚠️ SMTP verification inconclusive (server blocked or catch-all)");
        }
      } catch (e) {
        result.smtpVerified = false;
        result.mailboxExists = "unknown";
        console.warn("SMTP verification failed for", normalized, e);
      }
    }

    // Provider-specific validation
    result.providerWarnings = this.validateProviderConfig(result);
    if (result.providerWarnings.length > 0) {
      result.allWarnings.push(...result.providerWarnings);
    }

    // IMPORTANT: Add warning about SMTP verification limitation
    if (result.mxFound && !result.bounceCode && !result.smtpVerified) {
      result.allWarnings.push(
        "⚠️ DNS checks passed, but mailbox existence NOT verified (no SMTP check). Use Deep validation for mailbox verification. Score of 80-85 means 'likely deliverable' not 'guaranteed'.",
      );
    }

    // Calculate score and confidence
    result.score = this.score(result);
    result.recommendation = this.recommend(result.score);
    result.confidence = this.calculateConfidence(result);
    result.confidenceLevel = this.getConfidenceLevel(result.confidence);

    // Determine status
    if (!result.syntaxValid) {
      result.status = "invalid_syntax";
    } else if (result.isSpamTrap) {
      result.status = "spam_trap_critical";
    } else if (!result.mxFound) {
      result.status = "invalid_domain_no_mx";
    } else if (
      result.bounceCategory === "invalid_mailbox" ||
      result.bounceCategory === "permanent_failure"
    ) {
      result.status = "hard_bounce_invalid";
    } else if (result.bounceCategory === "recipient_not_accepted") {
      result.status = "rejected_by_policy";
    } else if (result.disposable) {
      result.status = "disposable_risky";
    } else if (result.recommendation === "suppress") {
      result.status = "risky_or_undeliverable";
    } else if (result.recommendation === "review") {
      result.status = "review_before_send";
    } else {
      result.status = "likely_deliverable";
    }

    return result;
  },

  async validateBulk(emails, bounceMap = {}) {
    const unique = [
      ...new Set(emails.map((e) => this.normalizeEmail(e)).filter(Boolean)),
    ];
    const results = [];

    // Extract unique domains for batch DNS lookup
    const domains = [
      ...new Set(
        unique
          .filter((email) => this.validateSyntax(email))
          .map((email) => this.getDomain(email)),
      ),
    ];

    // Batch DNS lookup
    let dnsCache = {};
    if (domains.length > 0) {
      try {
        const response = await fetch("/api/batch-dns-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: domains.slice(0, 50) }), // Max 50 per batch
        });

        if (response.ok) {
          const data = await response.json();
          dnsCache = data.results || {};
        }
      } catch (error) {
        console.warn(
          "Batch DNS lookup failed, falling back to individual checks",
          error,
        );
      }
    }

    // Process each email
    for (const email of unique) {
      const normalized = this.normalizeEmail(email);
      const syntaxValid = this.validateSyntax(normalized);
      const domain = syntaxValid ? this.getDomain(normalized) : "";
      const localPart = syntaxValid ? this.getLocalPart(normalized) : "";
      const bounceText = bounceMap[normalized] || "";

      const result = {
        email: normalized,
        syntaxValid,
        domain,
        localPart,
        mxFound: false,
        mxRecords: [],
        provider: "Unknown",
        spf: false,
        dkim: false,
        dmarc: false,
        disposable: false,
        roleBased: false,
        typoSuggestion: null,
        suppressed: false,
        bounceCode: null,
        bounceCategory: null,
        bounceDetail: null,
        score: 0,
        recommendation: "suppress",
        status: "invalid",
        patternAnalysis: null,
        providerWarnings: [],
        confidence: 0,
        confidenceLevel: null,
        allWarnings: [],
        checkedAt: new Date().toISOString(),
      };

      if (!syntaxValid) {
        result.status = "invalid_syntax";
        results.push(result);
        continue;
      }

      // Client-side checks
      result.disposable = this.isDisposable(domain);
      result.roleBased = this.isRoleBased(localPart);
      result.typoSuggestion = this.detectTypo(domain);
      result.suppressed = Storage.isSupressed(normalized);

      // Enhanced pattern analysis
      result.patternAnalysis = this.analyzeLocalPart(localPart);
      result.allWarnings = [];
      if (result.patternAnalysis.warnings.length > 0) {
        result.allWarnings.push(...result.patternAnalysis.warnings);
      }

      // Parse bounce
      if (bounceText) {
        const bounce = this.parseBounce(bounceText);
        result.bounceCode = bounce.code;
        result.bounceCategory = bounce.category;
        result.bounceDetail = bounce.detail;
      }

      // DNS checks (from cache or individual)
      if (domain && dnsCache[domain]) {
        const dnsData = dnsCache[domain];
        if (!dnsData.error) {
          result.mxFound = dnsData.mx && dnsData.mx.length > 0;
          result.mxRecords = dnsData.mx || [];
          result.provider = dnsData.provider || "Unknown";
          result.spf = dnsData.spf || false;
          result.dkim = dnsData.dkim || false;
          result.dmarc = dnsData.dmarc || false;
        }
      }

      // Provider-specific validation
      result.providerWarnings = this.validateProviderConfig(result);
      if (result.providerWarnings.length > 0) {
        result.allWarnings.push(...result.providerWarnings);
      }

      // Calculate score and confidence
      result.score = this.score(result);
      result.recommendation = this.recommend(result.score);
      result.confidence = this.calculateConfidence(result);
      result.confidenceLevel = this.getConfidenceLevel(result.confidence);

      // Determine status
      if (!result.mxFound) {
        result.status = "invalid_domain_no_mx";
      } else if (
        result.bounceCategory === "invalid_mailbox" ||
        result.bounceCategory === "permanent_failure"
      ) {
        result.status = "hard_bounce_invalid";
      } else if (result.bounceCategory === "recipient_not_accepted") {
        result.status = "rejected_by_policy";
      } else if (result.disposable) {
        result.status = "disposable_risky";
      } else if (result.recommendation === "suppress") {
        result.status = "risky_or_undeliverable";
      } else if (result.recommendation === "review") {
        result.status = "review_before_send";
      } else {
        result.status = "likely_deliverable";
      }

      results.push(result);
    }

    return results;
  },
};

// ============================================
// CSV Utilities
// ============================================

const CSV = {
  parse(content) {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return rows;
  },

  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  stringify(data, headers) {
    const escape = (value) => {
      const str = value === null || value === undefined ? "" : String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => escape(row[header]));
      lines.push(values.join(","));
    }

    return lines.join("\n");
  },

  download(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  },

  // CSV Format Parsers for different platforms
  formatParsers: {
    generic: {
      name: "Generic CSV",
      columnMap: {
        email: ["email", "email address", "e-mail", "mail"],
        name: ["name", "full name", "fullname"],
        status: ["status", "state"],
      },
      detectFormat(headers) {
        return headers.some((h) =>
          ["email", "email address", "e-mail"].includes(h.toLowerCase()),
        );
      },
    },

    mailchimp: {
      name: "Mailchimp Export",
      columnMap: {
        email: ["email address"],
        firstName: ["first name"],
        lastName: ["last name"],
        status: ["status"],
        tags: ["tags"],
        memberRating: ["member rating"],
      },
      detectFormat(headers) {
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        return (
          lowerHeaders.includes("email address") &&
          lowerHeaders.includes("member rating")
        );
      },
    },

    hubspot: {
      name: "HubSpot Export",
      columnMap: {
        email: ["email", "email address"],
        firstName: ["first name", "firstname"],
        lastName: ["last name", "lastname"],
        company: ["company name"],
        owner: ["contact owner"],
        status: ["lead status", "lifecycle stage"],
      },
      detectFormat(headers) {
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        return (
          lowerHeaders.includes("contact owner") ||
          lowerHeaders.includes("lifecycle stage")
        );
      },
    },

    google: {
      name: "Google Contacts",
      columnMap: {
        email: ["e-mail 1 - value", "email 1 - value", "e-mail address"],
        name: ["name"],
        givenName: ["given name"],
        familyName: ["family name"],
        organization: ["organization 1 - name"],
      },
      detectFormat(headers) {
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        return lowerHeaders.some(
          (h) => h.startsWith("e-mail") && h.includes("value"),
        );
      },
    },
  },

  // Auto-detect CSV format based on headers
  detectCSVFormat(headers) {
    for (const [format, parser] of Object.entries(this.formatParsers)) {
      if (parser.detectFormat(headers)) {
        return format;
      }
    }
    return "generic";
  },

  // Parse CSV with format-specific column mapping
  parseWithFormat(content, format = "generic") {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return { emails: [], format: format };

    const rawHeaders = this.parseCSVLine(lines[0]);
    const headers = rawHeaders.map((h) => h.trim());

    // Auto-detect format if not specified
    if (format === "auto") {
      format = this.detectCSVFormat(headers);
    }

    const parser = this.formatParsers[format] || this.formatParsers.generic;
    const columnMap = parser.columnMap;

    // Find email column index
    let emailColumnIndex = -1;
    for (const header of headers) {
      const lowerHeader = header.toLowerCase();
      const emailColumns = columnMap.email;
      if (emailColumns.some((col) => lowerHeader.includes(col))) {
        emailColumnIndex = headers.indexOf(header);
        break;
      }
    }

    if (emailColumnIndex === -1) {
      // Fallback: try first column with @ symbol in values
      for (let i = 1; i < Math.min(5, lines.length); i++) {
        const values = this.parseCSVLine(lines[i]);
        for (let j = 0; j < values.length; j++) {
          if (values[j] && values[j].includes("@")) {
            emailColumnIndex = j;
            break;
          }
        }
        if (emailColumnIndex !== -1) break;
      }
    }

    const emails = [];
    const metadata = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const email = values[emailColumnIndex]?.trim();

      if (email && email.includes("@")) {
        emails.push(email);

        // Extract metadata based on format
        const meta = { email, rawRow: i + 1 };
        headers.forEach((header, index) => {
          meta[header] = values[index] || "";
        });
        metadata.push(meta);
      }
    }

    return {
      emails,
      metadata,
      format: format,
      formatName: parser.name,
      totalLines: lines.length - 1,
      emailColumn: headers[emailColumnIndex],
    };
  },

  // Lazy CSV parsing for large files (chunked processing)
  async *parseCSVLazy(content, chunkSize = 1000) {
    const lines = content.split(/\r?\n/);
    const rawHeaders = this.parseCSVLine(lines[0]);
    const headers = rawHeaders.map((h) => h.trim());

    // Detect format
    const format = this.detectCSVFormat(headers);
    const parser = this.formatParsers[format];

    // Find email column
    let emailColumnIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const lowerHeader = headers[i].toLowerCase();
      if (parser.columnMap.email.some((col) => lowerHeader.includes(col))) {
        emailColumnIndex = i;
        break;
      }
    }

    // Process in chunks
    for (let i = 1; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));
      const emails = [];

      for (const line of chunk) {
        if (!line.trim()) continue;
        const values = this.parseCSVLine(line);
        const email = values[emailColumnIndex]?.trim();
        if (email && email.includes("@")) {
          emails.push(email);
        }
      }

      yield {
        emails,
        progress: Math.min(i + chunkSize, lines.length) / lines.length,
        processed: Math.min(i + chunkSize, lines.length),
        total: lines.length,
      };
    }
  },
};

// ============================================
// UI Controller
// ============================================

const UI = {
  currentResults: [],
  filteredResults: [],
  currentPage: 1,
  itemsPerPage: 30,
  validationPaused: false,
  validationCancelled: false,
  currentValidationAbortController: null,

  init() {
    this.selectedFormat = "auto"; // Default format for CSV imports
    this.bindEvents();
    this.loadSavedResults();
    this.updateStats();
    this.initRealtimeValidation();

    // Initialize IndexedDB
    Storage.initDB()
      .then(() => {
        console.log("IndexedDB initialized successfully");
      })
      .catch((err) => {
        console.warn(
          "IndexedDB initialization failed, using localStorage fallback:",
          err,
        );
      });
  },

  bindEvents() {
    // Single email validation
    document
      .getElementById("validateSingleBtn")
      ?.addEventListener("click", () => this.validateSingle());

    // Bulk validation
    document
      .getElementById("validateBulkBtn")
      ?.addEventListener("click", () => this.validateBulk());

    // Validation controls
    document
      .getElementById("pauseValidationBtn")
      ?.addEventListener("click", () => this.pauseValidation());
    document
      .getElementById("resumeValidationBtn")
      ?.addEventListener("click", () => this.resumeValidation());
    document
      .getElementById("cancelValidationBtn")
      ?.addEventListener("click", () => this.cancelValidation());

    // CSV upload
    document
      .getElementById("csvFile")
      ?.addEventListener("change", (e) => this.handleCSVUpload(e));
    document
      .getElementById("uploadCsvBtn")
      ?.addEventListener("click", () =>
        document.getElementById("csvFile").click(),
      );

    // Export
    document
      .getElementById("exportBtn")
      ?.addEventListener("click", () => this.exportResults());
    document
      .getElementById("exportCategoryBtn")
      ?.addEventListener("click", () => this.exportByCategory());

    // Bounce parser
    document
      .getElementById("parseBounceBtn")
      ?.addEventListener("click", () => this.parseBounce());

    // Clear data
    document
      .getElementById("clearDataBtn")
      ?.addEventListener("click", () => this.clearData());

    // Suppression management
    document
      .getElementById("viewSuppressionBtn")
      ?.addEventListener("click", () => this.showSuppression());

    // API Key configuration
    document
      .getElementById("saveApiKeyBtn")
      ?.addEventListener("click", () => this.saveApiKey());

    // Load saved API key on init
    this.loadApiKey();

    // Filter results
    document
      .getElementById("filterSelect")
      ?.addEventListener("change", () => this.filterResults());

    // Search
    document
      .getElementById("searchInput")
      ?.addEventListener("input", (e) => this.searchResults(e.target.value));

    // Validation level selector
    document
      .getElementById("validationLevel")
      ?.addEventListener("change", (e) =>
        this.updateValidationLevelHint(e.target.value),
      );

    // Import format selector buttons
    document.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Remove active class from all buttons
        document
          .querySelectorAll(".format-btn")
          .forEach((b) => b.classList.remove("active"));
        // Add active class to clicked button
        e.target.classList.add("active");
        // Store selected format
        this.selectedFormat = e.target.dataset.format;
      });
    });
  },

  updateValidationLevelHint(level) {
    const hints = {
      quick:
        "⚡ Quick validation (syntax, disposable, typos only - no DNS checks)",
      standard: "🔍 Standard validation (syntax + DNS + email authentication)",
      deep: "🔬 Deep validation (all checks including Gravatar verification)",
    };

    // You can add a hint element to show the current level description
    const hintElement = document.getElementById("validationLevelHint");
    if (hintElement) {
      hintElement.textContent = hints[level] || hints.standard;
    }
  },

  // Real-time syntax validation
  initRealtimeValidation() {
    const input = document.getElementById("singleEmail");
    const feedback = document.getElementById("syntaxFeedback");
    const typoSuggestion = document.getElementById("typoSuggestion");
    const typoText = document.getElementById("typoText");
    const acceptTypoBtn = document.getElementById("acceptTypoBtn");
    const dismissTypoBtn = document.getElementById("dismissTypoBtn");

    if (!input) return;

    let typingTimeout;

    input.addEventListener("input", () => {
      clearTimeout(typingTimeout);

      // Wait for user to stop typing (300ms debounce)
      typingTimeout = setTimeout(() => {
        const email = input.value.trim();

        if (!email) {
          input.classList.remove("valid", "invalid");
          feedback.textContent = "";
          typoSuggestion.style.display = "none";
          return;
        }

        const isValid = Validator.validateSyntax(email);

        if (isValid) {
          input.classList.remove("invalid");
          input.classList.add("valid");
          feedback.textContent = "✓";
          feedback.className = "syntax-feedback valid";

          // Check for typos
          const domain = Validator.getDomain(email);
          const suggestion = Validator.detectTypo(domain);

          if (suggestion) {
            typoText.textContent = `Did you mean ${email.replace(domain, suggestion)}?`;
            typoSuggestion.style.display = "flex";

            // Accept suggestion
            acceptTypoBtn.onclick = () => {
              input.value = email.replace(domain, suggestion);
              typoSuggestion.style.display = "none";
              input.classList.add("valid");
              feedback.textContent = "✓";
            };

            // Dismiss suggestion
            dismissTypoBtn.onclick = () => {
              typoSuggestion.style.display = "none";
            };
          } else {
            typoSuggestion.style.display = "none";
          }
        } else {
          input.classList.remove("valid");
          input.classList.add("invalid");
          feedback.textContent = "✗";
          feedback.className = "syntax-feedback invalid";
          typoSuggestion.style.display = "none";
        }
      }, 300);
    });
  },

  // Pause validation
  pauseValidation() {
    this.validationPaused = true;
    document.getElementById("pauseValidationBtn").style.display = "none";
    document.getElementById("resumeValidationBtn").style.display =
      "inline-flex";
    this.showNotification("Validation paused", "info");
  },

  // Resume validation
  resumeValidation() {
    this.validationPaused = false;
    document.getElementById("pauseValidationBtn").style.display = "inline-flex";
    document.getElementById("resumeValidationBtn").style.display = "none";
    this.showNotification("Validation resumed", "info");
  },

  // Cancel validation
  cancelValidation() {
    this.validationCancelled = true;
    if (this.currentValidationAbortController) {
      this.currentValidationAbortController.abort();
    }
    document.getElementById("validationProgress").style.display = "none";
    document.getElementById("validationButtons").style.display = "none";
    this.hideLoading();
    this.showNotification("Validation cancelled", "warning");
  },

  async validateSingle() {
    const email = document.getElementById("singleEmail")?.value?.trim();
    if (!email) {
      this.showNotification("Please enter an email address", "error");
      return;
    }

    // Get selected validation level
    const validationLevel =
      document.getElementById("validationLevel")?.value || "standard";

    this.showLoading("Validating...");

    try {
      const result = await Validator.validate(email, "", [], validationLevel);
      this.currentResults = [result];
      await Storage.setResults(this.currentResults);
      this.renderResults(this.currentResults);
      this.updateStats();
      this.showNotification("Validation complete", "success");
    } catch (error) {
      this.showNotification("Validation failed: " + error.message, "error");
    } finally {
      this.hideLoading();
    }
  },

  async validateBulk() {
    const textarea = document.getElementById("bulkEmails");
    const bounceTextarea = document.getElementById("bulkBounces");

    const emails =
      textarea?.value
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean) || [];

    if (emails.length === 0) {
      this.showNotification("Please enter email addresses", "error");
      return;
    }

    // Enforce 100 email limit for server protection
    if (emails.length > 100) {
      this.showNotification(
        `⚠️ Bulk validation limited to 100 emails at a time. You entered ${emails.length} emails. Please split into smaller batches.`,
        "error",
        8000,
      );
      return;
    }

    // Parse bounce map (format: email|bounce text)
    const bounceMap = {};
    const bounceLines = bounceTextarea?.value.split("\n").filter(Boolean) || [];

    for (const line of bounceLines) {
      const [email, ...rest] = line.split("|");
      if (email && rest.length > 0) {
        bounceMap[email.trim().toLowerCase()] = rest.join("|").trim();
      }
    }

    // Reset pause/cancel state
    this.validationPaused = false;
    this.validationCancelled = false;

    // Show progress bar and controls
    const progressBar = document.getElementById("validationProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const validationButtons = document.getElementById("validationButtons");

    progressBar.style.display = "block";
    validationButtons.style.display = "flex";
    document.getElementById("pauseValidationBtn").style.display = "inline-flex";
    document.getElementById("resumeValidationBtn").style.display = "none";

    try {
      const results = [];
      const total = emails.length;

      // Process emails in chunks with pause/cancel support
      for (let i = 0; i < emails.length; i++) {
        // Check if cancelled
        if (this.validationCancelled) {
          this.showNotification("Validation cancelled", "warning");
          break;
        }

        // Wait while paused
        while (this.validationPaused && !this.validationCancelled) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const email = emails[i];
        const bounceText = bounceMap[email.toLowerCase()] || "";

        // Get selected validation level
        const validationLevel =
          document.getElementById("validationLevel")?.value || "standard";

        // Validate email
        const result = await Validator.validate(
          email,
          bounceText,
          emails.slice(0, i),
          validationLevel,
        );
        results.push(result);

        // Update progress
        const percentage = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${i + 1} / ${total}`;

        // Small delay to prevent overwhelming the browser (every 10 emails)
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Save and display results
      this.currentResults = results;
      Storage.setResults(results);
      Storage.addHistory({ type: "bulk_validation", count: results.length });
      this.renderResults(results);
      this.updateStats();

      if (!this.validationCancelled) {
        this.showNotification(`Validated ${results.length} emails`, "success");
      }
    } catch (error) {
      this.showNotification("Validation failed: " + error.message, "error");
    } finally {
      // Hide progress bar and controls
      progressBar.style.display = "none";
      validationButtons.style.display = "none";
      this.validationPaused = false;
      this.validationCancelled = false;
    }
  },

  async handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.showLoading("Processing CSV...");

    try {
      const content = await file.text();

      // Get selected format or auto-detect
      const selectedFormat = this.selectedFormat || "auto";
      const parsed = CSV.parseWithFormat(content, selectedFormat);

      if (parsed.emails.length === 0) {
        this.showNotification("No emails found in CSV", "error");
        this.hideLoading();
        return;
      }

      const emails = parsed.emails;
      const bounceMap = {};

      // Show format detection result
      console.log(
        `Detected format: ${parsed.formatName} (${parsed.emails.length} emails from column: ${parsed.emailColumn})`,
      );

      // Process emails with validation
      const results = [];
      const total = emails.length;
      const validationLevel =
        document.getElementById("validationLevel")?.value || "standard";

      // Show progress for large CSVs
      if (total > 100) {
        // Use lazy parsing for large files
        for await (const chunk of CSV.parseCSVLazy(content, 500)) {
          for (const email of chunk.emails) {
            const result = await Validator.validate(
              email,
              "",
              emails.slice(0, results.length),
              validationLevel,
            );
            results.push(result);
          }

          // Update progress
          this.showLoading(
            `Processing CSV... ${chunk.processed}/${chunk.total}`,
          );
        }
      } else {
        // Process normally for small files
        for (let i = 0; i < emails.length; i++) {
          const result = await Validator.validate(
            emails[i],
            "",
            emails.slice(0, i),
            validationLevel,
          );
          results.push(result);

          if (i % 10 === 0) {
            this.showLoading(`Processing CSV... ${i + 1}/${total}`);
          }
        }
      }

      this.currentResults = results;
      await Storage.setResults(results);
      Storage.addHistory({
        type: "csv_upload",
        filename: file.name,
        format: parsed.formatName,
        count: results.length,
      });
      this.renderResults(results);
      this.updateStats();
      this.showNotification(
        `Processed ${results.length} emails from ${parsed.formatName}`,
        "success",
      );
    } catch (error) {
      this.showNotification("CSV processing failed: " + error.message, "error");
    } finally {
      this.hideLoading();
    }
  },

  exportResults() {
    if (this.currentResults.length === 0) {
      this.showNotification("No results to export", "error");
      return;
    }

    const headers = [
      "email",
      "status",
      "score",
      "recommendation",
      "domain",
      "provider",
      "mxFound",
      "spf",
      "dkim",
      "dmarc",
      "disposable",
      "roleBased",
      "typoSuggestion",
      "bounceCode",
      "bounceCategory",
      "bounceDetail",
      "suppressed",
    ];

    const csv = CSV.stringify(this.currentResults, headers);
    const filename = `email-validation-${new Date().toISOString().split("T")[0]}.csv`;
    CSV.download(csv, filename);
    this.showNotification("Results exported", "success");
  },

  exportByCategory() {
    const category = document.getElementById("exportCategorySelect")?.value;

    if (!category) {
      this.showNotification("Please select a category", "error");
      return;
    }

    const filtered = this.currentResults.filter(
      (r) => r.recommendation === category,
    );

    if (filtered.length === 0) {
      const labels = {
        send: "send-ready",
        review: "need-review",
        suppress: "should-suppress",
      };
      this.showNotification(`No ${labels[category]} emails to export`, "error");
      return;
    }

    const headers = [
      "email",
      "status",
      "score",
      "recommendation",
      "domain",
      "provider",
      "mxFound",
      "spf",
      "dkim",
      "dmarc",
      "disposable",
      "roleBased",
      "typoSuggestion",
      "bounceCode",
      "bounceCategory",
      "bounceDetail",
      "suppressed",
    ];

    const csv = CSV.stringify(filtered, headers);
    const labels = {
      send: "send-ready",
      review: "need-review",
      suppress: "should-suppress",
    };
    const filename = `${labels[category]}-emails-${new Date().toISOString().split("T")[0]}.csv`;
    CSV.download(csv, filename);
    this.showNotification(
      `Exported ${filtered.length} ${labels[category]} emails`,
      "success",
    );
  },

  parseBounce() {
    const text = document.getElementById("bounceText")?.value;
    if (!text) {
      this.showNotification("Please enter bounce text", "error");
      return;
    }

    const result = Validator.parseBounce(text);
    document.getElementById("bounceResult").textContent = JSON.stringify(
      result,
      null,
      2,
    );
  },

  renderResults(results) {
    const tbody = document.querySelector("#resultsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (results.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="11" style="text-align:center;">No results</td></tr>';
      this.renderPagination(0);
      return;
    }

    // Store filtered results for pagination
    this.filteredResults = results;

    // Calculate pagination
    const totalPages = Math.ceil(results.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedResults = results.slice(startIndex, endIndex);

    // Render current page
    paginatedResults.forEach((result) => {
      const tr = document.createElement("tr");
      tr.className = `status-${result.recommendation}`;

      // Build warnings tooltip
      const warningsHtml =
        result.allWarnings && result.allWarnings.length > 0
          ? `<span class="warning-icon" data-tooltip="${this.escapeHtml(result.allWarnings.join(" • "))}">⚠️</span>`
          : "";

      tr.innerHTML = `
        <td>${warningsHtml}${this.escapeHtml(result.email)}</td>
        <td><span class="badge badge-${this.getStatusClass(result.status)}">${result.status}</span></td>
        <td><span class="score score-${this.getScoreClass(result.score)}">${result.score}</span></td>
        <td><span class="badge badge-${result.recommendation}">${this.formatRecommendation(result.recommendation)}</span></td>
        <td>${this.renderDomainInfo(result)}</td>
        <td>${this.escapeHtml(result.provider)}</td>
        <td>${result.mxFound ? "✓" : "✗"}</td>
        <td>${this.renderAuth(result)}</td>
        <td>${this.renderFlags(result)}</td>
        <td>${this.renderBounce(result)}</td>
        <td>
          ${
            result.suppressed
              ? `<button class="btn-small btn-danger" onclick="UI.unsuppress('${result.email}')">Remove</button>`
              : `<button class="btn-small" onclick="UI.suppress('${result.email}')">Add</button>`
          }
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Render pagination controls
    this.renderPagination(results.length);
  },

  renderPagination(totalItems) {
    const paginationContainer = document.getElementById("paginationContainer");
    if (!paginationContainer) return;

    if (totalItems === 0) {
      paginationContainer.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let html = '<div class="pagination">';

    // Previous button
    html += `<button class="pagination-btn ${this.currentPage === 1 ? "disabled" : ""}" 
      onclick="UI.goToPage(${this.currentPage - 1})" 
      ${this.currentPage === 1 ? "disabled" : ""}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
      Previous
    </button>`;

    // Page numbers with smart truncation
    const pages = this.getPageNumbers(this.currentPage, totalPages);

    pages.forEach((page) => {
      if (page === "...") {
        html += '<span class="pagination-ellipsis">...</span>';
      } else {
        html += `<button class="pagination-btn ${page === this.currentPage ? "active" : ""}" 
          onclick="UI.goToPage(${page})">${page}</button>`;
      }
    });

    // Next button
    html += `<button class="pagination-btn ${this.currentPage === totalPages ? "disabled" : ""}" 
      onclick="UI.goToPage(${this.currentPage + 1})" 
      ${this.currentPage === totalPages ? "disabled" : ""}>
      Next
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>`;

    html += "</div>";

    // Add page info
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
    html += `<div class="pagination-info">
      Showing ${startItem}-${endItem} of ${totalItems} results | Page ${this.currentPage} of ${totalPages}
    </div>`;

    paginationContainer.innerHTML = html;
  },

  getPageNumbers(current, total) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  },

  goToPage(page) {
    const totalPages = Math.ceil(
      this.filteredResults.length / this.itemsPerPage,
    );

    if (page < 1 || page > totalPages) return;

    this.currentPage = page;
    this.renderResults(this.filteredResults);

    // Smooth scroll to top of results
    document
      .querySelector(".results-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  renderAuth(result) {
    const icons = [];
    if (result.spf) icons.push("SPF");
    if (result.dkim) icons.push("DKIM");
    if (result.dmarc) icons.push("DMARC");
    return icons.length > 0 ? icons.join(" ") : "-";
  },

  renderFlags(result) {
    const flags = [];

    // CRITICAL flags first
    if (result.isSpamTrap)
      flags.push(
        '<span class="flag flag-danger" data-tooltip="⚠️ WARNING: Known spam trap or honeypot domain - NEVER send to this address">🚨 SPAM TRAP</span>',
      );

    // Core risk flags
    if (result.disposable)
      flags.push(
        '<span class="flag flag-danger" data-tooltip="Temporary/disposable email service - low deliverability and engagement">Disposable</span>',
      );

    // Role-based with risk level
    if (result.roleScore && result.roleScore.isRole) {
      const roleClass =
        result.roleScore.risk === "high"
          ? "danger"
          : result.roleScore.risk === "medium"
            ? "warning"
            : "info";
      flags.push(
        `<span class="flag flag-${roleClass}" data-tooltip="Role-based email (${result.roleScore.risk} risk) - Generic shared inbox, lower engagement">${result.roleScore.risk.toUpperCase()} Role</span>`,
      );
    }

    // Typo suggestion
    if (result.typoSuggestion)
      flags.push(
        `<span class="flag flag-warning" data-tooltip="Common typo detected - suggest correction to user">Typo→${result.typoSuggestion}</span>`,
      );

    // Duplicate detection
    if (result.isDuplicate)
      flags.push(
        `<span class="flag flag-warning" data-tooltip="Duplicate of ${result.duplicateOf} (after normalization)">Duplicate</span>`,
      );

    // Email type indicators
    if (result.isFreeEmail)
      flags.push(
        '<span class="flag flag-info" data-tooltip="Consumer/free email provider (Gmail, Yahoo, etc.) - good for B2C">Free Email</span>',
      );
    if (result.isCorporateEmail)
      flags.push(
        '<span class="flag flag-success" data-tooltip="Corporate/business email domain - higher quality for B2B">Corporate</span>',
      );

    // Gravatar indicator
    if (result.hasGravatar === true)
      flags.push(
        '<span class="flag flag-success" data-tooltip="Email has Gravatar profile - indicates active, real user">✓ Gravatar</span>',
      );

    // Domain age indicator (corporate domains only)
    if (result.domainAge) {
      const age = result.domainAge;
      if (age.days < 30) {
        flags.push(
          `<span class="flag flag-danger" data-tooltip="Domain registered only ${age.days} days ago - Very high risk for spam/fraud">⚠️ ${age.days}d old</span>`,
        );
      } else if (age.days < 90) {
        flags.push(
          `<span class="flag flag-warning" data-tooltip="Domain is only ${Math.floor(age.days / 30)} months old - Medium risk">⚠️ ${Math.floor(age.days / 30)}mo old</span>`,
        );
      } else if (age.years >= 3) {
        flags.push(
          `<span class="flag flag-success" data-tooltip="Domain is ${age.years} years old - Well established, trusted">✓ ${age.years}y old</span>`,
        );
      } else if (age.years >= 1) {
        flags.push(
          `<span class="flag flag-info" data-tooltip="Domain is ${age.years} years old - Established">📅 ${age.years}y old</span>`,
        );
      }
    }

    // Enhanced pattern flags
    if (result.patternAnalysis) {
      if (result.patternAnalysis.isGibberish)
        flags.push(
          '<span class="flag flag-danger" data-tooltip="Email looks like random characters (no vowel pattern)">Gibberish</span>',
        );
      if (result.patternAnalysis.isRandomPattern)
        flags.push(
          '<span class="flag flag-warning" data-tooltip="Keyboard pattern or repeating characters detected">Random</span>',
        );
      if (result.patternAnalysis.hasExcessiveNumbers)
        flags.push(
          '<span class="flag flag-warning" data-tooltip="Unusually high number of digits (60%+)">Many Numbers</span>',
        );
    }

    // Confidence indicator
    if (result.confidenceLevel) {
      const conf = result.confidenceLevel;
      const confidenceClass =
        conf.level === "high"
          ? "success"
          : conf.level === "medium"
            ? "warning"
            : "danger";
      flags.push(
        `<span class="flag flag-${confidenceClass}" data-tooltip="${conf.label} - Indicates how certain we are about this validation result">${conf.emoji} ${result.confidence}%</span>`,
      );
    }

    return flags.length > 0 ? flags.join(" ") : "-";
  },

  renderDomainInfo(result) {
    let html = `<div style="line-height: 1.4;">`;
    html += `<strong>${this.escapeHtml(result.domain)}</strong>`;

    // Domain age line
    if (result.domainAge) {
      const age = result.domainAge;
      let ageColor = "#10b981"; // green for old domains
      let ageText = "";

      if (age.days < 30) {
        ageColor = "#ef4444"; // red
        ageText = `${age.days} days old`;
      } else if (age.days < 90) {
        ageColor = "#f59e0b"; // yellow
        ageText = `${Math.floor(age.days / 30)} months old`;
      } else if (age.years < 1) {
        ageColor = "#3b82f6"; // blue
        ageText = `${Math.floor(age.days / 30)} months old`;
      } else {
        ageText = `${age.years} years old`;
      }

      html += `<br><small style="color: ${ageColor}; font-weight: 500;">📅 ${ageText}</small>`;
    } else if (result.isCorporateEmail && result.domainAge === null) {
      // WHOIS data unavailable (common for some ccTLDs like .co.za, .in, etc.)
      html += `<br><small style="color: #9ca3af; font-weight: 400; font-size: 0.75rem;">📅 Age unavailable (WHOIS protected)</small>`;
    }

    // Website status line
    if (result.websiteActive === true) {
      const protocol = result.websiteProtocol?.toUpperCase() || "HTTP";
      const isSecure = protocol === "HTTPS";
      const color = isSecure ? "#10b981" : "#3b82f6";
      const icon = isSecure ? "🔒" : "🌐";
      html += `<br><small style="color: ${color}; font-weight: 500;">${icon} Active (${protocol})</small>`;
      html += `<br><small style="color: #6b7280; font-size: 0.75rem;">✓ Higher deliverability</small>`;
    } else if (result.websiteActive === false && result.isCorporateEmail) {
      html += `<br><small style="color: #f59e0b; font-weight: 500;">⚠️ No website</small>`;
      html += `<br><small style="color: #6b7280; font-size: 0.75rem;">Mail-only or inactive</small>`;
    }

    // SMTP Mailbox Verification status (Deep validation only)
    if (result.smtpVerified) {
      if (result.mailboxExists === true) {
        html += `<br><small style="color: #10b981; font-weight: 600;">✅ Mailbox verified</small>`;
        html += `<br><small style="color: #6b7280; font-size: 0.75rem;">SMTP: Inbox exists</small>`;
      } else if (result.mailboxExists === false) {
        html += `<br><small style="color: #ef4444; font-weight: 600;">❌ Mailbox not found</small>`;
        html += `<br><small style="color: #6b7280; font-size: 0.75rem;">SMTP: No inbox</small>`;
      } else if (result.mailboxExists === "unknown") {
        html += `<br><small style="color: #f59e0b; font-weight: 500;">⚠️ SMTP inconclusive</small>`;
        html += `<br><small style="color: #6b7280; font-size: 0.75rem;">Server blocked check</small>`;
      }
    }

    html += `</div>`;
    return html;
  },

  renderBounce(result) {
    if (!result.bounceCategory) return "-";
    return `<span class="badge badge-${this.getBounceClass(result.bounceCategory)}">${result.bounceCategory}</span>`;
  },

  formatRecommendation(rec) {
    const labels = {
      likely_deliverable: "Likely Deliverable",
      send: "Send",
      review: "Review",
      suppress: "Suppress",
    };
    return labels[rec] || rec;
  },

  getStatusClass(status) {
    if (status.includes("deliverable")) return "success";
    if (status.includes("review")) return "warning";
    return "danger";
  },

  getScoreClass(score) {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  },

  getBounceClass(category) {
    if (category.includes("accepted")) return "success";
    if (category.includes("temp")) return "warning";
    return "danger";
  },

  updateStats() {
    const results = this.currentResults;
    const total = results.length;
    const send = results.filter((r) => r.recommendation === "send").length;
    const review = results.filter((r) => r.recommendation === "review").length;
    const suppress = results.filter(
      (r) => r.recommendation === "suppress",
    ).length;
    const suppressed = Storage.getSuppression().length;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statSend").textContent = send;
    document.getElementById("statReview").textContent = review;
    document.getElementById("statSuppress").textContent = suppress;
    document.getElementById("statSuppressed").textContent = suppressed;
  },

  suppress(email) {
    Storage.addToSuppression(email, "manual");
    this.validateBulk(); // Re-validate
    this.showNotification("Added to suppression list", "success");
  },

  unsuppress(email) {
    Storage.removeFromSuppression(email);
    this.validateBulk(); // Re-validate
    this.showNotification("Removed from suppression list", "success");
  },

  showSuppression() {
    const list = Storage.getSuppression();
    const modal = document.getElementById("suppressionModal");
    const tbody = document.querySelector("#suppressionTable tbody");

    if (!tbody || !modal) return;

    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align:center;">No suppressed emails</td></tr>';
    } else {
      list.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${this.escapeHtml(item.email)}</td>
          <td>${item.reason}</td>
          <td><button class="btn-small btn-danger" onclick="UI.unsuppress('${item.email}')">Remove</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    modal.style.display = "block";
  },

  filterResults() {
    const filter = document.getElementById("filterSelect")?.value;

    // Reset to page 1 when filtering
    this.currentPage = 1;

    let filtered = this.currentResults;

    if (filter === "send") {
      filtered = this.currentResults.filter((r) => r.recommendation === "send");
    } else if (filter === "review") {
      filtered = this.currentResults.filter(
        (r) => r.recommendation === "review",
      );
    } else if (filter === "suppress") {
      filtered = this.currentResults.filter(
        (r) => r.recommendation === "suppress",
      );
    } else if (filter === "disposable") {
      filtered = this.currentResults.filter((r) => r.disposable);
    } else if (filter === "hard-bounce") {
      filtered = this.currentResults.filter(
        (r) =>
          r.bounceCategory === "invalid_mailbox" ||
          r.bounceCategory === "permanent_failure",
      );
    }

    this.renderResults(filtered);
  },

  searchResults(query) {
    // Reset to page 1 when searching
    this.currentPage = 1;

    if (!query) {
      this.renderResults(this.currentResults);
      return;
    }

    const lower = query.toLowerCase();
    const filtered = this.currentResults.filter(
      (r) =>
        r.email.includes(lower) ||
        r.domain.includes(lower) ||
        r.status.includes(lower),
    );

    this.renderResults(filtered);
  },

  loadSavedResults() {
    const saved = Storage.getResults();
    if (saved && saved.length > 0) {
      this.currentResults = saved;
      this.renderResults(saved);
    }
  },

  clearData() {
    if (!confirm("Clear all stored data? This cannot be undone.")) return;

    Storage.clear();
    this.currentResults = [];
    this.renderResults([]);
    this.updateStats();
    this.showNotification("All data cleared", "success");
  },

  loadApiKey() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeyStatus = document.getElementById("apiKeyStatus");

    if (apiKeyInput && ApiConfig.isConfigured()) {
      apiKeyInput.value = ApiConfig.getApiKey();
      if (apiKeyStatus) {
        apiKeyStatus.textContent = "✅ API key configured";
        apiKeyStatus.style.color = "#10b981";
      }
    } else if (apiKeyStatus) {
      apiKeyStatus.textContent =
        "⚠️ No API key configured - API requests will fail";
      apiKeyStatus.style.color = "#f59e0b";
    }
  },

  saveApiKey() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeyStatus = document.getElementById("apiKeyStatus");

    if (!apiKeyInput) return;

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      if (apiKeyStatus) {
        apiKeyStatus.textContent = "❌ Please enter an API key";
        apiKeyStatus.style.color = "#ef4444";
      }
      return;
    }

    ApiConfig.setApiKey(apiKey);

    if (apiKeyStatus) {
      apiKeyStatus.textContent = "✅ API key saved successfully";
      apiKeyStatus.style.color = "#10b981";
    }

    this.showNotification("API key saved successfully", "success");
  },

  showLoading(message) {
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loaderText");
    if (loader) loader.style.display = "flex";
    if (loaderText) loaderText.textContent = message;
  },

  hideLoading() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
  },

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => UI.init());
} else {
  UI.init();
}

// Expose to window for onclick handlers
window.UI = UI;
window.Validator = Validator;
window.Storage = Storage;
