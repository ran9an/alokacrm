# UI/UX specification

The interface is desktop-first, responsive and operationally dense. [`../../DESIGN.md`](../../DESIGN.md) is the visual source of truth.

## Visual system

- General Sans headings, DM Sans interface text and JetBrains Mono labels.
- Aloka navy/cyan identity with indigo interactive states.
- Real Aloka logo from `apps/web/public/brand/aloka-logo.png`.
- Project overview visual at `apps/web/public/brand/green-county-aerial.png`.
- Phosphor icons only; icons supplement text and never replace important labels.
- 6 px controls, 12–16 px major surfaces, restrained tinted shadows.

## Required states

Every data surface must support loading, empty, error and permission-denied behavior. Destructive/material actions require confirmation. Keyboard focus must remain visible. Tables scroll horizontally on small screens; essential identity and action columns remain understandable.

## Current navigation

Dashboard and Leads are implemented. Follow-ups and Site Visits are operated through the lead detail drawer. Inventory, Quotations and Bookings are visible but disabled because their domain workflows are not implemented.

## Language

Use sentence case and direct operational labels. Person-facing messages use a valid name or `Sir/Madam`; never generic greetings such as Client or Buyer. Internal entity labels may use “lead” where it describes the CRM record.

## Preview

`/preview` is development-only and uses obviously fake records. It must never claim that live delivery or persistence occurred.
