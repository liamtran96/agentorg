# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security@agentorg.dev with details
3. We will acknowledge within 48 hours
4. We will provide a fix timeline within 7 days

## Security Model

AgentOrg treats all agents as untrusted processes:

- Agents run in sandboxed containers with zero access to secrets
- The orchestrator proxies all external calls on agents' behalf
- PII is redacted before sending to LLM APIs
- Every outbound message passes through safety checks
- All actions are audit-logged

See the [Architecture docs](docs/architecture.md) for details.
