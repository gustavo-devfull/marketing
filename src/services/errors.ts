export class PermissionError extends Error {
  constructor(message = 'Permissão negada pelo banco (RLS).') {
    super(message)
    this.name = 'PermissionError'
  }
}

interface SbError {
  code?: string
  message?: string
  statusCode?: string | number
}

export function handle(error: SbError | null): void {
  if (!error) return
  const msg = error.message ?? ''
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    String(error.statusCode ?? '') === '403' ||
    /row-level security|permission denied|jwt|unauthorized/i.test(msg)
  ) {
    throw new PermissionError(msg)
  }
  throw new Error(msg || 'Erro desconhecido do Supabase')
}
