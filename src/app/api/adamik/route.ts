import { NextResponse } from "next/server";
import { makeApiRequest } from '@/app/lib/api';
const ADAMIK_API_BASE_URL = process.env.ADAMIK_API_BASE_URL ?? "https://api.adamik.io/api";
const ADAMIK_API_KEY = process.env.ADAMIK_API_KEY;

export async function POST(req: Request) {
  try {
    if (!ADAMIK_API_BASE_URL || !ADAMIK_API_KEY) {
      throw new Error("Environment variables ADAMIK_API_BASE_URL and ADAMIK_API_KEY must both be set");
    }
    const { url, body, method} = await req.json();
    const response = await makeApiRequest(`${ADAMIK_API_BASE_URL}${url}`, ADAMIK_API_KEY, method, body);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in /chat/completions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
