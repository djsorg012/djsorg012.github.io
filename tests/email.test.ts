import { beforeEach, describe, expect, it, vi } from "vitest";
import emailjs from "@emailjs/browser";
import { sendBookingEmails } from "../src/email";

vi.mock("@emailjs/browser", () => ({ default: { send: vi.fn() } }));

describe("EmailJS booking delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_abc");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_booking");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
  });

  it("uses one template whose auto-reply confirms the parent", async () => {
    vi.mocked(emailjs.send).mockResolvedValue({ status: 200, text: "OK" });
    const result = await sendBookingEmails({
      parentName: "Test Parent", parentEmail: "parent@example.com",
      studentName: "Avery", grade: "8", subject: "Math",
      tutorName: "Maya Chen", slotLabel: "Monday at 4 PM", rate: 48,
    });
    expect(emailjs.send).toHaveBeenCalledTimes(1);
    expect(emailjs.send).toHaveBeenCalledWith(
      "service_abc", "template_booking",
      expect.objectContaining({ parent_email: "parent@example.com", tutor_name: "Maya Chen" }),
      { publicKey: "public_key" },
    );
    expect(result).toEqual({ parent: "sent", owner: "sent" });
  });
});
