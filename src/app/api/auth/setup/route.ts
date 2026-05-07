import { hasPinSet, setPin } from "@/lib/auth";

export async function POST(request: Request) {
  const pinAlreadySet = await hasPinSet();
  if (pinAlreadySet) {
    return Response.json({ error: "PIN already set" }, { status: 400 });
  }
  const { pin } = await request.json();
  if (!pin || pin.length < 4 || pin.length > 16) {
    return Response.json({ error: "PIN must be 4-16 digits" }, { status: 400 });
  }
  await setPin(pin);
  return Response.json({ success: true });
}
