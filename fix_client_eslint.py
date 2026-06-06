import os

def fix_client_eslint():
    path = "client/.eslintrc.cjs"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],", "")
    content = content.replace("'@typescript-eslint/no-explicit-any': 'warn',", "")
    content = content.replace("'no-console': ['warn', { allow: ['error', 'warn'] }],", "")
    
    with open(path, "w") as f:
        f.write(content)

fix_client_eslint()
print("Fixed client eslint overrides.")
