PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin

.PHONY: build test install-local

build:
	pnpm run build

test:
	pnpm test

# Symlink the checkout's bin shim into ~/.local/bin so `qorrol` works from any cwd.
install-local: build
	mkdir -p "$(BINDIR)"
	ln -sfn "$(CURDIR)/bin/qorrol" "$(BINDIR)/qorrol"
	@command -v qorrol
	@qorrol --json doctor >/dev/null
	@echo "installed $(BINDIR)/qorrol"
