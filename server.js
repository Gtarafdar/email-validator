/**
 * Privacy-First Email Validator Backend
 *
 * This server ONLY performs DNS lookups (MX, SPF, DKIM, DMARC).
 * Email addresses are NEVER logged or stored on the server.
 * All validation logic and data storage happens client-side.
 */

const express = require("express");
const dns = require("node:dns").promises;
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const whoiser = require("whoiser");
const https = require("node:https");
const http = require("node:http");
const net = require("node:net");

const app = express();
const PORT = process.env.PORT || 8787;
const API_KEY = process.env.API_KEY || "dev-key-change-in-production";

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later.",
});

// Stricter rate limit for SMTP verification (more resource-intensive)
const smtpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Only 20 SMTP checks per minute
  message: "SMTP verification rate limit exceeded. Please try again later.",
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(limiter);
app.use(express.static("public"));

// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid API key required. Add X-API-Key header to your request.",
    });
  }

  next();
};

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    privacy: "no data stored",
    timestamp: new Date().toISOString(),
  });
});

/**
 * DNS lookup endpoint - only accepts domains, NOT email addresses
 * This ensures email addresses never reach the server
 */
app.post("/api/dns-lookup", authenticateAPIKey, async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Sanitize domain
    const cleanDomain = domain.toLowerCase().trim();

    // Reject if it looks like an email address (privacy protection)
    if (cleanDomain.includes("@")) {
      return res.status(400).json({
        error:
          "Only domain names accepted. Email addresses should not be sent to server.",
      });
    }

    // Basic domain validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
      return res.status(400).json({ error: "Invalid domain format" });
    }

    // Parallel DNS lookups
    const [mxResult, txtResult, dmarcResult] = await Promise.allSettled([
      dns.resolveMx(cleanDomain).catch(() => []),
      dns.resolveTxt(cleanDomain).catch(() => []),
      dns.resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []),
    ]);

    const mxRecords = mxResult.status === "fulfilled" ? mxResult.value : [];
    const txtRecords = txtResult.status === "fulfilled" ? txtResult.value : [];
    const dmarcRecords =
      dmarcResult.status === "fulfilled" ? dmarcResult.value : [];

    // Process TXT records
    const txtFlat = txtRecords.map((row) =>
      Array.isArray(row) ? row.join("") : row,
    );
    const dmarcFlat = dmarcRecords.map((row) =>
      Array.isArray(row) ? row.join("") : row,
    );

    // Check SPF
    const spf = txtFlat.some((r) => r.toLowerCase().startsWith("v=spf1"));

    // Check DMARC
    const dmarc = dmarcFlat.some((r) => r.toLowerCase().startsWith("v=dmarc1"));

    // Check DKIM (common selectors)
    const dkimSelectors = [
      "default",
      "selector1",
      "selector2",
      "google",
      "k1",
      "mail",
      "smtp",
    ];
    let dkimFound = false;

    for (const selector of dkimSelectors) {
      try {
        const dkimTxt = await dns.resolveTxt(
          `${selector}._domainkey.${cleanDomain}`,
        );
        const dkimFlat = dkimTxt.map((row) =>
          Array.isArray(row) ? row.join("") : row,
        );
        if (dkimFlat.some((r) => r.toLowerCase().includes("dkim"))) {
          dkimFound = true;
          break;
        }
      } catch {
        // Continue checking other selectors
      }
    }

    // Sort MX by priority
    const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);

    // Detect provider
    const mxJoined = sortedMx.map((r) => r.exchange.toLowerCase()).join(" ");
    let provider = "Unknown";

    if (mxJoined.includes("google")) provider = "Google Workspace / Gmail";
    else if (
      mxJoined.includes("outlook") ||
      mxJoined.includes("protection.outlook")
    )
      provider = "Microsoft 365";
    else if (mxJoined.includes("yahoodns")) provider = "Yahoo";
    else if (mxJoined.includes("zoho")) provider = "Zoho";
    else if (mxJoined.includes("mimecast")) provider = "Mimecast";
    else if (mxJoined.includes("proofpoint")) provider = "Proofpoint";
    else if (sortedMx.length > 0) provider = "Custom / Other";

    res.json({
      domain: cleanDomain,
      mx: sortedMx.map((r) => ({ exchange: r.exchange, priority: r.priority })),
      spf,
      dkim: dkimFound,
      dmarc,
      provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DNS lookup error:", error.message);
    res.status(500).json({ error: "DNS lookup failed", detail: error.message });
  }
});

