declare global {
  namespace Express {
    interface Request {
      /** Present after JWT auth when {@link TenantContextInterceptor} runs. */
      tenantContext?: { tenantId: string };
    }
  }
}

export {};
