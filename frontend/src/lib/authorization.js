const ACTION_ROLES = Object.freeze({
  "family.edit": ["husband"],
  "family.delete": ["husband"],
  "member.invite": ["husband", "wife"],
  "request.approve": ["husband", "wife"],
  "member.remove": ["husband"],
  "member.role_change": ["husband"],
  "ownership.transfer": ["husband"],
  "budget.manage": ["husband", "wife"],
  "goal.manage": ["husband", "wife"],
  "transaction.create": ["husband", "wife"],
  "transaction.manage": ["husband", "wife"],
  "journal.create": ["husband", "wife", "child"],
  "task.create": ["husband", "wife", "child"],
  "task.manage": ["husband", "wife"],
  "calendar.manage": ["husband", "wife"],
  "shopping.manage": ["husband", "wife", "child"],
  "meal.create": ["husband", "wife", "child"],
  "meal.manage": ["husband", "wife"],
  view: ["husband", "wife", "child"],
});

export function can(role, action) {
  return ACTION_ROLES[action]?.includes(role) ?? false;
}
