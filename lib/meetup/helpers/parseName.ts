export function parseName(name: string): string {
  return name.replace(/\\([\\,;nN])/g, (_, escaped: string) =>
    escaped === 'n' || escaped === 'N' ? '\n' : escaped,
  )
}
