export type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;