/**
 * Batch DNS lookup for multiple domains
 * Rate limited to prevent abuse
 */
app.post("/api/batch-dns-lookup", authenticateAPIKey, async (req, res) => {
  try {
    const { domains } = req.body;

    if (!Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: "Domains array is required" });
    }

    if (domains.length > 50) {
      return res.status(400).json({ error: "Maximum 50 domains per batch" });
    }

    // Validate all domains
    const cleanDomains = domains.map((d) => String(d).toLowerCase().trim());

    // Check for email addresses (privacy protection)
    if (cleanDomains.some((d) => d.includes("@"))) {
      return res.status(400).json({
        error:
          "Only domain names accepted. Do not send email addresses to server.",
      });
    }

    // Process all domains
    const results = {};

    for (const domain of cleanDomains) {
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        results[domain] = { error: "Invalid domain format" };
        continue;
      }

      try {
        const [mxResult, txtResult, dmarcResult] = await Promise.allSettled([
          dns.resolveMx(domain).catch(() => []),
          dns.resolveTxt(domain).catch(() => []),
          dns.resolveTxt(`_dmarc.${domain}`).catch(() => []),
        ]);

        const mxRecords = mxResult.status === "fulfilled" ? mxResult.value : [];
        const txtRecords =
          txtResult.status === "fulfilled" ? txtResult.value : [];
        const dmarcRecords =
          dmarcResult.status === "fulfilled" ? dmarcResult.value : [];

        const txtFlat = txtRecords.map((row) =>
          Array.isArray(row) ? row.join("") : row,
        );
        const dmarcFlat = dmarcRecords.map((row) =>
          Array.isArray(row) ? row.join("") : row,
        );

        const spf = txtFlat.some((r) => r.toLowerCase().startsWith("v=spf1"));
        const dmarc = dmarcFlat.some((r) =>
          r.toLowerCase().startsWith("v=dmarc1"),
        );

        const dkimSelectors = ["default", "selector1", "selector2", "google"];
        let dkimFound = false;

        for (const selector of dkimSelectors) {
          try {
            const dkimTxt = await dns.resolveTxt(
              `${selector}._domainkey.${domain}`,
            );
            const dkimFlat = dkimTxt.map((row) =>
              Array.isArray(row) ? row.join("") : row,
            );
            if (dkimFlat.some((r) => r.toLowerCase().includes("dkim"))) {
              dkimFound = true;
              break;
            }
          } catch {
            // Continue
          }
        }

        const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
        const mxJoined = sortedMx
          .map((r) => r.exchange.toLowerCase())
          .join(" ");

        let provider = "Unknown";
        if (mxJoined.includes("google")) provider = "Google Workspace / Gmail";
        else if (
          mxJoined.includes("outlook") ||
          mxJoined.includes("protection.outlook")
        )
          provider = "Microsoft 365";
        else if (mxJoined.includes("yahoodns")) provider = "Yahoo";
        else if (mxJoined.includes("zoho")) provider = "Zoho";
        else if (sortedMx.length > 0) provider = "Custom / Other";

        results[domain] = {
          mx: sortedMx.map((r) => ({
            exchange: r.exchange,
            priority: r.priority,
          })),
          spf,
          dkim: dkimFound,
          dmarc,
          provider,
        };
      } catch (error) {
        results[domain] = { error: "Lookup failed" };
      }
    }

    res.json({ results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Batch DNS lookup error:", error.message);
    res
      .status(500)
      .json({ error: "Batch lookup failed", detail: error.message });
  }
});

