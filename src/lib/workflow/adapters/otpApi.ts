import type { CollectedData, APIResult } from "../types";

// Mock OTP service — simulates Cars24's OTP API.
// Real integration: POST /api/v1/auth/otp/send and /verify

// In-memory store for demo. Production: Redis with 5-min TTL.
const otpStore = new Map<string, string>();

const MOCK_OTP = "123456"; // Always accept this in mock mode

export const otpApi = {
  async send(data: CollectedData): Promise<APIResult> {
    await new Promise(r => setTimeout(r, 300));
    const phone = String(data.phone_number ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return { success: false, data: {}, error: "Invalid phone number" };
    }
    otpStore.set(phone, MOCK_OTP);
    return {
      success: true,
      data: { message: `OTP sent to ${phone}`, expiresIn: 300 },
    };
  },

  async verify(data: CollectedData): Promise<APIResult> {
    await new Promise(r => setTimeout(r, 300));
    const phone = String(data.phone_number ?? "");
    const code  = String(data.otp_code ?? "").trim();
    const stored = otpStore.get(phone);
    // Accept mock OTP or the stored one
    if (code === MOCK_OTP || code === stored) {
      otpStore.delete(phone);
      return { success: true, data: { verified: true, phone } };
    }
    return { success: false, data: { verified: false }, error: "Invalid or expired OTP. Try 123456." };
  },
};
