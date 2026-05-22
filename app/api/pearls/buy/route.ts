import { NextResponse } from 'next/server';

/** Golden → white is disabled; white may only flow into golden (sell) or blue (swap). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, goldishAmount } = body as {
    initData?: string;
    goldishAmount?: number;
  };

  if (!initData || !Number.isFinite(Number(goldishAmount)) || Number(goldishAmount) <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  return NextResponse.json(
    {
      error:
        'Golden pearls cannot be converted to white. Use Sell to turn white into golden, or Swap to move white into blue.',
    },
    { status: 400 }
  );
}
