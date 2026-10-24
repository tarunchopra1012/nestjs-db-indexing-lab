import { BadRequestException } from '@nestjs/common';

export interface OrderCursor {
  createdAt: Date;
  id: string;
}

// Opaque to clients, so they can't hand-craft a broken cursor and we can change the shape later
export function encodeOrderCursor({ createdAt, id }: OrderCursor): string {
  return Buffer.from(
    JSON.stringify({ c: createdAt.toISOString(), i: id }),
  ).toString('base64url');
}

export function decodeOrderCursor(cursor: string): OrderCursor {
  try {
    const { c, i } = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    const createdAt = new Date(c);
    if (Number.isNaN(createdAt.getTime()) || !/^\d+$/.test(i)) {
      throw new Error('bad cursor payload');
    }
    return { createdAt, id: i };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
