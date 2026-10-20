# Accounts and family books

Web release: Google OAuth, mandatory app display name, server-backed personal books,
family membership, author-based editing and an immutable server audit trail.
Apple web OAuth and native iOS sign-in/linking are prepared in source. The live
Apple provider remains disabled until Apple Developer configuration is completed.
App Store submission and real-device Apple authentication are not yet validated.

## Database upgrade

Existing installations: run `supabase/accounts-and-families.sql` **once**, after
`schema.sql` and `custom-categories.sql`. It intentionally deletes every existing
transaction, as authorized for this upgrade. It preserves existing household IDs,
owners, memberships, categories and budgets. It is not an idempotent setup script.
Do not re-run it on a database that already completed the upgrade.

The old two-argument save RPC is removed so stale browser clients cannot write an
unattributed ledger back. The new RPC requires the current book ID and
`p_client_epoch = accounts-v2`. Browser-only storage uses a new key; the old key is
removed when the upgraded app loads. Offline devices are cleared on next app load.

Each account owns one book. Creating a family shares that book. Joining a different
family changes the active book but preserves the member's original personal book.
Leaving, removal or disbanding restores the corresponding personal book. Disbanding
preserves the owner's full ledger and audit history and invalidates its invitation.

Creator IDs are stamped server-side and stored in a private author registry;
editable `member` names never grant permission. Members may change their own
entries; the owner may change all entries and shared categories/budgets. Deleted
entries retain author ownership if later restored from backup. Audit records keep
before/after values and the actor's name at the time of the action.

## Google provider setup

Create a Web OAuth client in Google Auth Platform. Configure:

- Origin: `https://nep-nha-thu-chi.lunargem512.chatgpt.site`
- Redirect URI: `https://pcdbnvnjpvnrgzlazftw.supabase.co/auth/v1/callback`
- Scopes: `openid`, email, profile only.
- Add test users while the OAuth application is in Testing.

Enter the client ID/secret **only in Supabase Authentication provider settings**.
Enable Google, and allow the app return URL ending `/settings` in Auth URL settings.
The browser client uses PKCE and automatically exchanges the callback code.
No client secret belongs in the source or public environment variables.

Keep the existing owner's account. Supabase automatically links a matching verified
Google email. Linking a different Google identity while signed in uses `linkIdentity`
and requires manual linking enabled in Supabase Auth settings. Do not silently
replace an existing account with a newly created one.

## Privacy and AI

Google login does not require a user's ChatGPT login or API key. AI calls use the
existing server secret and per-user quota. First use requires explicit consent to
send the specified request text/metadata to OpenAI. Consent is stored on the server
and checked before paid requests. Revocation is available in account settings.
Guests remain local-only and cannot call AI or join a family.

Account deletion revokes sessions, removes the personal book and anonymizes the
author ID/name in other shared books' history. Shared financial records remain
with their book owner. A family owner must first disband the family before deleting
their account. The in-app privacy page describes this retention; store-facing
privacy/contact information and native permission declarations still need to be
completed before an App Store submission.

## Validation

`npm test` includes a real Postgres-compatible PGlite upgrade test for the reset,
personal books, forged authorship, cross-user edits/deletion, revision conflicts,
family membership, invitation rotation, audit history and deletion. AI endpoint
tests mock the provider and assert consent prevents requests/quota use.
Google end-to-end validation requires the real configured provider and a user login.
