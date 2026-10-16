# Contributing to DeveloperOS

Thank you for your interest in contributing to the [DeveloperOS](https://developeros.in) open-source developer tools ecosystem!

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## How to Contribute

### 1. Proposing a Feature or Bug Fix
- Check existing issues and discussions before opening a new ticket.
- Use our [Issue Templates](.github/ISSUE_TEMPLATE/) for bug reports or feature suggestions.

### 2. Local Development Workflow
```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Create a virtual environment or install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # or: npm install

# 3. Create a feature branch off main
git checkout -b feat/your-feature-name

# 4. Implement changes and add automated tests under tests/
python3 -m unittest discover -s tests -p "test_*.py"  # or: npm test
```

### 3. Engineering Rules & Best Practices
- **Decoupled Architecture**: Keep algorithmic and business logic in `core/` completely isolated from framework UI code.
- **Pure Standard Library**: Prefer standard library modules over third-party dependencies wherever possible.
- **Ephemeral Privacy**: Never write user payloads to disk or transmit them to third parties.
- **Safety Bounds**: Apply timeouts and character limits on user input to avoid memory spikes and ReDoS vulnerabilities.

---

## Submitting a Pull Request

1. Ensure all automated tests pass with 0 failures.
2. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
3. Ensure commits follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `ci:`).
4. Maintainers will review and provide feedback. Once approved, pull requests are squash-merged into `main`.