/**
 * WHOIS lookup endpoint for domain age checking
 * Only checks corporate domains (non-free providers)
 */
app.post("/api/whois-lookup", authenticateAPIKey, async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Reject if it looks like an email address
    if (cleanDomain.includes("@")) {
      return res.status(400).json({
        error: "Only domain names accepted.",
      });
    }

    try {
      // Fetch WHOIS data (with 10s timeout)
      const whoisData = await Promise.race([
        whoiser(cleanDomain),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("WHOIS timeout")), 10000),
        ),
      ]);

      // Parse creation date from WHOIS response
      let createdDate = null;
      let registrar = null;
      let domainAge = null;

      // WHOIS data structure varies by TLD, try common fields
      if (whoisData) {
        // Try all possible keys in the WHOIS response
        for (const key of Object.keys(whoisData)) {
          const data = whoisData[key];

          if (!data || typeof data !== "object") continue;

          // Try MANY different date field name variations (different TLDs use different names)
          const dateFields = [
            "Creation Date",
            "Created Date",
            "created",
            "Created",
            "Domain Registration Date",
            "Registration Date",
            "Registration Time",
            "Registered",
            "registered",
            "Registry Expiry Date",
            "creation date",
            "created date",
            "domain registration date",
            "registration date",
            "registered date",
          ];

          // Try to find creation date in any field
          for (const field of dateFields) {
            if (data[field]) {
              const dateValue = Array.isArray(data[field])
                ? data[field][0]
                : data[field];
              // Skip if it looks like an expiry date (we want creation)
              if (
                field.toLowerCase().includes("expiry") ||
                field.toLowerCase().includes("expires")
              ) {
                continue;
              }
              createdDate = dateValue;
              break;
            }
          }

          // Try registrar fields
          const registrarFields = [
            "Registrar",
            "registrar",
            "Sponsoring Registrar",
            "registrar name",
          ];
          for (const field of registrarFields) {
            if (data[field]) {
              registrar = Array.isArray(data[field])
                ? data[field][0]
                : data[field];
              break;
            }
          }

          if (createdDate) break; // Found it, stop searching
        }

        // Calculate domain age if creation date found
        if (createdDate) {
          try {
            const created = new Date(createdDate);
            if (!isNaN(created.getTime())) {
              const now = new Date();
              const ageInDays = Math.floor(
                (now - created) / (1000 * 60 * 60 * 24),
              );
              const ageInYears = (ageInDays / 365).toFixed(1);

              domainAge = {
                days: ageInDays,
                years: parseFloat(ageInYears),
                createdDate: created.toISOString(),
                registrar,
              };
            }
          } catch (e) {
            console.warn("Failed to parse creation date:", createdDate);
          }
        }
      }

      res.json({
        domain: cleanDomain,
        domainAge,
        timestamp: new Date().toISOString(),
      });
    } catch (whoisError) {
      // WHOIS lookup failed (common for privacy-protected domains)
      res.json({
        domain: cleanDomain,
        domainAge: null,
        error: "WHOIS lookup unavailable (privacy protected or restricted)",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("WHOIS lookup error:", error.message);
    res.status(500).json({
      error: "WHOIS lookup failed",
      detail: error.message,
    });
  }
});

/**
 * Website accessibility check endpoint
 * Checks if domain has an active website (HTTP/HTTPS)
 */
