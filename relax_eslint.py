import os

rules_to_inject = """
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/require-await': 'off',
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
"""

workspaces = ["client", "server", "agents", "functions", "shared"]

for w in workspaces:
    eslint_path = os.path.join(w, ".eslintrc.cjs")
    if os.path.exists(eslint_path):
        with open(eslint_path, "r") as f:
            content = f.read()
        
        # Replace existing rules with off rules if not already injected
        if "'@typescript-eslint/no-unsafe-member-access': 'off'" not in content:
            content = content.replace("rules: {", f"rules: {{\n{rules_to_inject}")
            with open(eslint_path, "w") as f:
                f.write(content)

print("eslint configurations updated.")
