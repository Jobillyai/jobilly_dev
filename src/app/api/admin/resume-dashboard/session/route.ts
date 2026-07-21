import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { online: false, role: null },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      online: true,
      role: admin.role,
      name: admin.name ?? null,
      email: admin.email ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
