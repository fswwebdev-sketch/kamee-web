import { describe, expect, it } from "vitest";
import { enabledPaymentMethods, isPaymentMethodEnabled, manualQrisFields, QRIS_NMID } from "@/lib/payments";

describe("pembayaran QRIS statis", () => {
  it("default hanya QRIS & tunai", () => {
    expect(enabledPaymentMethods).toEqual(["qris", "cash"]);
    expect(isPaymentMethodEnabled("ewallet")).toBe(false);
    expect(isPaymentMethodEnabled("bank_transfer")).toBe(false);
  });

  it("field manual hanya untuk QRIS dan butuh konfirmasi selama pending", () => {
    expect(manualQrisFields("qris", "pending")).toMatchObject({ nmid: QRIS_NMID, requires_manual_confirmation: true, qris_image_url: "/payments/qris-kameecoffee.jpg" });
    expect(manualQrisFields("qris", "done").requires_manual_confirmation).toBe(false);
    expect(manualQrisFields("cash", "pending")).toEqual({ qris_image_url: null, merchant_name: null, nmid: null, requires_manual_confirmation: false });
  });
});
