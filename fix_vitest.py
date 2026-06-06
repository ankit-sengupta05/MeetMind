import os
import json

workspaces = ["client", "server", "agents", "functions", "shared"]

for w in workspaces:
    pkg_path = os.path.join(w, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, "r") as f:
            content = f.read()
        
        # Replace vitest run with vitest run --passWithNoTests if it exists
        content = content.replace('"test": "vitest run"', '"test": "vitest run --passWithNoTests"')
        content = content.replace('"test": "vitest"', '"test": "vitest run --passWithNoTests"')
        
        with open(pkg_path, "w") as f:
            f.write(content)

print("Updated vitest configs.")
