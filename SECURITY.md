# Security Policy

## Supported Versions

DeveloperOS projects strictly follow semantic versioning. Critical security patches are actively provided for current production releases.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Zero-Storage & Ephemeral Privacy Architecture

All DeveloperOS tools operate under a **Client-Side In-Memory Privacy Contract**:
- Zero server telemetry, analytics, or user logging.
- User input payloads are processed strictly within the active browser/runtime session and discarded immediately upon page refresh.
- Defensive limits against ReDoS (regular expression denial of service), XXE (XML external entity injection), and unbounded memory allocation are enforced across all parsers.

---

## Reporting a Vulnerability

We take the security of DeveloperOS applications and user data seriously. If you discover a security vulnerability or exploit:

1. **Do NOT open a public GitHub issue.**
2. Send an email to the DeveloperOS Security Team at:
   **`security@developeros.in`**
3. Include:
   - Specific tool or repository affected
   - Step-by-step reproduction instructions or proof-of-concept
   - Potential impact evaluation

### Response Timeline
- **Initial acknowledgment**: Within 48 hours.
- **Triage & validation**: Within 5 business days.
- **Remediation & public advisory**: Within 14 days of confirmed validation.

We appreciate the responsible disclosure of vulnerabilities by the developer community.
