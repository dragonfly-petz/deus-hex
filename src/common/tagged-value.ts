export interface TaggedValue<Tag extends string, Value> {
  tag: Tag;
  value: Value;
}

export function taggedValue<Tag extends string, Value>(
  tag: Tag,
  value: Value
): TaggedValue<Tag, Value> {
  return { tag, value };
}
