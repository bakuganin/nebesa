```markdown
# nebesa Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `nebesa` TypeScript codebase. You'll learn how to structure files, write imports and exports, and follow commit and testing conventions. This guide is ideal for contributors aiming to maintain consistency and quality in the project.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file names.
  - Example:  
    ```
    user-profile.ts
    utils/helpers.ts
    ```

### Import Style
- Use **relative imports** for referencing local modules.
  - Example:
    ```typescript
    import { fetchData } from './api-utils';
    import { calculateSum } from '../math/calculate-sum';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In math-utils.ts
    export function add(a: number, b: number): number {
      return a + b;
    }

    export function subtract(a: number, b: number): number {
      return a - b;
    }
    ```

    ```typescript
    // In another file
    import { add, subtract } from './math-utils';
    ```

### Commit Patterns
- Commit messages are **freeform**, sometimes with prefixes.
- Average commit message length: **36 characters**.
- Example:
  ```
  Fix bug in user authentication flow
  Add new endpoint for data export
  ```

## Workflows

### Adding a New Module
**Trigger:** When you need to add a new feature or utility.
**Command:** `/add-module`

1. Create a new file using **kebab-case** (e.g., `user-service.ts`).
2. Write your code using **named exports**.
3. Use **relative imports** for dependencies.
4. Write corresponding tests in a `.test.ts` file.
5. Commit your changes with a clear, concise message.

### Writing Tests
**Trigger:** When you add or update functionality.
**Command:** `/write-test`

1. Create a test file with the pattern `*.test.ts` (e.g., `user-service.test.ts`).
2. Implement tests for each exported function.
3. Use the project's preferred (unknown) testing framework.
4. Run tests to ensure correctness before committing.

### Refactoring Code
**Trigger:** When improving or restructuring existing code.
**Command:** `/refactor`

1. Identify code to refactor.
2. Apply changes while keeping file naming, import, and export conventions.
3. Update or add tests as needed.
4. Commit with a message describing the refactor.

## Testing Patterns

- Test files follow the pattern: `*.test.ts`
- Each test file should correspond to a module file.
- The specific testing framework is **unknown**, but standard TypeScript testing practices apply.
- Example:
  ```typescript
  // user-service.test.ts
  import { getUser } from './user-service';

  describe('getUser', () => {
    it('returns user data for valid ID', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command        | Purpose                                 |
|----------------|-----------------------------------------|
| /add-module    | Scaffold and add a new module           |
| /write-test    | Create and implement a new test file    |
| /refactor      | Begin a code refactor workflow          |
```
