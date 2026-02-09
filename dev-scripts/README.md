# Development Scripts

This folder contains development-only scripts that should **NOT** be used in production.

## Scripts

### setup-db.ts
Initializes the database with test data and hashed passwords.

**Usage:**
```bash
cd dev-scripts
ts-node setup-db.ts
```

**Warning:** This script will delete all existing data. Use only in development.

### test-login-flow.ts
Tests the authentication login flow with test credentials.

**Usage:**
```bash
cd dev-scripts
ts-node test-login-flow.ts
```

### test-auth.ts
Tests authentication functionality.

**Usage:**
```bash
cd dev-scripts
ts-node test-auth.ts
```

### check-password.ts
Verifies password hashing and comparison.

**Usage:**
```bash
cd dev-scripts
ts-node check-password.ts
```

## Important Notes

- These scripts are excluded from production builds
- They require a local development database
- Never run these scripts against production databases
- All scripts use test credentials and should not be modified for production use
