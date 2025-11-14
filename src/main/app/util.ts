export function isDev() {
  return (
    // this works in dom because of variable replacement I think
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  );
}

export function isTest() {
  return process.env.NODE_ENV === 'test';
}

export function isDevOrTest() {
  return isDev() || isTest();
}
interface Features {
  showFixDuplicatesButton: boolean;
}
export function getFeatures(): Features {
  return {
    showFixDuplicatesButton: isDev(),
  };
}
