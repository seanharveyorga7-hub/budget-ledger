// Node ESM needs file extensions; Vite does not. This lets the emulator test
// import the app's real services (which use extensionless imports).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' && (specifier.startsWith('.') || specifier.startsWith('/'))) {
      return next(`${specifier}.js`, context);
    }
    throw err;
  }
}
