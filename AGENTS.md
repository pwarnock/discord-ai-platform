# Agent Instructions

## Issue Tracking with Beads

This project uses [Beads](https://github.com/steveyegge/beads) for issue tracking. Run `bd onboard` for full integration instructions.

### Quick Reference

```bash
# Find ready work
bd ready --json

# Create issues during work
bd create "Task description" -t task -p 1

# Update status
bd update <issue-id> --status in_progress

# Complete work
bd close <issue-id> --reason "Completed"

# Show dependencies
bd dep tree <issue-id>
```

### Session End Protocol

Before ending a session:
1. File/update issues for remaining work
2. Close completed issues
3. Sync: `bd sync && git add .beads/ && git commit && git push`
4. Verify clean state: `bd info`
