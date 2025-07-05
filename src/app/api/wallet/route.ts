import { NextResponse } from "next/server";
import { ethers } from 'ethers';

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

export async function POST(req: Request) {
  try {
    if (!PRIVATE_KEY) {
      throw new Error("Environment variable WALLET_PRIVATE_KEY must be set");
    }
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const body = await req.json();
    switch (body.action) {
      case 'getPubKey':
        return NextResponse.json({ publicKey: wallet.signingKey.publicKey });
      case 'getAddress':
        return NextResponse.json({ address: wallet.address });
      case 'signTransaction':
        const signature = await wallet.signTransaction(body.tx);
        return NextResponse.json({ signature });
      default:
        return NextResponse.json({ error: `Unrecognized action ${body.action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in /chat/completions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
