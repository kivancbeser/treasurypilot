# Architecture and review notes

## Current system

Browser UI → pure treasury functions → browser-local JSON storage.

The Node server serves a fixed list of static files. It has no database, wallet connection, signing keys, or payment endpoint. The same HTML, CSS, and ES modules can be hosted by a static host.

## Accounting model

Amounts are safe integer cents of simulated USD. Each deposit is allocated by whole percentage weights summing to 100. Largest-remainder allocation preserves the entire deposit, with stable budget-order tie breaking. Existing balances do not move when a policy changes.

For each budget:

`available = balance - sum(pending requests)`

At workspace level:

`income = sum(budget balances) + sum(approved payment amounts)`

An approval reduces the relevant balance. Rejection or requester cancellation releases the reservation without reducing the balance. Finalized requests cannot be reviewed again. Approval is a simulated accounting action, not a transaction confirmation.

## Trust boundaries

- Role selection demonstrates two-person workflow only. Anyone with the page can switch roles.
- Stored data is checked for schema, duplicate IDs, valid statuses, budget reservations, and aggregate accounting consistency on load. This detects malformed data, not malicious rewriting of consistent history.
- The browser renders user input as text, not HTML. CSV fields are quoted and leading formula prefixes are neutralized.
- Wallet validation checks hexadecimal format and rejects the zero address. It does not verify checksum, ownership, network, or whether a recipient can receive a token.
- Example workspace entries are fictional and must never be represented as product traction.
- No production contract, independent audit, revenue integration, or platform affiliation exists.

## Next architecture milestone

Authenticated users and explicit workspace memberships → authorized backend mutation API → durable transaction storage → reviewed testnet vault adapter. Authorization must be enforced server-side and ultimately by the relevant signing/contract rules. Browser identity labels must never be used to authorize real transfers.

Before real funds: document custody and admin powers, choose exact token/network configurations, model token-transfer failure cases and replay protection, and obtain independent security review.


## Authenticated local beta (v0.2)

`/beta` → session-authenticated JSON API → role checks → serialized mutation → validated JSON file replaced atomically by rename.

Passwords are salted and hashed with Node scrypt. Session cookies are HttpOnly and SameSite=Strict; hashed session tokens and CSRF tokens live in server memory. Mutations require the session CSRF token, JSON content type, and a same-origin check when Origin is present. Login attempts are limited per socket IP. Sessions expire after eight hours and disappear on restart. The cookie is deliberately not Secure because this beta is loopback HTTP; this is not a production deployment configuration.

One workspace is shared by all provisioned accounts. Admin can record simulated income, edit policy, request, and review; requester can request and cancel their own requests; reviewer can review. Server-side session identity supplies requester/reviewer fields. Admin self-approval is forbidden. There are no public registration or invitation endpoints.

Mutations in one process are serialized so concurrent requests cannot reserve the same remaining budget twice. Atomic file replacement prevents partial JSON writes. This is not a multi-process database or an immutable audit ledger. Provision users only while the server is stopped. Host filesystem access remains an administrative trust boundary. Role labels do not authorize any onchain transaction.

HTTP integration coverage includes unauthenticated access, invalid credentials, role denial, CSRF and origin denial, requester spoofing, concurrent reservations, cancellation ownership, self-approval, duplicate review, restart persistence and logout invalidation.
