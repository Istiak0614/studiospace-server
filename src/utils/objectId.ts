import { ObjectId } from "mongodb";

export const toObjectId = (id: string): ObjectId | null =>
  ObjectId.isValid(id) ? new ObjectId(id) : null;