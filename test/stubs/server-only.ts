// Stub for the `server-only` package so server modules can be imported in unit
// tests. In the real app this import guards against shipping server code to the
// browser; under Vitest (plain Node) it's a harmless no-op.
export {};
