declare global {
  namespace Express {
    interface Request {
      /** Present after JWT auth when {@link TenantContextInterceptor} runs. */
      tenantContext?: { tenantId: string };
      /** Host value resolved from x-forwarded-host/host. */
      requestHost?: string | null;
      /** Tenant subdomain parsed from request host (excluding reserved hosts like app/www). */
      requestSubdomain?: string | null;
    }
  }
}

export {};
