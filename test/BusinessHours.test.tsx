import { describe, expect, it } from "vitest";
import { getBusinessStatus } from "../components/BusinessHours";

const HOURS = "Lun 09:00-18:00; Mar 09:00-18:00";

describe("getBusinessStatus", () => {
  it("detects open status during business hours", () => {
    const now = new Date(2024, 0, 1, 15, 0, 0); // Monday
    const status = getBusinessStatus(HOURS, now);
    expect(status.isOpen).toBe(true);
    expect(status.closesAt).toBe("18:00");
    expect(status.todayLabel).toBe("Lun");
  });

  it("detects closed state before opening and provides opensAt", () => {
    const now = new Date(2024, 0, 1, 8, 0, 0); // Monday before opening
    const status = getBusinessStatus(HOURS, now);
    expect(status.isOpen).toBe(false);
    expect(status.opensAt).toBe("Lun 09:00");
    expect(status.todayLabel).toBe("Lun");
  });

  it("detects closed state after closing time", () => {
    const now = new Date(2024, 0, 1, 19, 0, 0); // Monday after closing
    const status = getBusinessStatus(HOURS, now);
    expect(status.isOpen).toBe(false);
    expect(status.opensAt).toBe("Mar 09:00");
    expect(status.todayLabel).toBe("Lun");
  });
});
