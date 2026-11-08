/** the mix's iframe srcs, or null unless both params name a registered virus, so ../../foo can't load another same-origin page */
export function mixSources(
  params: URLSearchParams,
  viruses: readonly string[]
): [string, string] | null {
  const primary = params.get('primary');
  const secondary = params.get('secondary');
  if (
    !primary ||
    !secondary ||
    !viruses.includes(primary) ||
    !viruses.includes(secondary)
  ) {
    return null;
  }
  return [`/viruses/${primary}/`, `/viruses/${secondary}/`];
}
