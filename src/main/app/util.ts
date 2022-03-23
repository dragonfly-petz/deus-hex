export function isDev() {
  return (
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  );
}

export function isTest() {
  return process.env.NODE_ENV === 'test';
}

export function isDevOrTest() {
  return isDev() || isTest();
}
