# Admin Panel Documentation

## Overview

The CannaConvert Admin Panel is an enterprise-grade administrative interface for managing users, jobs, credits, refunds, and system configuration. It provides real-time monitoring, analytics, and complete audit logging.

## Access

### URL
- Development: `http://localhost:3000/admin`
- Production: `https://your-domain.com/admin`

### Authentication

The admin panel uses a separate authentication system from regular users:

1. **Environment Variable Authentication**: Set `ADMIN_PASSWORD` in `.env`
2. **Database Role Authentication**: Users with `role = ADMIN` or `role = SUPER_ADMIN`

```env
ADMIN_PASSWORD=your-secure-admin-password
```

### Session Management

- Admin sessions are stored in the `AdminSession` table
- Sessions expire after 24 hours of inactivity
- All admin actions are logged to the `AuditLog` table

## Features

### A. Dashboard (`/admin`)

The main dashboard provides:

- **Stats Cards**: Total users, jobs, revenue, and alerts
- **Conversion Charts**: Last 7 days with completed/failed breakdown
- **Job Distribution**: Pie chart showing status distribution
- **Revenue Chart**: Last 30 days bar chart
- **Recent Jobs**: Quick view of latest jobs
- **Recent Alerts**: Quick view of active alerts

### B. User Management (`/admin/users`)

Full CRUD operations for users:

- **List Users**: Paginated list with search and filters
- **Search**: By email or name
- **Filter**: By role (USER, ADMIN, SUPER_ADMIN) and status (ACTIVE, SUSPENDED, BANNED)
- **Actions**:
  - Adjust credits (add/remove)
  - Reset password
  - Suspend/Unsuspend
  - Ban/Unban

### C. Job Management (`/admin/jobs`)

Monitor and manage conversion jobs:

- **List Jobs**: Paginated with filters
- **Filter**: By status and converter type
- **Actions**:
  - View details
  - Reprocess failed jobs
  - Force fail stuck jobs
  - Download results

### D. Credits Management (`/admin/credits`)

Track all credit transactions:

- **Stats**: Total credits sold, used, refunded
- **Transaction List**: All transactions with filters
- **Filter**: By type (PURCHASE, USAGE, REFUND, ADJUSTMENT, BONUS)
- **Manual Credits**: Add/remove credits with notes
- **Export CSV**: Download transaction history

### E. Refunds (`/admin/refunds`)

Handle refund requests:

- **Stats**: Pending, approved, rejected counts
- **Request List**: All refund requests
- **Actions**:
  - Approve (returns credits to user)
  - Reject (with notes)
- **Auto-Refund**: Configurable in settings

### F. Alerts (`/admin/alerts`)

Monitor system alerts from AlertManager:

- **Severity Levels**: Critical, High, Medium, Low
- **Filter**: By severity, service, status
- **View Details**: Full alert information
- **Resolve Alerts**: Mark as resolved

### G. Monitoring (`/admin/monitoring`)

Real-time system health:

- **Service Status**: Prometheus, Redis, Queue, MPP Converter
- **Memory Usage**: Current and peak usage
- **Redis Stats**: Connections, commands, ops/sec
- **Queue Stats**: Active, waiting, completed, failed jobs
- **Application Metrics**: HTTP requests, response times

### H. Audit Logs (`/admin/audit-logs`)

Complete audit trail:

- **All Admin Actions**: Login, logout, updates, etc.
- **Filter**: By action type, entity, admin
- **Details**: Old/new values, IP address, metadata

### I. Settings (`/admin/settings`)

System configuration:

- **Flags**:
  - Maintenance Mode
  - Auto Refund
  - Stripe Payments
  - Email/Slack Alerts
- **Limits**:
  - Max File Size (MB)
  - Max Queue Size
- **Converter Costs**: Credits per conversion type
- **Test Alerts**: Send test notifications

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| POST | `/api/admin/auth/logout` | Admin logout |
| GET | `/api/admin/auth/me` | Get current admin |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard/stats` | Dashboard statistics |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/users/[id]` | Get user details |
| PUT | `/api/admin/users/[id]` | Update user |
| DELETE | `/api/admin/users/[id]` | Delete user |
| POST | `/api/admin/users/[id]/actions` | User actions |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/jobs` | List jobs |
| GET | `/api/admin/jobs/[id]` | Get job details |
| PUT | `/api/admin/jobs/[id]` | Reprocess/force-fail |
| DELETE | `/api/admin/jobs/[id]` | Delete job |

### Credits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/credits` | List transactions |
| POST | `/api/admin/credits` | Manual credit adjustment |

### Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/refund-requests` | List refund requests |
| GET | `/api/admin/refund-requests/[id]` | Get request details |
| PUT | `/api/admin/refund-requests/[id]` | Approve/reject |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/config` | Get system config |
| PUT | `/api/admin/config` | Update config |
| GET | `/api/admin/config/converters` | Get converter costs |
| PUT | `/api/admin/config/converters` | Update costs |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/monitoring` | System metrics |
| GET | `/api/admin/audit-logs` | Audit log list |

## Database Schema

### AuditLog

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  adminId     String
  adminEmail  String
  action      String   // LOGIN, USER_UPDATE, etc.
  entityType  String?  // User, Job, etc.
  entityId    String?
  oldValue    String?  // JSON
  newValue    String?  // JSON
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

### AdminSession

```prisma
model AdminSession {
  id           String   @id @default(cuid())
  token        String   @unique
  adminId      String
  adminEmail   String
  role         String
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  lastActiveAt DateTime @default(now())
  createdAt    DateTime @default(now())
  isValid      Boolean  @default(true)
}
```

### SystemConfig

```prisma
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  category    String?
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Security

### Best Practices

1. **Strong Passwords**: Use complex admin passwords
2. **IP Restrictions**: Consider firewall rules for admin routes
3. **Regular Audits**: Review audit logs regularly
4. **Session Cleanup**: Old sessions are automatically invalidated
5. **HTTPS Only**: Always use HTTPS in production

### Audit Actions

All of these actions are logged:

- `LOGIN` / `LOGOUT`
- `USER_CREATE` / `USER_UPDATE` / `USER_DELETE`
- `USER_SUSPEND` / `USER_UNSUSPEND` / `USER_BAN` / `USER_UNBAN`
- `CREDIT_ADJUST`
- `JOB_REPROCESS` / `JOB_FORCE_FAIL`
- `REFUND_APPROVE` / `REFUND_REJECT`
- `CONFIG_UPDATE`

## Troubleshooting

### Cannot Login

1. Check `ADMIN_PASSWORD` environment variable
2. Verify user has `ADMIN` or `SUPER_ADMIN` role
3. Check for expired session

### Metrics Not Loading

1. Verify Prometheus is running on port 9090
2. Check Redis connection
3. Verify MPP converter is healthy

### Actions Not Working

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check audit logs for error details

## Development

### Local Setup

```bash
cd frontend
npm install
npx prisma migrate dev
npm run dev
```

### Running Tests

```bash
# E2E Tests
npm run test:e2e

# Unit Tests
npm run test:unit
```

### Adding New Admin Features

1. Add API route in `/app/api/admin/`
2. Use `getCurrentAdmin()` for authentication
3. Use `logAdminAction()` for audit logging
4. Add UI page in `/app/admin/`
5. Update navigation in `layout.tsx`
