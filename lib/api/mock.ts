// mock.ts — kept for compatibility but no longer used
// All data now comes from the backend API (real or DB mock via admin panel)
// Set NEXT_PUBLIC_USE_MOCK=false in .env (already done)
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
