// Re-export from root lib/server so that @/lib/server resolves correctly
// tsconfig maps @/* to ["./src/*", "./*"] — src/lib/server (this file) takes
// priority, so we delegate to the canonical root-level implementation.
export { createClient } from '../../lib/server'
