export type ItemWithId = {
  id: string;
};

export function prependUniqueById<T extends ItemWithId>(items: T[], item: T) {
  return [item, ...items.filter((current) => current.id !== item.id)];
}

export function appendUniqueById<T extends ItemWithId>(items: T[], item: T) {
  return [...items.filter((current) => current.id !== item.id), item];
}

export function replaceById<T extends ItemWithId>(items: T[], item: T) {
  return items.map((current) => {
    if (current.id === item.id) {
      return item;
    }

    return current;
  });
}

export function patchById<T extends ItemWithId>(
  items: T[],
  id: string,
  patch: Partial<T>,
) {
  return items.map((current) => {
    if (current.id === id) {
      return {
        ...current,
        ...patch,
      };
    }

    return current;
  });
}

export function removeById<T extends ItemWithId>(items: T[], id: string) {
  return items.filter((current) => current.id !== id);
}