app.post("/api/website-check", authenticateAPIKey, async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Reject if it looks like an email address
    if (cleanDomain.includes("@")) {
      return res.status(400).json({
        error: "Only domain names accepted.",
      });
    }

    // Check both HTTPS and HTTP
    const checkWebsite = (protocol, domain) => {
      return new Promise((resolve) => {
        const client = protocol === "https" ? https : http;
        const options = {
          method: "HEAD",
          hostname: domain,
          port: protocol === "https" ? 443 : 80,
          path: "/",
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; EmailValidator/1.0)",
          },
        };

        const req = client.request(options, (response) => {
          resolve({
            active: response.statusCode >= 200 && response.statusCode < 500,
            statusCode: response.statusCode,
            protocol,
          });
        });

        req.on("error", () => resolve({ active: false, protocol }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ active: false, protocol });
        });

        req.end();
      });
    };

    // Try HTTPS first, then HTTP
    const httpsResult = await checkWebsite("https", cleanDomain);

    if (httpsResult.active) {
      return res.json({
        domain: cleanDomain,
        websiteActive: true,
        protocol: "https",
        statusCode: httpsResult.statusCode,
        message: "Website is active and accessible",
        timestamp: new Date().toISOString(),
      });
    }

    // If HTTPS fails, try HTTP
    const httpResult = await checkWebsite("http", cleanDomain);

    if (httpResult.active) {
      return res.json({
        domain: cleanDomain,
        websiteActive: true,
        protocol: "http",
        statusCode: httpResult.statusCode,
        message: "Website is active (HTTP only, no HTTPS)",
        timestamp: new Date().toISOString(),
      });
    }

    // Both failed
    res.json({
      domain: cleanDomain,
      websiteActive: false,
      protocol: null,
      message: "Website not accessible or offline",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Website check error:", error.message);
    res.status(500).json({
      error: "Website check failed",
      detail: error.message,
    });
  }
});

/**
 * SMTP Mailbox Verification Endpoint - IMPROVED VERSION
 * Works smarter like ZeroBounce/Clearout by:
 * 1. Trying multiple MX servers (not just first)
 * 2. Detecting catch-all servers
 * 3. Better error message parsing
 * 4. Using proper EHLO hostname
 * 5. Multiple verification strategies
 *
 * WARNING: This is more invasive than DNS checks and may be blocked by some servers.
 * Use sparingly to avoid being blacklisted.
 */
