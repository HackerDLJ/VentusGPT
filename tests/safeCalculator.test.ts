import assert from "node:assert/strict";
import test from "node:test";
import { evaluateArithmeticExpression } from "../src/services/safeCalculator";

test("evaluates arithmetic with precedence and parentheses", () => {
  assert.equal(evaluateArithmeticExpression("2 + 3 * (4 - 1)"), 11);
});

test("supports powers, constants, and allowlisted math functions", () => {
  assert.equal(evaluateArithmeticExpression("sqrt(81) + 2**3"), 17);
  assert.equal(evaluateArithmeticExpression("round(pi)"), 3);
});

test("rejects JavaScript access and unlisted functions", () => {
  assert.throws(() => evaluateArithmeticExpression("globalThis.process.exit()"));
  assert.throws(() => evaluateArithmeticExpression("constructor(1)"));
  assert.throws(() => evaluateArithmeticExpression("Math.random()"));
});

test("rejects invalid and non-finite expressions", () => {
  assert.throws(() => evaluateArithmeticExpression("1 / 0"));
  assert.throws(() => evaluateArithmeticExpression("1 +"));
});