# 🔑 API Keys Setup Guide

This document explains where to safely place your API keys for Paystack (payments) and Resend (email receipts).

---

## 1. Frontend Environment Variables (`.env`)
These keys are used by the browser. **Never put secret keys here.**

**File:** `.env` (in the project root)

```env
# Public key shown on Paystack checkout popup
VITE_PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 2. Paystack Webhook Configuration
Log in to your [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) and add the following URL under **Webhook URL**:

**Webhook URL:** `https://ltmcbjlllcjtthbnwlkw.supabase.co/functions/v1/paystack-webhook`

> [!NOTE]
> Our webhook is secure and uses HMAC SHA512 signature verification to ensure only Paystack can trigger it.

---

## 3. Paystack Callback URL Configuration
The Callback URL is used to redirect the user back to your app after a successful payment.

**Location:** [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) → **Callback URL**

| Environment | URL |
| :--- | :--- |
| **Production** | `https://your-production-domain.com/payment/callback` |
| **Local Testing** | `http://localhost:5173/payment/callback` |

> [!TIP]
| Use your **Production** URL for the final deployment. If you are testing locally, you can temporarily set it to `localhost:5173`.

---

## 4. Supabase Edge Function Secrets
These keys are used server-side by Supabase and are **never** visible to the user.

**Location:** [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Edge Functions** → **Manage Secrets**

Add the following three secrets:

| Secret Name | Value | Source |
| :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | `sk_test_xxxxxx...` | [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) |
| `RESEND_API_KEY` | `re_xxxxxx...` | [Resend Dashboard](https://resend.com/api-keys) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | [Project Settings](https://supabase.com/dashboard/project/_/settings/api) |

> [!IMPORTANT]
> - `PAYSTACK_SECRET_KEY` is required to verify payments and initialize checkouts.
> - `RESEND_API_KEY` is required to send the professional email receipts.
> - As soon as you save these secrets, the functions will start using them automatically. No redeployment is needed.

---

## 3. Verifying the Setup
1. **Paystack:** Try a test booking. If the popup opens, your `VITE_PAYSTACK_PUBLIC_KEY` is correct.
2. **Email:** Check the **Edge Function Logs** in Supabase if emails aren't arriving. Common issues include unverified "From" domains in Resend.
