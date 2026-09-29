type Token = {
  type: "number" | "identifier" | "operator" | "eof";
  value: string;
};

type MathFunction = {
  minArgs: number;
  maxArgs: number;
  run: (...args: number[]) => number;
};

const mathFunctions: Record<string, MathFunction> = {
  abs: { minArgs: 1, maxArgs: 1, run: Math.abs },
  acos: { minArgs: 1, maxArgs: 1, run: Math.acos },
  asin: { minArgs: 1, maxArgs: 1, run: Math.asin },
  atan: { minArgs: 1, maxArgs: 1, run: Math.atan },
  atan2: { minArgs: 2, maxArgs: 2, run: Math.atan2 },
  ceil: { minArgs: 1, maxArgs: 1, run: Math.ceil },
  cos: { minArgs: 1, maxArgs: 1, run: Math.cos },
  exp: { minArgs: 1, maxArgs: 1, run: Math.exp },
  floor: { minArgs: 1, maxArgs: 1, run: Math.floor },
  log: { minArgs: 1, maxArgs: 1, run: Math.log },
  log10: { minArgs: 1, maxArgs: 1, run: Math.log10 },
  max: { minArgs: 1, maxArgs: Infinity, run: Math.max },
  min: { minArgs: 1, maxArgs: Infinity, run: Math.min },
  pow: { minArgs: 2, maxArgs: 2, run: Math.pow },
  round: { minArgs: 1, maxArgs: 1, run: Math.round },
  sin: { minArgs: 1, maxArgs: 1, run: Math.sin },
  sqrt: { minArgs: 1, maxArgs: 1, run: Math.sqrt },
  tan: { minArgs: 1, maxArgs: 1, run: Math.tan },
  trunc: { minArgs: 1, maxArgs: 1, run: Math.trunc },
};

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const remaining = expression.slice(index);
    const whitespace = remaining.match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }

    const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: number[0] });
      index += number[0].length;
    } else {
      const identifier = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifier) {
        tokens.push({ type: "identifier", value: identifier[0] });
        index += identifier[0].length;
      } else {
        const operator = remaining.match(/^(?:\*\*|[+\-*/%(),])/);
        if (!operator) {
          throw new Error("Expression contains an unsupported token.");
        }
        tokens.push({ type: "operator", value: operator[0] });
        index += operator[0].length;
      }
    }

    if (tokens.length > 128) {
      throw new Error("Expression is too complex.");
    }
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

export function evaluateArithmeticExpression(input: unknown): number {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("A mathematical expression is required.");
  }
  if (input.length > 256) {
    throw new Error("Expression must be 256 characters or fewer.");
  }

  const tokens = tokenize(input);
  let position = 0;
  const current = () => tokens[position];
  const consume = (value?: string) => {
    const token = current();
    if (value !== undefined && token.value !== value) {
      throw new Error(`Expected '${value}' in expression.`);
    }
    position += 1;
    return token;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (current().value === "+" || current().value === "-") {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseUnary();
    while (["*", "/", "%"].includes(current().value)) {
      const operator = consume().value;
      const right = parseUnary();
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };

  const parseUnary = (): number => {
    if (current().value === "+") {
      consume("+");
      return parseUnary();
    }
    if (current().value === "-") {
      consume("-");
      return -parseUnary();
    }
    return parsePower();
  };

  const parsePower = (): number => {
    const value = parsePrimary();
    if (current().value === "**") {
      consume("**");
      return value ** parseUnary();
    }
    return value;
  };

  const parsePrimary = (): number => {
    const token = current();
    if (token.type === "number") {
      consume();
      return Number(token.value);
    }
    if (token.value === "(") {
      consume("(");
      const value = parseExpression();
      consume(")");
      return value;
    }
    if (token.type === "identifier") {
      const name = consume().value.toLowerCase();
      if (current().value !== "(") {
        if (name === "pi") return Math.PI;
        if (name === "e") return Math.E;
        throw new Error(`Unknown constant '${name}'.`);
      }

      consume("(");
      const args: number[] = [];
      if (current().value !== ")") {
        args.push(parseExpression());
        while (current().value === ",") {
          consume(",");
          args.push(parseExpression());
        }
      }
      consume(")");

      const mathFunction = mathFunctions[name];
      if (!mathFunction) {
        throw new Error(`Function '${name}' is not allowed.`);
      }
      if (args.length < mathFunction.minArgs || args.length > mathFunction.maxArgs) {
        throw new Error(`Function '${name}' received an invalid number of arguments.`);
      }
      return mathFunction.run(...args);
    }

    throw new Error("Expected a number or parenthesized expression.");
  };

  const result = parseExpression();
  if (current().type !== "eof") {
    throw new Error("Unexpected content after the expression.");
  }
  if (!Number.isFinite(result)) {
    throw new Error("Expression result must be a finite number.");
  }
  return result;
}