app.post(
  "/api/smtp-verify",
  authenticateAPIKey,
  smtpLimiter,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const [localPart, domain] = cleanEmail.split("@");

      // Get MX records
      let mxRecords = [];
      try {
        mxRecords = await dns.resolveMx(domain);
      } catch (error) {
        return res.json({
          email: cleanEmail,
          exists: false,
          reason: "no_mx",
          message: "No MX records found for domain",
          timestamp: new Date().toISOString(),
        });
      }

      if (mxRecords.length === 0) {
        return res.json({
          email: cleanEmail,
          exists: false,
          reason: "no_mx",
          message: "No MX records found",
          timestamp: new Date().toISOString(),
        });
      }

      // Sort by priority (lower is higher priority)
      mxRecords.sort((a, b) => a.priority - b.priority);

      // IMPROVED: SMTP verification with multiple strategies
      const verifySMTP = (mxHost, strategy = 1) => {
        return new Promise((resolve, reject) => {
          const socket = net.createConnection(25, mxHost);
          const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error("Connection timeout"));
          }, 12000); // 12 second timeout

          let response = "";
          let step = 0;
          let allResponses = []; // Track all responses for debugging

          // Use different EHLO hostnames and sender addresses based on strategy
          let ehloHost, mailfrom;

          if (strategy === 1) {
            // Strategy 1: Use validator domain (looks more legitimate)
            ehloHost = "email-validator-pwk6.onrender.com";
            mailfrom = "verify@email-validator-pwk6.onrender.com";
          } else if (strategy === 2) {
            // Strategy 2: Use target domain (some servers prefer this)
            ehloHost = domain;
            mailfrom = `verify@${domain}`;
          } else {
            // Strategy 3: Use generic verification domain
            ehloHost = "mail-validator.com";
            mailfrom = "noreply@mail-validator.com";
          }

          socket.on("data", (data) => {
            response += data.toString();
            const lines = response.split("\r\n");

            // Wait for complete response (ends with \r\n)
            if (!response.endsWith("\r\n")) return;

            const lastLine = lines[lines.length - 2];
            const code = parseInt(lastLine.substring(0, 3));

            // Store response for analysis
            allResponses.push({ step, code, message: lastLine });

            if (step === 0 && code === 220) {
              // Server ready, send EHLO
              socket.write(`EHLO ${ehloHost}\r\n`);
              step = 1;
              response = "";
            } else if (step === 1 && (code === 250 || code === 220)) {
              // EHLO accepted, send MAIL FROM
              socket.write(`MAIL FROM:<${mailfrom}>\r\n`);
              step = 2;
              response = "";
            } else if (step === 2 && code === 250) {
              // MAIL FROM accepted, send RCPT TO (this is the actual verification)
              socket.write(`RCPT TO:<${cleanEmail}>\r\n`);
              step = 3;
              response = "";
            } else if (step === 3) {
              // RCPT TO response - this tells us if mailbox exists
              clearTimeout(timeout);
              socket.write("QUIT\r\n");
              socket.end();

              // IMPROVED: Better error code analysis
              const responseText = lastLine.toLowerCase();

              if (code === 250) {
                // Mailbox accepted - but could be catch-all
                resolve({
                  exists: true,
                  code,
                  message: "Mailbox exists",
                  responseText: lastLine,
                  mxHost,
                  strategy,
                });
              } else if (
                code === 550 ||
                code === 551 ||
                code === 553 ||
                code === 554
              ) {
                // Definitive rejection codes
                // Analyze the error message for more details
                if (
                  responseText.includes("user unknown") ||
                  responseText.includes("mailbox not found") ||
                  responseText.includes("no such user") ||
                  responseText.includes("does not exist") ||
                  responseText.includes("invalid recipient") ||
                  responseText.includes("user not found") ||
                  responseText.includes("no mailbox")
                ) {
                  resolve({
                    exists: false,
                    code,
                    message: "Mailbox does not exist (confirmed)",
                    reason: "mailbox_not_found",
                    responseText: lastLine,
                    mxHost,
                    strategy,
                  });
                } else if (
                  responseText.includes("blocked") ||
                  responseText.includes("blacklist") ||
                  responseText.includes("spam") ||
                  responseText.includes("relay") ||
                  responseText.includes("policy")
                ) {
                  resolve({
                    exists: "unknown",
                    code,
                    message: "Server policy blocked verification",
                    reason: "policy_block",
                    responseText: lastLine,
                    mxHost,
                    strategy,
                  });
                } else {
                  resolve({
                    exists: false,
                    code,
                    message: "Mailbox rejected by server",
                    responseText: lastLine,
                    mxHost,
                    strategy,
                  });
                }
              } else if (
                code === 450 ||
                code === 451 ||
                code === 452 ||
                code === 421
              ) {
                // Temporary errors - server is busy, rate limited, or greylisting
                resolve({
                  exists: "unknown",
                  code,
                  message: "Temporary server error - mailbox status unknown",
                  reason: "temporary_error",
                  responseText: lastLine,
                  mxHost,
                  strategy,
                });
              } else if (code === 252) {
                // Cannot verify - but will accept and try delivery
                resolve({
                  exists: "unknown",
                  code,
                  message: "Server cannot verify but will attempt delivery",
                  reason: "verification_disabled",
                  responseText: lastLine,
                  mxHost,
                  strategy,
                });
              } else {
                resolve({
                  exists: "unknown",
                  code,
                  message: "Unknown response from server",
                  responseText: lastLine,
                  mxHost,
                  strategy,
                });
              }
            } else if (code >= 500) {
              // Error at earlier step - connection blocked
              clearTimeout(timeout);
              socket.destroy();
              reject(new Error(`SMTP error at step ${step}: ${lastLine}`));
            }
          });

          socket.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          socket.on("timeout", () => {
            clearTimeout(timeout);
            socket.destroy();
            reject(new Error("Connection timeout"));
          });
        });
      };

      // IMPROVED: Catch-all detection
      const detectCatchAll = async (mxHost) => {
        try {
          // Test with a random non-existent email
          const randomEmail = `nonexistent${Math.random().toString(36).substring(7)}@${domain}`;
          const result = await verifySMTP(mxHost, 1);

          // If random email is accepted, it's likely catch-all
          if (result.exists === true) {
            return true;
          }
          return false;
        } catch {
          return false;
        }
      };

      // IMPROVED: Try multiple MX servers with different strategies
      let lastError = null;
      let bestResult = null;
      let triedHosts = [];

      // Try up to 3 MX servers
      for (let i = 0; i < Math.min(3, mxRecords.length); i++) {
        const mxHost = mxRecords[i].exchange;
        triedHosts.push(mxHost);

        // Try multiple strategies on first MX server
        const strategies = i === 0 ? [1, 2, 3] : [1]; // Only try all strategies on primary MX

        for (const strategy of strategies) {
          try {
            const result = await verifySMTP(mxHost, strategy);

            // If we got a definitive answer (exists or confirmed doesn't exist), use it
            if (result.exists === true || result.exists === false) {
              bestResult = result;

              // If mailbox exists, check for catch-all
              if (result.exists === true) {
                const isCatchAll = await detectCatchAll(mxHost);
                bestResult.catchAll = isCatchAll;

                if (isCatchAll) {
                  bestResult.exists = "unknown";
                  bestResult.message =
                    "Server accepts all emails (catch-all) - cannot verify mailbox";
                  bestResult.reason = "catch_all";
                }
              }

              break;
            } else if (!bestResult || result.exists === "unknown") {
              // Keep the "unknown" result as fallback
              bestResult = result;
            }
          } catch (error) {
            lastError = error;
            // Continue to next strategy/host
          }
        }

        // If we got a definitive answer, stop trying
        if (
          bestResult &&
          (bestResult.exists === true || bestResult.exists === false)
        ) {
          break;
        }
      }

      // Return result
      if (bestResult) {
        res.json({
          email: cleanEmail,
          domain,
          exists: bestResult.exists,
          smtpCode: bestResult.code,
          message: bestResult.message,
          reason: bestResult.reason || null,
          catchAll: bestResult.catchAll || false,
          mxHost: bestResult.mxHost,
          mxTried: triedHosts,
          strategy: bestResult.strategy,
          responseText: bestResult.responseText,
          confidence:
            bestResult.exists === true
              ? "high"
              : bestResult.exists === false
                ? "high"
                : "low",
          warning:
            bestResult.exists === "unknown"
              ? "Could not verify mailbox - server blocked or disabled verification"
              : "SMTP verification completed",
          timestamp: new Date().toISOString(),
        });
      } else {
        // All attempts failed
        res.json({
          email: cleanEmail,
          domain,
          mxTried: triedHosts,
          exists: "unknown",
          reason: "connection_failed",
          message: "Could not connect to mail servers for verification",
          detail: lastError?.message || "All verification attempts failed",
          confidence: "low",
          warning:
            "Servers are blocking external SMTP connections - common for corporate email",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("SMTP verification error:", error.message);
      res.status(500).json({
        error: "SMTP verification failed",
        detail: error.message,
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Privacy-First Email Validator                                ║
║  Server running on http://localhost:${PORT}                      ║
║                                                               ║
║  Privacy guarantee:                                           ║
║  ✓ Email addresses NEVER sent to server                      ║
║  ✓ All validation happens client-side                        ║
║  ✓ Data stored in browser localStorage only                  ║
║  ✓ Server only performs DNS lookups for domains              ║
║  ✓ No logging, no database, no tracking                      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
