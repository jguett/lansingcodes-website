// Ignore harmless separators while retaining symbols that change a title's meaning.
export function simplifiedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+#]/g, '')
}

export function sameCommunityEvent(
  first: { name: string; startTime: number },
  second: { name: string; startTime: number },
): boolean {
  return first.startTime === second.startTime &&
    simplifiedName(first.name) === simplifiedName(second.name)
}
