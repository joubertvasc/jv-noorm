export function RemoveInvalidChars(search: string): string {
  return search ? search.trim().replace(/['"%*?&']/g, '') : '';
}
