/**
 * Chuyển dữ liệu từ MongoDB/Mongoose thành plain object để truyền từ Server Component xuống Client Component.
 * Next.js chỉ cho phép plain objects (không có toJSON, Buffer, v.v.) qua boundary Server -> Client.
 * Dùng JSON.parse(JSON.stringify(...)) để ép mọi _id (ObjectId/Buffer) và giá trị đặc biệt thành plain.
 */
export function serializeForClient<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data)) as T;
  } catch {
    return data;
  }
}
