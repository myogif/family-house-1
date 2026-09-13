import { can } from "./authorization";

describe("family authorization", () => {
  test("allows a husband to edit the family", () => {
    expect(can("husband", "family.edit")).toBe(true);
  });

  test("allows a wife to invite members", () => {
    expect(can("wife", "member.invite")).toBe(true);
  });

  test("does not allow a child to approve join requests", () => {
    expect(can("child", "request.approve")).toBe(false);
  });

  test("denies unknown roles and actions by default", () => {
    expect(can("outsider", "family.edit")).toBe(false);
    expect(can("husband", "unknown.action")).toBe(false);
  });
});
