import { beforeEach, describe, expect, it } from "vitest";
import { filterTutors, TUTORS } from "../src/data";
import { bookSlot, getBookedSlots } from "../src/booking-store";
import { safeProperties } from "../src/analytics";

describe("tutor discovery", () => {
  it("filters tutors by subject and grade", () => {
    expect(filterTutors(TUTORS, "Chemistry", "11").map((t) => t.id)).toEqual(["elena-ruiz"]);
    expect(filterTutors(TUTORS, "English", "4").map((t) => t.id)).toEqual(["jordan-brooks"]);
  });
});

describe("device-local booking store", () => {
  beforeEach(() => localStorage.clear());

  it("removes a booked slot on this browser", () => {
    expect(bookSlot("maya-chen", "2026-09-08T16:00")).toBe(true);
    expect(bookSlot("maya-chen", "2026-09-08T16:00")).toBe(false);
    expect(getBookedSlots("maya-chen")).toEqual(["2026-09-08T16:00"]);
  });
});

describe("analytics privacy boundary", () => {
  it("drops personal and unknown properties", () => {
    expect(safeProperties("booking_completed", {
      tutor_id: "maya-chen",
      subject: "Math",
      parent_email: "private@example.test",
      student_name: "Private",
    })).toEqual({ tutor_id: "maya-chen", subject: "Math" });
  });
});
