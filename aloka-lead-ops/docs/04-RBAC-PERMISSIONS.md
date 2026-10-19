# RBAC and permissions

Roles come only from the `staff` table after JWT verification.

| Capability | Admin | Manager | Sales | Viewer |
|---|---:|---:|---:|---:|
| Read all leads | Yes | Yes | No | Yes |
| Read assigned leads | Yes | Yes | Yes | Yes |
| Change stage/qualification | Yes | Yes | Own only | No |
| Add activities/follow-ups/visits | Yes | Yes | Own only | No |
| Assign or reassign owner | Yes | Yes | No | No |
| Use approved WhatsApp actions | Yes | Yes | Own only | No |
| List staff | Yes | Yes | No | No |

Sales ownership is enforced inside SQL predicates, not only in the UI. An inaccessible lead returns 404 to avoid confirming its existence. Disabled users fail authentication even with an otherwise valid session.

## Provisioning

Provision the initial administrator and Priya accounts with `npm run staff:provision`. Administrators create additional individual accounts from **Staff & access**. No shared sales accounts are allowed.

```sql
INSERT INTO staff(id, name, role)
VALUES ('SUPABASE-AUTH-UUID', 'Team Member', 'sales');
```

Reassignment accepts only an active staff member with role `sales`. Every reassignment must create an audit event.

## Sensitive documents

The schema supports `INTERNAL`, `SENSITIVE`, and `HIGHLY_SENSITIVE`. Binary upload/download authorization is planned and must apply separate access checks before KYC is enabled.
